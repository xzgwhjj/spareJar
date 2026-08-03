<template>
  <view data-cmp="HealthDualTrack">
    <view v-if="!mealEnabled" class="health-enable glass-mid card-in-1" @click="goEnable">
      <text class="enable-icon">🍽️</text>
      <view class="enable-info">
        <text class="enable-title">餐饮轻记录</text>
        <text class="enable-sub">开启后可记录餐次与热量，钱与热量双线追踪</text>
      </view>
      <text class="enable-arrow">›</text>
    </view>

    <block v-else>
      <view class="health-track-container">
        <view class="food-body">
          <view class="food-left">
            <view class="food-amount-card">
              <text class="food-amount-symbol">今日餐饮</text>
              <text class="food-amount-num">¥{{ formatFen(foodSpentFen) }}</text>
            </view>
            <view class="food-illust">
              <view class="illust-dog"><text class="dog-emoji">🐶</text></view>
              <view class="illust-bowl">
                <view class="bowl-rim" />
                <view class="bowl-body" />
              </view>
            </view>
          </view>
        </view>

        <view class="health-card glass-mid card-in-1" @click="showPanel = true">
          <view class="health-header">
            <text class="health-header-icon">🔥</text>
            <text class="health-header-title">热量摄入</text>
            <view class="health-header-hint" @click.stop="goHealthSettings">
              <text class="hint-dot">ⓘ</text>
              <text class="hint-text">身体数据</text>
            </view>
          </view>

          <view class="track-header">
            <view class="track-label-group">
              <text class="track-icon">⚡</text>
              <text class="track-label">已摄入 / 目标</text>
            </view>
            <view class="track-values">
              <text class="track-value-main">{{ kcalIn }}</text>
              <text class="track-value-sub">/ {{ kcalTarget || '—' }} kcal</text>
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
            <text v-if="bmr > 0" class="track-kcal-info">BMR {{ bmr }} · TDEE {{ tdee }}</text>
          </view>

          <view v-if="fatLoss && tdee > 0" class="gap-row" @click="showPanel = true">
            <text class="gap-label">今日缺口</text>
            <text class="gap-value" :style="{ color: gap >= 0 ? 'var(--g5)' : 'var(--red-soft)' }">
              {{ gap >= 0 ? '+' : '' }}{{ gap }} kcal
            </text>
            <text class="gap-sub">消耗 {{ totalBurn }} − 摄入 {{ kcalIn }}</text>
          </view>
        </view>
      </view>

      <!-- 今日餐次卡片 -->
      <view v-if="meals.length" class="meal-list">
        <view
          v-for="m in meals"
          :key="m._id"
          class="meal-card glass-thin"
          @click="openMeal(m)"
        >
          <view class="meal-collage">
            <view
              v-for="(f, i) in collage(m)"
              :key="i"
              class="collage-item"
            >
              <image v-if="f.sticker_image_url" :src="f.sticker_image_url" mode="aspectFill" class="collage-img" />
              <text v-else class="collage-emoji">{{ f.emoji || '🍴' }}</text>
            </view>
            <view v-if="m.food_items && m.food_items.length > 4" class="collage-more">+{{ m.food_items.length - 4 }}</view>
          </view>
          <view class="meal-info">
            <text class="meal-type">{{ mealTypeLabel(m.meal_type) }}</text>
            <text class="meal-kcal">{{ m.confirmed_calories || 0 }} kcal</text>
            <text class="meal-amount">¥{{ formatFen((m.transaction && m.transaction.amount) || 0) }}</text>
          </view>
        </view>
      </view>

      <!-- 周视图 -->
      <view v-if="weekly" class="week-card glass-thin">
        <view class="week-header">
          <text class="week-title">近 7 日</text>
          <text class="week-sum">均摄入 {{ weekly.avg_intake }} · 均缺口 {{ weekly.avg_gap >= 0 ? '+' : '' }}{{ weekly.avg_gap }} · 累计 {{ weekly.cumulative_gap >= 0 ? '+' : '' }}{{ weekly.cumulative_gap }}</text>
        </view>
        <view class="week-bars">
          <view v-for="d in weekly.days" :key="d.date_key" class="week-col">
            <view class="week-bar-wrap">
              <view class="week-bar" :style="{ height: weekHeight(d) + 'rpx', background: d.calorie_gap >= 0 ? 'linear-gradient(180deg,#7ed390,#25cc5d)' : 'linear-gradient(180deg,#ff9a9a,#ff6b6b)' }" />
            </view>
            <text class="week-day">{{ weekDayLabel(d.date_key) }}</text>
          </view>
        </view>
      </view>

      <view class="health-disclaimer">热量为自填/估算，仅供参考，非医疗或营养建议</view>
    </block>

    <!-- 身体数据编辑面板 -->
    <view v-if="showPanel" class="health-overlay" @click="showPanel = false">
      <view class="health-panel" @click.stop>
        <view class="panel-handle-wrap"><view class="panel-handle" /></view>
        <view class="panel-header">
          <view class="panel-title-group">
            <view class="panel-title-bar" />
            <text class="panel-title-text">身体数据设置</text>
          </view>
          <view class="panel-close" @click="showPanel = false"><text class="panel-close-icon">✕</text></view>
        </view>
        <view class="panel-tip">
          <text>当前 BMR {{ bmr || '—' }} · TDEE {{ tdee || '—' }} kcal。点击前往「身体数据设置」可调整目标与运动消耗。</text>
        </view>
        <view class="panel-footer">
          <view class="confirm-btn" @click="goHealthSettings"><text class="confirm-text">前往设置</text></view>
        </view>
      </view>
    </view>
      
</view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useUserStore } from '@/stores/user.js';
import { formatFen } from '@/utils/money.js';
import { todayDateKey } from '@/utils/date.js';

const { state, loadMealsByDate, loadDailyHealth } = useUserStore();

const showPanel = ref(false);
const meals = ref([]);

const mealEnabled = computed(() => !!(state.settings && state.settings.meal_tracking_enabled));
const fatLoss = computed(() => !!(state.settings && state.settings.fat_loss_mode_enabled));

const foodCatId = computed(() => {
  const c = (state.categories || []).find((x) => x.name === '餐饮' && x.type === 'expense');
  return c ? c._id : null;
});
const foodSpentFen = computed(() => {
  const cid = foodCatId.value;
  if (!cid) return 0;
  const dk = todayDateKey();
  const txs = (state.dashboard && state.dashboard.transactions) || [];
  return txs
    .filter((t) => t.type === 'expense' && t.date_key === dk && t.category_id === cid && !t.deleted_at)
    .reduce((s, t) => s + (t.amount || 0), 0);
});

const daily = computed(() => state.dailyHealth || null);
const kcalIn = computed(() => (daily.value ? daily.value.intake_total || 0 : 0));
const kcalTarget = computed(() => (daily.value && daily.value.intake_target ? daily.value.intake_target : (state.healthProfile && state.healthProfile.daily_intake_target) || 0));
const kcalRemain = computed(() => (kcalTarget.value > 0 ? kcalTarget.value - kcalIn.value : 0));
const kcalPct = computed(() => (kcalTarget.value > 0 ? Math.min(kcalIn.value / kcalTarget.value, 1) : 0));
const kcalColor = computed(() => (kcalRemain.value >= 0 ? 'var(--g5)' : 'var(--red-soft)'));

const bmr = computed(() => (state.healthProfile && state.healthProfile.bmr) || 0);
const tdee = computed(() => (state.healthProfile && state.healthProfile.tdee) || 0);
const gap = computed(() => (daily.value && daily.value.calorie_gap != null ? daily.value.calorie_gap : 0));
const totalBurn = computed(() => (daily.value ? daily.value.total_burn || 0 : tdee.value));

const weekly = computed(() => state.weeklyHealth || null);

function mealTypeLabel(t) {
  return { breakfast: '🌅 早餐', lunch: '☀️ 午餐', dinner: '🌙 晚餐', snack: '🍎 加餐' }[t] || '餐饮';
}
function weekDayLabel(dk) {
  const d = new Date(dk + 'T00:00:00');
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
}
function weekHeight(d) {
  const max = Math.max(40, ...(weekly.value ? weekly.value.days.map((x) => Math.abs(x.calorie_gap || 0)) : [40]));
  const v = Math.abs(d.calorie_gap || 0);
  return Math.max(8, Math.round((v / max) * 120));
}
function collage(m) {
  return (m.food_items || []).slice(0, 4).map((f) => ({
    sticker_image_url: f.sticker_image_url || null,
    emoji: '🍴'
  }));
}

async function refreshMeals() {
  if (!mealEnabled.value) { meals.value = []; return; }
  try {
    const r = await loadMealsByDate(todayDateKey());
    meals.value = (r && r.meals) || [];
  } catch (_e) { meals.value = []; }
}

const goEnable = () => uni.navigateTo({ url: '/pages/profile/profile' });
const goHealthSettings = () => uni.navigateTo({ url: '/pages/health-settings/health-settings' });
const openMeal = (m) => uni.navigateTo({ url: `/pages/meal-detail/meal-detail?id=${m._id}` });

onMounted(refreshMeals);
watch(() => state.dashboard, refreshMeals, { deep: true });
watch(mealEnabled, refreshMeals);
// 进入前台/每日刷新时重载热量快照
watch(() => state.dailyHealth, () => {}, { deep: true });
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
  min-height: 320rpx;
}
.health-card {
  --g2-rgb: 194, 242, 200;
  cursor: pointer;
  position: absolute;
  right: 0;
  top: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 28rpx 32rpx;
}
.health-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 24rpx; }
.health-header-icon { font-size: 28rpx; color: var(--g5); }
.health-header-title { font-size: 26rpx; font-weight: 700; color: var(--ink); }
.health-header-hint {
  margin-left: auto; display: flex; align-items: center; gap: 8rpx;
  background: rgba(var(--brand-rgb), 0.09); border-radius: 16rpx; padding: 6rpx 18rpx;
  .hint-dot { font-size: 24rpx; color: var(--g3); }
  .hint-text { font-size: 20rpx; color: var(--ink3); font-weight: 500; }
}
.food-body { display: flex; align-items: flex-end; position: absolute; top: 0; left: 0; z-index: 3; }
.food-left { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.food-amount-card {
  width: 150rpx; height: 150rpx; border-radius: 28rpx;
  background: linear-gradient(145deg, rgba(var(--brand-rgb), 0.13), rgba(var(--brand-rgb), 0.06));
  border: 3rpx solid rgba(var(--brand-rgb), 0.22);
  box-shadow: 0 8rpx 32rpx rgba(var(--brand-rgb), 0.12), inset 0 2rpx 0 rgba(255,255,255,0.7);
  display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; z-index: 4;
}
.food-amount-symbol { font-size: 20rpx; color: var(--ink3); font-weight: 700; line-height: 1; }
.food-amount-num { font-size: 40rpx; font-weight: 900; color: var(--ink); line-height: 1.1; margin-top: 4rpx; }
.food-illust { position: relative; margin-top: -10rpx; z-index: 1; display: flex; flex-direction: column; align-items: center; }
.illust-dog { position: relative; z-index: 2; margin-bottom: -4rpx; }
.dog-emoji { font-size: 72rpx; line-height: 1; display: block; filter: drop-shadow(0 4rpx 6rpx rgba(0,0,0,0.12)); }
.illust-bowl { position: relative; z-index: 1; width: 176rpx; }
.bowl-rim { width: 176rpx; height: 28rpx; border-radius: 50%; background: linear-gradient(180deg, #e8c99b 0%, #d4a574 100%); border: 3rpx solid #c49464; position: relative; z-index: 3; margin-bottom: -4rpx; }
.bowl-body { width: 160rpx; height: 64rpx; margin: 0 auto; border-radius: 0 0 64rpx 64rpx; background: linear-gradient(180deg, #d4a574 0%, #b88454 100%); border: 3rpx solid #b88454; border-top: none; box-shadow: inset 0 -8rpx 16rpx rgba(0,0,0,0.1); }

.track-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.track-label-group { display: flex; align-items: center; gap: 12rpx; }
.track-icon { font-size: 26rpx; color: var(--g4); }
.track-label { font-size: 24rpx; color: var(--ink2); font-weight: 500; }
.track-values { display: flex; align-items: baseline; gap: 6rpx; }
.track-value-main { font-size: 28rpx; font-weight: 700; color: var(--ink); }
.track-value-sub { font-size: 22rpx; color: var(--ink4); }
.track-bar { height: 16rpx; border-radius: 12rpx; background: rgba(var(--g2-rgb), 0.3); overflow: hidden; position: relative; }
.track-bar-fill { height: 100%; border-radius: 12rpx; background: linear-gradient(90deg, var(--g3), var(--g4)); position: relative; transition: width 0.8s cubic-bezier(0.34,1.2,0.64,1); }
.track-bar-fill.kcal-fill { background: linear-gradient(90deg, var(--g2), var(--g5)); }
.track-bar-shine { position: absolute; top: 0; left: 0; width: 100%; height: 6rpx; border-radius: 6rpx; background: rgba(255,255,255,0.55); }
.track-footer { display: flex; justify-content: space-between; margin-top: 8rpx; }
.track-kcal-remain { font-size: 22rpx; font-weight: 700; }
.track-kcal-info { font-size: 20rpx; color: var(--ink4); }

.gap-row {
  margin-top: 20rpx; padding-top: 18rpx; border-top: 2rpx solid rgba(var(--g2-rgb), 0.4);
  display: flex; align-items: center; gap: 16rpx; cursor: pointer;
  .gap-label { font-size: 22rpx; color: var(--ink3); font-weight: 600; }
  .gap-value { font-size: 28rpx; font-weight: 800; }
  .gap-sub { font-size: 20rpx; color: var(--ink4); margin-left: auto; }
}

.meal-list { margin: 20rpx 32rpx 0; display: flex; flex-direction: column; gap: 16rpx; }
.meal-card { display: flex; align-items: center; gap: 20rpx; padding: 20rpx 24rpx; border-radius: 24rpx; cursor: pointer; }
.meal-collage { display: flex; }
.collage-item {
  width: 64rpx; height: 64rpx; border-radius: 16rpx; margin-left: -16rpx; overflow: hidden;
  background: #eef6f0; border: 3rpx solid #fff; display: flex; align-items: center; justify-content: center;
  &:first-child { margin-left: 0; }
}
.collage-img { width: 100%; height: 100%; }
.collage-emoji { font-size: 32rpx; }
.collage-more { width: 64rpx; height: 64rpx; border-radius: 16rpx; margin-left: -16rpx; background: rgba(var(--g2-rgb),0.6); border: 3rpx solid #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; color: var(--g5); }
.meal-info { display: flex; flex-direction: column; }
.meal-type { font-size: 24rpx; font-weight: 700; color: var(--ink); }
.meal-kcal { font-size: 22rpx; color: var(--g5); font-weight: 600; }
.meal-amount { font-size: 20rpx; color: var(--ink4); }

.week-card { margin: 20rpx 32rpx 0; padding: 24rpx 28rpx; border-radius: 24rpx; }
.week-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16rpx; }
.week-title { font-size: 24rpx; font-weight: 700; color: var(--ink); }
.week-sum { font-size: 18rpx; color: var(--ink4); }
.week-bars { display: flex; align-items: flex-end; gap: 10rpx; height: 140rpx; }
.week-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.week-bar-wrap { flex: 1; display: flex; align-items: flex-end; width: 100%; }
.week-bar { width: 100%; border-radius: 10rpx 10rpx 4rpx 4rpx; transition: height 0.6s ease; }
.week-day { font-size: 18rpx; color: var(--ink4); }

.health-disclaimer { margin: 16rpx 32rpx 0; font-size: 18rpx; color: var(--ink4); text-align: center; line-height: 1.4; }

.health-enable {
  margin: 30rpx 32rpx 0; padding: 28rpx 32rpx; border-radius: 28rpx; display: flex; align-items: center; gap: 20rpx; cursor: pointer;
  .enable-icon { font-size: 40rpx; }
  .enable-info { flex: 1; display: flex; flex-direction: column; }
  .enable-title { font-size: 26rpx; font-weight: 800; color: var(--ink); }
  .enable-sub { font-size: 20rpx; color: var(--ink4); margin-top: 4rpx; }
  .enable-arrow { font-size: 32rpx; color: var(--g5); }
}

.health-overlay {
  --g0-rgb: 242, 252, 242; --g2-rgb: 194, 242, 200;
  position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 300;
  display: flex; align-items: flex-end; justify-content: center;
  .health-panel {
    width: 750rpx; max-height: 85vh; overflow-y: auto;
    background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(var(--g0-rgb),0.96));
    border-radius: 48rpx 48rpx 0 0; box-shadow: 0 -16rpx 80rpx rgba(var(--brand-rgb),0.12);
  }
  .panel-handle-wrap { display: flex; justify-content: center; padding: 24rpx 0 16rpx; }
  .panel-handle { width: 76rpx; height: 8rpx; border-radius: 6rpx; background: rgba(var(--g2-rgb),0.8); }
  .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 0 40rpx 24rpx; }
  .panel-title-group { display: flex; align-items: center; gap: 16rpx; }
  .panel-title-bar { width: 8rpx; height: 40rpx; border-radius: 6rpx; background: linear-gradient(180deg, var(--g4), var(--g5)); }
  .panel-title-text { font-size: 32rpx; font-weight: 800; color: var(--ink); }
  .panel-close { width: 60rpx; height: 60rpx; border-radius: 50%; background: rgba(var(--g0-rgb),0.8); @include flex-center; cursor: pointer; }
  .panel-close-icon { font-size: 24rpx; color: var(--ink3); }
  .panel-tip { margin: 0 40rpx 16rpx; font-size: 22rpx; color: var(--ink3); line-height: 1.5; }
  .panel-footer { padding: 24rpx 40rpx 60rpx; }
  .confirm-btn {
    width: 100%; padding: 28rpx; border-radius: 32rpx;
    background: linear-gradient(135deg, var(--g4), var(--g5)); cursor: pointer;
    box-shadow: 0 12rpx 40rpx rgba(var(--brand-rgb),0.3), inset 0 2rpx 0 rgba(255,255,255,0.25);
    @include flex-center;
  }
  .confirm-text { font-size: 28rpx; font-weight: 800; color: #fff; }
}
</style>
