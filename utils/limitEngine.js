/**
 * 分层限额引擎（前端纯函数版，与云函数 sparejar-db computeDayBaseLimit 逻辑保持一致）
 * 维度：day / month / year
 * 策略：equal(均分) / rollover(剩余滚动)
 * 局部 override（day 最近7天 / month 最近1~3月）为硬覆盖，且从父池预扣。
 */

/** 当月天数 */
export function daysInMonthOf(dateKey) {
  const y = parseInt(dateKey.slice(0, 4), 10)
  const m = parseInt(dateKey.slice(5, 7), 10)
  return new Date(y, m, 0).getDate()
}

/** 本月内（截至 todayKey 之前）的 day override 预扣总额 */
function sumDayOverridesInMonth(overrides, monthKey, todayKey) {
  return (overrides || [])
    .filter(o => o.type === 'day' && o.key.slice(0, 7) === monthKey && o.key < todayKey)
    .reduce((s, o) => s + (o.amount_fen || 0), 0)
}

/**
 * 计算指定日期的 base_limit（分）
 * @param {Object} settings user_settings（含 limit_dim/limit_amount_fen/overrides...）
 * @param {string} dateKey YYYY-MM-DD
 * @returns {number}
 */
export function computeDayBaseLimit(settings, dateKey) {
  const s = settings || {}
  const dim = s.limit_dim || 'day'
  const overrides = Array.isArray(s.overrides) ? s.overrides : []

  if (dim === 'day') {
    if (s.pending_base_limit != null && s.limit_effective_date && s.limit_effective_date <= dateKey) {
      return s.pending_base_limit
    }
    return s.daily_base_limit || 10000
  }

  const monthKey = dateKey.slice(0, 7)
  const dayOverride = overrides.find(o => o.type === 'day' && o.key === dateKey)
  if (dayOverride) return dayOverride.amount_fen

  const pendingActive = s.pending_limit_dim && s.limit_effective_date && s.limit_effective_date <= dateKey
  const effDim = pendingActive ? s.pending_limit_dim : dim
  const effAmount = pendingActive
    ? (s.pending_amount_fen != null ? s.pending_amount_fen : s.limit_amount_fen)
    : s.limit_amount_fen
  const effYearStrat = pendingActive ? s.pending_year_strategy : s.year_strategy
  const effMonthStrat = pendingActive ? s.pending_month_strategy : s.month_strategy

  const monthOverride = overrides.find(o => o.type === 'month' && o.key === monthKey)
  const monthPoolFromOverride = monthOverride ? monthOverride.amount_fen : null

  let monthPool
  if (effDim === 'year') {
    if (monthPoolFromOverride != null) {
      monthPool = monthPoolFromOverride
    } else if (effYearStrat === 'equal') {
      monthPool = Math.floor((effAmount || 0) / 12)
    } else {
      const monthNum = parseInt(monthKey.slice(5, 7), 10)
      const remainingMonths = 13 - monthNum
      monthPool = Math.floor((effAmount || 0) / Math.max(1, remainingMonths))
    }
  } else {
    monthPool = monthPoolFromOverride != null ? monthPoolFromOverride : (effAmount || 0)
  }

  if (effMonthStrat === 'equal') {
    const daysInMonth = daysInMonthOf(dateKey)
    return Math.max(0, Math.floor(monthPool / daysInMonth))
  } else {
    const daysInMonth = daysInMonthOf(dateKey)
    const dayNum = parseInt(dateKey.slice(8, 10), 10)
    const remainingDays = daysInMonth - dayNum + 1
    const preDeduct = sumDayOverridesInMonth(overrides, monthKey, dateKey)
    const poolRemain = Math.max(0, monthPool - preDeduct)
    return Math.max(0, Math.floor(poolRemain / Math.max(1, remainingDays)))
  }
}

/**
 * 预览：给定 settings（含临时 override），返回当月每日额度明细（用于 UI 预览）
 * @returns {Array<{dateKey:string, amountFen:number, overridden:boolean}>}
 */
export function previewMonthDaily(settings, monthKey) {
  const s = settings || {}
  const year = parseInt(monthKey.slice(0, 4), 10)
  const month = parseInt(monthKey.slice(5, 7), 10)
  const days = new Date(year, month, 0).getDate()
  const list = []
  for (let d = 1; d <= days; d++) {
    const dateKey = `${monthKey}-${String(d).padStart(2, '0')}`
    list.push({
      dateKey,
      amountFen: computeDayBaseLimit(s, dateKey),
      overridden: (s.overrides || []).some(o => o.type === 'day' && o.key === dateKey)
    })
  }
  return list
}

/**
 * 校验 override 合法性，返回 {ok, error}
 * 规则：
 *  - day 覆盖：key 必须在 [今天-0, 今天+6] 的 7 天窗口内
 *  - month 覆盖：仅 limit_dim=month/year 允许；key 必须在最近 1~3 个月内（含当月）
 *  - amount_fen >= 0
 */
export function validateOverride(settings, override, todayKey) {
  const s = settings || {}
  const { type, key, amount_fen: amountFen } = override || {}
  if (amountFen == null || amountFen < 0) return { ok: false, error: '金额无效' }
  if (!type || !key) return { ok: false, error: '缺少类型或日期' }

  if (type === 'day') {
    const t = new Date(todayKey)
    const k = new Date(key)
    const diff = Math.round((k - t) / 86400000)
    if (diff < 0 || diff > 6) return { ok: false, error: '日覆盖仅支持最近 7 天（含今日）' }
    return { ok: true }
  }
  if (type === 'month') {
    if (s.limit_dim === 'day') return { ok: false, error: '日维度不支持月覆盖' }
    const tM = todayKey.slice(0, 7)
    const tk = new Date(tM + '-01')
    const kk = new Date(key + '-01')
    const diffMonths = (kk.getFullYear() - tk.getFullYear()) * 12 + (kk.getMonth() - tk.getMonth())
    if (diffMonths < 0 || diffMonths > 2) return { ok: false, error: '月覆盖仅支持最近 1~3 个月（含当月）' }
    return { ok: true }
  }
  return { ok: false, error: '未知覆盖类型' }
}

/**
 * 把 override 加入 settings（去重同 key，自动补 expire_at），返回新 overrides 数组
 */
export function addOverride(settings, override, todayKey) {
  const overrides = Array.isArray(settings.overrides) ? [...settings.overrides] : []
  const idx = overrides.findIndex(o => o.type === override.type && o.key === override.key)
  const expireAt = override.type === 'day'
    ? addDaysToKey(override.key, 1)
    : addDaysToKey(override.key + '-01', 32).slice(0, 7) + '-01'
  const rec = { ...override, expire_at: expireAt }
  if (idx >= 0) overrides[idx] = rec
  else overrides.push(rec)
  return overrides
}

function addDaysToKey(dateKey, days) {
  const d = new Date(dateKey)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 清理过期 override（expire_at < todayKey 的 day / 跨月未生效的 month），返回新数组 */
export function pruneOverrides(settings, todayKey) {
  const overrides = Array.isArray(settings.overrides) ? settings.overrides : []
  return overrides.filter(o => {
    if (o.type === 'day') return o.expire_at >= todayKey
    if (o.type === 'month') {
      // 月覆盖在 key 当月结束后清理
      const endOfMonth = o.key + '-32'
      return endOfMonth > todayKey
    }
    return true
  })
}
