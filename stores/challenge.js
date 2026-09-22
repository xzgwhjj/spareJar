/**
 * 挑战 / 成就 / 新手引导 / 订阅消息域。
 */

import { state, pickDbRows, UserStoreError } from './core/state.js'
import {
  getChallengeSummary,
  getLimitStatus,
  setChallengeTarget,
  getAchievements,
  evaluateAchievements,
  updateOnboarding,
  recordSubscribeAuth,
  sendSubscribeMessage,
  syncPeriodTargets,
  isSparejarApiError
} from './core/api.js'

const ENSURE_LOGGED_IN = () => {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
}

/** 加载挑战汇总（含进行中+历史） */
export async function loadChallengeSummary() {
  console.log('[store] loadChallengeSummary called, uid=', state.uid)
  if (!state.uid) {
    console.warn('[store] loadChallengeSummary: no uid, set challenges=null')
    state.challenges = null
    return null
  }
  try {
    const res = await getChallengeSummary()
    console.log('[store] getChallengeSummary res =>', JSON.stringify(res).slice(0, 300))
    const rows = pickDbRows(res)
    console.log('[store] pickDbRows =>', JSON.stringify(rows).slice(0, 300))
    state.challenges = rows && rows[0] ? rows[0] : null
    console.log('[store] state.challenges keys =>', state.challenges ? Object.keys(state.challenges) : null)
  } catch (err) {
    console.error('[store] loadChallengeSummary 失败', err && (err.stack || err.message || err))
    state.challenges = null
  }
  return state.challenges
}

/**
 * 设置月/年挑战目标（仅更新数值，不动进度/历史）。
 * @param {'monthly'|'yearly'} type
 * @param {string} periodKey  格式 YYYY-MM / YYYY
 * @param {number} targetFen  目标金额（分）
 * @param {string} [ledgerId] 绑定账本（可选）
 */
export async function setChallengeTargetAction(type, periodKey, targetFen, ledgerId) {
  ENSURE_LOGGED_IN()
  try {
    const res = await setChallengeTarget(type, periodKey, targetFen, ledgerId || undefined)
    const rows = pickDbRows(res)
    if (rows && rows[0]) state.challenges = { ...state.challenges, ...rows[0] }
    // 重新拉取汇总，保证月/年挑战卡片立即反映新目标
    await loadChallengeSummary()
    return state.challenges
  } catch (err) {
    if (isSparejarApiError(err)) {
      state.lastError = err.message
      throw err
    }
    throw err
  }
}

/**
 * 按时间规格加载限额使用状态（日/月/年）。
 * @param {'day'|'month'|'year'} dim
 * @param {string} key
 * @returns {Promise<object|null>}
 */
export async function loadLimitStatus(dim, key) {
  if (!state.uid) return null
  try {
    const res = await getLimitStatus(dim, key)
    const rows = pickDbRows(res)
    return rows && rows[0] ? rows[0] : null
  } catch (err) {
    console.error('[store] loadLimitStatus 失败', err)
    return null
  }
}

/**
 * 同步当前年（或指定年）月/年挑战目标上限到 challenge_records。
 * 进入挑战页 / 改限额时调用，保证月卡、年卡的「目标上限 / 剩余可用」有真实数值。
 * @param {number|string} [year] 指定年份；默认当前年
 */
export async function syncPeriodTargetsAction(year) {
  if (!state.uid) return null
  try {
    const res = await syncPeriodTargets(year)
    const rows = pickDbRows(res)
    return rows && rows[0] ? rows[0] : null
  } catch (err) {
    console.error('[store] syncPeriodTargets 失败', err)
    return null
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

/** 保存新手引导进度 / 完成状态（step: 0-4，done: 是否完成） */
export async function saveOnboardingAction(step, done) {
  ENSURE_LOGGED_IN()
  const res = await updateOnboarding(step, done)
  // 后端已写入 user_settings.onboarding_done / onboarding_step（持久化真源）。
  // 立即同步到 state.settings，使首页提示条（读 state.settings.onboarding_done）保存后即时生效。
  const nextDone = done === true ? true : (state.onboarding?.done ?? false)
  const nextStep = typeof step === 'number' ? step : (state.onboarding?.step ?? '')
  state.onboarding = { done: nextDone, step: nextStep }
  if (state.user) state.user.onboarding_done = nextDone
  // 同步内存中的 user_settings（onboardingDone 计算属性优先读 state.settings.onboarding_done），
  // 否则点完「跳过」后首页提示条要等下次重载设置才消失。
  if (state.settings) {
    state.settings.onboarding_done = nextDone
    state.settings.onboarding_step = nextStep
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
