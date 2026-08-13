'use strict'

const db = require('../core/db')
const { getDocByUser, ensureDoc, isDuplicateKeyError } = require('../core/db')
const { formatDateKey, nowTs, getDb } = require('../utils/date')
const money = require('../utils/money')
const ids = require('../utils/id')
const ledger = require('./ledger')
const {
  PRESET_CATEGORY_GROUP,
  PRESET_EXPENSE_CATEGORIES,
  PRESET_INCOME_CATEGORIES
} = require('../core/constants')

async function updateOnboarding(userId, step, done) {
  const db = getDb()
  const userDoc = await getDocByUser('users', userId)
  if (!userDoc) return null
  const patch = { updated_at: nowTs() }
  if (typeof step === 'number') patch.onboarding_step = step
  if (typeof done === 'boolean') patch.onboarding_done = done
  await db.collection('users').doc(userDoc._id).update(patch)
  return patch
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
      created_at: ts,
      updated_at: ts,
      deleted_at: null
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
    .field({ name: true, type: true, group: true, is_system: true, _id: true })
    .get()
  const have = new Set()
  const backfillUpdates = []
  for (const c of (existingCats.data || [])) {
    have.add(`${c.type}:${c.name}`)
    // 老数据回填：系统预置分类若缺 group，按 name→group 查表补上
    if (c.is_system && !c.group) {
      const g = PRESET_CATEGORY_GROUP[`${c.type}:${c.name}`]
      if (g) backfillUpdates.push({ _id: c._id, group: g })
    }
  }
  for (const u of backfillUpdates) {
    await getDb().collection('categories').doc(u._id).update({ group: u.group })
  }
  const categoryDocs = []
  for (const c of PRESET_EXPENSE_CATEGORIES) {
    if (have.has(`expense:${c.name}`)) continue
    categoryDocs.push({
      user_id: userId, type: 'expense', group: c.group, name: c.name, icon: c.icon,
      is_system: true, is_hidden: false, sort_order: c.sort_order, merged_to_id: null, created_at: ts
    })
  }
  for (const c of PRESET_INCOME_CATEGORIES) {
    if (have.has(`income:${c.name}`)) continue
    categoryDocs.push({
      user_id: userId, type: 'income', group: c.group, name: c.name, icon: c.icon,
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

  return { created: isNew, user: userDoc, default_ledger_id: masterLedger._id }
}


module.exports = {
  updateOnboarding,
  getWxAccessToken,
  recordSubscribeAuth,
  sendSubscribeMessage,
  initUser,
}
