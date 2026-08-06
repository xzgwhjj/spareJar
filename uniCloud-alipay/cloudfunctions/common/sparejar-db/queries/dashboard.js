'use strict'

const db = require('../core/db')
const { formatDateKey, nowTs, getDb } = require('../utils/date')
const money = require('../utils/money')
const ids = require('../utils/id')

async function getDashboard(userId, dateKey) {
  const db = getDb()
  const d = new Date(dateKey)
  d.setDate(d.getDate() - 1)
  const yesterdayKey = formatDateKey(d)
  const [txRes, yRes] = await Promise.all([
    db.collection('transactions')
      .where({ user_id: userId, date_key: dateKey, deleted_at: db.command.eq(null) })
      .orderBy('transaction_at', 'desc')
      .limit(50)
      .get(),
    db.collection('daily_settlements').where({ user_id: userId, date_key: yesterdayKey }).limit(1).get()
  ])
  return {
    transactions: txRes.data || [],
    yesterdaySettlement: (yRes.data && yRes.data[0]) || null
  }
}

/** 通用单文档读取（user_settings / user_streaks / surplus_pools / savings_pools 等）。 */

async function getLimitHistory(userId, opts = {}) {
  const db = getDb()
  const where = { user_id: userId }
  if (opts.start_key) where.date_key = Object.assign({}, where.date_key, { $gte: opts.start_key })
  if (opts.end_key) where.date_key = Object.assign({}, where.date_key, { $lte: opts.end_key })
  const q = db.collection('limit_history').where(where).orderBy('date_key', 'desc')
  const lim = opts.limit || 60
  const res = await q.limit(lim).get()
  return res.data || []
}


module.exports = {
  getDashboard,
  getLimitHistory,
}
