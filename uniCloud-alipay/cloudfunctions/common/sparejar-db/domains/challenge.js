'use strict'

const db = require('../core/db')
const { getDocByUser, getDb, upsertByUnique, isDuplicateKeyError } = require('../core/db')
const { formatDateKey, formatMonthKey, formatYearKey, todayDateKey, addDaysToDateKey, parseDateKey, formatDateTime, toStoredTime, nowTs } = require('../utils/date')
const money = require('../utils/money')
const ids = require('../utils/id')
const transaction = require('./transaction')
const misc = require('./misc')

// 对缺失（未记账/未结算）的天补建 daily_settlements 记录，使其 available_start 等字段落库，
// 后续查询即可直接读取字段，无需内存推算。仅处理 <= 今天的天，避免给未来/远古日期造记录。
// 返回新写入的 settlement map。
async function ensureDaySettlements(userId, days) {
  const todayKey = todayDateKey()
  // 账号新建日期：禁止补建早于该日的 settlement（新建前用户从未使用系统，不可能有业务数据）
  const createdDateKey = await misc.getUserCreatedDateKey(userId)
  const db = getDb()
  const existingRes = await db.collection('daily_settlements')
    .where({ user_id: userId, date_key: db.command.in(days) })
    .get()
  const have = new Set((existingRes.data || []).map((s) => s.date_key))
  // 越界天（早于账号创建日）一律不补建，并明确标记异常
  const rejected = []
  const need = days.filter((k) => {
    if (createdDateKey && k < createdDateKey) {
      rejected.push(k)
      return false
    }
    return !have.has(k) && k <= todayKey
  })
  if (rejected.length) {
    console.warn('[ensureDaySettlements] 拒绝补建早于账号创建日的 settlement：',
      'created=', createdDateKey, 'rejected=', rejected.join(','), 'userId=', userId)
  }
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

  const [streak, monthlyRes, yearlyRes, settings] = await Promise.all([
    getDocByUser('user_streaks', userId),
    db.collection('challenge_records').where({ user_id: userId, challenge_type: 'monthly', period_key: monthKey }).orderBy('created_at', 'asc').get(),
    db.collection('challenge_records').where({ user_id: userId, challenge_type: 'yearly', period_key: yearKey }).orderBy('created_at', 'asc').get(),
    // 仅作兜底：记录 target 仍为 0 时按首页限额派生（方案 B 写入后基本不再触发）
    getDocByUser('user_settings', userId)
  ])
  // 派生兜底目标（与 transaction.js:derivePeriodTarget / category.js:derivePeriodTarget 同源）
  const dim = settings ? (settings.limit_dim || 'day') : 'day'
  const limitAmount = settings ? (settings.limit_amount_fen || 0) : 0
  const overrides = settings ? (settings.overrides || []) : []
  const derive = (type, periodKey) => {
    if (type === 'monthly') {
      if (dim === 'month') {
        const mo = overrides.find((o) => o.type === 'month' && o.key === periodKey)
        return mo ? mo.amount_fen : limitAmount
      }
      if (dim === 'year') {
        const mo = overrides.find((o) => o.type === 'month' && o.key === periodKey)
        return mo ? mo.amount_fen : Math.floor(limitAmount / 12)
      }
      return 0
    }
    if (dim === 'year') return limitAmount
    return 0
  }
  const monthLimit = derive('monthly', monthKey)
  const yearLimit = derive('yearly', yearKey)

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

  // 只读兜底：首页限额同步到挑战目标。
  // 当 challenge_records 中目标为 0/缺失（或根本没有记录）时，用 user_settings 派生的期限额合成一条，
  // 并据此重算 is_success / status，使挑战页直接展示首页设置的限额（无独立设置时）。仅读取，不落库。
  const buildDerived = (type, periodKey, limit, baseRow) => {
    const consumed = baseRow ? (baseRow.consumed_amount || 0) : 0
    const isSuccess = consumed <= limit
    return {
      _id: baseRow ? baseRow._id : null,
      user_id: userId,
      challenge_type: type,
      period_key: periodKey,
      target_amount: limit,
      consumed_amount: consumed,
      is_success: isSuccess,
      status: 'active',
      ledger_id: baseRow ? (baseRow.ledger_id || '') : '',
      _derived: true
    }
  }

  let monthly = (monthlyRes.data || []).map((r) => {
    if (r.target_amount > 0) return r
    if (!monthLimit) return r
    return { ...r, target_amount: monthLimit, is_success: (r.consumed_amount || 0) <= monthLimit, status: 'active', _derived: true }
  })
  // 没有任何挑战记录但首页有月限额时，合成一条派生记录
  if (!monthly.length && monthLimit > 0) {
    monthly = [buildDerived('monthly', monthKey, monthLimit, null)]
  }

  let yearly = (yearlyRes.data || []).map((r) => {
    if (r.target_amount > 0) return r
    if (!yearLimit) return r
    return { ...r, target_amount: yearLimit, is_success: (r.consumed_amount || 0) <= yearLimit, status: 'active', _derived: true }
  })
  if (!yearly.length && yearLimit > 0) {
    yearly = [buildDerived('yearly', yearKey, yearLimit, null)]
  }

  return {
    streak: streak || null,
    monthly,
    yearly,
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
    const baseLimit = settle ? (settle.base_limit || 0) : 0
    const rollover = settle ? (settle.pending_rollover_fen || 0) : 0
    const isSuccess = limit > 0 ? spent <= limit : false
    const status = limit > 0 ? (isSuccess ? 'ok' : 'over') : 'none'
    // 调试：确认 day 维度读到的 available_start
    console.log('[getLimitStatus:day]', key, 'available_start=', settle && settle.available_start, 'limit=', limit, 'spent=', spent)
    return { date_key: key, spent, limit, base_limit: baseLimit, rollover, is_success: isSuccess, status }
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
      const rawLimit = settle ? (settle.available_start || 0) : 0
      const spent = settle ? (settle.consumed || 0) : 0
      const rawBase = settle ? (settle.base_limit || 0) : 0
      const rollover = settle ? (settle.pending_rollover_fen || 0) : 0
      // 后端本无真实数据的日子（被补建的空白日）一律视为「无目标」，不伪装成达标
      const isMissing = missingDays.includes(k)
      const limit = isMissing ? 0 : rawLimit
      const baseLimit = isMissing ? 0 : rawBase
      const isSuccess = limit > 0 ? spent <= limit : false
      const status = limit > 0 ? (isSuccess ? 'ok' : 'over') : 'none'
      return { date_key: k, spent, limit, base_limit: baseLimit, rollover, is_success: isSuccess, status }
    })
    // 月区间：基于 daily_settlements 中 base_limit>0 的真实天（与 syncPeriodTargets 同源）
    const activeDays = days.filter((d) => d.base_limit > 0).map((d) => d.date_key).sort()
    const limitStart = activeDays.length ? activeDays[0] : ''
    const limitEnd = activeDays.length ? activeDays[activeDays.length - 1] : ''
    return { key, days, limit_start: limitStart, limit_end: limitEnd, limit_days: activeDays.length }
  }

  // year：months 直接读 challenge_records.target_amount（由 syncPeriodTargets 维护）
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
    return {
      month_key: mk,
      spent,
      limit,
      is_success: isSuccess,
      status,
      limit_start: rec ? (rec.limit_start || '') : '',
      limit_end: rec ? (rec.limit_end || '') : '',
      limit_days: rec ? (rec.limit_days || 0) : 0
    }
  })
  return { key, months }
}

/**
 * 同步「月/年挑战目标上限」到 challenge_records（当前年）。
 * 完全以 daily_settlements 真实记录为准（单一真相源）：
 *   - 仅对「当月存在 base_limit>0 的日结算记录」的月份建立月挑战；
 *   - 月目标上限 = 该月各天 base_limit 之和（固定限额相加，不含滚入）；
 *   - 月已支出   = 该月各天 challenge_consumed 之和；
 *   - limit_start/limit_end/limit_days = 当月有日限额的起止日与天数；
 *   - 无记录的月份（如未设限额的 1~6 月、未来的 9~12 月）不建月挑战，避免污染 0 值记录。
 * 年目标上限 = 当前年各有效月 target_amount 之和；年已支出 = 各有效月 consumed 之和。
 * 仅重写「当前年」，其他年份不动。
 *
 * @param {string} userId
 * @param {{ year?: number|string }} [opts]  指定年份；默认当前年。一次性回填时可传历史年。
 * @returns {Promise<{year:number, months:Array, yearly:Object}>}
 */
async function syncPeriodTargets(userId, opts = {}) {
  const db = getDb()
  const year = opts.year != null ? Number(opts.year) : Number(formatYearKey())
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  // 当年全部 daily_settlements（真实日限额/消费真值表）
  const settleRes = await db.collection('daily_settlements')
    .where({
      user_id: userId,
      date_key: db.command.gte(yearStart).and(db.command.lte(yearEnd))
    })
    .get()

  // 按月份聚合：仅 base_limit>0 的天计入
  const byMonth = {}
  ;(settleRes.data || []).forEach((s) => {
    if (!s.base_limit || s.base_limit <= 0) return // 不限额的天跳过
    const mk = s.date_key.slice(0, 7)
    if (!byMonth[mk]) byMonth[mk] = { days: [], target: 0, consumed: 0 }
    byMonth[mk].days.push(s.date_key)
    byMonth[mk].target += (s.base_limit || 0)
    byMonth[mk].consumed += (s.challenge_consumed || 0)
  })

  const ts = nowTs()
  const monthRows = []
  const monthKeys = Object.keys(byMonth).sort() // 仅实际有日限额的月
  for (const mk of monthKeys) {
    const agg = byMonth[mk]
    const days = agg.days.sort()
    const limitDays = days.length
    const limitStart = days[0] || ''
    const limitEnd = days[limitDays - 1] || ''
    const target = Math.round(agg.target)
    const consumed = agg.consumed
    const isSuccess = target > 0 ? consumed <= target : false
    await upsertByUnique(
      'challenge_records',
      { user_id: userId, challenge_type: 'monthly', period_key: mk },
      {
        target_amount: target,
        consumed_amount: consumed,
        limit_start: limitStart,
        limit_end: limitEnd,
        limit_days: limitDays,
        is_success: isSuccess,
        status: 'active',
        updated_at: ts
      },
      { ledger_id: '', created_at: ts }
    )
    monthRows.push({ month_key: mk, target_amount: target, consumed_amount: consumed, limit_days: limitDays, limit_start: limitStart, limit_end: limitEnd, is_success: isSuccess })
  }

  // 自洁：删除当前年「无对应有效月」的旧月挑战记录（如之前错误回填产生的 0 值/无效月）
  const validMonths = new Set(monthKeys)
  try {
    const existingRes = await db.collection('challenge_records')
      .where({ user_id: userId, challenge_type: 'monthly', period_key: db.command.gte(`${year}-01`).and(db.command.lte(`${year}-12`)) })
      .get()
    for (const rec of (existingRes.data || [])) {
      if (!validMonths.has(rec.period_key)) {
        await db.collection('challenge_records').doc(rec._id).remove()
      }
    }
  } catch (err) {
    console.error('[syncPeriodTargets] 自洁删除失败（已忽略）', err && (err.stack || err.message || err))
  }

  // 年汇总：仅有效月之和；年区间 = 有效月的起止月键
  const yearTarget = monthRows.reduce((s, r) => s + r.target_amount, 0)
  const yearConsumed = monthRows.reduce((s, r) => s + r.consumed_amount, 0)
  const yearIsSuccess = yearTarget > 0 ? yearConsumed <= yearTarget : false
  const yearStartMonth = monthRows.length ? monthRows[0].month_key : ''
  const yearEndMonth = monthRows.length ? monthRows[monthRows.length - 1].month_key : ''
  if (monthRows.length > 0) {
    await upsertByUnique(
      'challenge_records',
      { user_id: userId, challenge_type: 'yearly', period_key: String(year) },
      {
        target_amount: yearTarget,
        consumed_amount: yearConsumed,
        limit_start: yearStartMonth,
        limit_end: yearEndMonth,
        limit_months: monthRows.length,
        is_success: yearIsSuccess,
        status: 'active',
        updated_at: ts
      },
      { ledger_id: '', created_at: ts }
    )
  }

  return { year, months: monthRows, yearly: { period_key: String(year), target_amount: yearTarget, consumed_amount: yearConsumed, limit_start: yearStartMonth, limit_end: yearEndMonth, limit_months: monthRows.length, is_success: yearIsSuccess } }
}

module.exports = {
  getChallengeSummary,
  getLimitStatus,
  setChallengeTarget,
  getAchievements,
  evaluateAndUnlockAchievements,
  syncPeriodTargets,
}
