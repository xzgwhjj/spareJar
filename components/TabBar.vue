<template>
  <view class="tab-bar" :data-cmp="'TabBar'">
    <view class="tab-pill">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        @click="tab.onClick"
        class="tab-item"
        :class="{ 'tab-center': tab.center }"
      >
        <!-- 中间浮动"记一笔"按钮 -->
        <template v-if="tab.center">
          <view class="center-btn">
            <text class="center-icon">+</text>
          </view>
          <view class="center-placeholder">
            <text class="placeholder-text">{{ tab.label }}</text>
          </view>
        </template>
        <!-- 普通 Tab 图标 -->
        <template v-else>
          <view
            class="tab-icon-bg"
            :class="{ 'tab-active': tab.key === activeKey }"
          >
            <HomeTabIcon v-if="tab.key === 'home'" :active="tab.key === activeKey" />
            <BookTabIcon v-if="tab.key === 'book'" :active="tab.key === activeKey" />
            <ChallengeTabIcon v-if="tab.key === 'challenge'" :active="tab.key === activeKey" />
            <WishTabIcon v-if="tab.key === 'wish'" :active="tab.key === activeKey" />
          </view>
          <text
            class="tab-label"
            :class="{ 'label-active': tab.key === activeKey }"
          >{{ tab.label }}</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import HomeTabIcon from './TabIcons/HomeTabIcon.vue';
import BookTabIcon from './TabIcons/BookTabIcon.vue';
import ChallengeTabIcon from './TabIcons/ChallengeTabIcon.vue';
import WishTabIcon from './TabIcons/WishTabIcon.vue';

const activeKey = ref('home');

const tabs = [
  {
    key: 'home',
    label: '首页',
    center: false,
    onClick: () => {
      activeKey.value = 'home';
      uni.switchTab({ url: '/pages/index/index' });
    },
  },
  {
    key: 'book',
    label: '账本',
    center: false,
    onClick: () => {
      activeKey.value = 'book';
      uni.switchTab({ url: '/pages/ledger/ledger' });
    },
  },
  {
    key: 'record',
    label: '记一笔',
    center: true,
    onClick: () => {
      uni.navigateTo({ url: '/pages/add-record/add-record' });
    },
  },
  {
    key: 'challenge',
    label: '挑战',
    center: false,
    onClick: () => {
      activeKey.value = 'challenge';
      uni.switchTab({ url: '/pages/challenge/challenge' });
    },
  },
  {
    key: 'wish',
    label: '心愿',
    center: false,
    onClick: () => {
      activeKey.value = 'wish';
      uni.switchTab({ url: '/pages/wish/wish' });
    },
  },
];

/* 接收当前页面标识以激活对应 Tab */
const props = defineProps({
  currentTab: {
    type: String,
    default: 'home',
  },
});

/* 根据当前页面初始化激活状态 */
if (props.currentTab && ['home', 'book', 'challenge', 'wish'].includes(props.currentTab)) {
  activeKey.value = props.currentTab;
}

const tabLabelMap = {
  '/pages/index/index': 'home',
  '/pages/ledger/ledger': 'book',
  '/pages/challenge/challenge': 'challenge',
  '/pages/wish/wish': 'wish',
};

/* 监听页面切换更新激活状态 */
// #ifdef H5
window.addEventListener('pageshow', () => {
  const routes = getCurrentPages();
  if (routes.length > 0) {
    const currentPath = '/' + routes[routes.length - 1].route;
    if (tabLabelMap[currentPath]) {
      activeKey.value = tabLabelMap[currentPath];
    }
  }
});
// #endif
</script>

<style scoped>
.tab-bar {
  position: fixed;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 375px;
  padding: 10px 22px 0;
  z-index: 100;
}

.tab-pill {
  height: 72rpx;
  border-radius: 36rpx;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(28px) saturate(1.6);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
  border: 1px solid rgba(255, 255, 255, 0.97);
  box-shadow: 0 6px 28px rgba(37, 204, 93, 0.12), 0 2px 10px rgba(0, 0, 0, 0.07), inset 0 1.5px 0 rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: space-around;
  position: relative;
  overflow: visible;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  width: 44px;
  height: 72rpx;
  flex-shrink: 0;
  overflow: visible;
}

.tab-center {
  width: 44px;
  flex-shrink: 0;
}

.center-btn {
  width: 92rpx;
  height: 92rpx;
  border-radius: 50%;
  background: linear-gradient(145deg, #4fd974, #25cc5d);
  border: 2.5px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 20px rgba(37, 204, 93, 0.4), 0 1px 6px rgba(0, 0, 0, 0.08), inset 0 1.5px 0 rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: -52rpx;
  left: 50%;
  transform: translateX(-50%);
}

.center-icon {
  font-size: 44rpx;
  color: #fff;
  font-weight: 300;
  line-height: 1;
}

.center-placeholder {
  height: 72rpx;
  display: flex;
  align-items: flex-end;
  padding-bottom: 4px;
}

.placeholder-text {
  font-size: 18rpx;
  color: #9bb8a8;
  font-weight: 500;
  opacity: 0;
}

.tab-icon-bg {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 8rpx;
  transition: top 0.28s cubic-bezier(0.34, 1.5, 0.64, 1), background 0.22s ease, box-shadow 0.22s ease, border 0.22s ease;
}

.tab-icon-bg.tab-active {
  top: -20rpx;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.97), rgba(225, 250, 230, 0.93));
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  box-shadow: 0 4px 16px rgba(37, 204, 93, 0.3), 0 1px 4px rgba(0, 0, 0, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.95);
  border: 1.5px solid rgba(79, 217, 116, 0.45);
}

.tab-label {
  font-size: 18rpx;
  font-weight: 400;
  color: #b0c8bc;
  position: absolute;
  bottom: 4px;
  opacity: 0;
  transition: color 0.2s ease, opacity 0.2s ease;
}

.tab-label.label-active {
  font-weight: 700;
  color: #25cc5d;
  opacity: 1;
}
</style>
