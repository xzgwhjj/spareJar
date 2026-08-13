/**
 * 资金池域：结余池与通用存款池，以及心愿的存取（manual/surplus/savings）。
 */

import { state, UserStoreError } from './core/state.js'
import {
  depositWishFromAccount,
  depositWishFromSurplus,
  depositWishFromSavings,
  withdrawWishToSurplus,
  withdrawWishToAccount,
  withdrawWishToSavings,
  depositSavingsPool,
  withdrawSavingsPool,
  getDoc,
  listSavingsPoolLogs,
  isSparejarApiError
} from './core/api.js'
import { loadAssetAccounts } from './asset.js'

const ENSURE_LOGGED_IN = () => {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
}
const toAmountNum = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}
const yuanToFen = (yuan) => Math.round(toAmountNum(yuan) * 100)

/** 从指定资产账户划拨到心愿（账户扣钱 + 心愿加钱） */
export async function depositWishFromAccountAction(wishId, amountYuan, accountId, note = '') {
  ENSURE_LOGGED_IN()
  try {
    const amountFen = yuanToFen(amountYuan)
    const res = await depositWishFromAccount(wishId, amountFen, accountId, note)
    await Promise.all([refreshWishPoolAfter(res), loadAssetAccounts()])
    return res
  } catch (err) {
    state.lastError = err?.message || 'deposit failed'
    throw err
  }
}

/** 从累计结余池存入心愿 */
export async function depositWishFromSurplusAction(wishId, amountYuan, note = '') {
  ENSURE_LOGGED_IN()
  try {
    const amountFen = yuanToFen(amountYuan)
    const res = await depositWishFromSurplus(wishId, amountFen, note)
    await refreshWishPoolAfter(res)
    return res
  } catch (err) {
    state.lastError = err?.message || 'deposit failed'
    throw err
  }
}

/** 从通用存款池存入心愿 */
export async function depositWishFromSavingsAction(wishId, amountYuan, note = '') {
  ENSURE_LOGGED_IN()
  try {
    const amountFen = yuanToFen(amountYuan)
    const res = await depositWishFromSavings(wishId, amountFen, note)
    // 存款池余额减少 → 刷新结余池/存款池（fromSavings 在后端会修改 savings_pool）
    await Promise.all([loadSavingsPoolAfter(res), loadSurplusPoolAfter(res)])
    return res
  } catch (err) {
    state.lastError = err?.message || 'deposit failed'
    throw err
  }
}

/** 心愿取回归结余池 */
export async function withdrawWishToSurplusAction(wishId, amountYuan, note = '') {
  ENSURE_LOGGED_IN()
  try {
    const amountFen = yuanToFen(amountYuan)
    const res = await withdrawWishToSurplus(wishId, amountFen, note)
    await refreshWishPoolAfter(res)
    return res
  } catch (err) {
    state.lastError = err?.message || 'withdraw failed'
    throw err
  }
}

/** 心愿取出退回指定资产账户（账户加钱 + 心愿减钱） */
export async function withdrawWishToAccountAction(wishId, amountYuan, accountId, note = '') {
  ENSURE_LOGGED_IN()
  try {
    const amountFen = yuanToFen(amountYuan)
    const res = await withdrawWishToAccount(wishId, amountFen, accountId, note)
    await Promise.all([refreshWishPoolAfter(res), loadAssetAccounts()])
    return res
  } catch (err) {
    state.lastError = err?.message || 'withdraw failed'
    throw err
  }
}

/** 心愿取出退回通用存款池（存款池加钱 + 心愿减钱） */
export async function withdrawWishToSavingsAction(wishId, amountYuan, note = '') {
  ENSURE_LOGGED_IN()
  try {
    const amountFen = yuanToFen(amountYuan)
    const res = await withdrawWishToSavings(wishId, amountFen, note)
    await loadSavingsPoolAfter(res)
    await refreshWishPoolAfter(res)
    return res
  } catch (err) {
    state.lastError = err?.message || 'withdraw failed'
    throw err
  }
}

/** 手动存入通用存款池 */
export async function depositSavingsPoolAction(amountYuan) {
  ENSURE_LOGGED_IN()
  try {
    const res = await depositSavingsPool(yuanToFen(amountYuan))
    await loadSavingsPoolAfter(res)
    return res
  } catch (err) {
    state.lastError = err?.message || 'deposit savings failed'
    throw err
  }
}

/** 从通用存款池取回归结余池 */
export async function withdrawSavingsPoolAction(amountYuan) {
  ENSURE_LOGGED_IN()
  try {
    const res = await withdrawSavingsPool(yuanToFen(amountYuan))
    await loadSavingsPoolAfter(res)
    return res
  } catch (err) {
    state.lastError = err?.message || 'withdraw savings failed'
    throw err
  }
}

// ---- 内部辅助：根据响应刷新各余额 ----
async function refreshWishPoolAfter(res) {
  await Promise.all([loadWishesAfter(res), loadSurplusPoolAfter(res), loadSavingsPoolAfter(res)])
}
async function loadWishesAfter(res) {
  if (res && res.wishes) state.wishes = res.wishes
}
async function loadSurplusPoolAfter(res) {
  if (res && res.surplus_pool) {
    state.surplusPool = res.surplus_pool
  } else {
    try {
      state.surplusPool = await getDoc('surplus_pools')
    } catch (err) {
      if (!isSparejarApiError(err)) console.error(err)
    }
  }
}
async function loadSavingsPoolAfter(res) {
  if (res && res.savings_pool) {
    state.savingsPool = res.savings_pool
  } else {
    try {
      state.savingsPool = await getDoc('savings_pools')
    } catch (err) {
      if (!isSparejarApiError(err)) console.error(err)
    }
  }
}

/** 读取存款池流水（页面本地持有）。 */
export async function loadSavingsPoolLogsAction() {
  if (!state.uid) return []
  try {
    const res = await listSavingsPoolLogs()
    return Array.isArray(res) ? res : (res && res.data ? res.data : [])
  } catch (err) {
    console.error('[store] 读取存款池流水失败', err)
    return []
  }
}
