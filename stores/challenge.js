/**
 * 挑战 / 成就 / 新手引导 / 订阅消息域。
 */

import { state, pickDbRows, UserStoreError } from './core/state.js'
import {
  getChallengeSummary,
  setChallengeTarget,
  getAchievements,
  evaluateAchievements,
  updateOnboarding,
  recordSubscribeAuth,
  sendSubscribeMessage,
  isSparejarApiError
} from './core/api.js'

const ENSURE_LOGGED_IN = () => {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
}

/** 加载挑战汇总（含进行中+历史） */
export async function loadChallengeSummary() {
  if (!state.uid) {
    state.challenges = null
    return null
  }
  try {
    const res = await getChallengeSummary()
    const rows = pickDbRows(res)
    state.challenges = rows && rows[0] ? rows[0] : null
  } catch (err) {
    console.error('[store] loadChallengeSummary 失败', err)
    state.challenges = null
  }
  return state.challenges
}

/** 设置挑战目标（仅更新数值，不动进度/历史） */
export async function setChallengeTargetAction(target) {
  ENSURE_LOGGED_IN()
  try {
    const res = await setChallengeTarget(target)
    const rows = pickDbRows(res)
    if (rows && rows[0]) state.challenges = { ...state.challenges, ...rows[0] }
    return state.challenges
  } catch (err) {
    if (isSparejarApiError(err)) {
      state.lastError = err.message
      throw err
    }
    throw err
  }
}

/** 加载成就列表 */
export async function loadAchievements() {
  if (!state.uid) {
    state.achievements = []
    return []
  }
  try {
    const res = await getAchievements()
    const rows = pickDbRows(res)
    state.achievements = Array.isArray(rows) ? rows : []
  } catch (err) {
    console.error('[store] loadAchievements 失败', err)
    state.achievements = []
  }
  return state.achievements
}

/** 触发成就评估（带防抖，避免并发重复调用） */
let _evaluating = false
export async function evaluateAchievementsAction() {
  if (!state.uid || _evaluating) return state.achievements
  _evaluating = true
  try {
    const res = await evaluateAchievements()
    const rows = pickDbRows(res)
    if (Array.isArray(rows)) state.achievements = rows
  } catch (err) {
    console.error('[store] evaluateAchievements 失败', err)
  } finally {
    _evaluating = false
  }
  return state.achievements
}

/** 保存新手引导数据 */
export async function saveOnboardingAction(data) {
  ENSURE_LOGGED_IN()
  const res = await updateOnboarding(data)
  const rows = pickDbRows(res)
  if (rows && rows[0] && state.settings) {
    state.settings.onboarding = rows[0].onboarding
  }
  return res
}

/** 记录订阅授权结果 */
export async function recordSubscribeAuthAction(templateId, status) {
  ENSURE_LOGGED_IN()
  return recordSubscribeAuth(templateId, status)
}

/** 主动发送订阅消息 */
export async function sendSubscribeMessageAction(templateId, data) {
  ENSURE_LOGGED_IN()
  return sendSubscribeMessage(templateId, data)
}

// 兼容旧调用名（页面历史使用 updateOnboardingAction）
export { saveOnboardingAction as updateOnboardingAction }
