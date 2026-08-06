/**
 * 用户 Store 统一入口（组装器）。
 *
 * 本文件不再容纳具体业务逻辑，所有业务域 action 按功能拆分到同目录下的子模块：
 *   - core/state.js        共享单例 state、常量、错误类
 *   - core/api.js          api 层转发
 *   - auth.js             登录 / 会话 / bootstrap
 *   - dashboard.js        今日看板 / 分类映射
 *   - wish.js             心愿 / 历史心愿 / 收藏账本
 *   - pool.js             结余池 / 存款池 / 心愿存取
 *   - challenge.js        挑战 / 成就 / 引导 / 订阅
 *   - asset.js            资产账户 / 投资
 *   - health.js           健康 / 餐次 / 贴纸 / OCR
 *
 * 对外暴露的接口（useUserStore 返回值与具名导出）与拆分前完全一致，
 * 因此页面侧的解构调用无需任何改动。
 */

import { computed } from 'vue'
import { state } from './core/state.js'
import {
  confirmSurplusRollover,
  listSurplusAllocations,
  getPendingAllocation
} from './core/api.js'
import { computeDayBaseLimit } from '@/utils/limitEngine.js'
import { todayDateKey } from '@/utils/date.js'

// ---- 业务域 action / computed 汇聚（对外保留具名导出，页面侧解构无感）----
export * from './auth.js'
export * from './dashboard.js'
export * from './wish.js'
export * from './pool.js'
export * from './challenge.js'
export * from './asset.js'
export * from './health.js'

// 命名空间引用：export * 不会在本地作用域注入绑定，
// useUserStore 返回对象需通过命名空间读取各子模块导出，避免 ReferenceError。
import * as auth from './auth.js'
import * as dashboard from './dashboard.js'
import * as wish from './wish.js'
import * as pool from './pool.js'
import * as challenge from './challenge.js'
import * as asset from './asset.js'
import * as health from './health.js'

// ---- 聚合 computed（依赖多个 state 字段，集中在此定义）----
export const surplusPoolBalanceFen = computed(() => state.surplusPool?.balance ?? 0)
export const savingsPoolBalanceFen = computed(() => state.savingsPool?.balance ?? 0)
export const currentStreak = computed(() => state.streak?.daily_current_streak ?? 0)

export const isLoggedIn = computed(() => !!state.uid)
export const isGuest = computed(() => !state.uid)
export const sessionReady = computed(() => !!(state.session && state.session.ready))
export const sessionLoading = computed(() => state.loading.session)
export const bootstrapLoading = computed(() => state.loading.bootstrap)
export const loginLoading = computed(() => state.loading.login)

export const dailyLimitFen = computed(() => {
  // 1) 已结算日：直接使用当日结算快照
  const settlement = state.dashboard.settlement
  if (settlement && typeof settlement.base_limit === 'number') {
    return settlement.base_limit
  }
  // 2) 未结算：用分层限额引擎按 settings 估算（兼容日/周/月/年维度）
  if (state.settings) {
    const dayKey = todayDateKey()
    const est = computeDayBaseLimit(state.settings, dayKey)
    if (est > 0) return est
  }
  // 3) 兜底：直接读 user_settings.daily_base_limit
  if (state.settings && typeof state.settings.daily_base_limit === 'number') {
    return state.settings.daily_base_limit
  }
  return 0
})
export const pendingRolloverFen = computed(() => {
  const s = state.settings
  return s && typeof s.pending_rollover_fen === 'number' ? s.pending_rollover_fen : 0
})
export const totalDailyLimitFen = computed(() => dailyLimitFen.value + pendingRolloverFen.value)
export const hasLimit = computed(() => totalDailyLimitFen.value > 0)
export const spentTodayFen = computed(() => Number(state.spentToday) || 0)
export const leftTodayFen = computed(() => Math.max(0, totalDailyLimitFen.value - spentTodayFen.value))
export const isOverLimit = computed(() => spentTodayFen.value > totalDailyLimitFen.value)
export const onboardingDone = computed(() => !!state.onboarding?.done)
export const onboardingStep = computed(() => state.onboarding?.step ?? '')

export const challenges = computed(() => state.challenges)
export const achievements = computed(() => state.achievements)
export const allAchievements = computed(() =>
  (Array.isArray(state.achievements) ? state.achievements : []).filter((a) => !a.archived)
)
export const dashboardError = computed(() => state.lastError)

// ---- 跨域 action（拆分时遗漏，自原 user.js 迁回）----
export async function confirmSurplusRolloverAction(decision, opts = {}) {
  if (!state.uid) return
  await confirmSurplusRollover(decision, opts)
  await auth.loadSettings()
  await dashboard.refreshTodayDashboard()
  await auth.loadSurplusPool()
  await auth.loadSavingsPool()
}

export async function loadSurplusAllocationsAction() {
  if (!state.uid) return []
  try {
    return await listSurplusAllocations()
  } catch (err) {
    console.error('[store] 读取分配历史失败', err)
    return []
  }
}

export async function loadPendingAllocationAction() {
  if (!state.uid) return null
  try {
    return await getPendingAllocation()
  } catch (err) {
    console.error('[store] 读取待分配结余失败', err)
    return null
  }
}

/**
 * 统一入口：返回整个 store（state + 全部 action + computed）
 * 注意：本函数依赖所有导出符号均已就绪，项目中存在调用 useUserStore() 时
 * 尚未触达对应子模块的情况（如 setup 早期），故保持为即时求值对象。
 * @returns {Record<string, any>}
 */
export function useUserStore() {
  return {
    state,

    // auth
    checkLoggedIn: auth.checkLoggedIn,
    restoreSession: auth.restoreSession,
    initAppSession: auth.initAppSession,
    loginAndBootstrap: auth.loginAndBootstrap,
    ensureAuth: auth.ensureAuth,
    loginWithWeixin: auth.loginWithWeixin,
    bootstrap: auth.bootstrap,
    logout: auth.logout,
    clearAuthStorage: auth.clearAuthStorage,
    syncRefreshedToken: auth.syncRefreshedToken,
    loadSettings: auth.loadSettings,
    loadStreak: auth.loadStreak,
    loadSurplusPool: auth.loadSurplusPool,
    loadSavingsPool: auth.loadSavingsPool,

    // dashboard
    refreshTodayDashboard: dashboard.refreshTodayDashboard,
    compensateDailySettlements: dashboard.compensateDailySettlements,
    invalidateDashboard: dashboard.invalidateDashboard,
    loadCategories: dashboard.loadCategories,
    categoryMap: dashboard.categoryMap,
    todaySettlement: dashboard.todaySettlement,
    yesterdaySettlement: dashboard.yesterdaySettlement,
    todayTransactions: dashboard.todayTransactions,
    isDashboardStale: dashboard.isDashboardStale,
    dashboardLoading: dashboard.dashboardLoading,
    yesterdaySurplusFen: dashboard.yesterdaySurplusFen,
    confirmSurplusRolloverAction,
    loadSurplusAllocationsAction,
    loadPendingAllocationAction,

    // wish
    loadWishes: wish.loadWishes,
    loadArchivedWishesAction: wish.loadArchivedWishesAction,
    createWishAction: wish.createWishAction,
    updateWishAction: wish.updateWishAction,
    archiveWishAction: wish.archiveWishAction,
    deleteWishAction: wish.deleteWishAction,
    loadWishFundLogsAction: wish.loadWishFundLogsAction,
    setFavoriteLedgerAction: wish.setFavoriteLedgerAction,
    wishes: wish.wishes,
    archivedWishes: wish.archivedWishes,

    // pool
    depositWishManualAction: pool.depositWishManualAction,
    depositWishFromSurplusAction: pool.depositWishFromSurplusAction,
    depositWishFromSavingsAction: pool.depositWishFromSavingsAction,
    withdrawWishToSurplusAction: pool.withdrawWishToSurplusAction,
    depositSavingsPoolAction: pool.depositSavingsPoolAction,
    withdrawSavingsPoolAction: pool.withdrawSavingsPoolAction,
    loadSavingsPoolLogsAction: pool.loadSavingsPoolLogsAction,

    // challenge
    loadChallengeSummary: challenge.loadChallengeSummary,
    setChallengeTargetAction: challenge.setChallengeTargetAction,
    loadAchievements: challenge.loadAchievements,
    evaluateAchievementsAction: challenge.evaluateAchievementsAction,
    saveOnboardingAction: challenge.saveOnboardingAction,
    recordSubscribeAuthAction: challenge.recordSubscribeAuthAction,
    sendSubscribeMessageAction: challenge.sendSubscribeMessageAction,

    // asset
    loadAssetAccounts: asset.loadAssetAccounts,
    createAssetAccountAction: asset.createAssetAccountAction,
    updateAssetAccountAction: asset.updateAssetAccountAction,
    deleteAssetAccountAction: asset.deleteAssetAccountAction,
    adjustAccountBalanceAction: asset.adjustAccountBalanceAction,
    transferBetweenAccountsAction: asset.transferBetweenAccountsAction,
    createInvestmentHoldingAction: asset.createInvestmentHoldingAction,
    updateInvestmentHoldingAction: asset.updateInvestmentHoldingAction,
    deleteInvestmentHoldingAction: asset.deleteInvestmentHoldingAction,
    investmentTransactionAction: asset.investmentTransactionAction,
    assetTotals: asset.assetTotals,

    // health
    loadHealthProfile: health.loadHealthProfile,
    upsertHealthProfileAction: health.upsertHealthProfileAction,
    loadDailyHealth: health.loadDailyHealth,
    setExerciseCaloriesAction: health.setExerciseCaloriesAction,
    loadWeeklyHealth: health.loadWeeklyHealth,
    loadMealsByDateAction: health.loadMealsByDateAction,
    createMealAction: health.createMealAction,
    updateMealAction: health.updateMealAction,
    deleteMealAction: health.deleteMealAction,
    getMealAction: health.getMealAction,
    loadMealsByDate: health.loadMealsByDateAction,
    loadStickers: health.loadStickers,
    createStickerAction: health.createStickerAction,
    updateStickerAction: health.updateStickerAction,
    deleteStickerAction: health.deleteStickerAction,
    consumeStickerAction: health.consumeStickerAction,
    recognizeReceiptAction: health.recognizeReceiptAction,

    // 聚合 computed（本模块内定义，本地绑定可用）
    surplusPoolBalanceFen,
    savingsPoolBalanceFen,
    currentStreak,
    isLoggedIn,
    isGuest,
    sessionReady,
    dailyLimitFen,
    pendingRolloverFen,
    totalDailyLimitFen,
    hasLimit,
    spentTodayFen,
    leftTodayFen,
    isOverLimit,
    onboardingDone,
    onboardingStep,
    sessionLoading,
    bootstrapLoading,
    loginLoading,
    challenges,
    achievements,
    allAchievements,
    dashboardError
  }
}
