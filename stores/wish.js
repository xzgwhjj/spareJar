/**
 * 心愿域：心愿列表、历史心愿（已归档）、心愿收藏账本。
 */

import { computed } from 'vue'
import { state, pickDbRows, UserStoreError } from './core/state.js'
import {
  listWishes,
  createWish,
  updateWish,
  archiveWish,
  deleteWish,
  listArchivedWishes,
  listWishFundLogs,
  setFavoriteLedger,
  getDoc,
  isSparejarApiError
} from './core/api.js'

const ENSURE_LOGGED_IN = () => {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
}

/** 加载进行中心愿 */
export async function loadWishes() {
  if (!state.uid) {
    state.wishes = []
    return []
  }
  try {
    const list = await listWishes()
    state.wishes = Array.isArray(list) ? list : []
  } catch (err) {
    console.error('[store] 加载心愿失败', err)
    state.wishes = []
  }
  return state.wishes
}

/** 加载历史心愿（已归档）。reasonFilter: 'completed' | 'deleted' | 'expired' | '' 全部。 */
export async function loadArchivedWishesAction(reasonFilter = '') {
  if (!state.uid) return []
  try {
    const list = await listArchivedWishes(reasonFilter)
    state.archivedWishes = Array.isArray(list) ? list : []
  } catch (err) {
    console.error('[store] 加载历史心愿失败', err)
    state.archivedWishes = []
  }
  return state.archivedWishes
}

export async function createWishAction(wish) {
  ENSURE_LOGGED_IN()
  try {
    const res = await createWish(wish)
    await loadWishes()
    return res
  } catch (err) {
    state.lastError = err?.message || 'create wish failed'
    throw err
  }
}

export async function updateWishAction(wishId, patch) {
  ENSURE_LOGGED_IN()
  const res = await updateWish(wishId, patch)
  await loadWishes()
  return res
}

/** 达成归档心愿。 */
export async function archiveWishAction(wishId) {
  ENSURE_LOGGED_IN()
  const res = await archiveWish(wishId)
  await loadWishes()
  await loadArchivedWishesAction()
  return res
}

/** 手动删除心愿（进入历史心愿）。 */
export async function deleteWishAction(wishId) {
  ENSURE_LOGGED_IN()
  const res = await deleteWish(wishId)
  await loadWishes()
  await loadArchivedWishesAction()
  return res
}

export async function loadWishFundLogsAction(wishId) {
  ENSURE_LOGGED_IN()
  try {
    const res = await listWishFundLogs(wishId)
    return pickDbRows(res)
  } catch (err) {
    if (isSparejarApiError(err)) return []
    throw err
  }
}

/** 设置心愿收藏账本（wishlist 账本），存于 user_settings.wishlist_ledger_id */
export async function setFavoriteLedgerAction(ledgerId) {
  ENSURE_LOGGED_IN()
  await setFavoriteLedger(ledgerId)
  if (!state.settings) state.settings = await getDoc('user_settings')
  if (state.settings) state.settings.wishlist_ledger_id = ledgerId
  return ledgerId
}

export const wishes = computed(() => (Array.isArray(state.wishes) ? state.wishes : []))
export const archivedWishes = computed(() => (Array.isArray(state.archivedWishes) ? state.archivedWishes : []))
