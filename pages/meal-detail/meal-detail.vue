<template>
  <view class="meal-detail-page" data-cmp="MealDetail">
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">{{ mealTypeLabel(meal.meal_type) }}</text>
      <view class="topbar-spacer" />
      <text class="topbar-del" @click="del">删除</text>
    </view>

    <scroll-view scroll-y enhanced :show-scrollbar="false" class="page-scroll">
      <view class="glass-mid card-in-1" style="padding:24rpx 28rpx;margin:24rpx 32rpx 0;">
        <view class="sum-row">
          <view class="sum-cell">
            <text class="sum-label">本餐花费</text>
            <text class="sum-value">¥{{ formatFen(amountFen) }}</text>
          </view>
          <view class="sum-cell">
            <text class="sum-label">总热量</text>
            <text class="sum-value kcal">{{ meal.confirmed_calories || 0 }}<text class="sum-unit">kcal</text></text>
          </view>
        </view>
        <view class="mode-tag">录入模式：{{ modeLabel(meal.calorie_mode) }}</view>
      </view>

      <view class="glass-mid card-in-1" style="padding:24rpx 28rpx;margin:24rpx 32rpx 0;">
        <text class="block-title">食物项（{{ meal.food_items ? meal.food_items.length : 0 }}）</text>
        <view v-if="!meal.food_items || !meal.food_items.length" class="empty-food">
          <text>整餐模式，未拆分食物项</text>
        </view>
        <view v-for="(f, i) in meal.food_items" :key="i" class="food-row">
          <view class="food-sticker">
            <image v-if="f.sticker_image_url" :src="f.sticker_image_url" mode="aspectFill" class="food-sticker-img" />
            <text v-else class="food-sticker-emoji">🍴</text>
          </view>
          <text class="food-name">{{ f.name || '未命名' }}</text>
          <text class="food-kcal">{{ f.calories || 0 }} kcal</text>
        </view>
        <view v-if="meal.calorie_mode === 'itemized'" class="food-sum">分项合计：{{ itemizedSum }} kcal</view>
      </view>

      <view class="disclaimer">
        <text>⚠️ 热量为自填/估算，仅供生活方式参考，非医疗或营养建议。</text>
      </view>

      <view class="actions">
        <view class="btn-edit" @click="edit"><text>编辑本餐</text></view>
      </view>
      <view style="height:40rpx;" />
    </scroll-view>
      
    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
</view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user.js';
import { formatFen } from '@/utils/money.js';

const { state, getMealAction, deleteMealAction, loadDailyHealth } = useUserStore();

const mealId = ref('');
const meal = reactive({ meal_type: 'lunch', calorie_mode: 'itemized', confirmed_calories: 0, food_items: [] });

const amountFen = computed(() => (meal.transaction && meal.transaction.amount) || 0);
const itemizedSum = computed(() => (meal.food_items || []).reduce((s, f) => s + (f.calories || 0), 0));

function mealTypeLabel(t) {
  return { breakfast: '🌅 早餐', lunch: '☀️ 午餐', dinner: '🌙 晚餐', snack: '🍎 加餐' }[t] || '餐饮'
}
function modeLabel(m) {
  return { whole: '整餐', itemized: '分项', partial: '部分分项' }[m] || m
}

function getOpt(id) {
  const pages = getCurrentPages();
  const cur = pages[pages.length - 1];
  return (cur && cur.options ? cur.options[id] : '') || ''
}

async function load() {
  try {
    const r = await getMealAction(mealId.value);
    if (r) {
      meal.meal_type = r.meal_type;
      meal.calorie_mode = r.calorie_mode;
      meal.confirmed_calories = r.confirmed_calories || 0;
      meal.food_items = r.food_items || [];
      meal.transaction = r.transaction || null;
    }
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
  }
}

const goBack = () => uni.navigateBack();

function edit() {
  uni.navigateTo({ url: `/pages/add-record/add-record?mealId=${mealId.value}` });
}

async function del() {
  uni.showModal({
    title: '删除餐次',
    content: '将一并删除对应的餐饮记账，确定吗？',
    confirmText: '删除',
    confirmColor: '#ff6b6b',
    success: async (res) => {
      if (!res.confirm) return;
      try {
        const dk = (meal.transaction && meal.transaction.date_key) || '';
        await deleteMealAction(mealId.value, dk);
        uni.showToast({ title: '已删除', icon: 'success' });
        setTimeout(() => uni.navigateBack(), 500);
      } catch (err) {
        uni.showToast({ title: (err && err.message) || '删除失败', icon: 'none' });
      }
    }
  });
}

onMounted(() => {
  mealId.value = getOpt('id');
  if (mealId.value) load();
});
</script>

<style scoped lang="scss">
.meal-detail-page { min-height: 100vh; background: linear-gradient(180deg, #f0fbf2 0%, #eaf6ff 100%); }
.topbar {
  display: flex; align-items: center; height: 74px; padding: 0 20rpx;
  .back-btn { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; font-size: 36rpx; color: var(--ink); }
  .topbar-title { font-size: 32rpx; font-weight: 800; color: var(--ink); }
  .topbar-spacer { flex: 1; }
  .topbar-del { font-size: 26rpx; color: #ff6b6b; font-weight: 600; padding: 0 12rpx; }
}
.page-scroll { height: calc(100vh - 74px); }
.card-in-1 { border-radius: 28rpx; }
.sum-row { display: flex; gap: 24rpx; }
.sum-cell { flex: 1; display: flex; flex-direction: column; }
.sum-label { font-size: 22rpx; color: var(--ink4); }
.sum-value { font-size: 40rpx; font-weight: 900; color: var(--ink); margin-top: 4rpx; }
.sum-value.kcal { color: var(--g5); }
.sum-unit { font-size: 18rpx; color: var(--ink4); font-weight: 400; margin-left: 4rpx; }
.mode-tag { margin-top: 16rpx; font-size: 20rpx; color: var(--ink4); }

.block-title { font-size: 26rpx; font-weight: 800; color: var(--ink); display: block; margin-bottom: 14rpx; }
.empty-food { font-size: 22rpx; color: var(--ink4); padding: 16rpx 0; }
.food-row { display: flex; align-items: center; gap: 16rpx; padding: 14rpx 0; border-top: 2rpx solid rgba(var(--g2-rgb),0.3); }
.food-sticker { width: 64rpx; height: 64rpx; border-radius: 16rpx; background: #eef6f0; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.food-sticker-img { width: 100%; height: 100%; }
.food-sticker-emoji { font-size: 32rpx; }
.food-name { flex: 1; font-size: 26rpx; color: var(--ink); font-weight: 600; }
.food-kcal { font-size: 24rpx; color: var(--g5); font-weight: 700; }
.food-sum { margin-top: 12rpx; font-size: 22rpx; color: var(--ink4); }

.disclaimer { margin: 24rpx 32rpx 0; font-size: 18rpx; color: #9a6b1f; background: rgba(255,244,224,0.7); border: 2rpx solid #ffe2b0; border-radius: 16rpx; padding: 16rpx 20rpx; line-height: 1.5; }

.actions { margin: 24rpx 32rpx 0; }
.btn-edit {
  padding: 26rpx; border-radius: 30rpx; text-align: center; font-size: 28rpx; font-weight: 800; color: #fff;
  background: linear-gradient(135deg, #7ed390, #25cc5d);
  box-shadow: 0 12rpx 40rpx rgba(37,204,93,0.3), inset 0 2rpx 0 rgba(255,255,255,0.25);
}
</style>
