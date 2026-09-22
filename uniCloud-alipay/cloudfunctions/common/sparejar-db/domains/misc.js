'use strict'

const db = require('../core/db')
const { getDocByUser, ensureDoc, isDuplicateKeyError } = require('../core/db')
const { formatDateKey, nowTs, getDb, formatDateTime } = require('../utils/date')
const money = require('../utils/money')
const ids = require('../utils/id')
const ledger = require('./ledger')
const {
  PRESET_EXPENSE_CATEGORIES,
  PRESET_INCOME_CATEGORIES
} = require('../core/constants')

async function updateOnboarding(userId, step, done) {
  const db = getDb()
  // onboarding_done / onboarding_step 同时写 users 与 user_settings 两份：
  // users 由 initUser 每次整体返回、可靠进入 state.user；user_settings 为设计上的业务真源。
  // 两份一致可避免「读哪份都不对」的复发（历史上仅写 users 导致读取方读不到而反复引导）。
  const patch = { updated_at: nowTs() }
  if (typeof step === 'number') patch.onboarding_step = step
  if (typeof done === 'boolean') patch.onboarding_done = done

  const settingsDoc = await getDocByUser('user_settings', userId)
  if (settingsDoc) {
    await db.collection('user_settings').doc(settingsDoc._id).update(patch)
  }
  const userDoc = await getDocByUser('users', userId)
  if (userDoc) {
    await db.collection('users').doc(userDoc._id).update(patch)
  }
  return patch
}

/**
 * 更新用户基础资料（昵称 / 头像）。
 * @param {string} userId openid
 * @param {{nickname?:string, avatar?:string}} patch 头像为 cloud:// fileID
 */
async function updateUser(userId, patch = {}) {
  const db = getDb()
  const userDoc = await getDocByUser('users', userId)
  if (!userDoc) throw new Error('user not found')
  const updateDoc = { updated_at: nowTs() }
  if (typeof patch.nickname === 'string') {
    updateDoc.nickname = patch.nickname.trim().slice(0, 20)
  }
  if (typeof patch.avatar_url === 'string' && patch.avatar_url) {
    updateDoc.avatar_url = patch.avatar_url
  }
  await db.collection('users').doc(userDoc._id).update(updateDoc)
  return updateDoc
}

const WX_CONFIG = {
  appid: process.env.WX_APPID || '',
  secret: process.env.WX_SECRET || '',
  templates: {
    over_limit: process.env.WX_TPL_OVER_LIMIT || '',
    daily_surplus: process.env.WX_TPL_DAILY_SURPLUS || '',
    streak_risk: process.env.WX_TPL_STREAK_RISK || ''
  }
}

const SUBSCRIBE_TYPES = ['over_limit', 'daily_surplus', 'streak_risk']


async function getWxAccessToken() {
  if (!WX_CONFIG.appid || !WX_CONFIG.secret) return null
  const db = getDb()
  const cacheRes = await db.collection('wx_token_cache').where({ key: 'access_token' }).limit(1).get()
  const now = Date.now()
  if (cacheRes.data && cacheRes.data[0] && cacheRes.data[0].expires_at > now + 60000) {
    return cacheRes.data[0].token
  }
  const res = await uniCloud.httpclient.request('https://api.weixin.qq.com/cgi-bin/token', {
    method: 'GET',
    data: { grant_type: 'client_credential', appid: WX_CONFIG.appid, secret: WX_CONFIG.secret }
  })
  const body = res.data
  if (!body || !body.access_token) {
    console.error('[wx] 获取 access_token 失败', body)
    return null
  }
  const expiresAt = now + (body.expires_in || 7200) * 1000
  const token = body.access_token
  if (cacheRes.data && cacheRes.data[0]) {
    await db.collection('wx_token_cache').doc(cacheRes.data[0]._id).update({ token, expires_at: expiresAt, updated_at: nowTs() })
  } else {
    await db.collection('wx_token_cache').add({ key: 'access_token', token, expires_at: expiresAt, created_at: nowTs(), updated_at: nowTs() })
  }
  return token
}

/** 记录用户订阅授权（前端 requestSubscribeMessage 成功后调用）。 */

async function recordSubscribeAuth(userId, type) {
  if (!SUBSCRIBE_TYPES.includes(type)) throw new Error('invalid subscribe type')
  const db = getDb()
  const ts = nowTs()
  const res = await db.collection('subscribe_auth').where({ user_id: userId, type }).limit(1).get()
  if (res.data && res.data[0]) {
    await db.collection('subscribe_auth').doc(res.data[0]._id).update({ granted: true, granted_at: ts, updated_at: ts })
  } else {
    await db.collection('subscribe_auth').add({ user_id: userId, type, granted: true, granted_at: ts, last_sent_at: null, created_at: ts, updated_at: ts })
  }
  return { ok: true }
}

/**
 * 发送微信订阅消息。频控：同类消息每日最多 1 条（自然日）。
 * 微信配置（WX_APPID/WX_SECRET/模板ID）缺失时静默跳过，不报错（开发期可用）。
 * @param {string} userId openid
 * @param {'over_limit'|'daily_surplus'|'streak_risk'} type
 * @param {{data?: object, page?: string}} payload 模板字段与跳转页
 */

async function sendSubscribeMessage(userId, type, payload = {}) {
  const tplId = WX_CONFIG.templates[type]
  if (!WX_CONFIG.appid || !WX_CONFIG.secret || !tplId) {
    return { sent: false, skipped: 'config_missing' }
  }
  if (!SUBSCRIBE_TYPES.includes(type)) throw new Error('invalid subscribe type')
  const db = getDb()
  const authRes = await db.collection('subscribe_auth').where({ user_id: userId, type, granted: true }).limit(1).get()
  if (!(authRes.data && authRes.data[0])) {
    return { sent: false, skipped: 'not_authorized' }
  }
  // 频控：自然日 0 点起算
  const todayStart = new Date(formatDateKey() + 'T00:00:00').getTime()
  const last = authRes.data[0].last_sent_at
  if (last && last >= todayStart) {
    return { sent: false, skipped: 'rate_limited' }
  }
  const token = await getWxAccessToken()
  if (!token) return { sent: false, skipped: 'token_failed' }
  const res = await uniCloud.httpclient.request('https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=' + token, {
    method: 'POST',
    data: {
      touser: userId,
      template_id: tplId,
      data: payload.data || {},
      page: payload.page || 'pages/index/index'
    }
  })
  const body = res.data
  if (body && body.errcode === 0) {
    await db.collection('subscribe_auth').doc(authRes.data[0]._id).update({ last_sent_at: nowTs(), updated_at: nowTs() })
    return { sent: true }
  }
  console.error('[wx] 订阅消息发送失败', type, body)
  return { sent: false, skipped: 'wx_error', errcode: body && body.errcode, errmsg: body && body.errmsg }
}


async function initUser(userId, profile = {}) {
  const ts = nowTs()

  // users 档案：独立幂等，created 标记仅用于返回语义
  const existingUser = await getDocByUser('users', userId)

  // —— 注销处理中再次登录（同微信）= 默认彻底注销：清空旧数据，随后建全新空白账号 ——
  // 硬删失败必须上抛，禁止吞异常后复用旧 users 文档：
  // 否则会伪装成「注销成功」，但旧 created_at / 旧数据仍在，且新建因 user_id 唯一索引
  // 冲突回退到旧档，表现为「注销重登后还是旧账号」。
  let wasDeleting = false
  if (existingUser && existingUser.account_status === 'deleting') {
    // 仅当冷静期真正结束（计划删除时间已到）才硬删并建新号；
    // 冷静期内保留旧账号，由前端 profile 横幅提供「撤销 / 立即注销」入口，不可登录即删。
    const scheduledAt = existingUser.delete_scheduled_at
    const expired =
      !!scheduledAt &&
      new Date(String(scheduledAt).replace(' ', 'T')).getTime() <= Date.now()
    if (expired) {
      wasDeleting = true
      await deleteAccount(userId)
      existingUser = null
    }
    // 未到冷静期：不删，沿用 existingUser，前端读取 account_status==='deleting' 显示横幅
  }

  let userDoc = existingUser
  let isNew = false
  if (!existingUser) {
    userDoc = {
      user_id: userId,
      nickname: profile.nickname || '',
      avatar_url: profile.avatar_url || '',
      timezone: profile.timezone || 'Asia/Shanghai',
      onboarding_done: false,
      onboarding_step: 0,
      is_guest: false,
      jar_skin_id: 'classic_glass',
      jar_skins_unlocked: ['classic_glass'],
      zodiac: profile.zodiac || null,
      constellation: profile.constellation || null,
      birthday: profile.birthday || null,
      points: 0,
      last_check_in: null,
      created_at: ts,
      updated_at: ts,
      deleted_at: null,
      account_status: 'active',
      delete_scheduled_at: ''
    }
    try {
      const res = await getDb().collection('users').add(userDoc)
      userDoc = { _id: res.id, ...userDoc }
      isNew = true
    } catch (err) {
      // 并发登录已建档：回退读取，不视为新用户
      if (!isDuplicateKeyError(err)) throw err
      const raced = await getDocByUser('users', userId)
      if (!raced) throw err
      userDoc = raced
    }
  }

  // 迁移：group 字段已废弃，清理该用户全部分类的残留 group（幂等，重复执行无害）
  try {
    await getDb().collection('categories').where({ user_id: userId, group: db.command.exists(true) }).update({ group: db.command.remove() })
  } catch (e) {
    console.warn('[ensureUserExists] cleanup group failed', e)
  }

  // 以下各实体独立幂等创建，任意一步中途失败都不影响其余，重试可补齐
  await ensureDoc('user_settings', userId, () => ({
    user_id: userId,
    daily_base_limit: 10000,
    pending_base_limit: null,
    limit_effective_date: null,
    default_surplus_action: 'roll_over',
    default_wish_id: null,
    refund_restore_limit: true,
    challenge_ledger_id: null,
    max_custom_ledgers: 5,
    notify_over_limit: true,
    notify_daily_surplus: true,
    notify_streak_risk: true,
    meal_tracking_enabled: false,
    fat_loss_mode_enabled: false,
    savings_withdraw_limit_pct: null,
    over_limit_penalty_enabled: false,
    penalty_streak_deduct: 1,
    asset_view_mode: 'disposable',
    updated_at: ts
  }))

  await ensureDoc('surplus_pools', userId, () => ({
    user_id: userId, balance: 0, total_in: 0, total_out: 0, updated_at: ts
  }))

  await ensureDoc('savings_pools', userId, () => ({
    user_id: userId, balance: 0, total_in: 0, total_out: 0,
    month_withdrawn: 0, withdraw_month_key: null, updated_at: ts
  }))

  // 默认主账户（"我的钱"）：满足"不想分开成真实各账户"的用户，开箱即用。
  // 单账户即等价于"总账户"，无需新机制。幂等：按用户名唯一索引跳过已建。
  const DEFAULT_ACCOUNT_NAME = '我的钱包'
  const existAcc = await getDb().collection('asset_accounts')
    .where({ user_id: userId, name: DEFAULT_ACCOUNT_NAME, deleted_at: null })
    .limit(1)
    .get()
  if (!(existAcc.data && existAcc.data[0])) {
    await getDb().collection('asset_accounts').add({
      user_id: userId,
      account_class: 'daily',
      account_subtype: 'cash',
      name: DEFAULT_ACCOUNT_NAME,
      initial_balance: 0,
      current_balance: 0,
      include_in_disposable: true,
      include_in_daily_limit: true,
      include_in_total_asset: true,
      annual_withdraw_quota: 0,
      annual_withdrawn: 0,
      quota_year: String(new Date().getFullYear()),
      sort_order: 0,
      deleted_at: null,
      created_at: ts,
      updated_at: ts,
    })
  }

  await ensureDoc('user_streaks', userId, () => ({
    user_id: userId,
    daily_current_streak: 0,
    daily_max_streak: 0,
    last_success_date_key: null,
    last_fail_date_key: null,
    penalty_streak_deducted: 0,
    updated_at: ts
  }))

  const masterLedger = await ledger.ensureMasterLedger(userId)

  // 预置分类：按 type+name 去重，重复登录不会插入重复分类
  const existingCats = await getDb().collection('categories')
    .where({ user_id: userId })
    .field({ name: true, type: true, is_system: true, _id: true })
    .get()
  const have = new Set()
  for (const c of (existingCats.data || [])) {
    have.add(`${c.type}:${c.name}`)
  }
  const categoryDocs = []
  for (const c of PRESET_EXPENSE_CATEGORIES) {
    if (have.has(`expense:${c.name}`)) continue
    categoryDocs.push({
      user_id: userId, type: 'expense', name: c.name, icon: c.icon, desc: '',
      is_system: true, is_hidden: false, sort_order: c.sort_order, merged_to_id: null, created_at: ts
    })
  }
  for (const c of PRESET_INCOME_CATEGORIES) {
    if (have.has(`income:${c.name}`)) continue
    categoryDocs.push({
      user_id: userId, type: 'income', name: c.name, icon: c.icon, desc: '',
      is_system: true, is_hidden: false, sort_order: c.sort_order, merged_to_id: null, created_at: ts
    })
  }
  for (const doc of categoryDocs) {
    try {
      await getDb().collection('categories').add(doc)
    } catch (err) {
      // 并发 initUser 已插入同名分类：幂等跳过
      if (!isDuplicateKeyError(err)) throw err
    }
  }

  // 老用户兼容：积分/签到字段缺省补 0/null
  if (!userDoc.points) userDoc.points = 0
  if (!userDoc.last_check_in) userDoc.last_check_in = null

  // 老用户兼容：账号注销状态字段缺省补 active / 空（不覆盖已处于 deleting 的用户）
  if (userDoc.account_status === undefined || userDoc.account_status === null) {
    userDoc.account_status = 'active'
    try {
      await getDb().collection('users').doc(userDoc._id).update({ account_status: 'active' })
    } catch (e) {
      console.warn('[initUser] backfill account_status failed', e)
    }
  }
  if (userDoc.delete_scheduled_at === undefined || userDoc.delete_scheduled_at === null) {
    userDoc.delete_scheduled_at = ''
  }

  return { created: isNew, user: userDoc, default_ledger_id: masterLedger._id, wasDeleting }
}


/**
 * 注销账号：硬删该用户的全部个人数据（个保法合规《账号注销 + 个人数据删除》）。
 * 按 user_id 批量清除所有业务集合，并彻底删除 users 主档；同时写入 deleted_openids
 * 审计记录（仅留痕，不作拦截）。彻底删除后，同一微信(openid)后续登录可由 initUser
 * 幂等重建为全新空白账号（旧数据已清空，不算复活），前端据此清 token 退回游客态后重新注册。
 *
 * 实现说明：
 *  - 云数据库 where().remove() 单次有数量上限，故采用「分批查询 _id + 按 _id in 删除」循环，
 *    每批 500，必要时多轮直至清空，避免漏删。
 *  - 多对多关联表（ledger_members / member_ledgers 按 ledger_id；meal_food_items 按 meal_id）
 *    先取本用户账本/餐次 id，再按关联键清理，最后清主表。
 */
const DELETE_COLLECTIONS_BY_USER = [
  'user_settings',
  'user_streaks',
  'user_health_profiles',
  'user_achievements',
  'user_penalty_logs',
  'surplus_pools',
  'surplus_pool_logs',
  'surplus_allocations',
  'savings_pools',
  'savings_pool_logs',
  'transactions',
  'categories',
  'wishes',
  'wish_fund_logs',
  'stickers',
  'asset_accounts',
  'investment_holdings',
  'investment_logs',
  'points_logs',
  'limit_history',
  'data_backups',
  'subscribe_auth',
  'challenge_records',
  'daily_health',
  'daily_settlements',
  'daily_health_snapshots',
  'favorite_ledgers',
  'account_balance_logs',
  'members',
  'meals',
  'ledgers'
]

/** 按 where 条件分批硬删，返回删除条数 */
async function purgeByWhere(collection, whereClause) {
  const db = getDb()
  const BATCH = 500
  let total = 0
  for (let guard = 0; guard < 200; guard++) {
    const res = await db.collection(collection).where(whereClause).limit(BATCH).get()
    const list = (res && res.data) || []
    if (!list.length) break
    const ids = list.map((d) => d._id).filter(Boolean)
    if (ids.length) {
      await db.collection(collection).where({ _id: db.command.in(ids) }).remove()
    }
    total += list.length
    if (list.length < BATCH) break
  }
  return total
}

async function deleteAccount(userId) {
  const db = getDb()
  const deleted = {}

  // 1) 取本用户全部账本 id（用于清理多对多关联表）
  const ledgerRes = await db
    .collection('ledgers')
    .where({ user_id: userId })
    .field({ _id: true })
    .limit(2000)
    .get()
  const ledgerIds = ((ledgerRes && ledgerRes.data) || []).map((l) => l._id).filter(Boolean)

  // 2) 关联表：按账本 id 清理（ledger_members / member_ledgers）
  if (ledgerIds.length) {
    deleted.ledger_members = await purgeByWhere('ledger_members', {
      ledger_id: db.command.in(ledgerIds)
    })
    deleted.member_ledgers = await purgeByWhere('member_ledgers', {
      ledger_id: db.command.in(ledgerIds)
    })
  }

  // 3) 餐次食物项：按餐次 id 清理（meals 本身随下面 user_id 批量删）
  const mealRes = await db
    .collection('meals')
    .where({ user_id: userId })
    .field({ _id: true })
    .limit(2000)
    .get()
  const mealIds = ((mealRes && mealRes.data) || []).map((m) => m._id).filter(Boolean)
  if (mealIds.length) {
    deleted.meal_food_items = await purgeByWhere('meal_food_items', {
      meal_id: db.command.in(mealIds)
    })
  }

  // 4) 按 user_id 批量清除所有用户归属集合（含 meals / ledgers 主表）
  for (const col of DELETE_COLLECTIONS_BY_USER) {
    deleted[col] = await purgeByWhere(col, { user_id: userId })
  }

  // 5) 彻底删除 users 主档（允许同微信后续重新注册为全新空白账号，旧数据已清空不会复活），
  //    并写入 deleted_openids 审计记录（仅留存「曾注销」痕迹，用于合规/排查，不作拦截）。
  deleted.users = await purgeByWhere('users', { user_id: userId })
  try {
    await db.collection('deleted_openids').add({ openid: userId, deleted_at: nowTs() })
  } catch (e) {
    // 审计记录写入失败不阻断主流程（个人数据已清完）
    console.warn('[deleteAccount] 写入 deleted_openids 审计失败', userId, e)
  }

  return { deleted }
}

/**
 * 申请注销（7 天冷静期 + 可恢复）：
 * 标记 account_status='deleting' 并写入 delete_scheduled_at（默认 7 天后），
 * 数据暂不删除；期内登录可凭 cancelDeleteAccount 撤销，到期由 cron 调 deleteAccount 硬删。
 * @param {string} userId openid
 * @param {number} [days] 冷静期天数，默认 7
 * @returns {Promise<{ delete_scheduled_at: string, delete_scheduled_at_ts: number }>}
 */
async function scheduleDeleteAccount(userId, days = 7) {
  const db = getDb()
  const userDoc = await getDocByUser('users', userId)
  if (!userDoc) throw new Error('user not found')
  // 幂等：重复申请则按请求天数重算到期时间
  const scheduledDate = new Date(Date.now() + days * 86400000)
  const deleteScheduledAt = formatDateTime(scheduledDate)
  await db.collection('users').doc(userDoc._id).update({
    account_status: 'deleting',
    delete_scheduled_at: deleteScheduledAt,
    updated_at: nowTs()
  })
  return { delete_scheduled_at: deleteScheduledAt, delete_scheduled_at_ts: scheduledDate.getTime() }
}

/**
 * 撤销注销：冷静期内恢复账号（重置为 active 并清空计划删除时间）。
 * @param {string} userId openid
 * @returns {Promise<{ ok: boolean }>}
 */
async function cancelDeleteAccount(userId) {
  const db = getDb()
  const userDoc = await getDocByUser('users', userId)
  if (!userDoc) throw new Error('user not found')
  await db.collection('users').doc(userDoc._id).update({
    account_status: 'active',
    delete_scheduled_at: '',
    updated_at: nowTs()
  })
  return { ok: true }
}

// 导出时额外纳入的按 user_id 归属集合（不在硬删列表中的只读/流水表）
const EXPORT_EXTRA_COLLECTIONS = [
  'daily_settlements',
  'account_balance_logs',
  'favorite_ledgers',
  'daily_health_snapshots'
]

/**
 * 导出用户全量数据（个保法第 45 条可携带权）。
 * 聚合所有业务集合，按集合名归类；关联表（ledger_members/member_ledgers/meal_food_items）
 * 经本用户账本/餐次 id 取回。返回可直接 JSON 序列化的对象。
 * @param {string} userId openid
 */
async function exportUserData(userId) {
  const db = getDb()
  const uDoc = await getDocByUser('users', userId)
  if (!uDoc) throw new Error('user not found')
  const collections = {}

  // 1) 直接按 user_id 归属的集合
  const exportCols = DELETE_COLLECTIONS_BY_USER.concat(EXPORT_EXTRA_COLLECTIONS)
  for (const col of exportCols) {
    const res = await db.collection(col).where({ user_id: userId }).limit(2000).get()
    collections[col] = (res && res.data) || []
  }

  // 2) 关联表：按账本 id
  const ledgerRes = await db
    .collection('ledgers')
    .where({ user_id: userId })
    .field({ _id: true })
    .limit(2000)
    .get()
  const ledgerIds = ((ledgerRes && ledgerRes.data) || []).map((l) => l._id).filter(Boolean)
  if (ledgerIds.length) {
    for (const col of ['ledger_members', 'member_ledgers']) {
      const res = await db
        .collection(col)
        .where({ ledger_id: db.command.in(ledgerIds) })
        .limit(2000)
        .get()
      collections[col] = (res && res.data) || []
    }
  }

  // 3) 关联表：按餐次 id
  const mealRes = await db
    .collection('meals')
    .where({ user_id: userId })
    .field({ _id: true })
    .limit(2000)
    .get()
  const mealIds = ((mealRes && mealRes.data) || []).map((m) => m._id).filter(Boolean)
  if (mealIds.length) {
    const res = await db
      .collection('meal_food_items')
      .where({ meal_id: db.command.in(mealIds) })
      .limit(2000)
      .get()
    collections.meal_food_items = (res && res.data) || []
  }

  const userDoc = await getDocByUser('users', userId)
  return {
    app: 'sparejar',
    note: '余钱罐用户数据导出',
    exported_at: nowTs(),
    user_id: userId,
    user: userDoc,
    collections
  }
}

/**
 * 定时清理：硬删所有已过冷静期（delete_scheduled_at <= now 且 status='deleting'）的用户。
 * 由 cronDailySettlement 在日切后调用，无需人工触发。
 * @returns {Promise<{ purged: Array<{ user_id: string, deleted?: object, error?: string }> }>}
 */
async function purgeScheduledDeletions() {
  const db = getDb()
  const nowStr = formatDateTime(new Date())
  const due = await db
    .collection('users')
    .where({ account_status: 'deleting', delete_scheduled_at: db.command.lte(nowStr) })
    .field({ user_id: true })
    .limit(200)
    .get()
  const purged = []
  for (const u of ((due && due.data) || [])) {
    try {
      const deleted = await deleteAccount(u.user_id)
      purged.push({ user_id: u.user_id, deleted })
    } catch (e) {
      console.error('[purgeScheduledDeletions] 删除失败', u.user_id, e)
      purged.push({ user_id: u.user_id, error: e.message })
    }
  }
  return { purged }
}

/**
 * 返回用户账号新建日期（YYYY-MM-DD）。
 * 用于约束「补录 / 补建历史业务数据」不得早于账号创建日：
 * 新建前用户从未使用系统，不可能产生任何业务数据。
 * @param {string} userId
 * @returns {Promise<string|null>} 账号创建日 date_key；无法获取时返回 null（调用方保守处理）。
 */
async function getUserCreatedDateKey(userId) {
  const u = await getDocByUser('users', userId)
  if (!u || !u.created_at) return null
  return formatDateKey(new Date(String(u.created_at).replace(' ', 'T')))
}

// 分页拉取整张集合（uniCloud 单次 get 默认上限 100，需提升 limit 并翻页）
async function fetchAll(collectionName) {
  const db = getDb()
  const out = []
  let skip = 0
  const batch = 500
  while (true) {
    const res = await db.collection(collectionName).limit(batch).skip(skip).get()
    const data = (res && res.data) || []
    out.push(...data)
    if (data.length < batch) break
    skip += batch
  }
  return out
}

/**
 * 排查「越界补录」：扫描 daily_settlements 中 date_key 早于对应账号创建日的记录。
 * 这类记录在正常情况下不应存在（新建前用户无任何业务数据），属违规补建或上次注销残留。
 * @returns {Promise<{total:number, violations:Array}>}
 */
async function auditPreAccountSettlements() {
  const users = await fetchAll('users')
  const byUser = {}
  for (const u of users) {
    byUser[u.user_id] = u.created_at
      ? formatDateKey(new Date(String(u.created_at).replace(' ', 'T')))
      : null
  }
  const settlements = await fetchAll('daily_settlements')
  const violations = []
  for (const s of settlements) {
    const created = byUser[s.user_id]
    if (created && s.date_key && s.date_key < created) {
      violations.push({ user_id: s.user_id, date_key: s.date_key, created_at: created, _id: s._id })
    }
  }
  return { total: violations.length, violations }
}

/**
 * 清理「越界补录」：删除 auditPreAccountSettlements 找到的违规 settlement。
 * 仅删除日期早于账号创建日的记录（新用户本不该有这些历史数据），不影响正常数据。
 * @param {boolean} [dryRun] 为 true 时只返回待删清单，不实际删除。
 */
async function cleanPreAccountSettlements(dryRun) {
  const audit = await auditPreAccountSettlements()
  if (dryRun) return { dryRun: true, toDelete: audit.violations }
  const db = getDb()
  let removed = 0
  for (const v of audit.violations) {
    try {
      await db.collection('daily_settlements').doc(v._id).remove()
      removed++
    } catch (e) {
      // 单条失败不阻断其余
    }
  }
  return { removed, total: audit.violations.length }
}

// 确保 user_settings 文档存在（缺失则按默认值创建），返回该文档。
// 兜底用：部分老账号 / 初始化未完整创建时，避免 state.settings 为空，
// 从而导致引导判定、限额显示等依赖 settings 的功能异常。
async function ensureUserSettings(userId) {
  await ensureDoc('user_settings', userId, () => ({
    onboarding_done: false,
    language: 'zh-CN',
    daily_base_limit: 10000,
    limit_dim: 'day',
    created_at: nowTs(),
  }))
  return getDocByUser('user_settings', userId)
}

module.exports = {
  updateOnboarding,
  getUserCreatedDateKey,
  auditPreAccountSettlements,
  cleanPreAccountSettlements,
  updateUser,
  getWxAccessToken,
  recordSubscribeAuth,
  sendSubscribeMessage,
  initUser,
  ensureUserSettings,
  deleteAccount,
  scheduleDeleteAccount,
  cancelDeleteAccount,
  exportUserData,
  purgeScheduledDeletions,
}
