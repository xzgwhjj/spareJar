'use strict'

/**
 * 定时触发日切结算（UTC 16:00 ≈ 北京时间次日 00:00，可按用户 timezone 扩展分批）
 */
exports.main = async () => {
  const res = await uniCloud.callFunction({
    name: 'sparejar-finance',
    data: {
      action: 'cronDailySettlement',
      data: {}
    }
  })
  return res.result
}
