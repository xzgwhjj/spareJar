/**
 * 用户 store 的共享单例状态与基础设施。
 * 所有业务域文件（auth/pool/wish/...）都从这里导入同一个 state 引用，
 * 保证全局只有一份 reactive，跨模块读写一致。
 */

import { reactive } from 'vue'

/** uni-id 默认 token 存储键 */
export const UNI_ID_TOKEN_KEY = 'uni_id_token'
export const UNI_ID_TOKEN_EXPIRED_KEY = 'uni_id_token_expired'

/** 退出登录时需清空的本地缓存键 */
export const AUTH_STORAGE_KEYS = [
  UNI_ID_TOKEN_KEY,
  UNI_ID_TOKEN_EXPIRED_KEY,
  'uid'
]

/**
 * 注销账号时一并清空的本地 UI 偏好键（非财务数据，但随账号消失应一并清掉）。
 * 注：本项目游客模式不把财务数据落本地 storage，真实数据删除由后端 deleteAccount 完成。
 */
export const LOCAL_UI_STORAGE_KEYS = ['sj_drops_level']
/** 账本收藏标记本地键前缀（sparejar_fav_<ledgerId>） */
export const FAV_KEY_PREFIX = 'sparejar_fav_'

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
    savingsPoolLogs: [],
    challenges: null,
    achievements: [],
    defaultLedgerId: '',
    categories: [],
    /** 含隐藏/已删除分类的全量列表，仅用于历史账目回显分类名（不参与分类选择） */
    allCategories: [],
    stickers: [],
    userPoints: 0,
    assets: [],
    assetTotals: null,
    healthProfile: null,
    dailyHealth: null,
    weeklyHealth: null,
    wishes: [],
    archivedWishes: [],
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

/** @type {ReturnType<typeof createInitialState>} */
export const state = reactive(createInitialState())

/**
 * api 层响应 → 数据行数组。兼容 { result: { data } } 与 { data } 两种形态。
 * @param {unknown} res
 * @returns {unknown[]}
 */
export function pickDbRows(res) {
  if (!res || typeof res !== 'object') return []
  if ('result' in res && res.result && typeof res.result === 'object' && 'data' in res.result) {
    return /** @type {unknown[]} */ (res.result.data || [])
  }
  if ('data' in res) return /** @type {unknown[]} */ (res.data || [])
  // 单条业务对象（如 getChallengeSummary 返回 { streak, monthly, yearly, history7 }，
  // 经 callSparejar 解包后已是裸对象、无 result/data 包裹）：直接包成单行
  if (!Array.isArray(res)) return [res]
  return []
}
