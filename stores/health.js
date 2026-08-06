/**
 * 健康 / 餐次 / 贴纸 / 票据 OCR 域。
 */

import { state, pickDbRows, UserStoreError } from './core/state.js'
import {
  getStickers,
  createSticker,
  updateSticker,
  deleteSticker,
  consumeSticker,
  recognizeReceipt,
  getHealthProfile,
  upsertHealthProfile,
  getDailyHealthSnapshot,
  setExerciseCalories,
  getWeeklyHealth,
  createMeal,
  updateMeal,
  deleteMeal,
  getMealsByDate,
  getMeal,
  isSparejarApiError
} from './core/api.js'

const ENSURE_LOGGED_IN = () => {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
}

/** 加载健康档案 */
export async function loadHealthProfile() {
  if (!state.uid) {
    state.healthProfile = null
    return null
  }
  try {
    const res = await getHealthProfile()
    const rows = pickDbRows(res)
    state.healthProfile = rows && rows[0] ? rows[0] : null
  } catch (err) {
    console.error('[store] 加载健康档案失败', err)
    state.healthProfile = null
  }
  return state.healthProfile
}

export async function upsertHealthProfileAction(profile) {
  ENSURE_LOGGED_IN()
  const res = await upsertHealthProfile(profile)
  const rows = pickDbRows(res)
  if (rows && rows[0]) state.healthProfile = rows[0]
  return state.healthProfile
}

/** 加载每日健康快照 */
export async function loadDailyHealth(dateKey) {
  if (!state.uid) {
    state.dailyHealth = null
    return null
  }
  try {
    const res = await getDailyHealthSnapshot(dateKey)
    const rows = pickDbRows(res)
    state.dailyHealth = rows && rows[0] ? rows[0] : null
  } catch (err) {
    console.error('[store] 加载每日健康失败', err)
    state.dailyHealth = null
  }
  return state.dailyHealth
}

export async function setExerciseCaloriesAction(calories, dateKey) {
  ENSURE_LOGGED_IN()
  const res = await setExerciseCalories(calories, dateKey)
  const rows = pickDbRows(res)
  if (rows && rows[0]) state.dailyHealth = rows[0]
  return state.dailyHealth
}

/** 加载每周健康 */
export async function loadWeeklyHealth() {
  if (!state.uid) {
    state.weeklyHealth = null
    return null
  }
  try {
    const res = await getWeeklyHealth()
    const rows = pickDbRows(res)
    state.weeklyHealth = rows && rows[0] ? rows[0] : null
  } catch (err) {
    console.error('[store] 加载每周健康失败', err)
    state.weeklyHealth = null
  }
  return state.weeklyHealth
}

// ---- 餐次 ----
export async function loadMealsByDateAction(dateKey) {
  ENSURE_LOGGED_IN()
  try {
    const res = await getMealsByDate(dateKey)
    return pickDbRows(res)
  } catch (err) {
    if (isSparejarApiError(err)) return []
    throw err
  }
}
export async function createMealAction(payload) {
  ENSURE_LOGGED_IN()
  const res = await createMeal(payload)
  return res
}
export async function updateMealAction(mealId, patch) {
  ENSURE_LOGGED_IN()
  const res = await updateMeal(mealId, patch)
  return res
}
export async function deleteMealAction(mealId) {
  ENSURE_LOGGED_IN()
  const res = await deleteMeal(mealId)
  return res
}
export async function getMealAction(mealId) {
  ENSURE_LOGGED_IN()
  const res = await getMeal(mealId)
  return res
}

// ---- 贴纸 ----
/** 加载贴纸 */
export async function loadStickers() {
  if (!state.uid) {
    state.stickers = []
    return []
  }
  try {
    const res = await getStickers()
    const rows = pickDbRows(res)
    state.stickers = Array.isArray(rows) ? rows : []
  } catch (err) {
    console.error('[store] 加载贴纸失败', err)
    state.stickers = []
  }
  return state.stickers
}

export async function createStickerAction(payload) {
  ENSURE_LOGGED_IN()
  const res = await createSticker(payload)
  await loadStickers()
  return res
}
export async function updateStickerAction(stickerId, patch) {
  ENSURE_LOGGED_IN()
  const res = await updateSticker(stickerId, patch)
  await loadStickers()
  return res
}
export async function deleteStickerAction(stickerId) {
  ENSURE_LOGGED_IN()
  const res = await deleteSticker(stickerId)
  await loadStickers()
  return res
}
export async function consumeStickerAction(stickerId) {
  ENSURE_LOGGED_IN()
  const res = await consumeSticker(stickerId)
  await loadStickers()
  return res
}

/** 票据 OCR 识别 */
export async function recognizeReceiptAction(imagePath) {
  ENSURE_LOGGED_IN()
  return recognizeReceipt(imagePath)
}
