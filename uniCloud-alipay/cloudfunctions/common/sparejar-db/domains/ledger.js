'use strict'

const db = require('../core/db')
const { isDuplicateKeyError } = require('../core/db')
const { formatDateKey, nowTs, getDb } = require('../utils/date')
const money = require('../utils/money')
const ids = require('../utils/id')
const { genShareCode } = require('../utils/id')
const { DEFAULT_LEDGER } = require('../core/constants')

/**
 * 插入账本并在 share_code 撞唯一索引时重新生成重试。
 * @param {Record<string, unknown>} doc 不含 share_code 的账本文档
 * @param {number} [retries=5]
 */
async function addLedgerWithShareCode(doc, retries = 5) {
  const db = getDb()
  for (let i = 0; i < retries; i++) {
    const share_code = genShareCode()
    try {
      const res = await db.collection('ledgers').add({ ...doc, share_code })
      return { _id: res.id, ...doc, share_code }
    } catch (err) {
      if (!isDuplicateKeyError(err) || i === retries - 1) throw err
      // share_code 碰撞，换一个再试
    }
  }
  throw new Error('生成账本邀请码失败，请重试')
}

async function ensureMasterLedger(userId) {
  const db = getDb()
  const cmd = db.command
  const existing = await db.collection('ledgers')
    .where({ user_id: userId, is_system: true, deleted_at: cmd.eq(null) })
    .limit(1)
    .get()
  if (existing.data && existing.data[0]) return existing.data[0]

  const ts = nowTs()
  const created = await addLedgerWithShareCode({
    user_id: userId, ...DEFAULT_LEDGER, created_at: ts, updated_at: ts
  })
  // 创建账本时：确保本人全局成员存在，并关联到本账本
  try {
    await ensureSelfMemberLinkedToLedger(userId, created._id)
  } catch (e) {
    console.error('[sparejar-db] ensureMasterLedger link self member failed', e)
  }
  return created
}

/**
 * 创建自定义账本。created_at/updated_at 由服务端用 nowTs() 自动填充（字符串），前端无需传时间。
 * @param {string} userId
 * @param {{ name: string, icon?: string, cover?: string, desc?: string, monthly_budget?: number, sort_order?: number }} data
 */

async function createLedger(userId, data = {}) {
  const db = getDb()
  const name = (data.name || '').toString().trim()
  if (!name) throw new Error('ledger name is required')
  const ts = nowTs()
  const doc = {
    user_id: userId,
    name,
    icon: (data.icon || '📒').toString(),
    cover: data.cover ? data.cover.toString() : '',
    cover34: data.cover34 ? data.cover34.toString() : '',
    desc: data.desc ? data.desc.toString() : '',
    // 持久化主题色：创建时即落库为具体 hex（封面取色/预设/自定义三种来源统一），避免后续重复提取
    theme_color: data.theme_color ? data.theme_color.toString() : '',
    is_system: false,
    is_default: false,
    is_shared: false,
    monthly_budget: Number(data.monthly_budget) || 0,
    sort_order: Number.isFinite(Number(data.sort_order)) ? Number(data.sort_order) : 0,
    created_at: ts,
    updated_at: ts
  }
  const created = await addLedgerWithShareCode(doc)
  // 创建账本时：确保本人全局成员存在，并关联到本账本
  try {
    await ensureSelfMemberLinkedToLedger(userId, created._id)
  } catch (e) {
    console.error('[sparejar-db] createLedger link self member failed', e)
  }
  return created
}

/**
 * 幂等确保用户在 members 表中存在本人记录（is_self=true），返回该成员 _id。
 * @param {string} userId
 * @returns {Promise<string>} memberId
 */

async function ensureSelfMember(userId) {
  const db = getDb()
  const exist = await db.collection('members').where({ user_id: userId, is_self: true }).limit(1).get()
  if (exist.data && exist.data[0]) return exist.data[0]._id
  let selfProfile = {}
  try {
    const uRes = await db.collection('users').where({ user_id: userId }).limit(1).get()
    selfProfile = (uRes.data && uRes.data[0]) || {}
  } catch (_e) {
    selfProfile = {}
  }
  const ts = nowTs()
  const res = await db.collection('members').add({
    user_id: userId,
    is_self: true,
    nickname: selfProfile.nickname || '我',
    avatar: selfProfile.avatar_url || '',
    bio: '',
    relation: 'self',
    created_at: ts
  })
  return res.id
}

/**
 * 确保本人成员存在于 members，并关联到指定账本（member_ledgers 幂等）。
 * @param {string} userId
 * @param {string} ledgerId
 */

async function ensureSelfMemberLinkedToLedger(userId, ledgerId) {
  const db = getDb()
  const memberId = await ensureSelfMember(userId)
  const exist = await db.collection('member_ledgers').where({ member_id: memberId, ledger_id: ledgerId }).limit(1).get()
  if (exist.data && exist.data[0]) return memberId
  await db.collection('member_ledgers').add({
    member_id: memberId,
    ledger_id: ledgerId,
    user_id: userId,
    linked_at: nowTs()
  })
  return memberId
}

/**
 * 更新账本（名称/图标/封面/描述/预算/排序）。updated_at 由服务端自动刷新（字符串），前端无需传时间。
 * 主账本（is_system）允许改名/图标，但不可删除（删除限制由前端保证）。
 * @param {string} userId
 * @param {string} ledgerId
 * @param {{ name?: string, icon?: string, cover?: string, desc?: string, monthly_budget?: number, sort_order?: number }} patch
 */

async function updateLedger(userId, ledgerId, patch = {}) {
  const db = getDb()
  const res = await db.collection('ledgers').doc(ledgerId).get()
  const ledger = res.data && res.data[0]
  if (!ledger || ledger.user_id !== userId) throw new Error('ledger not found')

  const update = {}
  if (patch.name !== undefined) {
    const name = String(patch.name).trim()
    if (!name) throw new Error('ledger name cannot be empty')
    update.name = name
  }
  if (patch.icon !== undefined) update.icon = String(patch.icon)
  if (patch.cover !== undefined) update.cover = String(patch.cover)
  if (patch.cover34 !== undefined) update.cover34 = patch.cover34 ? String(patch.cover34) : ''
  if (patch.desc !== undefined) update.desc = String(patch.desc)
  if (patch.theme_color !== undefined) update.theme_color = patch.theme_color ? String(patch.theme_color) : ''
  if (patch.monthly_budget !== undefined) update.monthly_budget = Number(patch.monthly_budget) || 0
  if (patch.sort_order !== undefined) update.sort_order = Number(patch.sort_order) || 0
  update.updated_at = nowTs()
  await db.collection('ledgers').doc(ledgerId).update(update)
  return { _id: ledgerId, ...update }
}

/**
 * 列出用户心愿目标（首页迷你卡 / 心愿总览页用）。
 * 按进度从高到低、创建时间从新到旧排序；仅返回未归档的活跃心愿。
 * @param {string} userId
 */

async function deleteLedger(userId, ledgerId, mode = 'transfer') {
  const db = getDb()
  const ledgerRes = await db.collection('ledgers').doc(ledgerId).get()
  const ledger = ledgerRes.data && ledgerRes.data[0]
  if (!ledger || ledger.user_id !== userId) throw new Error('ledger not found')
  if (ledger.is_system) throw new Error('总账本不可删除')

  const ts = nowTs()
  if (mode === 'transfer') {
    const masterRes = await db.collection('ledgers').where({ user_id: userId, is_system: true }).limit(1).get()
    const master = masterRes.data && masterRes.data[0]
    if (master && master._id !== ledgerId) {
      await db.collection('transactions').where({ user_id: userId, ledger_id: ledgerId }).update({ ledger_id: master._id, updated_at: ts })
    }
  } else if (mode === 'purge') {
    await db.collection('transactions').where({ user_id: userId, ledger_id: ledgerId }).update({ deleted_at: ts, updated_at: ts })
  }
  await db.collection('ledgers').doc(ledgerId).update({ deleted_at: ts, updated_at: ts })
  return { deleted: true, ledger_id: ledgerId, mode }
}

/**
 * 设置账本收藏状态（云端）。
 * favorite=true 创建收藏记录（已存在则幂等返回）；false 删除收藏记录。
 * 收藏以 (user_id, ledger_id) 唯一绑定，互不影响。
 * @param {string} userId
 * @param {string} ledgerId
 * @param {boolean} favorite 期望的收藏状态
 * @returns {Promise<{ favorited: boolean, favorite_id: string|null }>}
 */

async function setFavoriteLedger(userId, ledgerId, favorite) {
  const db = getDb()
  const ledgerRes = await db.collection('ledgers').doc(ledgerId).get()
  const ledger = ledgerRes.data && ledgerRes.data[0]
  if (!ledger || ledger.is_deleted) throw new Error('ledger not found')

  const where = { user_id: userId, ledger_id: ledgerId }
  const existingRes = await db.collection('favorite_ledgers').where(where).limit(1).get()
  const existing = existingRes.data && existingRes.data[0]
  const want = !!favorite

  if (want) {
    if (existing) return { favorited: true, favorite_id: existing._id }
    const ts = nowTs()
    const doc = { user_id: userId, ledger_id: ledgerId, created_at: ts, updated_at: ts }
    const addRes = await db.collection('favorite_ledgers').add(doc)
    return { favorited: true, favorite_id: addRes.id }
  }

  if (existing) {
    await db.collection('favorite_ledgers').where(where).remove()
  }
  return { favorited: false, favorite_id: null }
}

/**
 * 列出分类（分类管理页用）。
 * 返回的每个分类附带 usage_count（未删除的关联账目数），便于判断能否直接删除。
 * @param {string} userId
 * @param {{ type?: 'expense'|'income', includeHidden?: boolean }} [opts]
 */

async function listLedgers(userId) {
  const db = getDb()
  const res = await db.collection('ledgers')
    .where({ user_id: userId, deleted_at: db.command.eq(null) })
    .orderBy('sort_order', 'asc')
    .get()
  const ledgers = res.data || []
  // 统计每个账本的成员数（来自 member_ledgers 关联，异常降级为 0，不影响主流程）
  await Promise.all(ledgers.map(async (l) => {
    try {
      const mRes = await db.collection('member_ledgers').where({ ledger_id: l._id }).count()
      l.memberCount = (mRes && (mRes.total !== undefined ? mRes.total : mRes)) || 0
    } catch (e) {
      l.memberCount = 0
    }
  }))
  return ledgers
}

/**
 * 新增账本成员（自定义联系人 / 本人冗余）。
 * 成员用于标识「这笔账是谁用的/谁付的钱」，非协作概念：
 * - 本人(is_self=true) 由 createLedger/ensureMasterLedger 写入，user_id 关联真实用户；
 * - 自定义联系人（家人/朋友等）user_id 留空，由调用方填写 nickname/avatar/bio/relation。
 * @param {string} userId 当前用户（用于校验账本归属）
 * @param {string} ledgerId
 * @param {{ nickname:string, avatar?:string, bio?:string, relation?:string, is_self?:boolean }} payload
 * @returns {Promise<{_id:string,nickname:string,avatar:string,bio:string,relation:string,is_self:boolean,user_id:string}>}
 */

async function addMember(userId, payload = {}) {
  const db = getDb()
  const nickname = (payload.nickname || '').toString().trim()
  if (!nickname) throw new Error('nickname is required')
  const doc = {
    user_id: userId,
    is_self: false,
    nickname,
    avatar: payload.avatar || '',
    bio: payload.bio || '',
    relation: payload.relation || 'other',
    created_at: nowTs(),
  }
  const res = await db.collection('members').add(doc)
  return { _id: res.id, ...doc }
}

/**
 * 更新全局成员资料（昵称/头像/简介/关系）。
 * @param {string} userId
 * @param {string} memberId members._id
 * @param {{ nickname?:string, avatar?:string, bio?:string, relation?:string }} payload
 * @returns {Promise<{updated:number}>}
 */

async function updateMember(userId, memberId, payload = {}) {
  const db = getDb()
  const mRes = await db.collection('members').doc(memberId).get()
  const m = mRes.data && mRes.data[0]
  if (!m || m.user_id !== userId) throw new Error('member not found')
  const set = {}
  if (payload.nickname !== undefined && payload.nickname !== '') set.nickname = payload.nickname.toString().trim()
  if (payload.avatar !== undefined) set.avatar = payload.avatar
  if (payload.bio !== undefined) set.bio = payload.bio
  if (payload.relation !== undefined) set.relation = payload.relation
  const res = await db.collection('members').doc(memberId).update(set)
  return { updated: (res && res.updated) || 0 }
}

/**
 * 删除全局成员（本人 is_self=true 不可删）。会清理 member_ledgers 关联，
 * 并把关联交易的 member_ids 中该成员移出，避免孤儿引用。
 * @param {string} userId
 * @param {string} memberId members._id
 * @returns {Promise<{deleted:number}>}
 */

async function removeMember(userId, memberId) {
  const db = getDb()
  const mRes = await db.collection('members').doc(memberId).get()
  const m = mRes.data && mRes.data[0]
  if (!m || m.user_id !== userId) throw new Error('member not found')
  if (m.is_self === true) throw new Error('cannot remove self member')
  try {
    await db.collection('member_ledgers').where({ member_id: memberId }).remove()
  } catch (e) {
    console.error('[sparejar-db] removeMember cleanup member_ledgers failed', e)
  }
  try {
    await db.collection('transactions')
      .where({ user_id: userId, member_ids: memberId, deleted_at: db.command.eq(null) })
      .update({ member_ids: db.command.pull(memberId) })
  } catch (e) {
    console.error('[sparejar-db] removeMember cleanup transactions failed', e)
  }
  const res = await db.collection('members').doc(memberId).remove()
  return { deleted: (res && res.deleted) || 0 }
}

/**
 * 将全局成员关联到指定账本（幂等）。
 * @param {string} userId
 * @param {string} memberId members._id
 * @param {string} ledgerId
 * @returns {Promise<{linked:boolean}>}
 */

async function linkMemberToLedger(userId, memberId, ledgerId) {
  const db = getDb()
  const mRes = await db.collection('members').doc(memberId).get()
  const m = mRes.data && mRes.data[0]
  if (!m || m.user_id !== userId) throw new Error('member not found')
  const lRes = await db.collection('ledgers').doc(ledgerId).get()
  const l = lRes.data && lRes.data[0]
  if (!l || l.user_id !== userId) throw new Error('ledger not found')
  const exist = await db.collection('member_ledgers').where({ member_id: memberId, ledger_id: ledgerId }).limit(1).get()
  if (exist.data && exist.data[0]) return { linked: false }
  await db.collection('member_ledgers').add({
    member_id: memberId,
    ledger_id: ledgerId,
    user_id: userId,
    linked_at: nowTs(),
  })
  return { linked: true }
}

/**
 * 取消成员与账本的关联（不删除成员本身）。本人关联也可取消。
 * @param {string} userId
 * @param {string} memberId members._id
 * @param {string} ledgerId
 * @returns {Promise<{unlinked:number}>}
 */

async function unlinkMemberFromLedger(userId, memberId, ledgerId) {
  const db = getDb()
  const res = await db.collection('member_ledgers')
    .where({ user_id: userId, member_id: memberId, ledger_id: ledgerId })
    .remove()
  return { unlinked: (res && res.removed) || 0 }
}

/**
 * 取用户全部全局成员（供成员管理器列表使用）。
 * @param {string} userId
 * @returns {Promise<Array>}
 */

async function getMembersByUser(userId) {
  const db = getDb()
  const res = await db.collection('members').where({ user_id: userId }).orderBy('is_self', 'desc').get()
  return (res.data || []).map((m) => ({
    _id: m._id,
    user_id: m.user_id || '',
    nickname: m.nickname || '',
    avatar_url: m.avatar || '',
    bio: m.bio || '',
    relation: m.relation || 'other',
    is_self: m.is_self === true,
  }))
}

/**
 * 取账本已关联成员（供记账/筛选使用，只返回关联到该账本的成员）。
 * @param {string} userId
 * @param {string} ledgerId
 * @returns {Promise<Array>}
 */

async function getLedgerMembers(userId, ledgerId) {
  const db = getDb()
  const linkRes = await db.collection('member_ledgers').where({ ledger_id: ledgerId }).get()
  const links = linkRes.data || []
  if (!links.length) return []
  const memberIds = links.map((x) => x.member_id)
  const mRes = await db.collection('members').where({ _id: db.command.in(memberIds) }).get()
  const members = mRes.data || []
  return members
    .map((m) => ({
      _id: m._id,
      user_id: m.user_id || '',
      nickname: m.nickname || '',
      avatar_url: m.avatar || '',
      bio: m.bio || '',
      relation: m.relation || 'other',
      is_self: m.is_self === true,
    }))
    .sort((a, b) => (a.is_self === b.is_self ? 0 : a.is_self ? -1 : 1))
}


/** 账本详情：账本文档 + 该用户全部交易（前端按账本过滤）+ 成员总数。 */

module.exports = {
  ensureMasterLedger,
  createLedger,
  ensureSelfMember,
  ensureSelfMemberLinkedToLedger,
  updateLedger,
  deleteLedger,
  setFavoriteLedger,
  listLedgers,
  addMember,
  updateMember,
  removeMember,
  linkMemberToLedger,
  unlinkMemberFromLedger,
  getMembersByUser,
  getLedgerMembers,
}
