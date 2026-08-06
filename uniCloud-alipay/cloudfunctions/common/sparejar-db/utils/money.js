'use strict'

function calcProgressPct(saved, target) {
  if (!target || target <= 0) return 0
  return Math.min(100, Math.round((saved / target) * 10000) / 100)
}


function parseAmountFen(text) {
  if (!text) return 0
  const lines = String(text).split('\n')
  const keywordRe = /(合计|应收|实收|总额|总金额|消费金额|付款金额|应付|金额|总计|找零)/i
  let candidate = null
  for (const line of lines) {
    if (keywordRe.test(line)) {
      const m = line.match(/[¥￥]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/)
      if (m) { candidate = m[1]; break }
    }
  }
  if (!candidate) {
    const all = String(text).match(/[¥￥]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g) || []
    let max = 0
    for (const a of all) {
      const n = parseFloat(a.replace(/[¥￥\s,]/g, ''))
      if (!isNaN(n) && n > max) max = n
    }
    if (max <= 0) return 0
    candidate = String(max)
  }
  const num = parseFloat(String(candidate).replace(/,/g, ''))
  if (isNaN(num) || num <= 0) return 0
  return Math.round(num * 100)
}

/** 提取商户名（含店/超市/餐厅等关键字行，否则首行） */

module.exports = {
  calcProgressPct,
  parseAmountFen,
}
