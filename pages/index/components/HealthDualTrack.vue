<template>
  <view data-cmp="HealthDualTrack">
    <!-- 卡片主体 -->
    <view class="health-card glass-mid card-in-1" style="margin:10px 16px 0;padding:16px 18px;" @click="showPanel = true">
      <!-- 标题行 -->
      <view class="health-header">
        <text class="health-header-icon">🌿</text>
        <text class="health-header-title">今日健康双轨</text>
        <view class="health-header-hint" @click.stop>
          <text class="hint-dot">ⓘ</text>
          <text class="hint-text">点击设置身体数据</text>
        </view>
      </view>

      <!-- 餐饮轨 -->
      <view class="health-track">
        <view class="track-header">
          <view class="track-label-group">
            <text class="track-icon">🍴</text>
            <text class="track-label">餐饮花费</text>
          </view>
          <view class="track-values">
            <text class="track-value-main">¥{{ FOOD_SPENT }}</text>
            <text class="track-value-sub">/ ¥{{ FOOD_BUDGET }}</text>
          </view>
        </view>
        <view class="track-bar">
          <view class="track-bar-fill" :style="{ width: foodPct * 100 + '%' }">
            <view class="track-bar-shine" />
          </view>
        </view>
        <text class="track-remaining">剩余餐饮预算 ¥{{ FOOD_BUDGET - FOOD_SPENT }}</text>
      </view>

      <!-- 热量轨 -->
      <view class="health-track" style="margin-top:14px;">
        <view class="track-header">
          <view class="track-label-group">
            <text class="track-icon">⚡</text>
            <text class="track-label">热量摄入</text>
          </view>
          <view class="track-values">
            <text class="track-value-main">{{ KCAL_IN }}</text>
            <text class="track-value-sub">/ {{ kcalLimit }} kcal</text>
          </view>
        </view>
        <view class="track-bar">
          <view class="track-bar-fill kcal-fill" :style="{ width: kcalPct * 100 + '%' }">
            <view class="track-bar-shine" />
          </view>
        </view>
        <view class="track-footer">
          <text class="track-kcal-remain" :style="{ color: kcalColor }">
            {{ kcalRemain >= 0 ? `还可摄入 +${kcalRemain}` : `已超 ${Math.abs(kcalRemain)}` }} kcal
          </text>
          <text v-if="displayBmr > 0" class="track-kcal-info">BMR {{ displayBmr }} · TDEE {{ displayTdee }}</text>
        </view>
      </view>
    </view>

    <!-- BMR/TDEE 编辑面板 -->
    <view v-if="showPanel" class="health-overlay" @click="showPanel = false">
      <view class="health-panel" @click.stop>
        <!-- 把手条 -->
        <view class="panel-handle-wrap">
          <view class="panel-handle" />
        </view>

        <!-- 标题 -->
        <view class="panel-header">
          <view class="panel-title-group">
            <view class="panel-title-bar" />
            <text class="panel-title-text">身体数据设置</text>
          </view>
          <view class="panel-close" @click="showPanel = false">
            <text class="panel-close-icon">✕</text>
          </view>
        </view>

        <!-- 性别 -->
        <view class="panel-section">
          <text class="section-label">性别</text>
          <view class="seg-group">
            <view
              v-for="g in ['male', 'female']"
              :key="g"
              class="seg-btn"
              :class="{ active: body.gender === g }"
              @click="body.gender = g"
            >
              {{ g === 'male' ? '👨 男' : '👩 女' }}
            </view>
          </view>
        </view>

        <!-- 年龄/身高/体重 -->
        <view v-for="f in bodyFields" :key="f.key" class="field-row">
          <text class="field-label">{{ f.label }}</text>
          <input
            class="field-input"
            type="number"
            :placeholder="f.placeholder"
            v-model="body[f.key]"
          />
          <text class="field-unit">{{ f.unit }}</text>
        </view>

        <!-- 活动强度 -->
        <view class="panel-section" style="margin-top:4px;">
          <text class="section-label">活动强度</text>
          <view class="seg-group">
            <view
              v-for="a in ACTIVITY_OPTIONS"
              :key="a.id"
              class="seg-btn activity-btn"
              :class="{ active: body.activityId === a.id }"
              @click="body.activityId = a.id"
            >
              <text class="activity-label">{{ a.label }}</text>
              <text class="activity-desc">{{ a.desc }}</text>
            </view>
          </view>
        </view>

        <!-- 自动计算结果 -->
        <view class="result-band">
          <view class="result-header">
            <text class="result-title">自动计算结果（Mifflin-St Jeor）</text>
          </view>
          <view class="result-values">
            <view>
              <text class="result-subtitle">基础代谢 BMR</text>
              <text class="result-number">{{ autoBmr || '—' }}<text class="result-unit">kcal</text></text>
            </view>
            <view>
              <text class="result-subtitle">活动总消耗 TDEE</text>
              <text class="result-number tdee">{{ autoTdee || '—' }}<text class="result-unit">kcal</text></text>
            </view>
          </view>
        </view>

        <!-- 手动覆盖 -->
        <view class="toggle-row">
          <text class="toggle-label">手动覆盖</text>
          <view
            class="toggle-switch"
            :class="{ on: body.useManual }"
            @click="body.useManual = !body.useManual"
          >
            <view class="toggle-knob" :class="{ on: body.useManual }" />
          </view>
        </view>

        <!-- 手动输入 -->
        <view v-if="body.useManual">
          <view v-for="f in manualFields" :key="f.key" class="field-row">
            <text class="field-label">{{ f.label }}</text>
            <input
              class="field-input"
              type="number"
              :placeholder="f.placeholder"
              v-model="body[f.key]"
            />
            <text class="field-unit">{{ f.unit }}</text>
          </view>
        </view>

        <!-- 确认按钮 -->
        <view class="panel-footer">
          <view class="confirm-btn" @click="showPanel = false">
            <text class="confirm-text">确认 · 保存数据</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';

const FOOD_BUDGET = 80;
const FOOD_SPENT = 34;
const KCAL_LIMIT = 2000;
const KCAL_IN = 1240;

const ACTIVITY_OPTIONS = [
  { id: 'sedentary', label: '久坐', coef: 1.2, desc: '几乎不运动' },
  { id: 'light', label: '轻度', coef: 1.375, desc: '每周1-3次' },
  { id: 'moderate', label: '适中', coef: 1.55, desc: '每周3-5次' },
  { id: 'active', label: '高度', coef: 1.725, desc: '每周6-7次' },
  { id: 'veryActive', label: '极高', coef: 1.9, desc: '两次/天' },
];

const body = reactive({
  gender: 'male',
  age: '28',
  height: '175',
  weight: '68',
  activityId: 'moderate',
  manualBmr: '',
  manualTdee: '',
  useManual: false,
});

const bodyFields = [
  { key: 'age', label: '年龄', unit: '岁', placeholder: '28' },
  { key: 'height', label: '身高', unit: 'cm', placeholder: '175' },
  { key: 'weight', label: '体重', unit: 'kg', placeholder: '68' },
];

const manualFields = [
  { key: 'manualBmr', label: 'BMR', unit: 'kcal', placeholder: '0' },
  { key: 'manualTdee', label: 'TDEE', unit: 'kcal', placeholder: '0' },
];

const foodPct = Math.min(FOOD_SPENT / FOOD_BUDGET, 1);

function calcBMR(gender, age, heightCm, weightKg) {
  if (gender === 'male') return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
}

const showPanel = ref(false);

const actOpt = computed(() => ACTIVITY_OPTIONS.find(a => a.id === body.activityId) ?? ACTIVITY_OPTIONS[2]);
const autoBmr = computed(() =>
  body.age && body.height && body.weight
    ? calcBMR(body.gender, Number(body.age), Number(body.height), Number(body.weight))
    : 0
);
const autoTdee = computed(() => (autoBmr.value ? Math.round(autoBmr.value * actOpt.value.coef) : 0));

const displayBmr = computed(() => (body.useManual && body.manualBmr ? Number(body.manualBmr) : autoBmr.value));
const displayTdee = computed(() => (body.useManual && body.manualTdee ? Number(body.manualTdee) : autoTdee.value));

const kcalPct = computed(() =>
  displayTdee.value > 0 ? Math.min(KCAL_IN / displayTdee.value, 1) : Math.min(KCAL_IN / KCAL_LIMIT, 1)
);
const kcalLimit = computed(() => (displayTdee.value > 0 ? displayTdee.value : KCAL_LIMIT));
const kcalRemain = computed(() => kcalLimit.value - KCAL_IN);
const kcalColor = computed(() => (kcalRemain.value >= 0 ? '#25cc5d' : '#ff6b6b'));
</script>

<style scoped>
.health-card { cursor: pointer; }
.health-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
}
.health-header-icon { font-size: 14px; color: #25cc5d; }
.health-header-title { font-size: 13px; font-weight: 700; color: #0f1c14; }
.health-header-hint {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(37, 204, 93, 0.09);
  border-radius: 8px;
  padding: 3px 9px;
}
.hint-dot { font-size: 12px; color: #89e59c; }
.hint-text { font-size: 10px; color: #6b8c7a; font-weight: 500; }

/* 轨条 */
.track-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
.track-label-group { display: flex; align-items: center; gap: 6px; }
.track-icon { font-size: 13px; color: #4fd974; }
.track-label { font-size: 12px; color: #3a5244; font-weight: 500; }
.track-values { display: flex; align-items: baseline; gap: 3px; }
.track-value-main { font-size: 14px; font-weight: 700; color: #0f1c14; }
.track-value-sub { font-size: 11px; color: #9bb8a8; }
.track-bar {
  height: 8px;
  border-radius: 6px;
  background: rgba(194, 242, 200, 0.3);
  overflow: hidden;
  position: relative;
}
.track-bar-fill {
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(90deg, #89e59c, #4fd974);
  position: relative;
  transition: width 0.8s cubic-bezier(0.34, 1.2, 0.64, 1);
}
.track-bar-fill.kcal-fill { background: linear-gradient(90deg, #c2f2c8, #25cc5d); }
.track-bar-shine {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.55);
}
.track-remaining { font-size: 10px; color: #9bb8a8; margin-top: 4px; display: block; }
.track-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
}
.track-kcal-remain { font-size: 10px; font-weight: 500; }
.track-kcal-info { font-size: 10px; color: #9bb8a8; }

/* 面板 */
.health-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 300;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.health-panel {
  width: 375px;
  max-height: 85vh;
  overflow-y: auto;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(242, 252, 242, 0.96));
  border-radius: 24px 24px 0 0;
  backdrop-filter: blur(20px);
  box-shadow: 0 -8px 40px rgba(37, 204, 93, 0.12);
}
.panel-handle-wrap { display: flex; justify-content: center; padding: 12px 0 8px; }
.panel-handle { width: 38px; height: 4px; border-radius: 3px; background: rgba(194, 242, 200, 0.8); }
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px 14px;
}
.panel-title-group { display: flex; align-items: center; gap: 8px; }
.panel-title-bar { width: 4px; height: 20px; border-radius: 3px; background: linear-gradient(180deg, #4fd974, #25cc5d); }
.panel-title-text { font-size: 16px; font-weight: 800; color: #0f1c14; }
.panel-close {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(242, 252, 242, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.panel-close-icon { font-size: 12px; color: #6b8c7a; }

.panel-section { padding: 0 20px 12px; }
.section-label { font-size: 11px; color: #9bb8a8; font-weight: 600; display: block; margin-bottom: 8px; }
.seg-group { display: flex; gap: 10px; }
.seg-btn {
  padding: 8px 16px;
  border-radius: 12px;
  background: rgba(242, 252, 242, 0.7);
  border: 1px solid rgba(194, 242, 200, 0.4);
  font-size: 12px;
  font-weight: 600;
  color: #6b8c7a;
  cursor: pointer;
  transition: all 0.2s;
}
.seg-btn.active {
  background: linear-gradient(135deg, #4fd974, #25cc5d);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(37, 204, 93, 0.2);
}
.seg-btn.activity-btn { flex: 1; flex-direction: column; gap: 2px; display: flex; align-items: center; padding: 8px 4px; }
.activity-label { font-size: 11px; font-weight: 700; }
.activity-desc { font-size: 9px; opacity: 0.8; line-height: 1.2; }

.field-row {
  display: flex;
  align-items: center;
  padding: 8px 20px;
  gap: 10px;
}
.field-label { font-size: 12px; color: #6b8c7a; font-weight: 600; width: 36px; flex-shrink: 0; }
.field-input {
  flex: 1;
  height: 36px;
  border-radius: 10px;
  background: rgba(242, 252, 242, 0.8);
  border: 1px solid rgba(194, 242, 200, 0.4);
  padding: 0 12px;
  font-size: 13px;
  color: #0f1c14;
  text-align: center;
}
.field-unit { font-size: 11px; color: #9bb8a8; flex-shrink: 0; width: 28px; }

.result-band {
  margin: 10px 20px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(242, 252, 242, 0.6);
  border: 1px solid rgba(194, 242, 200, 0.3);
}
.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.result-title { font-size: 11px; color: #6b8c7a; font-weight: 600; }
.result-values { display: flex; gap: 18px; }
.result-subtitle { font-size: 10px; color: #9bb8a8; display: block; margin-bottom: 2px; }
.result-number { font-size: 22px; font-weight: 900; color: #0f1c14; letter-spacing: -0.8; }
.result-number.tdee { color: #25cc5d; }
.result-unit { font-size: 10px; color: #9bb8a8; font-weight: 400; margin-left: 2px; }

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 0;
}
.toggle-label { font-size: 12px; color: #6b8c7a; font-weight: 600; }
.toggle-switch {
  width: 44px;
  height: 24px;
  border-radius: 14px;
  background: rgba(194, 242, 200, 0.5);
  position: relative;
  cursor: pointer;
  transition: background 0.22s ease;
  border: 1px solid rgba(194, 242, 200, 0.55);
}
.toggle-switch.on { background: linear-gradient(135deg, #4fd974, #25cc5d); }
.toggle-knob {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: left 0.22s cubic-bezier(0.34, 1.4, 0.64, 1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}
.toggle-knob.on { left: 22px; }

.panel-footer { padding: 20px 20px 30px; }
.confirm-btn {
  width: 100%;
  padding: 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, #4fd974, #25cc5d);
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(37, 204, 93, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  display: flex;
  justify-content: center;
}
.confirm-text { font-size: 14px; font-weight: 800; color: #fff; }
</style>
