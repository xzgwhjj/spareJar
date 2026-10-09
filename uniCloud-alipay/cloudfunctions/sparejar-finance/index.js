'use strict'

const dbApi = require('sparejar-db')
const uniID = require('uni-id-common')

function getUid(event, context) {
  // event.user_id：常规 action 由 token 校验后注入；调试 case 跳过鉴权，前端直接放在 event.data.user_id
  const dataUid = event.data && event.data.user_id
  return event.user_id || dataUid || context.CLIENTINFO && context.CLIENTINFO.uid || context.auth && context.auth.uid
}

function fail(message, code = 400) {
  return { code, message }
}

exports.main = async (event, context) => {
  const { action, data = {} } = event

  // 本次请求若触发 token 静默续期，则在此暂存新 token，随业务响应回传客户端
  let refreshedAuth = null

  // 定时任务走内部调度，跳过 token 鉴权
  const NO_AUTH_ACTIONS = new Set(['cronDailySettlement', 'cronPurgeOldLimitHistory'])
  if (!NO_AUTH_ACTIONS.has(action)) {
    const uniIdIns = uniID.createInstance({ context })
    const tokenRes = await uniIdIns.checkToken(event.uniIdToken)
    if (tokenRes.errCode !== 0) {
      return fail('unauthorized', 401)
    }
    // 将校验出的 uid（即 openid）注入 event，供 getUid 使用
    event.user_id = tokenRes.uid
    // checkToken 在 token 进入过期阈值（tokenExpiresThreshold）内时会自动签发新 token，
    // 仅在续期发生时返回值才带 token 字段；捕获后随响应下发以实现前端无感续期。
    if (tokenRes.token && tokenRes.token !== event.uniIdToken) {
      refreshedAuth = { token: tokenRes.token, tokenExpired: tokenRes.tokenExpired }
    }
  }

  // 业务成功响应；若本次触发了续期，则一并回传 newToken/newTokenExpired
  const ok = (data) => {
    const res = { code: 0, message: 'ok', data }
    if (refreshedAuth) {
      res.newToken = refreshedAuth.token
      res.newTokenExpired = refreshedAuth.tokenExpired
    }
    return res
  }

  const userId = getUid(event, context)

  if (!userId && !NO_AUTH_ACTIONS.has(action)) {
    return fail('unauthorized', 401)
  }

  try {
    switch (action) {
      case 'initUser':
        return ok(await dbApi.initUser(userId, data))

      case 'ensureMasterLedger':
        return ok(await dbApi.ensureMasterLedger(userId))

      case 'createLedger':
        if (!data.name) return fail('name is required')
        return ok(await dbApi.createLedger(userId, data))

      case 'updateLedger':
        if (!data.ledger_id) return fail('ledger_id is required')
        return ok(await dbApi.updateLedger(userId, data.ledger_id, data))

      case 'createTransaction':
        if (!data.ledger_id || !data.type || !data.amount) {
          return fail('ledger_id, type and amount are required')
        }
        return ok(await dbApi.createTransaction(userId, data))

      case 'deleteTransaction':
        if (!data.transaction_id) return fail('transaction_id is required')
        return ok(await dbApi.softDeleteTransaction(userId, data.transaction_id))

      case 'updateTransaction':
        if (!data.transaction_id) return fail('transaction_id is required')
        return ok(await dbApi.updateTransaction(userId, data.transaction_id, data))

      case 'deleteLedger':
        if (!data.ledger_id) return fail('ledger_id is required')
        return ok(await dbApi.deleteLedger(userId, data.ledger_id, data.mode || 'transfer'))

      case 'setFavoriteLedger':
        if (!data.ledger_id || typeof data.favorite !== 'boolean') {
          return fail('ledger_id and favorite are required')
        }
        return ok(await dbApi.setFavoriteLedger(userId, data.ledger_id, data.favorite))

      case 'listCategories':
        return ok(await dbApi.listCategories(userId, {
          type: data.type,
          includeHidden: !!data.include_hidden
        }))

      case 'createCategory':
        if (!data.type || !data.name) return fail('type and name are required')
        return ok(await dbApi.createCategory(userId, data))

      case 'updateCategory':
        if (!data.category_id) return fail('category_id is required')
        return ok(await dbApi.updateCategory(userId, data.category_id, data))

      case 'deleteCategory':
        if (!data.category_id) return fail('category_id is required')
        return ok(await dbApi.deleteCategory(
          userId,
          data.category_id,
          data.merge_to_id || null,
          { mode: data.mode === 'keep' || data.mode === 'purge' ? data.mode : 'merge' }
        ))

      case 'reorderCategories':
        if (!data.type || !Array.isArray(data.ordered_ids)) {
          return fail('type and ordered_ids are required')
        }
        return ok(await dbApi.reorderCategories(userId, data.type, data.ordered_ids))

      case 'updateSettings':
        if (!data || typeof data !== 'object') return fail('patch is required')
        return ok(await dbApi.updateUserSettings(userId, data))

      case 'saveBudgetPlan':
        if (!data || !data.dim) return fail('dim required')
        return ok(await dbApi.saveBudgetPlan(userId, data))

      case 'getBudgetChangeLog':
        return ok(await dbApi.getBudgetChangeLog(userId, data || {}))

      case 'terminatePendingBudget':
        if (!data || !data.dim) return fail('dim required')
        return ok(await dbApi.terminatePendingBudget(userId, data.dim))

      case 'updateUser':
        if (!data || typeof data !== 'object') return fail('patch is required')
        return ok(await dbApi.updateUser(userId, data))

      case 'listWishes':
        return ok(await dbApi.listWishes(userId))

      case 'createWish':
        if (!data.name || !data.target_amount) return fail('name and target_amount are required')
        return ok(await dbApi.createWish(userId, data))

      case 'updateWish':
        if (!data.wish_id) return fail('wish_id is required')
        return ok(await dbApi.updateWish(userId, data.wish_id, data))

      case 'archiveWish':
        if (!data.wish_id) return fail('wish_id is required')
        return ok(await dbApi.archiveWish(userId, data.wish_id))

      case 'advanceWishPhase':
        if (!data.wish_id) return fail('wish_id is required')
        return ok(await dbApi.advanceWishPhase(userId, data.wish_id, data))

      case 'deleteWish':
        if (!data.wish_id) return fail('wish_id is required')
        return ok(await dbApi.deleteWish(userId, data.wish_id))

      case 'listArchivedWishes':
        return ok(await dbApi.listArchivedWishes(userId, data.reason_filter))

      case 'listWishFundLogs':
        if (!data.wish_id) return fail('wish_id is required')
        return ok(await dbApi.listWishFundLogs(userId, data.wish_id))

      case 'listSavingsPoolLogs':
        return ok(await dbApi.listSavingsPoolLogs(userId))

      case 'listSurplusAllocations':
        return ok(await dbApi.listSurplusAllocations(userId))

      case 'getPendingAllocation':
        return ok(await dbApi.getPendingAllocation(userId))

      case 'getChallengeSummary':
        return ok(await dbApi.getChallengeSummary(userId))

      case 'getLimitStatus':
        if (!data.dim || !data.key) {
          return fail('dim and key are required')
        }
        return ok(await dbApi.getLimitStatus(userId, data.dim, data.key))

      case 'getLimitPreviewSpend':
        return ok(await dbApi.getLimitPreviewSpend(userId, data.date_key))

      case 'setChallengeTarget':
        if (!data.type || !data.period_key || !data.target_amount) {
          return fail('type, period_key and target_amount are required')
        }
        return ok(await dbApi.setChallengeTarget(userId, data.type, data.period_key, data.target_amount, data.ledger_id))

      case 'syncPeriodTargets':
        // 同步当前年（或指定年）月/年挑战目标上限到 challenge_records
        return ok(await dbApi.syncPeriodTargets(userId, { year: data.year }))

      case 'getAchievements':
        return ok(await dbApi.getAchievements(userId))

      case 'evaluateAchievements':
        return ok({ unlocked: await dbApi.evaluateAndUnlockAchievements(userId) })

      case 'updateOnboarding':
        if (typeof data.step !== 'number' && typeof data.done !== 'boolean') {
          return fail('step or done is required')
        }
        return ok(await dbApi.updateOnboarding(userId, data.step, data.done))

      case 'recordSubscribeAuth':
        if (!data.type) return fail('type is required')
        return ok(await dbApi.recordSubscribeAuth(userId, data.type))

      case 'sendSubscribeMessage':
        if (!data.type) return fail('type is required')
        return ok(await dbApi.sendSubscribeMessage(userId, data.type, data.payload || {}))

      // ===== 商品贴纸体系（阶段 8） =====
      case 'getStickers':
        return ok({ stickers: await dbApi.getStickers(userId, data.opts || {}) })

      case 'createSticker':
        if (!data.type) return fail('type is required')
        return ok(await dbApi.createSticker(userId, data))

      case 'updateSticker':
        if (!data.sticker_id) return fail('sticker_id is required')
        return ok(await dbApi.updateSticker(userId, data.sticker_id, data))

      case 'deleteSticker':
        if (!data.sticker_id) return fail('sticker_id is required')
        return ok(await dbApi.deleteSticker(userId, data.sticker_id))

      case 'consumeSticker':
        if (!data.sticker_id) return fail('sticker_id is required')
        return ok(await dbApi.consumeSticker(userId, data.sticker_id, data.qty))

      // ===== 积分体系（签到/组合贴纸，阶段 9） =====
      case 'combineSticker':
        return ok(await dbApi.combineSticker(userId, data))
        break

      case 'decrementStock':
        if (!data.sticker_id) return fail('sticker_id is required')
        return ok(await dbApi.decrementStock(userId, data.sticker_id, data.qty))
        break

      case 'checkIn':
        return ok(await dbApi.checkIn(userId))
        break

      case 'getUserPoints':
        return ok(await dbApi.getUserPoints(userId))
        break

      case 'recalculateSettlement':
        // 缺省按今天重算（与 runDailySettlement 一致）；前端看板刷新即无参调用以重算今日。
        return ok(await dbApi.recalculateDailySettlement(userId, data.date_key || dbApi.formatDateKey()))

      case 'runDailySettlement':
        return ok(await dbApi.runDailySettlement(userId, data.date_key || dbApi.formatDateKey(), data))

      case 'rollbackTodaySettlement':
        return ok(await dbApi.rollbackTodaySettlement(userId))

      case 'ensureUserSettings':
        return ok(await dbApi.ensureUserSettings(userId))

      case 'allocateSurplus':
        if (!data.date_key) return fail('date_key is required')
        return ok(await dbApi.allocateSurplus(userId, data.date_key, data.items, !!data.is_auto))

      case 'confirmSurplusRollover':
        if (!data.decision) return fail('decision is required')
        return ok(await dbApi.confirmSurplusRollover(userId, data.decision, data.opts || {}))

      case 'applySurplusPoolChange':
        return ok({
          balance: await dbApi.applySurplusPoolChange(
            userId,
            data.direction,
            data.amount,
            data.reason,
            data.refs || {}
          )
        })

      case 'applySavingsPoolChange':
        return ok({
          balance: await dbApi.applySavingsPoolChange(
            userId,
            data.direction,
            data.amount,
            data.reason,
            data.refs || {}
          )
        })

      case 'applyWishFundChange':
        if (!data.wish_id) return fail('wish_id is required')
        return ok({
          saved_after: await dbApi.applyWishFundChange(
            userId,
            data.wish_id,
            data.direction,
            data.amount,
            data.source,
            data.refs || {}
          )
        })

      case 'depositWishFromAccount':
        if (!data.wish_id || !data.amount || !data.account_id) return fail('wish_id, amount and account_id are required')
        return ok({ saved_after: await dbApi.depositWishFromAccount(userId, data.wish_id, data.amount, data.account_id, data.note) })

      case 'depositWishFromSurplus':
        if (!data.wish_id || !data.amount) return fail('wish_id and amount are required')
        return ok({ saved_after: await dbApi.depositWishFromSurplus(userId, data.wish_id, data.amount, data.note) })

      case 'depositWishFromSavings':
        if (!data.wish_id || !data.amount) return fail('wish_id and amount are required')
        return ok({ saved_after: await dbApi.depositWishFromSavings(userId, data.wish_id, data.amount, data.note) })

      case 'withdrawWishToSurplus':
        if (!data.wish_id || !data.amount) return fail('wish_id and amount are required')
        return ok({ saved_after: await dbApi.withdrawWishToSurplus(userId, data.wish_id, data.amount, data.note) })

      case 'withdrawWishToAccount':
        if (!data.wish_id || !data.amount || !data.account_id) return fail('wish_id, amount and account_id are required')
        return ok({ saved_after: await dbApi.withdrawWishToAccount(userId, data.wish_id, data.amount, data.account_id, data.note) })

      case 'withdrawWishToSavings':
        if (!data.wish_id || !data.amount) return fail('wish_id and amount are required')
        return ok({ saved_after: await dbApi.withdrawWishToSavings(userId, data.wish_id, data.amount, data.note) })

      case 'depositSavingsPool':
        if (!data.amount) return fail('amount is required')
        return ok({ balance: await dbApi.depositSavingsPool(userId, data.amount, data.reason || 'manual') })

      case 'withdrawSavingsPool':
        if (!data.amount) return fail('amount is required')
        return ok({ balance: await dbApi.withdrawSavingsPool(userId, data.amount, data.reason || 'manual') })

      case 'applyAccountBalanceChange':
        if (!data.account_id) return fail('account_id is required')
        return ok({
          balance: await dbApi.applyAccountBalanceChange(
            userId,
            data.account_id,
            data.amount_delta,
            data.change_type || 'adjust',
            data.refs || {}
          )
        })

      // ===== 阶段 10：资产账户体系 =====
      case 'createAssetAccount':
        if (!data.name) return fail('name is required')
        return ok(await dbApi.createAssetAccount(userId, data))

      case 'getAssetAccounts':
        return ok(await dbApi.getAssetAccounts(userId))

      case 'updateAssetAccount':
        if (!data.account_id) return fail('account_id is required')
        return ok(await dbApi.updateAssetAccount(userId, data.account_id, data))

      case 'deleteAssetAccount':
        if (!data.account_id) return fail('account_id is required')
        return ok(await dbApi.deleteAssetAccount(userId, data.account_id))

      case 'adjustAccountBalance':
        if (!data.account_id) return fail('account_id is required')
        return ok(await dbApi.adjustAccountBalance(userId, data.account_id, data.new_balance, data.note))

      case 'transferBetweenAccounts':
        if (!data.from_id || !data.to_id) return fail('from_id and to_id are required')
        return ok(await dbApi.transferBetweenAccounts(userId, data.from_id, data.to_id, data.amount, data.note))

      case 'createInvestmentHolding':
        if (!data.account_id || !data.name) return fail('account_id and name are required')
        return ok(await dbApi.createInvestmentHolding(userId, data))

      case 'updateInvestmentHolding':
        if (!data.holding_id) return fail('holding_id is required')
        return ok(await dbApi.updateInvestmentHolding(userId, data.holding_id, data))

      case 'deleteInvestmentHolding':
        if (!data.holding_id) return fail('holding_id is required')
        return ok(await dbApi.deleteInvestmentHolding(userId, data.holding_id))

      case 'investmentTransaction':
        if (!data.holding_id || !data.action || !data.source_account_id) return fail('holding_id, action and source_account_id are required')
        return ok(await dbApi.investmentTransaction(userId, data))

      // ===== 阶段 11：餐次与热量轻追踪 =====
      case 'createMeal':
        if (!data.amount || !data.meal_type) return fail('amount and meal_type are required')
        return ok(await dbApi.createMeal(userId, data))

      case 'updateMeal':
        if (!data.meal_id) return fail('meal_id is required')
        return ok(await dbApi.updateMeal(userId, data.meal_id, data))

      case 'deleteMeal':
        if (!data.meal_id) return fail('meal_id is required')
        return ok(await dbApi.deleteMeal(userId, data.meal_id))

      case 'getMealsByDate':
        return ok(await dbApi.getMealsByDate(userId, data.date_key))

      case 'getMeal':
        if (!data.meal_id) return fail('meal_id is required')
        return ok(await dbApi.getMeal(userId, data.meal_id))

      case 'getHealthProfile':
        return ok(await dbApi.getHealthProfile(userId))

      case 'upsertHealthProfile':
        return ok(await dbApi.upsertHealthProfile(userId, data))

      case 'getDailyHealthSnapshot':
        return ok(await dbApi.getDailyHealthSnapshot(userId, data.date_key))

      case 'setExerciseCalories':
        if (!data.date_key) return fail('date_key is required')
        return ok(await dbApi.setExerciseCalories(userId, data.date_key, data.exercise))

      case 'getWeeklyHealth':
        return ok(await dbApi.getWeeklyHealth(userId, data.end_date_key))

      // ===== 阶段 9：拍照 OCR 识别记账 =====
      case 'recognizeReceipt':
        if (!data.image_url) return fail('image_url is required')
        return ok(await dbApi.recognizeReceipt(userId, data))

      case 'recognizeAsset':
        if (!data.image_url) return fail('image_url is required')
        return ok(await dbApi.recognizeAsset(userId, data))

      case 'getLimitHistory':
        return ok(await dbApi.getLimitHistory(userId, {
          start_key: data.start_key,
          end_key: data.end_key,
          before_key: data.before_key,
          limit: data.limit
        }))

      // 超 3 年留存窗口的年度归档汇总（供前端在到顶后展示长期趋势）
      case 'getLimitHistoryYearly':
        return ok(await dbApi.getLimitHistoryYearly(userId))

      // 手动触发限额历史归档清理（日常由 cronDailySettlement 每月自动执行）
      case 'cronPurgeOldLimitHistory':
        return ok(await dbApi.purgeOldLimitHistory(data || {}))

      case 'cronDailySettlement': {
        const db = uniCloud.database()
        const dateKey = data.date_key || dbApi.formatDateKey(new Date(Date.now() - 86400000))
        const batchSize = data.batch_size || 100
        const usersRes = await db.collection('users').where({ deleted_at: db.command.eq(null) }).field({ user_id: true }).limit(batchSize).get()
        const results = []
        for (const u of usersRes.data || []) {
          try {
            const r = await dbApi.runDailySettlement(u.user_id, dateKey, { autoAllocate: true })
            results.push({ user_id: u.user_id, ...r })
          } catch (e) {
            results.push({ user_id: u.user_id, error: e.message })
          }
        }
        // 注销冷静期满自动硬删（按计划删除时间到期的 deleting 用户）
        try {
          const purge = await dbApi.purgeScheduledDeletions()
          if (purge && purge.purged && purge.purged.length) {
            results.push({ __purgeScheduledDeletions: purge })
          }
        } catch (e) {
          results.push({ __purgeScheduledDeletions: { error: e.message } })
        }
        // 限额历史超 3 年留存期：每月 1 号归档到 limit_history_yearly 并清理明细（幂等）
        if (new Date().getDate() === 1) {
          try {
            const purge = await dbApi.purgeOldLimitHistory()
            if (purge && purge.purged) results.push({ __purgeOldLimitHistory: purge })
          } catch (e) {
            results.push({ __purgeOldLimitHistory: { error: e.message } })
          }
        }
        return ok({ date_key: dateKey, results })
      }

      // ===== 只读查询（前端统一经云函数读取，禁止 clientDB 直读） =====
      case 'listLedgers':
        return ok(await dbApi.listLedgers(userId))

      case 'getSurplusPoolLogs':
        return ok(await dbApi.getSurplusPoolLogs(userId))

      // 越界补录排查 / 清理（一次性诊断用）：扫描 daily_settlements 中早于账号创建日的记录
      case 'auditPreAccountSettlements':
        return ok(await dbApi.auditPreAccountSettlements())

      case 'cleanPreAccountSettlements':
        return ok(await dbApi.cleanPreAccountSettlements(!!data.dryRun))

      case 'getLedgerDetail':
        if (!data.ledger_id) return fail('ledger_id is required')
        return ok(await dbApi.getLedgerWithTransactions(userId, data.ledger_id))

      case 'addMember':
        return ok(await dbApi.addMember(userId, data.payload || data))

      case 'updateMember':
        if (!data.member_id) return fail('member_id is required')
        return ok(await dbApi.updateMember(userId, data.member_id, data.payload || data))

      case 'removeMember':
        if (!data.member_id) return fail('member_id is required')
        return ok(await dbApi.removeMember(userId, data.member_id))

      case 'linkMember':
        if (!data.member_id || !data.ledger_id) return fail('member_id and ledger_id are required')
        return ok(await dbApi.linkMemberToLedger(userId, data.member_id, data.ledger_id))

      case 'unlinkMember':
        if (!data.member_id || !data.ledger_id) return fail('member_id and ledger_id are required')
        return ok(await dbApi.unlinkMemberFromLedger(userId, data.member_id, data.ledger_id))

      case 'getMembers':
        return ok(await dbApi.getMembersByUser(userId))

      case 'getLedgerMembers':
        if (!data.ledger_id) return fail('ledger_id is required')
        return ok(await dbApi.getLedgerMembers(userId, data.ledger_id))

      case 'getTransaction':
        if (!data.transaction_id) return fail('transaction_id is required')
        return ok(await dbApi.getTransaction(userId, data.transaction_id))

      case 'listTransactions':
        return ok(await dbApi.listTransactions(userId, data.opts || data))

      case 'listAccountBalanceLogs':
        if (!data.account_id) return fail('account_id is required')
        return ok(await dbApi.listAccountBalanceLogs(userId, data.account_id, data.limit || 40))

      case 'getDashboard':
        if (!data.date_key) return fail('date_key is required')
        return ok(await dbApi.getDashboard(userId, data.date_key))

      case 'getDoc':
        if (!data.collection) return fail('collection is required')
        return ok(await dbApi.getDoc(data.collection, userId))

      // 注销账号：硬删该用户全部个人数据（个保法合规）。仅本人 token 可触发（userId 取自校验后的 token）。
      case 'deleteAccount':
        return ok(await dbApi.deleteAccount(userId))

      // 申请注销（7 天冷静期，可撤销）：标记 deleting + 计划删除时间，暂不删数据
      case 'scheduleDeleteAccount':
        return ok(await dbApi.scheduleDeleteAccount(userId))

      // 撤销注销：冷静期内恢复账号
      case 'cancelDeleteAccount':
        return ok(await dbApi.cancelDeleteAccount(userId))

      // 导出用户全量数据（个保法第 45 条可携带权）
      case 'exportUserData':
        return ok(await dbApi.exportUserData(userId))

      // 删除用户上传的临时封面（客户端删除可能受权限/环境限制，服务端兜底）
      case 'deleteCover':
        if (!data.fileID) return fail('fileID is required')
        await uniCloud.deleteFile({ fileList: [data.fileID] })
        return ok()

      default:
        return fail(`unknown action: ${action}`, 404)
    }
  } catch (err) {
    console.error('[sparejar-finance]', action, err)
    return fail(err.message || 'internal error', 500)
  }
}
