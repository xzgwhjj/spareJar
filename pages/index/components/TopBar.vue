<template>
  <view class="topbar" :style="topbarStyle" data-cmp="TopBar">
    <view class="topbar-left">
      <view class="topbar-greeting">
        <!-- 待：替换成小狗版天气图，根据天气情况显示不同图标 -->
        <image
          :src="greetingIconUrl"
          class="greeting-icon"
        ></image>
        <text class="greeting-text">第{{ currentStreak }}天</text>
      </view>
      <view class="topbar-date">
        <view class="date-bar" />
        <text class="date-text">{{ dateText }}</text>
        <text class="weekday-text">{{ weekdayText }}</text>
      </view>
    </view>

    <view class="topbar-right">
      <view class="avatar-btn" :class="{ guest: isGuest }" @tap="onAvatarClick">
        <!-- 待：替换成小狗版头像图标，根据是否登录显示不同图标 -->
        <image
          :src="cdn('/app_static/images/icon_avatar.png')"
          class="avatar-icon"
          mode="aspectFit"
        >
        </image>
      </view>
    </view>
  </view>
</template>

<script setup>
import { useUserStore } from "@/stores/user.js";
import { cdn } from "@/utils/cdn.js";
import { onMounted, ref, computed } from "vue";
import { todayDateKey, parseDateKey } from "@/utils/date.js";
import { fetchWeatherIcon, randomWeatherIcon, weatherIconUrl } from "@/utils/weather.js";

defineEmits(["refresh"]);

const { isLoggedIn, isGuest, currentStreak } = useUserStore();

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const dateText = computed(() => {
  const d = parseDateKey(todayDateKey());
  return `${d.getMonth() + 1}月${d.getDate()}日`;
});
const weekdayText = computed(() => {
  const d = parseDateKey(todayDateKey());
  return WEEKDAYS[d.getDay()];
});

function resolveTopPadding() {
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect();
    if (menuButton?.bottom > 0) {
      const gap = uni.upx2px(16);
      return `${menuButton.bottom + gap}px`;
    }
  } catch (_) {}

  const { statusBarHeight = 0 } = uni.getSystemInfoSync();
  return `${statusBarHeight + uni.upx2px(88)}px`;
}

const topbarStyle = ref({ paddingTop: resolveTopPadding() });

const weatherIcon = ref("icon_sunny");
const greetingIconUrl = computed(() => weatherIconUrl(weatherIcon.value));

// 未登录/已登录通用：申请位置 → 查天气 → 设图标；拒绝授权或接口失败 → 随机图标
const WEATHER_CACHE_KEY = "sj_weather_cache";
function loadWeather() {
  const cached = uni.getStorageSync(WEATHER_CACHE_KEY);
  const now = Date.now();
  if (cached && now - cached.ts < 3600 * 1000) {
    weatherIcon.value = cached.icon;
    return;
  }
  uni.getLocation({
    type: "gcj02",
    success: async (res) => {
      try {
        const icon = await fetchWeatherIcon(res.latitude, res.longitude);
        weatherIcon.value = icon;
        uni.setStorageSync(WEATHER_CACHE_KEY, { icon, ts: Date.now() });
      } catch (_e) {
        weatherIcon.value = randomWeatherIcon();
      }
    },
    fail: () => {
      // 用户拒绝授权位置，随机显示天气图标
      weatherIcon.value = randomWeatherIcon();
    },
  });
}

onMounted(() => {
  topbarStyle.value = { paddingTop: resolveTopPadding() };
  loadWeather();
});

function onAvatarClick() {
  if (isLoggedIn.value) {
    uni.navigateTo({ url: "/pages/profile/profile" });
  } else {
    uni.navigateTo({ url: "/pages/login/login" });
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
  padding: 0 36rpx 20rpx;
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
  /* background: linear-gradient(135deg, var(--g3), var(--g4)); */
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(37, 204, 93, 0.2);
}

.avatar-icon {
  width: 50rpx;
  height: 30rpx;
}

.avatar-btn.guest {
  /* background: rgba(255, 255, 255, 0.92); */
  border-color: rgba(155, 184, 168, 0.5);
  box-shadow: none;
}

.avatar-btn.guest .avatar-icon {
  color: var(--ink4);
}
</style>
