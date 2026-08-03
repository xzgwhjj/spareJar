<template>
  <view class="notify-page" data-cmp="NotifySetting">
    <view class="aurora-bg-wrap">
      <view class="aurora-bg-base" />
      <view class="aurora-top-halo" />
    </view>

    <view class="nav-bar">
      <view class="nav-back" @click="goBack"><text>‹</text></view>
      <text class="nav-title">通知设置</text>
      <view class="nav-placeholder" />
    </view>

    <view class="notify-body">
      <text class="section-tip">开启后，在授权范围内通过微信订阅消息提醒你（同类每日最多 1 条）。</text>

      <view class="switch-card">
        <view class="switch-row">
          <view class="sr-left">
            <text class="sr-icon">🚨</text>
            <view class="sr-info">
              <text class="sr-title">超额提醒</text>
              <text class="sr-sub">当日消费超过日限额时通知</text>
            </view>
          </view>
          <switch :checked="overLimit" color="#25cc5d" @change="(e) => onToggle('over_limit', e.detail.value)" />
        </view>

        <view class="switch-row">
          <view class="sr-left">
            <text class="sr-icon">💡</text>
            <view class="sr-info">
              <text class="sr-title">日结待分配</text>
              <text class="sr-sub">每日结余生成、待分配时通知</text>
            </view>
          </view>
          <switch :checked="dailySurplus" color="#25cc5d" @change="(e) => onToggle('daily_surplus', e.detail.value)" />
        </view>

        <view class="switch-row">
          <view class="sr-left">
            <text class="sr-icon">🔥</text>
            <view class="sr-info">
              <text class="sr-title">挑战中断提醒</text>
              <text class="sr-sub">连续打卡即将中断时提醒</text>
            </view>
          </view>
          <switch :checked="streakRisk" color="#25cc5d" @change="(e) => onToggle('streak_risk', e.detail.value)" />
        </view>
      </view>

      <view class="subscribe-reauth" @click="reAuth">
        <text>重新授权订阅消息</text>
        <text class="ra-arrow">›</text>
      </view>
    </view>
      
    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
</view>
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '@/stores/user.js';
import { updateSettings } from '@/api/sparejar.js';
import { recordSubscribeAuthAction } from '@/stores/user.js';

const { state, loadSettings } = useUserStore();

const overLimit = ref(true);
const dailySurplus = ref(true);
const streakRisk = ref(true);

const SUBSCRIBE_TMPL_IDS = [];

function syncFromSettings() {
  const s = state.settings;
  if (!s) return;
  if (typeof s.notify_over_limit === 'boolean') overLimit.value = s.notify_over_limit;
  if (typeof s.notify_daily_surplus === 'boolean') dailySurplus.value = s.notify_daily_surplus;
  if (typeof s.notify_streak_risk === 'boolean') streakRisk.value = s.notify_streak_risk;
}

async function onToggle(field, val) {
  const map = { over_limit: overLimit, daily_surplus: dailySurplus, streak_risk: streakRisk };
  map[field].value = val;
  try {
    await updateSettings({ [field]: val });
    await loadSettings();
    uni.showToast({ title: '已保存', icon: 'success' });
  } catch (err) {
    map[field].value = !val;
    uni.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
  }
}

function reAuth() {
  if (!SUBSCRIBE_TMPL_IDS.length) {
    uni.showToast({ title: '模板未配置', icon: 'none' });
    return;
  }
  uni.requestSubscribeMessage({
    tmplIds: SUBSCRIBE_TMPL_IDS,
    success: () => {
      ['over_limit', 'daily_surplus', 'streak_risk'].forEach((t) => recordSubscribeAuthAction(t));
      uni.showToast({ title: '已授权', icon: 'success' });
    },
    fail: () => {}
  });
}

function goBack() {
  uni.navigateBack({ delta: 1 });
}

if (!state.settings) loadSettings().then(syncFromSettings).catch(() => {});
else syncFromSettings();
</script>

<style scoped>
.notify-page { width: 375px; height: 812px; overflow: hidden; position: relative; margin: 0 auto; background: #f2fcf2; display: flex; flex-direction: column; }
.aurora-bg-wrap { position: absolute; inset: 0; overflow: hidden; }
.aurora-bg-base { position: absolute; inset: 0; background: linear-gradient(180deg,#eafaf0,#f2fcf2); }
.aurora-top-halo { position: absolute; top: -120px; left: 50%; transform: translateX(-50%); width: 360px; height: 240px; background: radial-gradient(circle, rgba(79,217,116,0.3), transparent 70%); filter: blur(20px); }

.nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 50px 16px 8px; position: relative; z-index: 2; }
.nav-back { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; border: 1px solid #c2f2c8; color: #6b8c7a; font-size: 22px; }
.nav-title { font-size: 17px; font-weight: 800; color: #0f1c14; }
.nav-placeholder { width: 36px; }

.notify-body { flex: 1; padding: 12px 16px; position: relative; z-index: 2; }
.section-tip { font-size: 12px; color: #9bb8a8; line-height: 1.6; display: block; margin-bottom: 14px; }
.switch-card { background: rgba(255,255,255,0.7); border: 1px solid #c2f2c8; border-radius: 18px; padding: 4px 16px; }
.switch-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid rgba(194,242,200,0.5); }
.switch-row:last-child { border-bottom: none; }
.sr-left { display: flex; align-items: center; gap: 12px; }
.sr-icon { font-size: 22px; }
.sr-info { display: flex; flex-direction: column; }
.sr-title { font-size: 15px; font-weight: 700; color: #0f1c14; }
.sr-sub { font-size: 11px; color: #9bb8a8; margin-top: 2px; }
.subscribe-reauth { margin-top: 16px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.7); border: 1px solid #c2f2c8; border-radius: 14px; padding: 14px 16px; font-size: 14px; font-weight: 600; color: #25cc5d; }
.ra-arrow { color: #c2f2c8; }
</style>
