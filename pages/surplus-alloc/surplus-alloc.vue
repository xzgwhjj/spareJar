<template>
  <view class="alloc-page" data-cmp="SurplusAlloc">
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">盈余分配</text>
      <view style="width:36px;" />
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="flex:1;">
      <!-- 昨日结余 -->
      <view class="glass-hero card-in-1" style="margin:16px;padding:18px;text-align:center;">
        <text class="surplus-label">昨日结余待分配</text>
        <text class="surplus-amount">¥32</text>
      </view>

      <!-- 分配比例 -->
      <view class="glass-mid" style="margin:0 16px 16px;padding:18px;">
        <text class="section-title">📐 分配比例</text>
        <view class="alloc-row" v-for="(item, i) in allocItems" :key="i">
          <view class="alloc-info">
            <text class="alloc-emoji">{{ item.emoji }}</text>
            <view>
              <text class="alloc-name">{{ item.name }}</text>
              <text class="alloc-amount">¥{{ Math.round(32 * item.percent / 100) }}</text>
            </view>
          </view>
          <slider
            class="alloc-slider"
            :value="item.percent"
            min="0"
            max="100"
            step="5"
            activeColor="#25cc5d"
            backgroundColor="rgba(194,242,200,0.3)"
            blockColor="#25cc5d"
            @change="(e) => { item.percent = e.detail.value; normalizeAlloc(i); }"
          />
          <text class="alloc-percent">{{ item.percent }}%</text>
        </view>
      </view>

      <!-- 分配历史入口 -->
      <view class="glass-thin" style="margin:0 16px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;" @click="goHistory">
        <text class="history-label">📋 查看分配历史</text>
        <text class="history-arrow">›</text>
      </view>

      <!-- 确认按钮 -->
      <view style="padding:20px 16px 30px;">
        <view class="confirm-btn" @click="confirmAlloc">
          <text>✅ 确认分配</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { reactive } from 'vue';

const allocItems = reactive([
  { emoji: '💧', name: '存款池', percent: 50 },
  { emoji: '🔄', name: '次日额度', percent: 25 },
  { emoji: '⭐', name: '心愿罐', percent: 25 },
]);

const normalizeAlloc = (changedIdx) => {
  const others = allocItems.filter((_, i) => i !== changedIdx);
  const remaining = 100 - allocItems[changedIdx].percent;
  if (others.length > 0) {
    const totalOther = others.reduce((s, o) => s + o.percent, 0);
    if (totalOther > 0) {
      others.forEach((o) => {
        o.percent = Math.round(o.percent / totalOther * remaining);
      });
    } else {
      const each = Math.round(remaining / others.length);
      others.forEach((o, i) => {
        o.percent = i === others.length - 1 ? remaining - each * (others.length - 1) : each;
      });
    }
  }
};

const confirmAlloc = () => {
  uni.showToast({ title: '分配成功', icon: 'success' });
  setTimeout(() => uni.navigateBack(), 600);
};

const goHistory = () => uni.navigateTo({ url: '/pages/surplus-history/surplus-history' });
const goBack = () => uni.navigateBack();
</script>

<style scoped>
.alloc-page { width: 375px; height: 100vh; margin: 0 auto; background: #f2fcf2; display: flex; flex-direction: column; overflow: hidden; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 44px 16px 10px; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b8c7a; font-size: 16px; }
.topbar-title { font-size: 17px; font-weight: 700; color: #0f1c14; }

.surplus-label { font-size: 12px; color: #9bb8a8; display: block; }
.surplus-amount { font-size: 48px; font-weight: 900; color: #0f1c14; display: block; margin-top: 8px; letter-spacing: -2; }

.section-title { font-size: 14px; font-weight: 700; color: #0f1c14; display: block; margin-bottom: 16px; }
.alloc-row { margin-bottom: 18px; }
.alloc-row:last-child { margin-bottom: 0; }
.alloc-info { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.alloc-emoji { font-size: 20px; }
.alloc-name { font-size: 13px; font-weight: 600; color: #3a5244; display: block; }
.alloc-amount { font-size: 11px; color: #25cc5d; font-weight: 600; }
.alloc-slider { margin: 4px 0; }
.alloc-percent { font-size: 12px; color: #25cc5d; font-weight: 700; text-align: right; display: block; }

.history-label { font-size: 13px; color: #6b8c7a; font-weight: 600; }
.history-arrow { font-size: 18px; color: #c2f2c8; }
.confirm-btn { width: 100%; padding: 14px; border-radius: 16px; background: linear-gradient(135deg,#4fd974,#25cc5d); text-align: center; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 20px rgba(37,204,93,0.3); }
</style>
