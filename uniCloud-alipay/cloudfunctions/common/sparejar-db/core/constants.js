'use strict'

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


// 分类二级分组（与前端 constants/categoryGroups.js 保持一致）
const EXPENSE_GROUPS = [
  { code: 'fixed', name: '日常固定开销', icon: '🏠' },
  { code: 'variable', name: '日常变动开销', icon: '🛒' },
  { code: 'lifestyle', name: '生活改善', icon: '👕' },
  { code: 'leisure', name: '休闲娱乐', icon: '🎮' },
  { code: 'medical', name: '医疗健康', icon: '💊' },
  { code: 'education', name: '教育成长', icon: '📚' },
  { code: 'social', name: '人情社交', icon: '🎁' },
  { code: 'unexpected', name: '意外损失', icon: '⚠️' },
]

const INCOME_GROUPS = [
  { code: 'active', name: '主动收入', icon: '💰' },
  { code: 'passive', name: '被动收入', icon: '📈' },
  { code: 'transfer', name: '转移性收入', icon: '↩️' },
  { code: 'occasional', name: '其他偶然', icon: '🎰' },
]

/** 自定义分类上限 */
const MAX_CUSTOM_CATEGORIES = 20

// 资产账户三大类的默认计入口径
const ACCOUNT_CLASS_DEFAULTS = {
  // 日常账户：可支配、计入日限额、计入总资产
  daily: { include_in_disposable: true, include_in_daily_limit: true, include_in_total_asset: true },
  // 专项账户（公积金/医保等）：不可支配、不计日限额、计入总资产
  special: { include_in_disposable: false, include_in_daily_limit: false, include_in_total_asset: true },
  // 投资账户：不可支配、不计日限额、计入总资产
  investment: { include_in_disposable: false, include_in_daily_limit: false, include_in_total_asset: true },
}

// TDEE 活动系数（与前端 pages/health-settings 保持一致）
const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
}

// OCR 配置：密钥统一走云函数环境变量，避免硬编码
const OCR_PROVIDER = process.env.OCR_PROVIDER || 'baidu'

const OCR_BAIDU = {
  apiKey: process.env.BAIDU_OCR_API_KEY || '',
  secretKey: process.env.BAIDU_OCR_SECRET_KEY || '',
  tokenUrl: 'https://aip.baidubce.com/oauth/2.0/token',
  ocrUrl: 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic',
}

const OCR_TENCENT = {
  secretId: process.env.TENCENT_SECRET_ID || '',
  secretKey: process.env.TENCENT_SECRET_KEY || '',
}

module.exports = {
  PRESET_EXPENSE_CATEGORIES,
  PRESET_INCOME_CATEGORIES,
  PRESET_CATEGORY_GROUP,
  DEFAULT_LEDGER,
  EXPENSE_GROUPS,
  INCOME_GROUPS,
  MAX_CUSTOM_CATEGORIES,
  ACCOUNT_CLASS_DEFAULTS,
  ACTIVITY_FACTORS,
  OCR_PROVIDER,
  OCR_BAIDU,
  OCR_TENCENT,
}
