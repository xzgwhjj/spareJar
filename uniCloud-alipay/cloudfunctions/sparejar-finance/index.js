'use strict'

const dbApi = require('sparejar-db')

function getUid(event, context) {
  return event.user_id || context.CLIENTINFO && context.CLIENTINFO.uid || context.auth && context.auth.uid
}

function ok(data) {
  return { code: 0, message: 'ok', data }
}

function fail(message, code = 400) {
  return { code, message }
}

exports.main = async (event, context) => {
  const { action, data = {} } = event
  const userId = getUid(event, context)

  if (!userId && action !== 'cronDailySettlement') {
    return fail('unauthorized', 401)
  }

  try {
    switch (action) {
      case 'initUser':
        return ok(await dbApi.initUser(userId, data))

      case 'createTransaction':
        if (!data.ledger_id || !data.type || !data.amount) {
          return fail('ledger_id, type and amount are required')
        }
        return ok(await dbApi.createTransaction(userId, data))

      case 'deleteTransaction':
        if (!data.transaction_id) return fail('transaction_id is required')
        return ok(await dbApi.softDeleteTransaction(userId, data.transaction_id))

      case 'recalculateSettlement':
        if (!data.date_key) return fail('date_key is required')
        return ok(await dbApi.recalculateDailySettlement(userId, data.date_key))

      case 'runDailySettlement':
        return ok(await dbApi.runDailySettlement(userId, data.date_key || dbApi.formatDateKey(), data))

      case 'allocateSurplus':
        if (!data.date_key) return fail('date_key is required')
        return ok(await dbApi.allocateSurplus(userId, data.date_key, data.items, !!data.is_auto))

      case 'applySurplusPoolChange':
        return ok({
          balance: await dbApi.applySurplusPoolChange(
            userId,
            data.direction,
            data.amount,
            data.reason,
            data.refs || {}
          )
        })

      case 'applySavingsPoolChange':
        return ok({
          balance: await dbApi.applySavingsPoolChange(
            userId,
            data.direction,
            data.amount,
            data.reason,
            data.refs || {}
          )
        })

      case 'applyWishFundChange':
        if (!data.wish_id) return fail('wish_id is required')
        return ok({
          saved_after: await dbApi.applyWishFundChange(
            userId,
            data.wish_id,
            data.direction,
            data.amount,
            data.source,
            data.refs || {}
          )
        })

      case 'applyAccountBalanceChange':
        if (!data.account_id) return fail('account_id is required')
        return ok({
          balance: await dbApi.applyAccountBalanceChange(
            userId,
            data.account_id,
            data.amount_delta,
            data.change_type || 'adjust',
            data.refs || {}
          )
        })

      case 'cronDailySettlement': {
        const db = uniCloud.database()
        const dateKey = data.date_key || dbApi.formatDateKey(new Date(Date.now() - 86400000))
        const batchSize = data.batch_size || 100
        const usersRes = await db.collection('users').where({ deleted_at: db.command.eq(null) }).field({ user_id: true }).limit(batchSize).get()
        const results = []
        for (const u of usersRes.data || []) {
          try {
            const r = await dbApi.runDailySettlement(u.user_id, dateKey, { autoAllocate: true })
            results.push({ user_id: u.user_id, ...r })
          } catch (e) {
            results.push({ user_id: u.user_id, error: e.message })
          }
        }
        return ok({ date_key: dateKey, results })
      }

      default:
        return fail(`unknown action: ${action}`, 404)
    }
  } catch (err) {
    console.error('[sparejar-finance]', action, err)
    return fail(err.message || 'internal error', 500)
  }
}
