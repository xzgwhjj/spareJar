<template>
  <view v-if="state.show" class="privacy-overlay" @click.stop>
    <!-- 待：画一个插画，小狗双手扶着卡牌，形成一种小狗向下看卡片内容的效果 -->
    <view class="privacy-card">
      <!-- 标题 -->
      <view class="privacy-header">
        <text class="privacy-title">隐私保护指引</text>
      </view>

      <!-- 说明文案 -->
      <view class="privacy-body">
        <text class="privacy-text">
          在使用余钱罐小程序前，请你仔细阅读并同意
          <text class="privacy-link">{{ state.contractName }}</text>
          。我们将收集你的微信 openid 用于账号标识，你的记账数据仅存储在云端个人账户中。你可在「设置」中随时注销账号并删除全部数据。
        </text>
      </view>

      <!-- 按钮区 -->
      <view class="privacy-actions">
        <view class="privacy-btn cancel" @click="disagreePrivacy">
          <text class="privacy-cancel-text">暂不同意</text>
        </view>
        <button
          id="privacy-agree-btn"
          class="privacy-btn agree"
          open-type="agreePrivacyAuthorization"
          @agreeprivacyauthorization="agreePrivacy"
        >
          同意并继续
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { usePrivacy } from '@/stores/privacy.js'
const { state, agreePrivacy, disagreePrivacy } = usePrivacy()
</script>

<style scoped lang="scss">
@mixin flex-center($dir: row) {
  display: flex;
  flex-direction: $dir;
  align-items: center;
  justify-content: center;
}

.privacy-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(8rpx);
  -webkit-backdrop-filter: blur(8rpx);
  @include flex-center;
}

.privacy-card {
  width: 630rpx;
  max-width: 90vw;
  padding: 48rpx 40rpx 36rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(24rpx);
  -webkit-backdrop-filter: blur(24rpx);
  border: 2rpx solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 16rpx 64rpx rgba(0, 0, 0, 0.12), 0 4rpx 16rpx rgba(var(--brand-rgb), 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.privacy-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 28rpx;
}

.privacy-icon {
  font-size: 36rpx;
}

.privacy-title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--ink);
}

.privacy-body {
  width: 100%;
  margin-bottom: 36rpx;
}

.privacy-text {
  font-size: 26rpx;
  color: var(--ink3);
  line-height: 1.7;
  text-align: center;
  display: block;
}

.privacy-link {
  color: var(--g5);
  font-weight: 600;
  text-decoration: underline;
}

.privacy-actions {
  width: 100%;
  display: flex;
  gap: 20rpx;
}

.privacy-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  @include flex-center;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1;
}

.privacy-btn.cancel {
  background: rgba(var(--g2-rgb), 0.35);
  border: 2rpx solid rgba(var(--g2-rgb), 0.45);
  --g2-rgb: 194, 242, 200;
}

.privacy-cancel-text {
  color: var(--ink3);
  font-size: 26rpx;
  font-weight: 600;
}

.privacy-btn.agree {
  /* stylelint-disable-next-line */
  background: linear-gradient(135deg, var(--g4), var(--g5)) !important;
  color: #fff;
  border: none !important;
  box-shadow: 0 8rpx 28rpx rgba(var(--brand-rgb), 0.28);
}

/* 覆盖 uni-app button 默认样式 */
.privacy-btn.agree::after {
  border: none;
}
</style>
