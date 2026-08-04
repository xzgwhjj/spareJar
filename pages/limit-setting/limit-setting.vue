<template>
  <view class="limit-page" data-cmp="LimitSetting">
    <!-- 顶部栏 -->
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">限额设置</text>
      <view class="history-entry" @click="goHistory"><text>历史</text></view>
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="flex:1;">
      <!-- 维度选择 -->
      <view class="glass-mid card-in-1" style="margin:16px;padding:18px;">
        <text class="section-title">🎯 管控维度</text>
        <view class="seg-row">
          <view
            v-for="d in dims"
            :key="d.value"
            class="seg-item"
            :class="{ active: dim === d.value }"
            @click="selectDim(d.value)"
          >
            <text>{{ d.label }}</text>
          </view>
        </view>
        <text class="seg-tip">仅可配置一种维度，系统自动向下拆分为每日额度</text>
      </view>

      <!-- 拆分策略 -->
      <view v-if="dim !== 'day'" class="glass-mid card-in-1" style="margin:0 16px 16px;padding:18px;">
        <text class="section-title">⚙️ 分配策略</text>
        <block v-if="dim === 'year'">
          <view class="strategy-label">年 → 月</view>
          <view class="seg-row sm">
            <view
              v-for="s in strategies"
              :key="'y'+s.value"
              class="seg-item"
              :class="{ active: yearStrategy === s.value }"
              @click="yearStrategy = s.value"
            >
              <text>{{ s.label }}</text>
            </view>
          </view>
        </block>
        <view class="strategy-label">月 → 日</view>
        <view class="seg-row sm">
          <view
            v-for="s in strategies"
            :key="'m'+s.value"
            class="seg-item"
            :class="{ active: monthStrategy === s.value }"
            @click="monthStrategy = s.value"
          >
            <text>{{ s.label }}</text>
          </view>
        </view>
        <text class="strategy-tip">均分：每天固定基线；剩余滚动：每日按「剩余池 ÷ 剩余天数」动态重算</text>
      </view>

      <!-- 总池配置 -->
      <view class="glass-mid card-in-1" style="margin:0 16px 16px;padding:18px;">
        <text class="section-title">{{ dimLabel }}总{{ poolUnit }}</text>
        <view class="slider-value-row">
          <text class="slider-value">¥{{ poolYuan }}</text>
          <text class="slider-hint">每{{ poolUnit }}最高可分配金额</text>
        </view>
        <slider
          class="custom-slider"
          :value="poolYuan"
          :min="poolMin"
          :max="poolMax"
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
            :model-value="poolYuan"
            placeholder="输入整数金额"
            title="总池"
            :decimal-places="0"
            :max-integer="7"
            @update:model-value="onInputValue"
          />
          <text class="input-unit">/{{ poolUnit }}</text>
        </view>
        <view class="slider-labels">
          <text>¥{{ poolMin }}</text>
          <text>¥{{ poolMax }}</text>
        </view>

        <!-- 实时预估 -->
        <view class="preview-box" v-if="dim !== 'day'">
          <text class="preview-label">预估每日额度</text>
          <text class="preview-value">¥{{ estDailyYuan }}</text>
          <text class="preview-sub">{{ strategyLabel }} · 本月约 ¥{{ estMonthYuan }}/月</text>
        </view>
      </view>

      <!-- 局部微调 -->
      <view class="glass-mid card-in-1" style="margin:0 16px 16px;padding:18px;">
        <view class="collapse-head" @click="showOverride = !showOverride">
          <text class="section-title" style="margin-bottom:0;">🔧 局部微调</text>
          <text class="collapse-arrow">{{ showOverride ? '∧' : '∨' }}</text>
        </view>
        <view v-if="showOverride">
          <text class="override-tip">可临时覆盖最近 {{ dim === 'day' ? '7 天' : '1~3 个月 + 7 天' }} 的额度，次日生效，过期自动失效。</text>

          <!-- 日覆盖 -->
          <view class="override-add">
            <view class="ov-input-group">
              <text class="ov-prefix">日期</text>
              <picker mode="date" :value="ovDayKey" :start="ovDayStart" :end="ovDayEnd" @change="onOvDayChange">
                <view class="ov-picker"><text>{{ ovDayKey }}</text></view>
              </picker>
            </view>
            <view class="ov-input-group grow">
              <text class="ov-prefix">¥</text>
              <number-field
                class="ov-field"
                :model-value="ovDayAmount"
                placeholder="当日额度"
                title="当日额度"
                :decimal-places="0"
                :max-integer="7"
                @update:model-value="v => ovDayAmount = Number(v)"
              />
            </view>
            <view class="ov-add-btn" @click="addDayOverride"><text>＋</text></view>
          </view>

          <!-- 月覆盖（仅 month/year 维度） -->
          <view v-if="dim !== 'day'" class="override-add" style="margin-top:10px;">
            <view class="ov-input-group">
              <text class="ov-prefix">月份</text>
              <picker mode="date" fields="month" :value="ovMonthKey" :start="ovMonthStart" :end="ovMonthEnd" @change="onOvMonthChange">
                <view class="ov-picker"><text>{{ ovMonthKey }}</text></view>
              </picker>
            </view>
            <view class="ov-input-group grow">
              <text class="ov-prefix">¥</text>
              <number-field
                class="ov-field"
                :model-value="ovMonthAmount"
                placeholder="当月总池"
                title="当月总池"
                :decimal-places="0"
                :max-integer="7"
                @update:model-value="v => ovMonthAmount = Number(v)"
              />
            </view>
            <view class="ov-add-btn" @click="addMonthOverride"><text>＋</text></view>
          </view>

          <!-- 已添加列表 -->
          <view v-if="overrideList.length" class="ov-list">
            <view v-for="(o, i) in overrideList" :key="i" class="ov-item">
              <text class="ov-item-key">{{ o.type === 'day' ? '日' : '月' }} · {{ o.key }}</text>
              <text class="ov-item-amt">¥{{ Math.round(o.amount_fen / 100) }}</text>
              <text class="ov-item-del" @click="removeOverride(i)">✕</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 保存 -->
      <view style="padding:0 16px 30px;">
        <view class="save-btn" @click="saveSettings">
          <text>💾 保存设置</text>
        </view>
        <view class="reset-btn" @click="resetSettings">
          <text>恢复默认（日 ¥100）</text>
        </view>
      </view>
    </scroll-view>

    <amount-keyboard />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user.js';
import { updateSettings } from '@/api/sparejar.js';
import { todayDateKey, addDaysToDateKey } from '@/utils/date.js';
import { computeDayBaseLimit, validateOverride, addOverride, pruneOverrides } from '@/utils/limitEngine.js';

const { state, loadSettings, refreshTodayDashboard } = useUserStore();

const DEFAULT_YUAN = 100;
const dims = [
  { value: 'day', label: '日', unit: '天' },
  { value: 'month', label: '月', unit: '月' },
  { value: 'year', label: '年', unit: '年' }
];
const strategies = [
  { value: 'equal', label: '均分' },
  { value: 'rollover', label: '剩余滚动' }
];

/* ---- 响应式表单状态 ---- */
const dim = ref('day');
const yearStrategy = ref('equal');
const monthStrategy = ref('equal');
const poolYuan = ref(DEFAULT_YUAN);
const overrides = ref([]);

const showOverride = ref(false);
const ovDayKey = ref(todayDateKey());
const ovDayAmount = ref(DEFAULT_YUAN);
const ovMonthKey = ref(todayDateKey().slice(0, 7));
const ovMonthAmount = ref(DEFAULT_YUAN);

/* ---- 派生 ---- */
const dimMeta = computed(() => dims.find(d => d.value === dim.value) || dims[0]);
const dimLabel = computed(() => dimMeta.value.label);
const poolUnit = computed(() => dimMeta.value.unit);
const poolMin = computed(() => 1);
const poolMax = computed(() => (dim.value === 'day' ? 2000 : 1000000));

const overrideList = computed(() => overrides.value);

const estSettings = computed(() => ({
  limit_dim: dim.value,
  limit_amount_fen: dim.value === 'day' ? null : poolYuan.value * 100,
  daily_base_limit: dim.value === 'day' ? poolYuan.value * 100 : null,
  year_strategy: yearStrategy.value,
  month_strategy: monthStrategy.value,
  overrides: overrides.value
}));

const estDailyFen = computed(() => computeDayBaseLimit(estSettings.value, todayDateKey()));
const estDailyYuan = computed(() => Math.round(estDailyFen.value / 100));
const estMonthYuan = computed(() => Math.round(estDailyFen.value / 100 * new Date().getDate() || (poolYuan.value / 30)));
const strategyLabel = computed(() => {
  if (dim.value === 'day') return '按日固定';
  return (monthStrategy.value === 'equal' ? '日均分' : '月剩余滚动');
});

/* ---- 局部覆盖日期范围 ---- */
const ovDayStart = computed(() => todayDateKey());
const ovDayEnd = computed(() => addDaysToDateKey(todayDateKey(), 6));
const ovMonthStart = computed(() => todayDateKey().slice(0, 7));
const ovMonthEnd = computed(() => {
  const d = new Date(todayDateKey());
  d.setMonth(d.getMonth() + 2);
  return d.toISOString().slice(0, 7);
});

/* ---- 同步 ---- */
function syncFromSettings() {
  const s = state.settings;
  if (!s) return;
  dim.value = s.limit_dim || 'day';
  yearStrategy.value = s.year_strategy || 'equal';
  monthStrategy.value = s.month_strategy || 'equal';
  overrides.value = pruneOverrides(s, todayDateKey());
  if (dim.value === 'day') {
    const eff = (s.pending_base_limit != null && s.limit_effective_date && s.limit_effective_date <= todayDateKey())
      ? s.pending_base_limit : (s.daily_base_limit || 10000);
    poolYuan.value = Math.round(eff / 100);
  } else {
    poolYuan.value = Math.round((s.limit_amount_fen || 0) / 100) || DEFAULT_YUAN;
  }
}

onMounted(async () => {
  if (!state.settings) await loadSettings();
  syncFromSettings();
});

/* ---- 交互 ---- */
function selectDim(v) { dim.value = v; }

const onSlide = (e) => { poolYuan.value = Number(e.detail.value); };
const onInputValue = (val) => {
  const v = Number(val);
  if (Number.isFinite(v)) {
    const max = poolMax.value;
    poolYuan.value = Math.max(poolMin.value, Math.min(max, Math.floor(v)));
  }
};

function onOvDayChange(e) { ovDayKey.value = e.detail.value; }
function onOvMonthChange(e) { ovMonthKey.value = e.detail.value; }

function addDayOverride() {
  const rec = { type: 'day', key: ovDayKey.value, amount_fen: Math.round(Number(ovDayAmount.value) * 100) };
  const v = validateOverride(estSettings.value, rec, todayDateKey());
  if (!v.ok) return uni.showToast({ title: v.error, icon: 'none' });
  overrides.value = addOverride({ overrides: overrides.value }, rec, todayDateKey());
}
function addMonthOverride() {
  const rec = { type: 'month', key: ovMonthKey.value, amount_fen: Math.round(Number(ovMonthAmount.value) * 100) };
  const v = validateOverride(estSettings.value, rec, todayDateKey());
  if (!v.ok) return uni.showToast({ title: v.error, icon: 'none' });
  overrides.value = addOverride({ overrides: overrides.value }, rec, todayDateKey());
}
function removeOverride(i) {
  overrides.value = overrides.value.filter((_, idx) => idx !== i);
}

/* ---- 保存（次日生效） ---- */
async function saveSettings() {
  const val = Math.floor(Number(poolYuan.value));
  if (!Number.isFinite(val) || val < 1 || !Number.isInteger(val)) {
    return uni.showToast({ title: '总池需为整数且 ≥ 1 元', icon: 'none' });
  }
  const tomorrow = addDaysToDateKey(todayDateKey(), 1);
  const payload = {
    limit_dim: dim.value,
    pending_limit_dim: dim.value,
    limit_effective_date: tomorrow,
    overrides: overrides.value
  };
  if (dim.value === 'day') {
    payload.pending_base_limit = val * 100;
    payload.pending_amount_fen = null;
  } else {
    payload.pending_amount_fen = val * 100;
    payload.pending_year_strategy = yearStrategy.value;
    payload.pending_month_strategy = monthStrategy.value;
    payload.pending_base_limit = null;
  }
  try {
    await updateSettings(payload);
    await loadSettings();
    syncFromSettings();
    await refreshTodayDashboard({ force: true });
    uni.showToast({ title: '将于明日生效', icon: 'success' });
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
  }
}

async function resetSettings() {
  try {
    await updateSettings({
      limit_dim: 'day',
      pending_limit_dim: 'day',
      pending_base_limit: DEFAULT_YUAN * 100,
      pending_amount_fen: null,
      limit_effective_date: addDaysToDateKey(todayDateKey(), 1),
      overrides: []
    });
    await loadSettings();
    syncFromSettings();
    await refreshTodayDashboard({ force: true });
    uni.showToast({ title: '已恢复默认（明日生效）', icon: 'success' });
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '操作失败', icon: 'none' });
  }
}

const goBack = () => uni.navigateBack();
const goHistory = () => uni.navigateTo({ url: '/pages/limit-history/limit-history' });
</script>

<style scoped>
.limit-page { width: 375px; height: 100vh; margin: 0 auto; background: #f2fcf2; display: flex; flex-direction: column; overflow: hidden; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 44px 16px 10px; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b8c7a; font-size: 16px; }
.topbar-title { font-size: 17px; font-weight: 700; color: #0f1c14; }
.history-entry { font-size: 13px; font-weight: 600; color: #25cc5d; cursor: pointer; }

.section-title { font-size: 14px; font-weight: 700; color: #0f1c14; display: block; margin-bottom: 12px; }

.seg-row { display: flex; gap: 8px; }
.seg-row.sm { margin-bottom: 10px; }
.seg-item { flex: 1; text-align: center; padding: 10px 0; border-radius: 12px; background: rgba(242,252,242,0.7); border: 1px solid rgba(194,242,200,0.4); font-size: 14px; font-weight: 700; color: #6b8c7a; cursor: pointer; }
.seg-item.active { background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; border-color: transparent; box-shadow: 0 3px 12px rgba(37,204,93,0.3); }
.seg-tip { font-size: 11px; color: #9bb8a8; margin-top: 10px; display: block; }

.strategy-label { font-size: 12px; font-weight: 700; color: #6b8c7a; margin: 4px 0 8px; }
.strategy-tip { font-size: 11px; color: #9bb8a8; margin-top: 10px; display: block; }

.slider-value-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 16px; }
.slider-value { font-size: 32px; font-weight: 900; color: #25cc5d; }
.slider-hint { font-size: 12px; color: #9bb8a8; }
.slider-labels { display: flex; justify-content: space-between; font-size: 10px; color: #9bb8a8; margin-top: 4px; }

.input-row { display: flex; align-items: center; gap: 8px; margin-top: 14px; background: rgba(242,252,242,0.8); border: 1px solid rgba(194,242,200,0.4); border-radius: 14px; padding: 0 14px; height: 46px; }
.input-prefix { font-size: 16px; font-weight: 700; color: #25cc5d; }
.limit-input { flex: 1; font-size: 16px; font-weight: 700; color: #0f1c14; }
.input-unit { font-size: 12px; color: #9bb8a8; }

.preview-box { margin-top: 16px; padding: 12px 14px; border-radius: 12px; background: rgba(37,204,93,0.08); display: flex; flex-direction: column; gap: 2px; }
.preview-label { font-size: 11px; color: #9bb8a8; }
.preview-value { font-size: 22px; font-weight: 900; color: #25cc5d; }
.preview-sub { font-size: 11px; color: #6b8c7a; }

.collapse-head { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
.collapse-arrow { font-size: 14px; color: #9bb8a8; }
.override-tip { font-size: 11px; color: #9bb8a8; margin: 10px 0; display: block; }

.override-add { display: flex; align-items: center; gap: 8px; }
.ov-input-group { display: flex; align-items: center; gap: 6px; background: rgba(242,252,242,0.8); border: 1px solid rgba(194,242,200,0.4); border-radius: 12px; padding: 0 10px; height: 42px; }
.ov-input-group.grow { flex: 1; }
.ov-prefix { font-size: 13px; font-weight: 700; color: #25cc5d; }
.ov-picker { font-size: 13px; font-weight: 700; color: #0f1c14; }
.ov-field { flex: 1; font-size: 14px; font-weight: 700; color: #0f1c14; }
.ov-add-btn { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; font-size: 20px; font-weight: 800; display: flex; align-items: center; justify-content: center; cursor: pointer; }

.ov-list { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
.ov-item { display: flex; align-items: center; justify-content: space-between; background: rgba(242,252,242,0.6); border-radius: 10px; padding: 8px 12px; }
.ov-item-key { font-size: 12px; color: #6b8c7a; font-weight: 600; }
.ov-item-amt { font-size: 13px; font-weight: 800; color: #0f1c14; }
.ov-item-del { font-size: 13px; color: #e07a7a; cursor: pointer; padding: 0 4px; }

.save-btn { width: 100%; padding: 14px; border-radius: 16px; background: linear-gradient(135deg,#4fd974,#25cc5d); text-align: center; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 20px rgba(37,204,93,0.3); }
.reset-btn { width: 100%; padding: 12px; border-radius: 14px; text-align: center; color: #9bb8a8; font-size: 12px; font-weight: 600; cursor: pointer; margin-top: 10px; }
</style>
