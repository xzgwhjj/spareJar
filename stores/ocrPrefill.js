/**
 * OCR 识别失败兜底：将已上传的小票图片等预填数据暂存，
 * 跳转「记一笔」手动记账页时带入，保证图片不丢失（阶段 9）。
 */
import { reactive } from 'vue'

/** @typedef {{ imageUrl: string, amount: string, note: string, dateKey: string, categoryId: string, ocrMeta: object|null }} OcrPrefill */

/** @type {OcrPrefill} */
export const ocrPrefill = reactive({
  imageUrl: '',
  amount: '',
  note: '',
  dateKey: '',
  categoryId: '',
  ocrMeta: null
})

/** 写入待回填数据（识别失败时调用，至少保留 imageUrl） */
export function setOcrPrefill(data) {
  ocrPrefill.imageUrl = data.imageUrl || ''
  ocrPrefill.amount = data.amount || ''
  ocrPrefill.note = data.note || ''
  ocrPrefill.dateKey = data.dateKey || ''
  ocrPrefill.categoryId = data.categoryId || ''
  ocrPrefill.ocrMeta = data.ocrMeta || null
}

/** 取出并清空待回填数据（记一笔页 onMounted 时调用） */
export function consumeOcrPrefill() {
  const snapshot = {
    imageUrl: ocrPrefill.imageUrl,
    amount: ocrPrefill.amount,
    note: ocrPrefill.note,
    dateKey: ocrPrefill.dateKey,
    categoryId: ocrPrefill.categoryId,
    ocrMeta: ocrPrefill.ocrMeta
  }
  ocrPrefill.imageUrl = ''
  ocrPrefill.amount = ''
  ocrPrefill.note = ''
  ocrPrefill.dateKey = ''
  ocrPrefill.categoryId = ''
  ocrPrefill.ocrMeta = null
  return snapshot
}
