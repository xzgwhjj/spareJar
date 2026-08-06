'use strict'

const db = require('../core/db')
const { getDocByUser, getDb, upsertByUnique, isDuplicateKeyError } = require('../core/db')
const { formatDateKey, formatMonthKey, formatYearKey, todayDateKey, addDaysToDateKey, parseDateKey, formatDateTime, toStoredTime, nowTs } = require('../utils/date')
const money = require('../utils/money')
const ids = require('../utils/id')

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
  const ts = nowTs()
  const patch = { target_amount: target, updated_at: ts }
  if (ledgerId) patch.ledger_id = ledgerId
  const saved = await upsertByUnique(
    'challenge_records',
    { user_id: userId, challenge_type: type, period_key: periodKey },
    patch,
    {
      consumed_amount: 0,
      base_limit_snapshot: null,
      ledger_id: ledgerId || '',
      is_success: false,
      status: 'active',
      created_at: ts
    }
  )
  return { _id: saved._id, ...patch }
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
      try {
        await db.collection('user_achievements').add({
          user_id: userId,
          achievement_code: a.code,
          unlocked_at: ts,
          is_seen: false,
          created_at: ts
        })
      } catch (err) {
        // 并发下已解锁：跳过，不重复计入 newly
        if (isDuplicateKeyError(err)) continue
        throw err
      }
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


module.exports = {
  getChallengeSummary,
  setChallengeTarget,
  getAchievements,
  evaluateAndUnlockAchievements,
}
