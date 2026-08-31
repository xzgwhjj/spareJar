'use strict'

const db = require('../core/db')
const { formatDateKey, nowTs, getDb } = require('../utils/date')
const money = require('../utils/money')
const ids = require('../utils/id')
const transaction = require('./transaction')

/** 组合贴纸一次消耗的积分数（可通过签到/后续会员权益获取） */
const COMBO_COST_POINTS = 10
/** 每日签到奖励积分数 */
const CHECK_IN_POINTS = 10

/** 查询用户积分（兼容老用户无字段）。 */
async function getUserPoints(userId) {
  const db = getDb()
  const res = await db.collection('users').where({ user_id: userId }).limit(1).get()
  const u = res.data && res.data[0]
  return { user: u || null, points: (u && u.points) || 0 }
}

/** 积分变更 + 流水（points_logs）。 */
async function changeUserPoints(userId, change, reason, note) {
  const db = getDb()
  const { user, points } = await getUserPoints(userId)
  if (!user) throw new Error('user not found')
  const balance = Math.max(0, points + change)
  await db.collection('users').doc(user._id).update({
    points: balance,
    updated_at: nowTs()
  })
  await db.collection('points_logs').add({
    user_id: userId,
    change,
    balance,
    reason: reason || 'unknown',
    note: note || '',
    date_key: formatDateKey(new Date()),
    created_at: nowTs()
  })
  return balance
}

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
 * @param {object} data { type:'stock'|'material'|'custom', name, image_url, thumbnail_url?, category_id?, ledger_id?, unit_price?, stock_qty?, low_stock_threshold?, sort_order?, with_purchase?, combo_type?, source_images? }
 *   - stock 类型：unit_price≥1、stock_qty≥0 必填；with_purchase=true 时同步记一笔采购支出（单价×库存，打 stock_purchase 标签）。
 *   - material 类型：单价/库存不参与逻辑，可选绑定默认分类。
 *   - custom 类型：用户上传贴纸。combo_type='single'（单独拍摄）或 'combo'（多图 AI 组合）；combo 时 source_images 记录原图数组。
 */

async function createSticker(userId, data) {
  const db = getDb()
  const ts = nowTs()
  const type = data.type
  if (type !== 'stock' && type !== 'material' && type !== 'custom') throw new Error('invalid sticker type')

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
    desc: typeof data.desc === 'string' ? data.desc.trim().slice(0, 100) : '',
    category_id: data.category_id || null,
    ledger_id: data.ledger_id || null,
    combo_type: null,
    source_images: null,
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

  if (type === 'custom') {
    doc.combo_type = data.combo_type === 'combo' ? 'combo' : 'single'
    doc.source_images = Array.isArray(data.source_images) ? data.source_images.slice(0, 9) : null
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
  const strFields = ['name', 'image_url', 'thumbnail_url', 'desc', 'category_id', 'ledger_id']
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


/**
 * 每日签到：每天 +CHECK_IN_POINTS 积分（自然日，幂等）。
 * @param {string} userId
 */
async function checkIn(userId) {
  const db = getDb()
  const today = formatDateKey(new Date())
  const res = await db.collection('users').where({ user_id: userId }).limit(1).get()
  const user = res.data && res.data[0]
  if (!user) throw new Error('user not found')
  if (user.last_check_in === today) {
    return { ok: false, already: true, points: user.points || 0, message: '今日已签到' }
  }
  const balance = await changeUserPoints(userId, CHECK_IN_POINTS, 'daily_check_in', '每日签到')
  await db.collection('users').doc(user._id).update({
    last_check_in: today,
    updated_at: nowTs()
  })
  return { ok: true, already: false, points: balance, gained: CHECK_IN_POINTS }
}

/**
 * 组合贴纸（用户上传-组合类型）：多张图片合成一张贴纸。
 * 消耗 COMBO_COST_POINTS 积分（不足则报错）。
 * AI 合成：优先调用环境变量配置的 AI_COMBO_ENDPOINT（POST，Authorization: AI_COMBO_TOKEN，
 * body: { images: [url], prompt? }，返回 { url }）；
 * 未配置时降级：直接以第一张原图作为组合结果，并在返回中标记 ai_skipped。
 * @param {string} userId
 * @param {object} data { name, source_images: string[], category_id? }
 */
async function combineSticker(userId, data) {
  const db = getDb()
  const ts = nowTs()
  const name = (data.name || '').trim()
  const images = Array.isArray(data.source_images) ? data.source_images.filter(Boolean).slice(0, 9) : []
  if (!name) throw new Error('组合贴纸需要名称')
  if (images.length < 2) throw new Error('组合贴纸至少需要 2 张图片')

  const { points } = await getUserPoints(userId)
  if (points < COMBO_COST_POINTS) {
    throw new Error(`组合贴纸需要 ${COMBO_COST_POINTS} 积分，当前 ${points} 分，先去签到获取吧`)
  }

  let imageUrl = images[0]
  let aiSkipped = false
  const endpoint = process.env.AI_COMBO_ENDPOINT
  const token = process.env.AI_COMBO_TOKEN
  if (endpoint) {
    try {
      const res = await uniCloud.httpclient.request(endpoint, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        dataType: 'json',
        data: { images, prompt: name }
      })
      const body = res.data
      if (body && body.url) {
        imageUrl = body.url
      } else {
        aiSkipped = true
      }
    } catch (err) {
      console.error('[sticker] AI 组合调用失败，降级为第一张原图', err)
      aiSkipped = true
    }
  } else {
    aiSkipped = true
  }

  // 扣积分（先创建后扣或先扣后建均可，此处先扣，失败可重试）
  const balance = await changeUserPoints(userId, -COMBO_COST_POINTS, 'sticker_combo', '组合贴纸·' + name)

  const doc = {
    user_id: userId,
    type: 'custom',
    combo_type: 'combo',
    name,
    image_url: imageUrl,
    thumbnail_url: imageUrl,
    desc: typeof data.desc === 'string' ? data.desc.trim().slice(0, 100) : '',
    category_id: data.category_id || null,
    ledger_id: data.ledger_id || null,
    source_images: images,
    unit_price: null,
    stock_qty: null,
    initial_stock_qty: null,
    low_stock_threshold: null,
    purchase_transaction_id: null,
    use_count: 0,
    last_used_at: null,
    sort_order: 0,
    deleted_at: null,
    created_at: ts,
    updated_at: ts
  }
  const addRes = await db.collection('stickers').add(doc)
  return { sticker_id: addRes.id, points: balance, cost: COMBO_COST_POINTS, ai_skipped: aiSkipped, ...doc }
}

module.exports = {
  getStickerById,
  createSticker,
  updateSticker,
  deleteSticker,
  getStickers,
  consumeSticker,
  combineSticker,
  checkIn,
  changeUserPoints,
  getUserPoints,
  COMBO_COST_POINTS,
  CHECK_IN_POINTS,
}
