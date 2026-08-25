'use strict'

const db = require('../core/db')
const { isDuplicateKeyError } = require('../core/db')
const { formatDateKey, nowTs, getDb } = require('../utils/date')
const money = require('../utils/money')
const ids = require('../utils/id')
const { ACCOUNT_CLASS_DEFAULTS } = require('../core/constants')
const pool = require('./pool')

async function getAssetAccountById(userId, accountId) {
  const db = getDb()
  const res = await db.collection('asset_accounts').doc(accountId).get()
  const acc = res.data && res.data[0]
  if (!acc || acc.user_id !== userId) throw new Error('asset account not found')
  return acc
}


async function getHoldingById(userId, holdingId) {
  const db = getDb()
  const res = await db.collection('investment_holdings').doc(holdingId).get()
  const h = res.data && res.data[0]
  if (!h || h.user_id !== userId) throw new Error('holding not found')
  return h
}

/**
 * 新建资产账户。
 * @param {string} userId
 * @param {{ account_class?: 'daily'|'special'|'investment', account_subtype?: string, name: string, initial_balance?: number, annual_withdraw_quota?: number, sort_order?: number }} data
 */

async function createAssetAccount(userId, data) {
  const db = getDb()
  const cls = data.account_class || 'daily'
  if (!ACCOUNT_CLASS_DEFAULTS[cls]) throw new Error('invalid account_class')
  const subtype = data.account_subtype ||
    (cls === 'investment' ? 'fund' : cls === 'special' ? 'provident_fund' : 'cash')
  const name = (data.name || '').trim()
  if (!name) throw new Error('账户名不能为空')
  const initial = Math.round(Number(data.initial_balance) || 0)
  const def = ACCOUNT_CLASS_DEFAULTS[cls]
  const ts = nowTs()
  const doc = {
    user_id: userId,
    account_class: cls,
    account_subtype: subtype,
    name,
    initial_balance: initial,
    current_balance: initial,
    icon: data.icon || '',
    include_in_disposable: def.include_in_disposable,
    include_in_daily_limit: def.include_in_daily_limit,
    include_in_total_asset: def.include_in_total_asset,
    annual_withdraw_quota: Math.round(Number(data.annual_withdraw_quota) || 0),
    annual_withdrawn: 0,
    quota_year: String(new Date().getFullYear()),
    sort_order: Math.round(Number(data.sort_order) || 0),
    deleted_at: null,
    created_at: ts,
    updated_at: ts
  }
  let res
  try {
    res = await db.collection('asset_accounts').add(doc)
  } catch (err) {
    // uk_user_name：同名账户已存在
    if (isDuplicateKeyError(err)) throw new Error('该账户名称已存在')
    throw err
  }
  const accountId = res.id
  if (initial !== 0) {
    await db.collection('account_balance_logs').add({
      user_id: userId,
      account_id: accountId,
      change_type: 'adjust',
      amount_delta: initial,
      balance_after: initial,
      transaction_id: null,
      counter_account_id: null,
      holding_id: null,
      note: '初始余额',
      created_at: ts
    })
  }
  return { _id: accountId, ...doc }
}

/**
 * 查询资产账户 + 汇总。投资账户附带持仓与市场值。
 * @returns {Promise<{ accounts: Array, totals: { disposable:number, investment:number, withInvest:number, full:number, specialExtra:number } }>}
 */

async function getAssetAccounts(userId) {
  const db = getDb()
  const accRes = await db.collection('asset_accounts')
    .where({ user_id: userId, deleted_at: db.command.eq(null) })
    .orderBy('account_class', 'asc')
    .orderBy('sort_order', 'asc')
    .get()
  const accounts = accRes.data || []
  const investIds = accounts.filter((a) => a.account_class === 'investment').map((a) => a._id)
  /** @type {Record<string, Array>} */
  const holdingsMap = {}
  if (investIds.length) {
    const hRes = await db.collection('investment_holdings')
      .where({ user_id: userId, account_id: db.command.in(investIds), deleted_at: db.command.eq(null) })
      .orderBy('created_at', 'asc')
      .get()
    for (const h of (hRes.data || [])) {
      if (!holdingsMap[h.account_id]) holdingsMap[h.account_id] = []
      holdingsMap[h.account_id].push(h)
    }
  }
  let disposable = 0
  let investment = 0
  let specialExtra = 0
  let liabilities = 0
  let investGain = 0
  const list = accounts.map((a) => {
    const balance = a.current_balance || 0
    let marketValue = 0
    let profitLoss = 0
    /** @type {Array} */
    let holdings = []
    if (a.account_class === 'investment') {
      holdings = (holdingsMap[a._id] || []).map((h) => {
        const mv = h.market_value || 0
        const pl = h.profit_loss != null ? h.profit_loss : mv - (h.cost_basis || 0)
        marketValue += mv
        profitLoss += pl
        return Object.assign({}, h, { market_value: mv, profit_loss: pl })
      })
    }
    if (a.account_class === 'liability') {
      // 负债：余额表示"欠多少"，单独汇总，不计入资产
      liabilities += balance
    } else {
      if (a.include_in_disposable) disposable += balance
      if (a.include_in_total_asset && !a.include_in_disposable) specialExtra += balance
    }
    if (a.account_class === 'investment') investGain += profitLoss
    return Object.assign({}, a, { balance, holdings, market_value: marketValue, profit_loss: profitLoss })
  })
  investment = list.reduce((s, a) => s + (a.account_class === 'investment' ? a.market_value : 0), 0)
  const withInvest = disposable + investment
  const full = withInvest + specialExtra
  const net = full - liabilities
  return {
    accounts: list,
    totals: { disposable, investment, withInvest, full, specialExtra, liabilities, investGain, net }
  }
}

/** 更新账户可编辑字段（不含余额，余额走 adjust/流水）。 */

async function updateAssetAccount(userId, accountId, data) {
  const db = getDb()
  await getAssetAccountById(userId, accountId)
  const patch = { updated_at: nowTs() }
  if (data.name != null) patch.name = String(data.name).trim()
  if (data.account_subtype != null) patch.account_subtype = data.account_subtype
  if (data.icon != null) patch.icon = String(data.icon || '')
  if (data.include_in_disposable != null) patch.include_in_disposable = !!data.include_in_disposable
  if (data.include_in_daily_limit != null) patch.include_in_daily_limit = !!data.include_in_daily_limit
  if (data.include_in_total_asset != null) patch.include_in_total_asset = !!data.include_in_total_asset
  if (data.annual_withdraw_quota != null) patch.annual_withdraw_quota = Math.round(Number(data.annual_withdraw_quota) || 0)
  if (data.sort_order != null) patch.sort_order = Math.round(Number(data.sort_order) || 0)
  await db.collection('asset_accounts').doc(accountId).update(patch)
  return { ok: true }
}

/** 软删账户。 */

async function deleteAssetAccount(userId, accountId) {
  const db = getDb()
  await getAssetAccountById(userId, accountId)
  await db.collection('asset_accounts').doc(accountId).update({ deleted_at: nowTs(), updated_at: nowTs() })
  return { ok: true }
}

/** 直接改余额（生成 adjust 流水）。newBalance 为目标余额（分）。 */

async function adjustAccountBalance(userId, accountId, newBalance, note) {
  const db = getDb()
  const acc = await getAssetAccountById(userId, accountId)
  const target = Math.round(Number(newBalance) || 0)
  const delta = target - (acc.current_balance || 0)
  if (delta === 0) return { balance: target, changed: false }
  const balanceAfter = await pool.applyAccountBalanceChange(userId, accountId, delta, 'adjust', { note: note || '手动调整余额' })
  return { balance: balanceAfter, changed: true }
}

/** 账户间转账（此消彼长）。 */

async function transferBetweenAccounts(userId, fromId, toId, amount, note) {
  if (fromId === toId) throw new Error('不能转账到同一账户')
  const amt = Math.round(Number(amount) || 0)
  if (amt <= 0) throw new Error('转账金额必须大于 0')
  await getAssetAccountById(userId, fromId)
  await getAssetAccountById(userId, toId)
  await pool.applyAccountBalanceChange(userId, fromId, -amt, 'transfer_out', { counter_account_id: toId, note: note || '转账' })
  await pool.applyAccountBalanceChange(userId, toId, amt, 'transfer_in', { counter_account_id: fromId, note: note || '转账' })
  return { ok: true }
}

/** 新建投资持仓（挂在投资账户下）。 */

async function createInvestmentHolding(userId, data) {
  const db = getDb()
  const acc = await getAssetAccountById(userId, data.account_id)
  if (acc.account_class !== 'investment') throw new Error('持仓必须挂在投资账户下')
  const name = (data.name || '').trim()
  if (!name) throw new Error('持仓名称不能为空')
  const shares = Number(data.shares) || 0
  const unitPrice = Math.round(Number(data.unit_price) || 0)
  const costBasis = Math.round(Number(data.cost_basis) || (shares * unitPrice))
  const marketValue = Math.round(shares * unitPrice)
  const ts = nowTs()
  const doc = {
    user_id: userId,
    account_id: data.account_id,
    name,
    code: (data.code || '').trim(),
    asset_type: data.asset_type || 'fund',
    shares,
    unit_price: unitPrice,
    market_value: marketValue,
    cost_basis: costBasis,
    profit_loss: marketValue - costBasis,
    last_adjust_at: ts,
    deleted_at: null,
    created_at: ts,
    updated_at: ts
  }
  let res
  try {
    res = await db.collection('investment_holdings').add(doc)
  } catch (err) {
    // uk_account_name：该账户下同名持仓已存在
    if (isDuplicateKeyError(err)) throw new Error('该持仓名称已存在')
    throw err
  }
  return { _id: res.id, ...doc }
}

/** 更新持仓（份额/单价/市值/成本），自动重算市值与盈亏。 */

async function updateInvestmentHolding(userId, holdingId, data) {
  const db = getDb()
  const h = await getHoldingById(userId, holdingId)
  const patch = { updated_at: nowTs() }
  if (data.name != null) patch.name = String(data.name).trim()
  if (data.code != null) patch.code = String(data.code).trim()
  if (data.asset_type != null) patch.asset_type = data.asset_type
  if (data.shares != null) patch.shares = Number(data.shares) || 0
  if (data.unit_price != null) patch.unit_price = Math.round(Number(data.unit_price) || 0)
  if (data.cost_basis != null) patch.cost_basis = Math.round(Number(data.cost_basis) || 0)
  if (data.market_value != null) patch.market_value = Math.round(Number(data.market_value) || 0)
  const shares = patch.shares != null ? patch.shares : (h.shares || 0)
  const unitPrice = patch.unit_price != null ? patch.unit_price : (h.unit_price || 0)
  const costBasis = patch.cost_basis != null ? patch.cost_basis : (h.cost_basis || 0)
  const mv = patch.market_value != null ? patch.market_value : Math.round(shares * unitPrice)
  patch.market_value = mv
  patch.profit_loss = mv - costBasis
  patch.last_adjust_at = nowTs()
  await db.collection('investment_holdings').doc(holdingId).update(patch)
  return { ok: true }
}

/** 软删持仓。 */

async function deleteInvestmentHolding(userId, holdingId) {
  const db = getDb()
  await getHoldingById(userId, holdingId)
  await db.collection('investment_holdings').doc(holdingId).update({ deleted_at: nowTs(), updated_at: nowTs() })
  return { ok: true }
}

/**
 * 投资交易：买入/定投/卖出/分红。
 * 买入/定投：从资金账户扣款，增加持仓份额与成本；卖出/分红：回款到资金账户。
 * @param {string} userId
 * @param {{ action: 'buy'|'sell'|'dividend'|'dca', holding_id: string, amount: number, shares_delta?: number, source_account_id: string, note?: string, market_unit_price?: number }} data
 */

async function investmentTransaction(userId, data) {
  const db = getDb()
  const action = data.action
  if (!['buy', 'sell', 'dividend', 'dca'].includes(action)) throw new Error('invalid action')
  const h = await getHoldingById(userId, data.holding_id)
  const amount = Math.round(Number(data.amount) || 0)
  if (amount <= 0) throw new Error('金额必须大于 0')
  const sharesDelta = Number(data.shares_delta) || 0
  const sourceAccountId = data.source_account_id
  if (!sourceAccountId) throw new Error('请选择资金账户')
  await getAssetAccountById(userId, sourceAccountId)
  const ts = nowTs()
  let accountDelta = 0
  let note = ''
  if (action === 'buy' || action === 'dca') {
    accountDelta = -amount
    note = (action === 'dca' ? '定投买入 ' : '买入 ') + h.name
  } else {
    accountDelta = amount
    note = (action === 'sell' ? '卖出 ' : '分红 ') + h.name
  }
  await pool.applyAccountBalanceChange(userId, sourceAccountId, accountDelta, action, { holding_id: h._id, note })
  const baseShares = h.shares || 0
  const newShares = Math.max(0, baseShares + (action === 'sell' ? -sharesDelta : sharesDelta))
  let newCost = h.cost_basis || 0
  if (action === 'sell') {
    const ratio = baseShares > 0 ? sharesDelta / baseShares : 0
    newCost = Math.max(0, Math.round((h.cost_basis || 0) * (1 - ratio)))
  } else {
    newCost = (h.cost_basis || 0) + amount
  }
  const newUnitPrice = newShares > 0 ? Math.round(newCost / newShares) : 0
  const marketUnit = data.market_unit_price != null ? Number(data.market_unit_price) : newUnitPrice
  const newMarketValue = Math.round(newShares * marketUnit)
  await db.collection('investment_holdings').doc(h._id).update({
    shares: newShares,
    unit_price: newUnitPrice,
    cost_basis: Math.max(0, Math.round(newCost)),
    market_value: newMarketValue,
    profit_loss: newMarketValue - Math.max(0, Math.round(newCost)),
    last_adjust_at: ts,
    updated_at: ts
  })
  await db.collection('investment_logs').add({
    user_id: userId,
    holding_id: h._id,
    account_id: h.account_id,
    action,
    amount,
    shares_delta: sharesDelta,
    market_value_after: newMarketValue,
    source_account_id: sourceAccountId,
    target_account_id: null,
    transaction_id: null,
    note: data.note || note,
    created_at: ts
  })
  return { ok: true, market_value_after: newMarketValue }
}


module.exports = {
  getAssetAccountById,
  getHoldingById,
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
}
