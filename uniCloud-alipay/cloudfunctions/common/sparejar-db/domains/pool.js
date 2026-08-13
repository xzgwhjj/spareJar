'use strict'

const db = require('../core/db')
const { getDocByUser, getDb, isDuplicateKeyError } = require('../core/db')
const { formatDateKey, formatMonthKey, nowTs } = require('../utils/date')
const money = require('../utils/money')
const ids = require('../utils/id')

async function listSavingsPoolLogs(userId) {
  const db = getDb()
  const poolRes = await db.collection('savings_pool').where({ user_id: userId }).limit(1).get()
  const pool = poolRes.data && poolRes.data[0]
  return (pool && pool.logs) || []
}

/**
 * 读取用户的结余分配历史（按时间倒序）。
 * @param {string} userId
 */

async function getSurplusPoolLogs(userId) {
  const db = getDb()
  const pool = await getDocByUser('surplus_pools', userId)
  const poolBalance = pool ? (pool.balance || 0) : 0
  const logsRes = await db.collection('surplus_pool_logs')
    .where({ user_id: userId })
    .orderBy('created_at', 'asc')
    .get()
  const logs = (logsRes.data || []).map((l) => ({
    direction: l.direction,
    amount: l.amount || 0,
    reason: l.reason || '',
    balance_after: l.balance_after,
    created_at: l.created_at,
    note: l.note || ''
  }))
  // 推导滚入次日可用额度 P
  let p = 0
  for (const l of logs) {
    if (l.reason === 'roll_over' && l.direction === 'in') p += l.amount
    else if (l.reason === 'roll_over_used' && l.direction === 'out') p -= l.amount
  }
  if (p < 0) p = 0
  if (p > poolBalance) p = poolBalance
  return { logs, roll_over_pending: p, pool_balance: poolBalance }
}

async function listSurplusAllocations(userId) {
  const db = getDb()
  const res = await db.collection('surplus_allocations')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .limit(100)
    .get()
  return (res.data || []).map((a) => ({ ...a }))
}

/**
 * 获取待分配的当日结余（最近一条 pending 且 surplus>0 的日结）。
 * 无则返回 null。
 * @param {string} userId
 */

async function getPendingAllocation(userId) {
  const db = getDb()
  const res = await db.collection('daily_settlements')
    .where({ user_id: userId, allocation_status: 'pending', surplus: db.command.gt(0) })
    .orderBy('date_key', 'desc')
    .limit(1)
    .get()
  const s = res.data && res.data[0]
  if (!s) return null
  return { date_key: s.date_key, surplus: s.surplus, settlement_id: s._id }
}

/**
 * 读取挑战中心所需全部数据：连续天数、今日/当月/当年挑战进度、最近7日热力图。
 * 金额单位为「分」。
 * @param {string} userId
 */

async function applySurplusPoolChange(userId, direction, amount, reason, refs = {}) {
  if (amount <= 0) throw new Error('surplus pool amount must be positive')
  const db = getDb()
  const pool = await getDocByUser('surplus_pools', userId)
  const current = pool ? pool.balance || 0 : 0
  const delta = direction === 'in' ? amount : -amount
  const balanceAfter = current + delta
  if (balanceAfter < 0) throw new Error('surplus pool balance insufficient')

  // 出池时优先消耗滚入次日的额度 P（规格 3.3/3.4）：补记 roll_over_used 流水，使 P 同步减少。
  // 仅当用户主动从结余池取出（consumeRollOver !== false）时生效；日结配对出入（allocateSurplus）传 false 跳过。
  const consumeRollOver = refs.consumeRollOver !== false
  let rollOverConsumed = 0
  if (direction === 'out' && consumeRollOver) {
    const logsRes = await db.collection('surplus_pool_logs').where({ user_id: userId }).get()
    let p = 0
    for (const l of logsRes.data || []) {
      if (l.reason === 'roll_over' && l.direction === 'in') p += l.amount || 0
      else if (l.reason === 'roll_over_used' && l.direction === 'out') p -= l.amount || 0
    }
    if (p < 0) p = 0
    if (p > current) p = current
    rollOverConsumed = Math.min(amount, p)
  }

  const ts = nowTs()
  if (pool) {
    await db.collection('surplus_pools').doc(pool._id).update({
      balance: balanceAfter,
      total_in: direction === 'in' ? db.command.inc(amount) : pool.total_in,
      total_out: direction === 'out' ? db.command.inc(amount) : pool.total_out,
      updated_at: ts
    })
  } else {
    try {
      await db.collection('surplus_pools').add({
        user_id: userId,
        balance: balanceAfter,
        total_in: direction === 'in' ? amount : 0,
        total_out: direction === 'out' ? amount : 0,
        updated_at: ts
      })
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err
      // 并发下他人已建池：改为增量更新，避免覆盖对方余额
      const raced = await getDocByUser('surplus_pools', userId)
      if (!raced) throw err
      const racedAfter = (raced.balance || 0) + delta
      if (racedAfter < 0) throw new Error('surplus pool balance insufficient')
      await db.collection('surplus_pools').doc(raced._id).update({
        balance: racedAfter,
        total_in: direction === 'in' ? db.command.inc(amount) : raced.total_in,
        total_out: direction === 'out' ? db.command.inc(amount) : raced.total_out,
        updated_at: ts
      })
      return racedAfter
    }
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

  // 补记 roll_over_used（消耗滚入次日额度），不影响池余额 B（已在上面的 out 中扣除）
  if (rollOverConsumed > 0) {
    await db.collection('surplus_pool_logs').add({
      user_id: userId,
      direction: 'out',
      amount: rollOverConsumed,
      balance_after: balanceAfter,
      reason: 'roll_over_used',
      ref_type: refs.ref_type || null,
      ref_id: refs.ref_id || null,
      date_key: refs.date_key || null,
      note: refs.note || '',
      created_at: ts
    })
  }
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
    try {
      await db.collection('savings_pools').add({
        user_id: userId,
        balance: balanceAfter,
        total_in: direction === 'in' ? amount : 0,
        total_out: direction === 'out' ? amount : 0,
        month_withdrawn: direction === 'out' ? amount : 0,
        withdraw_month_key: direction === 'out' ? monthKey : null,
        updated_at: ts
      })
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err
      // 并发下他人已建池：改为增量更新，避免覆盖对方余额
      const raced = await getDocByUser('savings_pools', userId)
      if (!raced) throw err
      const racedAfter = (raced.balance || 0) + delta
      if (racedAfter < 0) throw new Error('savings pool balance insufficient')
      const racedUpdate = { ...updateData, balance: racedAfter }
      if (direction === 'out') {
        if (raced.withdraw_month_key === monthKey) {
          racedUpdate.month_withdrawn = db.command.inc(amount)
        } else {
          racedUpdate.month_withdrawn = amount
          racedUpdate.withdraw_month_key = monthKey
        }
      }
      await db.collection('savings_pools').doc(raced._id).update(racedUpdate)
      return racedAfter
    }
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


async function depositSavingsPool(userId, amount, reason = 'manual') {
  return await applySavingsPoolChange(userId, 'in', amount, reason, {})
}

/**
 * 通用存款池取出（回累计结余池由调用方决定；此处仅扣减存款池）。
 * 含 P2 每月比例限制：本月已取 + 本次 ≤ 余额 × savings_withdraw_ratio（默认 1）。
 * @param {string} userId
 * @param {number} amount 分
 * @param {string} [reason]
 */

async function withdrawSavingsPool(userId, amount, reason = 'manual') {
  if (amount <= 0) throw new Error('savings pool withdraw amount must be positive')
  const db = getDb()
  const pool = await getDocByUser('savings_pools', userId)
  const balance = pool ? pool.balance || 0 : 0
  const settings = await getDocByUser('user_settings', userId)
  const ratioLimit = settings && typeof settings.savings_withdraw_ratio === 'number' ? settings.savings_withdraw_ratio : 1
  const monthKey = formatMonthKey()
  const monthWithdrawn = pool && pool.withdraw_month_key === monthKey ? (pool.month_withdrawn || 0) : 0
  const maxMonthly = Math.floor(balance * ratioLimit)
  if (monthWithdrawn + amount > maxMonthly) {
    throw new Error('本月存款池取出已超过比例上限')
  }
  return await applySavingsPoolChange(userId, 'out', amount, reason, {})
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

/**
 * 滚入次日标记流水：日结盈余已通过 applySurplusPoolChange(in, 'daily_surplus') 进池，
 * 此处仅补记一条 reason='roll_over' 的标签流水（不改动池余额 B），用于推导滚入次日可用额度 P。
 * @param {string} userId
 * @param {number} amount 分
 * @param {object} [refs]
 */
async function markRollOverLog(userId, amount, refs = {}) {
  const db = getDb()
  const pool = await getDocByUser('surplus_pools', userId)
  const balanceAfter = pool ? (pool.balance || 0) : 0
  const ts = nowTs()
  await db.collection('surplus_pool_logs').add({
    user_id: userId,
    direction: 'in',
    amount,
    balance_after: balanceAfter,
    reason: 'roll_over',
    ref_type: refs.ref_type || null,
    ref_id: refs.ref_id || null,
    date_key: refs.date_key || null,
    note: refs.note || '',
    created_at: ts
  })
  return balanceAfter
}


module.exports = {
  listSavingsPoolLogs,
  getSurplusPoolLogs,
  listSurplusAllocations,
  getPendingAllocation,
  applySurplusPoolChange,
  applySavingsPoolChange,
  depositSavingsPool,
  withdrawSavingsPool,
  applyAccountBalanceChange,
  markRollOverLog,
}
