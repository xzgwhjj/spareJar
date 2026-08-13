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

/**
 * 由 phases 数组按模式还原累计总目标(分)。
 * - mode='add'：本阶段 target 为新增攒额，累计 = 前置 done/skipped 阶段累计 + 本阶段 target
 * - mode='total'：本阶段 target 即"累计总目标到 X"
 * 取最后一个阶段（含进行中）还原出的累计值作为心愿累计总目标。
 */
function cumulativeTargetOf(phases) {
  let cum = 0
  for (const p of (phases || [])) {
    if (p.mode === 'total') cum = p.target || 0
    else cum = cum + (p.target || 0)
  }
  return cum
}

async function createWish(userId, payload = {}) {
  const db = getDb()
  const name = (payload.name || '').toString().trim()
  if (!name) throw new Error('wish name is required')
  const targetAmount = Number(payload.target_amount)
  if (!Number.isInteger(targetAmount) || targetAmount < 1) {
    throw new Error('wish target_amount must be a positive integer (fen)')
  }
  const ts = nowTs()
  const start_date = payload.start_date ? String(payload.start_date).slice(0, 10) : ts.slice(0, 10)
  const start_time = payload.start_time ? String(payload.start_time).slice(0, 8) : ts.slice(11, 19)
  const phases = [{ index: 1, mode: 'add', target: targetAmount, saved: 0, status: 'active', done_at: null, start_date, start_time, end_date: null, end_time: null }]
  const doc = {
    user_id: userId,
    name,
    target_amount: targetAmount,
    saved_amount: 0,
    current_phase: 0,
    cumulative_target: targetAmount,
    done_phases: 0,
    phases,
    cover_image_url: payload.cover_image_url ? payload.cover_image_url.toString().slice(0, 512) : '',
    cover_gradient: payload.cover_gradient ? payload.cover_gradient.toString().slice(0, 256) : '',
    deadline: payload.end_date ? payload.end_date.toString().slice(0, 10) : (payload.deadline ? payload.deadline.toString().slice(0, 10) : ''),
    start_date: payload.start_date ? payload.start_date.toString().slice(0, 10) : ts.slice(0, 10),
    end_date: payload.end_date ? payload.end_date.toString().slice(0, 10) : '',
    start_time: payload.start_time ? payload.start_time.toString().slice(0, 8) : ts.slice(11, 19),
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
    // 同步当前阶段 target，并重算累计总目标；心愿 target_amount 即「总目标」
    const phases = (wish.phases || []).map((p) => ({ ...p }))
    const cur = wish.current_phase || 0
    if (phases[cur]) {
      phases[cur] = { ...phases[cur], target }
      update.phases = phases
    }
    const totalTarget = cumulativeTargetOf(phases)
    update.target_amount = totalTarget
    update.cumulative_target = totalTarget
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
 * 开启下一阶段（支持提前开启，不要求当前阶段存满）。
 * 当前 active 阶段：已达标则记为 done，否则记为 skipped（= 已过期，保留已存金额），并推入新阶段、切指针。
 * 心愿 target_amount/saved_amount 更新为所有阶段汇总（总目标/总已存），并维护 done_phases（完成次数）。
 * @param {string} userId
 * @param {string} wishId
 * @param {{ next_target: number, next_mode?: 'add'|'total' }} payload
 */
async function advanceWishPhase(userId, wishId, payload = {}) {
  const db = getDb()
  const wishRes = await db.collection('wishes').doc(wishId).get()
  const wish = wishRes.data && wishRes.data[0]
  if (!wish || wish.user_id !== userId) throw new Error('wish not found')
  if (wish.status === 'archived') throw new Error('archived wish cannot advance')
  const nextTarget = Number(payload.next_target)
  if (!Number.isInteger(nextTarget) || nextTarget < 1) throw new Error('next_target must be positive integer (fen)')
  const nextMode = payload.next_mode === 'total' ? 'total' : 'add'
  const nextStartDate = typeof payload.next_start_date === 'string' && payload.next_start_date ? payload.next_start_date : formatDateKey()
  const nextEndDate = typeof payload.next_end_date === 'string' && payload.next_end_date ? payload.next_end_date : null
  const nextStartTime = typeof payload.next_start_time === 'string' && payload.next_start_time ? payload.next_start_time : null
  const nextEndTime = typeof payload.next_end_time === 'string' && payload.next_end_time ? payload.next_end_time : null
  const cur = wish.current_phase || 0
  // 旧数据兼容：分阶段功能上线前创建的心愿没有 phases 字段，
  // 用心愿自身的 target_amount/saved_amount 合成一个当前阶段（index 从 1 开始）
  let phases = (wish.phases && Array.isArray(wish.phases) && wish.phases.length)
    ? wish.phases.map((p) => ({ ...p }))
    : [{
        index: 1,
        mode: 'add',
        target: Number(wish.target_amount) || 0,
        saved: Number(wish.saved_amount) || 0,
        status: 'active',
        done_at: null,
        // 旧数据兼容：阶段开始 = 心愿自身的开始时间（含时分秒）
        start_date: wish.start_date ? String(wish.start_date).slice(0, 10) : null,
        start_time: wish.start_time ? String(wish.start_time).slice(0, 8) : null,
        end_date: wish.end_date ? String(wish.end_date).slice(0, 10) : null,
        end_time: wish.end_time ? String(wish.end_time).slice(0, 8) : null,
      }]
  const active = phases[cur]
  if (!active) throw new Error('no active phase')
  const ts = nowTs()
  // 当前阶段：未存满也允许跳过，保留已存金额；若已达标则记为 done，否则 skipped
  const activeAchieved = (Number(active.saved) || 0) >= (Number(active.target) || 0)
  phases[cur] = { ...active, status: activeAchieved ? 'done' : 'skipped', done_at: ts }
  const nextIdx = (active.index || cur + 1) + 1
  phases.push({ index: nextIdx, mode: nextMode, target: nextTarget, saved: 0, status: 'active', done_at: null, start_date: nextStartDate, end_date: nextEndDate, start_time: nextStartTime, end_time: nextEndTime })
  // 汇总到「总」字段：总目标 = 累计目标，总已存 = 各阶段已存之和，完成次数 = done 阶段数
  const totalSaved = phases.reduce((s, p) => s + (Number(p.saved) || 0), 0)
  const totalTarget = cumulativeTargetOf(phases)
  const donePhases = phases.filter((p) => p.status === 'done').length
  const update = {
    phases,
    current_phase: cur + 1,
    target_amount: totalTarget,
    saved_amount: totalSaved,
    cumulative_target: totalTarget,
    done_phases: donePhases,
    progress_pct: calcProgressPct(totalSaved, totalTarget),
    status: 'active',
    completed_at: null,
    // 整体截止日：取原心愿 deadline 与新阶段结束日的「更晚者」
    // （新阶段结束更晚则同步推后；更早或等于则保持不变；新阶段无结束日则保留原值）
    deadline:
      nextEndDate && wish.deadline
        ? (nextEndDate > wish.deadline ? nextEndDate : wish.deadline)
        : nextEndDate || wish.deadline || null,
    updated_at: ts,
  }
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
      deadline: db.command.and(db.command.neq(null), db.command.neq(''), db.command.lt(today))
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
  // 允许超存：saved_amount 可超过 target_amount（进度封顶 100%）

  const ts = nowTs()
  const cur = wish.current_phase || 0
  const phases = (wish.phases || []).map((p) => ({ ...p }))
  // 同步当前阶段的已存额（用于时间线展示）
  if (phases[cur]) {
    phases[cur] = { ...phases[cur], saved: (phases[cur].saved || 0) + delta }
  }
  // 当前阶段达成判定（用当前阶段自身目标；仅标阶段 done，不自动归档整个心愿）
  const curPhase = phases[cur]
  const phaseDone = curPhase && (Number(curPhase.saved) || 0) >= (Number(curPhase.target) || 0)
  if (phaseDone && curPhase.status === 'active') {
    phases[cur] = { ...curPhase, status: 'done', done_at: ts }
  }
  // 总进度基于「总目标」（累计目标）；心愿 saved_amount 即所有阶段已存之和
  const totalTarget = cumulativeTargetOf(phases)
  const donePhases = phases.filter((p) => p.status === 'done').length
  await db.collection('wishes').doc(wishId).update({
    saved_amount: savedAfter,
    phases,
    done_phases: donePhases,
    progress_pct: calcProgressPct(savedAfter, totalTarget),
    updated_at: ts,
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
 * 从指定资产账户划拨到心愿（账户 out + 心愿 in）。
 * @param {string} userId
 * @param {string} wishId
 * @param {number} amount 分
 * @param {string} accountId 资产账户 id
 */
async function depositWishFromAccount(userId, wishId, amount, accountId, note = '') {
  if (!accountId) throw new Error('account_id is required')
  await pool.applyAccountBalanceChange(userId, accountId, -amount, 'to_wish', {
    ref_type: 'wish',
    ref_id: wishId,
  })
  return await applyWishFundChange(userId, wishId, 'in', amount, 'account', {
    ref_id: accountId,
    note,
  })
}

/**
 * 从累计结余池转入心愿（结余池 out + 心愿 in）。
 * @param {string} userId
 * @param {string} wishId
 * @param {number} amount 分
 * @param {string} [note] 备注
 */

async function depositWishFromSurplus(userId, wishId, amount, note = '') {
  await pool.applySurplusPoolChange(userId, 'out', amount, 'to_wish', { ref_type: 'wish', ref_id: wishId })
  return await applyWishFundChange(userId, wishId, 'in', amount, 'surplus_pool', { ref_id: wishId, note })
}

/**
 * 从通用存款池转入心愿（存款池 out + 心愿 in）。
 * @param {string} userId
 * @param {string} wishId
 * @param {number} amount 分
 * @param {string} [note] 备注
 */

async function depositWishFromSavings(userId, wishId, amount, note = '') {
  await pool.applySavingsPoolChange(userId, 'out', amount, 'to_wish', { ref_type: 'wish', ref_id: wishId })
  return await applyWishFundChange(userId, wishId, 'in', amount, 'savings_pool', { ref_id: wishId, note })
}

/**
 * 心愿取出退回累计结余池（心愿 out + 结余池 in）。
 * @param {string} userId
 * @param {string} wishId
 * @param {number} amount 分
 * @param {string} [note] 备注
 */

async function withdrawWishToSurplus(userId, wishId, amount, note = '') {
  await applyWishFundChange(userId, wishId, 'out', amount, 'withdraw', { ref_id: wishId, note })
  return await pool.applySurplusPoolChange(userId, 'in', amount, 'from_wish', { ref_type: 'wish', ref_id: wishId })
}

/**
 * 心愿取出退回指定资产账户（心愿 out + 账户 in）。
 * @param {string} userId
 * @param {string} wishId
 * @param {number} amount 分
 * @param {string} accountId 资产账户 id
 * @param {string} [note] 备注
 */
async function withdrawWishToAccount(userId, wishId, amount, accountId, note = '') {
  if (!accountId) throw new Error('account_id is required')
  await applyWishFundChange(userId, wishId, 'out', amount, 'withdraw', { ref_id: wishId, note })
  return await pool.applyAccountBalanceChange(userId, accountId, amount, 'from_wish', {
    ref_type: 'wish',
    ref_id: wishId,
  })
}

/**
 * 心愿取出退回通用存款池（心愿 out + 存款池 in）。
 * @param {string} userId
 * @param {string} wishId
 * @param {number} amount 分
 */
async function withdrawWishToSavings(userId, wishId, amount, note = '') {
  await applyWishFundChange(userId, wishId, 'out', amount, 'withdraw', { ref_id: wishId, note })
  return await pool.applySavingsPoolChange(userId, 'in', amount, 'from_wish', {
    ref_type: 'wish',
    ref_id: wishId,
  })
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
  advanceWishPhase,
  expireOverdueWishes,
  listWishFundLogs,
  applyWishFundChange,
  depositWishFromAccount,
  depositWishFromSurplus,
  depositWishFromSavings,
  withdrawWishToSurplus,
  withdrawWishToAccount,
  withdrawWishToSavings,
}
