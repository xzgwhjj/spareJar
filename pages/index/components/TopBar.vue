<template>
  <view class="topbar" :style="topbarStyle" data-cmp="TopBar">
    <view class="topbar-left">
      <view class="topbar-greeting">
        <!-- 待：替换成小狗版天气图，根据天气情况显示不同图标 -->
        <image src="/static/images/icon_sunny.png" class="greeting-icon"></image>
        <text class="greeting-text">第7天</text>
      </view>
      <view class="topbar-date">
        <view class="date-bar" />
        <text class="date-text">6月16日</text>
        <text class="weekday-text">周一</text>
      </view>
    </view>


    <view class="topbar-right">
      <view class="avatar-btn" :class="{ guest: isGuest }" @click="onAvatarClick">
        <!-- 待：替换成小狗版头像图标，根据是否登录显示不同图标 -->
        <text class="avatar-icon">{{ isGuest ? '👤' : '✓' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { useUserStore } from '@/stores/user.js';
import { onMounted, ref } from 'vue';

defineEmits(['refresh']);

const { isLoggedIn, isGuest } = useUserStore();

function resolveTopPadding() {
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect();
    if (menuButton?.bottom > 0) {
      const gap = uni.upx2px(16);
      return `${menuButton.bottom + gap}px`;
    }
  } catch (_) { }

  const { statusBarHeight = 0 } = uni.getSystemInfoSync();
  return `${statusBarHeight + uni.upx2px(88)}px`;
}

const topbarStyle = ref({ paddingTop: resolveTopPadding() });

onMounted(() => {
  topbarStyle.value = { paddingTop: resolveTopPadding() };
});

function onAvatarClick() {
  if (isLoggedIn.value) {
    uni.switchTab({ url: '/pages/profile/profile' });
  } else {
    uni.navigateTo({ url: '/pages/login/login' });
  }
}
</script>

<style scoped>
.topbar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 36rpx 0;
}

.topbar-left {
  min-width: 0;
}

.topbar-greeting {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 4rpx;
}

.greeting-icon {
  width: 26rpx;
  height: 26rpx;
}

.greeting-text {
  font-size: 24rpx;
  color: var(--ink3);
  font-weight: 500;
}

.topbar-date {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.date-bar {
  width: 6rpx;
  height: 32rpx;
  border-radius: 6rpx;
  background: linear-gradient(180deg, var(--g4), var(--g5));
  flex-shrink: 0;
}

.date-text {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--ink);
}

.weekday-text {
  font-size: 24rpx;
  color: var(--ink4);
  font-weight: 400;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.refresh-btn {
  width: 60rpx;
  height: 60rpx;
}

.refresh-icon {
  font-size: 28rpx;
  color: var(--g5);
}

.avatar-btn {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 3rpx solid rgba(37, 204, 93, 0.4);
  background: linear-gradient(135deg, var(--g3), var(--g4));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(37, 204, 93, 0.2);
}

.avatar-icon {
  font-size: 24rpx;
  color: #fff;
}

.avatar-btn.guest {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(155, 184, 168, 0.5);
  box-shadow: none;
}

.avatar-btn.guest .avatar-icon {
  color: var(--ink4);
}
</style>
