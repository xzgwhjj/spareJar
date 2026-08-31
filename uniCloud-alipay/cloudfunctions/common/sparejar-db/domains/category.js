'use strict'

const db = require('../core/db')
const { getDocByUser, getDb, upsertByUnique, isDuplicateKeyError } = require('../core/db')
const { formatDateKey, nowTs } = require('../utils/date')
const money = require('../utils/money')
const ids = require('../utils/id')
const { MAX_CUSTOM_CATEGORIES } = require('../core/constants')

async function getEffectiveBaseLimit(userId, dateKey) {
  const settings = await getDocByUser('user_settings', userId)
  if (!settings) return 10000
  return computeDayBaseLimit(settings, dateKey)
}

/**
 * 分层限额引擎：根据 settings 算出指定日期的 base_limit（分）。
 * - dim=day：pending → daily_base_limit（原逻辑）
 * - dim=month：月总池 → 按 month_strategy 拆到当日
 * - dim=year：年总池 → 年策略拆月 → 月策略拆日
 * 局部 override（day/month）为硬覆盖，且从父池预扣（保证父池不被突破）。
 * @param {Object} settings user_settings 文档
 * @param {string} dateKey YYYY-MM-DD
 * @returns {number} 当日 base_limit（分）
 */

function computeDayBaseLimit(settings, dateKey) {
  const dim = settings.limit_dim || 'day'
  const overrides = Array.isArray(settings.overrides) ? settings.overrides : []

  // day 维度：原逻辑
  if (dim === 'day') {
    if (settings.pending_base_limit != null && settings.limit_effective_date && settings.limit_effective_date <= dateKey) {
      return settings.pending_base_limit
    }
    return settings.daily_base_limit || 10000
  }

  const monthKey = dateKey.slice(0, 7)
  const yearKey = dateKey.slice(0, 4)
  const dayOverride = overrides.find(o => o.type === 'day' && o.key === dateKey)
  if (dayOverride) return dayOverride.amount_fen // 硬覆盖优先

  // 是否次日生效（pending）
  const pendingActive = settings.pending_limit_dim && settings.limit_effective_date && settings.limit_effective_date <= dateKey
  const effDim = pendingActive ? settings.pending_limit_dim : dim
  const effAmount = pendingActive ? (settings.pending_amount_fen != null ? settings.pending_amount_fen : settings.limit_amount_fen) : settings.limit_amount_fen
  const effYearStrat = pendingActive ? settings.pending_year_strategy : settings.year_strategy
  const effMonthStrat = pendingActive ? settings.pending_month_strategy : settings.month_strategy

  // 取某月 override（硬覆盖该月，并从年池预扣）
  const monthOverride = overrides.find(o => o.type === 'month' && o.key === monthKey)
  const monthPoolFromOverride = monthOverride ? monthOverride.amount_fen : null

  // —— 年维度：先拆月 ——
  let monthPool
  if (effDim === 'year') {
    if (monthPoolFromOverride != null) {
      monthPool = monthPoolFromOverride
    } else {
      const monthsInYear = 12
      if (effYearStrat === 'equal') {
        monthPool = Math.floor((effAmount || 0) / monthsInYear)
      } else {
        // rollover：年池剩余 / 剩余月
        const monthNum = parseInt(monthKey.slice(5, 7), 10)
        const remainingMonths = 13 - monthNum // 含本月
        monthPool = Math.floor((effAmount || 0) / Math.max(1, remainingMonths))
      }
    }
  } else {
    // month 维度：月池 = 月度 override 或 limit_amount_fen
    monthPool = monthPoolFromOverride != null ? monthPoolFromOverride : (effAmount || 0)
  }

  // —— 月 → 日 ——
  if (effMonthStrat === 'equal') {
    const daysInMonth = daysInMonthOf(dateKey)
    const base = Math.floor(monthPool / daysInMonth)
    return Math.max(0, base)
  } else {
    // rollover：月池剩余 / 剩余天（含今日）。由于结算时无法实时知"已花"，
    // 这里用"月池 − 本月已硬覆盖日额预扣"近似；精确重算在 runDailySettlement 内完成。
    const daysInMonth = daysInMonthOf(dateKey)
    const dayNum = parseInt(dateKey.slice(8, 10), 10)
    const remainingDays = daysInMonth - dayNum + 1
    const preDeduct = sumDayOverridesInMonth(overrides, monthKey, dateKey)
    const poolRemain = Math.max(0, monthPool - preDeduct)
    return Math.max(0, Math.floor(poolRemain / Math.max(1, remainingDays)))
  }
}

/** 当月天数 */

function daysInMonthOf(dateKey) {
  const y = parseInt(dateKey.slice(0, 4), 10)
  const m = parseInt(dateKey.slice(5, 7), 10)
  return new Date(y, m, 0).getDate()
}

/** 本月内（截至今日之前）的 day override 预扣总额（硬覆盖从父池扣额） */

function sumDayOverridesInMonth(overrides, monthKey, dateKey) {
  return overrides
    .filter(o => o.type === 'day' && o.key.slice(0, 7) === monthKey && o.key < dateKey)
    .reduce((s, o) => s + (o.amount_fen || 0), 0)
}

/** 允许前端更新的 user_settings 字段白名单（防止越权写入） */
const SETTINGS_WRITABLE = [
  'daily_base_limit',
  'pending_base_limit',
  'limit_effective_date',
  'default_surplus_action',
  'default_wish_id',
  'refund_restore_limit',
  'monthly_budget',
  'over_limit_penalty_enabled',
  'penalty_streak_deduct',
  'notify_over_limit',
  'notify_daily_surplus',
  'notify_streak_risk',
  'asset_view_mode',
  'meal_tracking_enabled',
  'fat_loss_mode_enabled',
  'savings_withdraw_limit_pct',
  'limit_dim',
  'limit_amount_fen',
  'year_strategy',
  'month_strategy',
  'pending_limit_dim',
  'pending_amount_fen',
  'pending_year_strategy',
  'pending_month_strategy',
  'overrides'
]

/**
 * 更新用户个性化设置（白名单字段）。文档不存在时自动创建。
 * @param {string} userId
 * @param {Record<string, unknown>} patch
 */

/**
 * 按 user_settings 的限额口径派生月/年挑战目标（分）。与 transaction.js:derivePeriodTarget、challenge.js:resolvePeriodLimit 算法保持一致。
 * dim='day' 时无月/年目标（返回 0）。
 */
function derivePeriodTarget(settings, type, periodKey) {
  if (!settings) return 0
  const dim = settings.limit_dim || 'day'
  const limitAmount = settings.limit_amount_fen || 0
  const overrides = settings.overrides || []
  if (type === 'monthly') {
    if (dim === 'month') {
      const mo = overrides.find(o => o.type === 'month' && o.key === periodKey)
      return mo ? mo.amount_fen : limitAmount
    }
    if (dim === 'year') {
      const mo = overrides.find(o => o.type === 'month' && o.key === periodKey)
      return mo ? mo.amount_fen : Math.floor(limitAmount / 12)
    }
    return 0
  }
  if (dim === 'year') return limitAmount
  return 0
}

// 计算某周期之后的下一周期键（用于「下月/下年生效」回写）
function nextPeriodKey(type, fromKey) {
  if (type === 'monthly') {
    const [y, m] = fromKey.split('-').map(Number)
    const d = new Date(y, m, 1) // m 为 1-based，构造下月 1 号
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  // yearly
  return String(Number(fromKey) + 1)
}

async function updateUserSettings(userId, patch = {}) {
  const db = getDb()
  const settings = await getDocByUser('user_settings', userId)
  const ts = nowTs()
  const updateDoc = { updated_at: ts }
  for (const key of SETTINGS_WRITABLE) {
    if (Object.prototype.hasOwnProperty.call(patch, key) && patch[key] !== undefined) {
      updateDoc[key] = patch[key]
    }
  }
  const res = await upsertByUnique('user_settings', { user_id: userId }, updateDoc)

  // 方案 B（修订）：首页限额变更 → 同步「当前年」月/年挑战目标到 challenge_records。
  // 逻辑集中在 challenge.syncPeriodTargets（按天 getEffectiveBaseLimit 求和），此处延迟 require 避免循环依赖。
  // 仅当影响挑战目标的字段被修改时回写。
  const affectsChallenge = ['limit_dim', 'limit_amount_fen', 'overrides', 'pending_base_limit', 'pending_amount_fen', 'pending_limit_dim', 'pending_year_strategy', 'pending_month_strategy', 'limit_effective_date'].some((k) => k in patch)
  if (affectsChallenge) {
    try {
      const { syncPeriodTargets } = require('./challenge')
      await syncPeriodTargets(userId, { year: new Date().getFullYear() })
    } catch (err) {
      // 挑战目标回写失败不应阻断限额保存主流程
      console.error('[updateUserSettings] syncPeriodTargets 失败', err && (err.stack || err.message || err))
    }
  }

  return res.__created ? { created: true, ...updateDoc } : { updated: true, ...updateDoc }
}

/**
 * 当日消费总额（分）。
 * - 限额口径（challengeMode=false）：按 include_in_daily_limit 过滤；退款冲减受 refundRestore（user_settings.refund_restore_limit）控制。
 * - 挑战口径（challengeMode=true）：按 include_in_challenge 过滤；退款始终冲减（「退款不计入挑战」），不受限额恢复开关影响。
 * @param {string} userId
 * @param {string} dateKey
 * @param {boolean} [refundRestore] 限额口径下是否将退款冲减当日消费（对应 refund_restore_limit）
 * @param {boolean} [challengeMode] 是否按挑战口径统计（include_in_challenge + 退款始终冲减）
 */

async function sumDailyLimitExpenses(userId, dateKey, refundRestore = true, challengeMode = false) {
  const db = getDb()
  const filterField = challengeMode ? 'include_in_challenge' : 'include_in_daily_limit'
  const res = await db.collection('transactions').where({
    user_id: userId,
    date_key: dateKey,
    type: 'expense',
    [filterField]: true,
    deleted_at: db.command.eq(null)
  }).field({ amount: true }).get()
  let total = (res.data || []).reduce((sum, row) => sum + (row.amount || 0), 0)

  // 退款冲减：挑战口径始终冲减（退款不计入挑战）；限额口径受 refund_restore_limit 控制
  const doRefund = challengeMode ? true : refundRestore
  if (doRefund) {
    const refundRes = await db.collection('transactions').where({
      user_id: userId,
      date_key: dateKey,
      type: 'refund',
      [filterField]: true,
      deleted_at: db.command.eq(null)
    }).field({ amount: true }).get()
    const refundTotal = (refundRes.data || []).reduce((sum, row) => sum + (row.amount || 0), 0)
    total = Math.max(0, total - refundTotal)
  }
  return total
}


async function listCategories(userId, opts = {}) {
  const db = getDb()
  const where = { user_id: userId }
  if (opts.type) where.type = opts.type
  if (!opts.includeHidden) where.is_hidden = false
  const res = await db.collection('categories').where(where).orderBy('sort_order', 'asc').get()
  const cats = (res.data || []).map((c) => ({ ...c }))

  // 统计每个分类的关联账目数（未删除）
  const ids = cats.map((c) => c._id)
  const usageMap = {}
  if (ids.length) {
    const agg = await db.collection('transactions').aggregate()
      .match({ user_id: userId, category_id: { $in: ids }, deleted_at: db.command.eq(null) })
      .group({ _id: '$category_id', count: { $sum: 1 } })
      .end()
    for (const row of (agg.data || [])) {
      usageMap[String(row._id)] = row.count
    }
  }
  return cats.map((c) => ({ ...c, usage_count: usageMap[String(c._id)] || 0 }))
}

/** 取某 type 的历史最大排序号（用于平铺排序计算） */
function maxSortOf(cats, type) {
  let max = 0
  for (const c of cats) {
    if (c.type === type && typeof c.sort_order === 'number' && c.sort_order > max) max = c.sort_order
  }
  return max
}

/**
 * 新建自定义分类。
 * @param {string} userId
 * @param {{ type: 'expense'|'income', name: string, icon?: string, desc?: string }} data
 */

async function createCategory(userId, data = {}) {
  const db = getDb()
  const type = data.type
  if (type !== 'expense' && type !== 'income') throw new Error('type 必须为 expense 或 income')

  const name = typeof data.name === 'string' ? data.name.trim() : ''
  if (!name) throw new Error('分类名称不能为空')
  if (name.length > 32) throw new Error('分类名称不能超过32字')

  const icon = typeof data.icon === 'string' && data.icon ? data.icon.slice(0, 64) : '📦'

  // 简介/备注（可选，最长 100 字）
  const desc = typeof data.desc === 'string' ? data.desc.trim().slice(0, 100) : ''

  // 同 type 下分类名唯一（对应 uk_user_type_name），提前拦截给出可读错误
  const dupRes = await db.collection('categories').where({ user_id: userId, type, name }).limit(1).get()
  if (dupRes.data && dupRes.data[0]) throw new Error('该分类名称已存在')

  // 自定义分类上限
  const cntRes = await db.collection('categories').where({ user_id: userId, type, is_system: false }).count()
  if ((cntRes.total || 0) >= MAX_CUSTOM_CATEGORIES) {
    throw new Error(`自定义分类已达上限(${MAX_CUSTOM_CATEGORIES})`)
  }

  // 下一个排序号（排在同类全部分类之后，type 内平铺连续）
  const maxRes = await db.collection('categories').where({ user_id: userId, type }).orderBy('sort_order', 'desc').limit(1).get()
  const maxSort = (maxRes.data && maxRes.data[0] && maxRes.data[0].sort_order) || 0

  const ts = nowTs()
  let addRes
  try {
    addRes = await db.collection('categories').add({
      user_id: userId,
      type,
      name,
      icon,
      desc,
      is_system: false,
      is_hidden: false,
      sort_order: maxSort + 1,
      created_at: ts
    })
  } catch (err) {
    // 并发双击提交撞唯一索引：转为可读错误
    if (isDuplicateKeyError(err)) throw new Error('该分类名称已存在')
    throw err
  }
  return {
    _id: addRes.id, user_id: userId, type, name, icon, desc,
    is_system: false, is_hidden: false, sort_order: maxSort + 1, created_at: ts, usage_count: 0
  }
}

/**
 * 编辑分类：预置分类仅可切换隐藏；自定义可改名称/图标/隐藏/排序。
 * @param {string} userId
 * @param {string} categoryId
 * @param {{ name?: string, icon?: string, is_hidden?: boolean, sort_order?: number }} data
 */

async function updateCategory(userId, categoryId, data = {}) {
  const db = getDb()
  const res = await db.collection('categories').doc(categoryId).get()
  const cat = res.data && res.data[0]
  if (!cat || cat.user_id !== userId) throw new Error('category not found')

  const ts = nowTs()
  const updateDoc = { updated_at: ts }

  if (cat.is_system) {
    // 预置分类仅允许切换隐藏
    if (data.is_hidden !== undefined) updateDoc.is_hidden = !!data.is_hidden
  } else {
    if (typeof data.name === 'string') {
      const name = data.name.trim()
      if (!name) throw new Error('分类名称不能为空')
      if (name.length > 32) throw new Error('分类名称不能超过32字')
      updateDoc.name = name
    }
    if (typeof data.icon === 'string' && data.icon) updateDoc.icon = data.icon.slice(0, 64)
    if (typeof data.desc === 'string') updateDoc.desc = data.desc.trim().slice(0, 100)
    if (data.is_hidden !== undefined) updateDoc.is_hidden = !!data.is_hidden
    if (typeof data.sort_order === 'number') updateDoc.sort_order = data.sort_order
  }

  await db.collection('categories').doc(categoryId).update(updateDoc)
  return { category_id: categoryId, ...updateDoc }
}

/**
 * 删除自定义分类（软隐藏）。
 * 有关联账目时必须指定合并目标分类（mergeToId），关联账目与贴纸一并转移；
 * 无关联账目可直接删除（mergeToId 可空）。删除后分类置为隐藏并保留 merged_to_id。
 * @param {string} userId
 * @param {string} categoryId
 * @param {string|null} [mergeToId]
 */

async function deleteCategory(userId, categoryId, mergeToId = null) {
  const db = getDb()
  const res = await db.collection('categories').doc(categoryId).get()
  const cat = res.data && res.data[0]
  if (!cat || cat.user_id !== userId) throw new Error('category not found')
  if (cat.is_system) throw new Error('预置分类不可删除')

  const txCountRes = await db.collection('transactions')
    .where({ user_id: userId, category_id: categoryId, deleted_at: db.command.eq(null) })
    .count()
  const txCount = txCountRes.total || 0

  const ts = nowTs()
  if (txCount > 0) {
    if (!mergeToId) throw new Error('该分类下有关联账目，请选择合并目标分类')
    const mRes = await db.collection('categories').doc(mergeToId).get()
    const mCat = mRes.data && mRes.data[0]
    if (!mCat || mCat.user_id !== userId) throw new Error('合并目标分类不存在')
    if (mCat.type !== cat.type) throw new Error('合并目标分类类型不一致')
    if (mCat._id === cat._id) throw new Error('不能合并到自身')
    // 转移关联账目与贴纸
    await db.collection('transactions').where({ user_id: userId, category_id: categoryId })
      .update({ category_id: mergeToId, updated_at: ts })
    await db.collection('stickers').where({ user_id: userId, category_id: categoryId })
      .update({ category_id: mergeToId, updated_at: ts })
  }

  // 软隐藏（删除）
  await db.collection('categories').doc(categoryId).update({
    is_hidden: true,
    merged_to_id: mergeToId || null,
    updated_at: ts
  })
  return { deleted: true, category_id: categoryId, merged_to_id: mergeToId, reassigned: txCount }
}

/**
 * 重排某 type 内自定义分类顺序（整 type 平铺排序，不再按 group 分组）。
 * @param {string} userId
 * @param {'expense'|'income'} type
 * @param {string[]} orderedIds 该 type 内自定义分类的期望顺序（id 列表）
 */

async function reorderCategories(userId, type, orderedIds = []) {
  const db = getDb()
  if (type !== 'expense' && type !== 'income') throw new Error('type 必须为 expense 或 income')
  if (!Array.isArray(orderedIds) || !orderedIds.length) return { ok: true }

  const validRes = await db.collection('categories').where({
    user_id: userId, type, is_system: false, _id: db.command.in(orderedIds)
  }).get()
  const validIds = new Set((validRes.data || []).map((c) => c._id))

  // 自定义分类排序号从 100 起，确保排在预置分类之后
  let order = 100
  for (const id of orderedIds) {
    if (!validIds.has(id)) continue
    await db.collection('categories').doc(id).update({ sort_order: order, updated_at: nowTs() })
    order += 1
  }
  return { ok: true }
}

/**
 * 编辑交易：先回滚旧值影响，再应用新值影响，最后重算当日结算与挑战。
 * 支持跨日编辑（date_key 变化会对新旧两个日期都重算）。
 * @param {string} userId
 * @param {string} transactionId
 * @param {Record<string, unknown>} data 可包含 type/amount/category_id/ledger_id/account_id/note/transaction_at/date_key/include_in_daily_limit/include_in_challenge/image_urls/sticker_id 等
 */

module.exports = {
  getEffectiveBaseLimit,
  computeDayBaseLimit,
  daysInMonthOf,
  sumDayOverridesInMonth,
  updateUserSettings,
  sumDailyLimitExpenses,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
}
