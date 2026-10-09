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

// 限额历史留存年限（合规：存储期限最小化，到期可归档/删除）
const LIMIT_HISTORY_RETENTION_YEARS = 3
// 单页最大返回条数，防止一次性拉取过大
const LIMIT_HISTORY_MAX_PAGE = 200

function retentionFloorKey() {
  const d = new Date()
  d.setFullYear(d.getFullYear() - LIMIT_HISTORY_RETENTION_YEARS)
  return formatDateKey(d)
}

async function getLimitHistory(userId, opts = {}) {
  const db = getDb()
  const floor = retentionFloorKey()
  const where = { user_id: userId }

  // 服务端强制留存下限：start_key 不得早于 floor（即便客户端传更老的日期也会被钳制）
  const startKey = opts.start_key && opts.start_key > floor ? opts.start_key : floor
  const dateCond = { $gte: startKey }
  if (opts.end_key) dateCond.$lte = opts.end_key
  // 游标分页：上一页最后一条 date_key 作为下一页起点（date_key 已倒序）
  if (opts.before_key) dateCond.$lt = opts.before_key
  where.date_key = dateCond

  const lim = Math.min(parseInt(opts.limit, 10) || 60, LIMIT_HISTORY_MAX_PAGE)
  const res = await db
    .collection('limit_history')
    .where(where)
    .orderBy('date_key', 'desc')
    .limit(lim + 1)
    .get()

  const data = res.data || []
  const hasMore = data.length > lim
  if (hasMore) data.pop() // 多取的一条仅用于判断是否还有更多
  const nextCursor = data.length ? data[data.length - 1].date_key : null

  return { list: data, has_more: hasMore, next_cursor: nextCursor }
}

/**
 * 读取用户「超 3 年留存窗口」的年度归档汇总（由 cronPurgeOldLimitHistory 生成）。
 * 客户端在 limit_history 查询到达留存下限（floor）后，可展示这些年度聚合作为长期趋势。
 * @param {string} userId
 * @returns {Promise<Array>} 按 year 倒序
 */
async function getLimitHistoryYearly(userId) {
  const db = getDb()
  const res = await db
    .collection('limit_history_yearly')
    .where({ user_id: userId })
    .orderBy('year', 'desc')
    .limit(20)
    .get()
  return (res && res.data) || []
}

/**
 * 归档并清理超过留存期（默认 3 年）的 limit_history 明细。
 *
 * 流程（幂等 + 崩溃安全）：
 *   1) 取 date_key < floor 且 purge_archived != true 的批次（默认 500 条）
 *   2) 先标记 purge_archived = true —— 即便后续步骤中断，重跑也不会重复累加
 *   3) 按 user_id + 年 累加到 limit_history_yearly（days_count / 金额字段用 $inc）
 *   4) 删除该批次明细
 *
 * 由 cronDailySettlement 每月自动执行一次（或经 cronPurgeOldLimitHistory 手动触发）。
 * 即便某年数据跨多个批次，因 purge_archived 保证每条仅处理一次、$inc 跨批次累加，
 * 年度汇总始终等于该年全量明细之和。
 *
 * @param {{ batch_size?: number }} [opts]
 * @returns {Promise<{ floor: string, purged: number, years: number }>}
 */
async function purgeOldLimitHistory(opts = {}) {
  const db = getDb()
  const floor = retentionFloorKey()
  const batchSize = Math.min(Math.max(parseInt(opts.batch_size, 10) || 500, 1), 1000)
  const yearlyCol = db.collection('limit_history_yearly')
  let purged = 0
  let yearGroups = 0

  while (true) {
    const res = await db
      .collection('limit_history')
      .where({ date_key: db.command.lt(floor), purge_archived: db.command.neq(true) })
      .field({
        user_id: true,
        date_key: true,
        day_limit_fen: true,
        year_limit_fen: true,
        spent_fen: true,
        surplus_fen: true
      })
      .limit(batchSize)
      .get()
    const rows = (res && res.data) || []
    if (!rows.length) break
    const ids = rows.map((r) => r._id)

    // 1) 先标记已归档：防止异常中断后重算导致重复累加（under-count 优于 over-count）
    await db
      .collection('limit_history')
      .where({ _id: db.command.in(ids) })
      .update({ purge_archived: true })

    // 2) 按 user_id + 年 分组
    const groups = {}
    for (const r of rows) {
      const year = String(r.date_key).slice(0, 4)
      const key = r.user_id + '|' + year
      if (!groups[key]) {
        groups[key] = {
          user_id: r.user_id,
          year,
          days_count: 0,
          months: new Set(),
          total_day_limit_fen: 0,
          year_limit_fen: 0,
          total_spent_fen: 0,
          total_surplus_fen: 0
        }
      }
      const g = groups[key]
      g.days_count += 1
      g.months.add(String(r.date_key).slice(0, 7))
      g.total_day_limit_fen += Number(r.day_limit_fen) || 0
      g.year_limit_fen = Math.max(g.year_limit_fen, Number(r.year_limit_fen) || 0)
      g.total_spent_fen += Number(r.spent_fen) || 0
      g.total_surplus_fen += Number(r.surplus_fen) || 0
    }

    // 3) upsert 进年度汇总（find-or-create + $inc，跨批次累加正确）
    for (const key of Object.keys(groups)) {
      const g = groups[key]
      const monthsCount = g.months.size
      const existing = await yearlyCol.where({ user_id: g.user_id, year: g.year }).limit(1).get()
      if (existing && existing.data && existing.data.length) {
        await yearlyCol.doc(existing.data[0]._id).update({
          days_count: db.command.inc(g.days_count),
          months_tracked: db.command.inc(monthsCount),
          total_day_limit_fen: db.command.inc(g.total_day_limit_fen),
          year_limit_fen: g.year_limit_fen,
          total_spent_fen: db.command.inc(g.total_spent_fen),
          total_surplus_fen: db.command.inc(g.total_surplus_fen),
          updated_at: nowTs()
        })
      } else {
        await yearlyCol.add({
          user_id: g.user_id,
          year: g.year,
          days_count: g.days_count,
          months_tracked: monthsCount,
          total_day_limit_fen: g.total_day_limit_fen,
          year_limit_fen: g.year_limit_fen,
          total_spent_fen: g.total_spent_fen,
          total_surplus_fen: g.total_surplus_fen,
          created_at: nowTs(),
          updated_at: nowTs()
        })
      }
    }
    yearGroups = Object.keys(groups).length

    // 4) 删除已归档明细
    await db.collection('limit_history').where({ _id: db.command.in(ids) }).remove()
    purged += rows.length
  }

  return { floor, purged, years: yearGroups }
}


module.exports = {
  getDashboard,
  getLimitHistory,
  getLimitHistoryYearly,
  purgeOldLimitHistory,
}
