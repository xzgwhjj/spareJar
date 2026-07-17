<template>
  <view data-cmp="HealthDualTrack">
    <view class="health-track-container">
      <view class="food-body">
        <!-- 左侧：金额卡 + 插画 -->
        <view class="food-left">
          <view class="food-amount-card">
            <text class="food-amount-symbol">餐饮花费</text>
            <text class="food-amount-num"><text class="food-amount-symbol">¥</text>{{ FOOD_SPENT }}</text>
          </view>
          <!-- 待：插画占位：小狗端碗 -->
          <view class="food-illust">
            <view class="illust-dog">
              <text class="dog-emoji">🐶</text>
            </view>
            <view class="illust-bowl">
              <view class="bowl-rim" />
              <view class="bowl-body" />
            </view>
          </view>
        </view>
      </view>
      <!-- 卡片主体 -->
      <view class="health-card glass-mid card-in-1" @click="showPanel = true">
        <!-- 标题行 -->
        <view class="health-header">
          <text class="health-header-icon"></text>
          <text class="health-header-title"></text>
          <view class="health-header-hint" @click.stop>
            <text class="hint-dot">ⓘ</text>
            <text class="hint-text">点击设置身体数据</text>
          </view>
        </view>

        <!-- 热量轨 -->
        <view class="health-track" style="margin-top:28rpx;">
          <view class="track-header">
            <view class="track-label-group">
              <!-- 待：设计一个热量摄入的图标 -->
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
            <view v-for="g in ['male', 'female']" :key="g" class="seg-btn" :class="{ active: body.gender === g }"
              @click="body.gender = g">
              {{ g === 'male' ? '👨 男' : '👩 女' }}
            </view>
          </view>
        </view>

        <!-- 年龄/身高/体重 -->
        <view v-for="f in bodyFields" :key="f.key" class="field-row">
          <text class="field-label">{{ f.label }}</text>
          <input class="field-input" type="number" :placeholder="f.placeholder" v-model="body[f.key]" />
          <text class="field-unit">{{ f.unit }}</text>
        </view>

        <!-- 活动强度 -->
        <view class="panel-section" style="margin-top:8rpx;">
          <text class="section-label">活动强度</text>
          <view class="seg-group">
            <view v-for="a in ACTIVITY_OPTIONS" :key="a.id" class="seg-btn activity-btn"
              :class="{ active: body.activityId === a.id }" @click="body.activityId = a.id">
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
          <view class="toggle-switch" :class="{ on: body.useManual }" @click="body.useManual = !body.useManual">
            <view class="toggle-knob" :class="{ on: body.useManual }" />
          </view>
        </view>

        <!-- 手动输入 -->
        <view v-if="body.useManual">
          <view v-for="f in manualFields" :key="f.key" class="field-row">
            <text class="field-label">{{ f.label }}</text>
            <input class="field-input" type="number" :placeholder="f.placeholder" v-model="body[f.key]" />
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
const kcalColor = computed(() => (kcalRemain.value >= 0 ? 'var(--g5)' : 'var(--red-soft)'));
</script>

<style scoped lang="scss">
@mixin flex-center($dir: row) {
  display: flex;
  flex-direction: $dir;
  align-items: center;
  justify-content: center;
}

.health-track-container {
  position: relative;
  margin: 30rpx 32rpx 0;
  padding: 32rpx 36rpx;
  height: 400rpx;
}

.health-card {
  --g2-rgb: 194, 242, 200;
  cursor: pointer;
  position: absolute;
  right: 0;
  top: 0;
}

.health-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 28rpx;

  &-icon {
    font-size: 28rpx;
    color: var(--g5);
  }

  &-title {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--ink);
  }

  &-hint {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8rpx;
    background: rgba(var(--brand-rgb), 0.09);
    border-radius: 16rpx;
    padding: 6rpx 18rpx;

    .hint-dot {
      font-size: 24rpx;
      color: var(--g3);
    }

    .hint-text {
      font-size: 20rpx;
      color: var(--ink3);
      font-weight: 500;
    }
  }
}

/* ── 餐饮轨（新布局：金额卡 + 插画 + 信息卡）── */
.food-track-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.food-label-group {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.food-icon {
  font-size: 26rpx;
}

.food-label {
  font-size: 24rpx;
  color: var(--ink2);
  font-weight: 600;
}

.food-values {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.food-value-main {
  font-size: 26rpx;
  font-weight: 800;
  color: var(--ink);
}

.food-value-sub {
  font-size: 20rpx;
  color: var(--ink4);
}

.food-body {
  display: flex;
  align-items: flex-end;
  position: absolute;
  top: 0;
  left: 0;
}

.food-left {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

/* 金额卡片：圆角正方形，数值"落入碗中" */
.food-amount-card {
  width: 136rpx;
  height: 136rpx;
  border-radius: 28rpx;
  background: linear-gradient(145deg, rgba(var(--brand-rgb), 0.13), rgba(var(--brand-rgb), 0.06));
  border: 3rpx solid rgba(var(--brand-rgb), 0.22);
  box-shadow: 0 8rpx 32rpx rgba(var(--brand-rgb), 0.12), inset 0 2rpx 0 rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 4;
}

.food-amount-symbol {
  font-size: 24rpx;
  color: var(--ink3);
  font-weight: 700;
  line-height: 1;
}

.food-amount-num {
  font-size: 52rpx;
  font-weight: 900;
  color: var(--ink);
  letter-spacing: -3rpx;
  line-height: 1;
  margin-top: 2rpx;
}

/* 插画占位：小狗 + 碗 */
.food-illust {
  position: relative;
  margin-top: -10rpx;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.illust-dog {
  position: relative;
  z-index: 2;
  margin-bottom: -4rpx;
}

.dog-emoji {
  font-size: 72rpx;
  line-height: 1;
  display: block;
  filter: drop-shadow(0 4rpx 6rpx rgba(0, 0, 0, 0.12));
}

.illust-bowl {
  position: relative;
  z-index: 1;
  width: 176rpx;
}

.bowl-rim {
  width: 176rpx;
  height: 28rpx;
  border-radius: 50%;
  background: linear-gradient(180deg, #e8c99b 0%, #d4a574 100%);
  border: 3rpx solid #c49464;
  position: relative;
  z-index: 3;
  margin-bottom: -4rpx;
}

.bowl-body {
  width: 160rpx;
  height: 64rpx;
  margin: 0 auto;
  border-radius: 0 0 64rpx 64rpx;
  background: linear-gradient(180deg, #d4a574 0%, #b88454 100%);
  border: 3rpx solid #b88454;
  border-top: none;
  box-shadow: inset 0 -8rpx 16rpx rgba(0, 0, 0, 0.1);
}

/* 右侧信息卡：与插画区域轻微重叠 */
.food-info-card {
  position: relative;
  z-index: 5;
  margin-left: -16rpx;
  margin-bottom: 14rpx;
  padding: 18rpx 26rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(16rpx);
  -webkit-backdrop-filter: blur(16rpx);
  border: 2rpx solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 6rpx 28rpx rgba(0, 0, 0, 0.06), 0 2rpx 8rpx rgba(var(--brand-rgb), 0.05);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  flex-shrink: 0;
}

.food-info-item {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.food-info-label {
  font-size: 20rpx;
  color: var(--ink4);
  font-weight: 500;
  min-width: 96rpx;
}

.food-info-value {
  font-size: 24rpx;
  font-weight: 800;
  color: var(--ink);
}

.food-info-remain {
  color: var(--g5);
}

.food-info-divider {
  height: 2rpx;
  background: rgba(var(--brand-rgb), 0.12);
  border-radius: 1rpx;
}

/* ── 热量轨进度条 ── */
.track-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14rpx;
}

.track-label-group {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.track-icon {
  font-size: 26rpx;
  color: var(--g4);
}

.track-label {
  font-size: 24rpx;
  color: var(--ink2);
  font-weight: 500;
}

.track-values {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
}

.track-value-main {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink);
}

.track-value-sub {
  font-size: 22rpx;
  color: var(--ink4);
}

.track-bar {
  height: 16rpx;
  border-radius: 12rpx;
  background: rgba(var(--g2-rgb), 0.3);
  overflow: hidden;
  position: relative;
}

.track-bar-fill {
  height: 100%;
  border-radius: 12rpx;
  background: linear-gradient(90deg, var(--g3), var(--g4));
  position: relative;
  transition: width 0.8s cubic-bezier(0.34, 1.2, 0.64, 1);
}

.track-bar-fill.kcal-fill {
  background: linear-gradient(90deg, var(--g2), var(--g5));
}

.track-bar-shine {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 6rpx;
  border-radius: 6rpx;
  background: rgba(255, 255, 255, 0.55);
}

.track-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 8rpx;
}

.track-kcal-remain {
  font-size: 20rpx;
  font-weight: 500;
}

.track-kcal-info {
  font-size: 20rpx;
  color: var(--ink4);
}

/* ========== 身体数据编辑面板 ========== */
.health-overlay {
  --g0-rgb: 242, 252, 242;
  --g2-rgb: 194, 242, 200;

  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 300;
  display: flex;
  align-items: flex-end;
  justify-content: center;

  .health-panel {
    width: 750rpx;
    max-height: 85vh;
    overflow-y: auto;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(var(--g0-rgb), 0.96));
    border-radius: 48rpx 48rpx 0 0;
    backdrop-filter: blur(40rpx);
    box-shadow: 0 -16rpx 80rpx rgba(var(--brand-rgb), 0.12);
  }

  .panel-handle-wrap {
    display: flex;
    justify-content: center;
    padding: 24rpx 0 16rpx;
  }

  .panel-handle {
    width: 76rpx;
    height: 8rpx;
    border-radius: 6rpx;
    background: rgba(var(--g2-rgb), 0.8);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40rpx 28rpx;
  }

  .panel-title-group {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  .panel-title-bar {
    width: 8rpx;
    height: 40rpx;
    border-radius: 6rpx;
    background: linear-gradient(180deg, var(--g4), var(--g5));
  }

  .panel-title-text {
    font-size: 32rpx;
    font-weight: 800;
    color: var(--ink);
  }

  .panel-close {
    width: 60rpx;
    height: 60rpx;
    border-radius: 50%;
    background: rgba(var(--g0-rgb), 0.8);
    @include flex-center;
    cursor: pointer;
  }

  .panel-close-icon {
    font-size: 24rpx;
    color: var(--ink3);
  }

  .panel-section {
    padding: 0 40rpx 24rpx;
  }

  .section-label {
    font-size: 22rpx;
    color: var(--ink4);
    font-weight: 600;
    display: block;
    margin-bottom: 16rpx;
  }

  .seg-group {
    display: flex;
    gap: 20rpx;
  }

  .seg-btn {
    padding: 16rpx 32rpx;
    border-radius: 24rpx;
    background: rgba(var(--g0-rgb), 0.7);
    border: 2rpx solid rgba(var(--g2-rgb), 0.4);
    font-size: 24rpx;
    font-weight: 600;
    color: var(--ink3);
    cursor: pointer;
    transition: all 0.2s;

    &.active {
      background: linear-gradient(135deg, var(--g4), var(--g5));
      color: #fff;
      border-color: transparent;
      box-shadow: 0 8rpx 24rpx rgba(var(--brand-rgb), 0.2);
    }

    &.activity-btn {
      flex: 1;
      flex-direction: column;
      gap: 4rpx;
      display: flex;
      align-items: center;
      padding: 16rpx 8rpx;
    }
  }

  .activity-label {
    font-size: 22rpx;
    font-weight: 700;
  }

  .activity-desc {
    font-size: 18rpx;
    opacity: 0.8;
    line-height: 1.2;
  }

  .field-row {
    display: flex;
    align-items: center;
    padding: 16rpx 40rpx;
    gap: 20rpx;
  }

  .field-label {
    font-size: 24rpx;
    color: var(--ink3);
    font-weight: 600;
    width: 72rpx;
    flex-shrink: 0;
  }

  .field-input {
    flex: 1;
    height: 72rpx;
    border-radius: 20rpx;
    background: rgba(var(--g0-rgb), 0.8);
    border: 2rpx solid rgba(var(--g2-rgb), 0.4);
    padding: 0 24rpx;
    font-size: 26rpx;
    color: var(--ink);
    text-align: center;
  }

  .field-unit {
    font-size: 22rpx;
    color: var(--ink4);
    flex-shrink: 0;
    width: 56rpx;
  }

  .result-band {
    margin: 20rpx 40rpx;
    padding: 28rpx 32rpx;
    border-radius: 28rpx;
    background: rgba(var(--g0-rgb), 0.6);
    border: 2rpx solid rgba(var(--g2-rgb), 0.3);
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;
  }

  .result-title {
    font-size: 22rpx;
    color: var(--ink3);
    font-weight: 600;
  }

  .result-values {
    display: flex;
    gap: 36rpx;
  }

  .result-subtitle {
    font-size: 20rpx;
    color: var(--ink4);
    display: block;
    margin-bottom: 4rpx;
  }

  .result-number {
    font-size: 44rpx;
    font-weight: 900;
    color: var(--ink);
    letter-spacing: -2rpx;

    &.tdee {
      color: var(--g5);
    }
  }

  .result-unit {
    font-size: 20rpx;
    color: var(--ink4);
    font-weight: 400;
    margin-left: 4rpx;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28rpx 40rpx 0;
  }

  .toggle-label {
    font-size: 24rpx;
    color: var(--ink3);
    font-weight: 600;
  }

  .toggle-switch {
    width: 88rpx;
    height: 48rpx;
    border-radius: 28rpx;
    background: rgba(var(--g2-rgb), 0.5);
    position: relative;
    cursor: pointer;
    transition: background 0.22s ease;
    border: 2rpx solid rgba(var(--g2-rgb), 0.55);

    &.on {
      background: linear-gradient(135deg, var(--g4), var(--g5));
    }
  }

  .toggle-knob {
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: #fff;
    position: absolute;
    top: 4rpx;
    left: 4rpx;
    transition: left 0.22s cubic-bezier(0.34, 1.4, 0.64, 1);
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.12);

    &.on {
      left: 44rpx;
    }
  }

  .panel-footer {
    padding: 40rpx 40rpx 60rpx;
  }

  .confirm-btn {
    width: 100%;
    padding: 28rpx;
    border-radius: 32rpx;
    background: linear-gradient(135deg, var(--g4), var(--g5));
    cursor: pointer;
    box-shadow: 0 12rpx 40rpx rgba(var(--brand-rgb), 0.3), inset 0 2rpx 0 rgba(255, 255, 255, 0.25);
    @include flex-center;
  }

  .confirm-text {
    font-size: 28rpx;
    font-weight: 800;
    color: #fff;
  }
}
</style>
