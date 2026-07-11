<template>
  <view class="profile-page" data-cmp="ProfilePage">
    <!-- 极光背景 -->
    <view class="aurora-bg-wrap">
      <view class="aurora-bg-base" />
      <view class="aurora-top-halo" />
      <view class="blob-top-l" />
      <view class="blob-top-r" />
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="height:calc(100% - 74px);z-index:2;">
      <!-- 头像区 -->
      <view class="profile-hero">
        <view class="avatar-ring">
          <view class="avatar-inner">
            <text class="avatar-emoji">{{ isGuest ? '👤' : '🐶' }}</text>
          </view>
        </view>
        <text class="profile-name">{{ isGuest ? '游客' : displayName }}</text>
        <text class="profile-meta">{{ isGuest ? '登录后同步你的记账数据' : profileMeta }}</text>
        <view v-if="isGuest" class="profile-login-btn" @click="goLogin">
          <text>微信登录</text>
        </view>
      </view>

      <view v-if="!isGuest">
      <view class="glass-mid" style="margin:0 16px 16px;padding:16px;">
        <view class="stats-row">
          <view v-for="s in userStats" :key="s.label" class="stat-block">
            <text class="stat-val" :style="{ color: s.color }">{{ s.value }}</text>
            <text class="stat-lbl">{{ s.label }}</text>
          </view>
        </view>
      </view>

      <!-- 设置菜单 -->
      <view class="menu-group">
        <text class="menu-title">账户与数据</text>
        <view v-for="m in menuItems" :key="m.label" class="menu-item glass-thin" style="margin:0 16px 0;border-radius:0;" @click="m.action">
          <view class="menu-left">
            <text class="menu-icon">{{ m.icon }}</text>
            <text class="menu-label">{{ m.label }}</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item glass-thin menu-item-logout" style="margin:0 16px 0;border-radius:0;" @click="handleLogout">
          <view class="menu-left">
            <text class="menu-icon">🚪</text>
            <text class="menu-label logout-label">退出登录</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <view class="menu-group" style="margin-top:16px;">
        <text class="menu-title">健康与预算</text>
        <view class="menu-item glass-thin" style="margin:0 16px 0;border-radius:0;" @click="activeSheet = 'rules'">
          <view class="menu-left"><text class="menu-icon">📋</text><text class="menu-label">预算规则</text></view>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item glass-thin" style="margin:0 16px 0;border-radius:0;" @click="goLimitSetting">
          <view class="menu-left"><text class="menu-icon">🎯</text><text class="menu-label">限额设置</text></view>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <view class="menu-group" style="margin-top:16px;">
        <text class="menu-title">更多</text>
        <view class="menu-item glass-thin" style="margin:0 16px 0;border-radius:0;" @click="activeSheet = 'about'">
          <view class="menu-left"><text class="menu-icon">ℹ️</text><text class="menu-label">关于余钱罐</text></view>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item glass-thin" style="margin:0 16px 0;border-radius:0;" @click="activeSheet = 'feedback'">
          <view class="menu-left"><text class="menu-icon">💬</text><text class="menu-label">意见反馈</text></view>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <view style="height:40px;" />
      </view>
    </scroll-view>

    <!-- 规则设置弹窗 -->
    <view v-if="activeSheet === 'rules'" class="sheet-overlay" @click="activeSheet = null">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <view class="sheet-header-row">
          <view class="close-btn" @click="activeSheet = null"><text>←</text></view>
          <view>
            <text class="sheet-title">规则设置</text>
            <text class="sheet-sub">限额、存取与惩罚规则</text>
          </view>
        </view>
        <view class="sheet-body">
          <text class="form-label">💰 每日限额</text>
          <view class="form-row">
            <view class="form-input-wrap">
              <text class="form-prefix">¥</text>
              <input class="form-input" v-model="dailyLimit" type="number" />
            </view>
            <view class="form-check-btn"><text>✓</text></view>
          </view>

          <text class="form-label" style="margin-top:16px;">📤 结余规则</text>
          <view class="seg-group">
            <view class="seg-btn" :class="{ active: surplusRule === 'pool' }" @click="surplusRule = 'pool'">存入存款池</view>
            <view class="seg-btn" :class="{ active: surplusRule === 'next' }" @click="surplusRule = 'next'">滚入次日</view>
          </view>

          <text class="form-label" style="margin-top:16px;">⚠️ 超支惩罚</text>
          <view class="seg-group">
            <view class="seg-btn" :class="{ active: penaltyRule === 'none' }" @click="penaltyRule = 'none'">无惩罚</view>
            <view class="seg-btn" :class="{ active: penaltyRule === 'reduce' }" @click="penaltyRule = 'reduce'">减少次日</view>
            <view class="seg-btn" :class="{ active: penaltyRule === 'freeze' }" @click="penaltyRule = 'freeze'">冻结一日</view>
          </view>

          <view class="save-btn" @click="activeSheet = null">
            <text>保存设置</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 关于弹窗 -->
    <view v-if="activeSheet === 'about'" class="sheet-overlay" @click="activeSheet = null">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">关于余钱罐</text>
        <view class="about-content">
          <text class="about-name">🐷 余钱罐 v1.0.0</text>
          <text class="about-desc">一款帮助你管理每日消费、养成存钱习惯的智能记账工具。</text>
          <text class="about-desc">用存钱罐的趣味方式，让财务管理不再枯燥。</text>
        </view>
        <view class="save-btn" @click="activeSheet = null"><text>知道了</text></view>
      </view>
    </view>

    <!-- 反馈弹窗 -->
    <view v-if="activeSheet === 'feedback'" class="sheet-overlay" @click="activeSheet = null">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">意见反馈</text>
        <textarea class="feedback-area" v-model="feedbackText" placeholder="请输入你的建议或遇到的问题…" />
        <view class="save-btn" @click="activeSheet = null"><text>提交反馈</text></view>
      </view>
    </view>

  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/user.js';

const { isGuest, state, currentStreak, logout } = useUserStore();

const activeSheet = ref(null);
const dailyLimit = ref('200');
const surplusRule = ref('pool');
const penaltyRule = ref('reduce');
const feedbackText = ref('');

const displayName = computed(() => {
  const user = state.user;
  if (user && user.nickname) return user.nickname;
  return '余钱罐用户';
});

const profileMeta = computed(() => {
  const streak = currentStreak.value;
  return streak > 0 ? `连续记账 ${streak} 天` : '开始你的记账之旅';
});

const userStats = [
  { label: '总记账', value: '1,248', color: '#25cc5d' },
  { label: '存款池', value: '¥3,240', color: '#3b82f6' },
  { label: '连续天数', value: '23', color: '#f59e0b' },
];

const menuItems = [
  { icon: '📊', label: '数据导出', action: () => {} },
  { icon: '🔔', label: '通知设置', action: () => {} },
  { icon: '🔒', label: '隐私与安全', action: () => {} },
  { icon: '🗑️', label: '清理数据', action: () => {} },
];

const goLimitSetting = () => {
  if (isGuest.value) {
    goLogin();
    return;
  }
  uni.navigateTo({ url: '/pages/limit-setting/limit-setting' });
};

const goLogin = () => uni.navigateTo({ url: '/pages/login/login' });

function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '退出后将回到游客模式，本地登录信息会被清除，下次启动不会自动登录。',
    confirmText: '退出',
    confirmColor: '#ff6b6b',
    success(res) {
      if (!res.confirm) return;
      logout();
      uni.showToast({ title: '已退出登录', icon: 'none' });
    },
  });
}
</script>

<style scoped>
.profile-page { width: 375px; height: 812px; overflow: hidden; position: relative; margin: 0 auto; background: #f2fcf2; }
.profile-hero { display: flex; flex-direction: column; align-items: center; padding: 60px 0 20px; }
.avatar-ring { width: 80px; height: 80px; border-radius: 50%; padding: 3px; background: linear-gradient(135deg,#89e59c,#25cc5d,#4fd974); }
.avatar-inner { width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(135deg,#e1fae3,#fff); display: flex; align-items: center; justify-content: center; }
.avatar-emoji { font-size: 36px; }
.profile-name { font-size: 18px; font-weight: 800; color: #0f1c14; margin-top: 12px; }
.profile-meta { font-size: 12px; color: #9bb8a8; margin-top: 4px; }
.profile-login-btn {
  margin-top: 16px;
  padding: 10px 28px;
  border-radius: 20px;
  background: linear-gradient(135deg, #4fd974, #25cc5d);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.stats-row { display: flex; }
.stat-block { flex: 1; text-align: center; }
.stat-val { font-size: 18px; font-weight: 800; display: block; }
.stat-lbl { font-size: 10px; color: #9bb8a8; margin-top: 2px; display: block; }

.menu-group { margin-top: 16px; }
.menu-title { font-size: 11px; color: #9bb8a8; font-weight: 600; padding: 0 18px 8px; display: block; }
.menu-item { padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
.menu-item:first-child { border-radius: 14px 14px 0 0 !important; }
.menu-item:last-child { border-radius: 0 0 14px 14px !important; }
.menu-left { display: flex; align-items: center; gap: 10px; }
.menu-icon { font-size: 16px; }
.menu-label { font-size: 14px; font-weight: 600; color: #0f1c14; }
.logout-label { color: #ff6b6b; }
.menu-item-logout { margin-top: 8px !important; border-radius: 14px !important; }
.menu-arrow { font-size: 18px; color: #c2f2c8; }

/* Sheet */
.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 300; display: flex; align-items: flex-end; justify-content: center; }
.sheet-panel { width: 375px; max-height: 85vh; overflow-y: auto; background: linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,252,242,0.96)); border-radius: 24px 24px 0 0; padding: 0 20px 30px; }
.sheet-handle { display: flex; justify-content: center; padding: 12px 0 8px; }
.handle-bar { width: 38px; height: 4px; border-radius: 3px; background: rgba(194,242,200,0.8); }
.sheet-header-row { display: flex; align-items: flex-start; gap: 12px; padding: 8px 0 16px; }
.close-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid #c2f2c8; color: #6b8c7a; }
.sheet-title { font-size: 17px; font-weight: 700; color: #0f1c14; display: block; }
.sheet-sub { font-size: 11px; color: #9bb8a8; }
.sheet-body { padding-top: 8px; }
.form-label { font-size: 12px; color: #6b8c7a; font-weight: 600; display: block; margin-bottom: 8px; }
.form-row { display: flex; align-items: center; gap: 10px; }
.form-input-wrap { flex: 1; background: rgba(255,255,255,0.6); border-radius: 14px; border: 1px solid #c2f2c8; padding: 10px 14px; display: flex; align-items: center; gap: 6px; }
.form-prefix { font-size: 16px; font-weight: 700; color: #25cc5d; }
.form-input { flex: 1; border: none; background: transparent; font-size: 20px; font-weight: 700; color: #0f1c14; }
.form-check-btn { width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg,#4fd974,#25cc5d); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px; cursor: pointer; }
.seg-group { display: flex; gap: 8px; }
.seg-btn { flex: 1; padding: 10px; border-radius: 12px; text-align: center; background: rgba(255,255,255,0.6); border: 1px solid #c2f2c8; font-size: 12px; font-weight: 600; color: #6b8c7a; cursor: pointer; }
.seg-btn.active { background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; border-color: transparent; }
.save-btn { width: 100%; padding: 14px; border-radius: 16px; background: linear-gradient(135deg,#4fd974,#25cc5d); text-align: center; color: #fff; font-size: 14px; font-weight: 800; margin-top: 20px; cursor: pointer; }

.about-content { padding: 16px 0; }
.about-name { font-size: 20px; font-weight: 800; color: #0f1c14; display: block; margin-bottom: 12px; }
.about-desc { font-size: 13px; color: #6b8c7a; line-height: 1.6; display: block; margin-bottom: 4px; }
.feedback-area { width: 100%; height: 120px; border-radius: 14px; background: rgba(242,252,242,0.8); border: 1px solid #c2f2c8; padding: 14px; font-size: 13px; margin-top: 16px; }
</style>
