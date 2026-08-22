'use strict'

// sparejar-db 数据访问层：按业务域拆分的 barrel 聚合。
// 对外 module.exports 签名与原单体 index.js 完全一致（无破坏性重构）。
// 子模块见 ./core ./utils ./domains ./queries。

const core_constants = require('./core/constants')
const utils_date = require('./utils/date')
const core_db = require('./core/db')
const utils_id = require('./utils/id')
const utils_money = require('./utils/money')
const domains_ledger = require('./domains/ledger')
const domains_wish = require('./domains/wish')
const domains_pool = require('./domains/pool')
const domains_challenge = require('./domains/challenge')
const domains_misc = require('./domains/misc')
const domains_category = require('./domains/category')
const domains_transaction = require('./domains/transaction')
const domains_sticker = require('./domains/sticker')
const domains_ocr = require('./domains/ocr')
const domains_asset = require('./domains/asset')
const domains_health = require('./domains/health')
const queries_dashboard = require('./queries/dashboard')

const __all = {
  core_constants,
  utils_date,
  core_db,
  utils_id,
  utils_money,
  domains_ledger,
  domains_wish,
  domains_pool,
  domains_challenge,
  domains_misc,
  domains_category,
  domains_transaction,
  domains_sticker,
  domains_ocr,
  domains_asset,
  domains_health,
  queries_dashboard,
}
const __merged = Object.assign({}, ...Object.values(__all))
const __wl = ["PRESET_EXPENSE_CATEGORIES","PRESET_INCOME_CATEGORIES","DEFAULT_LEDGER","formatDateKey","formatMonthKey","parseDateKey","nowTs","getDb","initUser","ensureMasterLedger","createLedger","updateLedger","applySurplusPoolChange","applySavingsPoolChange","applyWishFundChange","applyAccountBalanceChange","recalculateDailySettlement","runDailySettlement","allocateSurplus","confirmSurplusRollover","getSurplusPoolLogs","markRollOverLog","createTransaction","softDeleteTransaction","updateTransaction","deleteLedger","setFavoriteLedger","listCategories","createCategory","updateCategory","deleteCategory","reorderCategories","getEffectiveBaseLimit","updateUserSettings","listWishes","createWish","updateWish","archiveWish","advanceWishPhase","deleteWish","listArchivedWishes","expireOverdueWishes","listSavingsPoolLogs","listWishFundLogs","listSurplusAllocations","getPendingAllocation","depositWishFromAccount","depositWishFromSurplus","depositWishFromSavings","withdrawWishToSurplus","withdrawWishToAccount","withdrawWishToSavings","depositSavingsPool","withdrawSavingsPool","getChallengeSummary","getLimitStatus","setChallengeTarget","getAchievements","evaluateAndUnlockAchievements","updateOnboarding","recordSubscribeAuth","sendSubscribeMessage","getStickerById","createSticker","updateSticker","deleteSticker","getStickers","consumeSticker","getDocByUser","getDoc","listLedgers","getLedgerWithTransactions","addMember","updateMember","removeMember","linkMemberToLedger","unlinkMemberFromLedger","getMembersByUser","getLedgerMembers","ensureSelfMember","ensureSelfMemberLinkedToLedger","getTransaction","listTransactions","listAccountBalanceLogs","getDashboard","recognizeReceipt","createAssetAccount","getAssetAccounts","updateAssetAccount","deleteAssetAccount","adjustAccountBalance","transferBetweenAccounts","createInvestmentHolding","updateInvestmentHolding","deleteInvestmentHolding","investmentTransaction","getHealthProfile","upsertHealthProfile","recomputeDailyHealth","createMeal","updateMeal","deleteMeal","getMealsByDate","getMeal","getDailyHealthSnapshot","setExerciseCalories","getWeeklyHealth","getLimitHistory","syncPeriodTargets"]
module.exports = {}
for (const k of __wl) module.exports[k] = __merged[k]
