<template>
  <view class="topbar" data-cmp="TopBar">
    <view class="topbar-left">
      <view class="topbar-greeting">
        <text class="greeting-icon">☀️</text>
        <text class="greeting-text">早上好</text>
      </view>
      <view class="topbar-date">
        <view class="date-bar" />
        <text class="date-text">6月16日</text>
        <text class="weekday-text">周一</text>
      </view>
    </view>

    <view class="streak-badge badge-pulse">
      <text class="streak-icon">🔥</text>
      <text class="streak-num">第7天</text>
      <text class="streak-star">★</text>
    </view>

    <view class="topbar-right">
      <view class="refresh-btn" @click="$emit('refresh')">
        <text class="refresh-icon">⟳</text>
      </view>
      <view class="avatar-btn" @click="goProfile">
        <text class="avatar-icon">👤</text>
      </view>
    </view>
  </view>
</template>

<script setup>
defineEmits(['refresh']);
const goProfile = () => uni.switchTab({ url: '/pages/profile/profile' });
</script>

<style scoped>
.topbar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 52px 18px 0;
}
.topbar-left {}
.topbar-greeting {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 2px;
}
.greeting-icon { font-size: 13px; color: #25cc5d; }
.greeting-text { font-size: 12px; color: #6b8c7a; font-weight: 500; }
.topbar-date {
  display: flex;
  align-items: center;
  gap: 6px;
}
.date-bar {
  width: 3px;
  height: 16px;
  border-radius: 3px;
  background: linear-gradient(180deg, #4fd974, #25cc5d);
  flex-shrink: 0;
}
.date-text { font-size: 15px; font-weight: 700; color: #0f1c14; }
.weekday-text { font-size: 12px; color: #9bb8a8; font-weight: 400; }

.topbar-right { display: flex; align-items: center; gap: 8px; }
.refresh-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(37, 204, 93, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.refresh-icon { font-size: 14px; color: #25cc5d; }
.avatar-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
  border: 1.5px solid rgba(37, 204, 93, 0.4);
  background: linear-gradient(135deg, #89e59c, #4fd974);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(37, 204, 93, 0.2);
  cursor: pointer;
}
.avatar-icon { font-size: 12px; color: #fff; }
</style>
