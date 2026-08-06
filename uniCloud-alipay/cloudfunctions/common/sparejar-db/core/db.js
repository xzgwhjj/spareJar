'use strict'

const { formatDateTime } = require('../utils/date')

function nowTs() {
  return formatDateTime()
}

function getDb() {
  return uniCloud.database()
}


async function getDocByUser(collection, userId, extraWhere = {}) {
  const db = getDb()
  const res = await db.collection(collection).where({ user_id: userId, ...extraWhere }).limit(1).get()
  return res.data && res.data[0]
}

/**
 * 幂等确保某集合存在一条 user_id 归属的文档；已存在则直接返回，不重复插入。
 * @param {string} collection
 * @param {string} userId
 * @param {() => Record<string, unknown>} buildDoc 仅在需要插入时调用
 * @returns {Promise<object>} 已存在或新建的文档（含 _id）
 */
async function ensureDoc(collection, userId, buildDoc) {
  const existing = await getDocByUser(collection, userId)
  if (existing) return existing
  const doc = buildDoc()
  try {
    const res = await getDb().collection(collection).add(doc)
    return { _id: res.id, ...doc }
  } catch (err) {
    // 并发/重试场景下可能出现 "document is already exists"，回退读取已有文档即可
    if (isDuplicateKeyError(err)) {
      const fallback = await getDocByUser(collection, userId)
      if (fallback) return fallback
    }
    throw err
  }
}


async function getDoc(collection, userId) {
  return getDocByUser(collection, userId)
}

/** 唯一索引冲突（并发/重试下的 "document is already exists"） */
function isDuplicateKeyError(err) {
  const msg = (err && (err.message || err.errMsg)) || ''
  return /already exists|duplicate key|E11000/i.test(msg)
}

/**
 * 按唯一键 upsert：先查后写，写入撞唯一索引时回退为 update，彻底消除
 * "check-then-insert" 竞态导致的 "document is already exists"。
 * @param {string} collection
 * @param {Record<string, unknown>} uniqueWhere 唯一索引对应的查询条件
 * @param {Record<string, unknown>} payload 需要写入/更新的字段
 * @param {Record<string, unknown>} [insertExtra] 仅在首次插入时附加的字段
 */
async function upsertByUnique(collection, uniqueWhere, payload, insertExtra = {}) {
  const db = getDb()
  const existing = await db.collection(collection).where(uniqueWhere).limit(1).get()
  const doc = existing.data && existing.data[0]
  if (doc) {
    await db.collection(collection).doc(doc._id).update(payload)
    return { _id: doc._id, ...doc, ...payload, __created: false }
  }
  try {
    const res = await db.collection(collection).add({ ...uniqueWhere, ...payload, ...insertExtra })
    return { _id: res.id, ...uniqueWhere, ...payload, ...insertExtra, __created: true }
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err
    // 并发插入已由他人抢先完成，回退为更新
    const again = await db.collection(collection).where(uniqueWhere).limit(1).get()
    const raced = again.data && again.data[0]
    if (!raced) throw err
    await db.collection(collection).doc(raced._id).update(payload)
    return { _id: raced._id, ...raced, ...payload, __created: false }
  }
}

module.exports = {
  nowTs,
  getDb,
  getDocByUser,
  ensureDoc,
  getDoc,
  isDuplicateKeyError,
  upsertByUnique,
}
