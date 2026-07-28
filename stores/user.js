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
  runDailySettlement,
  createTransaction,
  listWishes,
  createWish,
  updateWish,
  archiveWish,
  listWishFundLogs,
  listSurplusAllocations,
  getPendingAllocation,
  depositWishManual,
  depositWishFromSurplus,
  depositWishFromSavings,
  withdrawWishToSurplus,
  depositSavingsPool,
  withdrawSavingsPool,
  getChallengeSummary,
  setChallengeTarget,
  getAchievements,
  evaluateAchievements,
  updateOnboarding,
  recordSubscribeAuth,
  sendSubscribeMessage,
  getStickers,
  createSticker,
  updateSticker,
  deleteSticker,
  consumeSticker,
  recognizeReceipt,
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
  createMeal,
  updateMeal,
  deleteMeal,
  getMealsByDate,
  getHealthProfile,
  upsertHealthProfile,
  getDailyHealthSnapshot,
  setExerciseCalories,
  getWeeklyHealth,
  listLedgers,
  listCategories,
  getDashboard,
  getDoc,
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
    savingsPool: null,
    challenges: null,
    achievements: [],
    defaultLedgerId: '',
    categories: [],
    stickers: [],
    assets: [],
    assetTotals: null,
    healthProfile: null,
    dailyHealth: null,
    weeklyHealth: null,
    wishes: [],
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
 * 从本地存储恢复登录态（无 token/uid 或已过期则视为游客）
 * 注意：本项目登录走自定义 sparejar-auth 云函数，不会填充 uni-id 的
 * getCurrentUserInfo 缓存，故 uid/token 均自行落盘、自行读取，不依赖该缓存。
 * @returns {Promise<boolean>}
 */
export async function restoreSession() {
  state.lastError = null
  const storedToken = uni.getStorageSync(UNI_ID_TOKEN_KEY)
  const storedUid = uni.getStorageSync('uid')
  if (!storedToken || !storedUid) {
    clearAuthState()
    return false
  }

  // tokenExpired 为过期时间戳（毫秒）；已过期则清理并视为游客
  const tokenExpired = uni.getStorageSync(UNI_ID_TOKEN_EXPIRED_KEY)
  if (tokenExpired && typeof tokenExpired === 'number' && tokenExpired < Date.now()) {
    clearAuthStorage()
    clearAuthState()
    return false
  }

  // 从本地存储恢复登录态（服务端有效性由 initAppSession → bootstrap → initUser 兜底校验）
  state.uid = storedUid
  state.openid = storedUid
  state.token = storedToken
  return true
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
  // 持久化 uid/openid：本项目使用自定义 sparejar-auth 登录，不会写入 uni-id 的
  // getCurrentUserInfo 缓存，必须自行落盘，否则重启后无法恢复登录态（每次需重新登录）
  uni.setStorageSync('uid', uid)
  if (tokenExpired) {
    uni.setStorageSync(UNI_ID_TOKEN_EXPIRED_KEY, tokenExpired)
  }
  state.token = token
  state.uid = uid
  state.openid = uid
}

/**
 * 静默续期回填：api 层落地新 token 后广播，此处仅同步内存 token。
 * 登录态（uid/token 均为真）不变，用户无感知。
 * @param {{ token?: string, tokenExpired?: number }} payload
 */
export function syncRefreshedToken(payload) {
  if (!payload || !payload.token) return
  // 仅在已登录时回填，避免游客态被异常事件污染
  if (state.uid) {
    state.token = payload.token
  }
}

// 监听 api 层广播的 token 续期事件，保持内存 state 与本地存储一致（模块单例，仅注册一次）
try {
  uni.$on('sparejar-token-refreshed', syncRefreshedToken)
} catch (_e) {
  // 非 uni 运行环境（如单测）忽略
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
  state.settings = await getDoc('user_settings')
  return state.settings
}

/**
 * 加载连续打卡
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function loadStreak() {
  if (!state.uid) return null
  state.streak = await getDoc('user_streaks')
  return state.streak
}

/**
 * 加载盈余池余额
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function loadSurplusPool() {
  if (!state.uid) return null
  state.surplusPool = await getDoc('surplus_pools')
  return state.surplusPool
}

/** 加载通用存款池余额 */
export async function loadSavingsPool() {
  if (!state.uid) return null
  state.savingsPool = await getDoc('savings_pools')
  return state.savingsPool
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
    await Promise.all([loadSettings(), loadStreak(), loadSurplusPool(), loadSavingsPool(), loadCategories(), loadWishes(), loadStickers(), loadChallengeSummary(), evaluateAchievementsAction(), loadAchievements(), loadAssetAccounts(), loadHealthProfile(), loadDailyHealth(todayDateKey()), loadWeeklyHealth()])
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
  // 走云函数读取，禁止前端直连数据库
  const list = await listLedgers()
  const master = (list || []).find((l) => l.is_system)
  if (master && master._id) {
    state.defaultLedgerId = String(master._id)
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
 * 加载当前用户的分类（用于交易列表/卡片按 category_id 解析图标与名称）
 * @param {boolean} [includeHidden] 是否包含已隐藏分类（默认 false）
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function loadCategories(includeHidden = false) {
  if (!state.uid) return []
  // 走云函数读取，禁止前端直连数据库
  const list = await listCategories({ include_hidden: includeHidden })
  state.categories = list || []
  return state.categories
}

/** 加载心愿目标列表（首页迷你卡 / 心愿总览页用）。 */
export async function loadWishes() {
  if (!state.uid) return []
  try {
    const list = await listWishes()
    state.wishes = Array.isArray(list) ? list : []
  } catch (err) {
    console.error('[store] 加载心愿失败', err)
    state.wishes = []
  }
  return state.wishes
}

/** 创建心愿（payload 金额为「分」）。 */
export async function createWishAction(payload) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const created = await createWish(payload)
  await loadWishes()
  return created
}

/** 更新心愿（patch 金额为「分」）。 */
export async function updateWishAction(wishId, patch) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const updated = await updateWish(wishId, patch)
  await loadWishes()
  return updated
}

/** 达成归档心愿。 */
export async function archiveWishAction(wishId) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const res = await archiveWish(wishId)
  await loadWishes()
  return res
}

/** 读取单个心愿的攒钱流水（不进全局 state，页面本地持有）。 */
export async function loadWishFundLogsAction(wishId) {
  if (!state.uid) return []
  try {
    return await listWishFundLogs(wishId)
  } catch (err) {
    console.error('[store] 读取心愿流水失败', err)
    return []
  }
}

/** 读取结余分配历史（页面本地持有）。 */
export async function loadSurplusAllocationsAction() {
  if (!state.uid) return []
  try {
    return await listSurplusAllocations()
  } catch (err) {
    console.error('[store] 读取分配历史失败', err)
    return []
  }
}

/** 获取待分配的当日结余。 */
export async function loadPendingAllocationAction() {
  if (!state.uid) return null
  try {
    return await getPendingAllocation()
  } catch (err) {
    console.error('[store] 读取待分配结余失败', err)
    return null
  }
}

/** 心愿手动虚拟存入（amount 分）。 */
export async function depositWishManualAction(wishId, amount) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await depositWishManual(wishId, amount)
  await loadWishes()
  return r
}

/** 从累计结余池转入心愿（amount 分）。 */
export async function depositWishFromSurplusAction(wishId, amount) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await depositWishFromSurplus(wishId, amount)
  await Promise.all([loadWishes(), loadSurplusPool()])
  return r
}

/** 从通用存款池转入心愿（amount 分）。 */
export async function depositWishFromSavingsAction(wishId, amount) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await depositWishFromSavings(wishId, amount)
  await loadWishes()
  return r
}

/** 心愿取出退回累计结余池（amount 分）。 */
export async function withdrawWishToSurplusAction(wishId, amount) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await withdrawWishToSurplus(wishId, amount)
  await Promise.all([loadWishes(), loadSurplusPool()])
  return r
}

/** 通用存款池手动存入（amount 分）。 */
export async function depositSavingsPoolAction(amount, reason = 'manual') {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await depositSavingsPool(amount, reason)
  await loadSurplusPool()
  return r
}

/** 通用存款池取出（amount 分）。 */
export async function withdrawSavingsPoolAction(amount, reason = 'manual') {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await withdrawSavingsPool(amount, reason)
  await loadSurplusPool()
  return r
}

/** 加载挑战中心汇总（连续天数/今日/月/年挑战/7日热力图）。 */
export async function loadChallengeSummary() {
  if (!state.uid) return null
  try {
    state.challenges = await getChallengeSummary()
  } catch (err) {
    console.error('[store] 加载挑战汇总失败', err)
    state.challenges = null
  }
  return state.challenges
}

/**
 * 设置月/年挑战目标（amount 分）。设置后重新拉取汇总。
 * @param {'monthly'|'yearly'} type
 * @param {string} periodKey
 * @param {number} targetAmount
 * @param {string} [ledgerId]
 */
export async function setChallengeTargetAction(type, periodKey, targetAmount, ledgerId) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await setChallengeTarget(type, periodKey, targetAmount, ledgerId)
  await loadChallengeSummary()
  return r
}

/** 加载成就定义并合并解锁状态。 */
export async function loadAchievements() {
  if (!state.uid) return []
  try {
    state.achievements = await getAchievements()
  } catch (err) {
    console.error('[store] 加载成就失败', err)
    state.achievements = []
  }
  return state.achievements
}

/** 自动评估并解锁符合条件的成就（幂等），返回本次新解锁列表。 */
export async function evaluateAchievementsAction() {
  if (!state.uid) return []
  try {
    const r = await evaluateAchievements()
    const unlocked = (r && r.unlocked) || []
    if (unlocked.length) await loadAchievements()
    return unlocked
  } catch (err) {
    console.error('[store] 评估成就失败', err)
    return []
  }
}

/**
 * 更新引导进度/完成状态，并同步到本地 state.user。
 * @param {number} [step] 0-4
 * @param {boolean} [done]
 */
export async function updateOnboardingAction(step, done) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const patch = await updateOnboarding(step, done)
  if (state.user) {
    if (typeof step === 'number') state.user.onboarding_step = step
    if (typeof done === 'boolean') state.user.onboarding_done = done
  }
  return patch
}

/** 记录订阅授权（前端 requestSubscribeMessage 成功后调用）。type: over_limit|daily_surplus|streak_risk */
export async function recordSubscribeAuthAction(type) {
  if (!state.uid) return null
  try {
    return await recordSubscribeAuth(type)
  } catch (err) {
    console.error('[store] 记录订阅授权失败', err)
    return null
  }
}

/**
 * 触发发送订阅消息（服务端频控 + 微信下发）。
 * @param {'over_limit'|'daily_surplus'|'streak_risk'} type
 * @param {{data?: object, page?: string}} payload
 */
export async function sendSubscribeMessageAction(type, payload = {}) {
  if (!state.uid) return null
  try {
    return await sendSubscribeMessage(type, payload)
  } catch (err) {
    console.error('[store] 发送订阅消息失败', err)
    return null
  }
}

// ===== 拍照 OCR 识别记账（阶段 9） =====

/** 小票/截图 OCR 识别。imageUrl 为已上传云存储的图片地址。 */
export async function recognizeReceiptAction(imageUrl) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  return await recognizeReceipt(imageUrl)
}

// ===== 资产账户体系（阶段 10） =====

/** 拉取资产账户列表与汇总，写入 state.assets / state.assetTotals。 */
export async function loadAssetAccounts() {
  if (!state.uid) return { accounts: [], totals: null }
  try {
    const r = await getAssetAccounts()
    state.assets = (r && r.accounts) || []
    state.assetTotals = (r && r.totals) || null
    return { accounts: state.assets, totals: state.assetTotals }
  } catch (err) {
    console.error('[store] 加载资产账户失败', err)
    return { accounts: [], totals: null }
  }
}

/** 新建资产账户。 */
export async function createAssetAccountAction(data) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await createAssetAccount(data)
  await loadAssetAccounts()
  return r
}

/** 更新账户字段。 */
export async function updateAssetAccountAction(data) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await updateAssetAccount(data)
  await loadAssetAccounts()
  return r
}

/** 软删账户。 */
export async function deleteAssetAccountAction(accountId) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await deleteAssetAccount(accountId)
  await loadAssetAccounts()
  return r
}

/** 直接改余额（调账）。 */
export async function adjustAccountBalanceAction(accountId, newBalance, note) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await adjustAccountBalance(accountId, newBalance, note)
  await loadAssetAccounts()
  return r
}

/** 账户间转账。 */
export async function transferBetweenAccountsAction(fromId, toId, amount, note) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await transferBetweenAccounts(fromId, toId, amount, note)
  await loadAssetAccounts()
  return r
}

/** 新建投资持仓。 */
export async function createInvestmentHoldingAction(data) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await createInvestmentHolding(data)
  await loadAssetAccounts()
  return r
}

/** 更新持仓。 */
export async function updateInvestmentHoldingAction(data) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await updateInvestmentHolding(data)
  await loadAssetAccounts()
  return r
}

/** 软删持仓。 */
export async function deleteInvestmentHoldingAction(holdingId) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await deleteInvestmentHolding(holdingId)
  await loadAssetAccounts()
  return r
}

/** 投资交易（买入/定投/卖出/分红）。 */
export async function investmentTransactionAction(data) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await investmentTransaction(data)
  await loadAssetAccounts()
  return r
}

// ===== 餐次与热量轻追踪（阶段 11） =====

/** 拉取健康档案（BMR/TDEE/摄入目标）。 */
export async function loadHealthProfile() {
  if (!state.uid) return null
  try {
    const r = await getHealthProfile()
    state.healthProfile = r || null
    return state.healthProfile
  } catch (err) {
    console.error('[store] 加载健康档案失败', err)
    return null
  }
}

/** 保存/测算健康档案。 */
export async function upsertHealthProfileAction(data) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await upsertHealthProfile(data)
  state.healthProfile = r || null
  return r
}

/** 拉取某日热量快照（含缺口）。 */
export async function loadDailyHealth(dateKey) {
  if (!state.uid) return null
  try {
    const r = await getDailyHealthSnapshot(dateKey)
    state.dailyHealth = r || null
    return state.dailyHealth
  } catch (err) {
    console.error('[store] 加载热量快照失败', err)
    return null
  }
}

/** 设置当日运动消耗（kcal）并重算缺口。 */
export async function setExerciseCaloriesAction(dateKey, exercise) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await setExerciseCalories(dateKey, exercise)
  state.dailyHealth = r || null
  return r
}

/** 拉取近 7 日热量快照。 */
export async function loadWeeklyHealth() {
  if (!state.uid) return null
  try {
    const r = await getWeeklyHealth()
    state.weeklyHealth = (r && r.days) ? r : null
    return state.weeklyHealth
  } catch (err) {
    console.error('[store] 加载周热量失败', err)
    return null
  }
}

/** 查询某日餐次（含食物项）。 */
export async function loadMealsByDate(dateKey) {
  if (!state.uid) return { meals: [] }
  try {
    return await getMealsByDate(dateKey)
  } catch (err) {
    console.error('[store] 加载餐次失败', err)
    return { meals: [] }
  }
}

/** 查询单个餐次（含食物项与交易）。 */
export async function getMealAction(mealId) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  return await getMeal(mealId)
}

/** 新建餐次（同时记餐饮交易）。 */
export async function createMealAction(data) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await createMeal(data)
  await Promise.all([loadDailyHealth(data.date_key), loadWeeklyHealth(), refreshTodayDashboard({ force: true })])
  return r
}

/** 更新餐次。 */
export async function updateMealAction(data) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await updateMeal(data)
  const dk = data.date_key || (state.dailyHealth && state.dailyHealth.date_key)
  if (dk) await loadDailyHealth(dk)
  await loadWeeklyHealth()
  return r
}

/** 删除餐次（含关联交易）。 */
export async function deleteMealAction(mealId, dateKey) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await deleteMeal(mealId)
  await Promise.all([loadDailyHealth(dateKey), loadWeeklyHealth(), refreshTodayDashboard({ force: true })])
  return r
}

// ===== 商品贴纸体系（阶段 8） =====

/** 拉取贴纸列表，写入 state.stickers。opts: { type? } */
export async function loadStickers(opts = {}) {
  if (!state.uid) return []
  try {
    const r = await getStickers(opts)
    state.stickers = (r && r.stickers) || []
    return state.stickers
  } catch (err) {
    console.error('[store] 加载贴纸失败', err)
    return []
  }
}

/** 新建贴纸。data 见后端 createSticker。返回新建结果。 */
export async function createStickerAction(data) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  return await createSticker(data)
}

/** 更新贴纸。data 含 sticker_id。 */
export async function updateStickerAction(data) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  return await updateSticker(data)
}

/** 删除贴纸。 */
export async function deleteStickerAction(stickerId) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  return await deleteSticker(stickerId)
}

/** 囤货消耗记账（自动记支出 + 扣库存）。返回 { transaction_id, new_stock_qty, amount }。 */
export async function consumeStickerAction(stickerId, qty) {
  if (!state.uid) throw new UserStoreError('请先登录', 'NOT_LOGGED_IN')
  const r = await consumeSticker(stickerId, qty)
  // 消耗后同步本地库存与计数，并刷新看板
  const s = state.stickers.find((x) => x._id === stickerId)
  if (s && r) {
    s.stock_qty = r.new_stock_qty
    s.use_count = (s.use_count || 0) + 1
    s.last_used_at = Date.now()
  }
  try {
    await refreshTodayDashboard({ force: true })
  } catch (_e) { /* 看板刷新失败不影响消耗结果 */ }
  return r
}

/** category_id → { name, icon, type, group } 查表 */
export const categoryMap = computed(() => {
  /** @type {Record<string, { name: string, icon: string, type: string, group: string }>} */
  const map = {}
  for (const c of state.categories) {
    if (c && c._id) {
      map[String(c._id)] = {
        name: typeof c.name === 'string' ? c.name : '',
        icon: typeof c.icon === 'string' ? c.icon : '📦',
        type: typeof c.type === 'string' ? c.type : '',
        group: typeof c.group === 'string' ? c.group : ''
      }
    }
  }
  return map
})

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
    const settlement = await recalculateSettlement(dateKey)

    // 走云函数读取，禁止前端直连数据库
    const dash = await getDashboard(dateKey)

    state.dashboard.dateKey = dateKey
    state.dashboard.settlement = settlement
    state.dashboard.transactions = dash.transactions || []
    state.dashboard.yesterdaySettlement = dash.yesterdaySettlement || null
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
 * 跨日补偿：用户打开 App 时，对今天之前的若干天补跑日切结算（日结快照/结余分配/超额惩罚）。
 * 与定时任务（cronDailySettlement）互为兜底；runDailySettlement 对已结算日幂等跳过，重复调用安全。
 * 不结算「今天」（今日结余仅在 24:00 后归属），避免把当日剩余限额误当结余分配。
 * 同一自然日仅补偿一次（lastCompensateKey 节流）。
 */
let lastCompensateKey = ''
export async function compensateDailySettlements() {
  const uid = state.uid
  if (!uid) return
  const today = todayDateKey()
  if (lastCompensateKey === today) return
  lastCompensateKey = today
  for (let i = 1; i <= 7; i++) {
    const dk = addDaysToDateKey(today, -i)
    try {
      await runDailySettlement(dk)
    } catch (err) {
      console.error('[compensate] settlement failed for', dk, err)
    }
  }
  try {
    await refreshTodayDashboard({ force: true })
  } catch (err) {
    console.error('[compensate] dashboard refresh failed', err)
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
  /** 引导是否完成（来自 users.onboarding_done） */
  const onboardingDone = computed(() => !!(state.user && state.user.onboarding_done))
  /** 引导当前步骤（来自 users.onboarding_step，0-4） */
  const onboardingStep = computed(() => (state.user && typeof state.user.onboarding_step === 'number' ? state.user.onboarding_step : 0))
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
  const savingsPoolBalanceFen = computed(() => {
    if (state.savingsPool && typeof state.savingsPool.balance === 'number') {
      return state.savingsPool.balance
    }
    return 0
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
    savingsPoolBalanceFen,
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
    loadSavingsPool,
    refreshTodayDashboard,
    invalidateDashboard,
    loadCategories,
    categoryMap,
    loadWishes,
    createWishAction,
    updateWishAction,
    archiveWishAction,
    loadWishFundLogsAction,
    loadSurplusAllocationsAction,
    loadPendingAllocationAction,
    depositWishManualAction,
    depositWishFromSurplusAction,
    depositWishFromSavingsAction,
    withdrawWishToSurplusAction,
    depositSavingsPoolAction,
    withdrawSavingsPoolAction,
    loadChallengeSummary,
    setChallengeTargetAction,
    loadAchievements,
    evaluateAchievementsAction,
    updateOnboardingAction,
    recordSubscribeAuthAction,
    sendSubscribeMessageAction,
    onboardingDone,
    onboardingStep,
    loadStickers,
    createStickerAction,
    updateStickerAction,
    deleteStickerAction,
    consumeStickerAction,
    recognizeReceiptAction,
    loadAssetAccounts,
    createAssetAccountAction,
    updateAssetAccountAction,
    deleteAssetAccountAction,
    adjustAccountBalanceAction,
    transferBetweenAccountsAction,
    createInvestmentHoldingAction,
    updateInvestmentHoldingAction,
    deleteInvestmentHoldingAction,
    investmentTransactionAction,
    loadHealthProfile,
    upsertHealthProfileAction,
    loadDailyHealth,
    setExerciseCaloriesAction,
    loadWeeklyHealth,
    loadMealsByDate,
    getMealAction,
    createMealAction,
    updateMealAction,
    deleteMealAction,
    compensateDailySettlements,
    runCloudSmokeTest
  }
}

export default useUserStore
