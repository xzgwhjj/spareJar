<template>
  <view class="sticker-page" data-cmp="StickerLib">
    <!-- 顶部栏 -->
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">贴纸库</text>
      <view class="add-btn" @click="goCreate"><text>＋</text></view>
    </view>

    <!-- Tab 切换 -->
    <view class="tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        class="tab"
        :class="{ active: tab === t.key }"
        @click="tab = t.key"
      >
        <text class="tab-icon">{{ t.icon }}</text>
        <text class="tab-label">{{ t.label }}</text>
        <text class="tab-count">{{ countOf(t.key) }}</text>
      </view>
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false">
      <!-- 统计卡 -->
      <view class="glass-mid stat-card">
        <view class="stat-block">
          <text class="stat-val" style="color:#25cc5d">{{ list.length }}</text>
          <text class="stat-lbl">{{ tab === 'stock' ? '囤货种类' : '素材种类' }}</text>
        </view>
        <view class="stat-block">
          <text class="stat-val" style="color:#3b82f6">{{ totalUsed }}</text>
          <text class="stat-lbl">总使用次数</text>
        </view>
        <view class="stat-block" v-if="tab === 'stock'">
          <text class="stat-val" style="color:#f59e0b">{{ lowStockCount }}</text>
          <text class="stat-lbl">库存紧张</text>
        </view>
      </view>

      <!-- 贴纸网格 -->
      <view class="sticker-grid">
        <view
          v-for="(s, i) in list"
          :key="s._id"
          class="sticker-card glass-mid"
          :class="{ disabled: isOutOfStock(s) }"
          :style="{ animationDelay: (i * 0.04) + 's' }"
          @click="onTap(s)"
          @longpress="onLongPress(s)"
        >
          <image class="sticker-img" :src="s.image_url" mode="aspectFill" />
          <view v-if="tab === 'stock' && isLowStock(s)" class="badge low">库存紧张</view>
          <view v-if="tab === 'stock' && isOutOfStock(s)" class="badge out">需补货</view>

          <text class="sticker-name">{{ s.name }}</text>

          <template v-if="tab === 'stock'">
            <text class="sticker-sub">库存 {{ s.stock_qty }} · ¥{{ yuan(s.unit_price) }}/件</text>
            <view class="consume-btn" @click.stop="onTap(s)">消耗 1 件</view>
          </template>
          <template v-else>
            <text class="sticker-sub">已用 {{ s.use_count || 0 }} 次</text>
            <text class="sticker-cat" v-if="s.category_id">{{ catName(s.category_id) }}</text>
          </template>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="list.length === 0" class="empty">
        <text class="empty-icon">{{ tab === 'stock' ? '📦' : '🖼️' }}</text>
        <text class="empty-text">{{ tab === 'stock' ? '还没有囤货贴纸，去添加一个吧' : '素材库空空如也' }}</text>
        <view class="empty-btn" @click="goCreate"><text>＋ 新建贴纸</text></view>
      </view>

      <view style="height:40rpx;" />
    </scroll-view>

    <!-- 消耗确认弹窗 -->
    <view v-if="showConsume" class="sheet-mask" @click="showConsume = false">
      <view class="sheet" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">消耗记账 · {{ activeSticker.name }}</text>
        <view class="consume-preview">
          <image class="cp-img" :src="activeSticker.image_url" mode="aspectFill" />
          <view class="cp-info">
            <text class="cp-name">{{ activeSticker.name }}</text>
            <text class="cp-stock">当前库存 {{ activeSticker.stock_qty }} 件</text>
            <text class="cp-price">单价 ¥{{ yuan(activeSticker.unit_price) }}</text>
          </view>
        </view>

        <view class="qty-row">
          <text class="qty-label">消耗数量</text>
          <view class="stepper">
            <view class="step-btn" @click="decQty">−</view>
            <text class="qty-val">{{ consumeQty }}</text>
            <view class="step-btn" @click="incQty">＋</view>
          </view>
        </view>

        <view class="amount-line">
          <text>将记一笔支出</text>
          <text class="amount-val">¥{{ yuan(activeSticker.unit_price * consumeQty) }}</text>
        </view>

        <view class="sheet-btn" :class="{ loading: consuming }" @click="confirmConsume">
          <text>{{ consuming ? '记账中…' : '确认消耗并记账' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user.js'
import { formatFen } from '@/utils/money.js'

const { state, categoryMap, loadStickers, consumeStickerAction, deleteStickerAction } = useUserStore()

const TABS = [
  { key: 'stock', label: '囤货', icon: '📦' },
  { key: 'material', label: '素材', icon: '🖼️' }
]
const tab = ref('stock')

const list = computed(() => (state.stickers || []).filter((s) => s.type === tab.value))

const totalUsed = computed(() => list.value.reduce((s, x) => s + (x.use_count || 0), 0))
const lowStockCount = computed(() => list.value.filter((s) => isLowStock(s)).length)

function countOf(key) {
  return (state.stickers || []).filter((s) => s.type === key).length
}

function yuan(fen) {
  if (!fen) return '0.00'
  return formatFen(fen)
}

function catName(catId) {
  const c = categoryMap.value[String(catId)]
  return c ? c.name : '未分类'
}

function isLowStock(s) {
  if (s.type !== 'stock') return false
  const threshold = s.low_stock_threshold != null ? s.low_stock_threshold : 1
  return s.stock_qty > 0 && s.stock_qty <= threshold
}
function isOutOfStock(s) {
  return s.type === 'stock' && s.stock_qty <= 0
}

// 消耗弹窗
const showConsume = ref(false)
const activeSticker = ref({})
const consumeQty = ref(1)
const consuming = ref(false)

function onTap(s) {
  if (s.type === 'stock') {
    if (isOutOfStock(s)) {
      uni.showToast({ title: '库存为 0，请先补货', icon: 'none' })
      return
    }
    activeSticker.value = s
    consumeQty.value = 1
    showConsume.value = true
  } else {
    // 素材：点击预览大图
    uni.previewImage({ urls: [s.image_url], current: s.image_url })
  }
}

function decQty() {
  if (consumeQty.value > 1) consumeQty.value--
}
function incQty() {
  const max = activeSticker.value.stock_qty || 1
  if (consumeQty.value < max) consumeQty.value++
}

async function confirmConsume() {
  if (consuming.value) return
  consuming.value = true
  try {
    const r = await consumeStickerAction(activeSticker.value._id, consumeQty.value)
    uni.showToast({ title: '已记一笔支出', icon: 'success' })
    showConsume.value = false
    if (r && r.new_stock_qty <= 0) {
      setTimeout(() => uni.showToast({ title: '库存已清空，记得补货', icon: 'none' }), 600)
    }
  } catch (err) {
    const msg = err && err.message ? err.message : '消耗失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    consuming.value = false
  }
}

function onLongPress(s) {
  uni.showActionSheet({
    itemList: ['编辑', '删除'],
    success: (res) => {
      if (res.tapIndex === 0) goEdit(s)
      else if (res.tapIndex === 1) confirmDelete(s)
    }
  })
}

function confirmDelete(s) {
  uni.showModal({
    title: '删除贴纸',
    content: `确定删除「${s.name}」吗？${s.type === 'stock' && s.stock_qty > 0 ? '（不会删除已记的消耗记录）' : ''}`,
    confirmText: '删除',
    confirmColor: '#ff6b6b',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await deleteStickerAction(s._id)
        state.stickers = state.stickers.filter((x) => x._id !== s._id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (err) {
        uni.showToast({ title: (err && err.message) || '删除失败', icon: 'none' })
      }
    }
  })
}

function goCreate() {
  uni.navigateTo({ url: '/pages/sticker-lib/sticker-edit' })
}
function goEdit(s) {
  uni.navigateTo({ url: `/pages/sticker-lib/sticker-edit?id=${s._id}` })
}
function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/ledger/ledger' })
}

onShow(async () => {
  if (state.uid) await loadStickers()
})
</script>

<style scoped lang="scss">
.sticker-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #eafaf0 0%, #f2fcf2 32%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  --g5: #25cc5d;
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
  }
  .back-btn, .add-btn {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink3);
    font-size: 40rpx;
    font-weight: 700;
  }
  .topbar-title {
    font-size: 34rpx;
    font-weight: 800;
    color: var(--ink);
  }

  .tabs {
    display: flex;
    gap: 16rpx;
    padding: 8rpx 32rpx 12rpx;
  }
  .tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    padding: 18rpx;
    border-radius: 24rpx;
    background: rgba(255, 255, 255, 0.6);
    color: var(--ink3);
    font-weight: 600;
    cursor: pointer;
    &.active {
      background: linear-gradient(135deg, #4fd974, #25cc5d);
      color: #fff;
      box-shadow: 0 6rpx 24rpx rgba(37, 204, 93, 0.25);
    }
    .tab-icon { font-size: 28rpx; }
    .tab-label { font-size: 26rpx; }
    .tab-count {
      font-size: 20rpx;
      padding: 2rpx 12rpx;
      border-radius: 20rpx;
      background: rgba(0, 0, 0, 0.06);
    }
    &.active .tab-count { background: rgba(255, 255, 255, 0.25); }
  }

  .page-scroll { flex: 1; min-height: 0; }

  .stat-card {
    margin: 8rpx 32rpx 16rpx;
    padding: 24rpx;
    border-radius: 28rpx;
    display: flex;
  }
  .stat-block { flex: 1; text-align: center; }
  .stat-val { font-size: 36rpx; font-weight: 800; display: block; }
  .stat-lbl { font-size: 20rpx; color: var(--ink4); margin-top: 4rpx; display: block; }

  .sticker-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
    padding: 0 32rpx;
  }
  .sticker-card {
    position: relative;
    width: calc(33.33% - 14rpx);
    border-radius: 24rpx;
    padding: 16rpx 12rpx 18rpx;
    text-align: center;
    cursor: pointer;
    animation: bounce-in 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) backwards;
    &.disabled { opacity: 0.5; }
    .sticker-img {
      width: 96rpx;
      height: 96rpx;
      border-radius: 18rpx;
      background: rgba(0, 0, 0, 0.04);
    }
    .badge {
      position: absolute;
      top: 10rpx;
      right: 10rpx;
      font-size: 16rpx;
      padding: 2rpx 10rpx;
      border-radius: 16rpx;
      font-weight: 700;
      &.low { background: rgba(245, 158, 11, 0.16); color: #d97706; }
      &.out { background: rgba(255, 107, 107, 0.16); color: var(--red); }
    }
    .sticker-name {
      font-size: 24rpx;
      font-weight: 700;
      color: var(--ink);
      display: block;
      margin-top: 10rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sticker-sub {
      font-size: 18rpx;
      color: var(--ink4);
      display: block;
      margin-top: 4rpx;
    }
    .sticker-cat {
      font-size: 18rpx;
      color: var(--ink3);
      display: block;
      margin-top: 4rpx;
    }
    .consume-btn {
      margin-top: 12rpx;
      padding: 10rpx 0;
      border-radius: 18rpx;
      background: linear-gradient(135deg, #4fd974, #25cc5d);
      color: #fff;
      font-size: 20rpx;
      font-weight: 700;
    }
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
    padding: 80rpx 0 40rpx;
    .empty-icon { font-size: 80rpx; opacity: 0.7; }
    .empty-text { font-size: 24rpx; color: var(--ink4); }
    .empty-btn {
      margin-top: 8rpx;
      padding: 16rpx 40rpx;
      border-radius: 32rpx;
      background: linear-gradient(135deg, #4fd974, #25cc5d);
      color: #fff;
      font-size: 26rpx;
      font-weight: 700;
    }
  }

  .sheet-mask {
    position: fixed;
    inset: 0;
    background: rgba(15, 28, 20, 0.45);
    z-index: 50;
    display: flex;
    align-items: flex-end;
  }
  .sheet {
    width: 100%;
    background: #fff;
    border-radius: 32rpx 32rpx 0 0;
    padding: 16rpx 32rpx 48rpx;
    display: flex;
    flex-direction: column;
  }
  .sheet-handle { display: flex; justify-content: center; padding: 8rpx 0 12rpx; }
  .handle-bar { width: 80rpx; height: 8rpx; border-radius: 8rpx; background: rgba(0, 0, 0, 0.12); }
  .sheet-title { font-size: 30rpx; font-weight: 800; color: var(--ink); text-align: center; margin-bottom: 20rpx; }

  .consume-preview { display: flex; align-items: center; gap: 20rpx; padding: 16rpx; border-radius: 20rpx; background: rgba(37, 204, 93, 0.06); }
  .cp-img { width: 96rpx; height: 96rpx; border-radius: 16rpx; }
  .cp-info { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
  .cp-name { font-size: 28rpx; font-weight: 700; color: var(--ink); }
  .cp-stock { font-size: 22rpx; color: var(--ink3); }
  .cp-price { font-size: 22rpx; color: var(--ink3); }

  .qty-row { display: flex; align-items: center; justify-content: space-between; margin-top: 28rpx; }
  .qty-label { font-size: 26rpx; color: var(--ink2); font-weight: 600; }
  .stepper { display: flex; align-items: center; gap: 20rpx; }
  .step-btn {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: rgba(37, 204, 93, 0.12);
    color: var(--g5);
    font-size: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
  }
  .qty-val { font-size: 36rpx; font-weight: 800; color: var(--ink); min-width: 48rpx; text-align: center; }

  .amount-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 28rpx 0 8rpx;
    font-size: 26rpx;
    color: var(--ink3);
  }
  .amount-val { font-size: 34rpx; font-weight: 800; color: var(--red); }

  .sheet-btn {
    margin-top: 20rpx;
    padding: 28rpx;
    border-radius: 32rpx;
    background: linear-gradient(135deg, #4fd974, #25cc5d);
    color: #fff;
    text-align: center;
    font-size: 30rpx;
    font-weight: 800;
    box-shadow: 0 8rpx 40rpx rgba(37, 204, 93, 0.3);
    &.loading { opacity: 0.7; }
  }
}

@keyframes bounce-in {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.08); }
  70% { transform: scale(0.94); }
  100% { transform: scale(1); opacity: 1; }
}
</style>
