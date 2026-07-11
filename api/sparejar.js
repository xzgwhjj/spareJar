/**
 * 余钱罐云函数 API 封装
 * 统一入口：uniCloud.callFunction({ name: 'sparejar-finance', data: { action, data } })
 */

/** @typedef {{ code: number, message: string, data?: unknown }} SparejarCloudResult */

export const CLOUD_FUNCTION_NAME = 'sparejar-finance'

/** sparejar-finance 支持的 action 名称 */
export const ACTIONS = Object.freeze({
  INIT_USER: 'initUser',
  CREATE_TRANSACTION: 'createTransaction',
  DELETE_TRANSACTION: 'deleteTransaction',
  RECALCULATE_SETTLEMENT: 'recalculateSettlement',
  RUN_DAILY_SETTLEMENT: 'runDailySettlement',
  ALLOCATE_SURPLUS: 'allocateSurplus',
  APPLY_SURPLUS_POOL_CHANGE: 'applySurplusPoolChange',
  APPLY_SAVINGS_POOL_CHANGE: 'applySavingsPoolChange',
  APPLY_WISH_FUND_CHANGE: 'applyWishFundChange',
  APPLY_ACCOUNT_BALANCE_CHANGE: 'applyAccountBalanceChange',
  CRON_DAILY_SETTLEMENT: 'cronDailySettlement'
})

export class SparejarApiError extends Error {
  /**
   * @param {string} message
   * @param {number} [code]
   * @param {string} [action]
   */
  constructor(message, code = 500, action = '') {
    super(message)
    this.name = 'SparejarApiError'
    this.code = code
    this.action = action
  }
}

/**
 * @param {unknown} err
 * @returns {err is SparejarApiError}
 */
export function isSparejarApiError(err) {
  return err instanceof SparejarApiError
}

/**
 * @param {unknown} res
 * @returns {res is { result: SparejarCloudResult }}
 */
function hasCloudResult(res) {
  return !!res && typeof res === 'object' && 'result' in res
}

/**
 * 调用 sparejar-finance 并返回完整云函数结果体
 * @param {string} action
 * @param {Record<string, unknown>} [data]
 * @returns {Promise<SparejarCloudResult>}
 */
export async function callSparejarRaw(action, data = {}) {
  let res
  try {
    res = await uniCloud.callFunction({
      name: CLOUD_FUNCTION_NAME,
      data: { action, data }
    })
  } catch (err) {
    const message = err && typeof err === 'object' && 'message' in err
      ? String(err.message)
      : 'cloud function call failed'
    throw new SparejarApiError(message, 502, action)
  }

  if (res && typeof res === 'object' && 'errCode' in res && res.errCode !== 0) {
    throw new SparejarApiError(
      String(res.errMsg || 'cloud transport error'),
      Number(res.errCode) || 502,
      action
    )
  }

  if (!hasCloudResult(res)) {
    throw new SparejarApiError('invalid cloud function response', 502, action)
  }

  return res.result
}

/**
 * 调用 sparejar-finance，业务成功时返回 result.data
 * @template T
 * @param {string} action
 * @param {Record<string, unknown>} [data]
 * @returns {Promise<T>}
 */
export async function callSparejar(action, data = {}) {
  const result = await callSparejarRaw(action, data)
  if (result.code !== 0) {
    throw new SparejarApiError(result.message || 'request failed', result.code, action)
  }
  return /** @type {T} */ (result.data)
}

/** @param {Record<string, unknown>} [profile] */
export function initUser(profile = {}) {
  return callSparejar(ACTIONS.INIT_USER, profile)
}

/** @param {Record<string, unknown>} payload */
export function createTransaction(payload) {
  return callSparejar(ACTIONS.CREATE_TRANSACTION, payload)
}

/** @param {string} transactionId */
export function deleteTransaction(transactionId) {
  return callSparejar(ACTIONS.DELETE_TRANSACTION, { transaction_id: transactionId })
}

/** @param {string} dateKey */
export function recalculateSettlement(dateKey) {
  return callSparejar(ACTIONS.RECALCULATE_SETTLEMENT, { date_key: dateKey })
}

/**
 * @param {string} [dateKey]
 * @param {Record<string, unknown>} [options]
 */
export function runDailySettlement(dateKey, options = {}) {
  return callSparejar(ACTIONS.RUN_DAILY_SETTLEMENT, {
    ...(dateKey ? { date_key: dateKey } : {}),
    ...options
  })
}

/**
 * @param {string} dateKey
 * @param {unknown[] | null} [items]
 * @param {boolean} [isAuto]
 */
export function allocateSurplus(dateKey, items = null, isAuto = false) {
  return callSparejar(ACTIONS.ALLOCATE_SURPLUS, {
    date_key: dateKey,
    ...(items ? { items } : {}),
    is_auto: isAuto
  })
}

/** @param {Record<string, unknown>} payload */
export function applySurplusPoolChange(payload) {
  return callSparejar(ACTIONS.APPLY_SURPLUS_POOL_CHANGE, payload)
}

/** @param {Record<string, unknown>} payload */
export function applySavingsPoolChange(payload) {
  return callSparejar(ACTIONS.APPLY_SAVINGS_POOL_CHANGE, payload)
}

/** @param {Record<string, unknown>} payload */
export function applyWishFundChange(payload) {
  return callSparejar(ACTIONS.APPLY_WISH_FUND_CHANGE, payload)
}

/** @param {Record<string, unknown>} payload */
export function applyAccountBalanceChange(payload) {
  return callSparejar(ACTIONS.APPLY_ACCOUNT_BALANCE_CHANGE, payload)
}

/** @param {Record<string, unknown>} [options] 定时任务/管理端用 */
export function cronDailySettlement(options = {}) {
  return callSparejar(ACTIONS.CRON_DAILY_SETTLEMENT, options)
}

export default {
  CLOUD_FUNCTION_NAME,
  ACTIONS,
  SparejarApiError,
  isSparejarApiError,
  callSparejar,
  callSparejarRaw,
  initUser,
  createTransaction,
  deleteTransaction,
  recalculateSettlement,
  runDailySettlement,
  allocateSurplus,
  applySurplusPoolChange,
  applySavingsPoolChange,
  applyWishFundChange,
  applyAccountBalanceChange,
  cronDailySettlement
}
