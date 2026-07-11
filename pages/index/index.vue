<template>
  <view class="index-root">
  <view class="index-page" data-cmp="Index">
    <!-- 极光背景 -->
    <view class="aurora-bg-wrap">
      <view class="aurora-bg-base" />
      <view class="aurora-top-halo" />
      <view class="aurora-band-1" />
      <view class="aurora-band-2" />
      <view class="blob-top-l" />
      <view class="blob-top-r" />
      <view class="blob-mid" />
      <view class="blob-bot" />
    </view>

    <!-- 刷新指示器 -->
    <view class="refresh-indicator" :class="{ visible: refreshing }">
      <view class="refresh-pill">
        <text class="spin-anim" style="color:#25cc5d;font-size:26rpx;">⟳</text>
        <text class="refresh-text">正在刷新…</text>
      </view>
    </view>

    <!-- 可滚动内容区 -->
    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="height:812px;">
      <!-- 顶部栏 -->
      <TopBar @refresh="handleRefresh" />

      <!-- 预算仪表盘 -->
      <BudgetGaugeCard :is-over="IS_OVER" />

      <!-- 盈余横幅 -->
      <SurplusBanner />

      <!-- 存款池 -->
      <view class="savings-pool-band card-in-1" style="margin:10px 16px 0;">
        <view class="glass-mid" style="padding:14px 16px;display:flex;align-items:center;gap:12px;">
          <view class="pool-icon-box">
            <text style="font-size:36rpx;">🐷</text>
          </view>
          <view style="flex:1;">
            <text class="pool-label">存款池余额</text>
            <text class="pool-amount">¥{{ SAVINGS_POOL.toLocaleString() }}</text>
          </view>
          <view class="pool-trend" @click="goSurplusHistory">
            <text class="trend-text">查看明细</text>
            <text class="trend-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 鼓励横幅 -->
      <view class="card-in-1" style="margin:10px 16px 0;">
        <view class="glass-thin" style="padding:16px 18px;">
          <view style="display:flex;align-items:center;gap:8px;">
            <text style="font-size:26rpx;">🔥</text>
            <view>
              <text class="encourage-title">连续记账 {{ STREAK }} 天</text>
              <text class="encourage-sub">再坚持 3 天解锁一周成就！</text>
            </view>
            <view class="streak-badge">
              <text style="font-size:20rpx;color:#25cc5d;font-weight:700;">{{ STREAK }}d</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 健康双轨 -->
      <HealthDualTrack />

      <!-- 账单列表 -->
      <BillList />

      <view style="height:24px;" />
    </scroll-view>
  </view>

  <TabBar :current="0" />
  </view>
</template>

<script setup>
import { ref } from 'vue';
import TabBar from '@/components/tabbar/tabbar.vue';
import TopBar from './components/TopBar.vue';
import BudgetGaugeCard from './components/BudgetGaugeCard.vue';
import SurplusBanner from './components/SurplusBanner.vue';
import HealthDualTrack from './components/HealthDualTrack.vue';
import BillList from './components/BillList.vue';

/* Mock 数据 */
const DAILY_LIMIT = 200;
const SPENT_TODAY = 81;
const LEFT_TODAY = DAILY_LIMIT - SPENT_TODAY;
const YESTERDAY_SURPLUS = 32;
const SAVINGS_POOL = 1248;
const IS_OVER = false;
const STREAK = 7;

const refreshing = ref(false);
const handleRefresh = () => {
  refreshing.value = true;
  setTimeout(() => (refreshing.value = false), 1200);
};

const goSurplusHistory = () => {
  uni.navigateTo({ url: '/pages/surplus-history/surplus-history' });
};
</script>

<style scoped>
.index-root {
  position: relative;
  min-height: 100vh;
}

.index-page {
  max-width: 375px;
  min-height: 812px;
  margin: 0 auto;
  overflow: hidden;
  position: relative;
  background: #f2fcf2;
  font-family: 'Inter', -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif;
}

/* 刷新指示器 */
.refresh-indicator {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  opacity: 0;
  transition: opacity 0.25s;
  pointer-events: none;
}
.refresh-indicator.visible { opacity: 1; }
.refresh-pill {
  background: rgba(255, 255, 255, 0.94);
  border-radius: 20px;
  padding: 6px 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 16px rgba(37, 204, 93, 0.14);
}
.refresh-text { font-size: 11px; color: #3a5244; }

/* 存款池 */
.pool-icon-box {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(194, 242, 200, 0.5), rgba(137, 229, 156, 0.4));
  border: 1px solid rgba(137, 229, 156, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pool-label { font-size: 10px; color: #9bb8a8; display: block; margin-bottom: 3px; }
.pool-amount { font-size: 22px; font-weight: 900; color: #0f1c14; letter-spacing: -0.8; line-height: 1; }
.pool-trend {
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
}
.trend-text { font-size: 10px; color: #9bb8a8; }
.trend-arrow { font-size: 14px; color: #9bb8a8; }

/* 鼓励横幅 */
.encourage-title { font-size: 14px; font-weight: 700; color: #0f1c14; display: block; }
.encourage-sub { font-size: 11px; color: #6b8c7a; display: block; margin-top: 2px; }
.streak-badge {
  margin-left: auto;
  background: rgba(37, 204, 93, 0.1);
  border-radius: 12px;
  padding: 4px 12px;
}
</style>
