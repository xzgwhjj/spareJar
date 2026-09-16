'use strict'

const db = require('../core/db')
const { upsertByUnique } = require('../core/db')
const { formatDateKey, nowTs, getDb, toStoredTime } = require('../utils/date')
const money = require('../utils/money')
const ids = require('../utils/id')
const { ACTIVITY_FACTORS } = require('../core/constants')
const transaction = require('./transaction')

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

  const saved = await upsertByUnique('user_health_profiles', { user_id: userId }, patch, {
    activity_level: 'sedentary',
    bmr_is_manual: false,
    tdee_is_manual: false,
    intake_target_is_manual: false,
    disclaimer_accepted: false,
    created_at: ts
  })
  delete saved.__created
  return saved
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
  const payload = {
    intake_total: intakeTotal,
    intake_target: intakeTarget,
    intake_remaining: intakeRemaining,
    exercise_calories: exercise,
    total_burn: totalBurn,
    calorie_gap: calorieGap,
    tdee_snapshot: tdee,
    updated_at: ts
  }
  await upsertByUnique('daily_health_snapshots', { user_id: userId, date_key: dateKey }, payload)
  return { user_id: userId, date_key: dateKey, ...payload }
}

/** 仅扣减某囤货贴纸库存（供餐次保存时并入本餐，不另记支出）。库存不足抛错。 */
async function decrementStockQty(userId, stickerId, n) {
  const db = getDb()
  const s = await db.collection('stickers').doc(stickerId).get()
  const sticker = s.data && s.data[0]
  if (!sticker || sticker.user_id !== userId || sticker.type !== 'stock') return
  const cur = sticker.stock_qty == null ? 0 : sticker.stock_qty
  if (cur < n) throw new Error('库存不足：' + (sticker.name || '贴纸'))
  await db.collection('stickers').doc(stickerId).update({
    stock_qty: cur - n,
    use_count: (sticker.use_count || 0) + 1,
    last_used_at: nowTs(),
    updated_at: nowTs()
  })
}

/** 编辑餐次时把减少的囤货数量补回库存。 */
async function restockQty(userId, stickerId, n) {
  const db = getDb()
  const s = await db.collection('stickers').doc(stickerId).get()
  const sticker = s.data && s.data[0]
  if (!sticker || sticker.user_id !== userId || sticker.type !== 'stock') return
  const cur = sticker.stock_qty == null ? 0 : sticker.stock_qty
  await db.collection('stickers').doc(stickerId).update({ stock_qty: cur + n, updated_at: nowTs() })
}

/** 新建餐次（同时创建餐饮支出交易 + 餐次 + 食物项，§3.10.2/3/4）。 */

async function createMeal(userId, data) {
  const db = getDb()
  const ts = nowTs()
  const dateKey = data.date_key || formatDateKey(new Date(data.transaction_at || ts))
  const tx = await transaction.createTransaction(userId, {
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
    sticker_image_url: data.sticker_image_url,
    sticker_qty: data.sticker_qty || 1
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
    const source = f.source === 'stock' || f.source === 'material' || f.source === 'combo' ? f.source : 'upload'
    const qty = Math.max(1, Math.round(Number(f.qty) || 1))
    await db.collection('meal_food_items').add({
      meal_id: mealId,
      user_id: userId,
      name: String(f.name || '').trim() || '食物',
      sticker_id: f.sticker_id || null,
      sticker_image_url: f.sticker_image_url || null,
      source,
      qty,
      calorie_auto: !!f.calorie_auto,
      combo_items: Array.isArray(f.combo_items) ? f.combo_items : null,
      calories: Math.round(Number(f.calories) || 0),
      sort_order: i,
      created_at: ts
    })
    if (source === 'stock' && f.sticker_id) await decrementStockQty(userId, f.sticker_id, qty)
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

  await transaction.updateTransaction(userId, meal.transaction_id, {
    amount: data.amount,
    category_id: data.category_id,
    ledger_id: data.ledger_id,
    account_id: data.account_id,
    note: data.note,
    date_key: data.date_key,
    transaction_at: data.transaction_at !== undefined ? toStoredTime(data.transaction_at) : data.transaction_at,
    image_urls: data.image_urls,
    sticker_id: data.sticker_id,
    sticker_image_url: data.sticker_image_url,
    sticker_qty: data.sticker_qty || 1
  })

  // 统计旧库存消耗，便于编辑时做差值（避免重复扣 / 漏补）
  const oldFood = await db.collection('meal_food_items').where({ meal_id: mealId }).get()
  const oldStockMap = {}
  for (const f of (oldFood.data || [])) {
    if (f.source === 'stock' && f.sticker_id) {
      oldStockMap[f.sticker_id] = (oldStockMap[f.sticker_id] || 0) + (f.qty || 1)
    }
  }
  await db.collection('meal_food_items').where({ meal_id: mealId }).remove()
  const foodItems = Array.isArray(data.food_items) ? data.food_items : []
  const itemizedSum = foodItems.reduce((s, f) => s + (Math.round(Number(f.calories) || 0)), 0)
  const newStockMap = {}
  for (let i = 0; i < foodItems.length; i++) {
    const f = foodItems[i]
    const source = f.source === 'stock' || f.source === 'material' || f.source === 'combo' ? f.source : 'upload'
    const qty = Math.max(1, Math.round(Number(f.qty) || 1))
    await db.collection('meal_food_items').add({
      meal_id: mealId,
      user_id: userId,
      name: String(f.name || '').trim() || '食物',
      sticker_id: f.sticker_id || null,
      sticker_image_url: f.sticker_image_url || null,
      source,
      qty,
      calorie_auto: !!f.calorie_auto,
      combo_items: Array.isArray(f.combo_items) ? f.combo_items : null,
      calories: Math.round(Number(f.calories) || 0),
      sort_order: i,
      created_at: ts
    })
    if (source === 'stock' && f.sticker_id) {
      newStockMap[f.sticker_id] = (newStockMap[f.sticker_id] || 0) + qty
    }
  }
  // 库存差值：新增的扣减，减少的补回
  const allIds = new Set([...Object.keys(oldStockMap), ...Object.keys(newStockMap)])
  for (const id of allIds) {
    const delta = (newStockMap[id] || 0) - (oldStockMap[id] || 0)
    if (delta > 0) await decrementStockQty(userId, id, delta)
    else if (delta < 0) await restockQty(userId, id, -delta)
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
  if (tx) await transaction.softDeleteTransaction(userId, meal.transaction_id)
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
  const payload = {
    intake_total: 0,
    intake_target: (hp && hp.daily_intake_target) ? hp.daily_intake_target : 0,
    intake_remaining: 0,
    exercise_calories: ex,
    total_burn: totalBurn,
    calorie_gap: totalBurn,
    tdee_snapshot: tdee,
    updated_at: ts
  }
  await upsertByUnique('daily_health_snapshots', { user_id: userId, date_key: dateKey }, payload)
  return { user_id: userId, date_key: dateKey, ...payload }
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


module.exports = {
  calcBMR,
  getHealthProfile,
  upsertHealthProfile,
  recomputeDailyHealth,
  createMeal,
  updateMeal,
  deleteMeal,
  getMeal,
  getMealsByDate,
  getDailyHealthSnapshot,
  setExerciseCalories,
  getWeeklyHealth,
}
