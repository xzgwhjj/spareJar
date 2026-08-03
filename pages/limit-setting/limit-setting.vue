<template>
  <view class="limit-page" data-cmp="LimitSetting">
    <!-- 顶部栏 -->
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">限额设置</text>
      <view style="width:36px;" />
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="flex:1;">
      <!-- 当前生效 + 待生效 -->
      <view class="glass-mid card-in-1" style="margin:16px;padding:18px;">
        <text class="section-title">📅 每日限额</text>
        <view class="current-row">
          <text class="current-label">当前生效</text>
          <text class="current-value">¥{{ currentYuan }}</text>
        </view>
        <view v-if="pending" class="pending-hint">
          <text class="pending-dot">●</text>
          <text class="pending-text">待生效 ¥{{ pending.yuan }}（{{ pendingLabel }} 生效）</text>
        </view>

        <view class="slider-value-row">
          <text class="slider-value">¥{{ dailyLimit }}</text>
          <text class="slider-hint">每日最高可花金额</text>
        </view>
        <slider
          class="custom-slider"
          :value="dailyLimit"
          min="1"
          max="2000"
          step="1"
          activeColor="#25cc5d"
          backgroundColor="rgba(194,242,200,0.3)"
          blockColor="#25cc5d"
          blockSize="22"
          @change="onSlide"
          @changing="onSlide"
        />
        <view class="input-row">
          <text class="input-prefix">¥</text>
          <number-field
            class="limit-input"
            :model-value="dailyLimit"
            placeholder="输入整数金额"
            title="每日限额"
            :decimal-places="0"
            :max-integer="5"
            @update:model-value="onInputValue"
          />
          <text class="input-unit">/天</text>
        </view>
        <view class="slider-labels">
          <text>¥1</text>
          <text>¥2000</text>
        </view>
      </view>

      <!-- 月预算参考（仅展示） -->
      <view class="glass-mid card-in-1" style="margin:0 16px 16px;padding:18px;">
        <text class="section-title">📆 月预算参考</text>
        <view v-if="monthlyBudgetYuan != null" class="ref-row">
          <view class="ref-cell">
            <text class="ref-label">月预算</text>
            <text class="ref-value">¥{{ monthlyBudgetYuan }}</text>
          </view>
          <view class="ref-cell">
            <text class="ref-label">当月天数</text>
            <text class="ref-value">{{ daysInMonth }} 天</text>
          </view>
          <view class="ref-cell">
            <text class="ref-label">日均约</text>
            <text class="ref-value accent">¥{{ dailyRefYuan }}</text>
          </view>
        </view>
        <view v-else class="ref-empty">
          <text>尚未设置月预算，可在账本预算中调整作为参考</text>
        </view>
      </view>

      <!-- 保存 -->
      <view style="padding:0 16px 30px;">
        <view class="save-btn" @click="saveSettings">
          <text>💾 保存设置</text>
        </view>
        <view class="reset-btn" @click="resetSettings">
          <text>恢复默认（¥100）</text>
        </view>
      </view>
    </scroll-view>
      
    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user.js';
import { updateSettings } from '@/api/sparejar.js';
import { todayDateKey, addDaysToDateKey } from '@/utils/date.js';

const { state, loadSettings, refreshTodayDashboard } = useUserStore();

const DEFAULT_YUAN = 100; // 默认 ¥100（服务端 10000 分）

/** 当前生效限额（元） */
const currentYuan = computed(() => {
  const s = state.settings;
  if (!s) return DEFAULT_YUAN;
  const eff = (s.pending_base_limit != null && s.limit_effective_date && s.limit_effective_date <= todayDateKey())
    ? s.pending_base_limit
    : (s.daily_base_limit || 10000);
  return Math.round(eff / 100);
});

const dailyLimit = ref(DEFAULT_YUAN);
const pending = ref(null); // { yuan, dateKey }
const monthlyBudgetYuan = ref(null);

const daysInMonth = computed(() => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
});
const dailyRefYuan = computed(() =>
  monthlyBudgetYuan.value ? Math.round(monthlyBudgetYuan.value / daysInMonth.value) : null
);
const pendingLabel = computed(() => {
  if (!pending.value) return '';
  const [y, m, d] = pending.value.dateKey.split('-');
  return `${Number(m)}月${Number(d)}日`;
});

function syncFromSettings() {
  const s = state.settings;
  dailyLimit.value = currentYuan.value;
  if (s && s.pending_base_limit != null && s.limit_effective_date && s.limit_effective_date > todayDateKey()) {
    pending.value = { yuan: Math.round(s.pending_base_limit / 100), dateKey: s.limit_effective_date };
  } else {
    pending.value = null;
  }
  if (s && typeof s.monthly_budget === 'number') {
    monthlyBudgetYuan.value = Math.round(s.monthly_budget / 100);
  }
}

onMounted(async () => {
  if (!state.settings) await loadSettings();
  syncFromSettings();
});

const onSlide = (e) => { dailyLimit.value = Number(e.detail.value); };
const onInputValue = (val) => {
  const v = Number(val);
  if (Number.isFinite(v)) dailyLimit.value = Math.max(1, Math.min(2000, Math.floor(v)));
};

const saveSettings = async () => {
  const val = Math.floor(Number(dailyLimit.value));
  if (!Number.isFinite(val) || val < 1 || !Number.isInteger(val)) {
    uni.showToast({ title: '每日限额需为整数且 ≥ 1 元', icon: 'none' });
    return;
  }
  const fen = val * 100;
  try {
    // 修改次日生效：写入 pending，limit_effective_date = 明日；引擎在次日自动启用
    await updateSettings({
      pending_base_limit: fen,
      limit_effective_date: addDaysToDateKey(todayDateKey(), 1)
    });
    await loadSettings();
    syncFromSettings();
    await refreshTodayDashboard({ force: true });
    uni.showToast({ title: '将于明日生效', icon: 'success' });
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
  }
};

const resetSettings = async () => {
  try {
    await updateSettings({
      pending_base_limit: DEFAULT_YUAN * 100,
      limit_effective_date: addDaysToDateKey(todayDateKey(), 1)
    });
    await loadSettings();
    syncFromSettings();
    await refreshTodayDashboard({ force: true });
    uni.showToast({ title: '已恢复默认（明日生效）', icon: 'success' });
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '操作失败', icon: 'none' });
  }
};

const goBack = () => uni.navigateBack();
</script>

<style scoped>
.limit-page { width: 375px; height: 100vh; margin: 0 auto; background: #f2fcf2; display: flex; flex-direction: column; overflow: hidden; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 44px 16px 10px; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b8c7a; font-size: 16px; }
.topbar-title { font-size: 17px; font-weight: 700; color: #0f1c14; }

.section-title { font-size: 14px; font-weight: 700; color: #0f1c14; display: block; margin-bottom: 12px; }
.current-row { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
.current-label { font-size: 12px; color: #9bb8a8; }
.current-value { font-size: 22px; font-weight: 800; color: #0f1c14; }
.pending-hint { display: flex; align-items: center; gap: 6px; background: rgba(37,204,93,0.1); border-radius: 10px; padding: 8px 10px; margin-bottom: 14px; }
.pending-dot { color: #25cc5d; font-size: 8px; }
.pending-text { font-size: 12px; font-weight: 600; color: #25cc5d; }

.slider-value-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 16px; }
.slider-value { font-size: 36px; font-weight: 900; color: #25cc5d; }
.slider-hint { font-size: 12px; color: #9bb8a8; }
.slider-labels { display: flex; justify-content: space-between; font-size: 10px; color: #9bb8a8; margin-top: 4px; }

.input-row { display: flex; align-items: center; gap: 8px; margin-top: 14px; background: rgba(242,252,242,0.8); border: 1px solid rgba(194,242,200,0.4); border-radius: 14px; padding: 0 14px; height: 46px; }
.input-prefix { font-size: 16px; font-weight: 700; color: #25cc5d; }
.limit-input { flex: 1; font-size: 16px; font-weight: 700; color: #0f1c14; }
.input-unit { font-size: 12px; color: #9bb8a8; }

.ref-row { display: flex; justify-content: space-between; }
.ref-cell { flex: 1; text-align: center; }
.ref-label { font-size: 11px; color: #9bb8a8; display: block; margin-bottom: 4px; }
.ref-value { font-size: 15px; font-weight: 800; color: #0f1c14; }
.ref-value.accent { color: #25cc5d; }
.ref-empty { font-size: 12px; color: #9bb8a8; text-align: center; padding: 8px 0; }

.save-btn { width: 100%; padding: 14px; border-radius: 16px; background: linear-gradient(135deg,#4fd974,#25cc5d); text-align: center; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 20px rgba(37,204,93,0.3); }
.reset-btn { width: 100%; padding: 12px; border-radius: 14px; text-align: center; color: #9bb8a8; font-size: 12px; font-weight: 600; cursor: pointer; margin-top: 10px; }
</style>
