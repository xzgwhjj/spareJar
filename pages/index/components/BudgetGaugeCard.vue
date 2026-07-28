<template>
  <view class="budget-gauge-card card-in-1" :class="cardClass" data-cmp="BudgetGaugeCard">
    <!-- 背景光晕 -->
    <view class="bg-glow" :class="{ 'over-glow': isOver }" />

    <!-- 标题行 -->
    <view class="gauge-header">
      <!-- 待：符合风格的余钱罐图标 -->
      <text class="gauge-header-icon">💰</text>
      <text class="gauge-header-title">今日余钱罐</text>
      <view class="limit-btn" @click="goLimitSetting">
        <!-- 待：符合风格的限额图标 -->
        <text class="limit-btn-icon">🎯</text>
        <text class="limit-btn-text">限额 ¥{{ dailyLimitText }}</text>
        <text class="limit-btn-arrow">›</text>
      </view>
      <view v-if="isOver" class="over-badge">
        <text class="over-badge-text">已超支</text>
      </view>
    </view>

    <!-- 罐体 + 悬浮 HUD -->
    <view class="jar-hud-area">
      <!-- 存钱罐 SVG -->
      <view class="jar-wrapper">
        <SavingsJar :pct="pct" :is-over="isOver" :left-pct="pct" />
        <text class="jar-limit-text">满额 ¥{{ dailyLimitText }}</text>
      </view>

      <!-- 悬浮面板 -->
      <view class="panel-float" :style="{ outline: isOver ? ' 2rpx solid rgba(255,107,107,0.18)' : '2rpx solid rgba(37,204,93,0.18)', boxShadow: isOver ? '0 16rpx 56rpx rgba(255,107,107,0.14),0 2px 8px rgba(0,0,0,0.05), inset 0 1.5px 0 rgba(255,255,255,0.98)' : '0 16rpx 56rpx rgba(37,204,93,0.2),0 2px 8px rgba(0,0,0,0.07), inset 0 1.5px 0 rgba(255,255,255,0.98)' }">
        <view class="hud-inner">
          <text class="hud-label">还可花</text>
          <text class="hud-amount" :class="{ 'over-amount': isOver }">¥{{ leftText }}</text>
          <text class="hud-spent">已用 ¥{{ spentText }} · 限额 ¥{{ dailyLimitText }}</text>
          <view class="hud-bar" :class="{ 'over-bar': isOver }">
            <view
              class="bar-grow-inner"
              :style="{
                width: spentPct * 100 + '%',
                background: isOver
                  ? 'linear-gradient(90deg,#ffb3b3,#ff6b6b)'
                  : 'linear-gradient(90deg,#89e59c,#25cc5d)',
              }"
            />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import SavingsJar from './SavingsJar.vue';
import { useUserStore } from '@/stores/user.js';
import { formatFen } from '@/utils/money.js';

const props = defineProps({
  isOver: { type: Boolean, default: false },
});

const { state, dailyLimitFen, spentTodayFen, leftTodayFen, isOverLimit } = useUserStore();

const over = computed(() => props.isOver || isOverLimit.value);
const dailyLimitText = computed(() => formatFen(dailyLimitFen.value));
const spentText = computed(() => formatFen(spentTodayFen.value));
const leftText = computed(() => formatFen(leftTodayFen.value));

const pct = computed(() => {
  const limit = dailyLimitFen.value;
  if (!limit || limit <= 0) return 0;
  return Math.max(0, Math.min(leftTodayFen.value / limit, 1));
});
const spentPct = computed(() => {
  const limit = dailyLimitFen.value;
  if (!limit || limit <= 0) return 0;
  return Math.min(spentTodayFen.value / limit, 1);
});
const cardClass = computed(() => (over.value ? 'glass-hero-alert alert-flash' : 'glass-hero'));

const goLimitSetting = () => uni.navigateTo({ url: '/pages/limit-setting/limit-setting' });
</script>

<style scoped>
.budget-gauge-card {
  margin: 32rpx 32rpx 0;
  padding: 36rpx 28rpx 32rpx;
  position: relative;
  overflow: hidden;
}

.bg-glow {
  position: absolute;
  top: -100rpx;
  right: -100rpx;
  width: 400rpx;
  height: 400rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(79, 217, 116, 0.08), transparent 65%);
  pointer-events: none;
}
.bg-glow.over-glow {
  background: radial-gradient(circle, rgba(255, 107, 107, 0.06), transparent 65%);
}

.gauge-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 28rpx;
}
.gauge-header-icon { font-size: 28rpx; color: #25cc5d; }
.gauge-header-title { font-size: 26rpx; font-weight: 700; color: #3a5244; }

.limit-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(37, 204, 93, 0.09);
  border-radius: 20rpx;
  padding: 8rpx 20rpx;
  cursor: pointer;
}
.limit-btn-icon { font-size: 22rpx; color: #25cc5d; }
.limit-btn-text { font-size: 22rpx; color: #25cc5d; font-weight: 600; }
.limit-btn-arrow { font-size: 28rpx; color: #89e59c; }

.over-badge {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: rgba(255, 107, 107, 0.12);
  border-radius: 20rpx;
  padding: 8rpx 18rpx;
}
.over-badge-text { font-size: 22rpx; color: #ff6b6b; font-weight: 600; }

/* 罐体 + HUD */
.jar-hud-area {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  min-height: 387rpx;
  padding-left: 16rpx;
}
.jar-wrapper {
  position: relative;
  z-index: 1;
  margin-left: -48rpx;
}
.jar-limit-text {
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #9bb8a8;
  text-align: center;
  display: block;
}

.panel-float {
  position: absolute;
  right: 0;
  bottom: 72rpx;
  z-index: 10;
  width: 260rpx;
  padding: 20rpx 22rpx 16rpx;
  border-radius: 36rpx;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 2rpx solid rgba(255, 255, 255, 0.9);
  outline-offset: -1;
  animation: panel-float-kf 4.5s ease-in-out infinite;
}

/* 悬浮面板弹跳动画 */
@keyframes panel-float-kf {
  0%   { transform: rotate(2.5deg) translateY(0); }
  50%  { transform: rotate(2.5deg) translateY(-6rpx); }
  100% { transform: rotate(2.5deg) translateY(0); }
}
.hud-label {
  font-size: 20rpx;
  color: #9bb8a8;
  font-weight: 500;
  margin-bottom: 4rpx;
  display: block;
}
.hud-amount {
  font-size: 60rpx;
  font-weight: 900;
  color: #25cc5d;
  letter-spacing: -3rpx;
  line-height: 1;
}
.hud-amount.over-amount { color: #ff6b6b; }
.hud-spent {
  font-size: 21rpx;
  color: #828a99;
  font-weight: 500;
  display: block;
  margin-bottom: 16rpx;
}
.hud-bar {
  height: 10rpx;
  border-radius: 6rpx;
  background: rgba(37, 204, 93, 0.14);
  overflow: hidden;
}
.hud-bar.over-bar { background: rgba(255, 107, 107, 0.14); }
.bar-grow-inner {
  height: 100%;
  border-radius: 6rpx;
  transition: width 0.8s cubic-bezier(0.34, 1.2, 0.64, 1);
}

</style>
