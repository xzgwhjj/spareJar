/**
 * 日期工具：业务归属日使用 date_key (YYYY-MM-DD)，月份使用 month_key (YYYY-MM)。
 * 默认按本地时区计算，与 sparejar-db 云函数约定一致。
 */

/** date_key 格式：YYYY-MM-DD */
export const DATE_KEY_FORMAT = 'YYYY-MM-DD'

/** month_key 格式：YYYY-MM */
export const MONTH_KEY_FORMAT = 'YYYY-MM'

/** @type {RegExp} */
export const DATE_KEY_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

/** @type {RegExp} */
export const MONTH_KEY_RE = /^(\d{4})-(0[1-9]|1[0-2])$/

export class DateKeyError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'DATE_INVALID') {
    super(message)
    this.name = 'DateKeyError'
    this.code = code
  }
}

/**
 * @param {unknown} err
 * @returns {err is DateKeyError}
 */
export function isDateKeyError(err) {
  return err instanceof DateKeyError
}

/**
 * @param {number} n
 * @returns {string}
 */
function pad2(n) {
  return n < 10 ? `0${n}` : String(n)
}

/**
 * 校验 date_key 格式与日历合法性
 * @param {unknown} dateKey
 * @returns {dateKey is string}
 */
export function isValidDateKey(dateKey) {
  if (typeof dateKey !== 'string') return false
  const match = DATE_KEY_RE.exec(dateKey)
  if (!match) return false
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  return isValidYmd(y, m, d)
}

/**
 * 校验 month_key 格式
 * @param {unknown} monthKey
 * @returns {monthKey is string}
 */
export function isValidMonthKey(monthKey) {
  return typeof monthKey === 'string' && MONTH_KEY_RE.test(monthKey)
}

/**
 * @param {number} y
 * @param {number} m 1-12
 * @param {number} d 1-31
 */
function isValidYmd(y, m, d) {
  if (!Number.isInteger(y) || y < 1900 || y > 9999) return false
  if (!Number.isInteger(m) || m < 1 || m > 12) return false
  if (!Number.isInteger(d) || d < 1 || d > 31) return false
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

/**
 * 将 Date / 时间戳 / date_key 规范为 Date 对象（本地 0 点）
 * @param {Date|number|string} [input]
 * @returns {Date}
 */
export function toDate(input) {
  if (input === undefined || input === null) {
    return new Date()
  }
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      throw new DateKeyError('Date 对象无效', 'DATE_INVALID')
    }
    return new Date(input.getFullYear(), input.getMonth(), input.getDate())
  }
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) {
      throw new DateKeyError(`时间戳无效: ${input}`, 'DATE_INVALID')
    }
    const d = new Date(input)
    if (Number.isNaN(d.getTime())) {
      throw new DateKeyError(`时间戳无效: ${input}`, 'DATE_INVALID')
    }
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }
  if (typeof input === 'string') {
    if (isValidDateKey(input)) {
      return parseDateKey(input)
    }
    const parsed = new Date(input)
    if (Number.isNaN(parsed.getTime())) {
      throw new DateKeyError(`无法解析日期: ${input}`, 'DATE_PARSE')
    }
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }
  throw new DateKeyError(`不支持的日期输入类型: ${typeof input}`, 'DATE_TYPE')
}

/**
 * 格式化为 date_key (YYYY-MM-DD)
 * @param {Date|number|string} [input]
 * @returns {string}
 */
export function formatDateKey(input) {
  const date = toDate(input)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/**
 * 格式化为 month_key (YYYY-MM)
 * @param {Date|number|string} [input]
 * @returns {string}
 */
export function formatMonthKey(input) {
  const dateKey = formatDateKey(input)
  return dateKey.slice(0, 7)
}

/**
 * 解析 date_key → 本地 0 点 Date
 * @param {string} dateKey
 * @returns {Date}
 */
export function parseDateKey(dateKey) {
  if (!isValidDateKey(dateKey)) {
    throw new DateKeyError(`date_key 格式或日期无效，期望 ${DATE_KEY_FORMAT}: ${dateKey}`, 'DATE_FORMAT')
  }
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * 解析 month_key → 该月 1 日 本地 0 点 Date
 * @param {string} monthKey
 * @returns {Date}
 */
export function parseMonthKey(monthKey) {
  if (!isValidMonthKey(monthKey)) {
    throw new DateKeyError(`month_key 格式无效，期望 ${MONTH_KEY_FORMAT}: ${monthKey}`, 'DATE_FORMAT')
  }
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

/**
 * date_key → 毫秒时间戳（本地 0 点）
 * @param {string} dateKey
 * @returns {number}
 */
export function dateKeyToTimestamp(dateKey) {
  return parseDateKey(dateKey).getTime()
}

/**
 * 毫秒时间戳 → date_key
 * @param {number} timestamp
 * @returns {string}
 */
export function timestampToDateKey(timestamp) {
  if (!Number.isFinite(timestamp)) {
    throw new DateKeyError(`时间戳无效: ${timestamp}`, 'DATE_INVALID')
  }
  return formatDateKey(timestamp)
}

/**
 * 今日 date_key（本地时区）
 * @returns {string}
 */
export function todayDateKey() {
  return formatDateKey(new Date())
}

/**
 * 当前 month_key（本地时区）
 * @returns {string}
 */
export function todayMonthKey() {
  return formatMonthKey(new Date())
}

/**
 * date_key 加减天数
 * @param {string} dateKey
 * @param {number} days 可为负数
 * @returns {string} 新的 date_key
 */
export function addDaysToDateKey(dateKey, days) {
  if (!Number.isInteger(days)) {
    throw new DateKeyError(`days 必须为整数: ${days}`, 'DATE_INVALID')
  }
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() + days)
  return formatDateKey(date)
}

/**
 * 比较两个 date_key：a < b 返回 -1，相等 0，a > b 返回 1
 * @param {string} a
 * @param {string} b
 * @returns {-1|0|1}
 */
export function compareDateKeys(a, b) {
  assertDateKey(a, 'a')
  assertDateKey(b, 'b')
  if (a === b) return 0
  return a < b ? -1 : 1
}

/**
 * 判断 date_key 是否在 [start, end] 闭区间内
 * @param {string} dateKey
 * @param {string} start
 * @param {string} end
 * @returns {boolean}
 */
export function isDateKeyInRange(dateKey, start, end) {
  return compareDateKeys(dateKey, start) >= 0 && compareDateKeys(dateKey, end) <= 0
}

/**
 * 格式化为界面展示（默认 YYYY年M月D日）
 * @param {string|Date|number} input
 * @param {{ style?: 'slash'|'cn'|'iso' }} [options]
 * @returns {string}
 */
export function formatDateDisplay(input, options = {}) {
  const { style = 'cn' } = options
  const key = typeof input === 'string' && isValidDateKey(input) ? input : formatDateKey(input)
  const [y, m, d] = key.split('-').map(Number)
  if (style === 'iso') return key
  if (style === 'slash') return `${y}/${pad2(m)}/${pad2(d)}`
  return `${y}年${m}月${d}日`
}

/**
 * 安全版 formatDateKey
 * @param {Date|number|string} [input]
 * @returns {{ ok: true, value: string } | { ok: false, error: DateKeyError }}
 */
export function safeFormatDateKey(input) {
  try {
    return { ok: true, value: formatDateKey(input) }
  } catch (err) {
    return { ok: false, error: err instanceof DateKeyError ? err : new DateKeyError(String(err)) }
  }
}

/**
 * 安全版 parseDateKey
 * @param {string} dateKey
 */
export function safeParseDateKey(dateKey) {
  try {
    return { ok: true, value: parseDateKey(dateKey) }
  } catch (err) {
    return { ok: false, error: err instanceof DateKeyError ? err : new DateKeyError(String(err)) }
  }
}

/**
 * @param {string} dateKey
 * @param {string} label
 */
function assertDateKey(dateKey, label) {
  if (!isValidDateKey(dateKey)) {
    throw new DateKeyError(`${label} 不是合法的 date_key: ${dateKey}`, 'DATE_FORMAT')
  }
}

export default {
  DATE_KEY_FORMAT,
  MONTH_KEY_FORMAT,
  DATE_KEY_RE,
  MONTH_KEY_RE,
  DateKeyError,
  isDateKeyError,
  isValidDateKey,
  isValidMonthKey,
  toDate,
  formatDateKey,
  formatMonthKey,
  parseDateKey,
  parseMonthKey,
  dateKeyToTimestamp,
  timestampToDateKey,
  todayDateKey,
  todayMonthKey,
  addDaysToDateKey,
  compareDateKeys,
  isDateKeyInRange,
  formatDateDisplay,
  safeFormatDateKey,
  safeParseDateKey
}
