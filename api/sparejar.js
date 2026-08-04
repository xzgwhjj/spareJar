/**
 * 余钱罐云函数 API 封装
 * 统一入口：uniCloud.callFunction({ name: 'sparejar-finance', data: { action, data } })
 */

/** @typedef {{ code: number, message: string, data?: unknown }} SparejarCloudResult */

export const CLOUD_FUNCTION_NAME = 'sparejar-finance'

/**
 * uni-id 默认 token 存储键（与 stores/user.js 保持一致）。
 * 此处内联常量，避免 api 反向 import store 造成循环依赖。
 */
const UNI_ID_TOKEN_KEY = 'uni_id_token'
const UNI_ID_TOKEN_EXPIRED_KEY = 'uni_id_token_expired'

/**
 * 静默续期：若云函数在响应中回传了刷新后的 token，则透明写入本地存储并广播事件。
 * uniCloud.callFunction 每次调用会自动从本地存储读取 uni_id_token 注入云函数，
 * 因此只要更新存储，后续所有请求即自动使用新 token，用户全程无感知。
 * @param {{ newToken?: string, newTokenExpired?: number }} result
 */
function persistRefreshedToken(result) {
  if (!result || typeof result !== 'object') return
  const newToken = result.newToken
  if (!newToken || typeof newToken !== 'string') return
  try {
    uni.setStorageSync(UNI_ID_TOKEN_KEY, newToken)
    if (result.newTokenExpired) {
      uni.setStorageSync(UNI_ID_TOKEN_EXPIRED_KEY, result.newTokenExpired)
    }
    // 通知 store 同步内存 token（登录态不变，仅保持一致）
    uni.$emit('sparejar-token-refreshed', { token: newToken, tokenExpired: result.newTokenExpired })
  } catch (err) {
    console.warn('[sparejar] 续期 token 落地失败', err)
  }
}

/** sparejar-finance 支持的 action 名称 */
export const ACTIONS = Object.freeze({
  INIT_USER: 'initUser',
  CREATE_TRANSACTION: 'createTransaction',
  DELETE_TRANSACTION: 'deleteTransaction',
  UPDATE_TRANSACTION: 'updateTransaction',
  CREATE_LEDGER: 'createLedger',
  UPDATE_LEDGER: 'updateLedger',
  DELETE_LEDGER: 'deleteLedger',
  SET_FAVORITE_LEDGER: 'setFavoriteLedger',
  DELETE_COVER: 'deleteCover',
  ENSURE_MASTER_LEDGER: 'ensureMasterLedger',
  LIST_LEDGERS: 'listLedgers',
  GET_LEDGER_DETAIL: 'getLedgerDetail',
  GET_TRANSACTION: 'getTransaction',
  LIST_TRANSACTIONS: 'listTransactions',
  LIST_ACCOUNT_BALANCE_LOGS: 'listAccountBalanceLogs',
  GET_DASHBOARD: 'getDashboard',
  GET_DOC: 'getDoc',
  GET_LIMIT_HISTORY: 'getLimitHistory',
  RECALCULATE_SETTLEMENT: 'recalculateSettlement',
  RUN_DAILY_SETTLEMENT: 'runDailySettlement',
  ALLOCATE_SURPLUS: 'allocateSurplus',
  CONFIRM_SURPLUS_ROLLOVER: 'confirmSurplusRollover',
  APPLY_SURPLUS_POOL_CHANGE: 'applySurplusPoolChange',
  APPLY_SAVINGS_POOL_CHANGE: 'applySavingsPoolChange',
  APPLY_WISH_FUND_CHANGE: 'applyWishFundChange',
  APPLY_ACCOUNT_BALANCE_CHANGE: 'applyAccountBalanceChange',
  LIST_CATEGORIES: 'listCategories',
  CREATE_CATEGORY: 'createCategory',
  UPDATE_CATEGORY: 'updateCategory',
  DELETE_CATEGORY: 'deleteCategory',
  REORDER_CATEGORIES: 'reorderCategories',
  UPDATE_SETTINGS: 'updateSettings',
  LIST_WISHES: 'listWishes',
  CREATE_WISH: 'createWish',
  UPDATE_WISH: 'updateWish',
  ARCHIVE_WISH: 'archiveWish',
  LIST_WISH_FUND_LOGS: 'listWishFundLogs',
  LIST_SURPLUS_ALLOCATIONS: 'listSurplusAllocations',
  GET_PENDING_ALLOCATION: 'getPendingAllocation',
  DEPOSIT_WISH_MANUAL: 'depositWishManual',
  DEPOSIT_WISH_FROM_SURPLUS: 'depositWishFromSurplus',
  DEPOSIT_WISH_FROM_SAVINGS: 'depositWishFromSavings',
  WITHDRAW_WISH_TO_SURPLUS: 'withdrawWishToSurplus',
  DEPOSIT_SAVINGS_POOL: 'depositSavingsPool',
  WITHDRAW_SAVINGS_POOL: 'withdrawSavingsPool',
  GET_CHALLENGE_SUMMARY: 'getChallengeSummary',
  SET_CHALLENGE_TARGET: 'setChallengeTarget',
  GET_ACHIEVEMENTS: 'getAchievements',
  EVALUATE_ACHIEVEMENTS: 'evaluateAchievements',
  UPDATE_ONBOARDING: 'updateOnboarding',
  RECORD_SUBSCRIBE_AUTH: 'recordSubscribeAuth',
  SEND_SUBSCRIBE_MESSAGE: 'sendSubscribeMessage',
  GET_STICKERS: 'getStickers',
  CREATE_STICKER: 'createSticker',
  UPDATE_STICKER: 'updateSticker',
  DELETE_STICKER: 'deleteSticker',
  CONSUME_STICKER: 'consumeSticker',
  RECOGNIZE_RECEIPT: 'recognizeReceipt',
  CREATE_ASSET_ACCOUNT: 'createAssetAccount',
  GET_ASSET_ACCOUNTS: 'getAssetAccounts',
  UPDATE_ASSET_ACCOUNT: 'updateAssetAccount',
  DELETE_ASSET_ACCOUNT: 'deleteAssetAccount',
  ADJUST_ACCOUNT_BALANCE: 'adjustAccountBalance',
  TRANSFER_BETWEEN_ACCOUNTS: 'transferBetweenAccounts',
  CREATE_INVESTMENT_HOLDING: 'createInvestmentHolding',
  UPDATE_INVESTMENT_HOLDING: 'updateInvestmentHolding',
  DELETE_INVESTMENT_HOLDING: 'deleteInvestmentHolding',
  INVESTMENT_TRANSACTION: 'investmentTransaction',
  CREATE_MEAL: 'createMeal',
  UPDATE_MEAL: 'updateMeal',
  DELETE_MEAL: 'deleteMeal',
  GET_MEALS_BY_DATE: 'getMealsByDate',
  GET_MEAL: 'getMeal',
  GET_HEALTH_PROFILE: 'getHealthProfile',
  UPSERT_HEALTH_PROFILE: 'upsertHealthProfile',
  GET_DAILY_HEALTH_SNAPSHOT: 'getDailyHealthSnapshot',
  SET_EXERCISE_CALORIES: 'setExerciseCalories',
  GET_WEEKLY_HEALTH: 'getWeeklyHealth',
  CRON_DAILY_SETTLEMENT: 'cronDailySettlement',
  ADD_MEMBER: 'addMember',
  UPDATE_MEMBER: 'updateMember',
  REMOVE_MEMBER: 'removeMember',
  LINK_MEMBER: 'linkMember',
  UNLINK_MEMBER: 'unlinkMember',
  GET_MEMBERS: 'getMembers',
  GET_LEDGER_MEMBERS: 'getLedgerMembers'
})

export class SparejarApiError extends Error {
  /**
   * @param {string} message
   * @param {number} [code]
   * @param {string} [action]
   */
  constructor(message, code = 500, action = '') {
    super(message)
    this.name = 'SparejarApiError'
    this.code = code
    this.action = action
  }
}

/**
 * @param {unknown} err
 * @returns {err is SparejarApiError}
 */
export function isSparejarApiError(err) {
  return err instanceof SparejarApiError
}

/**
 * @param {unknown} res
 * @returns {res is { result: SparejarCloudResult }}
 */
function hasCloudResult(res) {
  return !!res && typeof res === 'object' && 'result' in res
}

/**
 * 调用 sparejar-finance 并返回完整云函数结果体
 * @param {string} action
 * @param {Record<string, unknown>} [data]
 * @returns {Promise<SparejarCloudResult>}
 */
export async function callSparejarRaw(action, data = {}) {
  let res
  try {
    res = await uniCloud.callFunction({
      name: CLOUD_FUNCTION_NAME,
      data: { action, data }
    })
  } catch (err) {
    const message = err && typeof err === 'object' && 'message' in err
      ? String(err.message)
      : 'cloud function call failed'
    throw new SparejarApiError(message, 502, action)
  }

  if (res && typeof res === 'object' && 'errCode' in res && res.errCode !== 0) {
    throw new SparejarApiError(
      String(res.errMsg || 'cloud transport error'),
      Number(res.errCode) || 502,
      action
    )
  }

  if (!hasCloudResult(res)) {
    throw new SparejarApiError('invalid cloud function response', 502, action)
  }

  // 静默续期：透明落地云函数回传的新 token（若有）
  persistRefreshedToken(res.result)

  return res.result
}

/**
 * 调用 sparejar-finance，业务成功时返回 result.data
 * @template T
 * @param {string} action
 * @param {Record<string, unknown>} [data]
 * @returns {Promise<T>}
 */
export async function callSparejar(action, data = {}) {
  const result = await callSparejarRaw(action, data)
  if (result.code !== 0) {
    throw new SparejarApiError(result.message || 'request failed', result.code, action)
  }
  return /** @type {T} */ (result.data)
}

/** @param {Record<string, unknown>} [profile] */
export function initUser(profile = {}) {
  return callSparejar(ACTIONS.INIT_USER, profile)
}

/** @param {Record<string, unknown>} payload */
export function createTransaction(payload) {
  return callSparejar(ACTIONS.CREATE_TRANSACTION, payload)
}

/** @param {string} transactionId */
export function deleteTransaction(transactionId) {
  return callSparejar(ACTIONS.DELETE_TRANSACTION, { transaction_id: transactionId })
}

/**
 * @param {string} transactionId
 * @param {Record<string, unknown>} payload 可包含 type/amount/category_id/ledger_id/account_id/note/transaction_at/date_key/include_in_daily_limit/include_in_challenge 等
 */
export function updateTransaction(transactionId, payload) {
  return callSparejar(ACTIONS.UPDATE_TRANSACTION, { transaction_id: transactionId, ...payload })
}

/**
 * 创建自定义账本。created_at/updated_at 由服务端自动填充，前端无需传时间。
 * @param {{ name: string, icon?: string, cover?: string, desc?: string, monthly_budget?: number, sort_order?: number, theme_color?: string }} payload
 */
export function createLedger(payload) {
  return callSparejar(ACTIONS.CREATE_LEDGER, payload)
}

/**
 * 更新账本。updated_at 由服务端自动刷新，前端无需传时间。
 * @param {string} ledgerId
 * @param {{ name?: string, icon?: string, cover?: string, desc?: string, monthly_budget?: number, sort_order?: number }} patch
 */
export function updateLedger(ledgerId, patch) {
  return callSparejar(ACTIONS.UPDATE_LEDGER, { ledger_id: ledgerId, ...patch })
}

/**
 * @param {string} ledgerId
 * @param {'transfer'|'purge'} [mode] transfer=交易转移至总账本；purge=交易一并软删
 */
export function deleteLedger(ledgerId, mode = 'transfer') {
  return callSparejar(ACTIONS.DELETE_LEDGER, { ledger_id: ledgerId, mode })
}

/**
 * 设置账本收藏状态（云端同步）。favorite=true 创建收藏记录，false 删除收藏记录。
 * @param {string} ledgerId
 * @param {boolean} favorite
 * @returns {Promise<{ favorited: boolean, favorite_id: string|null }>}
 */
export function setFavoriteLedger(ledgerId, favorite) {
  return callSparejar(ACTIONS.SET_FAVORITE_LEDGER, { ledger_id: ledgerId, favorite })
}

export function ensureMasterLedger() {
  return callSparejar(ACTIONS.ENSURE_MASTER_LEDGER, {})
}

// ===== 只读查询封装（前端统一经云函数读取，禁止 clientDB 直读） =====

/** 当前用户全部有效账本（已按 sort_order 升序） */
export function listLedgers() {
  return callSparejar(ACTIONS.LIST_LEDGERS, {})
}

/** 账本详情：账本信息 + 该用户全部交易 */
export function getLedgerDetail(ledgerId) {
  return callSparejar(ACTIONS.GET_LEDGER_DETAIL, { ledger_id: ledgerId })
}

// ===== 成员管理（用户级全局成员 + 账本多对多关联） =====

/**
 * 新增全局成员（自定义联系人）。本人由后端自动维护，无需前端创建。
 * @param {{nickname:string, avatar?:string, bio?:string, relation?:string}} payload
 */
export function addMember(payload) {
  return callSparejar(ACTIONS.ADD_MEMBER, { payload })
}

/**
 * 更新成员资料
 * @param {string} memberId members._id
 * @param {{nickname?:string, avatar?:string, bio?:string, relation?:string}} payload
 */
export function updateMember(memberId, payload) {
  return callSparejar(ACTIONS.UPDATE_MEMBER, { member_id: memberId, payload })
}

/** 删除成员（本人不可删） */
export function removeMember(memberId) {
  return callSparejar(ACTIONS.REMOVE_MEMBER, { member_id: memberId })
}

/** 将全局成员关联到指定账本 */
export function linkMember(memberId, ledgerId) {
  return callSparejar(ACTIONS.LINK_MEMBER, { member_id: memberId, ledger_id: ledgerId })
}

/** 取消成员与账本的关联（不删除成员本身） */
export function unlinkMember(memberId, ledgerId) {
  return callSparejar(ACTIONS.UNLINK_MEMBER, { member_id: memberId, ledger_id: ledgerId })
}

/** 取用户全部成员（供成员管理器列表） */
export function getMembers() {
  return callSparejar(ACTIONS.GET_MEMBERS, {})
}

/** 取账本已关联成员（供记账/筛选） */
export function getLedgerMembers(ledgerId) {
  return callSparejar(ACTIONS.GET_LEDGER_MEMBERS, { ledger_id: ledgerId })
}

/** 获取单笔交易（编辑 / 退款关联） */
export function getTransaction(transactionId) {
  return callSparejar(ACTIONS.GET_TRANSACTION, { transaction_id: transactionId })
}

/** 查询交易列表。opts: { type?, date_key?, include_deleted?, limit?, orderBy?, orderDir? } */
export function listTransactions(opts = {}) {
  return callSparejar(ACTIONS.LIST_TRANSACTIONS, opts)
}

/** 账户余额变动流水 */
export function listAccountBalanceLogs(accountId, limit = 40) {
  return callSparejar(ACTIONS.LIST_ACCOUNT_BALANCE_LOGS, { account_id: accountId, limit })
}

/** 首页仪表盘数据：当日交易 + 昨日结算 */
export function getDashboard(dateKey) {
  return callSparejar(ACTIONS.GET_DASHBOARD, { date_key: dateKey })
}

/** 通用单文档读取（user_settings / user_streaks / surplus_pools / savings_pools 等） */
export function getDoc(collection) {
  return callSparejar(ACTIONS.GET_DOC, { collection })
}

/** 限额历史（按日期倒序） */
export function getLimitHistory(opts = {}) {
  return callSparejar(ACTIONS.GET_LIMIT_HISTORY, opts)
}

/** @param {string} dateKey */
export function recalculateSettlement(dateKey) {
  return callSparejar(ACTIONS.RECALCULATE_SETTLEMENT, { date_key: dateKey })
}

/**
 * @param {string} [dateKey]
 * @param {Record<string, unknown>} [options]
 */
export function runDailySettlement(dateKey, options = {}) {
  return callSparejar(ACTIONS.RUN_DAILY_SETTLEMENT, {
    ...(dateKey ? { date_key: dateKey } : {}),
    ...options
  })
}

/**
 * @param {string} dateKey
 * @param {unknown[] | null} [items]
 * @param {boolean} [isAuto]
 */
export function allocateSurplus(dateKey, items = null, isAuto = false) {
  return callSparejar(ACTIONS.ALLOCATE_SURPLUS, {
    date_key: dateKey,
    ...(items ? { items } : {}),
    is_auto: isAuto
  })
}

/**
 * 确认/转走次日待滚入结余（24h 选择窗口）。
 * @param {'confirm'|'other'} decision confirm=保持滚入次日限额；other=转入目标
 * @param {Object} [opts] { target_type, wish_id }
 */
export function confirmSurplusRollover(decision, opts = {}) {
  return callSparejar(ACTIONS.CONFIRM_SURPLUS_ROLLOVER, {
    decision,
    opts
  })
}

/** @param {Record<string, unknown>} payload */
export function applySurplusPoolChange(payload) {
  return callSparejar(ACTIONS.APPLY_SURPLUS_POOL_CHANGE, payload)
}

/** @param {Record<string, unknown>} payload */
export function applySavingsPoolChange(payload) {
  return callSparejar(ACTIONS.APPLY_SAVINGS_POOL_CHANGE, payload)
}

/** @param {Record<string, unknown>} payload */
export function applyWishFundChange(payload) {
  return callSparejar(ACTIONS.APPLY_WISH_FUND_CHANGE, payload)
}

/** @param {Record<string, unknown>} payload */
export function applyAccountBalanceChange(payload) {
  return callSparejar(ACTIONS.APPLY_ACCOUNT_BALANCE_CHANGE, payload)
}

/** @param {Record<string, unknown>} [options] 定时任务/管理端用 */
export function cronDailySettlement(options = {}) {
  return callSparejar(ACTIONS.CRON_DAILY_SETTLEMENT, options)
}

/**
 * @param {{ type?: 'expense'|'income', include_hidden?: boolean }} [opts]
 */
export function listCategories(opts = {}) {
  return callSparejar(ACTIONS.LIST_CATEGORIES, {
    ...(opts.type ? { type: opts.type } : {}),
    include_hidden: !!opts.include_hidden
  })
}

/**
 * @param {{ type: 'expense'|'income', name: string, icon?: string, group?: string }} payload
 */
export function createCategory(payload) {
  return callSparejar(ACTIONS.CREATE_CATEGORY, payload)
}

/**
 * @param {string} categoryId
 * @param {{ name?: string, icon?: string, group?: string, is_hidden?: boolean, sort_order?: number }} payload
 */
export function updateCategory(categoryId, payload) {
  return callSparejar(ACTIONS.UPDATE_CATEGORY, { category_id: categoryId, ...payload })
}

/**
 * @param {string} categoryId
 * @param {string|null} [mergeToId] 有关联账目时必填合并目标分类 id
 */
export function deleteCategory(categoryId, mergeToId = null) {
  return callSparejar(ACTIONS.DELETE_CATEGORY, { category_id: categoryId, merge_to_id: mergeToId || null })
}

/**
 * @param {'expense'|'income'} type
 * @param {string} group 二级分组码
 * @param {string[]} orderedIds 该分组内自定义分类的期望顺序
 */
export function reorderCategories(type, group, orderedIds) {
  return callSparejar(ACTIONS.REORDER_CATEGORIES, { type, group, ordered_ids: orderedIds })
}

/**
 * 更新用户个性化设置（白名单字段，见 sparejar-db SETTINGS_WRITABLE）。
 * @param {Record<string, unknown>} patch
 */
export function updateSettings(patch) {
  return callSparejar(ACTIONS.UPDATE_SETTINGS, patch)
}

/** 列出用户心愿目标（按进度降序，未归档）。 */
export function listWishes() {
  return callSparejar(ACTIONS.LIST_WISHES, {})
}

/** 创建心愿目标。payload 中金额为「分」。 */
export function createWish(payload) {
  return callSparejar(ACTIONS.CREATE_WISH, payload)
}

/** 更新心愿（名称/目标/截止/封面）。 */
export function updateWish(wishId, patch) {
  return callSparejar(ACTIONS.UPDATE_WISH, { wish_id: wishId, ...patch })
}

/** 达成归档心愿。 */
export function archiveWish(wishId) {
  return callSparejar(ACTIONS.ARCHIVE_WISH, { wish_id: wishId })
}

/** 读取单个心愿的攒钱流水。 */
export function listWishFundLogs(wishId) {
  return callSparejar(ACTIONS.LIST_WISH_FUND_LOGS, { wish_id: wishId })
}

/** 读取结余分配历史。 */
export function listSurplusAllocations() {
  return callSparejar(ACTIONS.LIST_SURPLUS_ALLOCATIONS, {})
}

/** 获取待分配的当日结余。 */
export function getPendingAllocation() {
  return callSparejar(ACTIONS.GET_PENDING_ALLOCATION, {})
}

/** 读取挑战中心汇总数据（连续天数/今日/月/年挑战/7日热力图）。 */
export function getChallengeSummary() {
  return callSparejar(ACTIONS.GET_CHALLENGE_SUMMARY, {})
}

/**
 * 设置月/年挑战目标。amount 为「分」。
 * @param {'monthly'|'yearly'} type
 * @param {string} periodKey
 * @param {number} targetAmount
 * @param {string} [ledgerId]
 */
export function setChallengeTarget(type, periodKey, targetAmount, ledgerId) {
  return callSparejar(ACTIONS.SET_CHALLENGE_TARGET, { type, period_key: periodKey, target_amount: targetAmount, ledger_id: ledgerId })
}

/** 读取成就定义并合并用户解锁状态。 */
export function getAchievements() {
  return callSparejar(ACTIONS.GET_ACHIEVEMENTS, {})
}

/** 根据当前状态自动评估并解锁符合条件的成就，返回本次新解锁列表。 */
export function evaluateAchievements() {
  return callSparejar(ACTIONS.EVALUATE_ACHIEVEMENTS, {})
}

/**
 * 更新引导进度/完成状态。
 * @param {number} [step] 0-4
 * @param {boolean} [done]
 */
export function updateOnboarding(step, done) {
  return callSparejar(ACTIONS.UPDATE_ONBOARDING, { step, done })
}

/** 记录用户订阅授权。type: over_limit | daily_surplus | streak_risk */
export function recordSubscribeAuth(type) {
  return callSparejar(ACTIONS.RECORD_SUBSCRIBE_AUTH, { type })
}

/**
 * 发送微信订阅消息（服务端频控 + 微信下发）。
 * @param {'over_limit'|'daily_surplus'|'streak_risk'} type
 * @param {{data?: object, page?: string}} payload
 */
export function sendSubscribeMessage(type, payload = {}) {
  return callSparejar(ACTIONS.SEND_SUBSCRIBE_MESSAGE, { type, payload })
}

// ===== 商品贴纸体系（阶段 8） =====

/** 查询贴纸列表。opts: { type?: 'stock'|'material' } */
export function getStickers(opts = {}) {
  return callSparejar(ACTIONS.GET_STICKERS, { opts })
}

/** 新建贴纸。data 见后端 createSticker。 */
export function createSticker(data) {
  return callSparejar(ACTIONS.CREATE_STICKER, data)
}

/** 更新贴纸。data 含 sticker_id 及可改字段。 */
export function updateSticker(data) {
  return callSparejar(ACTIONS.UPDATE_STICKER, data)
}

/** 软删贴纸。 */
export function deleteSticker(stickerId) {
  return callSparejar(ACTIONS.DELETE_STICKER, { sticker_id: stickerId })
}

/** 囤货消耗记账。qty 默认 1。 */
export function consumeSticker(stickerId, qty) {
  return callSparejar(ACTIONS.CONSUME_STICKER, { sticker_id: stickerId, qty })
}

// ===== 拍照 OCR 识别记账（阶段 9） =====

/**
 * 小票/截图 OCR 识别。
 * @param {string} imageUrl 已上传到云存储的图片 URL
 * @returns {Promise<{ success: boolean, reason?: string, provider?: string, raw_text?: string, recognized_amount?: number, merchant?: string, recognized_date?: string, confidence?: number, image_url?: string, suggested_category_id?: string|null }>}
 */
export function recognizeReceipt(imageUrl) {
  return callSparejar(ACTIONS.RECOGNIZE_RECEIPT, { image_url: imageUrl })
}

// ===== 阶段 10：资产账户体系 =====

/** 新建资产账户。data 见后端 createAssetAccount（金额「分」）。 */
export function createAssetAccount(data) {
  return callSparejar(ACTIONS.CREATE_ASSET_ACCOUNT, data)
}

/** 查询资产账户 + 汇总（含投资持仓）。 */
export function getAssetAccounts() {
  return callSparejar(ACTIONS.GET_ASSET_ACCOUNTS, {})
}

/** 更新账户可编辑字段。 */
export function updateAssetAccount(data) {
  return callSparejar(ACTIONS.UPDATE_ASSET_ACCOUNT, data)
}

/** 软删账户。 */
export function deleteAssetAccount(accountId) {
  return callSparejar(ACTIONS.DELETE_ASSET_ACCOUNT, { account_id: accountId })
}

/** 直接改余额（生成调账流水）。newBalance 为目标余额「分」。 */
export function adjustAccountBalance(accountId, newBalance, note = '') {
  return callSparejar(ACTIONS.ADJUST_ACCOUNT_BALANCE, { account_id: accountId, new_balance: newBalance, note })
}

/** 账户间转账（此消彼长）。amount 为「分」。 */
export function transferBetweenAccounts(fromId, toId, amount, note = '') {
  return callSparejar(ACTIONS.TRANSFER_BETWEEN_ACCOUNTS, { from_id: fromId, to_id: toId, amount, note })
}

/** 新建投资持仓。 */
export function createInvestmentHolding(data) {
  return callSparejar(ACTIONS.CREATE_INVESTMENT_HOLDING, data)
}

/** 更新持仓（份额/单价/市值/成本）。 */
export function updateInvestmentHolding(data) {
  return callSparejar(ACTIONS.UPDATE_INVESTMENT_HOLDING, data)
}

/** 软删持仓。 */
export function deleteInvestmentHolding(holdingId) {
  return callSparejar(ACTIONS.DELETE_INVESTMENT_HOLDING, { holding_id: holdingId })
}

/** 投资交易：买入/定投/卖出/分红。amount 为「分」。 */
export function investmentTransaction(data) {
  return callSparejar(ACTIONS.INVESTMENT_TRANSACTION, data)
}

// ===== 阶段 11：餐次与热量轻追踪 =====

/** 新建餐次（同时创建餐饮交易 + 餐次 + 食物项）。amount 为「分」。 */
export function createMeal(data) {
  return callSparejar(ACTIONS.CREATE_MEAL, data)
}

/** 更新餐次（交易字段 + 食物项整体替换）。 */
export function updateMeal(data) {
  return callSparejar(ACTIONS.UPDATE_MEAL, data)
}

/** 删除餐次（含关联交易软删）。 */
export function deleteMeal(mealId) {
  return callSparejar(ACTIONS.DELETE_MEAL, { meal_id: mealId })
}

/** 查询某日餐次列表（含食物项与交易）。 */
export function getMealsByDate(dateKey) {
  return callSparejar(ACTIONS.GET_MEALS_BY_DATE, { date_key: dateKey })
}

/** 查询单个餐次（含食物项与交易）。 */
export function getMeal(mealId) {
  return callSparejar(ACTIONS.GET_MEAL, { meal_id: mealId })
}

/** 读取健康档案。 */
export function getHealthProfile() {
  return callSparejar(ACTIONS.GET_HEALTH_PROFILE, {})
}

/** 保存/测算健康档案（BMR/TDEE 自动 + 手动覆盖）。 */
export function upsertHealthProfile(data) {
  return callSparejar(ACTIONS.UPSERT_HEALTH_PROFILE, data)
}

/** 读取/重建某日热量快照。 */
export function getDailyHealthSnapshot(dateKey) {
  return callSparejar(ACTIONS.GET_DAILY_HEALTH_SNAPSHOT, { date_key: dateKey })
}

/** 设置当日运动消耗（kcal）。 */
export function setExerciseCalories(dateKey, exercise) {
  return callSparejar(ACTIONS.SET_EXERCISE_CALORIES, { date_key: dateKey, exercise })
}

/** 近 7 日热量快照。 */
export function getWeeklyHealth(endDateKey) {
  return callSparejar(ACTIONS.GET_WEEKLY_HEALTH, { end_date_key: endDateKey })
}

/** 心愿手动虚拟存入。amount 为「分」。 */
export function depositWishManual(wishId, amount) {
  return callSparejar(ACTIONS.DEPOSIT_WISH_MANUAL, { wish_id: wishId, amount })
}

/** 从累计结余池转入心愿。amount 为「分」。 */
export function depositWishFromSurplus(wishId, amount) {
  return callSparejar(ACTIONS.DEPOSIT_WISH_FROM_SURPLUS, { wish_id: wishId, amount })
}

/** 从通用存款池转入心愿。amount 为「分」。 */
export function depositWishFromSavings(wishId, amount) {
  return callSparejar(ACTIONS.DEPOSIT_WISH_FROM_SAVINGS, { wish_id: wishId, amount })
}

/** 心愿取出退回累计结余池。amount 为「分」。 */
export function withdrawWishToSurplus(wishId, amount) {
  return callSparejar(ACTIONS.WITHDRAW_WISH_TO_SURPLUS, { wish_id: wishId, amount })
}

/** 通用存款池手动存入。amount 为「分」。 */
export function depositSavingsPool(amount, reason = 'manual') {
  return callSparejar(ACTIONS.DEPOSIT_SAVINGS_POOL, { amount, reason })
}

/** 通用存款池取出。amount 为「分」。 */
export function withdrawSavingsPool(amount, reason = 'manual') {
  return callSparejar(ACTIONS.WITHDRAW_SAVINGS_POOL, { amount, reason })
}

export default {
  CLOUD_FUNCTION_NAME,
  ACTIONS,
  SparejarApiError,
  isSparejarApiError,
  callSparejar,
  callSparejarRaw,
  initUser,
  createTransaction,
  deleteTransaction,
  updateTransaction,
  createLedger,
  updateLedger,
  deleteLedger,
  ensureMasterLedger,
  listLedgers,
  getLedgerDetail,
  getTransaction,
  listTransactions,
  listAccountBalanceLogs,
  getDashboard,
  getDoc,
  recalculateSettlement,
  runDailySettlement,
  allocateSurplus,
  confirmSurplusRollover,
  applySurplusPoolChange,
  applySavingsPoolChange,
  applyWishFundChange,
  applyAccountBalanceChange,
  cronDailySettlement,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  updateSettings,
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
  getMeal,
  getHealthProfile,
  upsertHealthProfile,
  getDailyHealthSnapshot,
  setExerciseCalories,
  getWeeklyHealth
}
