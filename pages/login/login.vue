<template>
  <view class="login-root">
    <PrivacyPopup />
    <view class="login-page" data-cmp="LoginPage">
    <view class="aurora-bg-wrap">
      <view class="aurora-bg-base" />
      <view class="aurora-top-halo" />
      <view class="blob-top-l" />
      <view class="blob-top-r" />
    </view>

    <view class="login-nav" :style="{ paddingTop: navTop }">
      <view class="back-btn" @click="goBack">
        <!-- 待：替换返回图标 -->
        <text class="back-icon">←</text>
      </view>
    </view>
    <view class="login-content card-in-1">
      <view class="logo-wrap">
        <image src="/static/images/icon_logo.png" class="logo" mode="aspectFit"></image>
        <view class="logo-bg"></view>
      </view>
    </view>
    <text class="login-sub">登录后同步记账、限额与心愿数据</text>

    <view class="login-btn" :class="{ loading: loading }" @tap="handleLogin">
      <!-- 待：根据是否登录显示不同图标-小狗等待的图标 -->
      <text v-if="loading" class="spin-anim login-btn-icon">⟳</text>
      <!-- 待：根据是否登录显示不同图标-小狗抱着手机的图标 -->
      <text v-else class="login-btn-icon">💬</text>
      <text class="login-btn-text">{{ loading ? '登录中…' : '一键登录' }}</text>
    </view>

    <!-- 隐私协议勾选 -->
    <view class="privacy-check-row" @click="togglePrivacyCheck">
      <image
        class="privacy-check-icon"
        :src="agreedPrivacy ? '/static/images/icon_coin.png' : '/static/images/icon_coin_none.png'"
        mode="aspectFit"
      />
      <text class="privacy-check-text">
        我已阅读并同意
        <text class="privacy-link" @click.stop="openPrivacyDetail">{{ privacyState.contractName }}</text>
      </text>
    </view>
  </view>
  </view>
</template>

<script setup>
import PrivacyPopup from '@/components/PrivacyPopup.vue';
import { ref } from 'vue';
import { loginAndBootstrap, isUserStoreError } from '@/stores/user.js';
import { usePrivacy } from '@/stores/privacy.js';

const { state: privacyState } = usePrivacy();
const loading = ref(false);
const agreedPrivacy = ref(false);

// 返回按钮与微信胶囊垂直居中对齐
function resolveNavTop() {
  try {
    const menu = uni.getMenuButtonBoundingClientRect();
    if (menu?.height > 0) {
      const backBtnRadiusPx = uni.upx2px(36); // .back-btn 高 72rpx
      return `${menu.top + menu.height / 2 - backBtnRadiusPx}px`;
    }
  } catch (_) {}
  return `${uni.upx2px(52)}px`;
}

const navTop = ref(resolveNavTop());

function togglePrivacyCheck() {
  agreedPrivacy.value = !agreedPrivacy.value;
}

function openPrivacyDetail() {
  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && wx.openPrivacyContract) {
    wx.openPrivacyContract({});
  }
  // #endif
}

function requestPrivacyConsent() {
  return new Promise((resolve) => {
    uni.showModal({
      title: '隐私协议',
      content: `请阅读并同意${privacyState.contractName}，我们将依法保护你的个人信息安全。`,
      cancelText: '暂不同意',
      confirmText: '同意',
      success: (res) => {
        if (res.confirm) {
          agreedPrivacy.value = true;
          resolve(true);
        } else {
          resolve(false);
        }
      }
    });
  });
}

async function handleLogin() {
  if (loading.value) return;

  console.log('[login] handleLogin agreedPrivacy:', agreedPrivacy.value)
  // 未勾选隐私协议时弹出确认框
  if (!agreedPrivacy.value) {
    const consented = await requestPrivacyConsent();
    console.log('[login] handleLogin consented:', consented)
    if (!consented) return;
  }

  loading.value = true;
  try {
    await loginAndBootstrap();
    uni.showToast({ title: '登录成功', icon: 'success' });
    setTimeout(() => {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        uni.navigateBack();
      } else {
        uni.switchTab({ url: '/pages/index/index' });
      }
    }, 400);
  } catch (err) {
    const message = isUserStoreError(err) ? err.message : (err?.message || '登录失败');
    uni.showToast({ title: message, icon: 'none', duration: 3000 });
  } finally {
    loading.value = false;
  }
}

function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: '/pages/index/index' });
  }
}
</script>

<style scoped lang="scss">
@mixin flex-center($dir: row) {
  display: flex;
  flex-direction: $dir;
  align-items: center;
  justify-content: center;
}

.login-page {
  --g2-rgb: 194, 242, 200;
  --g3-rgb: 137, 229, 156;

  width: 100%;
  min-height: 100vh;
  margin: 0;
  position: relative;
  overflow: hidden;
  background: var(--g0);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.aurora-bg-wrap {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.login-nav {
  position: relative;
  z-index: 10;
  width: 100%;
  padding: 52rpx 36rpx 0;
  display: flex;
  justify-content: flex-start;
}

.back-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  border: 2rpx solid rgba(var(--brand-rgb), 0.22);
  @include flex-center;
}

.back-icon {
  font-size: 32rpx;
  color: var(--ink2);
}

.login-content {
  // position: relative;
  z-index: 2;
  width: 100%;
  max-width: 750rpx;
  margin: 48rpx auto 0;
  padding: 64rpx 48rpx 56rpx;
  box-sizing: border-box;
  @include flex-center(column);
  text-align: center;
}

.logo-wrap {
  width: 400rpx;
  height: 400rpx;
  position: relative;

  .logo {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 5;
  }

  .logo-bg {
    width: 280rpx;
    height: 280rpx;
    border-radius: 50%;
    background-image: linear-gradient(to right top, #25cc5d2f, #41d169, #55d675, #66da81, #76df8d, #89e18c, #9ae38c, #aae58d, #c1e485, #d7e281, #ece07f, #ffde825d);
    position: absolute;
    top: 47%;
    left: 43%;
    transform: translate(-50%, -50%);
  }

  .logo-emoji {
    font-size: 84rpx;
  }
}

.login-title {
  margin-top: 40rpx;
  font-size: 44rpx;
  font-weight: 800;
  color: var(--ink);
}

.login-sub {
  position: relative;
  z-index: 2;
  margin-top: 16rpx;
  font-size: 26rpx;
  color: var(--ink3);
  text-align: center;
}

.guest-tip {
  width: 100%;
  margin-top: 48rpx;
  padding: 24rpx 28rpx;
}

.guest-tip-text {
  font-size: 24rpx;
  color: var(--ink3);
  line-height: 1.5;
  text-align: center;
  display: block;
}

.login-btn {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 654rpx;
  margin-top: 56rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, var(--g4), var(--g5));
  @include flex-center;
  gap: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(var(--brand-rgb), 0.28);
}

.login-btn.loading {
  opacity: 0.85;
}

.login-btn-icon {
  font-size: 32rpx;
  color: #fff;
}

.login-btn-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
}

.privacy-check-row {
  position: relative;
  z-index: 2;
  margin-top: 36rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 0 48rpx;
}

.privacy-check-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}

.privacy-check-text {
  font-size: 22rpx;
  color: var(--ink3);
  line-height: 1.5;
}

.privacy-link {
  color: var(--g5);
  font-weight: 600;
  text-decoration: underline;
}
</style>
