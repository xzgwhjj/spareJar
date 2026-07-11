<template>
  <view class="tab-bar" :data-cmp="'TabBar'">
    <view class="tab-pill">
      <view
        v-for="(tab, index) in tabs"
        :key="index"
        @click="switchTab(index)"
        class="tab-item"
        :class="{ 'tab-center': tab.center }"
      >
        <!-- 中间浮动"记一笔"按钮 -->
        <template v-if="tab.center">
          <view class="center-btn">
            <image :src="tab.icon" class="tab-icon" mode="aspectFit" />
          </view>
          <view class="center-placeholder">
            <text class="placeholder-text">{{ tab.label }}</text>
          </view>
        </template>
        <!-- 普通 Tab 图标 -->
        <template v-else>
          <view
            class="tab-icon-bg tab-active"
          >
            <!-- 图标 -->
            <image v-if="current !== index" :src="tab.icon" class="tab-icon" mode="heightFix" />
            <image v-else :src="tab.activeIcon" class="tab-icon" mode="heightFix" />
          </view>
          <text
            class="tab-label"
            :class="{ 'label-active': current === index }"
          >{{ tab.label }}</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

defineOptions({
  virtualHost: true,
  styleIsolation: 'shared',
});

const props = defineProps({
  current: {
    type: Number,
    default: 0
  }
})

const isVisible = ref(true)

// 监听隐藏 tabbar 事件
const onHideTabbar = () => {
  isVisible.value = false
}

// 监听显示 tabbar 事件
const onShowTabbar = () => {
  isVisible.value = true
}

onMounted(() => {
  uni.$on('hide-tabbar', onHideTabbar)
  uni.$on('show-tabbar', onShowTabbar)
})

onUnmounted(() => {
  uni.$off('hide-tabbar', onHideTabbar)
  uni.$off('show-tabbar', onShowTabbar)
})

const tabs = [
  {
    key: 'home',
    label: '首页',
	  path: '/pages/index/index',
    center: false,
    icon: '/static/images/icon_index.png',
    activeIcon: '/static/images/icon_index_active.png',
  },
  {
    key: 'book',
    label: '账本',
	  path: '/pages/ledger/ledger',
    center: false,
    icon: '/static/images/icon_book.png',
    activeIcon: '/static/images/icon_book_active.png',
  },
  {
    key: 'record',
    label: '记一笔',
    center: true,
	  path: '/pages/add-record/add-record',
    icon: '/static/images/icon_record.png',
    activeIcon: '/static/images/icon_record.png',
  },
  {
    key: 'challenge',
    label: '挑战',
    center: false,
	  path: '/pages/challenge/challenge',
    icon: '/static/images/icon_challenge.png',
    activeIcon: '/static/images/icon_challenge_active.png',
  },
  {
    key: 'wish',
    label: '心愿',
    center: false,
	  path: '/pages/wish/wish',
    icon: '/static/images/icon_wish.png',
    activeIcon: '/static/images/icon_wish_active.png',
  },
];

const switchTab = (index) => {
  const tab = tabs[index];
  if (!tab?.path) return;
  uni.switchTab({ url: tab.path });
};
</script>

<style lang="scss" scoped>
.tab-bar {
  position: fixed;
  bottom: env(safe-area-inset-bottom);
  left: 0;
  right: 0;
  width: 100%;
  padding: 20rpx 44rpx 0;
  box-sizing: border-box;
  z-index: 100;
  pointer-events: none;

  .tab-pill {
    pointer-events: auto;
    height: 72rpx;
    width: 100%;
    max-width: 662rpx;
    margin: 0 auto;
    border-radius: 36rpx;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(28px) saturate(1.6);
    -webkit-backdrop-filter: blur(28px) saturate(1.6);
    border: 2rpx solid rgba(255, 255, 255, 0.97);
    box-shadow:
      0 12rpx 56rpx rgba($sj-brand, 0.12),
      0 4rpx 20rpx rgba(0, 0, 0, 0.07),
      inset 0 3rpx 0 rgba(255, 255, 255, 0.95);
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
    width: 88rpx;
    height: 72rpx;
    flex-shrink: 0;
    overflow: visible;

    &.tab-center {
      width: 88rpx;
      flex-shrink: 0;
    }
  }

  .center-btn {
    width: 92rpx;
    height: 92rpx;
    border-radius: 50%;
    background: #ffffff;
    border: 5rpx solid rgba(255, 255, 255, 0.95);
    box-shadow:
      0 8rpx 40rpx rgba($sj-brand, 0.4),
      0 2rpx 12rpx rgba(0, 0, 0, 0.08),
      inset 0 3rpx 0 rgba(255, 255, 255, 0.3);
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
    padding-bottom: 8rpx;
  }

  .placeholder-text {
    font-size: 18rpx;
    @include sj-text-hint;
    font-weight: 500;
    opacity: 0;
  }

  .tab-icon-bg {
    width: 122rpx;
    height: 100rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 8rpx;
    transition:
      top 0.28s cubic-bezier(0.34, 1.5, 0.64, 1),
      background 0.22s ease,
      box-shadow 0.22s ease,
      border 0.22s ease;

    &.tab-active {
      top: -50rpx;
      // background: linear-gradient(145deg, rgba(255, 255, 255, 0.97), rgba($sj-g1, 0.93));
      // backdrop-filter: blur(12px) saturate(1.4);
      // -webkit-backdrop-filter: blur(12px) saturate(1.4);
      // box-shadow:
      //   0 8rpx 32rpx rgba($sj-brand, 0.3),
      //   0 2rpx 8rpx rgba(0, 0, 0, 0.07),
      //   inset 0 2rpx 0 rgba(255, 255, 255, 0.95);
      // border: 3rpx solid rgba($sj-g4, 0.45);
    }

    .tab-icon {
      width: auto;
      height: 100rpx;
    }
  }

  .tab-label {
    font-size: 18rpx;
    font-weight: 400;
    color: #b0c8bc;
    position: absolute;
    bottom: 8rpx;
    transition: color 0.2s ease, opacity 0.2s ease;

    &.label-active {
      font-weight: 700;
      @include sj-brand-text;
    }
  }
}
</style>
