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

/**
 * 推导滚入次日可用额度 P = Σ(in:roll_over) − Σ(out:roll_over_used)，并取 min(P, 池余额)。
 * 取代原 user_settings.pending_rollover_fen 独立字段，避免双计与多笔滚存丢失。
 * @param {string} userId
 * @param {number} [poolBalance] 当前结余池余额，用于防御 P > B
 */
async function computeRollOverPending(userId, poolBalance = 0) {
  const db = getDb()
  const logs = await db.collection('surplus_pool_logs')
    .where({ user_id: userId })
    .get()
  let p = 0
  for (const l of logs.data || []) {
    if (l.reason === 'roll_over' && l.direction === 'in') p += l.amount || 0
    else if (l.reason === 'roll_over_used' && l.direction === 'out') p -= l.amount || 0
  }
  if (p < 0) p = 0
  if (p > poolBalance) p = poolBalance
  return p
}

async function recalculateDailySettlement(userId, dateKey) {
  const db = getDb()
  // —— 防越界补录：禁止为「早于账号新建日」的日期创建/重算结算 ——
  // 新建前用户从未使用系统，不可能产生任何业务数据；越界请求一律拒绝并标记异常。
  const createdDateKey = await misc.getUserCreatedDateKey(userId)
  if (createdDateKey && dateKey < createdDateKey) {
    console.warn('[recalculateDailySettlement] 拒绝越界补录：date_key', dateKey,
      '早于账号创建日', createdDateKey, 'userId=', userId)
    // 不写入新记录；若已存在（历史违规残留）原样返回，清理交由审计脚本处理
    const existing = await db.collection('daily_settlements')
      .where({ user_id: userId, date_key: dateKey }).limit(1).get()
    return (existing.data && existing.data[0]) || null
  }
  const settings = await getDocByUser('user_settings', userId)
  const baseLimit = await category.getEffectiveBaseLimit(userId, dateKey)
  const surplusPoolDoc = await getDocByUser('surplus_pools', userId)
  const surplusPoolBalance = surplusPoolDoc ? surplusPoolDoc.balance || 0 : 0
  // 滚入次日可用额度 P：由流水推导（in:roll_over 之和 - out:roll_over_used 之和），恒 ≤ 池余额
  const pendingRollover = await computeRollOverPending(userId, surplusPoolBalance)
  // 退款恢复当日可用额度：受 user_settings.refund_restore_limit 控制（默认开启）
  const refundRestore = settings ? settings.refund_restore_limit !== false : true
  const consumed = await category.sumDailyLimitExpenses(userId, dateKey, refundRestore, false)
  // 挑战口径消费：按 include_in_challenge 过滤，退款始终冲减（「退款不计入挑战」），与限额口径独立
  const challengeConsumed = await category.sumDailyLimitExpenses(userId, dateKey, true, true)
  const consumedFromBase = Math.min(consumed, baseLimit)
  const consumedFromSurplus = Math.max(0, consumed - baseLimit)
  // 生效总限额 = 固定限额 + 滚入次日的结余（P 为池余额子集，不脱离池）
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
    // 挑战口径当日消费（与限额口径独立，退款始终冲减），持久化以便月/年挑战增量累加（替代原 challenge_records.daily）
    challenge_consumed: challengeConsumed,
    surplus,
    over_amount: overAmount,
    available_start: availableStart,
    available_end: availableEnd,
    is_over_limit: isOverLimit
  }

  // 读旧文档，获取本次重算前的挑战口径消费，作为月/年挑战增量累加的基准（delta = 新 - 旧）
  const oldRes = await db.collection('daily_settlements').where({
    user_id: userId, date_key: dateKey
  }).limit(1).get()
  const prevChallengeConsumed = (oldRes.data && oldRes.data[0])
    ? (oldRes.data[0].challenge_consumed || 0)
    : 0

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
  return { ...doc, challenge_consumed: challengeConsumed, prev_challenge_consumed: prevChallengeConsumed }
}


/**
 * 按 user_settings 的限额口径派生月/年挑战目标（分）。与 challenge.js:resolvePeriodLimit 算法保持一致，
 * 实现「首页限额 → 挑战目标」的写入派生。dim='day' 时无月/年目标（返回 0）。
 * @param {object} settings  user_settings 文档
 * @param {'monthly'|'yearly'} type
 * @param {string} periodKey  monthly → 'YYYY-MM'；yearly → 'YYYY'
 */
function derivePeriodTarget(settings, type, periodKey) {
  if (!settings) return 0
  const dim = settings.limit_dim || 'day'
  const limitAmount = settings.limit_amount_fen || 0
  const overrides = settings.overrides || []
  if (type === 'monthly') {
    if (dim === 'month') {
      const mo = overrides.find(o => o.type === 'month' && o.key === periodKey)
      return mo ? mo.amount_fen : limitAmount
    }
    if (dim === 'year') {
      const mo = overrides.find(o => o.type === 'month' && o.key === periodKey)
      return mo ? mo.amount_fen : Math.floor(limitAmount / 12)
    }
    return 0 // dim==='day' 无月目标
  }
  if (dim === 'year') return limitAmount
  return 0
}

async function updateChallengeForDate(userId, dateKey, challengeConsumed, baseLimit, prevChallengeConsumed = 0) {
  const db = getDb()
  const monthKey = dateKey.slice(0, 7)
  const yearKey = dateKey.slice(0, 4)
  // 挑战口径消费：退款已冲减（「退款不计入挑战」），按 include_in_challenge 统计
  const isSuccess = challengeConsumed <= baseLimit

  // 当日挑战消费变化量（delta）：用于月/年挑战增量累加，避免每次交易变更重复累加当日消费。
  // prevChallengeConsumed 由 recalculateDailySettlement 在重算前捕获并传入（挑战口径当日消费），
  // 不再写 challenge_records.daily（日维度统一由 daily_settlements 承载）。
  const delta = challengeConsumed - prevChallengeConsumed

  // 月/年挑战：累加当日挑战消费变化量（delta），退款冲减会使 delta 为负、自然冲减挑战消费
  // 目标上限按当前生效的 user_settings 派生写入（方案 B：首页限额 → 挑战目标落库），
  // 修复历史「target_amount=0 不统计」问题；已有记录若 target 仍为 0 则回填。
  const chSettings = await getDocByUser('user_settings', userId)
  for (const [type, key] of [['monthly', monthKey], ['yearly', yearKey]]) {
    const derivedTarget = derivePeriodTarget(chSettings, type, key)
    const res = await db.collection('challenge_records').where({
      user_id: userId,
      challenge_type: type,
      period_key: key
    }).limit(1).get()
    if (res.data && res.data[0]) {
      const rec = res.data[0]
      const newConsumed = Math.max(0, (rec.consumed_amount || 0) + delta)
      // 目标：已有真实目标（>0）优先；否则用派生值（含 0 回填为派生值）
      const target = rec.target_amount > 0 ? rec.target_amount : derivedTarget
      const isMsuccess = target > 0 ? newConsumed <= target : false
      const patch = {
        consumed_amount: db.command.inc(delta),
        is_success: isMsuccess,
        status: isMsuccess ? 'completed' : 'active',
        updated_at: nowTs()
      }
      // 回填：原本 target=0（未设目标）的记录，按首页限额派生写入真实目标
      if (rec.target_amount === 0 && derivedTarget > 0) patch.target_amount = derivedTarget
      await db.collection('challenge_records').doc(rec._id).update(patch)
    } else {
      // 记录不存在则创建（首次触发该周期交易时），target 直接写入派生值（不再写死 0）
      try {
        await db.collection('challenge_records').add({
          user_id: userId,
          challenge_type: type,
          period_key: key,
          target_amount: derivedTarget,
          consumed_amount: Math.max(0, delta),
          is_success: derivedTarget > 0 ? Math.max(0, delta) <= derivedTarget : false,
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
  // —— 防提前日结：今天及未来的天尚未结束，不应结算滚存 ——
  // 否则白天打开 App 触发 dashboard 日结会把「今天还没花的钱」提前滚入，
  // 导致滚存多算一天（注册当天 / 当天未结束即被计入）。结算只对过去的天生效。
  const todayKey = formatDateKey()
  if (dateKey >= todayKey && !options.force) {
    return { skipped: true, reason: 'not_past_day' }
  }
  const existingRes = await db.collection('daily_settlements').where({ user_id: userId, date_key: dateKey }).limit(1).get()
  const existing = existingRes.data && existingRes.data[0]
  if (existing && existing.settled_at && !options.force) {
    return { skipped: true, settlement: existing }
  }

  const settlement = await recalculateDailySettlement(userId, dateKey)
  await updateChallengeForDate(userId, dateKey, settlement.challenge_consumed != null ? settlement.challenge_consumed : settlement.consumed, settlement.base_limit, settlement.prev_challenge_consumed || 0)

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
      // 滚入次日：日结盈余先作为 daily_surplus 进池，再补记 roll_over 标签（不改动池余额 B）
      await pool.applySurplusPoolChange(userId, 'in', item.amount, 'daily_surplus', {
        ref_type: 'allocation',
        ref_id: allocRes.id,
        date_key: dateKey
      })
      await pool.markRollOverLog(userId, item.amount, {
        ref_type: 'allocation',
        ref_id: allocRes.id,
        date_key: dateKey
      })
    } else if (item.target_type === 'wish') {
      // 立即消耗型：先 daily_surplus 进池，再 to_wish 出池（净 B 不变，钱去心愿）
      await pool.applySurplusPoolChange(userId, 'in', item.amount, 'daily_surplus', {
        ref_type: 'allocation',
        ref_id: allocRes.id,
        date_key: dateKey
      })
      await wish.applyWishFundChange(userId, item.wish_id, 'in', item.amount, 'surplus_allocation', {
        ref_id: allocRes.id
      })
      await pool.applySurplusPoolChange(userId, 'out', item.amount, 'to_wish', {
        ref_type: 'allocation',
        ref_id: allocRes.id,
        date_key: dateKey,
        consumeRollOver: false
      })
    } else if (item.target_type === 'savings_pool') {
      await pool.applySurplusPoolChange(userId, 'in', item.amount, 'daily_surplus', {
        ref_type: 'allocation',
        ref_id: allocRes.id,
        date_key: dateKey
      })
      await pool.applySavingsPoolChange(userId, 'in', item.amount, 'surplus_in', {
        ref_type: 'allocation',
        ref_id: allocRes.id,
        date_key: dateKey
      })
      await pool.applySurplusPoolChange(userId, 'out', item.amount, 'to_savings', {
        ref_type: 'allocation',
        ref_id: allocRes.id,
        date_key: dateKey,
        consumeRollOver: false
      })
    } else {
      // DIY 自定义：立即消耗型，进池后按 to_<diy> 出池
      await pool.applySurplusPoolChange(userId, 'in', item.amount, 'daily_surplus', {
        ref_type: 'allocation',
        ref_id: allocRes.id,
        date_key: dateKey
      })
      await pool.applySurplusPoolChange(userId, 'out', item.amount, 'to_' + String(item.target_type || 'diy'), {
        ref_type: 'allocation',
        ref_id: allocRes.id,
        date_key: dateKey,
        consumeRollOver: false
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
  const poolDoc = await getDocByUser('surplus_pools', userId)
  const poolBalance = poolDoc ? (poolDoc.balance || 0) : 0
  // 滚入次日可用额度由流水推导（不再读 pending_rollover_fen 字段）
  const pending = await computeRollOverPending(userId, poolBalance)
  if (pending <= 0) {
    return { ok: true, changed: false, pending_rollover_fen: 0 }
  }

  const ts = nowTs()
  if (decision === 'confirm') {
    // 保持滚入次日：钱已在池且已标记 roll_over，此处仅标记已确认
    await db.collection('user_settings').where({ user_id: userId }).update({
      pending_rollover_confirmed: true,
      updated_at: ts
    })
  } else {
    // 实际用掉滚入次日的额度：记 out:roll_over_used（消耗 P，池 B 减 pending），并转给目标
    // consumeRollOver:false 避免自身再补一条 roll_over_used（否则 P 双扣）
    await pool.applySurplusPoolChange(userId, 'out', pending, 'roll_over_used', { date_key: settings.pending_rollover_date || null, consumeRollOver: false })
    const target = opts.target_type || 'savings_pool'
    if (target === 'wish') {
      if (!opts.wish_id) throw new Error('wish_id required for wish target')
      await wish.applyWishFundChange(userId, opts.wish_id, 'in', pending, 'surplus_rollover', {})
    } else {
      // savings_pool 或自定义去向：进存款池
      await pool.applySavingsPoolChange(userId, 'in', pending, 'surplus_rollover', { date_key: settings.pending_rollover_date || null })
    }
    await db.collection('user_settings').where({ user_id: userId }).update({
      pending_rollover_confirmed: false,
      updated_at: ts
    })
  }

  // 把对应日结标记已处理，避免重复触发
  if (settings.pending_rollover_date) {
    const sRes = await db.collection('daily_settlements').where({ user_id: userId, date_key: settings.pending_rollover_date }).limit(1).get()
    if (sRes.data && sRes.data[0]) {
      await db.collection('daily_settlements').doc(sRes.data[0]._id).update({
        allocation_status: 'allocated',
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
    sticker_qty: data.sticker_qty != null ? data.sticker_qty : 1,
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
  // 同时按账户类别决定余额变动符号：负债账户余额表示"欠款"，语义与资产账户相反。
  /** @type {Object|null} */
  let fromAcc = null
  if (data.account_id) {
    try {
      const accRes = await db.collection('asset_accounts').doc(data.account_id).get()
      const acc = accRes.data && accRes.data[0]
      if (acc && acc.user_id === userId) {
        fromAcc = acc
        if (acc.include_in_daily_limit === false) txDoc.include_in_daily_limit = false
        if (acc.include_in_challenge === false) txDoc.include_in_challenge = false
      }
    } catch (_e) { /* 账户不存在则按默认计限 */ }
  }
  /** @type {Object|null} */
  let toAcc = null
  if (data.type === 'transfer' && data.to_account_id) {
    try {
      const accRes = await db.collection('asset_accounts').doc(data.to_account_id).get()
      const acc = accRes.data && accRes.data[0]
      if (acc && acc.user_id === userId) toAcc = acc
    } catch (_e) { /* 忽略 */ }
  }

  if (data.account_id && fromAcc) {
    // 负债账户（付款方）：expense 表示刷卡消费，欠款增加（+amount）；income/refund/transfer 表示还款，欠款减少（-amount）
    const isLiability = fromAcc.account_class === 'liability'
    let delta = 0
    if (data.type === 'expense') delta = isLiability ? data.amount : -data.amount
    else if (data.type === 'income' || data.type === 'refund' || data.type === 'transfer') delta = isLiability ? -data.amount : data.amount
    if (delta !== 0) {
      await pool.applyAccountBalanceChange(userId, data.account_id, delta, 'transaction', {
        transaction_id: transactionId
      })
    }
  }
  if (data.type === 'transfer' && data.to_account_id && toAcc) {
    // 转入方：普通账户余额增加；负债账户表示收到还款，欠款减少（-amount）
    const delta = toAcc.account_class === 'liability' ? -data.amount : data.amount
    await pool.applyAccountBalanceChange(userId, data.to_account_id, delta, 'transfer_in', {
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
  await updateChallengeForDate(userId, dateKey, settlement.challenge_consumed != null ? settlement.challenge_consumed : settlement.consumed, settlement.base_limit, settlement.prev_challenge_consumed || 0)

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
    const accRes = await db.collection('asset_accounts').doc(tx.account_id).get()
    const acc = accRes.data && accRes.data[0]
    const isLiability = acc && acc.user_id === userId && acc.account_class === 'liability'
    let delta = 0
    if (tx.type === 'expense') delta = isLiability ? -tx.amount : tx.amount
    else if (tx.type === 'income' || tx.type === 'refund') delta = isLiability ? tx.amount : -tx.amount
    else if (tx.type === 'transfer') delta = isLiability ? -tx.amount : tx.amount
    if (delta !== 0) {
      await pool.applyAccountBalanceChange(userId, tx.account_id, delta, 'refund', {
        transaction_id: transactionId,
        note: 'transaction soft delete rollback'
      })
    }
  }
  if (tx.type === 'transfer' && tx.to_account_id) {
    const accRes = await db.collection('asset_accounts').doc(tx.to_account_id).get()
    const acc = accRes.data && accRes.data[0]
    const isLiability = acc && acc.user_id === userId && acc.account_class === 'liability'
    const delta = isLiability ? tx.amount : -tx.amount
    await pool.applyAccountBalanceChange(userId, tx.to_account_id, delta, 'refund', {
      transaction_id: transactionId,
      counter_account_id: tx.account_id,
      note: 'transfer rollback'
    })
  }

  const settlement = await recalculateDailySettlement(userId, tx.date_key)
  await updateChallengeForDate(userId, tx.date_key, settlement.challenge_consumed != null ? settlement.challenge_consumed : settlement.consumed, settlement.base_limit, settlement.prev_challenge_consumed || 0)

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
    const accRes = await db.collection('asset_accounts').doc(oldTx.account_id).get()
    const acc = accRes.data && accRes.data[0]
    const isLiability = acc && acc.user_id === userId && acc.account_class === 'liability'
    let delta = 0
    if (oldTx.type === 'expense') delta = isLiability ? -oldTx.amount : oldTx.amount
    else if (oldTx.type === 'income' || oldTx.type === 'refund') delta = isLiability ? oldTx.amount : -oldTx.amount
    else if (oldTx.type === 'transfer') delta = isLiability ? -oldTx.amount : oldTx.amount
    if (delta !== 0) {
      await pool.applyAccountBalanceChange(userId, oldTx.account_id, delta, 'refund', {
        transaction_id: transactionId,
        note: 'transaction update rollback'
      })
    }
  }
  if (oldTx.type === 'transfer' && oldTx.to_account_id) {
    const accRes = await db.collection('asset_accounts').doc(oldTx.to_account_id).get()
    const acc = accRes.data && accRes.data[0]
    const isLiability = acc && acc.user_id === userId && acc.account_class === 'liability'
    const delta = isLiability ? oldTx.amount : -oldTx.amount
    await pool.applyAccountBalanceChange(userId, oldTx.to_account_id, delta, 'refund', {
      transaction_id: transactionId,
      counter_account_id: oldTx.account_id,
      note: 'transfer update rollback'
    })
  }
  const oldSettlement = await recalculateDailySettlement(userId, oldTx.date_key)
  await updateChallengeForDate(userId, oldTx.date_key, oldSettlement.challenge_consumed != null ? oldSettlement.challenge_consumed : oldSettlement.consumed, oldSettlement.base_limit, oldSettlement.prev_challenge_consumed || 0)

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
    sticker_qty: data.sticker_qty !== undefined ? (data.sticker_qty || 1) : oldTx.sticker_qty,
    stock_consume_qty: data.stock_consume_qty !== undefined ? data.stock_consume_qty : oldTx.stock_consume_qty,
    include_in_daily_limit: includeInDailyLimit,
    include_in_challenge: includeInChallenge,
    updated_at: ts
  }
  await db.collection('transactions').doc(transactionId).update(updateDoc)

  // 4) 应用新值影响
  if (newAccountId) {
    const accRes = await db.collection('asset_accounts').doc(newAccountId).get()
    const acc = accRes.data && accRes.data[0]
    const isLiability = acc && acc.user_id === userId && acc.account_class === 'liability'
    let delta = 0
    if (newType === 'expense') delta = isLiability ? newAmount : -newAmount
    else if (newType === 'income' || newType === 'refund') delta = isLiability ? -newAmount : newAmount
    else if (newType === 'transfer') delta = isLiability ? newAmount : -newAmount
    if (delta !== 0) {
      await pool.applyAccountBalanceChange(userId, newAccountId, delta, 'transaction', {
        transaction_id: transactionId
      })
    }
  }
  if (newType === 'transfer' && newToAccountId) {
    const accRes = await db.collection('asset_accounts').doc(newToAccountId).get()
    const acc = accRes.data && accRes.data[0]
    const isLiability = acc && acc.user_id === userId && acc.account_class === 'liability'
    const delta = isLiability ? -newAmount : newAmount
    await pool.applyAccountBalanceChange(userId, newToAccountId, delta, 'transfer_in', {
      transaction_id: transactionId,
      counter_account_id: newAccountId
    })
  }

  // 重算结算 + 挑战（新日期）
  const finalSettlement = await recalculateDailySettlement(userId, dateKey)
  await updateChallengeForDate(userId, dateKey, finalSettlement.challenge_consumed != null ? finalSettlement.challenge_consumed : finalSettlement.consumed, finalSettlement.base_limit, finalSettlement.prev_challenge_consumed || 0)
  // 跨日编辑：旧日期也需重算挑战
  if (oldTx.date_key !== dateKey) {
    const oldReSettlement = await recalculateDailySettlement(userId, oldTx.date_key)
    await updateChallengeForDate(userId, oldTx.date_key, oldReSettlement.challenge_consumed != null ? oldReSettlement.challenge_consumed : oldReSettlement.consumed, oldReSettlement.base_limit, oldReSettlement.prev_challenge_consumed || 0)
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

/**
 * 回退「非法」的日终结算（rollbackTodaySettlement）。
 * 非法日期分两类：
 *  ① 创建日之前的越界 settlement（历史残留，账号还没注册却有结算/滚存，本不该存在）；
 *  ② 今天（白天 dashboard 提前日结，把「今天还没花的钱」提前滚入 surplus，导致多算一天）。
 * 对每类非法日期：删除对应滚存入池流水、回退 surplus 池余额、删除分配记录；
 * 越界 settlement 直接删除，今天的 settlement 仅清 settled_at/分配标记，等日终 cron 正常补滚。
 * 仅处理非法日期，不动创建日及以后、且非今天的正常结算。
 */
async function rollbackTodaySettlement(userId) {
  const db = getDb()
  const todayKey = formatDateKey()
  const createdDateKey = await misc.getUserCreatedDateKey(userId)
  const out = { todayKey, createdDateKey, removedLogs: 0, rolledBackAmount: 0, removedAllocations: 0, removedSettlements: 0, resetSettlements: 0 }

  // 非法日期筛选条件：① 创建日之前的越界（历史残留）② 今天（提前日结多滚）。
  // 直接用 date_key 比较，不依赖 settlement 是否存在，避免漏清「孤儿」流水（settlement 已删但 log 还在）。
  const illegalDateCond = createdDateKey
    ? db.command.or(db.command.lt(createdDateKey), db.command.eq(todayKey))
    : db.command.eq(todayKey)

  // 1) 删除非法日期的滚存入池流水（仅 daily_surplus 实际改变池余额；roll_over 标签流水不改 balance）
  const logWhere = {
    user_id: userId,
    date_key: illegalDateCond,
    direction: 'in',
    reason: db.command.in(['daily_surplus', 'roll_over', 'rollover', 'rollover_tomorrow'])
  }
  const logRes = await db.collection('surplus_pool_logs').where(logWhere).get()
  const logs = logRes.data || []
  const rolledBackAmount = logs
    .filter((l) => l.reason === 'daily_surplus')
    .reduce((s, l) => s + (l.amount || 0), 0)
  if (logs.length) {
    await db.collection('surplus_pool_logs').where(logWhere).remove()
    out.removedLogs = logs.length
    out.rolledBackAmount = rolledBackAmount
  }

  // 2) 回退池余额与累计入池额（total_in 必须同步回退，否则与 balance 失配）
  if (rolledBackAmount > 0) {
    const pool = await getDocByUser('surplus_pools', userId)
    if (pool) {
      const newBalance = Math.max(0, (pool.balance || 0) - rolledBackAmount)
      const newTotalIn = Math.max(0, (pool.total_in || 0) - rolledBackAmount)
      await db.collection('surplus_pools').doc(pool._id).update({
        balance: newBalance,
        total_in: newTotalIn,
        updated_at: nowTs()
      })
    }
  }

  // 3) 删除非法日期的分配记录
  const allocWhere = { user_id: userId, date_key: illegalDateCond }
  const allocRes = await db.collection('surplus_allocations').where(allocWhere).get()
  if (allocRes.data && allocRes.data.length) {
    await db.collection('surplus_allocations').where(allocWhere).remove()
    out.removedAllocations = allocRes.data.length
  }

  // 4) 复位 daily_settlements：越界（创建日前）直接删；今天的清 settled_at 等日终 cron 正常补滚
  if (createdDateKey) {
    const preRes = await db.collection('daily_settlements')
      .where({ user_id: userId, date_key: db.command.lt(createdDateKey) })
      .get()
    if (preRes.data && preRes.data.length) {
      await db.collection('daily_settlements')
        .where({ user_id: userId, date_key: db.command.lt(createdDateKey) })
        .remove()
      out.removedSettlements = preRes.data.length
    }
  }
  const todayRes = await db.collection('daily_settlements').where({ user_id: userId, date_key: todayKey }).limit(1).get()
  const todaySettle = todayRes.data && todayRes.data[0]
  if (todaySettle) {
    await db.collection('daily_settlements').doc(todaySettle._id).update({
      settled_at: null,
      allocation_status: 'pending',
      allocation_id: null
    })
    out.resetSettlements++
  }

  return out
}

/** 首页仪表盘数据：当日交易（limit 50）+ 昨日结算快照。 */

module.exports = {
  recalculateDailySettlement,
  updateChallengeForDate,
  runDailySettlement,
  rollbackTodaySettlement,
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
