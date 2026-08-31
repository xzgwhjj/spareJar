'use strict'

// 一次性迁移脚本：清理 categories 集合中残留的 group 字段（该字段已废弃，
// 新逻辑不再写入、schema 也已移除）。运行方式：HBuilderX 右键本云函数 ->
// 运行（本地调试），参数传 {} 即可。可重复运行，幂等无害。用完请删除本云函数。

const db = uniCloud.database()
const _ = db.command

exports.main = async (event = {}, context) => {
  let offset = 0
  let scanned = 0
  let updated = 0
  const errors = []

  while (true) {
    const res = await db.collection('categories').limit(1000).skip(offset).get()
    const docs = res.data || []
    if (docs.length === 0) break

    for (const doc of docs) {
      scanned++
      try {
        // 仅当该文档确实还有 group 字段时才清理
        if (Object.prototype.hasOwnProperty.call(doc, 'group')) {
          await db.collection('categories').doc(doc._id).update({ group: _.remove() })
          updated++
        }
      } catch (e) {
        errors.push({ _id: doc._id, error: (e && e.message) || String(e) })
      }
    }

    if (docs.length < 1000) break
    offset += 1000
  }

  return {
    code: 0,
    message: 'migrate cleanup group done',
    data: { scanned, updated, errors: errors.length },
    errorDetails: errors.slice(0, 20),
  }
}
