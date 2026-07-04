<template>
  <view class="budget-gauge-card card-in-1" :class="cardClass" data-cmp="BudgetGaugeCard">
    <!-- 背景光晕 -->
    <view class="bg-glow" :class="{ 'over-glow': isOver }" />

    <!-- 标题行 -->
    <view class="gauge-header">
      <text class="gauge-header-icon">💰</text>
      <text class="gauge-header-title">今日余钱罐</text>
      <view class="limit-btn" @click="goLimitSetting">
        <text class="limit-btn-icon">🎯</text>
        <text class="limit-btn-text">限额 ¥{{ DAILY_LIMIT }}</text>
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
        <SavingsJar :pct="pct" :is-over="isOver" />
        <text class="jar-limit-text">满额 ¥{{ DAILY_LIMIT }}</text>
      </view>

      <!-- 悬浮面板 -->
      <view class="panel-float">
        <view class="hud-inner">
          <text class="hud-label">还可花</text>
          <text class="hud-amount" :class="{ 'over-amount': isOver }">¥{{ LEFT_TODAY }}</text>
          <text class="hud-spent">已用 ¥{{ SPENT_TODAY }} · 限额 ¥{{ DAILY_LIMIT }}</text>
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

    <!-- 今日消费 chips -->
    <view class="stats-panel">
      <text class="stats-title">今日消费</text>
      <view class="stats-chips">
        <view v-for="b in BILLS" :key="b.id" class="stat-chip" :style="{ background: b.bg }">
          <text>{{ b.icon }}</text>
          <text>¥{{ Math.abs(b.amount) }}</text>
        </view>
      </view>
      <text class="stats-total">
        共 <text class="strong">{{ BILLS.length }}</text> 笔 · 合计
        <text class="strong" :class="{ 'over-total': isOver }">¥{{ TOTAL_BILLS }}</text>
      </text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import SavingsJar from './SavingsJar.vue';

defineProps({
  isOver: { type: Boolean, default: false },
});

const DAILY_LIMIT = 200;
const SPENT_TODAY = 81;
const LEFT_TODAY = DAILY_LIMIT - SPENT_TODAY;
const BILLS = [
  { id: 'b1', icon: '🍜', bg: '#FFF3E0', name: '午饭拉面', cat: '餐饮', time: '12:30', amount: -28 },
  { id: 'b2', icon: '🚇', bg: '#E3F2FD', name: '地铁通勤', cat: '交通', time: '08:15', amount: -6 },
  { id: 'b3', icon: '☕', bg: '#FBE9E7', name: '拿铁咖啡', cat: '饮品', time: '09:40', amount: -32 },
  { id: 'b4', icon: '🛒', bg: '#F3E5F5', name: '便利店', cat: '日用', time: '19:00', amount: -15 },
];
const TOTAL_BILLS = BILLS.reduce((s, b) => s + Math.abs(b.amount), 0);

const pct = computed(() => Math.max(0, Math.min(LEFT_TODAY / DAILY_LIMIT, 1)));
const spentPct = computed(() => SPENT_TODAY / DAILY_LIMIT);
const cardClass = computed(() => (LEFT_TODAY < 0 ? 'glass-hero-alert alert-flash' : 'glass-hero'));

const goLimitSetting = () => uni.navigateTo({ url: '/pages/limit-setting/limit-setting' });
</script>

<style scoped>
.budget-gauge-card {
  margin: 16px 16px 0;
  padding: 18px 14px 16px 14px;
  position: relative;
  overflow: hidden;
}

.bg-glow {
  position: absolute;
  top: -50px;
  right: -50px;
  width: 200px;
  height: 200px;
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
  gap: 6px;
  margin-bottom: 14px;
}
.gauge-header-icon { font-size: 14px; color: #25cc5d; }
.gauge-header-title { font-size: 13px; font-weight: 700; color: #3a5244; }

.limit-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(37, 204, 93, 0.09);
  border-radius: 10px;
  padding: 4px 10px;
  cursor: pointer;
}
.limit-btn-icon { font-size: 11px; color: #25cc5d; }
.limit-btn-text { font-size: 11px; color: #25cc5d; font-weight: 600; }
.limit-btn-arrow { font-size: 14px; color: #89e59c; }

.over-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(255, 107, 107, 0.12);
  border-radius: 10px;
  padding: 4px 9px;
}
.over-badge-text { font-size: 11px; color: #ff6b6b; font-weight: 600; }

/* 罐体 + HUD */
.jar-hud-area {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  min-height: 290px;
}
.jar-wrapper {
  position: relative;
  z-index: 1;
}
.jar-limit-text {
  margin-top: 2px;
  font-size: 10px;
  color: #9bb8a8;
  text-align: center;
  display: block;
}

.panel-float {
  position: absolute;
  right: 0;
  bottom: 36px;
  z-index: 10;
  width: 148px;
  padding: 12px 14px 10px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 28px rgba(37, 204, 93, 0.14), 0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1.5px 0 rgba(255, 255, 255, 0.98);
}
.hud-label { font-size: 10px; color: #9bb8a8; font-weight: 500; margin-bottom: 2px; display: block; }
.hud-amount {
  font-size: 30px;
  font-weight: 900;
  color: #25cc5d;
  letter-spacing: -1.5;
  line-height: 1;
}
.hud-amount.over-amount { color: #ff6b6b; }
.hud-spent { font-size: 10.5px; color: #828a99; font-weight: 500; display: block; margin-bottom: 8px; }
.hud-bar {
  height: 5px;
  border-radius: 3px;
  background: rgba(37, 204, 93, 0.14);
  overflow: hidden;
}
.hud-bar.over-bar { background: rgba(255, 107, 107, 0.14); }
.bar-grow-inner {
  height: 100%;
  border-radius: 3px;
  transition: width 0.8s cubic-bezier(0.34, 1.2, 0.64, 1);
}

/* 今日消费 */
.stats-panel {
  margin-top: 12px;
}
.stats-title { font-size: 11px; color: #9bb8a8; font-weight: 600; display: block; margin-bottom: 8px; }
.stats-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.stat-chip {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: #3a5244;
}
.stats-total { margin-top: 8px; margin-bottom: 4px; font-size: 11px; color: #9bb8a8; display: block; }
.stats-total .strong { font-weight: 700; color: #3a5244; }
.stats-total .over-total { color: #ff6b6b; }
</style>
