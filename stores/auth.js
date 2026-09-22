/**
 * 认证与会话域：登录、会话恢复、登出、初始化 bootstrap。
 */

import { todayDateKey } from '@/utils/date.js'
import {
  state,
  UNI_ID_TOKEN_KEY,
  UNI_ID_TOKEN_EXPIRED_KEY,
  AUTH_STORAGE_KEYS,
  LOCAL_UI_STORAGE_KEYS,
  FAV_KEY_PREFIX,
  UserStoreError
} from './core/state.js'
export { isUserStoreError } from './core/state.js'
import {
  initUser,
  getDoc,
  listLedgers,
  deleteAccount as apiDeleteAccount,
  scheduleDeleteAccount as apiScheduleDeleteAccount,
  cancelDeleteAccount as apiCancelDeleteAccount,
  exportUserData as apiExportUserData,
  isSparejarApiError
} from './core/api.js'
import { refreshToken, getSurplusPoolLogs, ensureUserSettings } from '@/api/sparejar.js'
import { loadWishes, loadArchivedWishesAction } from './wish.js'
import { loadChallengeSummary, evaluateAchievementsAction, loadAchievements } from './challenge.js'
import { loadAssetAccounts } from './asset.js'
import { loadStickers, loadHealthProfile, loadDailyHealth, loadWeeklyHealth, loadUserPoints } from './health.js'
import { loadCategories, invalidateDashboard } from './dashboard.js'

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
  // 始终落盘 expired：缺失时给 7 天默认，保证 restoreSession 判断一致，避免"永不判过期"
  uni.setStorageSync(
    UNI_ID_TOKEN_EXPIRED_KEY,
    typeof tokenExpired === 'number' ? tokenExpired : Date.now() + 7 * 864e5
  )
  state.token = token
  state.uid = uid
  state.openid = uid
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

  // tokenExpired 为过期时间戳（毫秒）；已过期时尝试静默续期，失败才判游客
  const tokenExpired = uni.getStorageSync(UNI_ID_TOKEN_EXPIRED_KEY)
  if (tokenExpired && typeof tokenExpired === 'number' && tokenExpired < Date.now()) {
    try {
      const newToken = await refreshToken()
      state.token = newToken
      // 续期成功后继续恢复登录态（expired 已由事件落地）
    } catch (e) {
      console.warn('[auth] 启动续期失败，清理登录态', e)
      clearAuthStorage()
      clearAuthState()
      return false
    }
  }

  // 从本地存储恢复登录态（服务端有效性由 initAppSession → bootstrap → initUser 兜底校验）
  state.uid = storedUid
  state.openid = storedUid
  state.token = storedToken
  return true
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
    // 同步最新过期时间，避免下次启动 restoreSession 用旧 expired 误判
    if (payload.tokenExpired) {
      uni.setStorageSync(UNI_ID_TOKEN_EXPIRED_KEY, payload.tokenExpired)
    }
  }
}

// ===== token 心跳：运行期提前预热刷新，避免请求时才发现过期 =====
let tokenHeartbeatTimer = null

export function startTokenHeartbeat() {
  stopTokenHeartbeat()
  tokenHeartbeatTimer = setInterval(async () => {
    const expired = uni.getStorageSync(UNI_ID_TOKEN_EXPIRED_KEY)
    // 距过期不足 5 分钟即预热刷新（无感知）
    if (typeof expired === 'number' && expired - Date.now() < 5 * 60 * 1000) {
      try {
        await refreshToken()
      } catch (e) {
        console.warn('[auth] token 心跳续期失败', e)
      }
    }
  }, 60 * 1000)
}

export function stopTokenHeartbeat() {
  if (tokenHeartbeatTimer) {
    clearInterval(tokenHeartbeatTimer)
    tokenHeartbeatTimer = null
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
  // 仅当仍在登录态时广播登录成功
  if (state.isLoggedIn) {
    uni.$emit('sparejar-auth-changed', { isLoggedIn: true, uid: state.uid })
  }
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

// （方案 C）不再使用本地「待注销」标记：横幅读取云端 state.user.account_status，
// 申请注销后保留登录态，期内可撤销/导出；冷静期由后端 cron 自动硬删。

/**
 * 注销时清空本地「用户相关」UI 偏好缓存（非财务数据，但随账号消失应一并清掉）。
 * - 已登记的固定 UI 键（LOCAL_UI_STORAGE_KEYS，如存钱罐动画等级）
 * - 账本收藏标记（sparejar_fav_<ledgerId> 前缀，按前缀枚举本地存储键清除）
 * 注：本项目游客模式不把财务数据落本地 storage，真实数据删除由后端 deleteAccount 完成。
 */
function clearLocalDataForDelete() {
  LOCAL_UI_STORAGE_KEYS.forEach((key) => {
    try {
      uni.removeStorageSync(key)
    } catch (_e) {
      // 忽略不存在的 key
    }
  })
  try {
    const info = uni.getStorageInfoSync()
    ;(info.keys || []).forEach((k) => {
      if (typeof k === 'string' && k.startsWith(FAV_KEY_PREFIX)) {
        try {
          uni.removeStorageSync(k)
        } catch (_e) {
          // 忽略
        }
      }
    })
  } catch (_e) {
    // 读取失败也不阻塞注销主流程
  }
}

/**
 * 注销账号：永久删除账号及全部个人数据（个保法合规）。
 * 流程：
 *   ① 调后端 deleteAccount 硬删云端全部业务数据（按 user_id/openid）；
 *   ② 后端成功后清本地登录态 + 用户相关 UI 偏好；
 *   ③ 广播登出，页面自动回落游客态。
 * 后端未实现或失败时抛错，绝不清除本地，避免「云端没删、本地先没」的数据不一致。
 * 用于冷静期内「立即注销」：用户主动放弃 7 天冷静期，立即永久删除全部数据并登出；
 * 之后同微信登录即开新号（后端 initUser 按 openid 重建）。
 */
export async function deleteAccount() {
  if (!state.uid) {
    throw new UserStoreError('未登录，无法注销', 'NOT_LOGGED_IN')
  }
  // ① 后端硬删（失败则抛出，不继续清本地）
  await apiDeleteAccount()
  // ② 本地清除：用户相关 UI 偏好 + 登录态
  clearLocalDataForDelete()
  clearAuthStorage()
  clearAuthState()
  uni.$emit('sparejar-auth-changed', { isLoggedIn: false })
}

/**
 * 申请注销（7 天冷静期 + 可恢复）：
 * 请求后端标记 account_status='deleting' 并写入计划删除时间，保留本地登录态，
 * 期内可随时调用 cancelDeleteAccount 撤销并恢复数据。到期由服务端 cron 自动硬删。
 * @param {number} [days] 冷静期天数，默认 7
 * @returns {Promise<{ delete_scheduled_at: string, delete_scheduled_at_ts: number }>}
 */
export async function requestDeleteAccount(days = 7) {
  if (!state.uid) {
    throw new UserStoreError('未登录，无法注销', 'NOT_LOGGED_IN')
  }
  const res = await apiScheduleDeleteAccount(days)
  // 方案 C：保留登录态，仅标记 account_status='deleting'；
  // 横幅读取云端 state.user.delete_scheduled_at，期内可撤销/导出。
  // 冷静期内如需立即彻底注销，调用 deleteAccount()（立即硬删并登出）。
  if (state.user) {
    state.user.account_status = 'deleting'
    state.user.delete_scheduled_at = res.delete_scheduled_at
  }
  return res
}

/**
 * 撤销注销：恢复账号为 active，清空计划删除时间。
 */
export async function cancelDeleteAccount() {
  if (!state.uid) {
    throw new UserStoreError('未登录', 'NOT_LOGGED_IN')
  }
  await apiCancelDeleteAccount()
  if (state.user) {
    state.user.account_status = 'active'
    state.user.delete_scheduled_at = ''
  }
}

/**
 * 导出用户全量数据（前端据此下载/分享 JSON）。
 * @returns {Promise<object>}
 */
export async function exportUserData() {
  if (!state.uid) {
    throw new UserStoreError('未登录', 'NOT_LOGGED_IN')
  }
  return await apiExportUserData()
}

/** 加载 user_settings（缺失时自动创建）；若 ensure 动作不可用则回退只读，避免打断整体引导 */
export async function loadSettings() {
  if (!state.uid) return null
  let doc = null
  try {
    doc = await ensureUserSettings()
  } catch (e) {
    console.warn('[settings] ensureUserSettings 不可用，回退只读 user_settings', e)
    try {
      doc = await getDoc('user_settings')
    } catch (_) {
      doc = null
    }
  }
  state.settings = doc
  return state.settings
}

/** 加载连续打卡 */
export async function loadStreak() {
  if (!state.uid) return null
  state.streak = await getDoc('user_streaks')
  return state.streak
}

/** 加载盈余池余额，并推导滚入次日可用额度 P（存于 surplusPool.rollOverPending） */
export async function loadSurplusPool() {
  if (!state.uid) return null
  state.surplusPool = await getDoc('surplus_pools')
  try {
    const logsRes = await getSurplusPoolLogs()
    if (state.surplusPool) {
      state.surplusPool.rollOverPending = logsRes.roll_over_pending || 0
    }
  } catch (e) {
    // 推导 P 失败不阻塞主流程，回落为 0
    console.warn('[auth] 推导滚入次日额度失败', e)
    if (state.surplusPool) state.surplusPool.rollOverPending = 0
  }
  return state.surplusPool
}

/** 加载通用存款池余额 */
export async function loadSavingsPool() {
  if (!state.uid) return null
  state.savingsPool = await getDoc('savings_pools')
  return state.savingsPool
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
    state.userPoints = (data.user && data.user.points) || 0
    // 由注销态重新登录：后端已清空旧数据并建新号
    if (data.wasDeleting) {
      uni.showToast({ title: '原账号已注销，已为您创建新账号', icon: 'none' })
    }
    if (data.default_ledger_id) {
      state.defaultLedgerId = data.default_ledger_id
    }
    // 用 allSettled 替代 all：单个 loader（如 ensureUserSettings 在未重启的本地函数上 404）
    // 失败不能拖垮整体引导，否则后续的 loadSurplusPool 等不会被写入 state，导致限额/余额显示为 0。
    const results = await Promise.allSettled([
      loadSettings(),
      loadStreak(),
      loadSurplusPool(),
      loadSavingsPool(),
      loadCategories(),
      loadWishes(),
      loadStickers(),
      loadUserPoints(),
      loadChallengeSummary(),
      evaluateAchievementsAction(),
      loadAchievements(),
      loadAssetAccounts(),
      loadHealthProfile(),
      loadDailyHealth(todayDateKey()),
      loadWeeklyHealth(),
      loadArchivedWishesAction()
    ])
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.warn(`[bootstrap] loader #${i} 失败：`, r.reason)
      }
    })
    // 从持久化设置还原引导完成标记：重新登录/刷新后内存 state.onboarding 会丢失，
    // 必须依据 user_settings.onboarding_done 还原，否则首页提示条与 App.vue 自动引导会反复出现。
    // 兼容旧版把完成态写入 users.onboarding_done 的遗留数据（修复部署前的「跳过」）：二者任一为真即视为已完成。
    if (state.user && state.settings) {
      const legacyDone = !!state.user.onboarding_done
      state.user.onboarding_done = !!state.settings.onboarding_done || legacyDone
    }
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
