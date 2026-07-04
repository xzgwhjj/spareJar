<template>
  <view class="limit-page" data-cmp="LimitSetting">
    <!-- 顶部栏 -->
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">限额设置</text>
      <view style="width:36px;" />
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="flex:1;">
      <!-- 每日限额滑块 -->
      <view class="glass-mid card-in-1" style="margin:16px;padding:18px;">
        <text class="section-title">📅 每日限额</text>
        <view class="slider-value-row">
          <text class="slider-value">¥{{ dailyLimit }}</text>
          <text class="slider-hint">每日最高可花金额</text>
        </view>
        <slider
          class="custom-slider"
          :value="dailyLimit"
          min="50"
          max="1000"
          step="10"
          activeColor="#25cc5d"
          backgroundColor="rgba(194,242,200,0.3)"
          blockColor="#25cc5d"
          blockSize="22"
          @change="onDailyChange"
        />
        <view class="slider-labels">
          <text>¥50</text>
          <text>¥1000</text>
        </view>
      </view>

      <!-- 分类限额 -->
      <view class="glass-mid card-in-1" style="margin:0 16px 16px;padding:18px;">
        <text class="section-title">📂 分类限额（每月）</text>
        <view v-for="(cat, i) in categoryLimits" :key="i" class="cat-limit-row">
          <view class="cat-limit-header" @click="cat.expanded = !cat.expanded">
            <text class="cat-limit-emoji">{{ cat.emoji }}</text>
            <text class="cat-limit-name">{{ cat.name }}</text>
            <text class="cat-limit-cur">¥{{ cat.limit }}</text>
            <text class="expand-icon">{{ cat.expanded ? '▾' : '▸' }}</text>
          </view>
          <view v-if="cat.expanded" class="cat-limit-body">
            <slider
              class="cat-slider"
              :value="cat.limit"
              :min="cat.min"
              :max="cat.max"
              :step="cat.step"
              activeColor="#25cc5d"
              backgroundColor="rgba(194,242,200,0.3)"
              blockColor="#25cc5d"
              @change="(e) => cat.limit = e.detail.value"
            />
            <text class="cat-limit-range">¥{{ cat.min }} - ¥{{ cat.max }}</text>
          </view>
        </view>
      </view>

      <!-- 保存 -->
      <view style="padding:0 16px 30px;">
        <view class="save-btn" @click="saveSettings">
          <text>💾 保存设置</text>
        </view>
        <view class="reset-btn" @click="resetSettings">
          <text>恢复默认</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';

const dailyLimit = ref(200);

const categoryLimits = reactive([
  { name: '餐饮', emoji: '🍜', limit: 3000, min: 500, max: 10000, step: 100, expanded: false },
  { name: '交通', emoji: '🚇', limit: 800, min: 100, max: 3000, step: 50, expanded: false },
  { name: '购物', emoji: '🛍️', limit: 2000, min: 200, max: 5000, step: 100, expanded: false },
  { name: '娱乐', emoji: '🎬', limit: 1500, min: 200, max: 5000, step: 100, expanded: false },
  { name: '日用', emoji: '🧴', limit: 1000, min: 100, max: 3000, step: 50, expanded: false },
  { name: '医疗', emoji: '💊', limit: 2000, min: 200, max: 5000, step: 100, expanded: false },
]);

const onDailyChange = (e) => {
  dailyLimit.value = e.detail.value;
};

const saveSettings = () => {
  uni.showToast({ title: '设置已保存', icon: 'success' });
};

const resetSettings = () => {
  dailyLimit.value = 200;
  categoryLimits.forEach((c) => {
    c.limit = c.name === '餐饮' ? 3000 : c.name === '交通' ? 800 : c.name === '购物' ? 2000 : c.name === '娱乐' ? 1500 : c.name === '日用' ? 1000 : 2000;
  });
  uni.showToast({ title: '已恢复默认', icon: 'none' });
};

const goBack = () => uni.navigateBack();
</script>

<style scoped>
.limit-page { width: 375px; height: 100vh; margin: 0 auto; background: #f2fcf2; display: flex; flex-direction: column; overflow: hidden; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 44px 16px 10px; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b8c7a; font-size: 16px; }
.topbar-title { font-size: 17px; font-weight: 700; color: #0f1c14; }

.section-title { font-size: 14px; font-weight: 700; color: #0f1c14; display: block; margin-bottom: 12px; }
.slider-value-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 16px; }
.slider-value { font-size: 36px; font-weight: 900; color: #25cc5d; }
.slider-hint { font-size: 12px; color: #9bb8a8; }
.slider-labels { display: flex; justify-content: space-between; font-size: 10px; color: #9bb8a8; margin-top: 4px; }

.cat-limit-row { border-top: 1px solid rgba(15,28,20,0.04); }
.cat-limit-header { display: flex; align-items: center; gap: 10px; padding: 14px 0; cursor: pointer; }
.cat-limit-emoji { font-size: 16px; }
.cat-limit-name { font-size: 13px; font-weight: 600; color: #3a5244; flex: 1; }
.cat-limit-cur { font-size: 14px; font-weight: 700; color: #0f1c14; }
.expand-icon { font-size: 12px; color: #9bb8a8; }
.cat-limit-body { padding: 0 0 14px; }
.cat-limit-range { font-size: 10px; color: #9bb8a8; display: block; text-align: right; margin-top: 2px; }

.save-btn { width: 100%; padding: 14px; border-radius: 16px; background: linear-gradient(135deg,#4fd974,#25cc5d); text-align: center; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 20px rgba(37,204,93,0.3); }
.reset-btn { width: 100%; padding: 12px; border-radius: 14px; text-align: center; color: #9bb8a8; font-size: 12px; font-weight: 600; cursor: pointer; margin-top: 10px; }
</style>
