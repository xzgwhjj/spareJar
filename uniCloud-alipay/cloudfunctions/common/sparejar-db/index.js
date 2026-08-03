'use strict'

// 二级分组码（中层），按 type 隔离；前端用 code→{名称,图标} 不可变 map 展示
const PRESET_EXPENSE_CATEGORIES = [
  // 日常固定开销 fixed
  { group: 'fixed', name: '房租', icon: '🏠', sort_order: 1 },
  { group: 'fixed', name: '房贷', icon: '🏦', sort_order: 2 },
  { group: 'fixed', name: '车贷', icon: '🚗', sort_order: 3 },
  { group: 'fixed', name: '水费', icon: '💧', sort_order: 4 },
  { group: 'fixed', name: '电费', icon: '💡', sort_order: 5 },
  { group: 'fixed', name: '燃气费', icon: '🔥', sort_order: 6 },
  { group: 'fixed', name: '物业费', icon: '🏢', sort_order: 7 },
  { group: 'fixed', name: '宽带网络', icon: '🌐', sort_order: 8 },
  { group: 'fixed', name: '固定话费', icon: '📱', sort_order: 9 },
  { group: 'fixed', name: '长期保险', icon: '🛡️', sort_order: 10 },
  { group: 'fixed', name: '订阅会员', icon: '📺', sort_order: 11 },
  // 日常变动开销 variable
  { group: 'variable', name: '餐饮', icon: '🍜', sort_order: 1 },
  { group: 'variable', name: '外卖', icon: '🥡', sort_order: 2 },
  { group: 'variable', name: '咖啡奶茶', icon: '🧋', sort_order: 3 },
  { group: 'variable', name: '生鲜超市', icon: '🛒', sort_order: 4 },
  { group: 'variable', name: '便利店', icon: '🏪', sort_order: 5 },
  { group: 'variable', name: '交通', icon: '🚌', sort_order: 6 },
  { group: 'variable', name: '打车', icon: '🚕', sort_order: 7 },
  { group: 'variable', name: '加油', icon: '⛽', sort_order: 8 },
  { group: 'variable', name: '停车费', icon: '🅿️', sort_order: 9 },
  { group: 'variable', name: '通讯费', icon: '📞', sort_order: 10 },
  { group: 'variable', name: '快递', icon: '📦', sort_order: 11 },
  // 生活改善类 lifestyle
  { group: 'lifestyle', name: '服饰', icon: '👕', sort_order: 1 },
  { group: 'lifestyle', name: '鞋包', icon: '👟', sort_order: 2 },
  { group: 'lifestyle', name: '美容美发', icon: '💇', sort_order: 3 },
  { group: 'lifestyle', name: '护肤化妆', icon: '💄', sort_order: 4 },
  { group: 'lifestyle', name: '家居用品', icon: '🛋️', sort_order: 5 },
  { group: 'lifestyle', name: '厨具', icon: '🍳', sort_order: 6 },
  { group: 'lifestyle', name: '数码电器', icon: '📱', sort_order: 7 },
  // 休闲娱乐类 leisure
  { group: 'leisure', name: '旅游', icon: '✈️', sort_order: 1 },
  { group: 'leisure', name: '酒店住宿', icon: '🏨', sort_order: 2 },
  { group: 'leisure', name: '电影演出', icon: '🎬', sort_order: 3 },
  { group: 'leisure', name: '游戏', icon: '🎮', sort_order: 4 },
  { group: 'leisure', name: '运动健身', icon: '🏋️', sort_order: 5 },
  { group: 'leisure', name: '爱好手工', icon: '🎨', sort_order: 6 },
  { group: 'leisure', name: '宠物用品', icon: '🐱', sort_order: 7 },
  { group: 'leisure', name: '书籍杂志', icon: '📚', sort_order: 8 },
  // 医疗健康类 medical
  { group: 'medical', name: '门诊', icon: '🏥', sort_order: 1 },
  { group: 'medical', name: '药品', icon: '💊', sort_order: 2 },
  { group: 'medical', name: '体检', icon: '🩺', sort_order: 3 },
  { group: 'medical', name: '医疗险', icon: '🛡️', sort_order: 4 },
  { group: 'medical', name: '牙科', icon: '🦷', sort_order: 5 },
  // 教育成长类 education
  { group: 'education', name: '学费', icon: '🎓', sort_order: 1 },
  { group: 'education', name: '培训课程', icon: '📖', sort_order: 2 },
  { group: 'education', name: '网课', icon: '💻', sort_order: 3 },
  { group: 'education', name: '考试报名', icon: '📝', sort_order: 4 },
  { group: 'education', name: '育儿早教', icon: '👶', sort_order: 5 },
  // 人情社交类 social
  { group: 'social', name: '礼金份子', icon: '🧧', sort_order: 1 },
  { group: 'social', name: '聚会请客', icon: '🍻', sort_order: 2 },
  { group: 'social', name: '人情往来', icon: '🎁', sort_order: 3 },
  { group: 'social', name: '捐赠公益', icon: '❤️', sort_order: 4 },
  // 意外损失 unexpected
  { group: 'unexpected', name: '维修费', icon: '🔧', sort_order: 1 },
  { group: 'unexpected', name: '罚款', icon: '💸', sort_order: 2 },
  { group: 'unexpected', name: '遗失损坏', icon: '💔', sort_order: 3 },
  { group: 'unexpected', name: '其他', icon: '📦', sort_order: 4 }
]

const PRESET_INCOME_CATEGORIES = [
  // 主动收入 active
  { group: 'active', name: '工资薪资', icon: '💰', sort_order: 1 },
  { group: 'active', name: '奖金', icon: '🏆', sort_order: 2 },
  { group: 'active', name: '绩效', icon: '📊', sort_order: 3 },
  { group: 'active', name: '兼职', icon: '💼', sort_order: 4 },
  { group: 'active', name: '劳务报酬', icon: '🤝', sort_order: 5 },
  { group: 'active', name: '稿费', icon: '🖊️', sort_order: 6 },
  { group: 'active', name: '经营收入', icon: '🏪', sort_order: 7 },
  // 被动收入 passive
  { group: 'passive', name: '房租收入', icon: '🏠', sort_order: 1 },
  { group: 'passive', name: '理财收益', icon: '📈', sort_order: 2 },
  { group: 'passive', name: '股息分红', icon: '💹', sort_order: 3 },
  { group: 'passive', name: '利息', icon: '🏦', sort_order: 4 },
  { group: 'passive', name: '版权版税', icon: '📜', sort_order: 5 },
  { group: 'passive', name: '投资回报', icon: '💎', sort_order: 6 },
  // 转移性收入 transfer
  { group: 'transfer', name: '退款', icon: '↩️', sort_order: 1 },
  { group: 'transfer', name: '报销', icon: '🧾', sort_order: 2 },
  { group: 'transfer', name: '礼金收受', icon: '🧧', sort_order: 3 },
  { group: 'transfer', name: '政府补贴', icon: '🏛️', sort_order: 4 },
  { group: 'transfer', name: '赔偿金', icon: '💼', sort_order: 5 },
  { group: 'transfer', name: '赡养资助', icon: '🤲', sort_order: 6 },
  // 其他偶然收入 occasional
  { group: 'occasional', name: '中奖', icon: '🎰', sort_order: 1 },
  { group: 'occasional', name: '二手转卖', icon: '🔄', sort_order: 2 },
  { group: 'occasional', name: '红包', icon: '🧧', sort_order: 3 },
  { group: 'occasional', name: '其他', icon: '📦', sort_order: 4 }
]

// name→group 查表，供老数据回填（历史预置分类缺 group 时补齐）
const PRESET_CATEGORY_GROUP = {}
for (const c of PRESET_EXPENSE_CATEGORIES) PRESET_CATEGORY_GROUP[`expense:${c.name}`] = c.group
for (const c of PRESET_INCOME_CATEGORIES) PRESET_CATEGORY_GROUP[`income:${c.name}`] = c.group

const DEFAULT_LEDGER = {
  name: '总账本',
  icon: '📒',
  is_system: true,
  is_default: false,
  is_shared: false,
  sort_order: 0
}

function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

function formatDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

function formatYearKey(date = new Date()) {
  return `${date.getFullYear()}`
}

function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDaysToDateKey(dateKey, days) {
  const d = parseDateKey(dateKey)
  d.setDate(d.getDate() + days)
  return formatDateKey(d)
}

function todayDateKey() {
  return formatDateKey(new Date())
}

// 'YYYY-MM-DD HH:MM:SS' -> 'YYYY-MM-DDTHH:MM:SS'，兼容各 JS 引擎解析
function normalizeTimestamp(s) {
  return s.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/, '$1T$2')
}

// 数据库时间统一存储为 'YYYY-MM-DD HH:MM:SS' 字符串（本地时区）
function formatDateTime(date = new Date()) {
  let d
  if (date instanceof Date) d = date
  else if (typeof date === 'number') d = new Date(date)
  else d = new Date(normalizeTimestamp(String(date)))
  if (Number.isNaN(d.getTime())) throw new Error(`无法解析时间: ${date}`)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// 将任意时间输入（Date/时间戳/字符串）规范为存储字符串；已是该格式则原样返回
function toStoredTime(v) {
  if (v == null) return null
  if (v instanceof Date || typeof v === 'number') return formatDateTime(v)
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v)) return v
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v + ' 00:00:00'
    return formatDateTime(v)
  }
  return null
}

function nowTs() {
  return formatDateTime()
}

// 生成账本邀请码（避免 ledgers 集合 uk_share_code 唯一索引在 share_code 缺失时报
// "document is already exists"）。仅使用无歧义字符，提升分享时人工录入体验。
function genShareCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

function calcProgressPct(saved, target) {
  if (!target || target <= 0) return 0
  return Math.min(100, Math.round((saved / target) * 10000) / 100)
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
 * 幂等确保用户存在一条未删除的系统总账本；不存在则创建。
 * 与 ensureDoc 不同：本函数按 is_system=true 精确匹配，而非任意账本。
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function ensureMasterLedger(userId) {
  const db = getDb()
  const cmd = db.command
  const existing = await db.collection('ledgers')
    .where({ user_id: userId, is_system: true, deleted_at: cmd.eq(null) })
    .limit(1)
    .get()
  if (existing.data && existing.data[0]) return existing.data[0]

  const ts = nowTs()
  const doc = { user_id: userId, ...DEFAULT_LEDGER, share_code: genShareCode(), created_at: ts, updated_at: ts }
  const res = await db.collection('ledgers').add(doc)
  // 创建账本时：确保本人全局成员存在，并关联到本账本
  try {
    await ensureSelfMemberLinkedToLedger(userId, res.id)
  } catch (e) {
    console.error('[sparejar-db] ensureMasterLedger link self member failed', e)
  }
  return { _id: res.id, ...doc }
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
    share_code: genShareCode(),
    monthly_budget: Number(data.monthly_budget) || 0,
    sort_order: Number.isFinite(Number(data.sort_order)) ? Number(data.sort_order) : 0,
    created_at: ts,
    updated_at: ts
  }
  const res = await db.collection('ledgers').add(doc)
  // 创建账本时：确保本人全局成员存在，并关联到本账本
  try {
    await ensureSelfMemberLinkedToLedger(userId, res.id)
  } catch (e) {
    console.error('[sparejar-db] createLedger link self member failed', e)
  }
  return { _id: res.id, ...doc }
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
 * @param {string} userId
 * @param {{ name: string, target_amount: number, deadline?: string, cover_image_url?: string }} payload
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
    deadline: payload.deadline ? payload.deadline.toString().slice(0, 10) : '',
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
 * @param {{ name?: string, target_amount?: number, deadline?: string, cover_image_url?: string }} patch
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
  if (patch.cover_image_url !== undefined) update.cover_image_url = String(patch.cover_image_url).slice(0, 512)

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
  await db.collection('wishes').doc(wishId).update({ status: 'archived', updated_at: ts })
  return { _id: wishId, status: 'archived' }
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
 * 读取用户的结余分配历史（按时间倒序）。
 * @param {string} userId
 */
async function listSurplusAllocations(userId) {
  const db = getDb()
  const res = await db.collection('surplus_allocations')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .limit(100)
    .get()
  return (res.data || []).map((a) => ({ ...a }))
}

/**
 * 获取待分配的当日结余（最近一条 pending 且 surplus>0 的日结）。
 * 无则返回 null。
 * @param {string} userId
 */
async function getPendingAllocation(userId) {
  const db = getDb()
  const res = await db.collection('daily_settlements')
    .where({ user_id: userId, allocation_status: 'pending', surplus: db.command.gt(0) })
    .orderBy('date_key', 'desc')
    .limit(1)
    .get()
  const s = res.data && res.data[0]
  if (!s) return null
  return { date_key: s.date_key, surplus: s.surplus, settlement_id: s._id }
}

/**
 * 读取挑战中心所需全部数据：连续天数、今日/当月/当年挑战进度、最近7日热力图。
 * 金额单位为「分」。
 * @param {string} userId
 */
async function getChallengeSummary(userId) {
  const db = getDb()
  const todayKey = todayDateKey()
  const monthKey = formatMonthKey()
  const yearKey = formatYearKey()

  const [streak, dailyRes, monthlyRes, yearlyRes] = await Promise.all([
    getDocByUser('user_streaks', userId),
    db.collection('challenge_records').where({ user_id: userId, challenge_type: 'daily', period_key: todayKey }).limit(1).get(),
    db.collection('challenge_records').where({ user_id: userId, challenge_type: 'monthly', period_key: monthKey }).orderBy('created_at', 'asc').get(),
    db.collection('challenge_records').where({ user_id: userId, challenge_type: 'yearly', period_key: yearKey }).orderBy('created_at', 'asc').get()
  ])

  // 最近 7 天 daily 挑战，用于热力图
  const days = []
  for (let i = 6; i >= 0; i--) days.push(addDaysToDateKey(todayKey, -i))
  const histRes = await db.collection('challenge_records')
    .where({ user_id: userId, challenge_type: 'daily', period_key: db.command.in(days) })
    .get()
  const histMap = {}
  ;(histRes.data || []).forEach((d) => { histMap[d.period_key] = d })
  const history7 = days.map((k) => {
    const r = histMap[k]
    return {
      date_key: k,
      date: k.slice(5),
      consumed: r ? (r.consumed_amount || 0) : 0,
      base_limit: r ? (r.base_limit_snapshot || 0) : 0,
      is_success: r ? !!r.is_success : false
    }
  })

  return {
    streak: streak || null,
    daily: (dailyRes.data && dailyRes.data[0]) || null,
    monthly: monthlyRes.data || [],
    yearly: yearlyRes.data || [],
    history7
  }
}

/**
 * 设置月/年挑战目标（自定义周期总支出上限）。支持绑定单个子账本。
 * 金额单位为「分」。
 * @param {string} userId
 * @param {'monthly'|'yearly'} type
 * @param {string} periodKey
 * @param {number} targetAmount
 * @param {string} [ledgerId]
 */
async function setChallengeTarget(userId, type, periodKey, targetAmount, ledgerId) {
  if (type !== 'monthly' && type !== 'yearly') throw new Error('only monthly/yearly challenge can set target')
  const target = Number(targetAmount)
  if (!Number.isInteger(target) || target < 1) throw new Error('target_amount must be a positive integer (fen)')
  const db = getDb()
  const res = await db.collection('challenge_records')
    .where({ user_id: userId, challenge_type: type, period_key: periodKey })
    .limit(1)
    .get()
  const ts = nowTs()
  const patch = { target_amount: target, updated_at: ts }
  if (ledgerId) patch.ledger_id = ledgerId
  if (res.data && res.data[0]) {
    await db.collection('challenge_records').doc(res.data[0]._id).update(patch)
    return { _id: res.data[0]._id, ...patch }
  }
  const addRes = await db.collection('challenge_records').add({
    user_id: userId,
    challenge_type: type,
    period_key: periodKey,
    target_amount: target,
    consumed_amount: 0,
    base_limit_snapshot: null,
    ledger_id: ledgerId || '',
    is_success: false,
    status: 'active',
    created_at: ts,
    updated_at: ts
  })
  return { _id: addRes.id, ...patch }
}

/**
 * 读取成就定义并合并用户解锁状态。
 * @param {string} userId
 */
async function getAchievements(userId) {
  const db = getDb()
  const [achRes, unlockedRes] = await Promise.all([
    db.collection('achievements').where({ is_active: true }).orderBy('sort_order', 'asc').get(),
    db.collection('user_achievements').where({ user_id: userId }).get()
  ])
  const unlockedMap = {}
  ;(unlockedRes.data || []).forEach((a) => { unlockedMap[a.achievement_code] = a })
  const list = (achRes.data || []).map((a) => ({
    ...a,
    unlocked: !!unlockedMap[a.code],
    unlocked_at: unlockedMap[a.code] ? unlockedMap[a.code].unlocked_at : null
  }))
  return list
}

/**
 * 根据当前用户状态自动评估并解锁符合条件的成就（幂等）。
 * 覆盖条件类型：streak / limit / record / challenge。
 * @param {string} userId
 * @returns {Array} 本次新解锁的成就定义（含 unlock_skin_id）
 */
async function evaluateAndUnlockAchievements(userId) {
  const db = getDb()
  const [achRes, unlockedRes, streak, settings, txRes, wishRes, monthRes] = await Promise.all([
    db.collection('achievements').where({ is_active: true }).get(),
    db.collection('user_achievements').where({ user_id: userId }).get(),
    getDocByUser('user_streaks', userId),
    getDocByUser('user_settings', userId),
    db.collection('transactions').where({ user_id: userId }).limit(1).get(),
    db.collection('wishes').where({ user_id: userId }).limit(1).get(),
    db.collection('challenge_records').where({
      user_id: userId,
      challenge_type: 'monthly',
      period_key: formatMonthKey(),
      is_success: true
    }).get()
  ])
  const unlockedSet = new Set((unlockedRes.data || []).map((a) => a.achievement_code))
  const currentStreak = streak ? (streak.daily_current_streak || 0) : 0
  const limitSet = !!(settings && typeof settings.daily_base_limit === 'number' && settings.daily_base_limit > 0)
  const hasRecord = !!(txRes.data && txRes.data[0])
  const hasWish = !!(wishRes.data && wishRes.data[0])
  const monthlySuccessCount = (monthRes.data || []).length

  // 成就解锁皮肤钩子（§六.4）：连续挑战 7/30 天等成就可解锁罐体皮肤
  const userDoc = await getDocByUser('users', userId)
  const unlockedSkins = new Set((userDoc && userDoc.jar_skins_unlocked) || [])
  const skinsToAdd = []

  const newly = []
  for (const a of (achRes.data || [])) {
    if (unlockedSet.has(a.code)) continue
    let ok = false
    if (a.condition_type === 'streak') {
      ok = currentStreak >= (a.condition_value || 0)
    } else if (a.condition_type === 'limit') {
      ok = limitSet
    } else if (a.condition_type === 'record') {
      const ev = a.condition_meta && a.condition_meta.event
      if (ev === 'transaction_create') ok = hasRecord
      else if (ev === 'wish_create') ok = hasWish
    } else if (a.condition_type === 'challenge') {
      const ct = a.condition_meta && a.condition_meta.challenge_type
      if (ct === 'monthly') ok = monthlySuccessCount >= (a.condition_value || 1)
    }
    if (ok) {
      const ts = nowTs()
      await db.collection('user_achievements').add({
        user_id: userId,
        achievement_code: a.code,
        unlocked_at: ts,
        is_seen: false,
        created_at: ts
      })
      if (a.unlock_skin_id && !unlockedSkins.has(a.unlock_skin_id)) {
        skinsToAdd.push(a.unlock_skin_id)
        unlockedSkins.add(a.unlock_skin_id)
      }
      newly.push(a)
    }
  }

  // 批量将解锁皮肤写入 users.jar_skins_unlocked（去重）
  if (skinsToAdd.length && userDoc) {
    await getDb().collection('users').doc(userDoc._id).update({
      jar_skins_unlocked: Array.from(unlockedSkins),
      updated_at: nowTs()
    })
  }
  return newly
}

// ===== 引导与订阅消息（阶段 7） =====

/**
 * 更新引导进度/完成状态（写入 users 表）。
 * @param {string} userId
 * @param {number} [step] 0-4
 * @param {boolean} [done]
 */
async function updateOnboarding(userId, step, done) {
  const db = getDb()
  const userDoc = await getDocByUser('users', userId)
  if (!userDoc) return null
  const patch = { updated_at: nowTs() }
  if (typeof step === 'number') patch.onboarding_step = step
  if (typeof done === 'boolean') patch.onboarding_done = done
  await db.collection('users').doc(userDoc._id).update(patch)
  return patch
}

const WX_CONFIG = {
  appid: process.env.WX_APPID || '',
  secret: process.env.WX_SECRET || '',
  templates: {
    over_limit: process.env.WX_TPL_OVER_LIMIT || '',
    daily_surplus: process.env.WX_TPL_DAILY_SURPLUS || '',
    streak_risk: process.env.WX_TPL_STREAK_RISK || ''
  }
}

const SUBSCRIBE_TYPES = ['over_limit', 'daily_surplus', 'streak_risk']

async function getWxAccessToken() {
  if (!WX_CONFIG.appid || !WX_CONFIG.secret) return null
  const db = getDb()
  const cacheRes = await db.collection('wx_token_cache').where({ key: 'access_token' }).limit(1).get()
  const now = Date.now()
  if (cacheRes.data && cacheRes.data[0] && cacheRes.data[0].expires_at > now + 60000) {
    return cacheRes.data[0].token
  }
  const res = await uniCloud.httpclient.request('https://api.weixin.qq.com/cgi-bin/token', {
    method: 'GET',
    data: { grant_type: 'client_credential', appid: WX_CONFIG.appid, secret: WX_CONFIG.secret }
  })
  const body = res.data
  if (!body || !body.access_token) {
    console.error('[wx] 获取 access_token 失败', body)
    return null
  }
  const expiresAt = now + (body.expires_in || 7200) * 1000
  const token = body.access_token
  if (cacheRes.data && cacheRes.data[0]) {
    await db.collection('wx_token_cache').doc(cacheRes.data[0]._id).update({ token, expires_at: expiresAt, updated_at: nowTs() })
  } else {
    await db.collection('wx_token_cache').add({ key: 'access_token', token, expires_at: expiresAt, created_at: nowTs(), updated_at: nowTs() })
  }
  return token
}

/** 记录用户订阅授权（前端 requestSubscribeMessage 成功后调用）。 */
async function recordSubscribeAuth(userId, type) {
  if (!SUBSCRIBE_TYPES.includes(type)) throw new Error('invalid subscribe type')
  const db = getDb()
  const ts = nowTs()
  const res = await db.collection('subscribe_auth').where({ user_id: userId, type }).limit(1).get()
  if (res.data && res.data[0]) {
    await db.collection('subscribe_auth').doc(res.data[0]._id).update({ granted: true, granted_at: ts, updated_at: ts })
  } else {
    await db.collection('subscribe_auth').add({ user_id: userId, type, granted: true, granted_at: ts, last_sent_at: null, created_at: ts, updated_at: ts })
  }
  return { ok: true }
}

/**
 * 发送微信订阅消息。频控：同类消息每日最多 1 条（自然日）。
 * 微信配置（WX_APPID/WX_SECRET/模板ID）缺失时静默跳过，不报错（开发期可用）。
 * @param {string} userId openid
 * @param {'over_limit'|'daily_surplus'|'streak_risk'} type
 * @param {{data?: object, page?: string}} payload 模板字段与跳转页
 */
async function sendSubscribeMessage(userId, type, payload = {}) {
  const tplId = WX_CONFIG.templates[type]
  if (!WX_CONFIG.appid || !WX_CONFIG.secret || !tplId) {
    return { sent: false, skipped: 'config_missing' }
  }
  if (!SUBSCRIBE_TYPES.includes(type)) throw new Error('invalid subscribe type')
  const db = getDb()
  const authRes = await db.collection('subscribe_auth').where({ user_id: userId, type, granted: true }).limit(1).get()
  if (!(authRes.data && authRes.data[0])) {
    return { sent: false, skipped: 'not_authorized' }
  }
  // 频控：自然日 0 点起算
  const todayStart = new Date(formatDateKey() + 'T00:00:00').getTime()
  const last = authRes.data[0].last_sent_at
  if (last && last >= todayStart) {
    return { sent: false, skipped: 'rate_limited' }
  }
  const token = await getWxAccessToken()
  if (!token) return { sent: false, skipped: 'token_failed' }
  const res = await uniCloud.httpclient.request('https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=' + token, {
    method: 'POST',
    data: {
      touser: userId,
      template_id: tplId,
      data: payload.data || {},
      page: payload.page || 'pages/index/index'
    }
  })
  const body = res.data
  if (body && body.errcode === 0) {
    await db.collection('subscribe_auth').doc(authRes.data[0]._id).update({ last_sent_at: nowTs(), updated_at: nowTs() })
    return { sent: true }
  }
  console.error('[wx] 订阅消息发送失败', type, body)
  return { sent: false, skipped: 'wx_error', errcode: body && body.errcode, errmsg: body && body.errmsg }
}

async function getEffectiveBaseLimit(userId, dateKey) {
  const settings = await getDocByUser('user_settings', userId)
  if (!settings) return 10000
  if (settings.pending_base_limit && settings.limit_effective_date && settings.limit_effective_date <= dateKey) {
    return settings.pending_base_limit
  }
  return settings.daily_base_limit || 10000
}

/** 允许前端更新的 user_settings 字段白名单（防止越权写入） */
const SETTINGS_WRITABLE = [
  'daily_base_limit',
  'pending_base_limit',
  'limit_effective_date',
  'default_surplus_action',
  'default_wish_id',
  'refund_restore_limit',
  'monthly_budget',
  'over_limit_penalty_enabled',
  'penalty_streak_deduct',
  'notify_over_limit',
  'notify_daily_surplus',
  'notify_streak_risk',
  'asset_view_mode',
  'meal_tracking_enabled',
  'fat_loss_mode_enabled',
  'savings_withdraw_limit_pct'
]

/**
 * 更新用户个性化设置（白名单字段）。文档不存在时自动创建。
 * @param {string} userId
 * @param {Record<string, unknown>} patch
 */
async function updateUserSettings(userId, patch = {}) {
  const db = getDb()
  const settings = await getDocByUser('user_settings', userId)
  const ts = nowTs()
  const updateDoc = { updated_at: ts }
  for (const key of SETTINGS_WRITABLE) {
    if (Object.prototype.hasOwnProperty.call(patch, key) && patch[key] !== undefined) {
      updateDoc[key] = patch[key]
    }
  }
  if (settings) {
    await db.collection('user_settings').doc(settings._id).update(updateDoc)
    return { updated: true, ...updateDoc }
  }
  await db.collection('user_settings').add({ user_id: userId, ...updateDoc })
  return { created: true, ...updateDoc }
}

/**
 * 当日消费总额（分）。
 * - 限额口径（challengeMode=false）：按 include_in_daily_limit 过滤；退款冲减受 refundRestore（user_settings.refund_restore_limit）控制。
 * - 挑战口径（challengeMode=true）：按 include_in_challenge 过滤；退款始终冲减（「退款不计入挑战」），不受限额恢复开关影响。
 * @param {string} userId
 * @param {string} dateKey
 * @param {boolean} [refundRestore] 限额口径下是否将退款冲减当日消费（对应 refund_restore_limit）
 * @param {boolean} [challengeMode] 是否按挑战口径统计（include_in_challenge + 退款始终冲减）
 */
async function sumDailyLimitExpenses(userId, dateKey, refundRestore = true, challengeMode = false) {
  const db = getDb()
  const filterField = challengeMode ? 'include_in_challenge' : 'include_in_daily_limit'
  const res = await db.collection('transactions').where({
    user_id: userId,
    date_key: dateKey,
    type: 'expense',
    [filterField]: true,
    deleted_at: db.command.eq(null)
  }).field({ amount: true }).get()
  let total = (res.data || []).reduce((sum, row) => sum + (row.amount || 0), 0)

  // 退款冲减：挑战口径始终冲减（退款不计入挑战）；限额口径受 refund_restore_limit 控制
  const doRefund = challengeMode ? true : refundRestore
  if (doRefund) {
    const refundRes = await db.collection('transactions').where({
      user_id: userId,
      date_key: dateKey,
      type: 'refund',
      [filterField]: true,
      deleted_at: db.command.eq(null)
    }).field({ amount: true }).get()
    const refundTotal = (refundRes.data || []).reduce((sum, row) => sum + (row.amount || 0), 0)
    total = Math.max(0, total - refundTotal)
  }
  return total
}

async function applySurplusPoolChange(userId, direction, amount, reason, refs = {}) {
  if (amount <= 0) throw new Error('surplus pool amount must be positive')
  const db = getDb()
  const pool = await getDocByUser('surplus_pools', userId)
  const current = pool ? pool.balance || 0 : 0
  const delta = direction === 'in' ? amount : -amount
  const balanceAfter = current + delta
  if (balanceAfter < 0) throw new Error('surplus pool balance insufficient')

  const ts = nowTs()
  if (pool) {
    await db.collection('surplus_pools').doc(pool._id).update({
      balance: balanceAfter,
      total_in: direction === 'in' ? db.command.inc(amount) : pool.total_in,
      total_out: direction === 'out' ? db.command.inc(amount) : pool.total_out,
      updated_at: ts
    })
  } else {
    await db.collection('surplus_pools').add({
      user_id: userId,
      balance: balanceAfter,
      total_in: direction === 'in' ? amount : 0,
      total_out: direction === 'out' ? amount : 0,
      updated_at: ts
    })
  }

  await db.collection('surplus_pool_logs').add({
    user_id: userId,
    direction,
    amount,
    balance_after: balanceAfter,
    reason,
    ref_type: refs.ref_type || null,
    ref_id: refs.ref_id || null,
    date_key: refs.date_key || null,
    note: refs.note || '',
    created_at: ts
  })
  return balanceAfter
}

async function applySavingsPoolChange(userId, direction, amount, reason, refs = {}) {
  if (amount <= 0) throw new Error('savings pool amount must be positive')
  const db = getDb()
  const pool = await getDocByUser('savings_pools', userId)
  const current = pool ? pool.balance || 0 : 0
  const delta = direction === 'in' ? amount : -amount
  const balanceAfter = current + delta
  if (balanceAfter < 0) throw new Error('savings pool balance insufficient')

  const ts = nowTs()
  const monthKey = formatMonthKey()
  const updateData = {
    balance: balanceAfter,
    total_in: direction === 'in' ? db.command.inc(amount) : undefined,
    total_out: direction === 'out' ? db.command.inc(amount) : undefined,
    updated_at: ts
  }
  if (direction === 'out') {
    if (pool && pool.withdraw_month_key === monthKey) {
      updateData.month_withdrawn = db.command.inc(amount)
    } else {
      updateData.month_withdrawn = amount
      updateData.withdraw_month_key = monthKey
    }
  }
  Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k])

  if (pool) {
    await db.collection('savings_pools').doc(pool._id).update(updateData)
  } else {
    await db.collection('savings_pools').add({
      user_id: userId,
      balance: balanceAfter,
      total_in: direction === 'in' ? amount : 0,
      total_out: direction === 'out' ? amount : 0,
      month_withdrawn: direction === 'out' ? amount : 0,
      withdraw_month_key: direction === 'out' ? monthKey : null,
      updated_at: ts
    })
  }

  await db.collection('savings_pool_logs').add({
    user_id: userId,
    direction,
    amount,
    balance_after: balanceAfter,
    reason,
    ref_type: refs.ref_type || null,
    ref_id: refs.ref_id || null,
    date_key: refs.date_key || null,
    note: refs.note || '',
    created_at: ts
  })
  return balanceAfter
}

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
  await applySurplusPoolChange(userId, 'out', amount, 'to_wish', { ref_type: 'wish', ref_id: wishId })
  return await applyWishFundChange(userId, wishId, 'in', amount, 'surplus_pool', { ref_id: wishId })
}

/**
 * 从通用存款池转入心愿（存款池 out + 心愿 in）。
 * @param {string} userId
 * @param {string} wishId
 * @param {number} amount 分
 */
async function depositWishFromSavings(userId, wishId, amount) {
  await applySavingsPoolChange(userId, 'out', amount, 'to_wish', { ref_type: 'wish', ref_id: wishId })
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
  return await applySurplusPoolChange(userId, 'in', amount, 'from_wish', { ref_type: 'wish', ref_id: wishId })
}

/**
 * 通用存款池手动存入（来源：手动/日结余/心愿退回等由 reason 区分）。
 * @param {string} userId
 * @param {number} amount 分
 * @param {string} [reason]
 */
async function depositSavingsPool(userId, amount, reason = 'manual') {
  return await applySavingsPoolChange(userId, 'in', amount, reason, {})
}

/**
 * 通用存款池取出（回累计结余池由调用方决定；此处仅扣减存款池）。
 * 含 P2 每月比例限制：本月已取 + 本次 ≤ 余额 × savings_withdraw_ratio（默认 1）。
 * @param {string} userId
 * @param {number} amount 分
 * @param {string} [reason]
 */
async function withdrawSavingsPool(userId, amount, reason = 'manual') {
  if (amount <= 0) throw new Error('savings pool withdraw amount must be positive')
  const db = getDb()
  const pool = await getDocByUser('savings_pools', userId)
  const balance = pool ? pool.balance || 0 : 0
  const settings = await getDocByUser('user_settings', userId)
  const ratioLimit = settings && typeof settings.savings_withdraw_ratio === 'number' ? settings.savings_withdraw_ratio : 1
  const monthKey = formatMonthKey()
  const monthWithdrawn = pool && pool.withdraw_month_key === monthKey ? (pool.month_withdrawn || 0) : 0
  const maxMonthly = Math.floor(balance * ratioLimit)
  if (monthWithdrawn + amount > maxMonthly) {
    throw new Error('本月存款池取出已超过比例上限')
  }
  return await applySavingsPoolChange(userId, 'out', amount, reason, {})
}

async function applyAccountBalanceChange(userId, accountId, amountDelta, changeType, refs = {}) {
  const db = getDb()
  const accRes = await db.collection('asset_accounts').doc(accountId).get()
  const account = accRes.data && accRes.data[0]
  if (!account || account.user_id !== userId) throw new Error('asset account not found')

  const balanceAfter = (account.current_balance || 0) + amountDelta
  const ts = nowTs()
  await db.collection('asset_accounts').doc(accountId).update({
    current_balance: balanceAfter,
    updated_at: ts
  })

  await db.collection('account_balance_logs').add({
    user_id: userId,
    account_id: accountId,
    change_type: changeType,
    amount_delta: amountDelta,
    balance_after: balanceAfter,
    transaction_id: refs.transaction_id || null,
    counter_account_id: refs.counter_account_id || null,
    holding_id: refs.holding_id || null,
    note: refs.note || '',
    created_at: ts
  })
  return balanceAfter
}

async function recalculateDailySettlement(userId, dateKey) {
  const db = getDb()
  const settings = await getDocByUser('user_settings', userId)
  const baseLimit = await getEffectiveBaseLimit(userId, dateKey)
  const pool = await getDocByUser('surplus_pools', userId)
  const surplusPoolBalance = pool ? pool.balance || 0 : 0
  // 退款恢复当日可用额度：受 user_settings.refund_restore_limit 控制（默认开启）
  const refundRestore = settings ? settings.refund_restore_limit !== false : true
  const consumed = await sumDailyLimitExpenses(userId, dateKey, refundRestore, false)
  // 挑战口径消费：按 include_in_challenge 过滤，退款始终冲减（「退款不计入挑战」），与限额口径独立
  const challengeConsumed = await sumDailyLimitExpenses(userId, dateKey, true, true)
  const consumedFromBase = Math.min(consumed, baseLimit)
  const consumedFromSurplus = Math.max(0, consumed - baseLimit)
  const availableStart = baseLimit + surplusPoolBalance
  const availableEnd = availableStart - consumed
  const surplus = Math.max(0, baseLimit - consumedFromBase)
  const overAmount = Math.max(0, consumed - baseLimit - surplusPoolBalance)
  const isOverLimit = overAmount > 0 || consumed > baseLimit + surplusPoolBalance

  const existing = await db.collection('daily_settlements').where({ user_id: userId, date_key: dateKey }).limit(1).get()
  const payload = {
    user_id: userId,
    date_key: dateKey,
    base_limit: baseLimit,
    surplus_pool_start: surplusPoolBalance,
    consumed,
    consumed_from_base: consumedFromBase,
    consumed_from_surplus: consumedFromSurplus,
    surplus,
    over_amount: overAmount,
    available_start: availableStart,
    available_end: availableEnd,
    is_over_limit: isOverLimit
  }

  if (existing.data && existing.data[0]) {
    const doc = existing.data[0]
    await db.collection('daily_settlements').doc(doc._id).update(payload)
    return { ...doc, ...payload, challenge_consumed: challengeConsumed }
  }

  const ts = nowTs()
  const addRes = await db.collection('daily_settlements').add({
    ...payload,
    allocation_status: 'pending',
    allocation_id: null,
    penalty_applied: false,
    settled_at: null,
    created_at: ts
  })
  return { _id: addRes.id, ...payload, allocation_status: 'pending', challenge_consumed: challengeConsumed }
}

async function updateChallengeForDate(userId, dateKey, challengeConsumed, baseLimit) {
  const db = getDb()
  const monthKey = dateKey.slice(0, 7)
  const yearKey = dateKey.slice(0, 4)
  // 挑战口径消费：退款已冲减（「退款不计入挑战」），按 include_in_challenge 统计
  const isSuccess = challengeConsumed <= baseLimit

  const dailyRes = await db.collection('challenge_records').where({
    user_id: userId,
    challenge_type: 'daily',
    period_key: dateKey
  }).limit(1).get()

  // 当日挑战消费变化量（delta）：用于月/年挑战增量累加，避免每次交易变更重复累加当日消费
  const prevDailyConsumed = (dailyRes.data && dailyRes.data[0]) ? (dailyRes.data[0].consumed_amount || 0) : 0
  const delta = challengeConsumed - prevDailyConsumed

  const dailyPayload = {
    user_id: userId,
    challenge_type: 'daily',
    period_key: dateKey,
    consumed_amount: challengeConsumed,
    base_limit_snapshot: baseLimit,
    is_success: isSuccess,
    status: 'completed',
    completed_at: nowTs(),
    updated_at: nowTs()
  }
  if (dailyRes.data && dailyRes.data[0]) {
    await db.collection('challenge_records').doc(dailyRes.data[0]._id).update(dailyPayload)
  } else {
    await db.collection('challenge_records').add({ ...dailyPayload, created_at: nowTs() })
  }

  // 月/年挑战：累加当日挑战消费变化量（delta），退款冲减会使 delta 为负、自然冲减挑战消费
  for (const [type, key] of [['monthly', monthKey], ['yearly', yearKey]]) {
    const res = await db.collection('challenge_records').where({
      user_id: userId,
      challenge_type: type,
      period_key: key
    }).limit(1).get()
    if (res.data && res.data[0]) {
      const newConsumed = Math.max(0, (res.data[0].consumed_amount || 0) + delta)
      const target = res.data[0].target_amount || 0
      const isMsuccess = target > 0 ? newConsumed <= target : false
      await db.collection('challenge_records').doc(res.data[0]._id).update({
        consumed_amount: db.command.inc(delta),
        is_success: isMsuccess,
        status: isMsuccess ? 'completed' : 'active',
        updated_at: nowTs()
      })
    } else {
      // 记录不存在则创建（首次触发该周期交易时），consumed_amount 初始化为当日挑战消费变化量
      await db.collection('challenge_records').add({
        user_id: userId,
        challenge_type: type,
        period_key: key,
        target_amount: 0,
        consumed_amount: Math.max(0, delta),
        is_success: false,
        status: 'active',
        created_at: nowTs(),
        updated_at: nowTs()
      })
    }
  }

  const streak = await getDocByUser('user_streaks', userId)
  const ts = nowTs()
  if (isSuccess) {
    const lastSuccess = streak && streak.last_success_date_key
    let current = streak ? streak.daily_current_streak || 0 : 0
    if (lastSuccess) {
      const prev = parseDateKey(lastSuccess)
      const curr = parseDateKey(dateKey)
      const diffDays = Math.round((curr - prev) / 86400000)
      current = diffDays === 1 ? current + 1 : 1
    } else {
      current = 1
    }
    const maxStreak = Math.max(current, streak ? streak.daily_max_streak || 0 : 0)
    const payload = {
      daily_current_streak: current,
      daily_max_streak: maxStreak,
      last_success_date_key: dateKey,
      updated_at: ts
    }
    if (streak) {
      await db.collection('user_streaks').doc(streak._id).update(payload)
    } else {
      await db.collection('user_streaks').add({ user_id: userId, penalty_streak_deducted: 0, ...payload })
    }
  } else {
    const payload = {
      daily_current_streak: 0,
      last_fail_date_key: dateKey,
      updated_at: ts
    }
    if (streak) {
      await db.collection('user_streaks').doc(streak._id).update(payload)
    } else {
      await db.collection('user_streaks').add({
        user_id: userId,
        daily_current_streak: 0,
        daily_max_streak: 0,
        penalty_streak_deducted: 0,
        ...payload
      })
    }
  }
}

async function runDailySettlement(userId, dateKey, options = {}) {
  const db = getDb()
  const existingRes = await db.collection('daily_settlements').where({ user_id: userId, date_key: dateKey }).limit(1).get()
  const existing = existingRes.data && existingRes.data[0]
  if (existing && existing.settled_at && !options.force) {
    return { skipped: true, settlement: existing }
  }

  const settlement = await recalculateDailySettlement(userId, dateKey)
  await updateChallengeForDate(userId, dateKey, settlement.challenge_consumed != null ? settlement.challenge_consumed : settlement.consumed, settlement.base_limit)

  const settings = await getDocByUser('user_settings', userId)
  let allocationResult = null

  if (settlement.surplus > 0 && settlement.allocation_status === 'pending') {
    if (options.autoAllocate !== false) {
      allocationResult = await allocateSurplus(userId, dateKey, null, true)
    }
  }

  const ts = nowTs()
  await db.collection('daily_settlements').doc(settlement._id).update({
    settled_at: ts,
    allocation_status: allocationResult ? (allocationResult.is_auto ? 'auto_allocated' : 'allocated') : settlement.allocation_status
  })

  if (settlement.is_over_limit && settings && settings.over_limit_penalty_enabled) {
    await applyOverLimitPenalty(userId, dateKey, settlement)
  }

  // 订阅消息触达（频控在 sendSubscribeMessage 内；配置缺失时静默跳过）
  const y = (v) => '¥' + (Math.round(v) / 100).toFixed(2)
  // 日结待分配提醒：当日有结余且未自动分配（需用户手动处理）
  if (settlement.surplus > 0 && settlement.allocation_status === 'pending' && settings && settings.notify_daily_surplus) {
    await sendSubscribeMessage(userId, 'daily_surplus', {
      data: { amount1: { value: y(settlement.surplus) }, thing2: { value: '今日结余待分配' } },
      page: 'pages/surplus-alloc/surplus-alloc'
    }).catch(() => {})
  }
  // 连续挑战即将中断提醒：当前连续 > 0 且今天尚未延续成功
  if (settings && settings.notify_streak_risk) {
    const streak = await getDocByUser('user_streaks', userId)
    const cur = streak ? (streak.daily_current_streak || 0) : 0
    const lastOk = streak ? streak.last_success_date_key : null
    if (cur > 0 && lastOk !== formatDateKey()) {
      await sendSubscribeMessage(userId, 'streak_risk', {
        data: { number1: { value: String(cur) }, thing2: { value: '今天记账保持连续' } },
        page: 'pages/challenge/challenge'
      }).catch(() => {})
    }
  }

  return { skipped: false, settlement, allocation: allocationResult }
}

async function allocateSurplus(userId, dateKey, items, isAuto = false) {
  const db = getDb()
  const settlementRes = await db.collection('daily_settlements').where({ user_id: userId, date_key: dateKey }).limit(1).get()
  const settlement = settlementRes.data && settlementRes.data[0]
  if (!settlement) throw new Error('settlement not found')
  if (settlement.allocation_status !== 'pending') throw new Error('settlement already allocated')

  const settings = await getDocByUser('user_settings', userId)
  let allocItems = items
  if (!allocItems || !allocItems.length) {
    const action = settings ? settings.default_surplus_action : 'roll_over'
    if (action === 'wish' && settings.default_wish_id) {
      allocItems = [{ target_type: 'wish', amount: settlement.surplus, wish_id: settings.default_wish_id }]
    } else if (action === 'savings_pool') {
      allocItems = [{ target_type: 'savings_pool', amount: settlement.surplus }]
    } else {
      allocItems = [{ target_type: 'roll_over', amount: settlement.surplus }]
    }
  }

  const total = allocItems.reduce((s, i) => s + i.amount, 0)
  if (total !== settlement.surplus) throw new Error('allocation total must equal daily surplus')

  const ts = nowTs()
  const allocRes = await db.collection('surplus_allocations').add({
    user_id: userId,
    date_key: dateKey,
    settlement_id: settlement._id,
    total_amount: total,
    items: allocItems,
    is_auto: isAuto,
    created_at: ts
  })

  for (const item of allocItems) {
    if (item.target_type === 'roll_over') {
      await applySurplusPoolChange(userId, 'in', item.amount, 'daily_surplus', {
        ref_type: 'allocation',
        ref_id: allocRes.id,
        date_key: dateKey
      })
    } else if (item.target_type === 'wish') {
      await applyWishFundChange(userId, item.wish_id, 'in', item.amount, 'surplus_allocation', {
        ref_id: allocRes.id
      })
    } else if (item.target_type === 'savings_pool') {
      await applySavingsPoolChange(userId, 'in', item.amount, 'surplus_in', {
        ref_type: 'allocation',
        ref_id: allocRes.id,
        date_key: dateKey
      })
    }
  }

  await db.collection('daily_settlements').doc(settlement._id).update({
    allocation_status: isAuto ? 'auto_allocated' : 'allocated',
    allocation_id: allocRes.id
  })

  return { allocation_id: allocRes.id, items: allocItems, is_auto: isAuto }
}

async function applyOverLimitPenalty(userId, dateKey, settlement) {
  const db = getDb()
  const settings = await getDocByUser('user_settings', userId)
  const deduct = settings ? settings.penalty_streak_deduct || 1 : 1
  const streak = await getDocByUser('user_streaks', userId)
  const before = streak ? streak.daily_current_streak || 0 : 0
  const after = Math.max(0, before - deduct)
  const ts = nowTs()

  if (streak) {
    await db.collection('user_streaks').doc(streak._id).update({
      daily_current_streak: after,
      penalty_streak_deducted: db.command.inc(deduct),
      updated_at: ts
    })
  }

  await db.collection('user_penalty_logs').add({
    user_id: userId,
    date_key: dateKey,
    settlement_id: settlement._id,
    over_amount: settlement.over_amount,
    penalty_type: 'streak_deduct',
    penalty_value: deduct,
    streak_before: before,
    streak_after: after,
    achievement_codes_affected: [],
    created_at: ts
  })

  await db.collection('daily_settlements').doc(settlement._id).update({ penalty_applied: true })
}

/**
 * 幂等确保某集合存在一条 user_id 归属的文档；已存在则直接返回，避免重复插入。
 * @returns {Promise<object>} 已存在文档或新建文档（含 _id）
 */
async function ensureDoc(collection, userId, buildDoc) {
  const existing = await getDocByUser(collection, userId)
  if (existing) return existing
  const doc = buildDoc()
  const res = await getDb().collection(collection).add(doc)
  return { _id: res.id, ...doc }
}

async function initUser(userId, profile = {}) {
  const ts = nowTs()

  // users 档案：独立幂等，created 标记仅用于返回语义
  const existingUser = await getDocByUser('users', userId)
  let userDoc = existingUser
  let isNew = false
  if (!existingUser) {
    userDoc = {
      user_id: userId,
      nickname: profile.nickname || '',
      avatar_url: profile.avatar_url || '',
      timezone: profile.timezone || 'Asia/Shanghai',
      onboarding_done: false,
      onboarding_step: 0,
      is_guest: false,
      jar_skin_id: 'classic_glass',
      jar_skins_unlocked: ['classic_glass'],
      zodiac: profile.zodiac || null,
      constellation: profile.constellation || null,
      birthday: profile.birthday || null,
      created_at: ts,
      updated_at: ts,
      deleted_at: null
    }
    const res = await getDb().collection('users').add(userDoc)
    userDoc = { _id: res.id, ...userDoc }
    isNew = true
  }

  // 以下各实体独立幂等创建，任意一步中途失败都不影响其余，重试可补齐
  await ensureDoc('user_settings', userId, () => ({
    user_id: userId,
    daily_base_limit: 10000,
    pending_base_limit: null,
    limit_effective_date: null,
    default_surplus_action: 'roll_over',
    default_wish_id: null,
    refund_restore_limit: true,
    challenge_ledger_id: null,
    max_custom_ledgers: 5,
    notify_over_limit: true,
    notify_daily_surplus: true,
    notify_streak_risk: true,
    meal_tracking_enabled: false,
    fat_loss_mode_enabled: false,
    savings_withdraw_limit_pct: null,
    over_limit_penalty_enabled: false,
    penalty_streak_deduct: 1,
    asset_view_mode: 'disposable',
    updated_at: ts
  }))

  await ensureDoc('surplus_pools', userId, () => ({
    user_id: userId, balance: 0, total_in: 0, total_out: 0, updated_at: ts
  }))

  await ensureDoc('savings_pools', userId, () => ({
    user_id: userId, balance: 0, total_in: 0, total_out: 0,
    month_withdrawn: 0, withdraw_month_key: null, updated_at: ts
  }))

  await ensureDoc('user_streaks', userId, () => ({
    user_id: userId,
    daily_current_streak: 0,
    daily_max_streak: 0,
    last_success_date_key: null,
    last_fail_date_key: null,
    penalty_streak_deducted: 0,
    updated_at: ts
  }))

  const ledger = await ensureMasterLedger(userId)

  // 预置分类：按 type+name 去重，重复登录不会插入重复分类
  const existingCats = await getDb().collection('categories')
    .where({ user_id: userId })
    .field({ name: true, type: true, group: true, is_system: true, _id: true })
    .get()
  const have = new Set()
  const backfillUpdates = []
  for (const c of (existingCats.data || [])) {
    have.add(`${c.type}:${c.name}`)
    // 老数据回填：系统预置分类若缺 group，按 name→group 查表补上
    if (c.is_system && !c.group) {
      const g = PRESET_CATEGORY_GROUP[`${c.type}:${c.name}`]
      if (g) backfillUpdates.push({ _id: c._id, group: g })
    }
  }
  for (const u of backfillUpdates) {
    await getDb().collection('categories').doc(u._id).update({ group: u.group })
  }
  const categoryDocs = []
  for (const c of PRESET_EXPENSE_CATEGORIES) {
    if (have.has(`expense:${c.name}`)) continue
    categoryDocs.push({
      user_id: userId, type: 'expense', group: c.group, name: c.name, icon: c.icon,
      is_system: true, is_hidden: false, sort_order: c.sort_order, merged_to_id: null, created_at: ts
    })
  }
  for (const c of PRESET_INCOME_CATEGORIES) {
    if (have.has(`income:${c.name}`)) continue
    categoryDocs.push({
      user_id: userId, type: 'income', group: c.group, name: c.name, icon: c.icon,
      is_system: true, is_hidden: false, sort_order: c.sort_order, merged_to_id: null, created_at: ts
    })
  }
  for (const doc of categoryDocs) {
    await getDb().collection('categories').add(doc)
  }

  return { created: isNew, user: userDoc, default_ledger_id: ledger._id }
}

// ===== 商品贴纸体系（阶段 8：囤货 + 普通素材） =====

/** 按 _id 取贴纸并校验归属。 */
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
      const tx = await createTransaction(userId, {
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

  const tx = await createTransaction(userId, {
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

async function createTransaction(userId, data) {
  const db = getDb()
  const ts = nowTs()
  const dateKey = data.date_key || formatDateKey(new Date(data.transaction_at || ts))
  const txDoc = {
    user_id: userId,
    type: data.type,
    amount: data.amount,
    category_id: data.category_id || null,
    ledger_id: data.ledger_id,
    account_id: data.account_id || null,
    to_account_id: data.to_account_id || null,
    holding_id: data.holding_id || null,
    date_key: dateKey,
    month_key: dateKey.slice(0, 7),
    transaction_at: data.transaction_at ? toStoredTime(data.transaction_at) : ts,
    recorded_at: ts,
    note: data.note || '',
    image_urls: data.image_urls || [],
    sticker_id: data.sticker_id || null,
    sticker_image_url: data.sticker_image_url || null,
    tags: data.tags || [],
    related_transaction_id: data.related_transaction_id || null,
    stock_consume_qty: data.stock_consume_qty || null,
    include_in_daily_limit: data.include_in_daily_limit !== false,
    include_in_challenge: data.include_in_challenge !== false,
    ocr_meta: data.ocr_meta || null,
    meal_id: null,
    created_by: userId,
    deleted_at: null,
    created_at: ts,
    updated_at: ts
  }

  const addRes = await db.collection('transactions').add(txDoc)
  const transactionId = addRes.id

  // 阶段 10：账户联动——专项/投资账户的消费不计入日限额与日挑战（§3.11.5）
  if (data.account_id) {
    try {
      const accRes = await db.collection('asset_accounts').doc(data.account_id).get()
      const acc = accRes.data && accRes.data[0]
      if (acc && acc.user_id === userId) {
        if (acc.include_in_daily_limit === false) txDoc.include_in_daily_limit = false
        if (acc.include_in_challenge === false) txDoc.include_in_challenge = false
      }
    } catch (_e) { /* 账户不存在则按默认计限 */ }
  }

  if (data.account_id) {
    let delta = 0
    if (data.type === 'expense') delta = -data.amount
    else if (data.type === 'income' || data.type === 'refund') delta = data.amount
    else if (data.type === 'transfer') delta = -data.amount
    if (delta !== 0) {
      await applyAccountBalanceChange(userId, data.account_id, delta, 'transaction', {
        transaction_id: transactionId
      })
    }
  }
  if (data.type === 'transfer' && data.to_account_id) {
    await applyAccountBalanceChange(userId, data.to_account_id, data.amount, 'transfer_in', {
      transaction_id: transactionId,
      counter_account_id: data.account_id
    })
  }

  let settlement
  if (data.type === 'expense' && txDoc.include_in_daily_limit) {
    settlement = await recalculateDailySettlement(userId, dateKey)
    const pool = await getDocByUser('surplus_pools', userId)
    const poolBal = pool ? pool.balance || 0 : 0
    const baseLimit = settlement.base_limit
    const consumed = settlement.consumed
    const needFromSurplus = Math.max(0, consumed - baseLimit)
    const prevConsumed = consumed - data.amount
    const prevNeed = Math.max(0, prevConsumed - baseLimit)
    const surplusUsed = needFromSurplus - prevNeed
    if (surplusUsed > 0 && poolBal >= surplusUsed) {
      await applySurplusPoolChange(userId, 'out', surplusUsed, 'consume_deduct', {
        ref_type: 'transaction',
        ref_id: transactionId,
        date_key: dateKey
      })
      settlement = await recalculateDailySettlement(userId, dateKey)
    }
  } else {
    settlement = await recalculateDailySettlement(userId, dateKey)
  }

  // 新增交易（含退款）需同步更新挑战进度；挑战口径消费退款始终冲减
  await updateChallengeForDate(userId, dateKey, settlement.challenge_consumed != null ? settlement.challenge_consumed : settlement.consumed, settlement.base_limit)

  // 超额提醒订阅消息（频控在 sendSubscribeMessage 内；配置缺失时静默跳过）
  if (settlement && settlement.consumed > settlement.base_limit) {
    const s = await getDocByUser('user_settings', userId)
    if (s && s.notify_over_limit) {
      const y = (v) => '¥' + (Math.round(v) / 100).toFixed(2)
      await sendSubscribeMessage(userId, 'over_limit', {
        data: {
          amount1: { value: y(settlement.consumed) },
          amount2: { value: y(settlement.base_limit) },
          thing3: { value: '今日已超支，注意控制' }
        },
        page: 'pages/index/index'
      }).catch(() => {})
    }
  }

  return { transaction_id: transactionId, ...txDoc }
}

async function softDeleteTransaction(userId, transactionId) {
  const db = getDb()
  const res = await db.collection('transactions').doc(transactionId).get()
  const tx = res.data && res.data[0]
  if (!tx || tx.user_id !== userId) throw new Error('transaction not found')
  if (tx.deleted_at) return { already_deleted: true }

  const ts = nowTs()
  await db.collection('transactions').doc(transactionId).update({ deleted_at: ts, updated_at: ts })

  if (tx.account_id) {
    let delta = 0
    if (tx.type === 'expense') delta = tx.amount
    else if (tx.type === 'income' || tx.type === 'refund') delta = -tx.amount
    else if (tx.type === 'transfer') delta = tx.amount
    if (delta !== 0) {
      await applyAccountBalanceChange(userId, tx.account_id, delta, 'refund', {
        transaction_id: transactionId,
        note: 'transaction soft delete rollback'
      })
    }
  }
  if (tx.type === 'transfer' && tx.to_account_id) {
    await applyAccountBalanceChange(userId, tx.to_account_id, -tx.amount, 'refund', {
      transaction_id: transactionId,
      counter_account_id: tx.account_id,
      note: 'transfer rollback'
    })
  }

  const settlement = await recalculateDailySettlement(userId, tx.date_key)
  await updateChallengeForDate(userId, tx.date_key, settlement.challenge_consumed != null ? settlement.challenge_consumed : settlement.consumed, settlement.base_limit)

  return { deleted: true, transaction_id: transactionId }
}

/**
 * 删除账本（软删），并处理其下交易的归属。
 * @param {string} userId
 * @param {string} ledgerId
 * @param {'transfer'|'purge'} mode transfer=交易转移至总账本；purge=交易一并软删
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

/** 自定义分类上限 */
const MAX_CUSTOM_CATEGORIES = 20

/**
 * 列出分类（分类管理页用）。
 * 返回的每个分类附带 usage_count（未删除的关联账目数），便于判断能否直接删除。
 * @param {string} userId
 * @param {{ type?: 'expense'|'income', includeHidden?: boolean }} [opts]
 */
async function listCategories(userId, opts = {}) {
  const db = getDb()
  const where = { user_id: userId }
  if (opts.type) where.type = opts.type
  if (!opts.includeHidden) where.is_hidden = false
  const res = await db.collection('categories').where(where).orderBy('sort_order', 'asc').get()
  const cats = (res.data || []).map((c) => ({ ...c }))

  // 统计每个分类的关联账目数（未删除）
  const ids = cats.map((c) => c._id)
  const usageMap = {}
  if (ids.length) {
    const agg = await db.collection('transactions').aggregate()
      .match({ user_id: userId, category_id: { $in: ids }, deleted_at: db.command.eq(null) })
      .group({ _id: '$category_id', count: { $sum: 1 } })
      .end()
    for (const row of (agg.data || [])) {
      usageMap[String(row._id)] = row.count
    }
  }
  return cats.map((c) => ({ ...c, usage_count: usageMap[String(c._id)] || 0 }))
}

/** 取某 type 的合法二级分组码 */
function validGroupsOf(type) {
  return (type === 'income' ? INCOME_GROUPS : EXPENSE_GROUPS).map((g) => g.code)
}

/**
 * 新建自定义分类。
 * @param {string} userId
 * @param {{ type: 'expense'|'income', name: string, icon?: string, group?: string }} data
 */
async function createCategory(userId, data = {}) {
  const db = getDb()
  const type = data.type
  if (type !== 'expense' && type !== 'income') throw new Error('type 必须为 expense 或 income')

  const name = typeof data.name === 'string' ? data.name.trim() : ''
  if (!name) throw new Error('分类名称不能为空')
  if (name.length > 32) throw new Error('分类名称不能超过32字')

  const groups = validGroupsOf(type)
  let group = typeof data.group === 'string' ? data.group : ''
  if (!groups.includes(group)) group = groups[0]

  const icon = typeof data.icon === 'string' && data.icon ? data.icon.slice(0, 64) : '📦'

  // 自定义分类上限
  const cntRes = await db.collection('categories').where({ user_id: userId, type, is_system: false }).count()
  if ((cntRes.total || 0) >= MAX_CUSTOM_CATEGORIES) {
    throw new Error(`自定义分类已达上限(${MAX_CUSTOM_CATEGORIES})`)
  }

  // 下一个排序号（排在预置之后）
  const maxRes = await db.collection('categories').where({ user_id: userId, type }).orderBy('sort_order', 'desc').limit(1).get()
  const maxSort = (maxRes.data && maxRes.data[0] && maxRes.data[0].sort_order) || 0

  const ts = nowTs()
  const addRes = await db.collection('categories').add({
    user_id: userId,
    type,
    group,
    name,
    icon,
    is_system: false,
    is_hidden: false,
    sort_order: maxSort + 1,
    created_at: ts
  })
  return {
    _id: addRes.id, user_id: userId, type, group, name, icon,
    is_system: false, is_hidden: false, sort_order: maxSort + 1, created_at: ts, usage_count: 0
  }
}

/**
 * 编辑分类：预置分类仅可切换隐藏；自定义可改名称/图标/分组/隐藏/排序。
 * @param {string} userId
 * @param {string} categoryId
 * @param {{ name?: string, icon?: string, group?: string, is_hidden?: boolean, sort_order?: number }} data
 */
async function updateCategory(userId, categoryId, data = {}) {
  const db = getDb()
  const res = await db.collection('categories').doc(categoryId).get()
  const cat = res.data && res.data[0]
  if (!cat || cat.user_id !== userId) throw new Error('category not found')

  const ts = nowTs()
  const updateDoc = { updated_at: ts }

  if (cat.is_system) {
    // 预置分类仅允许切换隐藏
    if (data.is_hidden !== undefined) updateDoc.is_hidden = !!data.is_hidden
  } else {
    if (typeof data.name === 'string') {
      const name = data.name.trim()
      if (!name) throw new Error('分类名称不能为空')
      if (name.length > 32) throw new Error('分类名称不能超过32字')
      updateDoc.name = name
    }
    if (typeof data.icon === 'string' && data.icon) updateDoc.icon = data.icon.slice(0, 64)
    if (typeof data.group === 'string') {
      if (validGroupsOf(cat.type).includes(data.group)) updateDoc.group = data.group
    }
    if (data.is_hidden !== undefined) updateDoc.is_hidden = !!data.is_hidden
    if (typeof data.sort_order === 'number') updateDoc.sort_order = data.sort_order
  }

  await db.collection('categories').doc(categoryId).update(updateDoc)
  return { category_id: categoryId, ...updateDoc }
}

/**
 * 删除自定义分类（软隐藏）。
 * 有关联账目时必须指定合并目标分类（mergeToId），关联账目与贴纸一并转移；
 * 无关联账目可直接删除（mergeToId 可空）。删除后分类置为隐藏并保留 merged_to_id。
 * @param {string} userId
 * @param {string} categoryId
 * @param {string|null} [mergeToId]
 */
async function deleteCategory(userId, categoryId, mergeToId = null) {
  const db = getDb()
  const res = await db.collection('categories').doc(categoryId).get()
  const cat = res.data && res.data[0]
  if (!cat || cat.user_id !== userId) throw new Error('category not found')
  if (cat.is_system) throw new Error('预置分类不可删除')

  const txCountRes = await db.collection('transactions')
    .where({ user_id: userId, category_id: categoryId, deleted_at: db.command.eq(null) })
    .count()
  const txCount = txCountRes.total || 0

  const ts = nowTs()
  if (txCount > 0) {
    if (!mergeToId) throw new Error('该分类下有关联账目，请选择合并目标分类')
    const mRes = await db.collection('categories').doc(mergeToId).get()
    const mCat = mRes.data && mRes.data[0]
    if (!mCat || mCat.user_id !== userId) throw new Error('合并目标分类不存在')
    if (mCat.type !== cat.type) throw new Error('合并目标分类类型不一致')
    if (mCat._id === cat._id) throw new Error('不能合并到自身')
    // 转移关联账目与贴纸
    await db.collection('transactions').where({ user_id: userId, category_id: categoryId })
      .update({ category_id: mergeToId, updated_at: ts })
    await db.collection('stickers').where({ user_id: userId, category_id: categoryId })
      .update({ category_id: mergeToId, updated_at: ts })
  }

  // 软隐藏（删除）
  await db.collection('categories').doc(categoryId).update({
    is_hidden: true,
    merged_to_id: mergeToId || null,
    updated_at: ts
  })
  return { deleted: true, category_id: categoryId, merged_to_id: mergeToId, reassigned: txCount }
}

/**
 * 重排某分组内自定义分类顺序。
 * @param {string} userId
 * @param {'expense'|'income'} type
 * @param {string} group 二级分组码
 * @param {string[]} orderedIds 该分组内自定义分类的期望顺序（id 列表）
 */
async function reorderCategories(userId, type, group, orderedIds = []) {
  const db = getDb()
  if (type !== 'expense' && type !== 'income') throw new Error('type 必须为 expense 或 income')
  if (!Array.isArray(orderedIds) || !orderedIds.length) return { ok: true }
  if (!validGroupsOf(type).includes(group)) throw new Error('非法的分组码')

  const validRes = await db.collection('categories').where({
    user_id: userId, type, group, is_system: false, _id: db.command.in(orderedIds)
  }).get()
  const validIds = new Set((validRes.data || []).map((c) => c._id))

  // 自定义分类排序号从 100 起，确保排在预置分类之后
  let order = 100
  for (const id of orderedIds) {
    if (!validIds.has(id)) continue
    await db.collection('categories').doc(id).update({ sort_order: order, updated_at: nowTs() })
    order += 1
  }
  return { ok: true }
}

/**
 * 编辑交易：先回滚旧值影响，再应用新值影响，最后重算当日结算与挑战。
 * 支持跨日编辑（date_key 变化会对新旧两个日期都重算）。
 * @param {string} userId
 * @param {string} transactionId
 * @param {Record<string, unknown>} data 可包含 type/amount/category_id/ledger_id/account_id/note/transaction_at/date_key/include_in_daily_limit/include_in_challenge/image_urls/sticker_id 等
 */
async function updateTransaction(userId, transactionId, data) {
  const db = getDb()
  const res = await db.collection('transactions').doc(transactionId).get()
  const oldTx = res.data && res.data[0]
  if (!oldTx || oldTx.user_id !== userId) throw new Error('transaction not found')
  if (oldTx.deleted_at) throw new Error('transaction already deleted')

  const ts = nowTs()

  // 1) 回滚旧值影响
  if (oldTx.account_id) {
    let delta = 0
    if (oldTx.type === 'expense') delta = oldTx.amount
    else if (oldTx.type === 'income' || oldTx.type === 'refund') delta = -oldTx.amount
    else if (oldTx.type === 'transfer') delta = oldTx.amount
    if (delta !== 0) {
      await applyAccountBalanceChange(userId, oldTx.account_id, delta, 'refund', {
        transaction_id: transactionId,
        note: 'transaction update rollback'
      })
    }
  }
  if (oldTx.type === 'transfer' && oldTx.to_account_id) {
    await applyAccountBalanceChange(userId, oldTx.to_account_id, -oldTx.amount, 'refund', {
      transaction_id: transactionId,
      counter_account_id: oldTx.account_id,
      note: 'transfer update rollback'
    })
  }
  const oldSettlement = await recalculateDailySettlement(userId, oldTx.date_key)
  await updateChallengeForDate(userId, oldTx.date_key, oldSettlement.challenge_consumed != null ? oldSettlement.challenge_consumed : oldSettlement.consumed, oldSettlement.base_limit)

  // 2) 计算新值（未传字段沿用旧值）
  const newType = data.type || oldTx.type
  const newAmount = typeof data.amount === 'number' ? data.amount : oldTx.amount
  const newAccountId = data.account_id !== undefined ? (data.account_id || null) : oldTx.account_id
  const newToAccountId = data.to_account_id !== undefined ? (data.to_account_id || null) : oldTx.to_account_id
  const transactionAt = toStoredTime(data.transaction_at) || oldTx.transaction_at
  const dateKey = data.date_key || formatDateKey(new Date(transactionAt))
  const includeInDailyLimit = data.include_in_daily_limit !== undefined
    ? data.include_in_daily_limit !== false
    : oldTx.include_in_daily_limit
  const includeInChallenge = data.include_in_challenge !== undefined
    ? data.include_in_challenge !== false
    : oldTx.include_in_challenge

  // 3) 更新文档
  const updateDoc = {
    type: newType,
    amount: newAmount,
    category_id: data.category_id !== undefined ? (data.category_id || null) : oldTx.category_id,
    ledger_id: data.ledger_id !== undefined ? data.ledger_id : oldTx.ledger_id,
    account_id: newAccountId,
    to_account_id: newToAccountId,
    holding_id: data.holding_id !== undefined ? (data.holding_id || null) : oldTx.holding_id,
    date_key: dateKey,
    month_key: dateKey.slice(0, 7),
    transaction_at: transactionAt,
    note: data.note !== undefined ? (data.note || '') : oldTx.note,
    image_urls: data.image_urls !== undefined ? (data.image_urls || []) : oldTx.image_urls,
    sticker_id: data.sticker_id !== undefined ? (data.sticker_id || null) : oldTx.sticker_id,
    sticker_image_url: data.sticker_image_url !== undefined ? (data.sticker_image_url || null) : oldTx.sticker_image_url,
    include_in_daily_limit: includeInDailyLimit,
    include_in_challenge: includeInChallenge,
    updated_at: ts
  }
  await db.collection('transactions').doc(transactionId).update(updateDoc)

  // 4) 应用新值影响
  if (newAccountId) {
    let delta = 0
    if (newType === 'expense') delta = -newAmount
    else if (newType === 'income' || newType === 'refund') delta = newAmount
    else if (newType === 'transfer') delta = -newAmount
    if (delta !== 0) {
      await applyAccountBalanceChange(userId, newAccountId, delta, 'transaction', {
        transaction_id: transactionId
      })
    }
  }
  if (newType === 'transfer' && newToAccountId) {
    await applyAccountBalanceChange(userId, newToAccountId, newAmount, 'transfer_in', {
      transaction_id: transactionId,
      counter_account_id: newAccountId
    })
  }

  // 重算结算 + 挑战（新日期）
  const finalSettlement = await recalculateDailySettlement(userId, dateKey)
  await updateChallengeForDate(userId, dateKey, finalSettlement.challenge_consumed != null ? finalSettlement.challenge_consumed : finalSettlement.consumed, finalSettlement.base_limit)
  // 跨日编辑：旧日期也需重算挑战
  if (oldTx.date_key !== dateKey) {
    const oldReSettlement = await recalculateDailySettlement(userId, oldTx.date_key)
    await updateChallengeForDate(userId, oldTx.date_key, oldReSettlement.challenge_consumed != null ? oldReSettlement.challenge_consumed : oldReSettlement.consumed, oldReSettlement.base_limit)
  }

  return { transaction_id: transactionId, ...oldTx, ...updateDoc }
}

// ===== 阶段 9：拍照 OCR 识别记账 =====
// OCR 服务商配置：在云函数「运行配置 / 环境变量」中设置对应密钥后自动生效
//   BAIDU_OCR_API_KEY / BAIDU_OCR_SECRET_KEY  —— 百度智能云 OCR（默认）
//   TENCENT_OCR_SECRET_ID / TENCENT_OCR_SECRET_KEY —— 腾讯云 OCR（预留）
const OCR_PROVIDER = process.env.OCR_PROVIDER || 'baidu'
const OCR_BAIDU = {
  apiKey: process.env.BAIDU_OCR_API_KEY || '',
  secretKey: process.env.BAIDU_OCR_SECRET_KEY || '',
  tokenUrl: 'https://aip.baidubce.com/oauth/2.0/token',
  ocrUrl: 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic'
}
const OCR_TENCENT = {
  secretId: process.env.TENCENT_OCR_SECRET_ID || '',
  secretKey: process.env.TENCENT_OCR_SECRET_KEY || ''
}

/** 获取百度 OCR access_token（client_credentials 模式） */
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
function parseAmountFen(text) {
  if (!text) return 0
  const lines = String(text).split('\n')
  const keywordRe = /(合计|应收|实收|总额|总金额|消费金额|付款金额|应付|金额|总计|找零)/i
  let candidate = null
  for (const line of lines) {
    if (keywordRe.test(line)) {
      const m = line.match(/[¥￥]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/)
      if (m) { candidate = m[1]; break }
    }
  }
  if (!candidate) {
    const all = String(text).match(/[¥￥]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g) || []
    let max = 0
    for (const a of all) {
      const n = parseFloat(a.replace(/[¥￥\s,]/g, ''))
      if (!isNaN(n) && n > max) max = n
    }
    if (max <= 0) return 0
    candidate = String(max)
  }
  const num = parseFloat(String(candidate).replace(/,/g, ''))
  if (isNaN(num) || num <= 0) return 0
  return Math.round(num * 100)
}

/** 提取商户名（含店/超市/餐厅等关键字行，否则首行） */
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

// ===== 阶段 10：资产账户体系（§3.11、§11.1、§11.2） =====

/** 账户大类 → 默认计入规则 */
const ACCOUNT_CLASS_DEFAULTS = {
  daily: { include_in_disposable: true, include_in_daily_limit: true, include_in_total_asset: true },
  special: { include_in_disposable: false, include_in_daily_limit: false, include_in_total_asset: false },
  investment: { include_in_disposable: false, include_in_daily_limit: false, include_in_total_asset: false }
}

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
  const res = await db.collection('asset_accounts').add(doc)
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
    if (a.include_in_disposable) disposable += balance
    if (a.include_in_total_asset && !a.include_in_disposable) specialExtra += balance
    return Object.assign({}, a, { balance, holdings, market_value: marketValue, profit_loss: profitLoss })
  })
  investment = list.reduce((s, a) => s + (a.account_class === 'investment' ? a.market_value : 0), 0)
  const withInvest = disposable + investment
  const full = withInvest + specialExtra
  return {
    accounts: list,
    totals: { disposable, investment, withInvest, full, specialExtra }
  }
}

/** 更新账户可编辑字段（不含余额，余额走 adjust/流水）。 */
async function updateAssetAccount(userId, accountId, data) {
  const db = getDb()
  await getAssetAccountById(userId, accountId)
  const patch = { updated_at: nowTs() }
  if (data.name != null) patch.name = String(data.name).trim()
  if (data.account_subtype != null) patch.account_subtype = data.account_subtype
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
  const balanceAfter = await applyAccountBalanceChange(userId, accountId, delta, 'adjust', { note: note || '手动调整余额' })
  return { balance: balanceAfter, changed: true }
}

/** 账户间转账（此消彼长）。 */
async function transferBetweenAccounts(userId, fromId, toId, amount, note) {
  if (fromId === toId) throw new Error('不能转账到同一账户')
  const amt = Math.round(Number(amount) || 0)
  if (amt <= 0) throw new Error('转账金额必须大于 0')
  await getAssetAccountById(userId, fromId)
  await getAssetAccountById(userId, toId)
  await applyAccountBalanceChange(userId, fromId, -amt, 'transfer_out', { counter_account_id: toId, note: note || '转账' })
  await applyAccountBalanceChange(userId, toId, amt, 'transfer_in', { counter_account_id: fromId, note: note || '转账' })
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
  const res = await db.collection('investment_holdings').add(doc)
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
  await applyAccountBalanceChange(userId, sourceAccountId, accountDelta, action, { holding_id: h._id, note })
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

// ===== 阶段 11：餐次与热量轻追踪（§3.10） =====

const ACTIVITY_FACTORS = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 }

/** Mifflin-St Jeor 公式（§3.10.7）。返回 0 表示参数不足。 */
function calcBMR(gender, age, heightCm, weightKg) {
  const w = Number(weightKg) || 0
  const h = Number(heightCm) || 0
  const a = Number(age) || 0
  if (!w || !h || !a) return 0
  const base = 10 * w + 6.25 * h - 5 * a
  return Math.round(gender === 'female' ? base - 161 : base + 5)
}

/** 读取健康档案（无则 null）。 */
async function getHealthProfile(userId) {
  const db = getDb()
  const res = await db.collection('user_health_profiles').where({ user_id: userId }).limit(1).get()
  return (res.data && res.data[0]) || null
}

/**
 * 保存/测算健康档案（BMR/TDEE 自动测算 + 手动覆盖，§3.10.7）。
 * - 传入 bmr/tdee/daily_intake_target 视为手动覆盖（置 *_is_manual=true）
 * - 传入 *_is_manual=false 则清除手动标记，重新用公式测算
 */
async function upsertHealthProfile(userId, data = {}) {
  const db = getDb()
  const existing = await getHealthProfile(userId)
  const ts = nowTs()
  const patch = { updated_at: ts }

  if (data.gender != null) patch.gender = data.gender
  if (data.age != null) patch.age = Math.round(Number(data.age) || 0)
  if (data.height_cm != null) patch.height_cm = Number(data.height_cm) || 0
  if (data.weight_kg != null) patch.weight_kg = Number(data.weight_kg) || 0
  if (data.activity_level != null) patch.activity_level = data.activity_level
  if (data.ai_activity_hint != null) patch.ai_activity_hint = data.ai_activity_hint
  if (data.disclaimer_accepted != null) patch.disclaimer_accepted = !!data.disclaimer_accepted

  if (data.bmr != null) { patch.bmr = Math.round(Number(data.bmr) || 0); patch.bmr_is_manual = data.bmr_is_manual === true }
  else if (data.bmr_is_manual === false) patch.bmr_is_manual = false
  if (data.tdee != null) { patch.tdee = Math.round(Number(data.tdee) || 0); patch.tdee_is_manual = data.tdee_is_manual === true }
  else if (data.tdee_is_manual === false) patch.tdee_is_manual = false
  if (data.daily_intake_target != null) { patch.daily_intake_target = Math.round(Number(data.daily_intake_target) || 0); patch.intake_target_is_manual = data.intake_target_is_manual === true }
  else if (data.intake_target_is_manual === false) patch.intake_target_is_manual = false

  const gender = patch.gender || (existing && existing.gender) || 'male'
  const age = patch.age != null ? patch.age : (existing && existing.age)
  const height = patch.height_cm != null ? patch.height_cm : (existing && existing.height_cm)
  const weight = patch.weight_kg != null ? patch.weight_kg : (existing && existing.weight_kg)
  const activity = patch.activity_level || (existing && existing.activity_level) || 'sedentary'
  const factor = ACTIVITY_FACTORS[activity] || 1.2

  if (!patch.bmr_is_manual) {
    const autoBmr = calcBMR(gender, age, height, weight)
    if (autoBmr > 0) { patch.bmr = autoBmr; patch.bmr_is_manual = false }
  }
  if (!patch.tdee_is_manual) {
    const bmr = patch.bmr || (existing && existing.bmr) || 0
    if (bmr > 0) { patch.tdee = Math.round(bmr * factor); patch.tdee_is_manual = false }
  }
  if (patch.daily_intake_target == null && !patch.intake_target_is_manual) {
    if (patch.tdee) { patch.daily_intake_target = patch.tdee; patch.intake_target_is_manual = false }
  }

  if (existing) {
    await db.collection('user_health_profiles').doc(existing._id).update(patch)
    return Object.assign({}, existing, patch)
  }
  const doc = Object.assign({
    user_id: userId,
    activity_level: 'sedentary',
    bmr_is_manual: false,
    tdee_is_manual: false,
    intake_target_is_manual: false,
    disclaimer_accepted: false,
    created_at: ts
  }, patch)
  const res = await db.collection('user_health_profiles').add(doc)
  return Object.assign({ _id: res.id }, doc)
}

/** 重算某日热量快照（§3.10.6）。返回最新快照。 */
async function recomputeDailyHealth(userId, dateKey) {
  const db = getDb()
  const txRes = await db.collection('transactions')
    .where({ user_id: userId, date_key: dateKey, deleted_at: db.command.eq(null), meal_id: db.command.neq(null) })
    .get()
  const mealIds = (txRes.data || []).map((t) => t.meal_id).filter(Boolean)
  let intakeTotal = 0
  if (mealIds.length) {
    const mealRes = await db.collection('meals')
      .where({ _id: db.command.in(mealIds), deleted_at: db.command.eq(null) })
      .get()
    intakeTotal = (mealRes.data || []).reduce((s, m) => s + (m.confirmed_calories || 0), 0)
  }
  const hp = await getHealthProfile(userId)
  const intakeTarget = (hp && hp.daily_intake_target) ? hp.daily_intake_target : 0
  const tdee = (hp && hp.tdee) ? hp.tdee : 0
  let exercise = 0
  const snapRes = await db.collection('daily_health_snapshots').where({ user_id: userId, date_key: dateKey }).get()
  const existing = snapRes.data && snapRes.data[0]
  if (existing) exercise = existing.exercise_calories || 0
  const intakeRemaining = intakeTarget > 0 ? intakeTarget - intakeTotal : 0
  const totalBurn = tdee + exercise
  const calorieGap = totalBurn > 0 ? totalBurn - intakeTotal : 0
  const ts = nowTs()
  const doc = {
    user_id: userId,
    date_key: dateKey,
    intake_total: intakeTotal,
    intake_target: intakeTarget,
    intake_remaining: intakeRemaining,
    exercise_calories: exercise,
    total_burn: totalBurn,
    calorie_gap: calorieGap,
    tdee_snapshot: tdee,
    updated_at: ts
  }
  if (existing) {
    await db.collection('daily_health_snapshots').doc(existing._id).update(doc)
  } else {
    await db.collection('daily_health_snapshots').add(doc)
  }
  return doc
}

/** 新建餐次（同时创建餐饮支出交易 + 餐次 + 食物项，§3.10.2/3/4）。 */
async function createMeal(userId, data) {
  const db = getDb()
  const ts = nowTs()
  const dateKey = data.date_key || formatDateKey(new Date(data.transaction_at || ts))
  const tx = await createTransaction(userId, {
    type: 'expense',
    amount: data.amount,
    category_id: data.category_id,
    ledger_id: data.ledger_id,
    account_id: data.account_id,
    note: data.note,
    date_key: dateKey,
    transaction_at: data.transaction_at ? toStoredTime(data.transaction_at) : ts,
    image_urls: data.image_urls,
    sticker_id: data.sticker_id,
    sticker_image_url: data.sticker_image_url
  })
  const foodItems = Array.isArray(data.food_items) ? data.food_items : []
  const itemizedSum = foodItems.reduce((s, f) => s + (Math.round(Number(f.calories) || 0)), 0)
  const mealDoc = {
    user_id: userId,
    transaction_id: tx.transaction_id,
    meal_type: data.meal_type || 'lunch',
    calorie_mode: data.calorie_mode || 'itemized',
    itemized_sum: itemizedSum,
    whole_override: Math.round(Number(data.whole_override) || 0),
    confirmed_calories: Math.round(Number(data.confirmed_calories) || itemizedSum),
    created_at: ts,
    updated_at: ts
  }
  const mealRes = await db.collection('meals').add(mealDoc)
  const mealId = mealRes.id
  for (let i = 0; i < foodItems.length; i++) {
    const f = foodItems[i]
    await db.collection('meal_food_items').add({
      meal_id: mealId,
      user_id: userId,
      name: String(f.name || '').trim() || '食物',
      sticker_id: f.sticker_id || null,
      sticker_image_url: f.sticker_image_url || null,
      calories: Math.round(Number(f.calories) || 0),
      sort_order: i,
      created_at: ts
    })
  }
  await db.collection('transactions').doc(tx.transaction_id).update({ meal_id: mealId, updated_at: ts })
  await recomputeDailyHealth(userId, dateKey)
  return { transaction_id: tx.transaction_id, meal_id: mealId, ...mealDoc }
}

/** 更新餐次（交易字段 + 食物项整体替换 + 热量重算，§3.10.5）。 */
async function updateMeal(userId, mealId, data) {
  const db = getDb()
  const mealRes = await db.collection('meals').doc(mealId).get()
  const meal = mealRes.data && mealRes.data[0]
  if (!meal || meal.user_id !== userId) throw new Error('meal not found')
  const txRes = await db.collection('transactions').doc(meal.transaction_id).get()
  const oldTx = txRes.data && txRes.data[0]
  const oldDateKey = oldTx ? oldTx.date_key : null
  const ts = nowTs()

  await updateTransaction(userId, meal.transaction_id, {
    amount: data.amount,
    category_id: data.category_id,
    ledger_id: data.ledger_id,
    account_id: data.account_id,
    note: data.note,
    date_key: data.date_key,
    transaction_at: data.transaction_at !== undefined ? toStoredTime(data.transaction_at) : data.transaction_at,
    image_urls: data.image_urls,
    sticker_id: data.sticker_id,
    sticker_image_url: data.sticker_image_url
  })

  await db.collection('meal_food_items').where({ meal_id: mealId }).remove()
  const foodItems = Array.isArray(data.food_items) ? data.food_items : []
  const itemizedSum = foodItems.reduce((s, f) => s + (Math.round(Number(f.calories) || 0)), 0)
  for (let i = 0; i < foodItems.length; i++) {
    const f = foodItems[i]
    await db.collection('meal_food_items').add({
      meal_id: mealId,
      user_id: userId,
      name: String(f.name || '').trim() || '食物',
      sticker_id: f.sticker_id || null,
      sticker_image_url: f.sticker_image_url || null,
      calories: Math.round(Number(f.calories) || 0),
      sort_order: i,
      created_at: ts
    })
  }
  await db.collection('meals').doc(mealId).update({
    meal_type: data.meal_type || meal.meal_type,
    calorie_mode: data.calorie_mode || meal.calorie_mode,
    itemized_sum: itemizedSum,
    whole_override: Math.round(Number(data.whole_override) || 0),
    confirmed_calories: Math.round(Number(data.confirmed_calories) || itemizedSum),
    updated_at: ts
  })
  const newDateKey = data.date_key || oldDateKey
  await recomputeDailyHealth(userId, oldDateKey)
  if (newDateKey !== oldDateKey) await recomputeDailyHealth(userId, newDateKey)
  return { ok: true }
}

/** 删除餐次（食物项 + 餐次 + 关联交易软删 + 热量重算）。 */
async function deleteMeal(userId, mealId) {
  const db = getDb()
  const mealRes = await db.collection('meals').doc(mealId).get()
  const meal = mealRes.data && mealRes.data[0]
  if (!meal || meal.user_id !== userId) throw new Error('meal not found')
  const txRes = await db.collection('transactions').doc(meal.transaction_id).get()
  const tx = txRes.data && txRes.data[0]
  const dateKey = tx ? tx.date_key : null
  await db.collection('meal_food_items').where({ meal_id: mealId }).remove()
  await db.collection('meals').doc(mealId).update({ deleted_at: nowTs(), updated_at: nowTs() })
  if (tx) await softDeleteTransaction(userId, meal.transaction_id)
  if (dateKey) await recomputeDailyHealth(userId, dateKey)
  return { ok: true }
}

/** 查询单个餐次（含食物项与关联交易）。 */
async function getMeal(userId, mealId) {
  const db = getDb()
  const mealRes = await db.collection('meals').doc(mealId).get()
  const meal = mealRes.data && mealRes.data[0]
  if (!meal || meal.user_id !== userId) throw new Error('meal not found')
  const foodRes = await db.collection('meal_food_items').where({ meal_id: mealId }).orderBy('sort_order', 'asc').get()
  const txRes = await db.collection('transactions').doc(meal.transaction_id).get()
  const tx = txRes.data && txRes.data[0]
  return Object.assign({}, meal, { food_items: foodRes.data || [], transaction: tx })
}

/** 查询某日餐次列表（含食物项与关联交易）。 */
async function getMealsByDate(userId, dateKey) {
  const db = getDb()
  const txRes = await db.collection('transactions')
    .where({ user_id: userId, date_key: dateKey, deleted_at: db.command.eq(null), meal_id: db.command.neq(null) })
    .orderBy('transaction_at', 'asc')
    .get()
  const txs = txRes.data || []
  const mealIds = txs.map((t) => t.meal_id).filter(Boolean)
  let meals = []
  if (mealIds.length) {
    const mealRes = await db.collection('meals').where({ _id: db.command.in(mealIds) }).get()
    meals = mealRes.data || []
    const foodRes = await db.collection('meal_food_items')
      .where({ meal_id: db.command.in(mealIds) })
      .orderBy('sort_order', 'asc')
      .get()
    const foodMap = {}
    for (const f of (foodRes.data || [])) {
      if (!foodMap[f.meal_id]) foodMap[f.meal_id] = []
      foodMap[f.meal_id].push(f)
    }
    meals = meals.map((m) => Object.assign({}, m, {
      food_items: foodMap[m._id] || [],
      transaction: txs.find((t) => t._id === m.transaction_id) || null
    }))
  }
  return { meals }
}

/** 读取/重建某日热量快照。 */
async function getDailyHealthSnapshot(userId, dateKey) {
  const db = getDb()
  const snapRes = await db.collection('daily_health_snapshots').where({ user_id: userId, date_key: dateKey }).get()
  const snap = (snapRes.data && snapRes.data[0]) || null
  if (snap) return snap
  return await recomputeDailyHealth(userId, dateKey)
}

/** 设置当日运动消耗（±X kcal），重算缺口。 */
async function setExerciseCalories(userId, dateKey, exercise) {
  const db = getDb()
  const snapRes = await db.collection('daily_health_snapshots').where({ user_id: userId, date_key: dateKey }).get()
  const existing = snapRes.data && snapRes.data[0]
  const ex = Math.round(Number(exercise) || 0)
  const ts = nowTs()
  if (existing) {
    const totalBurn = (existing.tdee_snapshot || 0) + ex
    const calorieGap = totalBurn > 0 ? totalBurn - (existing.intake_total || 0) : 0
    await db.collection('daily_health_snapshots').doc(existing._id).update({
      exercise_calories: ex,
      total_burn: totalBurn,
      calorie_gap: calorieGap,
      updated_at: ts
    })
    return Object.assign({}, existing, { exercise_calories: ex, total_burn: totalBurn, calorie_gap: calorieGap })
  }
  const hp = await getHealthProfile(userId)
  const tdee = (hp && hp.tdee) ? hp.tdee : 0
  const totalBurn = tdee + ex
  const doc = {
    user_id: userId,
    date_key: dateKey,
    intake_total: 0,
    intake_target: (hp && hp.daily_intake_target) ? hp.daily_intake_target : 0,
    intake_remaining: 0,
    exercise_calories: ex,
    total_burn: totalBurn,
    calorie_gap: totalBurn,
    tdee_snapshot: tdee,
    updated_at: ts
  }
  await db.collection('daily_health_snapshots').add(doc)
  return doc
}

/** 近 7 日热量快照（含均值/累计缺口，§3.10.6 周视图）。 */
async function getWeeklyHealth(userId, endDateKey) {
  const db = getDb()
  const end = endDateKey || formatDateKey(new Date())
  const dates = []
  const d = new Date(end + 'T00:00:00')
  for (let i = 6; i >= 0; i--) {
    const dd = new Date(d)
    dd.setDate(d.getDate() - i)
    dates.push(formatDateKey(dd))
  }
  const snapRes = await db.collection('daily_health_snapshots').where({ user_id: userId, date_key: db.command.in(dates) }).get()
  const map = {}
  for (const s of (snapRes.data || [])) map[s.date_key] = s
  const list = dates.map((k) => map[k] || {
    date_key: k, intake_total: 0, intake_target: 0, intake_remaining: 0,
    exercise_calories: 0, total_burn: 0, calorie_gap: 0, tdee_snapshot: 0
  })
  const avgIntake = Math.round(list.reduce((s, x) => s + (x.intake_total || 0), 0) / 7)
  const avgGap = Math.round(list.reduce((s, x) => s + (x.calorie_gap || 0), 0) / 7)
  const cumulativeGap = list.reduce((s, x) => s + (x.calorie_gap || 0), 0)
  return { days: list, avg_intake: avgIntake, avg_gap: avgGap, cumulative_gap: cumulativeGap }
}

// ===== 只读查询：前端统一经云函数访问，禁止 clientDB 直读 =====

/** 当前用户全部有效账本（已过滤软删，按 sort_order 升序）。 */
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
async function getLedgerWithTransactions(userId, ledgerId) {
  const db = getDb()
  const [lRes, txRes] = await Promise.all([
    db.collection('ledgers').doc(ledgerId).get(),
    db.collection('transactions').where({ user_id: userId, deleted_at: db.command.eq(null) }).get()
  ])
  const l = lRes.data && lRes.data[0]
  if (!l || l.user_id !== userId) return null
  // 成员列表：从 member_ledgers 关联 members 取本账本已关联成员（异常时降级为空数组）
  let memberCount = 0
  let members = []
  try {
    const list = await getLedgerMembers(userId, ledgerId)
    members = list
    memberCount = list.length
    // 兜底：若账本无任何关联成员（存量账本），自动把本人关联进去
    if (!list.length) {
      try {
        const selfId = await ensureSelfMemberLinkedToLedger(userId, ledgerId)
        const selfRes = await db.collection('members').doc(selfId).get()
        const selfM = selfRes.data && selfRes.data[0]
        if (selfM) {
          members = [{
            _id: selfM._id,
            user_id: selfM.user_id || '',
            nickname: selfM.nickname || '',
            avatar_url: selfM.avatar || '',
            bio: selfM.bio || '',
            relation: selfM.relation || 'self',
            is_self: true,
          }]
          memberCount = 1
        }
      } catch (e) {
        console.error('[sparejar-db] ensure self member linked failed', e)
      }
    }
  } catch (e) {
    memberCount = 0
    members = []
  }

  // 当前用户是否收藏该账本（favorite_ledgers 未建表时查询返回空，安全降级为 false）
  let isFavorited = false
  try {
    const favRes = await db.collection('favorite_ledgers')
      .where({ user_id: userId, ledger_id: ledgerId })
      .limit(1)
      .get()
    isFavorited = !!(favRes.data && favRes.data[0])
  } catch (e) {
    isFavorited = false
  }
  return { ledger: l, transactions: txRes.data || [], memberCount, members, is_favorited: isFavorited }
}

/** 单笔交易（用于编辑 / 退款关联）。 */
async function getTransaction(userId, txId) {
  const db = getDb()
  const res = await db.collection('transactions').doc(txId).get()
  const t = res.data && res.data[0]
  if (!t || t.user_id !== userId) return null
  return t
}

/**
 * 交易列表查询。
 * @param {string} userId
 * @param {{ type?: string, date_key?: string, include_deleted?: boolean, limit?: number, orderBy?: string, orderDir?: string }} [opts]
 */
async function listTransactions(userId, opts = {}) {
  const db = getDb()
  const where = { user_id: userId }
  if (!opts.include_deleted) where.deleted_at = db.command.eq(null)
  if (opts.type) where.type = opts.type
  if (opts.date_key) where.date_key = opts.date_key
  let q = db.collection('transactions').where(where)
  if (opts.orderBy) q = q.orderBy(opts.orderBy, opts.orderDir || 'desc')
  else q = q.orderBy('transaction_at', 'desc')
  if (opts.limit) q = q.limit(opts.limit)
  const res = await q.get()
  return res.data || []
}

/** 账户余额变动流水。 */
async function listAccountBalanceLogs(userId, accountId, limit = 40) {
  const db = getDb()
  let q = db.collection('account_balance_logs')
    .where({ user_id: userId, account_id: accountId })
    .orderBy('created_at', 'desc')
  if (limit) q = q.limit(limit)
  const res = await q.get()
  return res.data || []
}

/** 首页仪表盘数据：当日交易（limit 50）+ 昨日结算快照。 */
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
async function getDoc(collection, userId) {
  return getDocByUser(collection, userId)
}

module.exports = {
  PRESET_EXPENSE_CATEGORIES,
  PRESET_INCOME_CATEGORIES,
  DEFAULT_LEDGER,
  formatDateKey,
  formatMonthKey,
  parseDateKey,
  nowTs,
  initUser,
  ensureMasterLedger,
  createLedger,
  updateLedger,
  applySurplusPoolChange,
  applySavingsPoolChange,
  applyWishFundChange,
  applyAccountBalanceChange,
  recalculateDailySettlement,
  runDailySettlement,
  allocateSurplus,
  createTransaction,
  softDeleteTransaction,
  updateTransaction,
  deleteLedger,
  setFavoriteLedger,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  getEffectiveBaseLimit,
  updateUserSettings,
  listWishes,
  createWish,
  updateWish,
  archiveWish,
  listWishFundLogs,
  listSurplusAllocations,
  getPendingAllocation,
  depositWishManual,
  depositWishFromSurplus,
  depositWishFromSavings,
  withdrawWishToSurplus,
  depositSavingsPool,
  withdrawSavingsPool,
  getChallengeSummary,
  setChallengeTarget,
  getAchievements,
  evaluateAndUnlockAchievements,
  updateOnboarding,
  recordSubscribeAuth,
  sendSubscribeMessage,
  getStickerById,
  createSticker,
  updateSticker,
  deleteSticker,
  getStickers,
  consumeSticker,
  getDocByUser,
  getDoc,
  listLedgers,
  getLedgerWithTransactions,
  addMember,
  updateMember,
  removeMember,
  linkMemberToLedger,
  unlinkMemberFromLedger,
  getMembersByUser,
  getLedgerMembers,
  ensureSelfMember,
  ensureSelfMemberLinkedToLedger,
  getTransaction,
  listTransactions,
  listAccountBalanceLogs,
  getDashboard,
  recognizeReceipt,
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
  getHealthProfile,
  upsertHealthProfile,
  recomputeDailyHealth,
  createMeal,
  updateMeal,
  deleteMeal,
  getMealsByDate,
  getMeal,
  getDailyHealthSnapshot,
  setExerciseCalories,
  getWeeklyHealth
}
