<template>
  <view class="login-page" data-cmp="LoginPage">
    <view class="aurora-bg-wrap">
      <view class="aurora-bg-base" />
      <view class="aurora-top-halo" />
      <view class="blob-top-l" />
      <view class="blob-top-r" />
    </view>

    <view class="login-nav">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">←</text>
      </view>
    </view>

    <view class="login-content card-in-1">
      <view class="logo-wrap">
        <text class="logo-emoji">🏺</text>
      </view>
      <text class="login-title">登录余钱罐</text>
      <text class="login-sub">登录后同步记账、限额与心愿数据</text>

      <view class="guest-tip glass-thin">
        <text class="guest-tip-text">当前为游客模式，数据仅保存在本地预览</text>
      </view>

      <view
        class="login-btn"
        :class="{ loading: loading }"
        @click="handleLogin"
      >
        <text v-if="loading" class="spin-anim login-btn-icon">⟳</text>
        <text v-else class="login-btn-icon">💬</text>
        <text class="login-btn-text">{{ loading ? '登录中…' : '微信一键登录' }}</text>
      </view>

      <text class="login-hint">使用微信 openid 登录，无需手机号</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { loginAndBootstrap, isUserStoreError } from '@/stores/user.js';

const loading = ref(false);

async function handleLogin() {
  if (loading.value) return;
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

<style scoped>
.login-page {
  width: 375px;
  min-height: 812px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
  background: #f2fcf2;
}

.login-nav {
  position: relative;
  z-index: 10;
  padding: 52px 18px 0;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(37, 204, 93, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 16px;
  color: #3a5244;
}

.login-content {
  position: relative;
  z-index: 2;
  margin: 48px 24px 0;
  padding: 32px 24px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-wrap {
  width: 88px;
  height: 88px;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(194, 242, 200, 0.6), rgba(137, 229, 156, 0.45));
  border: 1.5px solid rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(37, 204, 93, 0.12);
}

.logo-emoji {
  font-size: 42px;
}

.login-title {
  margin-top: 20px;
  font-size: 22px;
  font-weight: 800;
  color: #0f1c14;
}

.login-sub {
  margin-top: 8px;
  font-size: 13px;
  color: #6b8c7a;
  text-align: center;
}

.guest-tip {
  width: 100%;
  margin-top: 24px;
  padding: 12px 14px;
}

.guest-tip-text {
  font-size: 12px;
  color: #6b8c7a;
  line-height: 1.5;
  text-align: center;
  display: block;
}

.login-btn {
  width: 100%;
  margin-top: 28px;
  height: 48px;
  border-radius: 24px;
  background: linear-gradient(135deg, #4fd974, #25cc5d);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 8px 24px rgba(37, 204, 93, 0.28);
}

.login-btn.loading {
  opacity: 0.85;
}

.login-btn-icon {
  font-size: 16px;
  color: #fff;
}

.login-btn-text {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}

.login-hint {
  margin-top: 16px;
  font-size: 11px;
  color: #9bb8a8;
}
</style>
