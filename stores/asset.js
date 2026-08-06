/**
 * 资产账户 / 投资域。
 */

import { computed } from 'vue'
import { state, pickDbRows, UserStoreError } from './core/state.js'
import {
  createAssetAccount,
  getAssetAccounts,
  updateAssetAccount,
  deleteAssetAccount,
  adjustAccountBalance,
  transferBetweenAccounts,
  createInvestmentHolding,
  updateInvestmentHolding,
  deleteInvestmentHolding,
  investmentTransaction,
  isSparejarApiError
} from './core/api.js'

const ENSURE_LOGGED_IN = () => {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
}

/** 加载资产账户 */
export async function loadAssetAccounts() {
  if (!state.uid) {
    state.assets = []
    state.assetTotals = null
    return []
  }
  try {
    const res = await getAssetAccounts()
    const rows = pickDbRows(res)
    state.assets = Array.isArray(rows) ? rows : []
    state.assetTotals = (res && res.totals) || null
  } catch (err) {
    console.error('[store] 加载资产账户失败', err)
    state.assets = []
    state.assetTotals = null
  }
  return state.assets
}

export async function createAssetAccountAction(payload) {
  ENSURE_LOGGED_IN()
  const res = await createAssetAccount(payload)
  await loadAssetAccounts()
  return res
}

export async function updateAssetAccountAction(accountId, patch) {
  ENSURE_LOGGED_IN()
  const res = await updateAssetAccount(accountId, patch)
  await loadAssetAccounts()
  return res
}

export async function deleteAssetAccountAction(accountId) {
  ENSURE_LOGGED_IN()
  const res = await deleteAssetAccount(accountId)
  await loadAssetAccounts()
  return res
}

export async function adjustAccountBalanceAction(accountId, amountYuan) {
  ENSURE_LOGGED_IN()
  const res = await adjustAccountBalance(accountId, amountYuan)
  await loadAssetAccounts()
  return res
}

export async function transferBetweenAccountsAction(fromId, toId, amountYuan) {
  ENSURE_LOGGED_IN()
  const res = await transferBetweenAccounts(fromId, toId, amountYuan)
  await loadAssetAccounts()
  return res
}

export async function createInvestmentHoldingAction(payload) {
  ENSURE_LOGGED_IN()
  const res = await createInvestmentHolding(payload)
  await loadAssetAccounts()
  return res
}

export async function updateInvestmentHoldingAction(holdingId, patch) {
  ENSURE_LOGGED_IN()
  const res = await updateInvestmentHolding(holdingId, patch)
  await loadAssetAccounts()
  return res
}

export async function deleteInvestmentHoldingAction(holdingId) {
  ENSURE_LOGGED_IN()
  const res = await deleteInvestmentHolding(holdingId)
  await loadAssetAccounts()
  return res
}

export async function investmentTransactionAction(holdingId, transType, amountYuan, note) {
  ENSURE_LOGGED_IN()
  const res = await investmentTransaction(holdingId, transType, amountYuan, note)
  await loadAssetAccounts()
  return res
}

export const assetTotals = computed(() => state.assetTotals)
