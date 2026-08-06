'use strict'

function pad(n) {
  return n < 10 ? '0' + n : String(n)
}


function formatDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}


function formatMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}


function formatYearKey(date = new Date()) {
  return `${date.getFullYear()}`
}


function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}


function addDaysToDateKey(dateKey, days) {
  const d = parseDateKey(dateKey)
  d.setDate(d.getDate() + days)
  return formatDateKey(d)
}


function todayDateKey() {
  return formatDateKey(new Date())
}

// 'YYYY-MM-DD HH:MM:SS' -> 'YYYY-MM-DDTHH:MM:SS'，兼容各 JS 引擎解析

function normalizeTimestamp(s) {
  return s.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/, '$1T$2')
}

// 数据库时间统一存储为 'YYYY-MM-DD HH:MM:SS' 字符串（本地时区）

function formatDateTime(date = new Date()) {
  let d
  if (date instanceof Date) d = date
  else if (typeof date === 'number') d = new Date(date)
  else d = new Date(normalizeTimestamp(String(date)))
  if (Number.isNaN(d.getTime())) throw new Error(`无法解析时间: ${date}`)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// 将任意时间输入（Date/时间戳/字符串）规范为存储字符串；已是该格式则原样返回

function toStoredTime(v) {
  if (v == null) return null
  if (v instanceof Date || typeof v === 'number') return formatDateTime(v)
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v)) return v
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v + ' 00:00:00'
    return formatDateTime(v)
  }
  return null
}

// getDb / nowTs 是底层数据库入口与时间戳工具。在单体 index.js 时代二者与日期工具
// 同文件，各 domain 习惯从 require('../utils/date') 解构它们。为保持兼容且不引入
// 与 core/db 的循环依赖，这里自包含实现（core/db 单向依赖 utils/date，无环）。
function getDb() {
  return uniCloud.database()
}

function nowTs() {
  return formatDateTime()
}

module.exports = {
  pad,
  formatDateKey,
  formatMonthKey,
  formatYearKey,
  parseDateKey,
  addDaysToDateKey,
  todayDateKey,
  normalizeTimestamp,
  formatDateTime,
  toStoredTime,
  getDb,
  nowTs,
}
