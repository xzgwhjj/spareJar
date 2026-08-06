'use strict'

const db = require('../core/db')
const { formatDateKey, nowTs, getDb } = require('../utils/date')
const money = require('../utils/money')
const { calcProgressPct } = require('../utils/money')
const ids = require('../utils/id')
const pool = require('./pool')

async function listWishes(userId) {
  const db = getDb()
  const res = await db.collection('wishes')
    .where({ user_id: userId, status: db.command.neq('archived') })
    .orderBy('progress_pct', 'desc')
    .orderBy('created_at', 'desc')
    .limit(50)
    .get()
  return (res.data || []).map((w) => ({ ...w }))
}

/**
 * 创建心愿目标。金额均以「分」为单位。
 * 封面拆分为两个独立字段：
 *  - cover_image_url：图片 fileID / 系统图标(sys::idx) / 空（纯色封面）
 *  - cover_gradient：linear-gradient(...) 字符串（任意封面类型都存）
 * @param {string} userId
 * @param {{ name: string, target_amount: number, deadline?: string, start_date?: string, end_date?: string, start_time?: string, end_time?: string, cover_image_url?: string, cover_gradient?: string }} payload
 */

async function createWish(userId, payload = {}) {
  const db = getDb()
  const name = (payload.name || '').toString().trim()
  if (!name) throw new Error('wish name is required')
  const targetAmount = Number(payload.target_amount)
  if (!Number.isInteger(targetAmount) || targetAmount < 1) {
    throw new Error('wish target_amount must be a positive integer (fen)')
  }
  const ts = nowTs()
  const doc = {
    user_id: userId,
    name,
    target_amount: targetAmount,
    saved_amount: 0,
    cover_image_url: payload.cover_image_url ? payload.cover_image_url.toString().slice(0, 512) : '',
    cover_gradient: payload.cover_gradient ? payload.cover_gradient.toString().slice(0, 256) : '',
    deadline: payload.end_date ? payload.end_date.toString().slice(0, 10) : (payload.deadline ? payload.deadline.toString().slice(0, 10) : ''),
    start_date: payload.start_date ? payload.start_date.toString().slice(0, 10) : '',
    end_date: payload.end_date ? payload.end_date.toString().slice(0, 10) : '',
    start_time: payload.start_time ? payload.start_time.toString().slice(0, 8) : '',
    end_time: payload.end_time ? payload.end_time.toString().slice(0, 8) : '',
    status: 'active',
    progress_pct: 0,
    completed_at: null,
    sort_order: 0,
    created_at: ts,
    updated_at: ts
  }
  const addRes = await db.collection('wishes').add(doc)
  return { ...doc, _id: addRes.id }
}

/**
 * 更新心愿（名称/目标/截止/封面）。目标变更时重算进度；达成自动标记 completed。
 * @param {string} userId
 * @param {string} wishId
 * @param {{ name?: string, target_amount?: number, deadline?: string, start_date?: string, end_date?: string, start_time?: string, end_time?: string, cover_image_url?: string, cover_gradient?: string }} patch
 */

async function updateWish(userId, wishId, patch = {}) {
  const db = getDb()
  const wishRes = await db.collection('wishes').doc(wishId).get()
  const wish = wishRes.data && wishRes.data[0]
  if (!wish || wish.user_id !== userId) throw new Error('wish not found')

  const update = {}
  if (patch.name !== undefined) {
    const name = String(patch.name).trim()
    if (!name) throw new Error('wish name cannot be empty')
    update.name = name
  }
  if (patch.target_amount !== undefined) {
    const target = Number(patch.target_amount)
    if (!Number.isInteger(target) || target < 1) throw new Error('target_amount must be positive integer (fen)')
    update.target_amount = target
  }
  if (patch.deadline !== undefined) update.deadline = String(patch.deadline).slice(0, 10)
  if (patch.start_date !== undefined) update.start_date = String(patch.start_date).slice(0, 10)
  if (patch.end_date !== undefined) update.end_date = String(patch.end_date).slice(0, 10)
  if (patch.start_time !== undefined) update.start_time = String(patch.start_time).slice(0, 8)
  if (patch.end_time !== undefined) update.end_time = String(patch.end_time).slice(0, 8)
  if (patch.cover_image_url !== undefined) update.cover_image_url = String(patch.cover_image_url).slice(0, 512)
  if (patch.cover_gradient !== undefined) update.cover_gradient = String(patch.cover_gradient).slice(0, 256)

  const newTarget = update.target_amount || wish.target_amount
  const saved = wish.saved_amount || 0
  update.progress_pct = calcProgressPct(saved, newTarget)
  if (saved >= newTarget) {
    update.status = 'completed'
    if (!wish.completed_at) update.completed_at = nowTs()
  }
  update.updated_at = nowTs()
  await db.collection('wishes').doc(wishId).update(update)
  return { _id: wishId, ...update }
}

/**
 * 达成归档：将心愿状态置为 archived（达成后从总览隐藏）。
 * @param {string} userId
 * @param {string} wishId
 */

async function archiveWish(userId, wishId) {
  const db = getDb()
  const wishRes = await db.collection('wishes').doc(wishId).get()
  const wish = wishRes.data && wishRes.data[0]
  if (!wish || wish.user_id !== userId) throw new Error('wish not found')
  const ts = nowTs()
  const update = { status: 'archived', archived_reason: 'completed', updated_at: ts }
  if (!wish.completed_at) update.completed_at = ts
  await db.collection('wishes').doc(wishId).update(update)
  return { _id: wishId, ...update }
}

/**
 * 手动删除心愿：保留文档与流水，仅标记为已归档（原因=deleted），进入历史心愿。
 * 资金（saved_amount）保留在 wish 上，由调用方决定如何回填（通常退回通用存款池）。
 * @param {string} userId
 * @param {string} wishId
 */

async function deleteWish(userId, wishId) {
  const db = getDb()
  const wishRes = await db.collection('wishes').doc(wishId).get()
  const wish = wishRes.data && wishRes.data[0]
  if (!wish || wish.user_id !== userId) throw new Error('wish not found')
  if (wish.status === 'archived') return { _id: wishId, status: 'archived', archived_reason: wish.archived_reason }
  const ts = nowTs()
  await db.collection('wishes').doc(wishId).update({ status: 'archived', archived_reason: 'deleted', updated_at: ts })
  return { _id: wishId, status: 'archived', archived_reason: 'deleted' }
}

/**
 * 列出已归档心愿（历史心愿），支持按归档原因二级筛选。
 * @param {string} userId
 * @param {string} [reasonFilter] 'completed' | 'deleted' | 'expired' | 不传=全部
 */

async function listArchivedWishes(userId, reasonFilter) {
  const db = getDb()
  const where = { user_id: userId, status: 'archived' }
  if (reasonFilter && ['completed', 'deleted', 'expired'].includes(reasonFilter)) {
    where.archived_reason = reasonFilter
  }
  const res = await db.collection('wishes')
    .where(where)
    .orderBy('updated_at', 'desc')
    .limit(100)
    .get()
  return (res.data || []).map((w) => ({ ...w }))
}

/**
 * 将过期未达成的活跃心愿标记为归档（原因=expired）。供每日结算调用。
 * @param {string} userId
 * @param {string} [todayKey] 当前日期键 YYYY-MM-DD
 */

async function expireOverdueWishes(userId, todayKey) {
  const db = getDb()
  const today = todayKey || formatDateKey()
  const res = await db.collection('wishes')
    .where({
      user_id: userId,
      status: 'active',
      deadline: db.command.and(db.command.neq(null), db.command.neq(''), db.command.lte(today))
    })
    .field({ _id: true, saved_amount: true, target_amount: true, completed_at: true })
    .get()
  const list = res.data || []
  let expiredCount = 0
  for (const w of list) {
    // 已达成（completed_at 有值）的不算过期，跳过
    if (w.completed_at) continue
    const ts = nowTs()
    await db.collection('wishes').doc(w._id).update({
      status: 'archived',
      archived_reason: 'expired',
      updated_at: ts
    })
    expiredCount++
  }
  return { checked: list.length, expired: expiredCount }
}

/**
 * 读取单个心愿的攒钱流水（按时间倒序）。
 * @param {string} userId
 * @param {string} wishId
 */

async function listWishFundLogs(userId, wishId) {
  const db = getDb()
  const wishRes = await db.collection('wishes').doc(wishId).get()
  const wish = wishRes.data && wishRes.data[0]
  if (!wish || wish.user_id !== userId) throw new Error('wish not found')
  const res = await db.collection('wish_fund_logs')
    .where({ user_id: userId, wish_id: wishId })
    .orderBy('created_at', 'desc')
    .limit(100)
    .get()
  return (res.data || []).map((l) => ({ ...l }))
}

/**
 * 读取通用存款池流水（savings_pool.logs）。
 * @param {string} userId
 */

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

/**
 * 心愿手动虚拟存入（不联动任何资金池）。
 * @param {string} userId
 * @param {string} wishId
 * @param {number} amount 分
 */

async function depositWishManual(userId, wishId, amount) {
  return await applyWishFundChange(userId, wishId, 'in', amount, 'manual', {})
}

/**
 * 从累计结余池转入心愿（结余池 out + 心愿 in）。
 * @param {string} userId
 * @param {string} wishId
 * @param {number} amount 分
 */

async function depositWishFromSurplus(userId, wishId, amount) {
  await pool.applySurplusPoolChange(userId, 'out', amount, 'to_wish', { ref_type: 'wish', ref_id: wishId })
  return await applyWishFundChange(userId, wishId, 'in', amount, 'surplus_pool', { ref_id: wishId })
}

/**
 * 从通用存款池转入心愿（存款池 out + 心愿 in）。
 * @param {string} userId
 * @param {string} wishId
 * @param {number} amount 分
 */

async function depositWishFromSavings(userId, wishId, amount) {
  await pool.applySavingsPoolChange(userId, 'out', amount, 'to_wish', { ref_type: 'wish', ref_id: wishId })
  return await applyWishFundChange(userId, wishId, 'in', amount, 'savings_pool', { ref_id: wishId })
}

/**
 * 心愿取出退回累计结余池（心愿 out + 结余池 in）。
 * @param {string} userId
 * @param {string} wishId
 * @param {number} amount 分
 */

async function withdrawWishToSurplus(userId, wishId, amount) {
  await applyWishFundChange(userId, wishId, 'out', amount, 'withdraw', { ref_id: wishId })
  return await pool.applySurplusPoolChange(userId, 'in', amount, 'from_wish', { ref_type: 'wish', ref_id: wishId })
}

/**
 * 通用存款池手动存入（来源：手动/日结余/心愿退回等由 reason 区分）。
 * @param {string} userId
 * @param {number} amount 分
 * @param {string} [reason]
 */

module.exports = {
  listWishes,
  createWish,
  updateWish,
  archiveWish,
  deleteWish,
  listArchivedWishes,
  expireOverdueWishes,
  listWishFundLogs,
  applyWishFundChange,
  depositWishManual,
  depositWishFromSurplus,
  depositWishFromSavings,
  withdrawWishToSurplus,
}
