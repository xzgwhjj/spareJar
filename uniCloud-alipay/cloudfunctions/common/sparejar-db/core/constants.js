'use strict'

// 预置分类：不再使用二级 group 分组，所有分类平铺展示。
// sort_order 在 type 内全局连续编号（支出 1..N、收入 1..M），保证平铺顺序稳定。
const PRESET_EXPENSE_CATEGORIES = [
  { name: '房租', icon: '🏠', sort_order: 1 },
  { name: '房贷', icon: '🏦', sort_order: 2 },
  { name: '车贷', icon: '🚗', sort_order: 3 },
  { name: '水费', icon: '💧', sort_order: 4 },
  { name: '电费', icon: '💡', sort_order: 5 },
  { name: '燃气费', icon: '🔥', sort_order: 6 },
  { name: '物业费', icon: '🏢', sort_order: 7 },
  { name: '宽带网络', icon: '🌐', sort_order: 8 },
  { name: '固定话费', icon: '📱', sort_order: 9 },
  { name: '长期保险', icon: '🛡️', sort_order: 10 },
  { name: '订阅会员', icon: '📺', sort_order: 11 },
  { name: '餐饮', icon: '🍜', sort_order: 12 },
  { name: '外卖', icon: '🥡', sort_order: 13 },
  { name: '咖啡奶茶', icon: '🧋', sort_order: 14 },
  { name: '生鲜超市', icon: '🛒', sort_order: 15 },
  { name: '便利店', icon: '🏪', sort_order: 16 },
  { name: '交通', icon: '🚌', sort_order: 17 },
  { name: '打车', icon: '🚕', sort_order: 18 },
  { name: '加油', icon: '⛽', sort_order: 19 },
  { name: '停车费', icon: '🅿️', sort_order: 20 },
  { name: '通讯费', icon: '📞', sort_order: 21 },
  { name: '快递', icon: '📦', sort_order: 22 },
  { name: '服饰', icon: '👕', sort_order: 23 },
  { name: '鞋包', icon: '👟', sort_order: 24 },
  { name: '美容美发', icon: '💇', sort_order: 25 },
  { name: '护肤化妆', icon: '💄', sort_order: 26 },
  { name: '家居用品', icon: '🛋️', sort_order: 27 },
  { name: '厨具', icon: '🍳', sort_order: 28 },
  { name: '数码电器', icon: '📱', sort_order: 29 },
  { name: '旅游', icon: '✈️', sort_order: 30 },
  { name: '酒店住宿', icon: '🏨', sort_order: 31 },
  { name: '电影演出', icon: '🎬', sort_order: 32 },
  { name: '游戏', icon: '🎮', sort_order: 33 },
  { name: '运动健身', icon: '🏋️', sort_order: 34 },
  { name: '爱好手工', icon: '🎨', sort_order: 35 },
  { name: '宠物用品', icon: '🐱', sort_order: 36 },
  { name: '书籍杂志', icon: '📚', sort_order: 37 },
  { name: '门诊', icon: '🏥', sort_order: 38 },
  { name: '药品', icon: '💊', sort_order: 39 },
  { name: '体检', icon: '🩺', sort_order: 40 },
  { name: '医疗险', icon: '🛡️', sort_order: 41 },
  { name: '牙科', icon: '🦷', sort_order: 42 },
  { name: '学费', icon: '🎓', sort_order: 43 },
  { name: '培训课程', icon: '📖', sort_order: 44 },
  { name: '网课', icon: '💻', sort_order: 45 },
  { name: '考试报名', icon: '📝', sort_order: 46 },
  { name: '育儿早教', icon: '👶', sort_order: 47 },
  { name: '礼金份子', icon: '🧧', sort_order: 48 },
  { name: '聚会请客', icon: '🍻', sort_order: 49 },
  { name: '人情往来', icon: '🎁', sort_order: 50 },
  { name: '捐赠公益', icon: '❤️', sort_order: 51 },
  { name: '维修费', icon: '🔧', sort_order: 52 },
  { name: '罚款', icon: '💸', sort_order: 53 },
  { name: '遗失损坏', icon: '💔', sort_order: 54 },
  { name: '其他', icon: '📦', sort_order: 55 }
]


const PRESET_INCOME_CATEGORIES = [
  { name: '工资薪资', icon: '💰', sort_order: 1 },
  { name: '奖金', icon: '🏆', sort_order: 2 },
  { name: '绩效', icon: '📊', sort_order: 3 },
  { name: '兼职', icon: '💼', sort_order: 4 },
  { name: '劳务报酬', icon: '🤝', sort_order: 5 },
  { name: '稿费', icon: '🖊️', sort_order: 6 },
  { name: '经营收入', icon: '🏪', sort_order: 7 },
  { name: '房租收入', icon: '🏠', sort_order: 8 },
  { name: '理财收益', icon: '📈', sort_order: 9 },
  { name: '股息分红', icon: '💹', sort_order: 10 },
  { name: '利息', icon: '🏦', sort_order: 11 },
  { name: '版权版税', icon: '📜', sort_order: 12 },
  { name: '投资回报', icon: '💎', sort_order: 13 },
  { name: '退款', icon: '↩️', sort_order: 14 },
  { name: '报销', icon: '🧾', sort_order: 15 },
  { name: '礼金收受', icon: '🧧', sort_order: 16 },
  { name: '政府补贴', icon: '🏛️', sort_order: 17 },
  { name: '赔偿金', icon: '💼', sort_order: 18 },
  { name: '赡养资助', icon: '🤲', sort_order: 19 },
  { name: '中奖', icon: '🎰', sort_order: 20 },
  { name: '二手转卖', icon: '🔄', sort_order: 21 },
  { name: '红包', icon: '🧧', sort_order: 22 },
  { name: '其他', icon: '📦', sort_order: 23 }
]


const DEFAULT_LEDGER = {
  name: '总账本',
  icon: '📒',
  is_system: true,
  is_default: false,
  is_shared: false,
  sort_order: 0
}


// 分类二级分组已废弃（group 字段已移除），前端按 type 平铺展示。

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
  // 负债账户（花呗/信用卡/借款等）：不可支配、不计日限额、不计入总资产（单独汇总为负债）
  liability: { include_in_disposable: false, include_in_daily_limit: false, include_in_total_asset: false },
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
  DEFAULT_LEDGER,
  MAX_CUSTOM_CATEGORIES,
  ACCOUNT_CLASS_DEFAULTS,
  ACTIVITY_FACTORS,
  OCR_PROVIDER,
  OCR_BAIDU,
  OCR_TENCENT,
}
