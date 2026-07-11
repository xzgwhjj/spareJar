/**
 * 用户与首页看板状态（单例 reactive store，无需 Pinia）
 * - openid / uid：与 users.user_id 一致（微信 openid）
 * - settings：user_settings 缓存
 * - dashboard：今日 settlement、流水、 streak 等看板数据
 */

import { reactive, computed, readonly } from 'vue'
import {
  initUser,
  recalculateSettlement,
  createTransaction,
  isSparejarApiError
} from '@/api/sparejar.js'
import { todayDateKey, addDaysToDateKey } from '@/utils/date.js'

/** uni-id 默认 token 存储键 */
export const UNI_ID_TOKEN_KEY = 'uni_id_token'
export const UNI_ID_TOKEN_EXPIRED_KEY = 'uni_id_token_expired'

/** 退出登录时需清空的本地缓存键 */
export const AUTH_STORAGE_KEYS = [
  UNI_ID_TOKEN_KEY,
  UNI_ID_TOKEN_EXPIRED_KEY,
  'uid',
  'user_info'
]

/** 看板缓存有效期（毫秒） */
export const DASHBOARD_CACHE_TTL_MS = 30_000

export class UserStoreError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'USER_STORE_ERROR') {
    super(message)
    this.name = 'UserStoreError'
    this.code = code
  }
}

/** @param {unknown} err */
export function isUserStoreError(err) {
  return err instanceof UserStoreError
}

/** @type {ReturnType<typeof createInitialState>} */
const state = reactive(createInitialState())

function createInitialState() {
  return {
    uid: '',
    /** 微信 openid，与 uid / users.user_id 相同 */
    openid: '',
    token: '',
    user: null,
    settings: null,
    streak: null,
    surplusPool: null,
    defaultLedgerId: '',
    dashboard: {
      dateKey: '',
      settlement: null,
      yesterdaySettlement: null,
      transactions: [],
      loadedAt: 0
    },
    loading: {
      login: false,
      bootstrap: false,
      dashboard: false,
      session: false
    },
    /** 是否已完成启动时会话探测（含游客） */
    sessionReady: false,
    lastError: null
  }
}

/**
 * @param {unknown} res
 * @returns {unknown[]}
 */
function pickDbRows(res) {
  if (!res || typeof res !== 'object') return []
  if ('result' in res && res.result && typeof res.result === 'object' && 'data' in res.result) {
    return /** @type {unknown[]} */ (res.result.data || [])
  }
  if ('data' in res) return /** @type {unknown[]} */ (res.data || [])
  return []
}

/**
 * @param {string} collection
 * @param {string} userId
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function fetchDocByUser(collection, userId) {
  const db = uniCloud.database()
  const res = await db.collection(collection).where({ user_id: userId }).limit(1).get()
  const row = pickDbRows(res)[0]
  return row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : null
}

/**
 * 从本地 token 恢复登录态（无 token 则视为游客）
 * @returns {Promise<boolean>}
 */
export async function restoreSession() {
  state.lastError = null
  const storedToken = uni.getStorageSync(UNI_ID_TOKEN_KEY)
  if (!storedToken) {
    clearAuthState()
    return false
  }

  try {
    const userInfo = await uniCloud.getCurrentUserInfo()
    if (userInfo && userInfo.uid && !userInfo.tokenExpired) {
      state.uid = userInfo.uid
      state.openid = userInfo.uid
      state.token = storedToken
      return true
    }
  } catch (_err) {
    // token 无效或已过期
  }

  clearAuthStorage()
  clearAuthState()
  return false
}

/** 清除本地登录凭证（不影响内存 state，需配合 clearAuthState） */
export function clearAuthStorage() {
  AUTH_STORAGE_KEYS.forEach((key) => {
    try {
      uni.removeStorageSync(key)
    } catch (_err) {
      // 忽略不存在的 key
    }
  })
}

function clearAuthState() {
  state.uid = ''
  state.openid = ''
  state.token = ''
  state.user = null
  state.settings = null
  state.streak = null
  state.surplusPool = null
  state.defaultLedgerId = ''
  state.lastError = null
  invalidateDashboard()
}

function persistAuthSession(uid, token, tokenExpired) {
  uni.setStorageSync(UNI_ID_TOKEN_KEY, token)
  if (tokenExpired) {
    uni.setStorageSync(UNI_ID_TOKEN_EXPIRED_KEY, tokenExpired)
  }
  state.token = token
  state.uid = uid
  state.openid = uid
}

/**
 * 微信登录（调用 sparejar-auth 云函数）
 * @returns {Promise<{ uid: string, token: string, tokenExpired?: number }>}
 */
export async function loginWithWeixin() {
  state.loading.login = true
  state.lastError = null
  try {
    const loginRes = await new Promise((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject
      })
    })

    if (!loginRes || !loginRes.code) {
      throw new UserStoreError('微信 login 未返回 code', 'WEIXIN_LOGIN_FAILED')
    }

    const fnRes = await uniCloud.callFunction({
      name: 'sparejar-auth',
      data: {
        action: 'loginByWeixin',
        code: loginRes.code
      }
    })

    const payload = fnRes.result || fnRes
    if (!payload || payload.code !== 0) {
      throw new UserStoreError(payload?.message || '登录失败', 'AUTH_FAILED')
    }

    const { uid, token, tokenExpired } = payload.data || {}
    if (!token || !uid) {
      throw new UserStoreError('登录响应缺少 token 或 uid', 'AUTH_INVALID')
    }

    persistAuthSession(uid, token, tokenExpired)
    return { uid, token, tokenExpired }
  } catch (err) {
    const message = err instanceof Error ? err.message : '登录失败'
    state.lastError = message
    throw err instanceof UserStoreError ? err : new UserStoreError(message, 'LOGIN_FAILED')
  } finally {
    state.loading.login = false
  }
}

/**
 * 同步判断是否已登录（游客为 false）
 * @returns {boolean}
 */
export function checkLoggedIn() {
  return !!(state.uid && state.token)
}

/**
 * 启动时会话初始化：仅恢复已有登录，不主动拉起微信登录
 * @returns {Promise<{ isLoggedIn: boolean, mode: 'session' | 'guest' }>}
 */
export async function initAppSession() {
  state.loading.session = true
  state.lastError = null
  try {
    const restored = await restoreSession()
    if (restored) {
      try {
        await bootstrap()
        return { isLoggedIn: true, mode: 'session' }
      } catch (err) {
        console.error('[user-store] bootstrap failed after restore', err)
        logout()
      }
    }
    return { isLoggedIn: false, mode: 'guest' }
  } finally {
    state.sessionReady = true
    state.loading.session = false
  }
}

/**
 * 用户主动登录并完成 initUser
 * @param {Record<string, unknown>} [profile]
 * @returns {Promise<{ uid: string, mode: 'login' }>}
 */
export async function loginAndBootstrap(profile = {}) {
  // #ifdef MP-WEIXIN
  await loginWithWeixin()
  await bootstrap(profile)
  uni.$emit('sparejar-auth-changed', { isLoggedIn: true, uid: state.uid })
  return { uid: state.uid, mode: 'login' }
  // #endif

  // #ifndef MP-WEIXIN
  throw new UserStoreError('请在微信小程序中登录', 'UNSUPPORTED_PLATFORM')
  // #endif
}

/**
 * @deprecated 请用 initAppSession（启动）或 loginAndBootstrap（主动登录）
 */
export async function ensureAuth(profile = {}) {
  const session = await initAppSession()
  if (session.isLoggedIn) {
    return { uid: state.uid, mode: 'session' }
  }
  return loginAndBootstrap(profile)
}

/**
 * 退出登录：清 token + 用户信息，下次启动为游客
 */
export function logout() {
  clearAuthStorage()
  clearAuthState()
  uni.$emit('sparejar-auth-changed', { isLoggedIn: false })
}

/**
 * 加载 user_settings
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function loadSettings() {
  if (!state.uid) return null
  state.settings = await fetchDocByUser('user_settings', state.uid)
  return state.settings
}

/**
 * 加载连续打卡
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function loadStreak() {
  if (!state.uid) return null
  state.streak = await fetchDocByUser('user_streaks', state.uid)
  return state.streak
}

/**
 * 加载盈余池余额
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function loadSurplusPool() {
  if (!state.uid) return null
  state.surplusPool = await fetchDocByUser('surplus_pools', state.uid)
  return state.surplusPool
}

/**
 * 初始化业务用户（幂等）
 * @param {Record<string, unknown>} [profile]
 */
export async function bootstrap(profile = {}) {
  if (!state.uid) {
    const ok = await restoreSession()
    if (!ok) {
      throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
    }
  }

  state.loading.bootstrap = true
  state.lastError = null
  try {
    const data = await initUser(profile)
    state.user = data.user || null
    if (data.default_ledger_id) {
      state.defaultLedgerId = data.default_ledger_id
    }
    await Promise.all([loadSettings(), loadStreak(), loadSurplusPool()])
    if (!state.defaultLedgerId) {
      await loadDefaultLedgerId()
    }
    return data
  } catch (err) {
    const message = isSparejarApiError(err) ? err.message : (err instanceof Error ? err.message : 'bootstrap failed')
    state.lastError = message
    throw err
  } finally {
    state.loading.bootstrap = false
  }
}

async function loadDefaultLedgerId() {
  if (!state.uid || state.defaultLedgerId) return state.defaultLedgerId
  const db = uniCloud.database()
  const res = await db.collection('ledgers')
    .where({ user_id: state.uid, is_system: true })
    .field({ _id: true })
    .limit(1)
    .get()
  const row = pickDbRows(res)[0]
  if (row && typeof row === 'object' && row._id) {
    state.defaultLedgerId = String(row._id)
  }
  return state.defaultLedgerId
}

export function invalidateDashboard() {
  state.dashboard.dateKey = ''
  state.dashboard.settlement = null
  state.dashboard.yesterdaySettlement = null
  state.dashboard.transactions = []
  state.dashboard.loadedAt = 0
}

/**
 * 刷新今日看板：recalculateSettlement + 今日流水 + 昨日结余
 * @param {{ force?: boolean, dateKey?: string }} [options]
 */
export async function refreshTodayDashboard(options = {}) {
  if (!state.uid) {
    throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  }

  const dateKey = options.dateKey || todayDateKey()
  const force = !!options.force
  const now = Date.now()
  const cacheValid = !force
    && state.dashboard.dateKey === dateKey
    && state.dashboard.loadedAt > 0
    && now - state.dashboard.loadedAt < DASHBOARD_CACHE_TTL_MS

  if (cacheValid) {
    return state.dashboard
  }

  state.loading.dashboard = true
  state.lastError = null
  try {
    const yesterdayKey = addDaysToDateKey(dateKey, -1)
    const settlement = await recalculateSettlement(dateKey)

    const db = uniCloud.database()
    const cmd = db.command
    const [txRes, yesterdayRes] = await Promise.all([
      db.collection('transactions')
        .where({
          user_id: state.uid,
          date_key: dateKey,
          deleted_at: cmd.eq(null)
        })
        .orderBy('transaction_at', 'desc')
        .limit(50)
        .get(),
      db.collection('daily_settlements')
        .where({ user_id: state.uid, date_key: yesterdayKey })
        .limit(1)
        .get()
    ])

    state.dashboard.dateKey = dateKey
    state.dashboard.settlement = settlement
    state.dashboard.transactions = pickDbRows(txRes)
    state.dashboard.yesterdaySettlement = pickDbRows(yesterdayRes)[0] || null
    state.dashboard.loadedAt = now

    return state.dashboard
  } catch (err) {
    const message = isSparejarApiError(err) ? err.message : (err instanceof Error ? err.message : 'dashboard refresh failed')
    state.lastError = message
    throw err
  } finally {
    state.loading.dashboard = false
  }
}

/**
 * Phase 0.6 冒烟测试：initUser → createTransaction → recalculateSettlement
 * 需在 HBuilderX 已登录且云函数已部署的环境下调用
 * @param {{ ledgerId?: string, skipCreate?: boolean }} [options]
 */
export async function runCloudSmokeTest(options = {}) {
  const report = {
    ok: false,
    steps: /** @type {Array<{ name: string, ok: boolean, detail?: unknown, error?: string }>} */ ([])
  }

  async function step(name, fn) {
    try {
      const detail = await fn()
      report.steps.push({ name, ok: true, detail })
      return detail
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      report.steps.push({ name, ok: false, error })
      throw err
    }
  }

  try {
    await step('restoreSession', async () => {
      const ok = await restoreSession()
      if (!ok) throw new UserStoreError('未登录，请先调用 loginAndBootstrap()', 'NOT_LOGGED_IN')
      return { uid: state.uid }
    })

    await step('initUser', () => bootstrap())

    let ledgerId = options.ledgerId || state.defaultLedgerId
    if (!ledgerId) {
      ledgerId = await loadDefaultLedgerId()
    }
    if (!ledgerId) {
      throw new UserStoreError('找不到默认账本 ledger_id', 'LEDGER_NOT_FOUND')
    }

    if (!options.skipCreate) {
      await step('createTransaction', () => createTransaction({
        ledger_id: ledgerId,
        type: 'expense',
        amount: 100,
        note: 'Phase0 smoke test'
      }))
    }

    await step('recalculateSettlement', () => recalculateSettlement(todayDateKey()))

    await step('refreshTodayDashboard', () => refreshTodayDashboard({ force: true }))

    report.ok = true
    return report
  } catch (_err) {
    report.ok = false
    return report
  }
}

/**
 * 在组件中使用用户 store
 */
export function useUserStore() {
  const isLoggedIn = computed(() => !!state.uid && !!state.token)
  const isGuest = computed(() => !state.uid || !state.token)
  const sessionReady = computed(() => state.sessionReady)
  const dailyLimitFen = computed(() => {
    const settlement = state.dashboard.settlement
    if (settlement && typeof settlement.base_limit === 'number') {
      return settlement.base_limit
    }
    if (state.settings && typeof state.settings.daily_base_limit === 'number') {
      return state.settings.daily_base_limit
    }
    return 10000
  })
  const spentTodayFen = computed(() => {
    const settlement = state.dashboard.settlement
    return settlement && typeof settlement.consumed === 'number' ? settlement.consumed : 0
  })
  const leftTodayFen = computed(() => {
    const settlement = state.dashboard.settlement
    if (settlement && typeof settlement.available_end === 'number') {
      return settlement.available_end
    }
    return dailyLimitFen.value - spentTodayFen.value
  })
  const isOverLimit = computed(() => {
    const settlement = state.dashboard.settlement
    return !!(settlement && settlement.is_over_limit)
  })
  const currentStreak = computed(() => {
    if (state.streak && typeof state.streak.daily_current_streak === 'number') {
      return state.streak.daily_current_streak
    }
    return 0
  })
  const yesterdaySurplusFen = computed(() => {
    const doc = state.dashboard.yesterdaySettlement
    if (!doc || doc.allocation_status !== 'pending') return 0
    return typeof doc.surplus === 'number' ? doc.surplus : 0
  })
  const surplusPoolBalanceFen = computed(() => {
    if (state.surplusPool && typeof state.surplusPool.balance === 'number') {
      return state.surplusPool.balance
    }
    const settlement = state.dashboard.settlement
    return settlement && typeof settlement.surplus_pool_start === 'number'
      ? settlement.surplus_pool_start
      : 0
  })

  return {
    state: readonly(state),
    isLoggedIn,
    isGuest,
    sessionReady,
    dailyLimitFen,
    spentTodayFen,
    leftTodayFen,
    isOverLimit,
    currentStreak,
    yesterdaySurplusFen,
    surplusPoolBalanceFen,
    checkLoggedIn,
    clearAuthStorage,
    restoreSession,
    loginWithWeixin,
    initAppSession,
    loginAndBootstrap,
    ensureAuth,
    logout,
    bootstrap,
    loadSettings,
    loadStreak,
    loadSurplusPool,
    refreshTodayDashboard,
    invalidateDashboard,
    runCloudSmokeTest
  }
}

export default useUserStore
