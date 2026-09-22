/**
 * 今日看板域：看板数据加载、历史补偿、分类映射与缓存失效。
 */

import { computed } from 'vue'
import { todayDateKey } from '@/utils/date.js'
import { state, pickDbRows, DASHBOARD_CACHE_TTL_MS, UserStoreError } from './core/state.js'
import { runDailySettlement, recalculateSettlement, getDashboard, listCategories } from './core/api.js'

/**
 * 分类 id → 分类名映射。
 * 以可用分类为主，用全量（含已删除但账单仍引用的分类）兜底，
 * 保证「删除分类但保留账单」时历史账目仍能正确显示分类名。
 */
export const categoryMap = computed(() => {
  const map = {}
  const all = Array.isArray(state.allCategories) ? state.allCategories : []
  all.forEach((c) => {
    if (c && c._id) map[String(c._id)] = c.name
  })
  const list = Array.isArray(state.categories) ? state.categories : []
  list.forEach((c) => {
    if (c && c._id) map[String(c._id)] = c.name
  })
  return map
})

export async function loadCategories() {
  if (!state.uid) {
    state.categories = []
    state.allCategories = []
    return []
  }
  state.categories = await listCategories()
  // 全量（含隐藏/已删除）仅用于回显，失败时不影响主流程
  try {
    state.allCategories = await listCategories({ include_hidden: true })
  } catch (e) {
    state.allCategories = state.categories
  }
  return state.categories
}

/** 缓存是否有效 */
function isDashboardFresh() {
  return (
    state.dashboard.dateKey === todayDateKey() &&
    state.dashboard.settlement &&
    Date.now() - state.dashboard.loadedAt < DASHBOARD_CACHE_TTL_MS
  )
}

/** 日结请求去重：并发调用共享同一个 in-flight Promise */
let settlementPromise = null

/** 主动使看板失效（登出、外部数据变更后调用） */
export function invalidateDashboard() {
  state.dashboard.dateKey = ''
  state.dashboard.settlement = null
  state.dashboard.yesterdaySettlement = null
  state.dashboard.transactions = []
  state.dashboard.loadedAt = 0
}

/**
 * 刷新今日看板：优先前端缓存（30s），过期则触发后端日结/重算。
 * 仅当登录态有效时调用。
 */
export async function refreshTodayDashboard(force = false) {
  if (!state.uid) return null

  // 命中有效缓存直接返回（force 时跳过缓存，强制重算，确保新记账立即反映）
  if (!force && isDashboardFresh()) {
    return state.dashboard.settlement
  }

  state.loading.dashboard = true
  state.lastError = null
  try {
    let settlement = null
    try {
      // 并发去重：App.onLaunch 与首页 onMounted 可能同时触发，避免重复请求
      if (!settlementPromise) {
        settlementPromise = recalculateSettlement(todayDateKey()).finally(() => {
          settlementPromise = null
        })
      }
      const res = await settlementPromise
      settlement = (res && (res.settlement || res.data?.settlement)) || null
    } catch (err) {
      console.warn('[dashboard] 日结失败，尝试重算', err)
      const rec = await recalculateSettlement(todayDateKey())
      settlement = rec || null
    }

    const dash = await getDashboard(todayDateKey())
    const rows = pickDbRows(dash)

    state.dashboard.settlement = settlement
    state.dashboard.dateKey = todayDateKey()
    state.dashboard.yesterdaySettlement = rows[0]?.yesterday_settlement || null
    state.dashboard.transactions = Array.isArray(rows[0]?.transactions) ? rows[0].transactions : []
    state.dashboard.loadedAt = Date.now()
    return settlement
  } catch (err) {
    console.error('[dashboard] 刷新失败', err)
    state.lastError = err instanceof Error ? err.message : 'dashboard refresh failed'
    throw err
  } finally {
    state.loading.dashboard = false
  }
}

/**
 * 重算并补偿若干天前的历史日结（滞后的定时任务或离线期间漏算）
 * @param {string} dateKey 目标日期 YYYY-MM-DD
 */
export async function compensateDailySettlements(dateKey) {
  // 游客态直接静默返回，避免调用方未捕获时产生 UnhandledPromiseRejection
  if (!state.uid) return null
  if (!dateKey) throw new UserStoreError('dateKey is required', 'INVALID_PARAM')
  // 复用后端日结幂等接口，对指定日期重算
  const res = await runDailySettlement(dateKey)
  return res
}

// 以下 computed 仍由 useUserStore 对外暴露，保持调用方无感
export const todaySettlement = computed(() => state.dashboard.settlement)
export const yesterdaySettlement = computed(() => state.dashboard.yesterdaySettlement)
export const yesterdaySurplusFen = computed(() => state.dashboard.yesterdaySettlement?.surplus_fen ?? 0)
export const todayTransactions = computed(() => state.dashboard.transactions)
export const isDashboardStale = computed(() => {
  if (!state.dashboard.settlement) return true
  return state.dashboard.dateKey !== todayDateKey()
})
export const dashboardLoading = computed(() => state.loading.dashboard)
