<template>
  <view class="wish-mini card-in-1" data-cmp="WishMiniCard" @click="goWish">
    <view class="wm-head">
      <text class="wm-title">心愿进度</text>
      <text class="wm-arrow">›</text>
    </view>

    <!-- 有心愿：展示进度最高的一个 -->
    <view v-if="topWish" class="wm-body">
      <view class="wm-emoji-box">
        <text class="wm-emoji">⭐</text>
      </view>
      <text class="wm-name">{{ topWish.name }}</text>

      <view class="wm-bar">
        <view
          class="wm-bar-fill"
          :class="{ done: pct >= 100 }"
          :style="{ width: pct + '%' }"
        />
      </view>

      <view class="wm-meta">
        <text class="wm-saved">¥{{ savedText }}</text>
        <text class="wm-target">/ ¥{{ targetText }}</text>
      </view>
      <text class="wm-pct">{{ pct }}%</text>

      <text v-if="pct < 100" class="wm-left">还差 ¥{{ leftText }}</text>
      <text v-else class="wm-left done">已达成 🎉</text>
    </view>

    <!-- 无心愿：引导创建 -->
    <view v-else class="wm-empty">
      <text class="wm-empty-emoji">⭐</text>
      <text class="wm-empty-text">还没心愿</text>
      <text class="wm-empty-sub">去建一个攒钱目标</text>
    </view>
      
</view>
</template>

<script setup>
import { computed } from 'vue';
import { useUserStore } from '@/stores/user.js';
import { formatFen } from '@/utils/money.js';

const { state } = useUserStore();

// 后端已按 progress_pct 降序返回，取进度最高者作为迷你卡主角
const topWish = computed(() => (state.wishes && state.wishes.length ? state.wishes[0] : null));

const pct = computed(() => {
  const w = topWish.value;
  if (!w) return 0;
  if (typeof w.progress_pct === 'number') return Math.max(0, Math.min(Math.round(w.progress_pct), 100));
  const t = w.target_amount || 0;
  if (!t) return 0;
  return Math.max(0, Math.min(Math.round((w.saved_amount || 0) / t * 100), 100));
});

const savedText = computed(() => formatFen(topWish.value ? (topWish.value.saved_amount || 0) : 0));
const targetText = computed(() => formatFen(topWish.value ? (topWish.value.target_amount || 0) : 0));
const leftText = computed(() => {
  const w = topWish.value;
  if (!w) return '0';
  return formatFen(Math.max(0, (w.target_amount || 0) - (w.saved_amount || 0)));
});

const goWish = () => uni.navigateTo({ url: '/pages/wish/wish' });
</script>

<style scoped lang="scss">
.wish-mini {
  padding: 24rpx 22rpx 22rpx;
  display: flex;
  flex-direction: column;
  min-height: 300rpx;
  cursor: pointer;

  .wm-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18rpx;
  }
  .wm-title {
    font-size: 22rpx;
    font-weight: 700;
    color: var(--ink2);
  }
  .wm-arrow {
    font-size: 28rpx;
    color: var(--ink4);
  }

  .wm-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .wm-emoji-box {
    width: 72rpx;
    height: 72rpx;
    border-radius: 22rpx;
    background: linear-gradient(135deg, rgba(252, 211, 77, 0.35), rgba(252, 211, 77, 0.18));
    border: 2rpx solid rgba(252, 211, 77, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12rpx;
  }
  .wm-emoji { font-size: 36rpx; }
  .wm-name {
    font-size: 24rpx;
    font-weight: 700;
    color: var(--ink);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 14rpx;
  }

  .wm-bar {
    width: 100%;
    height: 14rpx;
    border-radius: 8rpx;
    background: rgba(252, 211, 77, 0.16);
    overflow: hidden;
  }
  .wm-bar-fill {
    height: 100%;
    border-radius: 8rpx;
    background: linear-gradient(90deg, #ffe08a, #fcd34d);
    transition: width 0.8s cubic-bezier(0.34, 1.2, 0.64, 1);
    &.done {
      background: linear-gradient(90deg, #89e59c, #25cc5d);
    }
  }

  .wm-meta {
    margin-top: 12rpx;
    display: flex;
    align-items: baseline;
    gap: 4rpx;
  }
  .wm-saved {
    font-size: 26rpx;
    font-weight: 800;
    color: var(--ink);
  }
  .wm-target {
    font-size: 20rpx;
    color: var(--ink4);
  }
  .wm-pct {
    font-size: 20rpx;
    font-weight: 700;
    color: #d9a406;
    margin-top: 2rpx;
  }
  .wm-left {
    margin-top: 10rpx;
    font-size: 19rpx;
    color: var(--ink3);
    &.done {
      color: var(--g5);
      font-weight: 700;
    }
  }

  .wm-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 6rpx;
  }
  .wm-empty-emoji { font-size: 44rpx; opacity: 0.8; }
  .wm-empty-text {
    font-size: 24rpx;
    font-weight: 700;
    color: var(--ink2);
  }
  .wm-empty-sub {
    font-size: 19rpx;
    color: var(--ink4);
  }
}
</style>
