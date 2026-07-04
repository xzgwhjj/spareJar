<template>
  <view class="sticker-page" data-cmp="StickerLib">
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">贴纸库</text>
      <view style="width:36px;" />
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="flex:1;">
      <!-- 使用统计 -->
      <view class="glass-mid card-in-1" style="margin:16px;padding:14px;">
        <view class="stats-row">
          <view class="stat-block">
            <text class="stat-val" style="color:#25cc5d">{{ stickers.length }}</text>
            <text class="stat-lbl">贴纸种类</text>
          </view>
          <view class="stat-block">
            <text class="stat-val" style="color:#3b82f6;">{{ totalUsed }}</text>
            <text class="stat-lbl">总使用次数</text>
          </view>
          <view class="stat-block">
            <text class="stat-val" style="color:#f59e0b;">{{ mostUsed }}</text>
            <text class="stat-lbl">最常用</text>
          </view>
        </view>
      </view>

      <!-- 分类筛选 -->
      <view class="filter-bar">
        <view
          v-for="f in filterOptions"
          :key="f.value"
          class="filter-chip"
          :class="{ active: filter === f.value }"
          @click="filter = f.value"
        >
          {{ f.label }}
        </view>
      </view>

      <!-- 贴纸网格 -->
      <view class="sticker-grid" style="padding:0 16px;">
        <view
          v-for="(s, i) in filteredStickers"
          :key="s.id"
          class="sticker-card glass-mid"
          :style="{ animationDelay: (i * 0.05) + 's' }"
        >
          <view class="sticker-emoji-wrap">
            <text class="sticker-emoji">{{ s.emoji }}</text>
          </view>
          <text class="sticker-name">{{ s.name }}</text>
          <text class="sticker-cat">{{ s.category }}</text>
          <view class="sticker-used-badge">
            <text>已用 {{ s.used }} 次</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="filteredStickers.length === 0" style="text-align:center;padding:60px 0;">
        <text style="font-size:48px;">🏷️</text>
        <text style="font-size:14px;color:#9bb8a8;display:block;margin-top:12px;">此分类暂无贴纸</text>
      </view>

      <view style="height:24px;" />
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';

const filter = ref('all');
const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '餐饮', value: '餐饮' },
  { label: '交通', value: '交通' },
  { label: '购物', value: '购物' },
  { label: '娱乐', value: '娱乐' },
  { label: '收入', value: '收入' },
];

const stickers = ref([
  { id: 's1', emoji: '🍜', name: '拉面', used: 28, category: '餐饮' },
  { id: 's2', emoji: '☕', name: '咖啡', used: 35, category: '餐饮' },
  { id: 's3', emoji: '🍔', name: '快餐', used: 18, category: '餐饮' },
  { id: 's4', emoji: '🍕', name: '披萨', used: 7, category: '餐饮' },
  { id: 's5', emoji: '🚇', name: '地铁', used: 42, category: '交通' },
  { id: 's6', emoji: '🚌', name: '公交', used: 15, category: '交通' },
  { id: 's7', emoji: '🚗', name: '打车', used: 8, category: '交通' },
  { id: 's8', emoji: '🛍️', name: '购物', used: 22, category: '购物' },
  { id: 's9', emoji: '👗', name: '服装', used: 12, category: '购物' },
  { id: 's10', emoji: '📱', name: '数码', used: 5, category: '购物' },
  { id: 's11', emoji: '🎮', name: '游戏', used: 11, category: '娱乐' },
  { id: 's12', emoji: '🎬', name: '电影', used: 9, category: '娱乐' },
  { id: 's13', emoji: '💰', name: '工资', used: 16, category: '收入' },
  { id: 's14', emoji: '🎁', name: '红包', used: 5, category: '收入' },
  { id: 's15', emoji: '💊', name: '药品', used: 4, category: '健康' },
  { id: 's16', emoji: '🏥', name: '医院', used: 2, category: '健康' },
]);

const filteredStickers = computed(() => {
  if (filter.value === 'all') return stickers.value;
  return stickers.value.filter((s) => s.category === filter.value);
});

const totalUsed = computed(() => stickers.value.reduce((s, st) => s + st.used, 0));
const mostUsed = computed(() => {
  const max = stickers.value.reduce((a, b) => (a.used > b.used ? a : b));
  return max.emoji;
});

const goBack = () => uni.navigateBack();
</script>

<style scoped>
.sticker-page { width: 375px; height: 100vh; margin: 0 auto; background: #f2fcf2; display: flex; flex-direction: column; overflow: hidden; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 44px 16px 10px; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b8c7a; font-size: 16px; }
.topbar-title { font-size: 17px; font-weight: 700; color: #0f1c14; }

.stats-row { display: flex; }
.stat-block { flex: 1; text-align: center; }
.stat-val { font-size: 20px; font-weight: 800; display: block; }
.stat-lbl { font-size: 10px; color: #9bb8a8; margin-top: 2px; display: block; }

.filter-bar { display: flex; gap: 6px; padding: 8px 16px; flex-wrap: wrap; }
.filter-chip { padding: 5px 12px; border-radius: 14px; background: rgba(255,255,255,0.7); font-size: 11px; font-weight: 600; color: #6b8c7a; cursor: pointer; }
.filter-chip.active { background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; }

.sticker-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.sticker-card {
  width: calc(25% - 7.5px);
  border-radius: 16px;
  padding: 14px 8px;
  text-align: center;
  animation: bounce-in 0.45s cubic-bezier(0.34,1.4,0.64,1) backwards;
}
.sticker-emoji-wrap { margin-bottom: 8px; }
.sticker-emoji { font-size: 32px; }
.sticker-name { font-size: 11px; font-weight: 700; color: #0f1c14; display: block; }
.sticker-cat { font-size: 9px; color: #9bb8a8; display: block; margin-top: 2px; }
.sticker-used-badge {
  margin-top: 6px;
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(37,204,93,0.1);
  font-size: 9px;
  color: #25cc5d;
  font-weight: 600;
  display: inline-block;
}

@keyframes bounce-in {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.08); }
  70% { transform: scale(0.94); }
  100% { transform: scale(1); opacity: 1; }
}
</style>
