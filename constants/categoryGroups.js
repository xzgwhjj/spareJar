/**
 * 分类二级分组（中层）展示常量。
 * 与 sparejar-db 中 PRESET_*_CATEGORIES 的 group 码保持一致。
 * 分组极少变动，前端用 code 映射名称/图标做折叠展示，分类叶子本身存 group 码。
 */

/** 支出二级分组（按展示顺序排列） */
export const EXPENSE_GROUPS = [
  { code: 'fixed', name: '日常固定开销', icon: '🏠' },
  { code: 'variable', name: '日常变动开销', icon: '🛒' },
  { code: 'lifestyle', name: '生活改善', icon: '👕' },
  { code: 'leisure', name: '休闲娱乐', icon: '🎮' },
  { code: 'medical', name: '医疗健康', icon: '💊' },
  { code: 'education', name: '教育成长', icon: '📚' },
  { code: 'social', name: '人情社交', icon: '🎁' },
  { code: 'unexpected', name: '意外损失', icon: '⚠️' },
]

/** 收入二级分组（按展示顺序排列） */
export const INCOME_GROUPS = [
  { code: 'active', name: '主动收入', icon: '💰' },
  { code: 'passive', name: '被动收入', icon: '📈' },
  { code: 'transfer', name: '转移性收入', icon: '↩️' },
  { code: 'occasional', name: '其他偶然', icon: '🎰' },
]

/** 按 type 取分组列表 */
export function getGroupsByType(type) {
  return type === 'income' ? INCOME_GROUPS : EXPENSE_GROUPS
}

/** group 码 → { name, icon } 快速查表 */
export const GROUP_META = {}
for (const g of [...EXPENSE_GROUPS, ...INCOME_GROUPS]) {
  GROUP_META[g.code] = { name: g.name, icon: g.icon }
}
