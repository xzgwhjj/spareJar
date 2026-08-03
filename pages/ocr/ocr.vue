<template>
  <view class="ocr-page" data-cmp="OcrPage">
    <!-- 顶部栏 -->
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">拍照识别记账</text>
      <view class="topbar-spacer" />
    </view>

    <!-- 极光背景 -->
    <view class="aurora-bg-wrap">
      <view class="aurora-bg-base" />
      <view class="aurora-top-halo" />
      <view class="blob-top-r" />
      <view class="blob-bot" />
    </view>

    <scroll-view scroll-y enhanced :show-scrollbar="false" class="page-scroll">
      <!-- 待上传（idle） -->
      <view v-if="phase === 'idle'" class="upload-card glass-mid">
        <view class="upload-icon">📷</view>
        <text class="upload-title">拍小票 / 截账单，自动入账</text>
        <text class="upload-sub">识别金额、商户与日期，智能推荐分类</text>
        <view class="upload-actions">
          <view class="upload-btn camera" @click="pickAndRecognize('camera')">
            <text class="ub-icon">📸</text>
            <text class="ub-text">拍照</text>
          </view>
          <view class="upload-btn album" @click="pickAndRecognize('album')">
            <text class="ub-icon">🖼️</text>
            <text class="ub-text">相册</text>
          </view>
        </view>
        <text class="upload-tip">拍照将调用相机，仅用于识别小票内容</text>
      </view>

      <!-- 识别中 -->
      <view v-else-if="phase === 'recognizing'" class="state-card glass-mid">
        <view class="spinner" />
        <text class="state-title">正在识别小票…</text>
        <text class="state-sub">识别完成后可校对金额与分类</text>
      </view>

      <!-- 识别失败 -->
      <view v-else-if="phase === 'failed'" class="state-card glass-mid">
        <view class="state-icon">⚠️</view>
        <text class="state-title">识别未成功</text>
        <text class="state-sub">{{ errorReason }}</text>
        <view class="state-actions">
          <view class="state-btn primary" @click="retry"><text>重新识别</text></view>
          <view class="state-btn ghost" @click="goManual"><text>手动记账（保留图片）</text></view>
        </view>
      </view>

      <!-- 识别成功：校对待办卡 -->
      <view v-else-if="phase === 'success'" class="review">
        <view class="review-img glass-mid">
          <image :src="draft.imageUrls[0]" mode="aspectFill" class="review-img-el" />
          <view class="review-badge"><text>已识别</text></view>
        </view>

        <view class="review-card glass-mid">
          <view class="section-label">金额（元）</view>
          <number-field class="amount-input" :model-value="draft.amount" placeholder="0.00" title="金额" :decimal-places="2" :max-integer="9" @update:model-value="(v) => (draft.amount = v)" />

          <view class="section-label">商户 / 备注</view>
          <input class="note-input" v-model="draft.note" placeholder="如：盒马鲜生" maxlength="60" />

          <view class="section-label">日期</view>
          <picker mode="date" :value="draft.dateKey" @change="onDateChange">
            <view class="date-row">
              <text class="date-text">{{ draft.dateKey }}</text>
              <text class="date-arrow">›</text>
            </view>
          </picker>

          <view class="section-label">推荐分类</view>
          <view class="cat-grid">
            <view
              v-for="c in expenseCats"
              :key="c._id"
              class="cat-chip"
              :class="{ active: draft.categoryId === c._id }"
              @click="draft.categoryId = c._id"
            >
              <text class="cat-emoji">{{ c.icon }}</text>
              <text class="cat-name">{{ c.name }}</text>
            </view>
          </view>
          <view v-if="!expenseCats.length" class="empty-hint">暂无分类，请先在分类管理添加</view>

          <view class="section-label">账本</view>
          <scroll-view scroll-x enhanced :show-scrollbar="false" class="ledger-scroll">
            <view class="ledger-row">
              <view
                v-for="l in ledgers"
                :key="l._id"
                class="ledger-chip"
                :class="{ active: draft.ledgerId === l._id }"
                @click="draft.ledgerId = l._id"
              >
                <text>{{ l.icon || '📒' }} {{ l.name }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="review-actions">
          <view class="review-btn ghost" @click="retry"><text>重新识别</text></view>
          <view class="review-btn primary" :class="{ loading: saving }" @click="confirmSave">
            <text>{{ saving ? '保存中…' : '确认入账' }}</text>
          </view>
        </view>
      </view>

      <view class="scroll-bottom-gap" />
    </scroll-view>
      
    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
</view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user.js'
import { createTransaction, listCategories, listLedgers } from '@/api/sparejar.js'
import { setOcrPrefill } from '@/stores/ocrPrefill.js'
import { yuanToFen, fenToYuanString } from '@/utils/money.js'
import { todayDateKey } from '@/utils/date.js'

const userStore = useUserStore()

const phase = ref('idle') // idle | recognizing | success | failed
const errorReason = ref('')
const saving = ref(false)
const lastImageUrl = ref('')
const uploading = ref(false)

const draft = reactive({
  amount: '',
  note: '',
  dateKey: todayDateKey(),
  categoryId: '',
  ledgerId: '',
  imageUrls: []
})
const ocrMeta = ref(null)

const expenseCats = ref([])
const ledgers = ref([])

const REASON_TEXT = {
  missing_image: '未获取到图片',
  read_image_failed: '图片读取失败',
  ocr_request_failed: 'OCR 服务调用失败',
  empty_text: '未识别到文字，请确认图片清晰',
  unknown: '识别失败'
}
function reasonText(reason) {
  return REASON_TEXT[reason] || REASON_TEXT.unknown
}

async function uploadToCloud(filePath) {
  const uid = userStore.state.uid
  const ext = (filePath.split('.').pop() || 'png').split('?')[0].toLowerCase()
  const cloudPath = `ocr/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const up = await uniCloud.uploadFile({ filePath: filePath, cloudPath })
  return (up && (up.url || up.fileID)) || ''
}

async function pickAndRecognize(sourceType) {
  if (!userStore.state.uid) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  uni.chooseImage({
    count: 1,
    sourceType: [sourceType],
    success: async (res) => {
      const p = (res.tempFilePaths || [])[0]
      if (!p) return
      phase.value = 'recognizing'
      errorReason.value = ''
      uploading.value = true
      try {
        const url = await uploadToCloud(p)
        lastImageUrl.value = url
        const r = await userStore.recognizeReceiptAction(url)
        if (r && r.success) {
          draft.amount = r.recognized_amount ? fenToYuanString(r.recognized_amount) : ''
          draft.note = r.merchant || ''
          draft.dateKey = r.recognized_date || todayDateKey()
          draft.categoryId = r.suggested_category_id || ''
          draft.imageUrls = [r.image_url]
          ocrMeta.value = {
            provider: r.provider,
            raw_text: r.raw_text,
            merchant: r.merchant,
            recognized_amount: r.recognized_amount,
            recognized_date: r.recognized_date,
            confidence: r.confidence,
            image_url: r.image_url
          }
          phase.value = 'success'
        } else {
          errorReason.value = reasonText(r && r.reason)
          phase.value = 'failed'
        }
      } catch (err) {
        console.error('[ocr] recognize failed', err)
        errorReason.value = '识别服务异常，请手动记账'
        phase.value = 'failed'
      } finally {
        uploading.value = false
      }
    },
    fail: () => {
      // 用户取消选择，不做处理
    }
  })
}

function onDateChange(e) {
  draft.dateKey = e.detail.value
}

async function confirmSave() {
  if (saving.value) return
  if (!draft.amount || draft.amount === '.' || Number(draft.amount || 0) <= 0) {
    uni.showToast({ title: '请输入金额', icon: 'none' })
    return
  }
  let fen
  try {
    fen = yuanToFen(draft.amount)
  } catch (err) {
    uni.showToast({ title: '金额格式有误', icon: 'none' })
    return
  }
  if (!draft.categoryId) {
    uni.showToast({ title: '请选择分类', icon: 'none' })
    return
  }
  if (!draft.ledgerId) {
    uni.showToast({ title: '请选择账本', icon: 'none' })
    return
  }
  saving.value = true
  try {
    const [y, m, d] = draft.dateKey.split('-').map(Number)
    const now = new Date()
    const txAt = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).getTime()
    await createTransaction({
      ledger_id: draft.ledgerId,
      type: 'expense',
      amount: fen,
      category_id: draft.categoryId,
      note: draft.note.trim(),
      date_key: draft.dateKey,
      transaction_at: txAt,
      image_urls: draft.imageUrls,
      ocr_meta: ocrMeta.value
    })
    uni.showToast({ title: '已记录', icon: 'success' })
    try {
      await userStore.refreshTodayDashboard({ force: true })
    } catch (_e) { /* 看板刷新失败不影响已保存结果 */ }
    setTimeout(() => uni.switchTab({ url: '/pages/index/index' }), 500)
  } catch (err) {
    const msg = err && err.message ? err.message : '保存失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    saving.value = false
  }
}

function retry() {
  phase.value = 'idle'
  errorReason.value = ''
  draft.amount = ''
  draft.note = ''
  draft.dateKey = todayDateKey()
  draft.categoryId = ''
  draft.imageUrls = []
  ocrMeta.value = null
}

/** 识别失败兜底：保留图片跳「记一笔」手动记账 */
function goManual() {
  setOcrPrefill({
    imageUrl: lastImageUrl.value,
    amount: draft.amount,
    note: draft.note,
    dateKey: draft.dateKey,
    categoryId: draft.categoryId,
    ocrMeta: ocrMeta.value
  })
  uni.switchTab({ url: '/pages/add-record/add-record' })
}

function goBack() {
  uni.switchTab({ url: '/pages/index/index' })
}

async function loadExpenseCats() {
  const uid = userStore.state.uid
  if (!uid) return
  try {
    // 走云函数读取，禁止前端直连数据库
    const cats = await listCategories()
    expenseCats.value = (cats || [])
      .filter((c) => c.type === 'expense' && !c.is_hidden)
      .map((c) => ({ _id: c._id, name: c.name, icon: c.icon }))
  } catch (err) {
    console.error('[ocr] load categories failed', err)
  }
}

async function loadLedgerList() {
  const uid = userStore.state.uid
  if (!uid) return
  try {
    // 走云函数读取，禁止前端直连数据库
    const list = await listLedgers()
    ledgers.value = (list || [])
      .filter((l) => !l.deleted_at)
      .map((l) => ({ _id: l._id, name: l.name, icon: l.icon }))
    const def = ledgers.value.find((l) => l._id === userStore.state.defaultLedgerId)
    draft.ledgerId = (def || ledgers.value[0] || {})._id || ''
  } catch (err) {
    console.error('[ocr] load ledgers failed', err)
  }
}

onMounted(async () => {
  if (!userStore.state.uid) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  await Promise.all([loadExpenseCats(), loadLedgerList()])
})
</script>

<style scoped lang="scss">
.ocr-page {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(180deg, #eafaf0 0%, #f2fcf2 32%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  --g5: #25cc5d;
  --g4: #4fd974;
  --ink: #0f1c14;
  --ink2: #3a5244;
  --ink3: #6b8c7a;
  --ink4: #9bb8a8;
  --red: #ff6b6b;

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 88rpx 32rpx 8rpx;
    position: relative;
    z-index: 2;
  }
  .back-btn {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink3);
    font-size: 32rpx;
  }
  .topbar-title {
    font-size: 34rpx;
    font-weight: 800;
    color: var(--ink);
  }
  .topbar-spacer {
    width: 64rpx;
  }

  .aurora-bg-wrap {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .aurora-bg-base {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, #eafaf0 0%, #f2fcf2 60%);
  }
  .aurora-top-halo {
    position: absolute;
    top: -180rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 720rpx;
    height: 420rpx;
    background: radial-gradient(circle, rgba(79, 217, 116, 0.35), transparent 70%);
    filter: blur(20rpx);
  }
  .blob-top-r {
    position: absolute;
    top: 120rpx;
    right: -120rpx;
    width: 320rpx;
    height: 320rpx;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(194, 242, 200, 0.5), transparent 70%);
    filter: blur(10rpx);
  }
  .blob-bot {
    position: absolute;
    bottom: -160rpx;
    left: -120rpx;
    width: 360rpx;
    height: 360rpx;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(137, 229, 156, 0.4), transparent 70%);
    filter: blur(12rpx);
  }

  .page-scroll {
    flex: 1;
    min-height: 0;
    position: relative;
    z-index: 1;
    padding: 16rpx 32rpx 0;
  }

  .glass-mid {
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(28rpx) saturate(1.3);
    -webkit-backdrop-filter: blur(28rpx) saturate(1.3);
    border: 2rpx solid rgba(255, 255, 255, 0.85);
    border-radius: 36rpx;
    box-shadow: 0 8rpx 32rpx rgba(37, 204, 93, 0.08);
  }

  .upload-card {
    margin-top: 40rpx;
    padding: 56rpx 40rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;

    .upload-icon {
      font-size: 96rpx;
      margin-bottom: 20rpx;
    }
    .upload-title {
      font-size: 32rpx;
      font-weight: 800;
      color: var(--ink);
    }
    .upload-sub {
      font-size: 24rpx;
      color: var(--ink3);
      margin-top: 10rpx;
    }
    .upload-actions {
      display: flex;
      gap: 28rpx;
      margin-top: 44rpx;
    }
    .upload-btn {
      width: 220rpx;
      height: 150rpx;
      border-radius: 28rpx;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10rpx;
      cursor: pointer;
      &.camera {
        background: linear-gradient(135deg, #4fd974, #25cc5d);
        color: #fff;
        box-shadow: 0 8rpx 28rpx rgba(37, 204, 93, 0.3);
      }
      &.album {
        background: rgba(255, 255, 255, 0.85);
        color: var(--ink2);
        border: 2rpx solid rgba(37, 204, 93, 0.25);
      }
      .ub-icon { font-size: 44rpx; }
      .ub-text { font-size: 26rpx; font-weight: 700; }
    }
    .upload-tip {
      font-size: 20rpx;
      color: var(--ink4);
      margin-top: 32rpx;
    }
  }

  .state-card {
    margin-top: 80rpx;
    padding: 64rpx 40rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;

    .spinner {
      width: 72rpx;
      height: 72rpx;
      border: 8rpx solid rgba(37, 204, 93, 0.2);
      border-top-color: var(--g5);
      border-radius: 50%;
      animation: ocr-spin 0.8s linear infinite;
      margin-bottom: 28rpx;
    }
    .state-icon { font-size: 80rpx; margin-bottom: 16rpx; }
    .state-title { font-size: 30rpx; font-weight: 800; color: var(--ink); }
    .state-sub { font-size: 24rpx; color: var(--ink3); margin-top: 12rpx; }
    .state-actions {
      display: flex;
      flex-direction: column;
      gap: 20rpx;
      margin-top: 40rpx;
      width: 100%;
    }
    .state-btn {
      height: 92rpx;
      border-radius: 28rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28rpx;
      font-weight: 700;
      cursor: pointer;
      &.primary { background: linear-gradient(135deg, #4fd974, #25cc5d); color: #fff; }
      &.ghost { background: rgba(255, 255, 255, 0.8); color: var(--ink2); border: 2rpx solid rgba(37, 204, 93, 0.25); }
    }
  }

  @keyframes ocr-spin {
    to { transform: rotate(360deg); }
  }

  .review {
    margin-top: 24rpx;

    .review-img {
      position: relative;
      width: 100%;
      height: 320rpx;
      border-radius: 28rpx;
      overflow: hidden;
      margin-bottom: 24rpx;

      .review-img-el { width: 100%; height: 100%; }
      .review-badge {
        position: absolute;
        top: 16rpx;
        left: 16rpx;
        padding: 6rpx 18rpx;
        border-radius: 20rpx;
        background: rgba(37, 204, 93, 0.92);
        color: #fff;
        font-size: 20rpx;
        font-weight: 700;
      }
    }

    .review-card {
      padding: 28rpx 28rpx 32rpx;

      .section-label {
        font-size: 22rpx;
        color: var(--ink4);
        font-weight: 700;
        padding: 20rpx 4rpx 10rpx;
      }
      .amount-input {
        width: 100%;
        height: 88rpx;
        border-radius: 24rpx;
        background: rgba(255, 255, 255, 0.85);
        border: 2rpx solid rgba(194, 242, 200, 0.6);
        padding: 0 28rpx;
        font-size: 40rpx;
        font-weight: 800;
        color: var(--ink);
      }
      .note-input {
        width: 100%;
        height: 76rpx;
        border-radius: 24rpx;
        background: rgba(255, 255, 255, 0.85);
        border: 2rpx solid rgba(194, 242, 200, 0.6);
        padding: 0 28rpx;
        font-size: 26rpx;
        color: var(--ink);
      }
      .date-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18rpx 28rpx;
        border-radius: 24rpx;
        background: rgba(255, 255, 255, 0.85);
        border: 2rpx solid rgba(194, 242, 200, 0.6);
        .date-text { font-size: 26rpx; color: var(--ink2); }
        .date-arrow { color: var(--ink4); font-size: 32rpx; }
      }
      .cat-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 16rpx;
      }
      .cat-chip {
        padding: 14rpx 22rpx;
        border-radius: 28rpx;
        border: 3rpx solid transparent;
        background: rgba(255, 255, 255, 0.7);
        display: flex;
        align-items: center;
        gap: 8rpx;
        font-size: 24rpx;
        font-weight: 600;
        color: var(--ink3);
        cursor: pointer;
        &.active {
          border-color: var(--g5);
          background: rgba(37, 204, 93, 0.12);
          color: var(--ink);
        }
      }
      .cat-emoji { font-size: 30rpx; }
      .empty-hint {
        text-align: center;
        color: var(--ink4);
        font-size: 24rpx;
        padding: 20rpx;
      }
      .ledger-scroll {
        white-space: nowrap;
      }
      .ledger-row {
        display: inline-flex;
        gap: 16rpx;
      }
      .ledger-chip {
        display: inline-block;
        padding: 14rpx 28rpx;
        border-radius: 40rpx;
        background: rgba(255, 255, 255, 0.7);
        font-size: 24rpx;
        color: var(--ink3);
        cursor: pointer;
        &.active {
          background: linear-gradient(135deg, #4fd974, #25cc5d);
          color: #fff;
        }
      }
    }

    .review-actions {
      display: flex;
      gap: 20rpx;
      margin-top: 28rpx;
    }
    .review-btn {
      flex: 1;
      height: 96rpx;
      border-radius: 32rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30rpx;
      font-weight: 800;
      cursor: pointer;
      &.primary {
        background: linear-gradient(135deg, #4fd974, #25cc5d);
        color: #fff;
        box-shadow: 0 8rpx 40rpx rgba(37, 204, 93, 0.3);
        &.loading { opacity: 0.7; }
      }
      &.ghost {
        background: rgba(255, 255, 255, 0.8);
        color: var(--ink2);
        border: 2rpx solid rgba(37, 204, 93, 0.25);
      }
    }
  }

  .scroll-bottom-gap {
    height: 48rpx;
  }
}
</style>
