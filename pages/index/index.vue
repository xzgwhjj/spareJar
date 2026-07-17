<template>
  <view class="index-root">
    <!-- 微信隐私协议弹窗（全局覆盖） -->
    <PrivacyPopup />
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
          <text class="spin-anim">⟳</text>
          <text class="refresh-text">正在刷新…</text>
        </view>
      </view>

      <!-- 可滚动内容区 -->
      <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false">
        <!-- 顶部栏 -->
        <TopBar @refresh="handleRefresh" />

        <!-- 预算仪表盘 -->
        <BudgetGaugeCard :is-over="IS_OVER" />

        <!-- 盈余横幅 -->
        <SurplusBanner />

        <!-- 存款池 -->
        <view class="savings-pool-band card-in-1">
          <view class="pool-inner"></view>
          <view class="glass-mid pool-row">
            <view class="pool-icon-box">
              <!-- 待：根据余钱罐和小狗的图，设计一个简版的图标 -->
              <text style="font-size:36rpx;">🐷</text>
            </view>
            <view class="pool-info">
              <text class="pool-label">存款池余额</text>
              <text class="pool-amount">¥{{ SAVINGS_POOL.toLocaleString() }}</text>
            </view>
            <view class="pool-trend-box">
              <view class="pool-trend-item">
                <text class="trend-icon">📈</text>
                <text class="trend-text">本月 +¥320</text>
              </view>
              <view class="pool-trend" @click="goSurplusHistory">
                <text class="trend-text">查看明细</text>
                <text class="trend-arrow">›</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 健康双轨 -->
        <HealthDualTrack />

        <!-- 账单列表 -->
        <BillList />

        <view class="page-bottom-gap" />
      </scroll-view>
    </view>

    <TabBar :current="0" />
  </view>
</template>

<script setup>
import TabBar from '@/components/tabbar/tabbar.vue';
import PrivacyPopup from '@/components/PrivacyPopup.vue';
import { ref } from 'vue';
import BillList from './components/BillList.vue';
import BudgetGaugeCard from './components/BudgetGaugeCard.vue';
import HealthDualTrack from './components/HealthDualTrack.vue';
import SurplusBanner from './components/SurplusBanner.vue';
import TopBar from './components/TopBar.vue';

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

<style scoped lang="scss">
.index-root {
  position: relative;
  min-height: 100vh;

  .index-page {
    /* 通过 CSS 自定义属性统一管理间距 / 圆角 / 字体，运行时可被外层主题覆盖 */
    --page-margin: 32rpx;
    --band-gap: 30rpx;
    --radius-pill: 40rpx;
    --radius-badge: 24rpx;
    --radius-icon: 28rpx;
    --font-family: 'Inter', -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif;
    /* 渐变所需通道值（与主题 --g2/--g3 同源） */
    --g2-rgb: 194, 242, 200;
    --g3-rgb: 137, 229, 156;

    max-width: 750rpx;
    min-height: 1624rpx;
    margin: 0 auto;
    overflow: hidden;
    position: relative;
    background: var(--g0);
    font-family: var(--font-family);

    .page-scroll {
      height: 1624rpx;
    }

    /* 刷新指示器 */
    .refresh-indicator {
      position: absolute;
      top: 32rpx;
      left: 50%;
      transform: translateX(-50%);
      z-index: 200;
      opacity: 0;
      transition: opacity 0.25s;
      pointer-events: none;

      &.visible {
        opacity: 1;
      }

      .refresh-pill {
        background: rgba(255, 255, 255, 0.94);
        border-radius: var(--radius-pill);
        padding: 12rpx 28rpx;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 12rpx;
        box-shadow: 0 8rpx 32rpx rgba(var(--brand-rgb), 0.14);

        .spin-anim {
          color: var(--g5);
          font-size: 26rpx;
        }
      }

      .refresh-text {
        font-size: 22rpx;
        color: var(--ink2);
      }
    }

    /* 存款池 */
    .savings-pool-band {
      margin: var(--band-gap) var(--page-margin) 0;
      background: rgba(255, 255, 255, 0.65);
      backdrop-filter: blur(32rpx) saturate(1.3);
      -webkit-backdrop-filter: blur(32rpx) saturate(1.3);
      border: 1px solid rgba(255, 255, 255, 0.84);
      border-radius: 36rpx;
      box-shadow: 0 4rpx 24rpx rgba(37, 204, 93, 0.06), inset 0 2rpx 0 rgba(255, 255, 255, 0.90);
      position: relative;

      .pool-inner{
        width: 40rpx;
        height: 40rpx;
        border-radius: 14rpx 0 0 0;
        border-top: 5rpx solid var(--g5);
        border-left: 5rpx solid var(--g5);
        position: absolute;
        top: 5rpx;
        left: 5rpx;
        z-index: 10;
      }

      .pool-row {
        padding: 28rpx 32rpx;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 24rpx;
      }
    }

    .pool-icon-box {
      width: 80rpx;
      height: 80rpx;
      border-radius: var(--radius-icon);
      background: linear-gradient(135deg, rgba(var(--g2-rgb), 0.5), rgba(var(--g3-rgb), 0.4));
      border: 2rpx solid rgba(var(--g3-rgb), 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .pool-info {
      flex: 1;
      min-width: 0;
    }

    .pool-label {
      font-size: 20rpx;
      color: var(--ink4);
      display: block;
      margin-bottom: 6rpx;
    }

    .pool-amount {
      font-size: 44rpx;
      font-weight: 900;
      color: var(--ink);
      letter-spacing: -1.6rpx;
      line-height: 1;
    }

    .pool-trend-box {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8rpx;

      .pool-trend-item {
        display: flex;
        align-items: center;
        gap: 6rpx;

        .trend-icon {
          font-size: 22rpx;
        }

        .trend-text {
          font-size: 20rpx;
          font-weight: 500;
          color: var(--g4);
        }
      }

      .pool-trend {
        display: flex;
        align-items: center;
        gap: 6rpx;
        cursor: pointer;

        .trend-text {
          font-size: 20rpx;
          color: var(--ink4);
        }

        .trend-arrow {
          font-size: 28rpx;
          color: var(--ink4);
        }
      }
    }





    /* 鼓励横幅 */
    .encourage-band {
      margin: var(--band-gap) var(--page-margin) 0;

      .encourage-inner {
        padding: 32rpx 36rpx;
      }

      .encourage-row {
        display: flex;
        align-items: center;
        gap: 16rpx;
      }
    }

    .encourage-title {
      font-size: 28rpx;
      font-weight: 700;
      color: var(--ink);
      display: block;
    }

    .encourage-sub {
      font-size: 22rpx;
      color: var(--ink3);
      display: block;
      margin-top: 4rpx;
    }

    .streak-badge {
      margin-left: auto;
      background: rgba(var(--brand-rgb), 0.1);
      border-radius: var(--radius-badge);
      padding: 8rpx 24rpx;

      text {
        font-size: 20rpx;
        color: var(--g5);
        font-weight: 700;
      }
    }

    .page-bottom-gap {
      height: 48rpx;
    }
  }
}
</style>
