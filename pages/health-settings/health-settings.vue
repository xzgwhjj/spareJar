<template>
  <view class="hs-page" data-cmp="HealthSettings">
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">身体数据设置</text>
      <view class="topbar-spacer" />
    </view>

    <scroll-view scroll-y enhanced :show-scrollbar="false" class="page-scroll">
      <view class="glass-mid card-in-1" style="padding:24rpx 28rpx;margin:24rpx 32rpx 0;">
        <text class="block-title">基本信息</text>
        <view class="seg-group">
          <view v-for="g in GENDERS" :key="g.id" class="seg-btn" :class="{ active: form.gender === g.id }" @click="form.gender = g.id">
            {{ g.label }}
          </view>
        </view>
        <view v-for="f in BASE_FIELDS" :key="f.key" class="field-row">
          <text class="field-label">{{ f.label }}</text>
          <number-field class="field-input" :model-value="form[f.key]" :placeholder="f.placeholder" :title="f.label" :decimal-places="0" :max-integer="4" @update:model-value="(v) => (form[f.key] = v)" />
          <text class="field-unit">{{ f.unit }}</text>
        </view>
        <text class="block-title" style="margin-top:24rpx;">活动强度</text>
        <view class="seg-group">
          <view v-for="a in ACTIVITY_OPTIONS" :key="a.id" class="seg-btn activity-btn"
            :class="{ active: form.activityId === a.id }" @click="form.activityId = a.id">
            <text class="activity-label">{{ a.label }}</text>
            <text class="activity-desc">{{ a.desc }}</text>
          </view>
        </view>
      </view>

      <view class="glass-mid card-in-1" style="padding:24rpx 28rpx;margin:24rpx 32rpx 0;">
        <view class="result-header">
          <text class="result-title">自动测算（Mifflin-St Jeor）</text>
          <text class="result-hint">仅供参考，非医疗建议</text>
        </view>
        <view class="result-values">
          <view class="result-cell">
            <text class="result-subtitle">基础代谢 BMR</text>
            <text class="result-number">{{ autoBmr || '—' }}<text class="result-unit">kcal</text></text>
          </view>
          <view class="result-cell">
            <text class="result-subtitle">日总消耗 TDEE</text>
            <text class="result-number tdee">{{ autoTdee || '—' }}<text class="result-unit">kcal</text></text>
          </view>
        </view>

        <view class="toggle-row" @click="form.useManual = !form.useManual">
          <text class="toggle-label">手动覆盖 BMR / TDEE / 摄入目标</text>
          <view class="sw-switch" :class="{ on: form.useManual }"><view class="sw-knob" :class="{ on: form.useManual }" /></view>
        </view>

        <block v-if="form.useManual">
          <view class="field-row">
            <text class="field-label">BMR</text>
            <number-field class="field-input" :model-value="form.manualBmr" placeholder="0" title="BMR" :decimal-places="0" :max-integer="5" @update:model-value="(v) => (form.manualBmr = v)" />
            <text class="field-unit">kcal</text>
          </view>
          <view class="field-row">
            <text class="field-label">TDEE</text>
            <number-field class="field-input" :model-value="form.manualTdee" placeholder="0" title="TDEE" :decimal-places="0" :max-integer="5" @update:model-value="(v) => (form.manualTdee = v)" />
            <text class="field-unit">kcal</text>
          </view>
        </block>
        <block v-else>
          <view class="field-row">
            <text class="field-label">目标缺口</text>
            <number-field class="field-input" :model-value="form.gap" placeholder="0" title="目标缺口" :decimal-places="0" :max-integer="5" @update:model-value="(v) => (form.gap = v)" />
            <text class="field-unit">kcal</text>
          </view>
          <text class="result-subtitle" style="margin-top:6rpx;">日摄入目标 = TDEE − 缺口 = {{ autoTarget || '—' }} kcal</text>
        </block>

        <view class="field-row" style="margin-top:16rpx;">
          <text class="field-label">摄入目标</text>
          <number-field class="field-input" :model-value="form.manualTarget" :placeholder="String(autoTarget || 0)" title="摄入目标" :decimal-places="0" :max-integer="5" @update:model-value="(v) => (form.manualTarget = v)" />
          <text class="field-unit">kcal</text>
        </view>
      </view>

      <view class="glass-mid card-in-1" style="padding:24rpx 28rpx;margin:24rpx 32rpx 0;">
        <text class="block-title">今日运动消耗</text>
        <view class="field-row">
          <text class="field-label">运动</text>
          <number-field class="field-input" :model-value="form.exercise" placeholder="0" title="运动消耗" :decimal-places="0" :max-integer="5" @update:model-value="(v) => (form.exercise = v)" />
          <text class="field-unit">kcal</text>
        </view>
        <text class="result-subtitle" style="margin-top:6rpx;">今日总消耗 = TDEE + 运动 = {{ totalBurn || '—' }} kcal</text>
      </view>

      <view class="disclaimer">
        <text class="disclaimer-text">⚠️ 本模块数据为用户自填/公式估算，仅供生活方式参考，<text class="disclaimer-strong">不构成任何医疗或营养建议</text>。如有健康问题请咨询专业医师。</text>
        <view class="agree-row" @click="form.disclaimerAccepted = !form.disclaimerAccepted">
          <view class="agree-box" :class="{ on: form.disclaimerAccepted }"><text v-if="form.disclaimerAccepted">✓</text></view>
          <text class="agree-text">我已了解并同意上述免责声明</text>
        </view>
      </view>

      <view class="save-btn" @click="save"><text>保存设置</text></view>
      <view style="height:40rpx;" />
    </scroll-view>
      
    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
</view>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user.js';
import { requireLogin } from '@/utils/guard.js';
import { todayDateKey } from '@/utils/date.js';

const { state, loadHealthProfile, upsertHealthProfileAction, setExerciseCaloriesAction, loadDailyHealth } = useUserStore();

const GENDERS = [
  { id: 'male', label: '👨 男' },
  { id: 'female', label: '👩 女' }
];
const ACTIVITY_OPTIONS = [
  { id: 'sedentary', label: '久坐', desc: '几乎不运动', coef: 1.2 },
  { id: 'light', label: '轻度', desc: '每周1-3次', coef: 1.375 },
  { id: 'moderate', label: '适中', desc: '每周3-5次', coef: 1.55 },
  { id: 'high', label: '高度', desc: '每周6-7次', coef: 1.725 }
];
const BASE_FIELDS = [
  { key: 'age', label: '年龄', unit: '岁', placeholder: '28' },
  { key: 'height', label: '身高', unit: 'cm', placeholder: '175' },
  { key: 'weight', label: '体重', unit: 'kg', placeholder: '68' }
];
const ACTIVITY_FACTORS = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 };

const form = reactive({
  gender: 'male',
  age: '',
  height: '',
  weight: '',
  activityId: 'moderate',
  useManual: false,
  manualBmr: '',
  manualTdee: '',
  gap: '300',
  manualTarget: '',
  exercise: '',
  disclaimerAccepted: false
});

function calcBMR(gender, age, heightCm, weightKg) {
  const w = Number(weightKg) || 0, h = Number(heightCm) || 0, a = Number(age) || 0;
  if (!w || !h || !a) return 0;
  const base = 10 * w + 6.25 * h - 5 * a;
  return Math.round(gender === 'female' ? base - 161 : base + 5);
}

const actOpt = computed(() => ACTIVITY_OPTIONS.find((a) => a.id === form.activityId) || ACTIVITY_OPTIONS[2]);
const autoBmr = computed(() =>
  form.age && form.height && form.weight
    ? calcBMR(form.gender, Number(form.age), Number(form.height), Number(form.weight))
    : (state.healthProfile && state.healthProfile.bmr) || 0
);
const autoTdee = computed(() => (autoBmr.value ? Math.round(autoBmr.value * actOpt.value.coef) : (state.healthProfile && state.healthProfile.tdee) || 0));
const autoTarget = computed(() => (autoTdee.value ? Math.max(0, autoTdee.value - Math.round(Number(form.gap) || 0)) : 0));
const displayTarget = computed(() => (form.manualTarget !== '' ? Math.round(Number(form.manualTarget) || 0) : autoTarget.value));
const totalBurn = computed(() => (autoTdee.value ? autoTdee.value + Math.round(Number(form.exercise) || 0) : 0));

function prefill() {
  const hp = state.healthProfile;
  if (!hp) return;
  if (hp.gender) form.gender = hp.gender;
  if (hp.age) form.age = String(hp.age);
  if (hp.height_cm) form.height = String(hp.height_cm);
  if (hp.weight_kg) form.weight = String(hp.weight_kg);
  if (hp.activity_level) form.activityId = hp.activity_level;
  if (hp.bmr_is_manual && hp.bmr) { form.useManual = true; form.manualBmr = String(hp.bmr); }
  if (hp.tdee_is_manual && hp.tdee) form.manualTdee = String(hp.tdee);
  if (hp.daily_intake_target) form.manualTarget = String(hp.daily_intake_target);
  if (hp.disclaimer_accepted) form.disclaimerAccepted = true;
  const snap = state.dailyHealth;
  if (snap && snap.exercise_calories) form.exercise = String(snap.exercise_calories);
}

const goBack = () => uni.navigateBack();

async function save() {
  if (!form.disclaimerAccepted) {
    uni.showToast({ title: '请先同意免责声明', icon: 'none' });
    return;
  }
  const payload = {
    gender: form.gender,
    age: Math.round(Number(form.age) || 0),
    height_cm: Number(form.height) || 0,
    weight_kg: Number(form.weight) || 0,
    activity_level: form.activityId,
    disclaimer_accepted: true
  };
  if (form.useManual) {
    payload.bmr = Math.round(Number(form.manualBmr) || 0);
    payload.bmr_is_manual = true;
    payload.tdee = Math.round(Number(form.manualTdee) || 0);
    payload.tdee_is_manual = true;
    payload.daily_intake_target = displayTarget.value;
    payload.intake_target_is_manual = true;
  } else {
    payload.bmr_is_manual = false;
    payload.tdee_is_manual = false;
    payload.daily_intake_target = autoTarget.value;
    payload.intake_target_is_manual = false;
  }
  try {
    await upsertHealthProfileAction(payload);
    if (Number(form.exercise) || 0) {
      const dk = (state.dailyHealth && state.dailyHealth.date_key) || todayDateKey();
      await setExerciseCaloriesAction(dk, Math.round(Number(form.exercise) || 0));
    }
    uni.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 600);
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
  }
}

onMounted(async () => {
  if (!requireLogin('/pages/health-settings/health-settings')) return
  await loadHealthProfile().catch(() => {});
  await loadDailyHealth(todayDateKey()).catch(() => {});
  prefill();
});
</script>

<style scoped lang="scss">
.hs-page { min-height: 100vh; background: linear-gradient(180deg, #f0fbf2 0%, #eaf6ff 100%); }
.topbar {
  display: flex; align-items: center; height: 74px; padding: 0 20rpx;
  .back-btn { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; font-size: 36rpx; color: var(--ink); }
  .topbar-title { font-size: 32rpx; font-weight: 800; color: var(--ink); }
  .topbar-spacer { width: 60rpx; }
}
.page-scroll { height: calc(100vh - 74px); }
.card-in-1 { border-radius: 28rpx; }
.block-title { font-size: 26rpx; font-weight: 800; color: var(--ink); display: block; margin-bottom: 16rpx; }

.seg-group { display: flex; gap: 16rpx; flex-wrap: wrap; }
.seg-btn {
  padding: 14rpx 28rpx; border-radius: 20rpx; background: #eef6f0; border: 2rpx solid #d6ebda;
  font-size: 24rpx; font-weight: 600; color: var(--ink3); cursor: pointer; transition: all 0.2s;
  &.active { background: linear-gradient(135deg, #7ed390, #25cc5d); color: #fff; border-color: transparent; }
  &.activity-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx; padding: 14rpx 6rpx; }
}
.activity-label { font-size: 22rpx; font-weight: 700; }
.activity-desc { font-size: 18rpx; opacity: 0.85; line-height: 1.2; }

.field-row { display: flex; align-items: center; gap: 16rpx; padding: 14rpx 0; }
.field-label { font-size: 24rpx; color: var(--ink3); font-weight: 600; width: 96rpx; flex-shrink: 0; }
.field-input {
  flex: 1; height: 72rpx; border-radius: 20rpx; background: #f3faf4; border: 2rpx solid #d6ebda;
  padding: 0 24rpx; font-size: 26rpx; color: var(--ink); text-align: center;
}
.field-unit { font-size: 22rpx; color: var(--ink4); width: 64rpx; flex-shrink: 0; }

.result-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14rpx; }
.result-title { font-size: 24rpx; font-weight: 700; color: var(--ink); }
.result-hint { font-size: 18rpx; color: var(--ink4); }
.result-values { display: flex; gap: 24rpx; }
.result-cell { flex: 1; }
.result-subtitle { font-size: 20rpx; color: var(--ink4); display: block; margin-bottom: 4rpx; }
.result-number { font-size: 40rpx; font-weight: 900; color: var(--ink); letter-spacing: -2rpx;
  &.tdee { color: var(--g5); }
}
.result-unit { font-size: 18rpx; color: var(--ink4); font-weight: 400; margin-left: 4rpx; }

.toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 0 8rpx; cursor: pointer; }
.toggle-label { font-size: 24rpx; color: var(--ink3); font-weight: 600; }

.sw-switch { width: 88rpx; height: 48rpx; border-radius: 28rpx; background: #d8e6dc; position: relative; transition: background 0.22s ease; }
.sw-switch.on { background: linear-gradient(135deg, #7ed390, #25cc5d); }
.sw-knob { width: 36rpx; height: 36rpx; border-radius: 50%; background: #fff; position: absolute; top: 6rpx; left: 6rpx; transition: left 0.22s cubic-bezier(0.34, 1.4, 0.64, 1); box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.12); }
.sw-knob.on { left: 46rpx; }

.disclaimer { margin: 24rpx 32rpx 0; padding: 20rpx 24rpx; border-radius: 20rpx; background: rgba(255, 244, 224, 0.7); border: 2rpx solid #ffe2b0; }
.disclaimer-text { font-size: 20rpx; color: #9a6b1f; line-height: 1.5; }
.disclaimer-strong { font-weight: 800; }
.agree-row { display: flex; align-items: center; gap: 12rpx; margin-top: 14rpx; cursor: pointer; }
.agree-box { width: 36rpx; height: 36rpx; border-radius: 10rpx; background: #fff; border: 2rpx solid #e0c089; display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #fff; }
.agree-box.on { background: linear-gradient(135deg, #7ed390, #25cc5d); border-color: transparent; }
.agree-text { font-size: 22rpx; color: #9a6b1f; font-weight: 600; }

.save-btn {
  margin: 28rpx 32rpx 0; padding: 28rpx; border-radius: 32rpx;
  background: linear-gradient(135deg, #7ed390, #25cc5d); cursor: pointer;
  box-shadow: 0 12rpx 40rpx rgba(37, 204, 93, 0.3), inset 0 2rpx 0 rgba(255,255,255,0.25);
  text-align: center;
  text { font-size: 28rpx; font-weight: 800; color: #fff; }
}
</style>
