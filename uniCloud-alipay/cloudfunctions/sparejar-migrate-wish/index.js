'use strict'

// 一次性迁移脚本：将存量心愿的「总目标 / 总已存 / 完成次数」按 phases 重算并写回，
// 使其与新的分阶段语义一致（target_amount=总目标、saved_amount=总已存、done_phases=完成阶段数）。
//
// 背景：新逻辑中开启下一阶段时，心愿 target_amount/saved_amount 应始终为所有阶段汇总。
// 但升级前已开启过阶段的历史心愿，其 saved_amount 曾被重置为 0、target_amount 退化为「新阶段自身目标」，
// 导致详情页进度条与卡片显示错误。本脚本对全部 wishes 重算修复，可重复运行（幂等）。
//
// 运行方式：HBuilderX 右键本云函数 -> 运行（本地调试），参数传 {} 即可。

const db = uniCloud.database()

// 与 domains/wish.js 中 cumulativeTargetOf 保持一致：
// add 模式累加各阶段 target；total 模式用该阶段 target 覆盖累计值。
function cumulativeTargetOf(phases) {
  let cum = 0
  for (const p of (phases || [])) {
    if (p.mode === 'total') cum = p.target || 0
    else cum = cum + (Number(p.target) || 0)
  }
  return cum
}

// 阶段是否算「已完成」：当前 active 不计；已达标（已存>=目标）的非 active 阶段记为 done。
function phaseDoneStatus(p) {
  if (p.status === 'active') return 'active'
  const saved = Number(p.saved) || 0
  const target = Number(p.target) || 0
  if (saved >= target && target > 0) return 'done'
  return p.status === 'done' ? 'done' : 'skipped'
}

exports.main = async (event = {}, context) => {
  let offset = 0
  let scanned = 0
  let updated = 0
  const errors = []

  while (true) {
    const res = await db.collection('wishes').limit(1000).skip(offset).get()
    const docs = res.data || []
    if (docs.length === 0) break

    for (const doc of docs) {
      scanned++
      try {
        // 1) 还原阶段列表（无 phases 的旧数据用文档自身字段合成单阶段）
        let phases
        if (Array.isArray(doc.phases) && doc.phases.length) {
          phases = doc.phases.map((p) => ({ ...p, status: phaseDoneStatus(p) }))
        } else {
          const saved = Number(doc.saved_amount) || 0
          const target = Number(doc.target_amount) || 0
          phases = [{
            index: 1,
            mode: 'add',
            target,
            saved,
            status: target > 0 && saved >= target ? 'done' : 'active',
            done_at: doc.completed_at || null,
            start_date: doc.start_date ? String(doc.start_date).slice(0, 10) : null,
            start_time: doc.start_time ? String(doc.start_time).slice(0, 8) : null,
            end_date: doc.end_date ? String(doc.end_date).slice(0, 10) : null,
            end_time: doc.end_time ? String(doc.end_time).slice(0, 8) : null,
          }]
        }

        // 2) 汇总到「总」字段
        const totalSaved = phases.reduce((s, p) => s + (Number(p.saved) || 0), 0)
        const totalTarget = cumulativeTargetOf(phases)
        const donePhases = phases.filter((p) => p.status === 'done').length
        const pct = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0

        const patch = {
          phases,
          target_amount: totalTarget,
          saved_amount: totalSaved,
          cumulative_target: totalTarget,
          done_phases: donePhases,
          progress_pct: pct,
        }

        // 3) 仅在有差异时写入（幂等，避免无谓写）
        let changed = false
        for (const k of ['target_amount', 'saved_amount', 'cumulative_target', 'done_phases', 'progress_pct']) {
          if (Number(doc[k] || 0) !== Number(patch[k] || 0)) changed = true
        }
        // phases 结构也检查（无 phases 的旧数据一定变化）
        if (!Array.isArray(doc.phases) || !doc.phases.length) changed = true

        if (changed) {
          await db.collection('wishes').doc(doc._id).update(patch)
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
    message: 'migrate wish totals done',
    data: { scanned, updated, errors: errors.length },
    errorDetails: errors.slice(0, 20),
  }
}
