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
import { updateUser as apiUpdateUser } from '@/api/sparejar.js'

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

/**
 * 连续存款天数：
 *  - 以「最近一次存入日」为锚；若最近存入日既不是今天也不是昨天，说明已断更 → 0。
 *  - 否则从该日往前连续计数（每自然日去重，断一天即停）。
 * 例：已连续3天(到昨天)，今天未存 → 显示3；今天全天未存，到明天看 → 0（隐藏）；
 *     明天存了 → 从1重新计。
 */
export const saveStreak = computed(() => {
  const logs = Array.isArray(state.savingsPoolLogs) ? state.savingsPoolLogs : []
  const daySet = new Set()
  for (const r of logs) {
    if (r.direction !== 'in') continue
    const dk = r.date_key || (r.created_at ? String(r.created_at).slice(0, 10) : '')
    if (dk) daySet.add(dk)
  }
  if (daySet.size === 0) return 0

  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const yesterday = new Date(start.getTime() - 86400000)
  const todayKey = todayDateKey(start)
  const yesterdayKey = todayDateKey(yesterday)

  // 最近存入日必须今天或昨天，否则已断更
  let anchor
  if (daySet.has(todayKey)) anchor = start
  else if (daySet.has(yesterdayKey)) anchor = yesterday
  else return 0

  // 从锚点往前连续计数，遇缺失即停
  let cursor = anchor
  let count = 0
  while (daySet.has(todayDateKey(cursor))) {
    count++
    cursor = new Date(cursor.getTime() - 86400000)
  }
  return count
})

export const isLoggedIn = computed(() => !!state.uid)
export const isGuest = computed(() => !state.uid)
export const sessionReady = computed(() => !!(state.session && state.session.ready))
export const sessionLoading = computed(() => state.loading.session)
export const bootstrapLoading = computed(() => state.loading.bootstrap)
export const loginLoading = computed(() => state.loading.login)

export const dailyLimitFen = computed(() => {
  // 1) 已结算日：直接使用当日结算快照（优先级最高，会无视 settings 的改动）
  const settlement = state.dashboard.settlement
  if (settlement && typeof settlement.base_limit === 'number') {
    console.log('[限额·来源① settlement.base_limit]', settlement.base_limit)
    return settlement.base_limit
  }
  // 2) 未结算：用分层限额引擎按 settings 估算（兼容日/周/月/年维度）
  if (state.settings) {
    const dayKey = todayDateKey()
    const est = computeDayBaseLimit(state.settings, dayKey)
    console.log('[限额·来源② computeDayBaseLimit]', est, 'settings=', JSON.stringify(state.settings))
    if (est > 0) return est
  }
  // 3) 兜底：直接读 user_settings.daily_base_limit
  if (state.settings && typeof state.settings.daily_base_limit === 'number') {
    console.log('[限额·来源③ daily_base_limit]', state.settings.daily_base_limit)
    return state.settings.daily_base_limit
  }
  console.log('[限额·默认0]')
  return 0
})
export const pendingRolloverFen = computed(() => {
  // 滚入次日可用额度 P，由结余池流水推导（surplusPool.rollOverPending 由 loadSurplusPool 计算）
  // 月/年维度无日级滚存（结余回流父池由 C 重平处理），此处对月/年维度归零，避免仪表盘重复显示
  const dim = state.settings ? (state.settings.limit_dim || 'day') : 'day'
  if (dim !== 'day') return 0
  const roll = state.surplusPool && typeof state.surplusPool.rollOverPending === 'number'
    ? state.surplusPool.rollOverPending
    : 0
  console.log('[滚存 rollOverPending]', roll, 'surplusPool=', JSON.stringify(state.surplusPool))
  return roll
})
export const totalDailyLimitFen = computed(() => {
  const base = dailyLimitFen.value
  const roll = pendingRolloverFen.value
  console.log('[总限额汇总] 固定base=', base, '滚存roll=', roll, 'total=', base + roll, '→ ¥', (base + roll) / 100)
  return base + roll
})
export const hasLimit = computed(() => totalDailyLimitFen.value > 0)
// 今日已用：由看板「当日交易」中支出类汇总（响应式，保存后 refresh 即更新）
// 注：state.spentToday 字段此前从未被赋值，导致已用恒为 0，改为直接推导。
export const spentTodayFen = computed(() => {
  const txs = state.dashboard.transactions || []
  return txs.reduce(
    (sum, tx) =>
      sum + (tx.type === 'expense' && typeof tx.amount === 'number' ? tx.amount : 0),
    0
  )
})
export const leftTodayFen = computed(() => Math.max(0, totalDailyLimitFen.value - spentTodayFen.value))
// 超额判定口径与后端 recalculateDailySettlement 对齐：
// 日维度 = 当日花费 > 当日 base_limit+滚存；
// 月/年维度 = 父池(月/年)是否突破（由后端日结统一判定，单日超节奏不记失败）。
export const isOverLimit = computed(() => {
  const dim = state.settings ? (state.settings.limit_dim || 'day') : 'day'
  if (dim === 'day') {
    return spentTodayFen.value > totalDailyLimitFen.value
  }
  const s = state.dashboard.settlement
  return !!(s && s.is_over_limit)
})

// 超限类型：none/day/month/year，供 UI 区分"月池已超"与"年池已超"做差异化醒目提示。
export const overLimitKind = computed(() => {
  const dim = state.settings ? (state.settings.limit_dim || 'day') : 'day'
  if (dim === 'day') return spentTodayFen.value > totalDailyLimitFen.value ? 'day' : 'none'
  const s = state.dashboard.settlement
  return s && s.is_over_limit ? dim : 'none'
})
// 引导完成/步骤状态：优先 user_settings（真源）；user_settings 缺失该字段时
// （旧数据仅写在 users 表，user_settings 甚至无此字段）回退 users.onboarding_done / onboarding_step，
// 避免「已完成却被反复引导」。两层都不存在才退回内存 state.onboarding（刷新即丢，仅兜底）。
export const onboardingDone = computed(() => {
  if (state.settings && typeof state.settings.onboarding_done === 'boolean') {
    return state.settings.onboarding_done
  }
  if (typeof state.user?.onboarding_done === 'boolean') {
    return state.user.onboarding_done
  }
  return !!state.onboarding?.done
})
export const onboardingStep = computed(() => {
  if (state.settings && typeof state.settings.onboarding_step === 'number') {
    return state.settings.onboarding_step
  }
  if (typeof state.user?.onboarding_step === 'number') {
    return state.user.onboarding_step
  }
  return state.onboarding?.step ?? ''
})

export const challenges = computed(() => state.challenges)
export const achievements = computed(() => state.achievements)
export const allAchievements = computed(() =>
  (Array.isArray(state.achievements) ? state.achievements : []).filter((a) => !a.archived)
)
export const dashboardError = computed(() => state.lastError)

// ---- 跨域 action（拆分时遗漏，自原 user.js 迁回）----
/**
 * 更新用户基础资料（昵称 / 头像），成功后同步前端 state.user。
 * @param {{nickname?:string, avatar?:string}} patch 头像为 cloud:// fileID
 */
export async function updateProfile(patch = {}) {
  if (!state.uid) throw new Error('未登录，无法修改资料')
  await apiUpdateUser(patch)
  if (state.user) {
    if (typeof patch.nickname === 'string') state.user.nickname = patch.nickname
    if (typeof patch.avatar_url === 'string') {
      state.user.avatar_url = patch.avatar_url
    }
  }
}

export async function confirmSurplusRolloverAction(decision, opts = {}) {
  if (!state.uid) return
  await confirmSurplusRollover(decision, opts)
  await auth.loadSettings()
  await dashboard.refreshTodayDashboard()
  await auth.loadSurplusPool()
  await auth.loadSavingsPool()
}

/** 加载存款池流水，供 saveStreak 计算连续存款天数。 */
export async function loadSaveStreakAction() {
  if (!state.uid) return
  try {
    state.savingsPoolLogs = await pool.loadSavingsPoolLogsAction()
  } catch (err) {
    console.error('[store] 加载存款池流水失败', err)
  }
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
    deleteAccount: auth.deleteAccount,
    requestDeleteAccount: auth.requestDeleteAccount,
    cancelDeleteAccount: auth.cancelDeleteAccount,
    exportUserData: auth.exportUserData,
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
    depositWishFromAccountAction: pool.depositWishFromAccountAction,
    depositWishFromSurplusAction: pool.depositWishFromSurplusAction,
    depositWishFromSavingsAction: pool.depositWishFromSavingsAction,
    withdrawWishToSurplusAction: pool.withdrawWishToSurplusAction,
    withdrawWishToAccountAction: pool.withdrawWishToAccountAction,
    withdrawWishToSavingsAction: pool.withdrawWishToSavingsAction,
    depositSavingsPoolAction: pool.depositSavingsPoolAction,
    withdrawSavingsPoolAction: pool.withdrawSavingsPoolAction,
    loadSavingsPoolLogsAction: pool.loadSavingsPoolLogsAction,
    loadSaveStreakAction,
    updateProfile,

    // challenge
    loadChallengeSummary: challenge.loadChallengeSummary,
    loadLimitStatus: challenge.loadLimitStatus,
    setChallengeTargetAction: challenge.setChallengeTargetAction,
    syncPeriodTargetsAction: challenge.syncPeriodTargetsAction,
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
    loadUserPoints: health.loadUserPoints,
    checkInAction: health.checkInAction,
    combineStickerAction: health.combineStickerAction,
    decrementStickerStockAction: health.decrementStickerStockAction,

    // 聚合 computed（本模块内定义，本地绑定可用）
    surplusPoolBalanceFen,
    savingsPoolBalanceFen,
    currentStreak,
    saveStreak,
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
