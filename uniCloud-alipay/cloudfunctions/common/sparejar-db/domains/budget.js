'use strict'

// 预算主额度变更领域：M3 方向感知（收紧即时 / 放宽顺延）+ 放宽限次 + 变更记录 + 终止待生效。
// 仅月/年维度参与「放宽限次」与「终止」；日维度维持原有「次日生效」语义，仅做记录。

const { getDocByUser, getDb, upsertByUnique } = require('../core/db')
const { formatDateKey, formatMonthKey, formatYearKey, nowTs } = require('../utils/date')

// 月/年维度的「放宽（上调）」次数上限（按当期计，收紧/首次设定不受限）
const BUDGET_CHANGE_CAP = { month: 2, year: 3 }
const LOG_COLLECTION = 'budget_change_log'

function currentAmountFen(settings, dim) {
  if (dim === 'day') return Number(settings.daily_base_limit) || 0
  return Number(settings.limit_amount_fen) || 0
}

function periodKeyOf(dim) {
  const d = new Date()
  return dim === 'year' ? formatYearKey(d) : formatMonthKey(d)
}

function nextEffectiveDate(dim) {
  // 放宽统一次日生效（1 天冷静期），月/年维度不再等整周期边界；同时修复日维度曾误用次月的 bug
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return formatDateKey(d)
}

// 超出放宽次数后顺延至下个周期边界（次月 1 日 / 次年 1 月 1 日）
function nextPeriodEffectiveDate(dim) {
  const d = new Date()
  if (dim === 'year') return `${d.getFullYear() + 1}-01-01`
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  return formatDateKey(next)
}

// 维度切换的生效时机：次日 / 次月 1 日 / 次年 1 月 1 日（由用户在切换确认弹层选择）
function resolveEffectiveDate(timing, dim) {
  if (timing === 'next_month') {
    const d = new Date()
    return formatDateKey(new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }
  if (timing === 'next_year') {
    return `${new Date().getFullYear() + 1}-01-01`
  }
  return nextEffectiveDate(dim)
}

function logCol() {
  return getDb().collection(LOG_COLLECTION)
}

// 当期未失败的放宽次数（仅月/年计上限）。用于限次拦截与配额展示。
async function countLoosensThisPeriod(userId, dim, periodKey) {
  if (!BUDGET_CHANGE_CAP[dim]) return 0
  const res = await logCol()
    .where({ user_id: userId, dim, period_key: periodKey, type: 'loosen' })
    .get()
  const list = (res && res.data) || []
  return list.filter((e) => e.status === 'scheduled' || e.status === 'applied').length
}

// 查询某维度当前「待生效」的放宽记录（理论上至多一条）
async function findScheduledLoosen(userId, dim) {
  const res = await logCol()
    .where({ user_id: userId, dim, type: 'loosen', status: 'scheduled' })
    .get()
  return (res && res.data) || []
}

async function markFailed(entries, reason, ts) {
  for (const e of entries) {
    await logCol().doc(e._id).update({ status: 'failed', fail_reason: reason, updated_at: ts })
  }
}

/**
 * 保存预算主额度（月/年/日）。
 * - 月/年·收紧（含首次设定、取消）：立即写入主字段，不占放宽次数。
 * - 月/年·放宽：写入 pending 待生效。未超次数 → 次日生效；已超次数 → 顺延至下个周期（次月/次年）生效，不再硬拦截。
 * - 日：维持次日生效语义，仅记录（不占放宽次数、不可终止）。
 * 仅「主预算金额」变更才记入日志；仅改临时覆盖(overrides)不记。
 * @returns {{ effect: 'immediate'|'deferred'|'none', effective_date: ?string, defer_to: ?string, beyond: boolean, cap: ?number, used: number, remaining: ?number }}
 */
async function saveBudgetPlan(userId, opts = {}) {
  const { dim, amount_fen, year_strategy, month_strategy, overrides, effective_timing } = opts || {}
  if (!['day', 'month', 'year'].includes(dim)) throw new Error('dim 非法')
  if (!Number.isInteger(amount_fen) || amount_fen < 0) throw new Error('金额非法')

  const settings = await getDocByUser('user_settings', userId)
  if (!settings) throw new Error('user settings not found')

  const ts = nowTs()
  const curDim = settings.limit_dim || 'day'
  const dimChanging = dim !== curDim
  const cur = currentAmountFen(settings, dim)
  const amountChanged = amount_fen !== cur
  const isTighten = amount_fen <= cur // 下调/持平/首次设定（cur=0）均视为收紧
  const cap = BUDGET_CHANGE_CAP[dim] || null
  const periodKey = periodKeyOf(dim)

  // 月/年放宽限次：未超次数 → 次日生效；已超次数 → 顺延至下个周期生效（不再硬拦截）
  let beyond = false
  if (cap && amountChanged && !isTighten) {
    const used = await countLoosensThisPeriod(userId, dim, periodKey)
    beyond = used >= cap
  }

  const patch = {
    updated_at: ts,
    overrides: Array.isArray(overrides) ? overrides : settings.overrides,
  }
  // 维度切换走 pending：当天仍按旧维度执行，次日/次月/次年整段切换到新维度（不立即改 limit_dim）
  if (!dimChanging) patch.limit_dim = dim
  // 月/年维度的分配策略一并随保存落库（仅改策略而不改金额时也应持久化）
  if (dim !== 'day') {
    if (year_strategy != null) patch.year_strategy = year_strategy
    if (month_strategy != null) patch.month_strategy = month_strategy
  }

  let effect = 'none'
  let effectiveDate = null
  let deferTo = 'immediate'

  if (amountChanged || dimChanging) {
    // 先清空所有 pending，避免跨方向/跨状态串扰；维度切换与放宽分支会重新写入
    patch.pending_base_limit = null
    patch.pending_amount_fen = null
    patch.pending_limit_dim = null
    patch.pending_year_strategy = null
    patch.pending_month_strategy = null
    patch.limit_effective_date = null

    if (dimChanging) {
      if (dim === 'day') {
        // 切回日维度：与「切到月/年」对称，走 pending 延迟生效；旧维度(月/年)维持到生效日，
        // 生效日经日结把 pending_base_limit 落到 daily_base_limit 并将 limit_dim 提升为 day
        patch.pending_limit_dim = dim
        patch.pending_base_limit = amount_fen
        patch.pending_amount_fen = null
        effectiveDate = resolveEffectiveDate(effective_timing, dim)
        patch.limit_effective_date = effectiveDate
        effect = 'deferred'
        deferTo = effective_timing || 'next_day'
      } else {
        // 维度切换（切到月/年）：旧维度维持到生效日，新维度在生效日经日结提升为正式设定
        patch.pending_limit_dim = dim
        patch.pending_amount_fen = amount_fen
        if (dim === 'year' && year_strategy != null) patch.pending_year_strategy = year_strategy
        if (month_strategy != null) patch.pending_month_strategy = month_strategy
        effectiveDate = resolveEffectiveDate(effective_timing, dim)
        patch.limit_effective_date = effectiveDate
        effect = 'deferred'
        deferTo = effective_timing || 'next_day'
      }
    } else if (dim === 'day') {
      // 日维度统一次日生效：仅写入 pending，不直接改 daily_base_limit（与引擎 computeDayBaseLimit 的 pending 优先逻辑对齐）
      patch.pending_base_limit = amount_fen
      patch.limit_effective_date = nextEffectiveDate('day')
      effectiveDate = patch.limit_effective_date
      effect = 'deferred'
      deferTo = 'next_day'
    } else if (isTighten) {
      patch.limit_amount_fen = amount_fen
      if (dim === 'year' && year_strategy != null) patch.year_strategy = year_strategy
      if (month_strategy != null) patch.month_strategy = month_strategy
      effect = 'immediate'
      deferTo = 'immediate'
    } else {
      patch.limit_amount_fen = cur
      patch.pending_amount_fen = amount_fen
      patch.pending_limit_dim = dim
      if (dim === 'year' && year_strategy != null) patch.pending_year_strategy = year_strategy
      if (month_strategy != null) patch.pending_month_strategy = month_strategy
      // 未超次数 → 次日；已超次数 → 顺延至下个周期
      effectiveDate = beyond ? nextPeriodEffectiveDate(dim) : nextEffectiveDate(dim)
      patch.limit_effective_date = effectiveDate
      effect = 'deferred'
      deferTo = beyond ? (dim === 'year' ? 'next_year' : 'next_month') : 'next_day'
    }
  }

  await upsertByUnique('user_settings', { user_id: userId }, patch)

  // 金额未变：仅保存 overrides，不记日志、不动 pending
  if (amountChanged) {
    const type = isTighten ? 'tighten' : 'loosen'
    const status = dim === 'day' ? 'applied' : isTighten ? 'applied' : 'scheduled'
    const existingScheduled = dim !== 'day' ? await findScheduledLoosen(userId, dim) : []

    // 收紧/取消：既有待生效放宽作废
    if (isTighten && existingScheduled.length) {
      await markFailed(existingScheduled, 'superseded_by_tighten', ts)
    }

    const baseLog = {
      user_id: userId,
      dim,
      type,
      old_fen: cur,
      new_fen: amount_fen,
      effective_date: effectiveDate,
      period_key: periodKey,
      status,
      defer_to: deferTo,
      created_at: ts,
      updated_at: ts,
    }

    if (type === 'loosen' && existingScheduled.length) {
      // 更新既有待生效放宽（金额/策略变化），不新增计数
      const t = existingScheduled[0]
      await logCol().doc(t._id).update({
        old_fen: t.old_fen,
        new_fen: amount_fen,
        effective_date: effectiveDate,
        period_key: periodKey,
        defer_to: deferTo,
        updated_at: ts,
      })
      // 兜底：理论上至多一条，其余异常记录一并作废
      if (existingScheduled.length > 1) {
        await markFailed(existingScheduled.slice(1), 'superseded_by_tighten', ts)
      }
    } else {
      await logCol().add(baseLog)
    }
  }

  // 同步挑战目标 + 今日结算重算（与 updateUserSettings 对齐）
  try {
    const { syncPeriodTargets } = require('./challenge')
    await syncPeriodTargets(userId, { year: new Date().getFullYear() })
  } catch (e) {
    console.error('[saveBudgetPlan] syncPeriodTargets 失败', e && (e.stack || e.message || e))
  }
  try {
    const { recalculateDailySettlement } = require('./transaction')
    await recalculateDailySettlement(userId, formatDateKey())
  } catch (e) {
    console.error('[saveBudgetPlan] 重算失败', e && (e.stack || e.message || e))
  }

  const used = await countLoosensThisPeriod(userId, dim, periodKey)
  return {
    effect,
    effective_date: effectiveDate,
    defer_to: deferTo,
    beyond,
    cap,
    used,
    remaining: cap ? Math.max(0, cap - used) : null,
    dim_switch: dimChanging,
    prev_dim: curDim,
  }
}

/**
 * 终止某维度待生效的放宽（仅月/年）。清空 pending 字段，并把对应日志标记为失败（failed）。
 * 失败记录不占用当期放宽次数，因此终止后当前设定「重新计时」，可重新设定。
 * @returns {{ terminated: boolean, used: number, cap: number, remaining: number }}
 */
async function terminatePendingBudget(userId, dim) {
  if (!['month', 'year', 'day'].includes(dim)) throw new Error('仅月/年/日维度支持终止待生效调整')
  const settings = await getDocByUser('user_settings', userId)
  if (!settings) throw new Error('user settings not found')
  const hasPending =
    settings.pending_limit_dim === dim &&
    settings.pending_amount_fen != null &&
    settings.limit_effective_date
  if (!hasPending) {
    const c = BUDGET_CHANGE_CAP[dim]
    return { terminated: false, used: 0, cap: c, remaining: c }
  }

  const ts = nowTs()
  await upsertByUnique('user_settings', { user_id: userId }, {
    updated_at: ts,
    pending_amount_fen: null,
    pending_limit_dim: null,
    pending_year_strategy: null,
    pending_month_strategy: null,
    limit_effective_date: null,
  })
  // 标记日志为失败（重新计时：不再占用当期放宽次数）
  const scheduled = await findScheduledLoosen(userId, dim)
  await markFailed(scheduled, 'user_terminated', ts)

  const pk = periodKeyOf(dim)
  const used = await countLoosensThisPeriod(userId, dim, pk)
  const cap = BUDGET_CHANGE_CAP[dim]
  return { terminated: true, used, cap, remaining: Math.max(0, cap - used) }
}

/**
 * 查询预算变更记录与当期配额。
 * @param {{ dim?: 'day'|'month'|'year' }} opts
 * @returns {{ entries: Array, quota: Object }}
 */
async function getBudgetChangeLog(userId, opts = {}) {
  const { dim } = opts || {}
  const q = { user_id: userId }
  if (dim) q.dim = dim
  const res = await logCol().where(q).get()
  let entries = (res && res.data) || []
  entries.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))

  const quota = {}
  for (const d of ['month', 'year']) {
    const pk = periodKeyOf(d)
    const used = await countLoosensThisPeriod(userId, d, pk)
    const cap = BUDGET_CHANGE_CAP[d]
    quota[d] = { period_key: pk, used, cap, remaining: Math.max(0, cap - used) }
  }
  return { entries, quota }
}

module.exports = {
  saveBudgetPlan,
  terminatePendingBudget,
  getBudgetChangeLog,
  BUDGET_CHANGE_CAP,
}
