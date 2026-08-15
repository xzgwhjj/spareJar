'use strict'

const db = require('../core/db')
const { getDocByUser, getDb, upsertByUnique, isDuplicateKeyError } = require('../core/db')
const { formatDateKey, formatMonthKey, formatYearKey, todayDateKey, addDaysToDateKey, parseDateKey, formatDateTime, toStoredTime, nowTs } = require('../utils/date')
const money = require('../utils/money')
const ids = require('../utils/id')
const transaction = require('./transaction')

// 对缺失（未记账/未结算）的天补建 daily_settlements 记录，使其 available_start 等字段落库，
// 后续查询即可直接读取字段，无需内存推算。仅处理 <= 今天的天，避免给未来/远古日期造记录。
// 返回新写入的 settlement map。
async function ensureDaySettlements(userId, days) {
  const todayKey = todayDateKey()
  const db = getDb()
  const existingRes = await db.collection('daily_settlements')
    .where({ user_id: userId, date_key: db.command.in(days) })
    .get()
  const have = new Set((existingRes.data || []).map((s) => s.date_key))
  const need = days.filter((k) => !have.has(k) && k <= todayKey)
  const map = {}
  await Promise.all(need.map(async (k) => {
    // recalculateDailySettlement 内部 upsert，写入含滚入的 available_start 真值字段
    const s = await transaction.recalculateDailySettlement(userId, k)
    map[k] = s
  }))
  return map
}

async function getChallengeSummary(userId) {
  const db = getDb()
  const monthKey = formatMonthKey()
  const yearKey = formatYearKey()

  const [streak, monthlyRes, yearlyRes] = await Promise.all([
    getDocByUser('user_streaks', userId),
    db.collection('challenge_records').where({ user_id: userId, challenge_type: 'monthly', period_key: monthKey }).orderBy('created_at', 'asc').get(),
    db.collection('challenge_records').where({ user_id: userId, challenge_type: 'yearly', period_key: yearKey }).orderBy('created_at', 'asc').get()
  ])

  // 最近 7 天 daily 挑战，用于热力图。与首页限额同源：直接读 daily_settlements.available_start（含滚入）。
  // 骨架固定为「本周一 ~ 本周日」(周一为一周起点)，与前端 weekKeys 对齐，避免前后端日期错位。
  const pad2 = (n) => (n < 10 ? `0${n}` : String(n))
  const now = new Date()
  const dow = (now.getDay() + 6) % 7 // 周一=0 … 周日=6
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    days.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`)
  }
  const settleRes = await db.collection('daily_settlements')
    .where({ user_id: userId, date_key: db.command.in(days) })
    .get()
  const settleMap = {}
  ;(settleRes.data || []).forEach((s) => { settleMap[s.date_key] = s })
  // 未记账/未结算的天（daily_settlements 缺失）补建记录，使 available_start 落库，
  // 后续查询直接读取字段，无需内存推算
  const missingDays = days.filter((k) => !settleMap[k])
  const ensured = await ensureDaySettlements(userId, missingDays)
  Object.assign(settleMap, ensured)
  const history7 = days.map((k) => {
    const s = settleMap[k]
    // 限额直接取含滚入的 available_start 字段（补建后必然存在）
    const limit = s ? (s.available_start || 0) : 0
    const consumed = s ? (s.consumed || 0) : 0
    const baseLimit = s ? (s.base_limit || 0) : 0
    const pendingRollover = s ? (s.pending_rollover_fen || 0) : 0
    const surplus = s ? (s.surplus || 0) : 0
    const overAmount = s ? (s.over_amount || 0) : 0
    // 达标判定与首页一致：实际支出 ≤ 含滚入总限额
    const isSuccess = limit > 0 ? consumed <= limit : false
    return {
      date_key: k,
      date: k.slice(5),
      consumed,
      base_limit: limit,
      // 拆解口径字段（与首页一致）：固定限额 + 滚入结余
      fixed_limit: baseLimit,
      rollover_limit: pendingRollover,
      surplus,
      over_amount: overAmount,
      is_success: isSuccess
    }
  })

  // 调试：确认 daily_settlements.available_start 是否被正确读取（含滚入总限额）
  console.log('[getChallengeSummary] history7 raw =>', JSON.stringify(history7.map((h) => ({
    date_key: h.date_key,
    available_start: (settleMap[h.date_key] && settleMap[h.date_key].available_start) || null,
    base_limit: h.base_limit,
    consumed: h.consumed
  }))))

  return {
    streak: streak || null,
    monthly: monthlyRes.data || [],
    yearly: yearlyRes.data || [],
    history7
  }
}

/**
 * 设置月/年挑战目标（自定义周期总支出上限）。支持绑定单个子账本。
 * 金额单位为「分」。
 * @param {string} userId
 * @param {'monthly'|'yearly'} type
 * @param {string} periodKey
 * @param {number} targetAmount
 * @param {string} [ledgerId]
 */

async function setChallengeTarget(userId, type, periodKey, targetAmount, ledgerId) {
  if (type !== 'monthly' && type !== 'yearly') throw new Error('only monthly/yearly challenge can set target')
  const target = Number(targetAmount)
  if (!Number.isInteger(target) || target < 1) throw new Error('target_amount must be a positive integer (fen)')
  const ts = nowTs()
  const patch = { target_amount: target, updated_at: ts }
  if (ledgerId) patch.ledger_id = ledgerId
  const saved = await upsertByUnique(
    'challenge_records',
    { user_id: userId, challenge_type: type, period_key: periodKey },
    patch,
    {
      consumed_amount: 0,
      base_limit_snapshot: null,
      ledger_id: ledgerId || '',
      is_success: false,
      status: 'active',
      created_at: ts
    }
  )
  return { _id: saved._id, ...patch }
}

/**
 * 读取成就定义并合并用户解锁状态。
 * @param {string} userId
 */

async function getAchievements(userId) {
  const db = getDb()
  const [achRes, unlockedRes] = await Promise.all([
    db.collection('achievements').where({ is_active: true }).orderBy('sort_order', 'asc').get(),
    db.collection('user_achievements').where({ user_id: userId }).get()
  ])
  const unlockedMap = {}
  ;(unlockedRes.data || []).forEach((a) => { unlockedMap[a.achievement_code] = a })
  const list = (achRes.data || []).map((a) => ({
    ...a,
    unlocked: !!unlockedMap[a.code],
    unlocked_at: unlockedMap[a.code] ? unlockedMap[a.code].unlocked_at : null
  }))
  return list
}

/**
 * 根据当前用户状态自动评估并解锁符合条件的成就（幂等）。
 * 覆盖条件类型：streak / limit / record / challenge。
 * @param {string} userId
 * @returns {Array} 本次新解锁的成就定义（含 unlock_skin_id）
 */

async function evaluateAndUnlockAchievements(userId) {
  const db = getDb()
  const [achRes, unlockedRes, streak, settings, txRes, wishRes, monthRes] = await Promise.all([
    db.collection('achievements').where({ is_active: true }).get(),
    db.collection('user_achievements').where({ user_id: userId }).get(),
    getDocByUser('user_streaks', userId),
    getDocByUser('user_settings', userId),
    db.collection('transactions').where({ user_id: userId }).limit(1).get(),
    db.collection('wishes').where({ user_id: userId }).limit(1).get(),
    db.collection('challenge_records').where({
      user_id: userId,
      challenge_type: 'monthly',
      period_key: formatMonthKey(),
      is_success: true
    }).get()
  ])
  const unlockedSet = new Set((unlockedRes.data || []).map((a) => a.achievement_code))
  const currentStreak = streak ? (streak.daily_current_streak || 0) : 0
  const limitSet = !!(settings && typeof settings.daily_base_limit === 'number' && settings.daily_base_limit > 0)
  const hasRecord = !!(txRes.data && txRes.data[0])
  const hasWish = !!(wishRes.data && wishRes.data[0])
  const monthlySuccessCount = (monthRes.data || []).length

  // 成就解锁皮肤钩子（§六.4）：连续挑战 7/30 天等成就可解锁罐体皮肤
  const userDoc = await getDocByUser('users', userId)
  const unlockedSkins = new Set((userDoc && userDoc.jar_skins_unlocked) || [])
  const skinsToAdd = []

  const newly = []
  for (const a of (achRes.data || [])) {
    if (unlockedSet.has(a.code)) continue
    let ok = false
    if (a.condition_type === 'streak') {
      ok = currentStreak >= (a.condition_value || 0)
    } else if (a.condition_type === 'limit') {
      ok = limitSet
    } else if (a.condition_type === 'record') {
      const ev = a.condition_meta && a.condition_meta.event
      if (ev === 'transaction_create') ok = hasRecord
      else if (ev === 'wish_create') ok = hasWish
    } else if (a.condition_type === 'challenge') {
      const ct = a.condition_meta && a.condition_meta.challenge_type
      if (ct === 'monthly') ok = monthlySuccessCount >= (a.condition_value || 1)
    }
    if (ok) {
      const ts = nowTs()
      try {
        await db.collection('user_achievements').add({
          user_id: userId,
          achievement_code: a.code,
          unlocked_at: ts,
          is_seen: false,
          created_at: ts
        })
      } catch (err) {
        // 并发下已解锁：跳过，不重复计入 newly
        if (isDuplicateKeyError(err)) continue
        throw err
      }
      if (a.unlock_skin_id && !unlockedSkins.has(a.unlock_skin_id)) {
        skinsToAdd.push(a.unlock_skin_id)
        unlockedSkins.add(a.unlock_skin_id)
      }
      newly.push(a)
    }
  }

  // 批量将解锁皮肤写入 users.jar_skins_unlocked（去重）
  if (skinsToAdd.length && userDoc) {
    await getDb().collection('users').doc(userDoc._id).update({
      jar_skins_unlocked: Array.from(unlockedSkins),
      updated_at: nowTs()
    })
  }
  return newly
}


/**
 * 按时间规格返回限额使用状态。
 * @param {string} userId
 * @param {'day'|'month'|'year'} dim  时间规格
 * @param {string} key   dim=day → 'YYYY-MM-DD'；dim=month → 'YYYY-MM'；dim=year → 'YYYY'
 * @returns
 *   day   → { date_key, spent, limit, is_success, status }
 *   month → { key, days: [{ date_key, spent, limit, is_success, status }] }  （当月每日）
 *   year  → { key, months: [{ month_key, spent, limit, is_success, status }] }（当年每月汇总）
 * status: 'over' 超出 | 'ok' 未超出且达标 | 'none' 未设置限额/无数据
 */
async function getLimitStatus(userId, dim, key) {
  const db = getDb()
  const pad2 = (n) => (n < 10 ? `0${n}` : String(n))

  if (dim === 'day') {
    // 与首页限额同源：直接读 daily_settlements.available_start（含滚入），缺失则补建
    let settle = await db.collection('daily_settlements')
      .where({ user_id: userId, date_key: key })
      .limit(1).get()
    settle = (settle.data && settle.data[0]) || null
    if (!settle && key <= todayDateKey()) {
      settle = await transaction.recalculateDailySettlement(userId, key)
    }
    const limit = settle ? (settle.available_start || 0) : 0
    const spent = settle ? (settle.consumed || 0) : 0
    const isSuccess = limit > 0 ? spent <= limit : false
    const status = limit > 0 ? (isSuccess ? 'ok' : 'over') : 'none'
    // 调试：确认 day 维度读到的 available_start
    console.log('[getLimitStatus:day]', key, 'available_start=', settle && settle.available_start, 'limit=', limit, 'spent=', spent)
    return { date_key: key, spent, limit, is_success: isSuccess, status }
  }

  if (dim === 'month') {
    const [y, m] = key.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    const keys = []
    for (let d = 1; d <= daysInMonth; d++) keys.push(`${y}-${pad2(m)}-${pad2(d)}`)
    // 与首页限额同源：直接读 daily_settlements.available_start（含滚入），缺失天补建
    const settleRes = await db.collection('daily_settlements')
      .where({ user_id: userId, date_key: db.command.in(keys) })
      .get()
    const settleMap = {}
    ;(settleRes.data || []).forEach((s) => { settleMap[s.date_key] = s })
    const missingDays = keys.filter((k) => !settleMap[k])
    const ensured = await ensureDaySettlements(userId, missingDays)
    Object.assign(settleMap, ensured)
    const days = keys.map((k) => {
      const settle = settleMap[k]
      const limit = settle ? (settle.available_start || 0) : 0
      const spent = settle ? (settle.consumed || 0) : 0
      const isSuccess = limit > 0 ? spent <= limit : false
      const status = limit > 0 ? (isSuccess ? 'ok' : 'over') : 'none'
      return { date_key: k, spent, limit, is_success: isSuccess, status }
    })
    return { key, days }
  }

  // year
  const y = Number(key)
  const keys = []
  for (let mo = 1; mo <= 12; mo++) keys.push(`${y}-${pad2(mo)}`)
  const res = await db.collection('challenge_records')
    .where({ user_id: userId, challenge_type: 'monthly', period_key: db.command.in(keys) })
    .get()
  const map = {}
  ;(res.data || []).forEach((r) => { map[r.period_key] = r })
  const months = keys.map((mk) => {
    const rec = map[mk]
    const limit = rec ? (rec.target_amount || 0) : 0
    const spent = rec ? (rec.consumed_amount || 0) : 0
    const isSuccess = rec ? !!rec.is_success : false
    const status = limit > 0 ? (isSuccess ? 'ok' : 'over') : 'none'
    return { month_key: mk, spent, limit, is_success: isSuccess, status }
  })
  return { key, months }
}

module.exports = {
  getChallengeSummary,
  getLimitStatus,
  setChallengeTarget,
  getAchievements,
  evaluateAndUnlockAchievements,
}
