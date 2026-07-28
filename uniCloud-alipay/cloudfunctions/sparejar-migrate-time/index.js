'use strict'

// 一次性迁移脚本：将历史记录中「数字时间戳(ms)」的时间字段，
// 统一转换为 'YYYY-MM-DD HH:MM:SS' 字符串，使其与新写入格式一致。
// 运行方式：HBuilderX 右键本云函数 -> 运行（本地调试），参数传 {} 即可。
// 可重复运行，已是字符串的字段会被跳过，不会重复转换。

const db = uniCloud.database()

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

// number(ms) -> 'YYYY-MM-DD HH:MM:SS'；其余类型原样返回
function fmt(ts) {
  if (typeof ts === 'number') ts = new Date(ts)
  if (ts instanceof Date) {
    return `${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())} ` +
      `${pad(ts.getHours())}:${pad(ts.getMinutes())}:${pad(ts.getSeconds())}`
  }
  return ts
}

// 全部业务表（与 database/*.schema.json 对应）
const COLLECTIONS = [
  'account_balance_logs', 'achievements', 'asset_accounts', 'categories', 'challenge_records',
  'daily_health_snapshots', 'daily_settlements', 'data_backups', 'investment_holdings', 'investment_logs',
  'jar_skins', 'ledger_members', 'ledgers', 'meal_food_items', 'meals', 'savings_pool_logs', 'savings_pools',
  'stickers', 'surplus_allocations', 'surplus_pool_logs', 'surplus_pools', 'transactions', 'uni-id-users',
  'user_achievements', 'user_health_profiles', 'user_penalty_logs', 'user_settings', 'user_streaks', 'users',
  'wishes', 'wish_fund_logs'
]

// 这些字段语义为数字（如微信 token 过期时间），保留不转换
const KEEP_NUMERIC = ['expires_at']

exports.main = async (event = {}, context) => {
  const stats = {}
  for (const name of COLLECTIONS) {
    let updated = 0
    let offset = 0
    while (true) {
      const res = await db.collection(name).limit(1000).skip(offset).get()
      const docs = res.data || []
      if (docs.length === 0) break
      for (const doc of docs) {
        const patch = {}
        for (const key of Object.keys(doc)) {
          if (key.endsWith('_at') && !KEEP_NUMERIC.includes(key) && typeof doc[key] === 'number') {
            patch[key] = fmt(doc[key])
          }
        }
        if (Object.keys(patch).length) {
          await db.collection(name).doc(doc._id).update(patch)
          updated++
        }
      }
      if (docs.length < 1000) break
      offset += 1000
    }
    stats[name] = updated
  }
  return { code: 0, message: 'migrate done', data: stats }
}
