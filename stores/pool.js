/**
 * 资金池域：结余池与通用存款池，以及心愿的存取（manual/surplus/savings）。
 */

import { state, UserStoreError } from './core/state.js'
import {
  depositWishFromAccount,
  depositWishFromSurplus,
  depositSavingsFromSurplus,
  depositAccountFromSurplus,
  transferBudgetOut,
  transferBudgetIn,
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

/** 从累计结余池存入通用存款池（支持部分金额，剩余留在结余池） */
export async function depositSavingsFromSurplusAction(amountYuan, note = '') {
  ENSURE_LOGGED_IN()
  try {
    const amountFen = yuanToFen(amountYuan)
    const res = await depositSavingsFromSurplus(amountFen, note)
    // 结余池出账 + 存款池入账 → 两个池都刷新
    await Promise.all([loadSurplusPoolAfter(res), loadSavingsPoolAfter(res)])
    return res
  } catch (err) {
    state.lastError = err?.message || 'deposit savings failed'
    throw err
  }
}

/** 从累计结余池存入指定资产账户（支持部分金额，剩余留在结余池） */
export async function depositAccountFromSurplusAction(accountId, amountYuan, note = '') {
  ENSURE_LOGGED_IN()
  try {
    const amountFen = yuanToFen(amountYuan)
    const res = await depositAccountFromSurplus(accountId, amountFen, note)
    // 结余池出账 + 账户入账 → 刷新结余池与资产账户
    await Promise.all([loadSurplusPoolAfter(res), loadAssetAccounts()])
    return res
  } catch (err) {
    state.lastError = err?.message || 'deposit account failed'
    throw err
  }
}

/**
 * 月/年维度：把期间池预算转出到存款池/心愿/账户（扣期间池剩余、加目标）。
 * amountYuan 为「元」；上限=期间池剩余（后端校验）。返回 { remaining_after, moved_out_after }。
 */
export async function transferBudgetOutAction(periodType, periodKey, targetType, targetId, amountYuan, note = '') {
  ENSURE_LOGGED_IN()
  try {
    const amountFen = yuanToFen(amountYuan)
    const res = await transferBudgetOut({
      period_type: periodType, period_key: periodKey,
      target_type: targetType, target_id: targetId || null,
      amount: amountFen, note
    })
    await Promise.all([loadSavingsPoolAfter(res), loadAssetAccounts()])
    return res
  } catch (err) {
    state.lastError = err?.message || 'transfer budget failed'
    throw err
  }
}

/**
 * 月/年维度：把转出去的钱从存款池/心愿/账户取回预算（movedOut 减少、池剩余恢复）。
 * 上限=本期已转出净额（后端校验）。
 */
export async function transferBudgetInAction(periodType, periodKey, sourceType, sourceId, amountYuan, note = '') {
  ENSURE_LOGGED_IN()
  try {
    const amountFen = yuanToFen(amountYuan)
    const res = await transferBudgetIn({
      period_type: periodType, period_key: periodKey,
      source_type: sourceType, source_id: sourceId || null,
      amount: amountFen, note
    })
    await Promise.all([loadSavingsPoolAfter(res), loadAssetAccounts()])
    return res
  } catch (err) {
    state.lastError = err?.message || 'transfer budget failed'
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
