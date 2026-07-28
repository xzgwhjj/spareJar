/**
 * 人民币大写金额转换工具。
 * 输入「元」字符串/数值，输出中文大写（如 壹佰贰拾叁元肆角伍分 / 壹佰元整）。
 * 与 money.js 解耦，仅做展示用文本转换，不涉金额换算。
 */

const CN_NUM = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
const CN_UNIT = ['', '拾', '佰', '仟']

/** 4 位以内（含前导零）分段转中文，保留段内必要的「零」 */
function fourToChinese(section) {
  const len = section.length
  let str = ''
  for (let i = 0; i < len; i++) {
    const num = parseInt(section[i], 10)
    const unit = CN_UNIT[len - 1 - i]
    if (num === 0) {
      // 仅当该段后续仍有非零数字、且尚未补零时才补「零」
      const hasLater = section.slice(i + 1).split('').some((c) => c !== '0')
      if (hasLater && !str.endsWith('零')) str += '零'
    } else {
      str += CN_NUM[num] + unit
    }
  }
  return str
}

/** 正整数（字符串）转中文，按 4 位一段处理 万/亿/兆 量级与段间零 */
function integerToChinese(intStr) {
  const s = intStr.replace(/^0+/, '')
  if (s === '') return '零'
  const sections = []
  let t = s
  while (t.length > 0) {
    sections.unshift(t.slice(-4))
    t = t.slice(0, -4)
  }
  const bigUnits = ['', '万', '亿', '兆']
  const n = sections.length
  let result = ''
  for (let i = 0; i < n; i++) {
    const section = sections[i]
    const bigIndex = n - 1 - i
    const secStr = fourToChinese(section)
    if (secStr === '') {
      // 整段为 0：仅当其后还有非零段时补一个「零」
      if (result !== '' && !result.endsWith('零')) {
        let laterNonZero = false
        for (let j = i + 1; j < n; j++) {
          if (parseInt(sections[j], 10) !== 0) {
            laterNonZero = true
            break
          }
        }
        if (laterNonZero) result += '零'
      }
      continue
    }
    result += secStr
    if (bigIndex > 0) result += bigUnits[bigIndex]
  }
  // 合并段间/段内产生的连续「零」，并清理末尾多余「零」
  return result.replace(/零+/g, '零').replace(/零+$/, '')
}

/**
 * 元 → 人民币大写
 * @param {number|string} input 元（可带 ¥、千分位、正负号），空返回 ''
 * @returns {string}
 */
export function yuanToChinese(input) {
  if (input === null || input === undefined || input === '') return ''
  let str = String(input).trim().replace(/[¥￥,\s]/g, '')
  if (str === '' || str === '.') return ''
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(str)) return ''

  const negative = str[0] === '-'
  if (negative) str = str.slice(1)
  const negSign = negative ? '负' : ''

  const [intRaw = '0', decRaw = ''] = str.split('.')
  const dec = (decRaw + '00').slice(0, 2)
  const intNum = parseInt(intRaw || '0', 10)
  const jiao = parseInt(dec[0], 10)
  const fen = parseInt(dec[1], 10)

  if (intNum === 0 && jiao === 0 && fen === 0) return '零元'

  let result = ''
  if (intNum > 0) {
    result += integerToChinese(String(intNum)) + '元'
  }
  if (jiao === 0 && fen === 0) {
    result += '整'
  } else {
    if (intNum > 0 && jiao === 0 && fen > 0) result += '零'
    if (jiao > 0) result += CN_NUM[jiao] + '角'
    if (fen > 0) result += CN_NUM[fen] + '分'
  }
  return negSign + result
}

export default { yuanToChinese }
