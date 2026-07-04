/**
 * 生成 uniCloud-alipay/database 下全部 DB Schema 与索引文件
 * 运行: node scripts/generate-db-schemas.js
 */
const fs = require('fs')
const path = require('path')

const DB_DIR = path.join(__dirname, '../uniCloud-alipay/database')

const USER_PERM = {
  read: 'doc.user_id == auth.uid',
  create: 'doc.user_id == auth.uid',
  update: 'doc.user_id == auth.uid',
  delete: 'doc.user_id == auth.uid'
}

const USER_READ_ONLY = {
  read: 'doc.user_id == auth.uid',
  create: false,
  update: false,
  delete: false
}

const SYSTEM_READ = {
  read: true,
  create: false,
  update: false,
  delete: false
}

function tsField(desc) {
  return { bsonType: 'timestamp', description: desc }
}

function strField(maxLength, desc, extra = {}) {
  return { bsonType: 'string', description: desc, ...(maxLength ? { maxLength } : {}), ...extra }
}

function intField(desc, extra = {}) {
  return { bsonType: 'int', description: desc, ...extra }
}

function boolField(desc, extra = {}) {
  return { bsonType: 'bool', description: desc, ...extra }
}

function enumField(values, desc, extra = {}) {
  return { bsonType: 'string', enum: values, description: desc, ...extra }
}

function fk(table, field = '_id', desc = '') {
  return { foreignKey: `${table}.${field}`, description: desc || `FK→${table}.${field}` }
}

function writeSchema(name, schema) {
  fs.writeFileSync(path.join(DB_DIR, `${name}.schema.json`), JSON.stringify(schema, null, 2), 'utf8')
}

function writeIndex(name, indexes) {
  fs.writeFileSync(path.join(DB_DIR, `${name}.index.json`), JSON.stringify(indexes, null, 2), 'utf8')
}

function idx(name, keys, unique = false) {
  return {
    IndexName: name,
    MgoKeySchema: {
      MgoIndexKeys: keys.map((k) => ({
        Name: k.name,
        Direction: String(k.dir || 1),
        Type: k.type || 'varchar'
      })),
      MgoIsUnique: unique
    }
  }
}

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })

// ========== users ==========
writeSchema('users', {
  bsonType: 'object',
  required: ['user_id', 'timezone', 'created_at', 'updated_at'],
  permission: {
    read: 'doc.user_id == auth.uid',
    create: 'auth.uid != null',
    update: 'doc.user_id == auth.uid',
    delete: false
  },
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '微信 openid'), ...fk('users', 'user_id') },
    nickname: { ...strField(64, '昵称'), defaultValue: '' },
    avatar_url: { ...strField(512, '头像 URL'), defaultValue: '' },
    timezone: { ...strField(64, '日切时区'), defaultValue: 'Asia/Shanghai' },
    onboarding_done: { ...boolField('引导完成'), defaultValue: false },
    onboarding_step: { ...intField('引导步骤 0-4'), minimum: 0, maximum: 4, defaultValue: 0 },
    is_guest: { ...boolField('游客模式'), defaultValue: true },
    jar_skin_id: { ...strField(32, '当前皮肤'), defaultValue: 'classic_glass', ...fk('jar_skins', 'skin_id') },
    jar_skins_unlocked: { bsonType: 'array', arrayType: 'string', description: '已解锁皮肤', defaultValue: ['classic_glass'] },
    zodiac: strField(16, '生肖'),
    constellation: strField(16, '星座'),
    birthday: strField(10, '生日 YYYY-MM-DD'),
    created_at: tsField('创建时间'),
    updated_at: tsField('更新时间'),
    deleted_at: tsField('软删时间')
  }
})
writeIndex('users', [
  idx('uk_user_id', [{ name: 'user_id', type: 'varchar' }], true),
  idx('idx_deleted', [{ name: 'deleted_at', type: 'varchar' }])
])

// ========== user_settings ==========
writeSchema('user_settings', {
  bsonType: 'object',
  required: ['user_id', 'updated_at'],
  permission: USER_PERM,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    daily_base_limit: { ...intField('日基准限额(分)'), minimum: 100, defaultValue: 10000 },
    pending_base_limit: { ...intField('待生效限额(分)'), minimum: 100 },
    limit_effective_date: strField(10, '限额生效日'),
    default_surplus_action: { ...enumField(['roll_over', 'wish', 'savings_pool'], '默认结余去向'), defaultValue: 'roll_over' },
    default_wish_id: { ...strField(0, '默认心愿'), ...fk('wishes') },
    refund_restore_limit: { ...boolField('退款恢复限额'), defaultValue: true },
    challenge_ledger_id: { ...strField(0, '挑战统计账本'), ...fk('ledgers') },
    max_custom_ledgers: { ...intField('自定义账本上限'), minimum: 0, defaultValue: 5 },
    notify_over_limit: { ...boolField('超额通知'), defaultValue: true },
    notify_daily_surplus: { ...boolField('日结通知'), defaultValue: true },
    notify_streak_risk: { ...boolField('挑战中断通知'), defaultValue: true },
    meal_tracking_enabled: { ...boolField('餐饮轻记录'), defaultValue: false },
    fat_loss_mode_enabled: { ...boolField('减脂模式'), defaultValue: false },
    savings_withdraw_limit_pct: { ...intField('月取出比例上限'), minimum: 1, maximum: 100 },
    over_limit_penalty_enabled: { ...boolField('虚拟超额惩罚'), defaultValue: false },
    penalty_streak_deduct: { ...intField('惩罚扣连续天数'), minimum: 0, defaultValue: 1 },
    asset_view_mode: { ...enumField(['disposable', 'with_investment', 'full'], '总资产视图'), defaultValue: 'disposable' },
    updated_at: tsField('更新时间')
  }
})
writeIndex('user_settings', [idx('uk_user_id', [{ name: 'user_id', type: 'varchar' }], true)])

// ========== user_health_profiles ==========
writeSchema('user_health_profiles', {
  bsonType: 'object',
  required: ['user_id', 'updated_at'],
  permission: USER_PERM,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    gender: enumField(['male', 'female', 'other'], '性别'),
    age: { ...intField('年龄'), minimum: 1, maximum: 120 },
    height_cm: { bsonType: 'double', description: '身高 cm', minimum: 0 },
    weight_kg: { bsonType: 'double', description: '体重 kg', minimum: 0 },
    activity_level: { ...enumField(['sedentary', 'light', 'moderate', 'high'], '活动强度'), defaultValue: 'sedentary' },
    bmr: { ...intField('基础代谢 kcal'), minimum: 0 },
    activity_factor: { bsonType: 'double', description: '活动系数', minimum: 0 },
    tdee: { ...intField('日总消耗 kcal'), minimum: 0 },
    bmr_is_manual: { ...boolField('BMR手动覆盖'), defaultValue: false },
    tdee_is_manual: { ...boolField('TDEE手动覆盖'), defaultValue: false },
    daily_intake_target: { ...intField('日摄入目标 kcal'), minimum: 0 },
    intake_target_is_manual: { ...boolField('摄入目标手动'), defaultValue: false },
    ai_activity_hint: strField(200, 'AI活动档位提示'),
    disclaimer_accepted: { ...boolField('免责声明确认'), defaultValue: false },
    updated_at: tsField('更新时间')
  }
})
writeIndex('user_health_profiles', [idx('uk_user_id', [{ name: 'user_id', type: 'varchar' }], true)])

// ========== daily_health_snapshots ==========
writeSchema('daily_health_snapshots', {
  bsonType: 'object',
  required: ['user_id', 'date_key', 'updated_at'],
  permission: USER_PERM,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    date_key: strField(10, '自然日 YYYY-MM-DD'),
    intake_total: { ...intField('已摄入 kcal'), minimum: 0, defaultValue: 0 },
    intake_target: { ...intField('摄入目标 kcal'), minimum: 0 },
    intake_remaining: intField('还可摄入 kcal'),
    exercise_calories: { ...intField('运动消耗 kcal'), minimum: 0, defaultValue: 0 },
    total_burn: { ...intField('总消耗 kcal'), minimum: 0 },
    calorie_gap: intField('热量缺口 kcal'),
    tdee_snapshot: { ...intField('TDEE快照 kcal'), minimum: 0 },
    updated_at: tsField('更新时间')
  }
})
writeIndex('daily_health_snapshots', [
  idx('uk_user_date', [{ name: 'user_id', type: 'varchar' }, { name: 'date_key', type: 'varchar' }], true)
])

// ========== categories ==========
writeSchema('categories', {
  bsonType: 'object',
  required: ['user_id', 'type', 'name', 'created_at'],
  permission: USER_PERM,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    type: enumField(['expense', 'income'], '分类类型'),
    name: strField(32, '分类名'),
    icon: { ...strField(64, '图标'), defaultValue: '📦' },
    is_system: { ...boolField('系统预置'), defaultValue: false },
    is_hidden: { ...boolField('隐藏'), defaultValue: false },
    sort_order: { ...intField('排序'), defaultValue: 0 },
    merged_to_id: { ...strField(0, '合并目标'), ...fk('categories') },
    created_at: tsField('创建时间')
  }
})
writeIndex('categories', [
  idx('uk_user_type_name', [{ name: 'user_id', type: 'varchar' }, { name: 'type', type: 'varchar' }, { name: 'name', type: 'varchar' }], true),
  idx('idx_user_type_hidden', [{ name: 'user_id', type: 'varchar' }, { name: 'type', type: 'varchar' }, { name: 'is_hidden', type: 'bool' }, { name: 'sort_order', type: 'int' }])
])

// ========== ledgers ==========
writeSchema('ledgers', {
  bsonType: 'object',
  required: ['user_id', 'name', 'created_at'],
  permission: USER_PERM,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '创建者 openid'), ...fk('users', 'user_id') },
    name: strField(32, '账本名称'),
    icon: { ...strField(64, '图标'), defaultValue: '📒' },
    is_system: { ...boolField('总账本'), defaultValue: false },
    is_default: { ...boolField('默认选中'), defaultValue: false },
    is_shared: { ...boolField('共享账本'), defaultValue: false },
    share_code: strField(16, '邀请码'),
    sort_order: { ...intField('排序'), defaultValue: 0 },
    deleted_at: tsField('软删'),
    created_at: tsField('创建时间')
  }
})
writeIndex('ledgers', [
  idx('uk_user_name', [{ name: 'user_id', type: 'varchar' }, { name: 'name', type: 'varchar' }], true),
  idx('idx_user_system', [{ name: 'user_id', type: 'varchar' }, { name: 'is_system', type: 'bool' }]),
  idx('uk_share_code', [{ name: 'share_code', type: 'varchar' }], true)
])

// ========== ledger_members ==========
writeSchema('ledger_members', {
  bsonType: 'object',
  required: ['ledger_id', 'user_id', 'joined_at'],
  permission: {
    read: 'doc.user_id == auth.uid',
    create: false,
    update: false,
    delete: false
  },
  properties: {
    _id: { description: 'PK' },
    ledger_id: { ...strField(0, '账本 ID'), ...fk('ledgers') },
    user_id: { ...strField(64, '成员 openid'), ...fk('users', 'user_id') },
    role: { ...enumField(['owner', 'member', 'viewer'], '角色'), defaultValue: 'member' },
    joined_at: tsField('加入时间')
  }
})
writeIndex('ledger_members', [
  idx('uk_ledger_user', [{ name: 'ledger_id', type: 'varchar' }, { name: 'user_id', type: 'varchar' }], true),
  idx('idx_user', [{ name: 'user_id', type: 'varchar' }])
])

// ========== transactions ==========
writeSchema('transactions', {
  bsonType: 'object',
  required: ['user_id', 'type', 'amount', 'ledger_id', 'date_key', 'month_key', 'transaction_at', 'recorded_at', 'created_by', 'created_at', 'updated_at'],
  permission: {
    read: 'doc.user_id == auth.uid',
    create: false,
    update: false,
    delete: false
  },
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    type: enumField(['expense', 'income', 'transfer', 'balance_adjust', 'market_adjust', 'refund'], '流水类型'),
    amount: { ...intField('金额(分)'), minimum: 1 },
    category_id: { ...strField(0, '分类'), ...fk('categories') },
    ledger_id: { ...strField(0, '账本'), ...fk('ledgers') },
    account_id: { ...strField(0, '付款/收款账户'), ...fk('asset_accounts') },
    to_account_id: { ...strField(0, '转账目标账户'), ...fk('asset_accounts') },
    holding_id: { ...strField(0, '投资持仓'), ...fk('investment_holdings') },
    date_key: strField(10, '归属自然日'),
    month_key: strField(7, '归属月 YYYY-MM'),
    transaction_at: tsField('消费/入账时刻'),
    recorded_at: tsField('录入时刻'),
    note: { ...strField(200, '备注'), defaultValue: '' },
    image_urls: { bsonType: 'array', arrayType: 'string', description: '图片 URL 列表', defaultValue: [] },
    sticker_id: { ...strField(0, '贴纸'), ...fk('stickers') },
    sticker_image_url: strField(512, '一次性贴纸图'),
    tags: { bsonType: 'array', arrayType: 'string', description: '标签', defaultValue: [] },
    related_transaction_id: { ...strField(0, '关联流水'), ...fk('transactions') },
    stock_consume_qty: { ...intField('囤货消耗数量'), minimum: 1 },
    include_in_daily_limit: { ...boolField('计日限额'), defaultValue: true },
    include_in_challenge: { ...boolField('计挑战'), defaultValue: true },
    ocr_meta: {
      bsonType: 'object',
      description: 'OCR元数据',
      properties: {
        provider: strField(32, 'OCR提供商'),
        raw_text: strField(0, '原始文本'),
        merchant: strField(128, '商户'),
        recognized_amount: intField('识别金额(分)'),
        recognized_date: strField(10, '识别日期'),
        confidence: { bsonType: 'double', description: '置信度' },
        image_url: strField(512, '原图 URL')
      }
    },
    meal_id: { ...strField(0, '餐次'), ...fk('meals') },
    created_by: strField(64, '录入人 openid'),
    deleted_at: tsField('软删'),
    created_at: tsField('创建时间'),
    updated_at: tsField('更新时间')
  }
})
writeIndex('transactions', [
  idx('idx_user_date', [{ name: 'user_id', type: 'varchar' }, { name: 'date_key', type: 'varchar' }, { name: 'deleted_at', type: 'varchar' }]),
  idx('idx_user_ledger_date', [{ name: 'user_id', type: 'varchar' }, { name: 'ledger_id', type: 'varchar' }, { name: 'date_key', type: 'varchar' }]),
  idx('idx_user_category_date', [{ name: 'user_id', type: 'varchar' }, { name: 'category_id', type: 'varchar' }, { name: 'date_key', type: 'varchar' }]),
  idx('idx_user_account_date', [{ name: 'user_id', type: 'varchar' }, { name: 'account_id', type: 'varchar' }, { name: 'date_key', type: 'varchar' }]),
  idx('idx_user_month', [{ name: 'user_id', type: 'varchar' }, { name: 'month_key', type: 'varchar' }, { name: 'deleted_at', type: 'varchar' }]),
  idx('idx_related_tx', [{ name: 'related_transaction_id', type: 'varchar' }]),
  idx('idx_meal', [{ name: 'meal_id', type: 'varchar' }])
])

// ========== stickers ==========
writeSchema('stickers', {
  bsonType: 'object',
  required: ['user_id', 'type', 'name', 'image_url', 'created_at', 'updated_at'],
  permission: USER_PERM,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    type: enumField(['stock', 'material'], '贴纸类型'),
    name: strField(64, '名称'),
    image_url: strField(512, '图片 URL'),
    thumbnail_url: strField(512, '缩略图'),
    category_id: { ...strField(0, '分类'), ...fk('categories') },
    ledger_id: { ...strField(0, '账本'), ...fk('ledgers') },
    unit_price: { ...intField('单价(分)'), minimum: 1 },
    stock_qty: { ...intField('库存'), minimum: 0 },
    initial_stock_qty: { ...intField('初始库存'), minimum: 0 },
    low_stock_threshold: { ...intField('低库存阈值'), minimum: 0, defaultValue: 1 },
    purchase_transaction_id: { ...strField(0, '采购流水'), ...fk('transactions') },
    use_count: { ...intField('使用次数'), minimum: 0, defaultValue: 0 },
    last_used_at: tsField('最近使用'),
    sort_order: { ...intField('排序'), defaultValue: 0 },
    deleted_at: tsField('软删'),
    created_at: tsField('创建时间'),
    updated_at: tsField('更新时间')
  }
})
writeIndex('stickers', [
  idx('idx_user_type', [{ name: 'user_id', type: 'varchar' }, { name: 'type', type: 'varchar' }, { name: 'deleted_at', type: 'varchar' }, { name: 'sort_order', type: 'int' }]),
  idx('idx_user_stock', [{ name: 'user_id', type: 'varchar' }, { name: 'type', type: 'varchar' }, { name: 'stock_qty', type: 'int' }]),
  idx('idx_user_last_used', [{ name: 'user_id', type: 'varchar' }, { name: 'type', type: 'varchar' }, { name: 'last_used_at', type: 'varchar' }])
])

// ========== meals ==========
writeSchema('meals', {
  bsonType: 'object',
  required: ['user_id', 'transaction_id', 'meal_type', 'created_at', 'updated_at'],
  permission: USER_PERM,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    transaction_id: { ...strField(0, '关联交易'), ...fk('transactions') },
    meal_type: enumField(['breakfast', 'lunch', 'dinner', 'snack'], '餐次'),
    calorie_mode: { ...enumField(['whole', 'itemized', 'partial'], '录入模式'), defaultValue: 'itemized' },
    itemized_sum: { ...intField('分项热量和'), minimum: 0, defaultValue: 0 },
    whole_override: { ...intField('整餐override'), minimum: 0 },
    confirmed_calories: { ...intField('确认总热量'), minimum: 0, defaultValue: 0 },
    created_at: tsField('创建时间'),
    updated_at: tsField('更新时间')
  }
})
writeIndex('meals', [
  idx('uk_transaction', [{ name: 'transaction_id', type: 'varchar' }], true),
  idx('idx_user_created', [{ name: 'user_id', type: 'varchar' }, { name: 'created_at', type: 'varchar' }])
])

// ========== meal_food_items ==========
writeSchema('meal_food_items', {
  bsonType: 'object',
  required: ['meal_id', 'user_id', 'name', 'sort_order', 'created_at'],
  permission: USER_PERM,
  properties: {
    _id: { description: 'PK' },
    meal_id: { ...strField(0, '餐次'), ...fk('meals') },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    name: strField(64, '食物名'),
    sticker_id: { ...strField(0, '贴纸'), ...fk('stickers') },
    sticker_image_url: strField(512, '一次性图'),
    calories: { ...intField('热量 kcal'), minimum: 0 },
    sort_order: { ...intField('排序'), defaultValue: 0 },
    created_at: tsField('创建时间')
  }
})
writeIndex('meal_food_items', [
  idx('idx_meal_sort', [{ name: 'meal_id', type: 'varchar' }, { name: 'sort_order', type: 'int' }]),
  idx('idx_user', [{ name: 'user_id', type: 'varchar' }])
])

// ========== daily_settlements ==========
writeSchema('daily_settlements', {
  bsonType: 'object',
  required: ['user_id', 'date_key', 'base_limit', 'available_start', 'available_end', 'created_at'],
  permission: USER_READ_ONLY,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    date_key: strField(10, '结算日'),
    base_limit: intField('基准限额(分)'),
    surplus_pool_start: { ...intField('日初结余池(分)'), minimum: 0, defaultValue: 0 },
    consumed: { ...intField('当日消费(分)'), minimum: 0, defaultValue: 0 },
    consumed_from_base: { ...intField('从基准扣(分)'), minimum: 0, defaultValue: 0 },
    consumed_from_surplus: { ...intField('从结余池扣(分)'), minimum: 0, defaultValue: 0 },
    surplus: { ...intField('当日结余(分)'), minimum: 0, defaultValue: 0 },
    over_amount: { ...intField('超额(分)'), minimum: 0, defaultValue: 0 },
    available_start: intField('日初可用(分)'),
    available_end: intField('日末可用(分)'),
    is_over_limit: { ...boolField('超额'), defaultValue: false },
    allocation_status: { ...enumField(['pending', 'allocated', 'auto_allocated', 'skipped'], '分配状态'), defaultValue: 'pending' },
    allocation_id: { ...strField(0, '分配记录'), ...fk('surplus_allocations') },
    penalty_applied: { ...boolField('已惩罚'), defaultValue: false },
    settled_at: tsField('日切时间'),
    created_at: tsField('创建时间')
  }
})
writeIndex('daily_settlements', [
  idx('uk_user_date', [{ name: 'user_id', type: 'varchar' }, { name: 'date_key', type: 'varchar' }], true),
  idx('idx_user_alloc_status', [{ name: 'user_id', type: 'varchar' }, { name: 'allocation_status', type: 'varchar' }])
])

// ========== surplus_pools ==========
writeSchema('surplus_pools', {
  bsonType: 'object',
  required: ['user_id', 'updated_at'],
  permission: USER_READ_ONLY,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    balance: { ...intField('余额(分)'), minimum: 0, defaultValue: 0 },
    total_in: { ...intField('累计入账(分)'), minimum: 0, defaultValue: 0 },
    total_out: { ...intField('累计出账(分)'), minimum: 0, defaultValue: 0 },
    updated_at: tsField('更新时间')
  }
})
writeIndex('surplus_pools', [idx('uk_user_id', [{ name: 'user_id', type: 'varchar' }], true)])

// ========== surplus_pool_logs ==========
writeSchema('surplus_pool_logs', {
  bsonType: 'object',
  required: ['user_id', 'direction', 'amount', 'balance_after', 'reason', 'created_at'],
  permission: USER_READ_ONLY,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    direction: enumField(['in', 'out'], '方向'),
    amount: { ...intField('变动额(分)'), minimum: 1 },
    balance_after: { ...intField('变动后余额(分)'), minimum: 0 },
    reason: enumField(['daily_surplus', 'wish_return', 'savings_return', 'consume_deduct', 'allocation_out', 'manual_adjust'], '原因'),
    ref_type: enumField(['settlement', 'wish', 'savings', 'transaction', 'allocation'], '关联类型'),
    ref_id: strField(0, '关联 ID'),
    date_key: strField(10, '关联日'),
    note: { ...strField(200, '备注'), defaultValue: '' },
    created_at: tsField('创建时间')
  }
})
writeIndex('surplus_pool_logs', [
  idx('idx_user_created', [{ name: 'user_id', type: 'varchar' }, { name: 'created_at', type: 'varchar' }]),
  idx('idx_user_date', [{ name: 'user_id', type: 'varchar' }, { name: 'date_key', type: 'varchar' }]),
  idx('idx_ref', [{ name: 'ref_type', type: 'varchar' }, { name: 'ref_id', type: 'varchar' }])
])

// ========== surplus_allocations ==========
writeSchema('surplus_allocations', {
  bsonType: 'object',
  required: ['user_id', 'date_key', 'settlement_id', 'total_amount', 'items', 'created_at'],
  permission: USER_READ_ONLY,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    date_key: strField(10, '结算日'),
    settlement_id: { ...strField(0, '日快照'), ...fk('daily_settlements') },
    total_amount: { ...intField('分配总额(分)'), minimum: 1 },
    items: {
      bsonType: 'array',
      description: '拆分明细',
      items: {
        bsonType: 'object',
        properties: {
          target_type: enumField(['roll_over', 'wish', 'savings_pool'], '去向'),
          amount: { ...intField('金额(分)'), minimum: 1 },
          wish_id: { ...strField(0, '心愿 ID'), ...fk('wishes') }
        }
      }
    },
    is_auto: { ...boolField('自动分配'), defaultValue: false },
    created_at: tsField('创建时间')
  }
})
writeIndex('surplus_allocations', [
  idx('uk_user_date', [{ name: 'user_id', type: 'varchar' }, { name: 'date_key', type: 'varchar' }], true),
  idx('idx_settlement', [{ name: 'settlement_id', type: 'varchar' }])
])

// ========== wishes ==========
writeSchema('wishes', {
  bsonType: 'object',
  required: ['user_id', 'name', 'target_amount', 'created_at', 'updated_at'],
  permission: {
    read: 'doc.user_id == auth.uid',
    create: 'doc.user_id == auth.uid',
    update: 'doc.user_id == auth.uid',
    delete: 'doc.user_id == auth.uid'
  },
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    name: strField(64, '心愿名称'),
    target_amount: { ...intField('目标金额(分)'), minimum: 1 },
    saved_amount: { ...intField('已存(分)'), minimum: 0, defaultValue: 0 },
    cover_image_url: strField(512, '封面'),
    deadline: strField(10, '截止日期'),
    status: { ...enumField(['active', 'completed', 'archived'], '状态'), defaultValue: 'active' },
    progress_pct: { bsonType: 'double', description: '进度百分比', minimum: 0, maximum: 100, defaultValue: 0 },
    completed_at: tsField('达成时间'),
    sort_order: { ...intField('排序'), defaultValue: 0 },
    created_at: tsField('创建时间'),
    updated_at: tsField('更新时间')
  }
})
writeIndex('wishes', [
  idx('idx_user_status', [{ name: 'user_id', type: 'varchar' }, { name: 'status', type: 'varchar' }, { name: 'sort_order', type: 'int' }]),
  idx('idx_user_progress', [{ name: 'user_id', type: 'varchar' }, { name: 'progress_pct', type: 'double' }])
])

// ========== wish_fund_logs ==========
writeSchema('wish_fund_logs', {
  bsonType: 'object',
  required: ['user_id', 'wish_id', 'direction', 'amount', 'saved_after', 'source', 'created_at'],
  permission: USER_READ_ONLY,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    wish_id: { ...strField(0, '心愿'), ...fk('wishes') },
    direction: enumField(['in', 'out'], '方向'),
    amount: { ...intField('金额(分)'), minimum: 1 },
    saved_after: { ...intField('变动后已存(分)'), minimum: 0 },
    source: enumField(['surplus_allocation', 'manual', 'savings_pool', 'withdraw_to_surplus', 'withdraw_to_savings'], '来源'),
    ref_id: strField(0, '关联 ID'),
    note: { ...strField(200, '备注'), defaultValue: '' },
    created_at: tsField('创建时间')
  }
})
writeIndex('wish_fund_logs', [
  idx('idx_wish_created', [{ name: 'wish_id', type: 'varchar' }, { name: 'created_at', type: 'varchar' }]),
  idx('idx_user_wish', [{ name: 'user_id', type: 'varchar' }, { name: 'wish_id', type: 'varchar' }])
])

// ========== savings_pools ==========
writeSchema('savings_pools', {
  bsonType: 'object',
  required: ['user_id', 'updated_at'],
  permission: USER_READ_ONLY,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    balance: { ...intField('余额(分)'), minimum: 0, defaultValue: 0 },
    total_in: { ...intField('累计存入(分)'), minimum: 0, defaultValue: 0 },
    total_out: { ...intField('累计取出(分)'), minimum: 0, defaultValue: 0 },
    month_withdrawn: { ...intField('当月已取(分)'), minimum: 0, defaultValue: 0 },
    withdraw_month_key: strField(7, '统计月 YYYY-MM'),
    updated_at: tsField('更新时间')
  }
})
writeIndex('savings_pools', [idx('uk_user_id', [{ name: 'user_id', type: 'varchar' }], true)])

// ========== savings_pool_logs ==========
writeSchema('savings_pool_logs', {
  bsonType: 'object',
  required: ['user_id', 'direction', 'amount', 'balance_after', 'reason', 'created_at'],
  permission: USER_READ_ONLY,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    direction: enumField(['in', 'out'], '方向'),
    amount: { ...intField('变动额(分)'), minimum: 1 },
    balance_after: { ...intField('变动后余额(分)'), minimum: 0 },
    reason: enumField(['surplus_in', 'wish_return', 'withdraw_to_surplus', 'manual_in', 'manual_out'], '原因'),
    ref_type: enumField(['allocation', 'wish', 'surplus'], '关联类型'),
    ref_id: strField(0, '关联 ID'),
    date_key: strField(10, '关联日'),
    note: { ...strField(200, '备注'), defaultValue: '' },
    created_at: tsField('创建时间')
  }
})
writeIndex('savings_pool_logs', [
  idx('idx_user_created', [{ name: 'user_id', type: 'varchar' }, { name: 'created_at', type: 'varchar' }]),
  idx('idx_user_date', [{ name: 'user_id', type: 'varchar' }, { name: 'date_key', type: 'varchar' }])
])

// ========== asset_accounts ==========
writeSchema('asset_accounts', {
  bsonType: 'object',
  required: ['user_id', 'account_class', 'account_subtype', 'name', 'created_at', 'updated_at'],
  permission: USER_PERM,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    account_class: enumField(['daily', 'special', 'investment'], '账户大类'),
    account_subtype: enumField(['wechat', 'alipay', 'bank', 'cash', 'provident_fund', 'insurance', 'fund', 'stock', 'bond', 'gold', 'other'], '子类型'),
    name: strField(64, '账户名'),
    initial_balance: { ...intField('期初余额(分)'), defaultValue: 0 },
    current_balance: { ...intField('当前余额(分)'), defaultValue: 0 },
    include_in_disposable: { ...boolField('计可支配'), defaultValue: false },
    include_in_daily_limit: { ...boolField('计日限额'), defaultValue: false },
    include_in_total_asset: { ...boolField('计总资产'), defaultValue: false },
    annual_withdraw_quota: { ...intField('年度提取参考(分)'), minimum: 0 },
    annual_withdrawn: { ...intField('本年已提取(分)'), minimum: 0, defaultValue: 0 },
    quota_year: strField(4, '额度统计年 YYYY'),
    sort_order: { ...intField('排序'), defaultValue: 0 },
    deleted_at: tsField('软删'),
    created_at: tsField('创建时间'),
    updated_at: tsField('更新时间')
  }
})
writeIndex('asset_accounts', [
  idx('idx_user_class', [{ name: 'user_id', type: 'varchar' }, { name: 'account_class', type: 'varchar' }, { name: 'deleted_at', type: 'varchar' }, { name: 'sort_order', type: 'int' }]),
  idx('uk_user_name', [{ name: 'user_id', type: 'varchar' }, { name: 'name', type: 'varchar' }], true)
])

// ========== account_balance_logs ==========
writeSchema('account_balance_logs', {
  bsonType: 'object',
  required: ['user_id', 'account_id', 'change_type', 'amount_delta', 'balance_after', 'created_at'],
  permission: USER_READ_ONLY,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    account_id: { ...strField(0, '账户'), ...fk('asset_accounts') },
    change_type: enumField(['transaction', 'adjust', 'transfer_in', 'transfer_out', 'buy', 'sell', 'dividend', 'refund'], '变动类型'),
    amount_delta: intField('变动(分)'),
    balance_after: intField('变动后余额(分)'),
    transaction_id: { ...strField(0, '关联交易'), ...fk('transactions') },
    counter_account_id: { ...strField(0, '对手账户'), ...fk('asset_accounts') },
    holding_id: { ...strField(0, '持仓'), ...fk('investment_holdings') },
    note: { ...strField(200, '备注'), defaultValue: '' },
    created_at: tsField('创建时间')
  }
})
writeIndex('account_balance_logs', [
  idx('idx_account_created', [{ name: 'account_id', type: 'varchar' }, { name: 'created_at', type: 'varchar' }]),
  idx('idx_user_account', [{ name: 'user_id', type: 'varchar' }, { name: 'account_id', type: 'varchar' }, { name: 'created_at', type: 'varchar' }]),
  idx('idx_transaction', [{ name: 'transaction_id', type: 'varchar' }])
])

// ========== investment_holdings ==========
writeSchema('investment_holdings', {
  bsonType: 'object',
  required: ['user_id', 'account_id', 'name', 'created_at', 'updated_at'],
  permission: USER_PERM,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    account_id: { ...strField(0, '投资账户'), ...fk('asset_accounts') },
    name: strField(64, '名称'),
    code: strField(32, '代码'),
    asset_type: { ...enumField(['fund', 'stock', 'bond', 'gold', 'wealth', 'other'], '品种'), defaultValue: 'fund' },
    shares: { bsonType: 'double', description: '份额', minimum: 0, defaultValue: 0 },
    unit_price: intField('单价(分)'),
    market_value: { ...intField('市值(分)'), minimum: 0, defaultValue: 0 },
    cost_basis: { ...intField('成本(分)'), minimum: 0 },
    profit_loss: intField('浮动盈亏(分)'),
    last_adjust_at: tsField('最近调整'),
    deleted_at: tsField('软删'),
    created_at: tsField('创建时间'),
    updated_at: tsField('更新时间')
  }
})
writeIndex('investment_holdings', [
  idx('idx_account', [{ name: 'account_id', type: 'varchar' }, { name: 'deleted_at', type: 'varchar' }]),
  idx('idx_user_account', [{ name: 'user_id', type: 'varchar' }, { name: 'account_id', type: 'varchar' }]),
  idx('uk_account_name', [{ name: 'account_id', type: 'varchar' }, { name: 'name', type: 'varchar' }], true)
])

// ========== investment_logs ==========
writeSchema('investment_logs', {
  bsonType: 'object',
  required: ['user_id', 'holding_id', 'account_id', 'action', 'amount', 'market_value_after', 'created_at'],
  permission: USER_READ_ONLY,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    holding_id: { ...strField(0, '持仓'), ...fk('investment_holdings') },
    account_id: { ...strField(0, '投资账户'), ...fk('asset_accounts') },
    action: enumField(['buy', 'sell', 'dividend', 'adjust', 'dca'], '操作'),
    amount: { ...intField('金额(分)'), minimum: 0 },
    shares_delta: { bsonType: 'double', description: '份额变动' },
    market_value_after: { ...intField('变动后市值(分)'), minimum: 0 },
    source_account_id: { ...strField(0, '扣款账户'), ...fk('asset_accounts') },
    target_account_id: { ...strField(0, '回款账户'), ...fk('asset_accounts') },
    transaction_id: { ...strField(0, '关联交易'), ...fk('transactions') },
    note: { ...strField(200, '备注'), defaultValue: '' },
    created_at: tsField('创建时间')
  }
})
writeIndex('investment_logs', [
  idx('idx_holding_created', [{ name: 'holding_id', type: 'varchar' }, { name: 'created_at', type: 'varchar' }]),
  idx('idx_user_account', [{ name: 'user_id', type: 'varchar' }, { name: 'account_id', type: 'varchar' }, { name: 'created_at', type: 'varchar' }])
])

// ========== user_streaks ==========
writeSchema('user_streaks', {
  bsonType: 'object',
  required: ['user_id', 'updated_at'],
  permission: USER_READ_ONLY,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    daily_current_streak: { ...intField('当前连续天'), minimum: 0, defaultValue: 0 },
    daily_max_streak: { ...intField('历史最高'), minimum: 0, defaultValue: 0 },
    last_success_date_key: strField(10, '最近成功日'),
    last_fail_date_key: strField(10, '最近失败日'),
    penalty_streak_deducted: { ...intField('累计惩罚扣天'), minimum: 0, defaultValue: 0 },
    updated_at: tsField('更新时间')
  }
})
writeIndex('user_streaks', [idx('uk_user_id', [{ name: 'user_id', type: 'varchar' }], true)])

// ========== challenge_records ==========
writeSchema('challenge_records', {
  bsonType: 'object',
  required: ['user_id', 'challenge_type', 'period_key', 'created_at', 'updated_at'],
  permission: USER_READ_ONLY,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    challenge_type: enumField(['daily', 'monthly', 'yearly'], '挑战类型'),
    period_key: strField(10, '周期键'),
    target_amount: { ...intField('目标消费(分)'), minimum: 0 },
    consumed_amount: { ...intField('已消费(分)'), minimum: 0, defaultValue: 0 },
    base_limit_snapshot: intField('日限额快照(分)'),
    ledger_id: { ...strField(0, '统计账本'), ...fk('ledgers') },
    is_success: boolField('是否达标'),
    status: { ...enumField(['active', 'completed', 'failed'], '状态'), defaultValue: 'active' },
    completed_at: tsField('完成时间'),
    created_at: tsField('创建时间'),
    updated_at: tsField('更新时间')
  }
})
writeIndex('challenge_records', [
  idx('uk_user_type_period', [{ name: 'user_id', type: 'varchar' }, { name: 'challenge_type', type: 'varchar' }, { name: 'period_key', type: 'varchar' }], true),
  idx('idx_user_type_status', [{ name: 'user_id', type: 'varchar' }, { name: 'challenge_type', type: 'varchar' }, { name: 'status', type: 'varchar' }])
])

// ========== achievements ==========
writeSchema('achievements', {
  bsonType: 'object',
  required: ['code', 'name', 'icon_url', 'condition_type', 'created_at'],
  permission: SYSTEM_READ,
  properties: {
    _id: { description: 'PK' },
    code: strField(32, '成就代码'),
    name: strField(64, '名称'),
    description: { ...strField(200, '描述'), defaultValue: '' },
    icon_url: strField(512, '图标 URL'),
    condition_type: enumField(['streak', 'limit', 'challenge', 'record', 'custom'], '条件类型'),
    condition_value: intField('阈值'),
    condition_meta: { bsonType: 'object', description: '扩展条件' },
    unlock_skin_id: { ...strField(32, '解锁皮肤'), ...fk('jar_skins', 'skin_id') },
    sort_order: { ...intField('排序'), defaultValue: 0 },
    is_active: { ...boolField('上架'), defaultValue: true },
    created_at: tsField('创建时间')
  }
})
writeIndex('achievements', [
  idx('uk_code', [{ name: 'code', type: 'varchar' }], true),
  idx('idx_active_sort', [{ name: 'is_active', type: 'bool' }, { name: 'sort_order', type: 'int' }])
])

// ========== user_achievements ==========
writeSchema('user_achievements', {
  bsonType: 'object',
  required: ['user_id', 'achievement_code', 'unlocked_at'],
  permission: {
    read: 'doc.user_id == auth.uid',
    create: false,
    update: 'doc.user_id == auth.uid',
    delete: false
  },
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    achievement_code: { ...strField(32, '成就代码'), foreignKey: 'achievements.code' },
    unlocked_at: tsField('解锁时间'),
    is_seen: { ...boolField('已读'), defaultValue: false },
    share_poster_url: strField(512, '分享海报')
  }
})
writeIndex('user_achievements', [
  idx('uk_user_code', [{ name: 'user_id', type: 'varchar' }, { name: 'achievement_code', type: 'varchar' }], true),
  idx('idx_user_unlocked', [{ name: 'user_id', type: 'varchar' }, { name: 'unlocked_at', type: 'varchar' }])
])

// ========== user_penalty_logs ==========
writeSchema('user_penalty_logs', {
  bsonType: 'object',
  required: ['user_id', 'date_key', 'settlement_id', 'penalty_type', 'created_at'],
  permission: USER_READ_ONLY,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    date_key: strField(10, '惩罚日'),
    settlement_id: { ...strField(0, '日快照'), ...fk('daily_settlements') },
    over_amount: { ...intField('超额(分)'), minimum: 0 },
    penalty_type: enumField(['streak_deduct', 'badge_off', 'virtual_points'], '惩罚类型'),
    penalty_value: intField('扣减数值'),
    streak_before: intField('惩罚前连续天'),
    streak_after: intField('惩罚后连续天'),
    achievement_codes_affected: { bsonType: 'array', arrayType: 'string', description: '熄灭徽章', defaultValue: [] },
    created_at: tsField('创建时间')
  }
})
writeIndex('user_penalty_logs', [
  idx('uk_user_date_type', [{ name: 'user_id', type: 'varchar' }, { name: 'date_key', type: 'varchar' }, { name: 'penalty_type', type: 'varchar' }], true),
  idx('idx_settlement', [{ name: 'settlement_id', type: 'varchar' }])
])

// ========== jar_skins ==========
writeSchema('jar_skins', {
  bsonType: 'object',
  required: ['skin_id', 'name', 'series', 'preview_url', 'assets', 'created_at'],
  permission: SYSTEM_READ,
  properties: {
    _id: { description: 'PK' },
    skin_id: strField(32, '皮肤 ID'),
    name: strField(64, '展示名'),
    series: { ...enumField(['default', 'zodiac', 'constellation', 'festival', 'achievement', 'pixel'], '系列'), defaultValue: 'default' },
    preview_url: strField(512, '预览图'),
    assets: {
      bsonType: 'object',
      description: '资源包',
      properties: {
        jar_body_url: strField(512, '罐体资源'),
        coin_style_url: strField(512, '硬币样式'),
        animation_pack_version: strField(16, '动效包版本'),
        particle_style: strField(64, '粒子样式')
      }
    },
    unlock_type: { ...enumField(['default', 'achievement', 'purchase', 'event'], '获取方式'), defaultValue: 'default' },
    unlock_condition: { bsonType: 'object', description: '解锁条件' },
    price: { ...intField('价格(分)'), minimum: 0, defaultValue: 0 },
    sort_order: { ...intField('排序'), defaultValue: 0 },
    is_active: { ...boolField('上架'), defaultValue: true },
    created_at: tsField('创建时间')
  }
})
writeIndex('jar_skins', [
  idx('uk_skin_id', [{ name: 'skin_id', type: 'varchar' }], true),
  idx('idx_series_active', [{ name: 'series', type: 'varchar' }, { name: 'is_active', type: 'bool' }, { name: 'sort_order', type: 'int' }])
])

// ========== data_backups ==========
writeSchema('data_backups', {
  bsonType: 'object',
  required: ['user_id', 'backup_date_key', 'payload_url', 'expires_at', 'created_at'],
  permission: USER_READ_ONLY,
  properties: {
    _id: { description: 'PK' },
    user_id: { ...strField(64, '用户 openid'), ...fk('users', 'user_id') },
    backup_date_key: strField(10, '备份日'),
    backup_type: { ...enumField(['auto', 'manual'], '备份类型'), defaultValue: 'auto' },
    payload_url: strField(512, '快照 URL'),
    payload_size: { ...intField('文件大小 bytes'), minimum: 0 },
    record_count: { ...intField('记录数'), minimum: 0, defaultValue: 0 },
    checksum: strField(64, '校验和'),
    expires_at: tsField('过期时间'),
    created_at: tsField('创建时间')
  }
})
writeIndex('data_backups', [
  idx('idx_user_date', [{ name: 'user_id', type: 'varchar' }, { name: 'backup_date_key', type: 'varchar' }]),
  idx('idx_expires', [{ name: 'expires_at', type: 'varchar' }])
])

console.log('Generated 30 schema + index file pairs in', DB_DIR)
