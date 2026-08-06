'use strict'

const db = require('../core/db')
const { getDocByUser, getDb, upsertByUnique, isDuplicateKeyError } = require('../core/db')
const { formatDateKey, parseDateKey, toStoredTime, nowTs } = require('../utils/date')
const money = require('../utils/money')
const ids = require('../utils/id')
const ledger = require('./ledger')
const wish = require('./wish')
const misc = require('./misc')
const category = require('./category')
const pool = require('./pool')

async function recalculateDailySettlement(userId, dateKey) {
  const db = getDb()
  const settings = await getDocByUser('user_settings', userId)
  const baseLimit = await category.getEffectiveBaseLimit(userId, dateKey)
  const surplusPoolDoc = await getDocByUser('surplus_pools', userId)
  const surplusPoolBalance = surplusPoolDoc ? surplusPoolDoc.balance || 0 : 0
  // 次日待滚入结余额（与 surplus_pools.balance 分离；滚入次日限额的临时额度）
  const pendingRollover = settings ? (settings.pending_rollover_fen || 0) : 0
  // 退款恢复当日可用额度：受 user_settings.refund_restore_limit 控制（默认开启）
  const refundRestore = settings ? settings.refund_restore_limit !== false : true
  const consumed = await category.sumDailyLimitExpenses(userId, dateKey, refundRestore, false)
  // 挑战口径消费：按 include_in_challenge 过滤，退款始终冲减（「退款不计入挑战」），与限额口径独立
  const challengeConsumed = await category.sumDailyLimitExpenses(userId, dateKey, true, true)
  const consumedFromBase = Math.min(consumed, baseLimit)
  const consumedFromSurplus = Math.max(0, consumed - baseLimit)
  // 生效总限额 = 固定限额 + 已确认滚入的次日结余（pending 滚动为临时额度）
  const availableStart = baseLimit + pendingRollover
  const availableEnd = availableStart - consumed
  const surplus = Math.max(0, baseLimit - consumedFromBase)
  const overAmount = Math.max(0, consumed - baseLimit - pendingRollover)
  const isOverLimit = overAmount > 0 || consumed > baseLimit + pendingRollover

  const payload = {
    base_limit: baseLimit,
    pending_rollover_fen: pendingRollover,
    surplus_pool_start: surplusPoolBalance,
    consumed,
    consumed_from_base: consumedFromBase,
    consumed_from_surplus: consumedFromSurplus,
    surplus,
    over_amount: overAmount,
    available_start: availableStart,
    available_end: availableEnd,
    is_over_limit: isOverLimit
  }

  const doc = await upsertByUnique(
    'daily_settlements',
    { user_id: userId, date_key: dateKey },
    payload,
    {
      allocation_status: 'pending',
      allocation_id: null,
      penalty_applied: false,
      settled_at: null,
      created_at: nowTs()
    }
  )
  return { ...doc, challenge_consumed: challengeConsumed }
}


async function updateChallengeForDate(userId, dateKey, challengeConsumed, baseLimit) {
  const db = getDb()
  const monthKey = dateKey.slice(0, 7)
  const yearKey = dateKey.slice(0, 4)
  // 挑战口径消费：退款已冲减（「退款不计入挑战」），按 include_in_challenge 统计
  const isSuccess = challengeConsumed <= baseLimit

  const dailyRes = await db.collection('challenge_records').where({
    user_id: userId,
    challenge_type: 'daily',
    period_key: dateKey
  }).limit(1).get()

  // 当日挑战消费变化量（delta）：用于月/年挑战增量累加，避免每次交易变更重复累加当日消费
  const prevDailyConsumed = (dailyRes.data && dailyRes.data[0]) ? (dailyRes.data[0].consumed_amount || 0) : 0
  const delta = challengeConsumed - prevDailyConsumed

  const dailyPayload = {
    consumed_amount: challengeConsumed,
    base_limit_snapshot: baseLimit,
    is_success: isSuccess,
    status: 'completed',
    completed_at: nowTs(),
    updated_at: nowTs()
  }
  await upsertByUnique(
    'challenge_records',
    { user_id: userId, challenge_type: 'daily', period_key: dateKey },
    dailyPayload,
    { created_at: nowTs() }
  )

  // 月/年挑战：累加当日挑战消费变化量（delta），退款冲减会使 delta 为负、自然冲减挑战消费
  for (const [type, key] of [['monthly', monthKey], ['yearly', yearKey]]) {
    const res = await db.collection('challenge_records').where({
      user_id: userId,
      challenge_type: type,
      period_key: key
    }).limit(1).get()
    if (res.data && res.data[0]) {
      const newConsumed = Math.max(0, (res.data[0].consumed_amount || 0) + delta)
      const target = res.data[0].target_amount || 0
      const isMsuccess = target > 0 ? newConsumed <= target : false
      await db.collection('challenge_records').doc(res.data[0]._id).update({
        consumed_amount: db.command.inc(delta),
        is_success: isMsuccess,
        status: isMsuccess ? 'completed' : 'active',
        updated_at: nowTs()
      })
    } else {
      // 记录不存在则创建（首次触发该周期交易时），consumed_amount 初始化为当日挑战消费变化量
      try {
        await db.collection('challenge_records').add({
          user_id: userId,
          challenge_type: type,
          period_key: key,
          target_amount: 0,
          consumed_amount: Math.max(0, delta),
          is_success: false,
          status: 'active',
          created_at: nowTs(),
          updated_at: nowTs()
        })
      } catch (err) {
        if (!isDuplicateKeyError(err)) throw err
        // 并发下他人已创建：回退为增量累加，避免丢失本次 delta
        const raced = await db.collection('challenge_records').where({
          user_id: userId,
          challenge_type: type,
          period_key: key
        }).limit(1).get()
        const rdoc = raced.data && raced.data[0]
        if (!rdoc) throw err
        await db.collection('challenge_records').doc(rdoc._id).update({
          consumed_amount: db.command.inc(delta),
          updated_at: nowTs()
        })
      }
    }
  }

  const streak = await getDocByUser('user_streaks', userId)
  const ts = nowTs()
  if (isSuccess) {
    const lastSuccess = streak && streak.last_success_date_key
    let current = streak ? streak.daily_current_streak || 0 : 0
    if (lastSuccess) {
      const prev = parseDateKey(lastSuccess)
      const curr = parseDateKey(dateKey)
      const diffDays = Math.round((curr - prev) / 86400000)
      current = diffDays === 1 ? current + 1 : 1
    } else {
      current = 1
    }
    const maxStreak = Math.max(current, streak ? streak.daily_max_streak || 0 : 0)
    const payload = {
      daily_current_streak: current,
      daily_max_streak: maxStreak,
      last_success_date_key: dateKey,
      updated_at: ts
    }
    await upsertByUnique('user_streaks', { user_id: userId }, payload, { penalty_streak_deducted: 0 })
  } else {
    const payload = {
      daily_current_streak: 0,
      last_fail_date_key: dateKey,
      updated_at: ts
    }
    await upsertByUnique('user_streaks', { user_id: userId }, payload, {
      daily_max_streak: 0,
      penalty_streak_deducted: 0
    })
  }
}


async function runDailySettlement(userId, dateKey, options = {}) {
  const db = getDb()
  const existingRes = await db.collection('daily_settlements').where({ user_id: userId, date_key: dateKey }).limit(1).get()
  const existing = existingRes.data && existingRes.data[0]
  if (existing && existing.settled_at && !options.force) {
    return { skipped: true, settlement: existing }
  }

  const settlement = await recalculateDailySettlement(userId, dateKey)
  await updateChallengeForDate(userId, dateKey, settlement.challenge_consumed != null ? settlement.challenge_consumed : settlement.consumed, settlement.base_limit)

  const settings = await getDocByUser('user_settings', userId)
  let allocationResult = null

  if (settlement.surplus > 0 && settlement.allocation_status === 'pending') {
    if (options.autoAllocate !== false) {
      allocationResult = await allocateSurplus(userId, dateKey, null, true)
    }
  }

  const ts = nowTs()
  await db.collection('daily_settlements').doc(settlement._id).update({
    settled_at: ts,
    allocation_status: allocationResult ? (allocationResult.is_auto ? 'auto_allocated' : 'allocated') : settlement.allocation_status
  })

  // penalty_applied 幂等保护：force 重跑或并发日结不重复扣减连续天数
  if (settlement.is_over_limit && !settlement.penalty_applied && settings && settings.over_limit_penalty_enabled) {
    await applyOverLimitPenalty(userId, dateKey, settlement)
  }

  // 订阅消息触达（频控在 sendSubscribeMessage 内；配置缺失时静默跳过）
  const y = (v) => '¥' + (Math.round(v) / 100).toFixed(2)
  // 日结待分配提醒：当日有结余且未自动分配（需用户手动处理）
  if (settlement.surplus > 0 && settlement.allocation_status === 'pending' && settings && settings.notify_daily_surplus) {
    await misc.sendSubscribeMessage(userId, 'daily_surplus', {
      data: { amount1: { value: y(settlement.surplus) }, thing2: { value: '今日结余待分配' } },
      page: 'pages/surplus-alloc/surplus-alloc'
    }).catch(() => {})
  }
  // 连续挑战即将中断提醒：当前连续 > 0 且今天尚未延续成功
  if (settings && settings.notify_streak_risk) {
    const streak = await getDocByUser('user_streaks', userId)
    const cur = streak ? (streak.daily_current_streak || 0) : 0
    const lastOk = streak ? streak.last_success_date_key : null
    if (cur > 0 && lastOk !== formatDateKey()) {
      await misc.sendSubscribeMessage(userId, 'streak_risk', {
        data: { number1: { value: String(cur) }, thing2: { value: '今天记账保持连续' } },
        page: 'pages/challenge/challenge'
      }).catch(() => {})
    }
  }

  // 归档 limit_history（记录当日实际额度/花费/结余去向，供历史查询）
  await archiveLimitHistory(userId, dateKey, settlement, settings, allocationResult)

  // 过期未达成心愿归档（deadline <= 今日且未达成）：进入历史心愿(原因=expired)
  const overdue = await wish.expireOverdueWishes(userId, dateKey).catch(() => ({ expired: 0 }))

  return { skipped: false, settlement, allocation: allocationResult, overdue }
}

/**
 * 归档每日限额历史。幂等：同 date_key 重复写则更新。
 */

async function archiveLimitHistory(userId, dateKey, settlement, settings, allocationResult) {
  const db = getDb()
  const dim = settings ? (settings.limit_dim || 'day') : 'day'
  const monthKey = dateKey.slice(0, 7)
  const yearKey = dateKey.slice(0, 4)

  // 父池口径（含 override 近似值）
  let monthLimitFen = 0
  let yearLimitFen = 0
  if (dim === 'month') {
    const mo = (settings.overrides || []).find(o => o.type === 'month' && o.key === monthKey)
    monthLimitFen = mo ? mo.amount_fen : (settings.limit_amount_fen || 0)
    yearLimitFen = 0
  } else if (dim === 'year') {
    const mo = (settings.overrides || []).find(o => o.type === 'month' && o.key === monthKey)
    monthLimitFen = mo ? mo.amount_fen : Math.floor((settings.limit_amount_fen || 0) / 12)
    yearLimitFen = settings.limit_amount_fen || 0
  } else {
    monthLimitFen = 0
    yearLimitFen = 0
  }

  // 结余去向
  let surplusDest = 'none'
  if (allocationResult && allocationResult.items && allocationResult.items.length) {
    const t = allocationResult.items[0].target_type
    if (t === 'wish') surplusDest = 'wish'
    else if (t === 'savings_pool') surplusDest = 'savings'
    else if (t === 'roll_over') surplusDest = (dim !== 'day' && (settings.month_strategy || 'equal') === 'rollover') ? 'rollover_pool' : 'rollover_tomorrow'
  }

  const payload = {
    day_limit_fen: settlement.base_limit || 0,
    month_limit_fen: monthLimitFen,
    year_limit_fen: yearLimitFen,
    source: (settings.overrides || []).some(o => o.type === 'day' && o.key === dateKey) ? 'override' : 'auto',
    spent_fen: settlement.consumed || 0,
    surplus_fen: settlement.surplus || 0,
    surplus_dest: surplusDest,
    created_at: nowTs()
  }

  await upsertByUnique('limit_history', { user_id: userId, date_key: dateKey }, payload)
}


async function allocateSurplus(userId, dateKey, items, isAuto = false) {
  const db = getDb()
  const settlementRes = await db.collection('daily_settlements').where({ user_id: userId, date_key: dateKey }).limit(1).get()
  const settlement = settlementRes.data && settlementRes.data[0]
  if (!settlement) throw new Error('settlement not found')
  if (settlement.allocation_status !== 'pending') throw new Error('settlement already allocated')

  // 并发抢锁：仅当仍为 pending 时原子改为 processing，受影响行数=1 才继续，
  // 避免多个入口（onLaunch/onShow/cron/force 刷新）同时跑同一日结导致重复滚入
  const lockRes = await db.collection('daily_settlements')
    .where({ _id: settlement._id, allocation_status: 'pending' })
    .update({ allocation_status: 'processing' })
  if (!lockRes || (lockRes.updated || 0) < 1) {
    throw new Error('settlement already allocated (race)')
  }

  const settings = await getDocByUser('user_settings', userId)
  let allocItems = items
  if (!allocItems || !allocItems.length) {
    const action = settings ? settings.default_surplus_action : 'roll_over'
    if (action === 'wish' && settings.default_wish_id) {
      allocItems = [{ target_type: 'wish', amount: settlement.surplus, wish_id: settings.default_wish_id }]
    } else if (action === 'savings_pool') {
      allocItems = [{ target_type: 'savings_pool', amount: settlement.surplus }]
    } else {
      allocItems = [{ target_type: 'roll_over', amount: settlement.surplus }]
    }
  }

  const total = allocItems.reduce((s, i) => s + i.amount, 0)
  if (total !== settlement.surplus) throw new Error('allocation total must equal daily surplus')

  const ts = nowTs()
  // uk_user_date：同一天只允许一条分配记录。force 重跑/重放时若已存在，
  // 说明本日结余已分配过，直接放弃并回滚锁，避免重复滚入资金。
  const dupAlloc = await db.collection('surplus_allocations')
    .where({ user_id: userId, date_key: dateKey }).limit(1).get()
  if (dupAlloc.data && dupAlloc.data[0]) {
    await db.collection('daily_settlements').doc(settlement._id)
      .update({ allocation_status: 'allocated', allocation_id: dupAlloc.data[0]._id })
    throw new Error('settlement already allocated')
  }

  let allocRes
  try {
    allocRes = await db.collection('surplus_allocations').add({
      user_id: userId,
      date_key: dateKey,
      settlement_id: settlement._id,
      total_amount: total,
      items: allocItems,
      is_auto: isAuto,
      created_at: ts
    })
  } catch (err) {
    // 抢锁与插入之间的极窄竞态：回滚锁并放弃，绝不重复分配
    await db.collection('daily_settlements').doc(settlement._id)
      .update({ allocation_status: 'pending' }).catch(() => {})
    if (isDuplicateKeyError(err)) throw new Error('settlement already allocated')
    throw err
  }

  for (const item of allocItems) {
    if (item.target_type === 'roll_over') {
      // 滚入次日限额：写入 user_settings.pending_rollover_fen（临时待确认额度，与 surplus_pools 分离）
      const s = await getDocByUser('user_settings', userId)
      const cur = s ? (s.pending_rollover_fen || 0) : 0
      await db.collection('user_settings').where({ user_id: userId }).update({
        pending_rollover_fen: cur + item.amount,
        pending_rollover_date: dateKey,
        updated_at: nowTs()
      })
    } else if (item.target_type === 'wish') {
      await wish.applyWishFundChange(userId, item.wish_id, 'in', item.amount, 'surplus_allocation', {
        ref_id: allocRes.id
      })
    } else if (item.target_type === 'savings_pool') {
      await pool.applySavingsPoolChange(userId, 'in', item.amount, 'surplus_in', {
        ref_type: 'allocation',
        ref_id: allocRes.id,
        date_key: dateKey
      })
    }
  }

  await db.collection('daily_settlements').doc(settlement._id).update({
    allocation_status: isAuto ? 'auto_allocated' : 'allocated',
    allocation_id: allocRes.id
  })

  return { allocation_id: allocRes.id, items: allocItems, is_auto: isAuto }
}

/**
 * 确认/转走次日待滚入结余（24h 选择窗口）。
 * - decision='confirm'：保持滚入次日限额（限额=base+pending），标记已确认。
 * - decision='other'：把 pending_rollover_fen 立即转入指定目标（savings_pool / wish 等），清零 pending，限额回到 base。
 * @param {string} userId
 * @param {'confirm'|'other'} decision
 * @param {Object} [opts] { target_type, wish_id }
 */

async function confirmSurplusRollover(userId, decision, opts = {}) {
  const db = getDb()
  const settings = await getDocByUser('user_settings', userId)
  if (!settings) throw new Error('user settings not found')
  const pending = settings.pending_rollover_fen || 0
  const pendingDate = settings.pending_rollover_date || null
  if (pending <= 0) {
    return { ok: true, changed: false, pending_rollover_fen: 0 }
  }

  const ts = nowTs()
  if (decision === 'confirm') {
    await db.collection('user_settings').where({ user_id: userId }).update({
      pending_rollover_confirmed: true,
      updated_at: ts
    })
  } else {
    const target = opts.target_type || 'savings_pool'
    if (target === 'wish') {
      if (!opts.wish_id) throw new Error('wish_id required for wish target')
      await wish.applyWishFundChange(userId, opts.wish_id, 'in', pending, 'surplus_rollover', {})
    } else if (target === 'savings_pool') {
      await pool.applySavingsPoolChange(userId, 'in', pending, 'surplus_rollover', { date_key: pendingDate })
    } else {
      // 其他自定义去向默认进存款池
      await pool.applySavingsPoolChange(userId, 'in', pending, 'surplus_rollover', { date_key: pendingDate })
    }
    await db.collection('user_settings').where({ user_id: userId }).update({
      pending_rollover_fen: 0,
      pending_rollover_date: null,
      pending_rollover_confirmed: false,
      updated_at: ts
    })
  }

  // 把对应日结标记已处理，避免重复触发
  if (pendingDate) {
    const sRes = await db.collection('daily_settlements').where({ user_id: userId, date_key: pendingDate }).limit(1).get()
    if (sRes.data && sRes.data[0]) {
      await db.collection('daily_settlements').doc(sRes.data[0]._id).update({
        allocation_status: decision === 'confirm' ? 'allocated' : 'allocated',
        updated_at: ts
      })
    }
  }

  return { ok: true, changed: true, decision, pending_rollover_fen: decision === 'confirm' ? pending : 0 }
}


async function applyOverLimitPenalty(userId, dateKey, settlement) {
  const db = getDb()
  const settings = await getDocByUser('user_settings', userId)
  const deduct = settings ? settings.penalty_streak_deduct || 1 : 1
  const streak = await getDocByUser('user_streaks', userId)
  const before = streak ? streak.daily_current_streak || 0 : 0
  const after = Math.max(0, before - deduct)
  const ts = nowTs()

  if (streak) {
    await db.collection('user_streaks').doc(streak._id).update({
      daily_current_streak: after,
      penalty_streak_deducted: db.command.inc(deduct),
      updated_at: ts
    })
  }

  try {
    await db.collection('user_penalty_logs').add({
      user_id: userId,
      date_key: dateKey,
      settlement_id: settlement._id,
      over_amount: settlement.over_amount,
      penalty_type: 'streak_deduct',
      penalty_value: deduct,
      streak_before: before,
      streak_after: after,
      achievement_codes_affected: [],
      created_at: ts
    })
  } catch (err) {
    // 同日同类型罚则已记录（force 重跑/并发）：幂等跳过
    if (!isDuplicateKeyError(err)) throw err
  }

  await db.collection('daily_settlements').doc(settlement._id).update({ penalty_applied: true })
}

/**
 * 幂等确保某集合存在一条 user_id 归属的文档；已存在则直接返回，避免重复插入。
 * @returns {Promise<object>} 已存在文档或新建文档（含 _id）
 */

async function createTransaction(userId, data) {
  const db = getDb()
  const ts = nowTs()
  const dateKey = data.date_key || formatDateKey(new Date(data.transaction_at || ts))
  const txDoc = {
    user_id: userId,
    type: data.type,
    amount: data.amount,
    category_id: data.category_id || null,
    ledger_id: data.ledger_id,
    account_id: data.account_id || null,
    to_account_id: data.to_account_id || null,
    holding_id: data.holding_id || null,
    date_key: dateKey,
    month_key: dateKey.slice(0, 7),
    transaction_at: data.transaction_at ? toStoredTime(data.transaction_at) : ts,
    recorded_at: ts,
    note: data.note || '',
    image_urls: data.image_urls || [],
    sticker_id: data.sticker_id || null,
    sticker_image_url: data.sticker_image_url || null,
    tags: data.tags || [],
    related_transaction_id: data.related_transaction_id || null,
    stock_consume_qty: data.stock_consume_qty || null,
    include_in_daily_limit: data.include_in_daily_limit !== false,
    include_in_challenge: data.include_in_challenge !== false,
    ocr_meta: data.ocr_meta || null,
    meal_id: null,
    created_by: userId,
    deleted_at: null,
    created_at: ts,
    updated_at: ts
  }

  const addRes = await db.collection('transactions').add(txDoc)
  const transactionId = addRes.id

  // 阶段 10：账户联动——专项/投资账户的消费不计入日限额与日挑战（§3.11.5）
  if (data.account_id) {
    try {
      const accRes = await db.collection('asset_accounts').doc(data.account_id).get()
      const acc = accRes.data && accRes.data[0]
      if (acc && acc.user_id === userId) {
        if (acc.include_in_daily_limit === false) txDoc.include_in_daily_limit = false
        if (acc.include_in_challenge === false) txDoc.include_in_challenge = false
      }
    } catch (_e) { /* 账户不存在则按默认计限 */ }
  }

  if (data.account_id) {
    let delta = 0
    if (data.type === 'expense') delta = -data.amount
    else if (data.type === 'income' || data.type === 'refund') delta = data.amount
    else if (data.type === 'transfer') delta = -data.amount
    if (delta !== 0) {
      await pool.applyAccountBalanceChange(userId, data.account_id, delta, 'transaction', {
        transaction_id: transactionId
      })
    }
  }
  if (data.type === 'transfer' && data.to_account_id) {
    await pool.applyAccountBalanceChange(userId, data.to_account_id, data.amount, 'transfer_in', {
      transaction_id: transactionId,
      counter_account_id: data.account_id
    })
  }

  let settlement
  if (data.type === 'expense' && txDoc.include_in_daily_limit) {
    settlement = await recalculateDailySettlement(userId, dateKey)
    const surplusPoolDoc = await getDocByUser('surplus_pools', userId)
    const poolBal = surplusPoolDoc ? surplusPoolDoc.balance || 0 : 0
    const baseLimit = settlement.base_limit
    const consumed = settlement.consumed
    const needFromSurplus = Math.max(0, consumed - baseLimit)
    const prevConsumed = consumed - data.amount
    const prevNeed = Math.max(0, prevConsumed - baseLimit)
    const surplusUsed = needFromSurplus - prevNeed
    if (surplusUsed > 0 && poolBal >= surplusUsed) {
      await pool.applySurplusPoolChange(userId, 'out', surplusUsed, 'consume_deduct', {
        ref_type: 'transaction',
        ref_id: transactionId,
        date_key: dateKey
      })
      settlement = await recalculateDailySettlement(userId, dateKey)
    }
  } else {
    settlement = await recalculateDailySettlement(userId, dateKey)
  }

  // 新增交易（含退款）需同步更新挑战进度；挑战口径消费退款始终冲减
  await updateChallengeForDate(userId, dateKey, settlement.challenge_consumed != null ? settlement.challenge_consumed : settlement.consumed, settlement.base_limit)

  // 超额提醒订阅消息（频控在 sendSubscribeMessage 内；配置缺失时静默跳过）
  if (settlement && settlement.consumed > settlement.base_limit) {
    const s = await getDocByUser('user_settings', userId)
    if (s && s.notify_over_limit) {
      const y = (v) => '¥' + (Math.round(v) / 100).toFixed(2)
      await misc.sendSubscribeMessage(userId, 'over_limit', {
        data: {
          amount1: { value: y(settlement.consumed) },
          amount2: { value: y(settlement.base_limit) },
          thing3: { value: '今日已超支，注意控制' }
        },
        page: 'pages/index/index'
      }).catch(() => {})
    }
  }

  return { transaction_id: transactionId, ...txDoc }
}


async function softDeleteTransaction(userId, transactionId) {
  const db = getDb()
  const res = await db.collection('transactions').doc(transactionId).get()
  const tx = res.data && res.data[0]
  if (!tx || tx.user_id !== userId) throw new Error('transaction not found')
  if (tx.deleted_at) return { already_deleted: true }

  const ts = nowTs()
  await db.collection('transactions').doc(transactionId).update({ deleted_at: ts, updated_at: ts })

  if (tx.account_id) {
    let delta = 0
    if (tx.type === 'expense') delta = tx.amount
    else if (tx.type === 'income' || tx.type === 'refund') delta = -tx.amount
    else if (tx.type === 'transfer') delta = tx.amount
    if (delta !== 0) {
      await pool.applyAccountBalanceChange(userId, tx.account_id, delta, 'refund', {
        transaction_id: transactionId,
        note: 'transaction soft delete rollback'
      })
    }
  }
  if (tx.type === 'transfer' && tx.to_account_id) {
    await pool.applyAccountBalanceChange(userId, tx.to_account_id, -tx.amount, 'refund', {
      transaction_id: transactionId,
      counter_account_id: tx.account_id,
      note: 'transfer rollback'
    })
  }

  const settlement = await recalculateDailySettlement(userId, tx.date_key)
  await updateChallengeForDate(userId, tx.date_key, settlement.challenge_consumed != null ? settlement.challenge_consumed : settlement.consumed, settlement.base_limit)

  return { deleted: true, transaction_id: transactionId }
}

/**
 * 删除账本（软删），并处理其下交易的归属。
 * @param {string} userId
 * @param {string} ledgerId
 * @param {'transfer'|'purge'} mode transfer=交易转移至总账本；purge=交易一并软删
 */

async function updateTransaction(userId, transactionId, data) {
  const db = getDb()
  const res = await db.collection('transactions').doc(transactionId).get()
  const oldTx = res.data && res.data[0]
  if (!oldTx || oldTx.user_id !== userId) throw new Error('transaction not found')
  if (oldTx.deleted_at) throw new Error('transaction already deleted')

  const ts = nowTs()

  // 1) 回滚旧值影响
  if (oldTx.account_id) {
    let delta = 0
    if (oldTx.type === 'expense') delta = oldTx.amount
    else if (oldTx.type === 'income' || oldTx.type === 'refund') delta = -oldTx.amount
    else if (oldTx.type === 'transfer') delta = oldTx.amount
    if (delta !== 0) {
      await pool.applyAccountBalanceChange(userId, oldTx.account_id, delta, 'refund', {
        transaction_id: transactionId,
        note: 'transaction update rollback'
      })
    }
  }
  if (oldTx.type === 'transfer' && oldTx.to_account_id) {
    await pool.applyAccountBalanceChange(userId, oldTx.to_account_id, -oldTx.amount, 'refund', {
      transaction_id: transactionId,
      counter_account_id: oldTx.account_id,
      note: 'transfer update rollback'
    })
  }
  const oldSettlement = await recalculateDailySettlement(userId, oldTx.date_key)
  await updateChallengeForDate(userId, oldTx.date_key, oldSettlement.challenge_consumed != null ? oldSettlement.challenge_consumed : oldSettlement.consumed, oldSettlement.base_limit)

  // 2) 计算新值（未传字段沿用旧值）
  const newType = data.type || oldTx.type
  const newAmount = typeof data.amount === 'number' ? data.amount : oldTx.amount
  const newAccountId = data.account_id !== undefined ? (data.account_id || null) : oldTx.account_id
  const newToAccountId = data.to_account_id !== undefined ? (data.to_account_id || null) : oldTx.to_account_id
  const transactionAt = toStoredTime(data.transaction_at) || oldTx.transaction_at
  const dateKey = data.date_key || formatDateKey(new Date(transactionAt))
  const includeInDailyLimit = data.include_in_daily_limit !== undefined
    ? data.include_in_daily_limit !== false
    : oldTx.include_in_daily_limit
  const includeInChallenge = data.include_in_challenge !== undefined
    ? data.include_in_challenge !== false
    : oldTx.include_in_challenge

  // 3) 更新文档
  const updateDoc = {
    type: newType,
    amount: newAmount,
    category_id: data.category_id !== undefined ? (data.category_id || null) : oldTx.category_id,
    ledger_id: data.ledger_id !== undefined ? data.ledger_id : oldTx.ledger_id,
    account_id: newAccountId,
    to_account_id: newToAccountId,
    holding_id: data.holding_id !== undefined ? (data.holding_id || null) : oldTx.holding_id,
    date_key: dateKey,
    month_key: dateKey.slice(0, 7),
    transaction_at: transactionAt,
    note: data.note !== undefined ? (data.note || '') : oldTx.note,
    image_urls: data.image_urls !== undefined ? (data.image_urls || []) : oldTx.image_urls,
    sticker_id: data.sticker_id !== undefined ? (data.sticker_id || null) : oldTx.sticker_id,
    sticker_image_url: data.sticker_image_url !== undefined ? (data.sticker_image_url || null) : oldTx.sticker_image_url,
    include_in_daily_limit: includeInDailyLimit,
    include_in_challenge: includeInChallenge,
    updated_at: ts
  }
  await db.collection('transactions').doc(transactionId).update(updateDoc)

  // 4) 应用新值影响
  if (newAccountId) {
    let delta = 0
    if (newType === 'expense') delta = -newAmount
    else if (newType === 'income' || newType === 'refund') delta = newAmount
    else if (newType === 'transfer') delta = -newAmount
    if (delta !== 0) {
      await pool.applyAccountBalanceChange(userId, newAccountId, delta, 'transaction', {
        transaction_id: transactionId
      })
    }
  }
  if (newType === 'transfer' && newToAccountId) {
    await pool.applyAccountBalanceChange(userId, newToAccountId, newAmount, 'transfer_in', {
      transaction_id: transactionId,
      counter_account_id: newAccountId
    })
  }

  // 重算结算 + 挑战（新日期）
  const finalSettlement = await recalculateDailySettlement(userId, dateKey)
  await updateChallengeForDate(userId, dateKey, finalSettlement.challenge_consumed != null ? finalSettlement.challenge_consumed : finalSettlement.consumed, finalSettlement.base_limit)
  // 跨日编辑：旧日期也需重算挑战
  if (oldTx.date_key !== dateKey) {
    const oldReSettlement = await recalculateDailySettlement(userId, oldTx.date_key)
    await updateChallengeForDate(userId, oldTx.date_key, oldReSettlement.challenge_consumed != null ? oldReSettlement.challenge_consumed : oldReSettlement.consumed, oldReSettlement.base_limit)
  }

  return { transaction_id: transactionId, ...oldTx, ...updateDoc }
}


async function getLedgerWithTransactions(userId, ledgerId) {
  const db = getDb()
  const [lRes, txRes] = await Promise.all([
    db.collection('ledgers').doc(ledgerId).get(),
    db.collection('transactions').where({ user_id: userId, deleted_at: db.command.eq(null) }).get()
  ])
  const l = lRes.data && lRes.data[0]
  if (!l || l.user_id !== userId) return null
  // 成员列表：从 member_ledgers 关联 members 取本账本已关联成员（异常时降级为空数组）
  let memberCount = 0
  let members = []
  try {
    const list = await ledger.getLedgerMembers(userId, ledgerId)
    members = list
    memberCount = list.length
    // 兜底：若账本无任何关联成员（存量账本），自动把本人关联进去
    if (!list.length) {
      try {
        const selfId = await ledger.ensureSelfMemberLinkedToLedger(userId, ledgerId)
        const selfRes = await db.collection('members').doc(selfId).get()
        const selfM = selfRes.data && selfRes.data[0]
        if (selfM) {
          members = [{
            _id: selfM._id,
            user_id: selfM.user_id || '',
            nickname: selfM.nickname || '',
            avatar_url: selfM.avatar || '',
            bio: selfM.bio || '',
            relation: selfM.relation || 'self',
            is_self: true,
          }]
          memberCount = 1
        }
      } catch (e) {
        console.error('[sparejar-db] ensure self member linked failed', e)
      }
    }
  } catch (e) {
    memberCount = 0
    members = []
  }

  // 当前用户是否收藏该账本（favorite_ledgers 未建表时查询返回空，安全降级为 false）
  let isFavorited = false
  try {
    const favRes = await db.collection('favorite_ledgers')
      .where({ user_id: userId, ledger_id: ledgerId })
      .limit(1)
      .get()
    isFavorited = !!(favRes.data && favRes.data[0])
  } catch (e) {
    isFavorited = false
  }
  return { ledger: l, transactions: txRes.data || [], memberCount, members, is_favorited: isFavorited }
}

/** 单笔交易（用于编辑 / 退款关联）。 */

async function getTransaction(userId, txId) {
  const db = getDb()
  const res = await db.collection('transactions').doc(txId).get()
  const t = res.data && res.data[0]
  if (!t || t.user_id !== userId) return null
  return t
}

/**
 * 交易列表查询。
 * @param {string} userId
 * @param {{ type?: string, date_key?: string, include_deleted?: boolean, limit?: number, orderBy?: string, orderDir?: string }} [opts]
 */

async function listTransactions(userId, opts = {}) {
  const db = getDb()
  const where = { user_id: userId }
  if (!opts.include_deleted) where.deleted_at = db.command.eq(null)
  if (opts.type) where.type = opts.type
  if (opts.date_key) where.date_key = opts.date_key
  let q = db.collection('transactions').where(where)
  if (opts.orderBy) q = q.orderBy(opts.orderBy, opts.orderDir || 'desc')
  else q = q.orderBy('transaction_at', 'desc')
  if (opts.limit) q = q.limit(opts.limit)
  const res = await q.get()
  return res.data || []
}

/** 账户余额变动流水。 */

async function listAccountBalanceLogs(userId, accountId, limit = 40) {
  const db = getDb()
  let q = db.collection('account_balance_logs')
    .where({ user_id: userId, account_id: accountId })
    .orderBy('created_at', 'desc')
  if (limit) q = q.limit(limit)
  const res = await q.get()
  return res.data || []
}

/** 首页仪表盘数据：当日交易（limit 50）+ 昨日结算快照。 */

module.exports = {
  recalculateDailySettlement,
  updateChallengeForDate,
  runDailySettlement,
  archiveLimitHistory,
  allocateSurplus,
  confirmSurplusRollover,
  applyOverLimitPenalty,
  createTransaction,
  softDeleteTransaction,
  updateTransaction,
  getLedgerWithTransactions,
  getTransaction,
  listTransactions,
  listAccountBalanceLogs,
}
