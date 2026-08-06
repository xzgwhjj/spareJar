'use strict'

const db = require('../core/db')
const { formatDateKey, nowTs, getDb } = require('../utils/date')
const money = require('../utils/money')
const ids = require('../utils/id')
const transaction = require('./transaction')

async function getStickerById(userId, stickerId) {
  const db = getDb()
  const res = await db.collection('stickers').doc(stickerId).get()
  const s = res.data && res.data[0]
  if (!s || s.user_id !== userId) throw new Error('sticker not found')
  return s
}

/**
 * 新建贴纸。
 * @param {string} userId
 * @param {object} data { type:'stock'|'material', name, image_url, thumbnail_url?, category_id?, ledger_id?, unit_price?, stock_qty?, low_stock_threshold?, sort_order?, with_purchase? }
 *   - stock 类型：unit_price≥1、stock_qty≥0 必填；with_purchase=true 时同步记一笔采购支出（单价×库存，打 stock_purchase 标签）。
 *   - material 类型：单价/库存不参与逻辑，可选绑定默认分类。
 */

async function createSticker(userId, data) {
  const db = getDb()
  const ts = nowTs()
  const type = data.type
  if (type !== 'stock' && type !== 'material') throw new Error('invalid sticker type')

  const name = (data.name || '').trim()
  const imageUrl = data.image_url || ''
  if (!name) throw new Error('sticker name required')
  if (!imageUrl) throw new Error('sticker image required')

  const doc = {
    user_id: userId,
    type,
    name,
    image_url: imageUrl,
    thumbnail_url: data.thumbnail_url || imageUrl,
    category_id: data.category_id || null,
    ledger_id: data.ledger_id || null,
    unit_price: null,
    stock_qty: null,
    initial_stock_qty: null,
    low_stock_threshold: null,
    purchase_transaction_id: null,
    use_count: 0,
    last_used_at: null,
    sort_order: typeof data.sort_order === 'number' ? data.sort_order : 0,
    deleted_at: null,
    created_at: ts,
    updated_at: ts
  }

  if (type === 'stock') {
    const unitPrice = data.unit_price
    const stockQty = data.stock_qty
    if (!unitPrice || unitPrice < 1) throw new Error('囤货贴纸需填写有效单价(分)')
    if (stockQty == null || stockQty < 0) throw new Error('囤货贴纸需填写初始库存')
    doc.unit_price = unitPrice
    doc.stock_qty = stockQty
    doc.initial_stock_qty = stockQty
    doc.low_stock_threshold = (data.low_stock_threshold != null ? data.low_stock_threshold : 1)

    // 同步记采购支出（§8.4）：仅当勾选且初始库存 > 0
    if (data.with_purchase && stockQty > 0) {
      if (!doc.category_id) throw new Error('同步记采购需先绑定支出分类')
      if (!doc.ledger_id) throw new Error('同步记采购需先选择账本')
      const purchaseAmount = unitPrice * stockQty
      const tx = await transaction.createTransaction(userId, {
        type: 'expense',
        amount: purchaseAmount,
        category_id: doc.category_id,
        ledger_id: doc.ledger_id,
        note: '采购·' + name,
        tags: ['stock_purchase'],
        date_key: formatDateKey(new Date(ts)),
        transaction_at: ts
      })
      doc.purchase_transaction_id = tx.transaction_id
    }
  } else if (data.unit_price != null) {
    doc.unit_price = data.unit_price
  }

  const addRes = await db.collection('stickers').add(doc)
  return { sticker_id: addRes.id, ...doc }
}

/** 更新贴纸（白名单字段）。stock 类型可改单价/库存/阈值；material 可改默认分类。 */

async function updateSticker(userId, stickerId, data) {
  const db = getDb()
  const sticker = await getStickerById(userId, stickerId)
  const patch = { updated_at: nowTs() }
  const strFields = ['name', 'image_url', 'thumbnail_url', 'category_id', 'ledger_id']
  for (const f of strFields) {
    if (data[f] !== undefined) patch[f] = typeof data[f] === 'string' ? data[f].trim() : data[f]
  }
  if (data.sort_order !== undefined) patch.sort_order = data.sort_order
  if (sticker.type === 'stock') {
    if (data.unit_price !== undefined) {
      if (!data.unit_price || data.unit_price < 1) throw new Error('单价需≥1分')
      patch.unit_price = data.unit_price
    }
    if (data.stock_qty !== undefined) {
      if (data.stock_qty < 0) throw new Error('库存不能为负')
      patch.stock_qty = data.stock_qty
    }
    if (data.low_stock_threshold !== undefined) {
      if (data.low_stock_threshold < 0) throw new Error('阈值不能为负')
      patch.low_stock_threshold = data.low_stock_threshold
    }
  }
  await db.collection('stickers').doc(stickerId).update(patch)
  return { ok: true, ...patch }
}

/** 软删贴纸。 */

async function deleteSticker(userId, stickerId) {
  const db = getDb()
  await getStickerById(userId, stickerId)
  await db.collection('stickers').doc(stickerId).update({ deleted_at: nowTs(), updated_at: nowTs() })
  return { ok: true }
}

/** 查询贴纸列表（未删除），按 sort_order 升序、最近使用降序。 */

async function getStickers(userId, opts = {}) {
  const db = getDb()
  const where = { user_id: userId, deleted_at: db.command.eq(null) }
  if (opts.type) where.type = opts.type
  const res = await db.collection('stickers')
    .where(where)
    .orderBy('sort_order', 'asc')
    .orderBy('last_used_at', 'desc')
    .get()
  return res.data || []
}

/**
 * 囤货消耗记账（§3.5.1、§8.4）：自动生成一笔支出（单价×数量），扣减库存，打 stock_consume 标签。
 * @param {string} userId
 * @param {string} stickerId
 * @param {number} [qty=1]
 */

async function consumeSticker(userId, stickerId, qty) {
  const db = getDb()
  const sticker = await getStickerById(userId, stickerId)
  if (sticker.type !== 'stock') throw new Error('only stock sticker can be consumed')
  const n = qty || 1
  if (n < 1) throw new Error('consume qty must be >= 1')
  if (sticker.stock_qty == null || sticker.stock_qty < n) throw new Error('库存不足')
  const unit = sticker.unit_price || 0
  const amount = unit * n
  if (unit < 1 || amount < 1) throw new Error('单价无效，无法记账')

  const tx = await transaction.createTransaction(userId, {
    type: 'expense',
    amount,
    category_id: sticker.category_id,
    ledger_id: sticker.ledger_id,
    note: '消耗·' + sticker.name,
    sticker_id: sticker._id,
    stock_consume_qty: n,
    tags: ['stock_consume'],
    date_key: formatDateKey(new Date()),
    transaction_at: nowTs()
  })

  const newStock = sticker.stock_qty - n
  await db.collection('stickers').doc(stickerId).update({
    stock_qty: newStock,
    use_count: (sticker.use_count || 0) + 1,
    last_used_at: nowTs(),
    updated_at: nowTs()
  })
  return { transaction_id: tx.transaction_id, new_stock_qty: newStock, amount }
}


module.exports = {
  getStickerById,
  createSticker,
  updateSticker,
  deleteSticker,
  getStickers,
  consumeSticker,
}
