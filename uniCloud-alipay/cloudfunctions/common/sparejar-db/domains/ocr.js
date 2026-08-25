'use strict'

const db = require('../core/db')
const { formatDateKey, nowTs, getDb } = require('../utils/date')
const money = require('../utils/money')
const { parseAmountFen } = require('../utils/money')
const ids = require('../utils/id')
const { OCR_PROVIDER, OCR_BAIDU, OCR_TENCENT } = require('../core/constants')

async function getBaiduAccessToken() {
  if (!OCR_BAIDU.apiKey || !OCR_BAIDU.secretKey) return ''
  const url = `${OCR_BAIDU.tokenUrl}?grant_type=client_credentials&client_id=${OCR_BAIDU.apiKey}&client_secret=${OCR_BAIDU.secretKey}`
  const res = await uniCloud.httpclient.request(url, { method: 'POST', dataType: 'json' })
  const body = (res && res.data) || {}
  return body.access_token || ''
}

/** 调用百度通用文字识别，返回识别出的全部文本行（\n 连接） */

async function fetchOcrTextByBaidu(imageBase64) {
  const token = await getBaiduAccessToken()
  if (!token) return ''
  const res = await uniCloud.httpclient.request(
    `${OCR_BAIDU.ocrUrl}?access_token=${token}`,
    {
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      data: `image=${encodeURIComponent(imageBase64)}`,
      dataType: 'json'
    }
  )
  const body = (res && res.data) || {}
  const words = Array.isArray(body.words_result)
    ? body.words_result.map((w) => (w && w.words) || '').filter(Boolean)
    : []
  return words.join('\n')
}

/** 腾讯云 OCR（通用印刷体）预留实现：需 TC3-HMAC-SHA256 签名，密钥就绪后启用 */
// eslint-disable-next-line no-unused-vars

async function fetchOcrTextByTencent(imageBase64) {
  if (!OCR_TENCENT.secretId || !OCR_TENCENT.secretKey) return ''
  // TODO: 实现腾讯云 TC3 签名并调用 generalBasic 接口
  return ''
}

/** 读取云存储图片并返回 base64 */

async function readImageAsBase64(imageUrl) {
  const res = await uniCloud.downloadFile({ url: imageUrl })
  const buf = res && (res.fileContent || res.data)
  if (!buf) return ''
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
  return b.toString('base64')
}

/** 从 OCR 文本提取金额（分），优先合计/应收/实收等关键字后的数值，否则取最大金额 */

function parseMerchant(text) {
  if (!text) return ''
  const lines = String(text).split('\n').map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return ''
  const kwRe = /(超市|便利|商店|商场|餐厅|饭店|美食|咖啡|奶茶|药店|药房|医院|诊所|加油|停车场|影城|电影|酒店|宾馆|银行|营业厅)/
  for (const l of lines) {
    if (kwRe.test(l)) return l.slice(0, 30)
  }
  return lines[0].slice(0, 30)
}

/** 从 OCR 识别文本中提取日期 YYYY-MM-DD（注意：与上方 parseDateKey 日期解析函数区分，避免同名覆盖） */

function extractDateKeyFromText(text) {
  if (!text) return ''
  const s = String(text)
  const m = s.match(/(\d{4})[年\-\/.](\d{1,2})[月\-\/.](\d{1,2})/)
  if (m) {
    const y = m[1]
    const mo = String(m[2]).padStart(2, '0')
    const d = String(m[3]).padStart(2, '0')
    return `${y}-${mo}-${d}`
  }
  return ''
}

// 商户关键字 → 预置分类名（用于推荐分类）
const MERCHANT_CATEGORY_KEYWORDS = [
  { kw: ['超市', '生鲜', '便利', '商店', '卖场', '市场'], name: '生鲜超市' },
  { kw: ['外卖', '美团', '饿了么'], name: '外卖' },
  { kw: ['咖啡', '奶茶', '茶饮', '瑞幸', '星巴克'], name: '咖啡奶茶' },
  { kw: ['餐厅', '饭店', '美食', '餐饮', '小吃', '火锅', '烧烤'], name: '餐饮' },
  { kw: ['加油', '石油', '石化', '中化'], name: '加油' },
  { kw: ['停车'], name: '停车费' },
  { kw: ['电影', '影城', '影院', '剧院'], name: '电影演出' },
  { kw: ['医', '药', '诊所', '医院', '体检'], name: '门诊' },
  { kw: ['药'], name: '药品' },
  { kw: ['衣服', '服饰', '服装', '鞋', '包'], name: '服饰' },
  { kw: ['美容', '美发', '理发', '护肤', '化妆'], name: '美容美发' },
  { kw: ['家居', '家具', '日用', '百货'], name: '家居用品' },
  { kw: ['数码', '电器', '手机', '电脑'], name: '数码电器' },
  { kw: ['快递', '物流', '顺丰', '京东'], name: '快递' },
  { kw: ['交通', '地铁', '公交', '打车', '出租', '滴滴'], name: '交通' },
  { kw: ['酒店', '宾馆', '住宿', '民宿'], name: '酒店住宿' },
  { kw: ['旅游', '旅行', '景区'], name: '旅游' },
  { kw: ['书', '书店', '文具'], name: '书籍杂志' },
  { kw: ['宠物', '猫', '狗'], name: '宠物用品' },
  { kw: ['健身', '运动', '瑜伽'], name: '运动健身' },
  { kw: ['游戏', '网吧'], name: '游戏' },
  { kw: ['培训', '课程', '网课', '教育', '学费'], name: '培训课程' },
  { kw: ['礼金', '份子', '红包', '喜'], name: '礼金份子' },
  { kw: ['话费', '通讯', '营业厅'], name: '通讯费' },
  { kw: ['水费', '电费', '燃气', '物业', '宽带'], name: '水费' }
]

/** 根据商户/文本推荐分类（在用户支出分类中匹配） */

async function recommendCategoryId(userId, merchant, text) {
  try {
    const db = getDb()
    const cats = await db.collection('categories')
      .where({ user_id: userId, type: 'expense', is_hidden: false })
      .field({ _id: true, name: true, group: true })
      .get()
    const list = (cats && cats.data) || []
    if (!list.length) return null
    const hay = `${merchant || ''} ${text || ''}`
    for (const rule of MERCHANT_CATEGORY_KEYWORDS) {
      if (rule.kw.some((k) => hay.includes(k))) {
        const hit = list.find((c) => c.name === rule.name) || list.find((c) => c.name && c.name.includes(rule.name))
        if (hit) return hit._id
      }
    }
  } catch (e) {
    console.error('[recognizeReceipt] recommendCategory failed', e)
  }
  return null
}

/**
 * 小票/截图 OCR 识别记账
 * @param {string} userId
 * @param {{ image_url: string }} data
 * @returns {Promise<{ success: boolean, reason?: string, message?: string, provider?: string, raw_text?: string, recognized_amount?: number, merchant?: string, recognized_date?: string, confidence?: number, image_url?: string, suggested_category_id?: string|null }>}
 */

async function recognizeReceipt(userId, data) {
  const imageUrl = data && data.image_url
  if (!imageUrl) return { success: false, reason: 'missing_image' }
  let text = ''
  try {
    const base64 = await readImageAsBase64(imageUrl)
    if (!base64) return { success: false, reason: 'read_image_failed' }
    text = OCR_PROVIDER === 'tencent'
      ? await fetchOcrTextByTencent(base64)
      : await fetchOcrTextByBaidu(base64)
  } catch (e) {
    return { success: false, reason: 'ocr_request_failed', message: (e && e.message) || '' }
  }
  if (!text || !text.trim()) {
    return { success: false, reason: 'empty_text' }
  }
  const amount = parseAmountFen(text)
  const merchant = parseMerchant(text)
  const dateKey = extractDateKeyFromText(text)
  const categoryId = await recommendCategoryId(userId, merchant, text)
  return {
    success: true,
    provider: OCR_PROVIDER,
    raw_text: text,
    recognized_amount: amount,
    merchant: merchant || '',
    recognized_date: dateKey || '',
    confidence: amount > 0 ? 0.9 : 0.5,
    image_url: imageUrl,
    suggested_category_id: categoryId || null
  }
}


/** 平台/账户名关键字 → 账户类别与子类型 */
const ASSET_ACCOUNT_KEYWORDS = [
  { kw: ['花呗', '借呗', '白条'], account_class: 'liability', account_subtype: 'huabei' },
  { kw: ['信用卡', 'visa', 'master', '银联'], account_class: 'liability', account_subtype: 'credit_card' },
  { kw: ['京东'], account_class: 'liability', account_subtype: 'jdbt' },
  { kw: ['借款', '网贷', '分期'], account_class: 'liability', account_subtype: 'loan' },
  { kw: ['微信', '零钱', 'wechat'], account_class: 'daily', account_subtype: 'wechat' },
  { kw: ['支付宝', '余额', 'alipay'], account_class: 'daily', account_subtype: 'alipay' },
  { kw: ['银行', '储蓄', '借记', '卡'], account_class: 'daily', account_subtype: 'bank_card' },
  { kw: ['现金', '钱包'], account_class: 'daily', account_subtype: 'cash' },
  { kw: ['基金', '理财', '余额宝', '零钱通'], account_class: 'investment', account_subtype: 'fund' },
  { kw: ['股票', '证券', '股份', 'a股', '港股'], account_class: 'investment', account_subtype: 'stock' },
  { kw: ['黄金', '金'], account_class: 'investment', account_subtype: 'gold' },
  { kw: ['债券', '国债'], account_class: 'investment', account_subtype: 'bond' },
  { kw: ['公积金', '社保'], account_class: 'special', account_subtype: 'provident' },
  { kw: ['押金', '保证金'], account_class: 'special', account_subtype: 'deposit' }
]

/** 从 OCR 文本推断账户名（平台名） */
function parseAccountName(text) {
  if (!text) return ''
  const lines = String(text).split('\n').map((l) => l.trim()).filter(Boolean)
  // 优先匹配关键字行作为平台名
  for (const rule of ASSET_ACCOUNT_KEYWORDS) {
    for (const l of lines) {
      if (rule.kw.some((k) => l.includes(k))) {
        return l.slice(0, 30)
      }
    }
  }
  return lines[0] ? lines[0].slice(0, 30) : ''
}

/** 根据文本推断账户类别与子类型 */
function suggestAccountClass(text) {
  const hay = String(text || '')
  for (const rule of ASSET_ACCOUNT_KEYWORDS) {
    if (rule.kw.some((k) => hay.includes(k))) {
      return { account_class: rule.account_class, account_subtype: rule.account_subtype }
    }
  }
  return { account_class: '', account_subtype: '' }
}

/**
 * 截图建账 OCR：识别账户名与余额，推荐账户类别
 * @param {string} userId
 * @param {{ image_url: string }} data
 */
async function recognizeAsset(userId, data) {
  const imageUrl = data && data.image_url
  if (!imageUrl) return { success: false, reason: 'missing_image' }
  let text = ''
  try {
    const base64 = await readImageAsBase64(imageUrl)
    if (!base64) return { success: false, reason: 'read_image_failed' }
    text = OCR_PROVIDER === 'tencent'
      ? await fetchOcrTextByTencent(base64)
      : await fetchOcrTextByBaidu(base64)
  } catch (e) {
    return { success: false, reason: 'ocr_request_failed', message: (e && e.message) || '' }
  }
  if (!text || !text.trim()) {
    return { success: false, reason: 'empty_text' }
  }
  const balance = parseAmountFen(text)
  const accountName = parseAccountName(text)
  const suggest = suggestAccountClass(text)
  return {
    success: true,
    provider: OCR_PROVIDER,
    raw_text: text,
    account_name: accountName,
    balance_fen: balance,
    suggested_class: suggest.account_class,
    suggested_subtype: suggest.account_subtype,
    confidence: balance > 0 ? 0.9 : 0.5,
    image_url: imageUrl
  }
}

module.exports = {
  getBaiduAccessToken,
  fetchOcrTextByBaidu,
  fetchOcrTextByTencent,
  readImageAsBase64,
  parseMerchant,
  extractDateKeyFromText,
  recommendCategoryId,
  recognizeReceipt,
  parseAccountName,
  suggestAccountClass,
  recognizeAsset,
}
