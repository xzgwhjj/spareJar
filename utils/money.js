/**
 * 金额工具：数据库存储单位为「分」(int)，界面展示为「元」。
 * 所有换算优先走整数或字符串解析，避免浮点精度丢失。
 */

/** @typedef {{ ok: true, value: number }} MoneyOk */
/** @typedef {{ ok: false, error: MoneyError }} MoneyFail */
/** @typedef {MoneyOk | MoneyFail} MoneyResult */

/** 系统允许的最大金额（分）：1 万亿元，防止异常溢出 */
export const MAX_FEN = 1_000_000_000_000_00

/** 最小合法金额（分）：1 分 */
export const MIN_FEN = 1

const YUAN_INPUT_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)$/

export class MoneyError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'MONEY_INVALID') {
    super(message)
    this.name = 'MoneyError'
    this.code = code
  }
}

/**
 * 判断是否为 MoneyError
 * @param {unknown} err
 * @returns {err is MoneyError}
 */
export function isMoneyError(err) {
  return err instanceof MoneyError
}

/**
 * 校验分是否为合法整数金额
 * @param {unknown} fen
 * @returns {fen is number}
 */
export function isValidFen(fen) {
  return Number.isInteger(fen) && fen >= MIN_FEN && fen <= MAX_FEN
}

/**
 * 校验元输入是否可解析（不抛错）
 * @param {unknown} yuan
 * @returns {boolean}
 */
export function isValidYuanInput(yuan) {
  try {
    yuanToFen(yuan)
    return true
  } catch {
    return false
  }
}

/**
 * 规范化用户输入的元字符串（去空格、去货币符号、去千分位）
 * @param {unknown} input
 * @returns {string}
 */
export function normalizeYuanInput(input) {
  if (input === null || input === undefined) {
    throw new MoneyError('金额不能为空', 'MONEY_EMPTY')
  }
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) {
      throw new MoneyError(`金额无效: ${input}`, 'MONEY_FORMAT')
    }
    input = Number(input.toFixed(10)).toString()
  }
  let str = String(input).trim()
  if (!str) {
    throw new MoneyError('金额不能为空', 'MONEY_EMPTY')
  }
  str = str.replace(/[¥￥,\s]/g, '')
  if (!YUAN_INPUT_RE.test(str)) {
    throw new MoneyError(`金额格式无效: ${input}`, 'MONEY_FORMAT')
  }
  return str
}

/**
 * 元 → 分（整数，四舍五入到分）
 * @param {number|string} yuan
 * @returns {number} 分
 */
export function yuanToFen(yuan) {
  const str = normalizeYuanInput(yuan)
  const negative = str.startsWith('-')
  const unsigned = negative ? str.slice(1) : str.startsWith('+') ? str.slice(1) : str

  const parts = unsigned.split('.')
  if (parts.length > 2) {
    throw new MoneyError(`金额格式无效: ${yuan}`, 'MONEY_FORMAT')
  }

  const integerPart = parts[0] || '0'
  let decimalPart = parts[1] || ''

  if (!/^\d+$/.test(integerPart) || (decimalPart && !/^\d+$/.test(decimalPart))) {
    throw new MoneyError(`金额格式无效: ${yuan}`, 'MONEY_FORMAT')
  }

  // 保留两位小数，四舍五入
  if (decimalPart.length > 2) {
    const third = Number(decimalPart[2] || '0')
    decimalPart = decimalPart.slice(0, 2)
    if (third >= 5) {
      const asInt = Number(integerPart + decimalPart.padEnd(2, '0')) + 1
      const fen = asInt
      return finalizeFen(negative ? -fen : fen, yuan)
    }
  }

  const fen = Number(integerPart) * 100 + Number(decimalPart.padEnd(2, '0').slice(0, 2))
  return finalizeFen(negative ? -fen : fen, yuan)
}

/**
 * @param {number} fen
 * @param {number|string} source
 * @returns {number}
 */
function finalizeFen(fen, source) {
  if (!Number.isFinite(fen)) {
    throw new MoneyError(`金额超出可表示范围: ${source}`, 'MONEY_OVERFLOW')
  }
  if (fen === 0) {
    throw new MoneyError('金额必须大于 0', 'MONEY_ZERO')
  }
  if (!Number.isInteger(fen)) {
    throw new MoneyError(`换算结果非整数分: ${source}`, 'MONEY_PRECISION')
  }
  if (Math.abs(fen) > MAX_FEN) {
    throw new MoneyError(`金额超出上限 ${MAX_FEN} 分`, 'MONEY_OVERFLOW')
  }
  return fen
}

/**
 * 分 → 元（数值，最多两位小数）
 * @param {unknown} fen
 * @returns {number}
 */
export function fenToYuan(fen) {
  assertIntegerFen(fen, false)
  return fen / 100
}

/**
 * 分 → 元字符串（固定两位小数，无千分位）
 * @param {unknown} fen
 * @returns {string}
 */
export function fenToYuanString(fen) {
  assertIntegerFen(fen, true)
  const negative = fen < 0
  const abs = Math.abs(fen)
  const yuanInt = Math.floor(abs / 100)
  const cents = abs % 100
  const body = `${yuanInt}.${String(cents).padStart(2, '0')}`
  return negative ? `-${body}` : body
}

/**
 * 分 → 展示用字符串（默认带千分位）
 * @param {unknown} fen
 * @param {{ withSymbol?: boolean, allowZero?: boolean }} [options]
 * @returns {string}
 */
export function formatFen(fen, options = {}) {
  const { withSymbol = false, allowZero = true } = options
  assertIntegerFen(fen, allowZero)
  const yuanStr = fenToYuanString(fen)
  const [intPart, decPart] = yuanStr.replace('-', '').split('.')
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = yuanStr.startsWith('-') ? '-' : ''
  const display = `${sign}${formattedInt}.${decPart}`
  return withSymbol ? `¥${display}` : display
}

/**
 * 元 → 展示用字符串（输入为元，内部转分再格式化）
 * @param {number|string} yuan
 * @param {{ withSymbol?: boolean }} [options]
 * @returns {string}
 */
export function formatYuan(yuan, options = {}) {
  const fen = yuanToFen(yuan)
  return formatFen(fen, options)
}

/**
 * 安全版：元 → 分，失败返回 { ok: false }
 * @param {number|string} yuan
 * @returns {MoneyResult}
 */
export function safeYuanToFen(yuan) {
  try {
    return { ok: true, value: yuanToFen(yuan) }
  } catch (err) {
    return { ok: false, error: err instanceof MoneyError ? err : new MoneyError(String(err)) }
  }
}

/**
 * 安全版：分 → 元字符串
 * @param {unknown} fen
 * @returns {MoneyResult & { value?: string }}
 */
export function safeFormatFen(fen) {
  try {
    return { ok: true, value: formatFen(fen) }
  } catch (err) {
    return { ok: false, error: err instanceof MoneyError ? err : new MoneyError(String(err)) }
  }
}

/**
 * 解析记账页金额输入（允许 0 用于清空态校验，提交前仍需 yuanToFen）
 * @param {string} raw
 * @returns {number|null} 元数值；无效返回 null
 */
export function parseYuanInput(raw) {
  try {
    return fenToYuan(yuanToFen(raw))
  } catch {
    return null
  }
}

/**
 * @param {unknown} fen
 * @param {boolean} allowZero
 */
function assertIntegerFen(fen, allowZero) {
  if (fen === null || fen === undefined || fen === '') {
    throw new MoneyError('分金额不能为空', 'MONEY_EMPTY')
  }
  if (typeof fen === 'string') {
    if (!/^-?\d+$/.test(fen.trim())) {
      throw new MoneyError(`分金额必须为整数: ${fen}`, 'MONEY_FORMAT')
    }
    fen = Number(fen)
  }
  if (typeof fen !== 'number' || !Number.isFinite(fen)) {
    throw new MoneyError(`分金额无效: ${fen}`, 'MONEY_FORMAT')
  }
  if (!Number.isInteger(fen)) {
    throw new MoneyError(`分金额必须为整数: ${fen}`, 'MONEY_PRECISION')
  }
  if (!allowZero && fen === 0) {
    throw new MoneyError('金额必须大于 0', 'MONEY_ZERO')
  }
  if (fen !== 0 && Math.abs(fen) > MAX_FEN) {
    throw new MoneyError(`分金额超出上限 ${MAX_FEN}`, 'MONEY_OVERFLOW')
  }
}

export default {
  MAX_FEN,
  MIN_FEN,
  MoneyError,
  isMoneyError,
  isValidFen,
  isValidYuanInput,
  normalizeYuanInput,
  yuanToFen,
  fenToYuan,
  fenToYuanString,
  formatFen,
  formatYuan,
  safeYuanToFen,
  safeFormatFen,
  parseYuanInput
}
