'use strict'

// 二级分组码（中层），按 type 隔离；前端用 code→{名称,图标} 不可变 map 展示
const PRESET_EXPENSE_CATEGORIES = [
  // 日常固定开销 fixed
  { group: 'fixed', name: '房租', icon: '🏠', sort_order: 1 },
  { group: 'fixed', name: '房贷', icon: '🏦', sort_order: 2 },
  { group: 'fixed', name: '车贷', icon: '🚗', sort_order: 3 },
  { group: 'fixed', name: '水费', icon: '💧', sort_order: 4 },
  { group: 'fixed', name: '电费', icon: '💡', sort_order: 5 },
  { group: 'fixed', name: '燃气费', icon: '🔥', sort_order: 6 },
  { group: 'fixed', name: '物业费', icon: '🏢', sort_order: 7 },
  { group: 'fixed', name: '宽带网络', icon: '🌐', sort_order: 8 },
  { group: 'fixed', name: '固定话费', icon: '📱', sort_order: 9 },
  { group: 'fixed', name: '长期保险', icon: '🛡️', sort_order: 10 },
  { group: 'fixed', name: '订阅会员', icon: '📺', sort_order: 11 },
  // 日常变动开销 variable
  { group: 'variable', name: '餐饮', icon: '🍜', sort_order: 1 },
  { group: 'variable', name: '外卖', icon: '🥡', sort_order: 2 },
  { group: 'variable', name: '咖啡奶茶', icon: '🧋', sort_order: 3 },
  { group: 'variable', name: '生鲜超市', icon: '🛒', sort_order: 4 },
  { group: 'variable', name: '便利店', icon: '🏪', sort_order: 5 },
  { group: 'variable', name: '交通', icon: '🚌', sort_order: 6 },
  { group: 'variable', name: '打车', icon: '🚕', sort_order: 7 },
  { group: 'variable', name: '加油', icon: '⛽', sort_order: 8 },
  { group: 'variable', name: '停车费', icon: '🅿️', sort_order: 9 },
  { group: 'variable', name: '通讯费', icon: '📞', sort_order: 10 },
  { group: 'variable', name: '快递', icon: '📦', sort_order: 11 },
  // 生活改善类 lifestyle
  { group: 'lifestyle', name: '服饰', icon: '👕', sort_order: 1 },
  { group: 'lifestyle', name: '鞋包', icon: '👟', sort_order: 2 },
  { group: 'lifestyle', name: '美容美发', icon: '💇', sort_order: 3 },
  { group: 'lifestyle', name: '护肤化妆', icon: '💄', sort_order: 4 },
  { group: 'lifestyle', name: '家居用品', icon: '🛋️', sort_order: 5 },
  { group: 'lifestyle', name: '厨具', icon: '🍳', sort_order: 6 },
  { group: 'lifestyle', name: '数码电器', icon: '📱', sort_order: 7 },
  // 休闲娱乐类 leisure
  { group: 'leisure', name: '旅游', icon: '✈️', sort_order: 1 },
  { group: 'leisure', name: '酒店住宿', icon: '🏨', sort_order: 2 },
  { group: 'leisure', name: '电影演出', icon: '🎬', sort_order: 3 },
  { group: 'leisure', name: '游戏', icon: '🎮', sort_order: 4 },
  { group: 'leisure', name: '运动健身', icon: '🏋️', sort_order: 5 },
  { group: 'leisure', name: '爱好手工', icon: '🎨', sort_order: 6 },
  { group: 'leisure', name: '宠物用品', icon: '🐱', sort_order: 7 },
  { group: 'leisure', name: '书籍杂志', icon: '📚', sort_order: 8 },
  // 医疗健康类 medical
  { group: 'medical', name: '门诊', icon: '🏥', sort_order: 1 },
  { group: 'medical', name: '药品', icon: '💊', sort_order: 2 },
  { group: 'medical', name: '体检', icon: '🩺', sort_order: 3 },
  { group: 'medical', name: '医疗险', icon: '🛡️', sort_order: 4 },
  { group: 'medical', name: '牙科', icon: '🦷', sort_order: 5 },
  // 教育成长类 education
  { group: 'education', name: '学费', icon: '🎓', sort_order: 1 },
  { group: 'education', name: '培训课程', icon: '📖', sort_order: 2 },
  { group: 'education', name: '网课', icon: '💻', sort_order: 3 },
  { group: 'education', name: '考试报名', icon: '📝', sort_order: 4 },
  { group: 'education', name: '育儿早教', icon: '👶', sort_order: 5 },
  // 人情社交类 social
  { group: 'social', name: '礼金份子', icon: '🧧', sort_order: 1 },
  { group: 'social', name: '聚会请客', icon: '🍻', sort_order: 2 },
  { group: 'social', name: '人情往来', icon: '🎁', sort_order: 3 },
  { group: 'social', name: '捐赠公益', icon: '❤️', sort_order: 4 },
  // 意外损失 unexpected
  { group: 'unexpected', name: '维修费', icon: '🔧', sort_order: 1 },
  { group: 'unexpected', name: '罚款', icon: '💸', sort_order: 2 },
  { group: 'unexpected', name: '遗失损坏', icon: '💔', sort_order: 3 },
  { group: 'unexpected', name: '其他', icon: '📦', sort_order: 4 }
]

const PRESET_INCOME_CATEGORIES = [
  // 主动收入 active
  { group: 'active', name: '工资薪资', icon: '💰', sort_order: 1 },
  { group: 'active', name: '奖金', icon: '🏆', sort_order: 2 },
  { group: 'active', name: '绩效', icon: '📊', sort_order: 3 },
  { group: 'active', name: '兼职', icon: '💼', sort_order: 4 },
  { group: 'active', name: '劳务报酬', icon: '🤝', sort_order: 5 },
  { group: 'active', name: '稿费', icon: '🖊️', sort_order: 6 },
  { group: 'active', name: '经营收入', icon: '🏪', sort_order: 7 },
  // 被动收入 passive
  { group: 'passive', name: '房租收入', icon: '🏠', sort_order: 1 },
  { group: 'passive', name: '理财收益', icon: '📈', sort_order: 2 },
  { group: 'passive', name: '股息分红', icon: '💹', sort_order: 3 },
  { group: 'passive', name: '利息', icon: '🏦', sort_order: 4 },
  { group: 'passive', name: '版权版税', icon: '📜', sort_order: 5 },
  { group: 'passive', name: '投资回报', icon: '💎', sort_order: 6 },
  // 转移性收入 transfer
  { group: 'transfer', name: '退款', icon: '↩️', sort_order: 1 },
  { group: 'transfer', name: '报销', icon: '🧾', sort_order: 2 },
  { group: 'transfer', name: '礼金收受', icon: '🧧', sort_order: 3 },
  { group: 'transfer', name: '政府补贴', icon: '🏛️', sort_order: 4 },
  { group: 'transfer', name: '赔偿金', icon: '💼', sort_order: 5 },
  { group: 'transfer', name: '赡养资助', icon: '🤲', sort_order: 6 },
  // 其他偶然收入 occasional
  { group: 'occasional', name: '中奖', icon: '🎰', sort_order: 1 },
  { group: 'occasional', name: '二手转卖', icon: '🔄', sort_order: 2 },
  { group: 'occasional', name: '红包', icon: '🧧', sort_order: 3 },
  { group: 'occasional', name: '其他', icon: '📦', sort_order: 4 }
]

// name→group 查表，供老数据回填（历史预置分类缺 group 时补齐）
const PRESET_CATEGORY_GROUP = {}
for (const c of PRESET_EXPENSE_CATEGORIES) PRESET_CATEGORY_GROUP[`expense:${c.name}`] = c.group
for (const c of PRESET_INCOME_CATEGORIES) PRESET_CATEGORY_GROUP[`income:${c.name}`] = c.group

const DEFAULT_LEDGER = {
  name: '总账本',
  icon: '📒',
  is_system: true,
  is_default: false,
  is_shared: false,
  sort_order: 0
}

function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

function formatDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function nowTs() {
  return Date.now()
}

function calcProgressPct(saved, target) {
  if (!target || target <= 0) return 0
  return Math.min(100, Math.round((saved / target) * 10000) / 100)
}

function getDb() {
  return uniCloud.database()
}

async function getDocByUser(collection, userId, extraWhere = {}) {
  const db = getDb()
  const res = await db.collection(collection).where({ user_id: userId, ...extraWhere }).limit(1).get()
  return res.data && res.data[0]
}

async function getEffectiveBaseLimit(userId, dateKey) {
  const settings = await getDocByUser('user_settings', userId)
  if (!settings) return 10000
  if (settings.pending_base_limit && settings.limit_effective_date && settings.limit_effective_date <= dateKey) {
    return settings.pending_base_limit
  }
  return settings.daily_base_limit || 10000
}

async function sumDailyLimitExpenses(userId, dateKey) {
  const db = getDb()
  const res = await db.collection('transactions').where({
    user_id: userId,
    date_key: dateKey,
    type: 'expense',
    include_in_daily_limit: true,
    deleted_at: db.command.eq(null)
  }).field({ amount: true }).get()
  return (res.data || []).reduce((sum, row) => sum + (row.amount || 0), 0)
}

async function applySurplusPoolChange(userId, direction, amount, reason, refs = {}) {
  if (amount <= 0) throw new Error('surplus pool amount must be positive')
  const db = getDb()
  const pool = await getDocByUser('surplus_pools', userId)
  const current = pool ? pool.balance || 0 : 0
  const delta = direction === 'in' ? amount : -amount
  const balanceAfter = current + delta
  if (balanceAfter < 0) throw new Error('surplus pool balance insufficient')

  const ts = nowTs()
  if (pool) {
    await db.collection('surplus_pools').doc(pool._id).update({
      balance: balanceAfter,
      total_in: direction === 'in' ? db.command.inc(amount) : pool.total_in,
      total_out: direction === 'out' ? db.command.inc(amount) : pool.total_out,
      updated_at: ts
    })
  } else {
    await db.collection('surplus_pools').add({
      user_id: userId,
      balance: balanceAfter,
      total_in: direction === 'in' ? amount : 0,
      total_out: direction === 'out' ? amount : 0,
      updated_at: ts
    })
  }

  await db.collection('surplus_pool_logs').add({
    user_id: userId,
    direction,
    amount,
    balance_after: balanceAfter,
    reason,
    ref_type: refs.ref_type || null,
    ref_id: refs.ref_id || null,
    date_key: refs.date_key || null,
    note: refs.note || '',
    created_at: ts
  })
  return balanceAfter
}

async function applySavingsPoolChange(userId, direction, amount, reason, refs = {}) {
  if (amount <= 0) throw new Error('savings pool amount must be positive')
  const db = getDb()
  const pool = await getDocByUser('savings_pools', userId)
  const current = pool ? pool.balance || 0 : 0
  const delta = direction === 'in' ? amount : -amount
  const balanceAfter = current + delta
  if (balanceAfter < 0) throw new Error('savings pool balance insufficient')

  const ts = nowTs()
  const monthKey = formatMonthKey()
  const updateData = {
    balance: balanceAfter,
    total_in: direction === 'in' ? db.command.inc(amount) : undefined,
    total_out: direction === 'out' ? db.command.inc(amount) : undefined,
    updated_at: ts
  }
  if (direction === 'out') {
    if (pool && pool.withdraw_month_key === monthKey) {
      updateData.month_withdrawn = db.command.inc(amount)
    } else {
      updateData.month_withdrawn = amount
      updateData.withdraw_month_key = monthKey
    }
  }
  Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k])

  if (pool) {
    await db.collection('savings_pools').doc(pool._id).update(updateData)
  } else {
    await db.collection('savings_pools').add({
      user_id: userId,
      balance: balanceAfter,
      total_in: direction === 'in' ? amount : 0,
      total_out: direction === 'out' ? amount : 0,
      month_withdrawn: direction === 'out' ? amount : 0,
      withdraw_month_key: direction === 'out' ? monthKey : null,
      updated_at: ts
    })
  }

  await db.collection('savings_pool_logs').add({
    user_id: userId,
    direction,
    amount,
    balance_after: balanceAfter,
    reason,
    ref_type: refs.ref_type || null,
    ref_id: refs.ref_id || null,
    date_key: refs.date_key || null,
    note: refs.note || '',
    created_at: ts
  })
  return balanceAfter
}

async function applyWishFundChange(userId, wishId, direction, amount, source, refs = {}) {
  if (amount <= 0) throw new Error('wish fund amount must be positive')
  const db = getDb()
  const wishRes = await db.collection('wishes').doc(wishId).get()
  const wish = wishRes.data && wishRes.data[0]
  if (!wish || wish.user_id !== userId) throw new Error('wish not found')

  const saved = wish.saved_amount || 0
  const delta = direction === 'in' ? amount : -amount
  const savedAfter = saved + delta
  if (savedAfter < 0) throw new Error('wish saved amount insufficient')
  if (savedAfter > wish.target_amount) throw new Error('wish saved amount exceeds target')

  const ts = nowTs()
  await db.collection('wishes').doc(wishId).update({
    saved_amount: savedAfter,
    progress_pct: calcProgressPct(savedAfter, wish.target_amount),
    status: savedAfter >= wish.target_amount ? 'completed' : wish.status,
    completed_at: savedAfter >= wish.target_amount ? ts : wish.completed_at,
    updated_at: ts
  })

  await db.collection('wish_fund_logs').add({
    user_id: userId,
    wish_id: wishId,
    direction,
    amount,
    saved_after: savedAfter,
    source,
    ref_id: refs.ref_id || null,
    note: refs.note || '',
    created_at: ts
  })
  return savedAfter
}

async function applyAccountBalanceChange(userId, accountId, amountDelta, changeType, refs = {}) {
  const db = getDb()
  const accRes = await db.collection('asset_accounts').doc(accountId).get()
  const account = accRes.data && accRes.data[0]
  if (!account || account.user_id !== userId) throw new Error('asset account not found')

  const balanceAfter = (account.current_balance || 0) + amountDelta
  const ts = nowTs()
  await db.collection('asset_accounts').doc(accountId).update({
    current_balance: balanceAfter,
    updated_at: ts
  })

  await db.collection('account_balance_logs').add({
    user_id: userId,
    account_id: accountId,
    change_type: changeType,
    amount_delta: amountDelta,
    balance_after: balanceAfter,
    transaction_id: refs.transaction_id || null,
    counter_account_id: refs.counter_account_id || null,
    holding_id: refs.holding_id || null,
    note: refs.note || '',
    created_at: ts
  })
  return balanceAfter
}

async function recalculateDailySettlement(userId, dateKey) {
  const db = getDb()
  const baseLimit = await getEffectiveBaseLimit(userId, dateKey)
  const pool = await getDocByUser('surplus_pools', userId)
  const surplusPoolBalance = pool ? pool.balance || 0 : 0
  const consumed = await sumDailyLimitExpenses(userId, dateKey)
  const consumedFromBase = Math.min(consumed, baseLimit)
  const consumedFromSurplus = Math.max(0, consumed - baseLimit)
  const availableStart = baseLimit + surplusPoolBalance
  const availableEnd = availableStart - consumed
  const surplus = Math.max(0, baseLimit - consumedFromBase)
  const overAmount = Math.max(0, consumed - baseLimit - surplusPoolBalance)
  const isOverLimit = overAmount > 0 || consumed > baseLimit + surplusPoolBalance

  const existing = await db.collection('daily_settlements').where({ user_id: userId, date_key: dateKey }).limit(1).get()
  const payload = {
    user_id: userId,
    date_key: dateKey,
    base_limit: baseLimit,
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

  if (existing.data && existing.data[0]) {
    const doc = existing.data[0]
    await db.collection('daily_settlements').doc(doc._id).update(payload)
    return { ...doc, ...payload }
  }

  const ts = nowTs()
  const addRes = await db.collection('daily_settlements').add({
    ...payload,
    allocation_status: 'pending',
    allocation_id: null,
    penalty_applied: false,
    settled_at: null,
    created_at: ts
  })
  return { _id: addRes.id, ...payload, allocation_status: 'pending' }
}

async function updateChallengeForDate(userId, dateKey, consumed, baseLimit) {
  const db = getDb()
  const monthKey = dateKey.slice(0, 7)
  const yearKey = dateKey.slice(0, 4)
  const isSuccess = consumed <= baseLimit

  const dailyRes = await db.collection('challenge_records').where({
    user_id: userId,
    challenge_type: 'daily',
    period_key: dateKey
  }).limit(1).get()

  const dailyPayload = {
    user_id: userId,
    challenge_type: 'daily',
    period_key: dateKey,
    consumed_amount: consumed,
    base_limit_snapshot: baseLimit,
    is_success: isSuccess,
    status: 'completed',
    completed_at: nowTs(),
    updated_at: nowTs()
  }
  if (dailyRes.data && dailyRes.data[0]) {
    await db.collection('challenge_records').doc(dailyRes.data[0]._id).update(dailyPayload)
  } else {
    await db.collection('challenge_records').add({ ...dailyPayload, created_at: nowTs() })
  }

  for (const [type, key] of [['monthly', monthKey], ['yearly', yearKey]]) {
    const res = await db.collection('challenge_records').where({
      user_id: userId,
      challenge_type: type,
      period_key: key
    }).limit(1).get()
    if (res.data && res.data[0]) {
      await db.collection('challenge_records').doc(res.data[0]._id).update({
        consumed_amount: db.command.inc(consumed),
        updated_at: nowTs()
      })
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
    if (streak) {
      await db.collection('user_streaks').doc(streak._id).update(payload)
    } else {
      await db.collection('user_streaks').add({ user_id: userId, penalty_streak_deducted: 0, ...payload })
    }
  } else {
    const payload = {
      daily_current_streak: 0,
      last_fail_date_key: dateKey,
      updated_at: ts
    }
    if (streak) {
      await db.collection('user_streaks').doc(streak._id).update(payload)
    } else {
      await db.collection('user_streaks').add({
        user_id: userId,
        daily_current_streak: 0,
        daily_max_streak: 0,
        penalty_streak_deducted: 0,
        ...payload
      })
    }
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
  await updateChallengeForDate(userId, dateKey, settlement.consumed, settlement.base_limit)

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

  if (settlement.is_over_limit && settings && settings.over_limit_penalty_enabled) {
    await applyOverLimitPenalty(userId, dateKey, settlement)
  }

  return { skipped: false, settlement, allocation: allocationResult }
}

async function allocateSurplus(userId, dateKey, items, isAuto = false) {
  const db = getDb()
  const settlementRes = await db.collection('daily_settlements').where({ user_id: userId, date_key: dateKey }).limit(1).get()
  const settlement = settlementRes.data && settlementRes.data[0]
  if (!settlement) throw new Error('settlement not found')
  if (settlement.allocation_status !== 'pending') throw new Error('settlement already allocated')

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
  const allocRes = await db.collection('surplus_allocations').add({
    user_id: userId,
    date_key: dateKey,
    settlement_id: settlement._id,
    total_amount: total,
    items: allocItems,
    is_auto: isAuto,
    created_at: ts
  })

  for (const item of allocItems) {
    if (item.target_type === 'roll_over') {
      await applySurplusPoolChange(userId, 'in', item.amount, 'daily_surplus', {
        ref_type: 'allocation',
        ref_id: allocRes.id,
        date_key: dateKey
      })
    } else if (item.target_type === 'wish') {
      await applyWishFundChange(userId, item.wish_id, 'in', item.amount, 'surplus_allocation', {
        ref_id: allocRes.id
      })
    } else if (item.target_type === 'savings_pool') {
      await applySavingsPoolChange(userId, 'in', item.amount, 'surplus_in', {
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

  await db.collection('daily_settlements').doc(settlement._id).update({ penalty_applied: true })
}

/**
 * 幂等确保某集合存在一条 user_id 归属的文档；已存在则直接返回，避免重复插入。
 * @returns {Promise<object>} 已存在文档或新建文档（含 _id）
 */
async function ensureDoc(collection, userId, buildDoc) {
  const existing = await getDocByUser(collection, userId)
  if (existing) return existing
  const doc = buildDoc()
  const res = await getDb().collection(collection).add(doc)
  return { _id: res.id, ...doc }
}

async function initUser(userId, profile = {}) {
  const ts = nowTs()

  // users 档案：独立幂等，created 标记仅用于返回语义
  const existingUser = await getDocByUser('users', userId)
  let userDoc = existingUser
  let isNew = false
  if (!existingUser) {
    userDoc = {
      user_id: userId,
      nickname: profile.nickname || '',
      avatar_url: profile.avatar_url || '',
      timezone: profile.timezone || 'Asia/Shanghai',
      onboarding_done: false,
      onboarding_step: 0,
      is_guest: false,
      jar_skin_id: 'classic_glass',
      jar_skins_unlocked: ['classic_glass'],
      zodiac: profile.zodiac || null,
      constellation: profile.constellation || null,
      birthday: profile.birthday || null,
      created_at: ts,
      updated_at: ts,
      deleted_at: null
    }
    const res = await getDb().collection('users').add(userDoc)
    userDoc = { _id: res.id, ...userDoc }
    isNew = true
  }

  // 以下各实体独立幂等创建，任意一步中途失败都不影响其余，重试可补齐
  await ensureDoc('user_settings', userId, () => ({
    user_id: userId,
    daily_base_limit: 10000,
    pending_base_limit: null,
    limit_effective_date: null,
    default_surplus_action: 'roll_over',
    default_wish_id: null,
    refund_restore_limit: true,
    challenge_ledger_id: null,
    max_custom_ledgers: 5,
    notify_over_limit: true,
    notify_daily_surplus: true,
    notify_streak_risk: true,
    meal_tracking_enabled: false,
    fat_loss_mode_enabled: false,
    savings_withdraw_limit_pct: null,
    over_limit_penalty_enabled: false,
    penalty_streak_deduct: 1,
    asset_view_mode: 'disposable',
    updated_at: ts
  }))

  await ensureDoc('surplus_pools', userId, () => ({
    user_id: userId, balance: 0, total_in: 0, total_out: 0, updated_at: ts
  }))

  await ensureDoc('savings_pools', userId, () => ({
    user_id: userId, balance: 0, total_in: 0, total_out: 0,
    month_withdrawn: 0, withdraw_month_key: null, updated_at: ts
  }))

  await ensureDoc('user_streaks', userId, () => ({
    user_id: userId,
    daily_current_streak: 0,
    daily_max_streak: 0,
    last_success_date_key: null,
    last_fail_date_key: null,
    penalty_streak_deducted: 0,
    updated_at: ts
  }))

  const ledger = await ensureDoc('ledgers', userId, () => ({
    user_id: userId,
    ...DEFAULT_LEDGER,
    created_at: ts
  }))

  // 预置分类：按 type+name 去重，重复登录不会插入重复分类
  const existingCats = await getDb().collection('categories')
    .where({ user_id: userId })
    .field({ name: true, type: true, group: true, is_system: true, _id: true })
    .get()
  const have = new Set()
  const backfillUpdates = []
  for (const c of (existingCats.data || [])) {
    have.add(`${c.type}:${c.name}`)
    // 老数据回填：系统预置分类若缺 group，按 name→group 查表补上
    if (c.is_system && !c.group) {
      const g = PRESET_CATEGORY_GROUP[`${c.type}:${c.name}`]
      if (g) backfillUpdates.push({ _id: c._id, group: g })
    }
  }
  for (const u of backfillUpdates) {
    await getDb().collection('categories').doc(u._id).update({ group: u.group })
  }
  const categoryDocs = []
  for (const c of PRESET_EXPENSE_CATEGORIES) {
    if (have.has(`expense:${c.name}`)) continue
    categoryDocs.push({
      user_id: userId, type: 'expense', group: c.group, name: c.name, icon: c.icon,
      is_system: true, is_hidden: false, sort_order: c.sort_order, merged_to_id: null, created_at: ts
    })
  }
  for (const c of PRESET_INCOME_CATEGORIES) {
    if (have.has(`income:${c.name}`)) continue
    categoryDocs.push({
      user_id: userId, type: 'income', group: c.group, name: c.name, icon: c.icon,
      is_system: true, is_hidden: false, sort_order: c.sort_order, merged_to_id: null, created_at: ts
    })
  }
  for (const doc of categoryDocs) {
    await getDb().collection('categories').add(doc)
  }

  return { created: isNew, user: userDoc, default_ledger_id: ledger._id }
}

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
    transaction_at: data.transaction_at || ts,
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

  if (data.account_id) {
    let delta = 0
    if (data.type === 'expense') delta = -data.amount
    else if (data.type === 'income' || data.type === 'refund') delta = data.amount
    else if (data.type === 'transfer') delta = -data.amount
    if (delta !== 0) {
      await applyAccountBalanceChange(userId, data.account_id, delta, 'transaction', {
        transaction_id: transactionId
      })
    }
  }
  if (data.type === 'transfer' && data.to_account_id) {
    await applyAccountBalanceChange(userId, data.to_account_id, data.amount, 'transfer_in', {
      transaction_id: transactionId,
      counter_account_id: data.account_id
    })
  }

  if (data.type === 'expense' && txDoc.include_in_daily_limit) {
    const settlement = await recalculateDailySettlement(userId, dateKey)
    const pool = await getDocByUser('surplus_pools', userId)
    const poolBal = pool ? pool.balance || 0 : 0
    const baseLimit = settlement.base_limit
    const consumed = settlement.consumed
    const needFromSurplus = Math.max(0, consumed - baseLimit)
    const prevConsumed = consumed - data.amount
    const prevNeed = Math.max(0, prevConsumed - baseLimit)
    const surplusUsed = needFromSurplus - prevNeed
    if (surplusUsed > 0 && poolBal >= surplusUsed) {
      await applySurplusPoolChange(userId, 'out', surplusUsed, 'consume_deduct', {
        ref_type: 'transaction',
        ref_id: transactionId,
        date_key: dateKey
      })
      await recalculateDailySettlement(userId, dateKey)
    }
  } else {
    await recalculateDailySettlement(userId, dateKey)
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
      await applyAccountBalanceChange(userId, tx.account_id, delta, 'refund', {
        transaction_id: transactionId,
        note: 'transaction soft delete rollback'
      })
    }
  }
  if (tx.type === 'transfer' && tx.to_account_id) {
    await applyAccountBalanceChange(userId, tx.to_account_id, -tx.amount, 'refund', {
      transaction_id: transactionId,
      counter_account_id: tx.account_id,
      note: 'transfer rollback'
    })
  }

  const settlement = await recalculateDailySettlement(userId, tx.date_key)
  await updateChallengeForDate(userId, tx.date_key, settlement.consumed, settlement.base_limit)

  return { deleted: true, transaction_id: transactionId }
}

module.exports = {
  PRESET_EXPENSE_CATEGORIES,
  PRESET_INCOME_CATEGORIES,
  DEFAULT_LEDGER,
  formatDateKey,
  formatMonthKey,
  parseDateKey,
  nowTs,
  initUser,
  applySurplusPoolChange,
  applySavingsPoolChange,
  applyWishFundChange,
  applyAccountBalanceChange,
  recalculateDailySettlement,
  runDailySettlement,
  allocateSurplus,
  createTransaction,
  softDeleteTransaction,
  getEffectiveBaseLimit,
  getDocByUser
}
