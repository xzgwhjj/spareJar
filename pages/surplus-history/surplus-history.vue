<template>
  <view class="history-page" data-cmp="SurplusHistory">
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">盈余历史</text>
      <view style="width:36px;" />
    </view>

    <!-- 筛选 -->
    <view class="filter-bar">
      <view v-for="f in filterOptions" :key="f.value" class="filter-chip" :class="{ active: filter === f.value }" @click="filter = f.value">
        {{ f.label }}
      </view>
    </view>

    <!-- 统计 -->
    <view class="glass-mid" style="margin:12px 16px;padding:14px;">
      <view class="stats-row">
        <view v-for="s in stats" :key="s.label" class="stat-block">
          <text class="stat-val" :style="{ color: s.color }">{{ s.value }}</text>
          <text class="stat-lbl">{{ s.label }}</text>
        </view>
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="flex:1;">
      <view v-for="(group, gi) in groupedHistory" :key="gi">
        <text class="date-sticky">{{ group.date }}</text>
        <view v-for="(item, ii) in group.items" :key="ii" class="history-card glass-thin card-item" style="margin:0 16px 8px;padding:12px 14px;">
          <view class="history-row">
            <view class="history-main">
              <view style="display:flex;align-items:center;gap:8px;">
                <text class="history-icon">{{ item.emoji }}</text>
                <view>
                  <text class="history-name">{{ item.name }}</text>
                  <text class="history-desc">{{ item.desc }}</text>
                </view>
              </view>
            </view>
            <text class="history-amount" :class="item.type">¥{{ item.amount }}</text>
          </view>
        </view>
      </view>
      <view style="height:24px;" />
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';

const filter = ref('all');
const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '存入存款池', value: 'pool' },
  { label: '滚入次日', value: 'carry' },
  { label: '转入心愿', value: 'wish' },
];

const history = reactive([
  { id: 'h1', date: '6月20日', type: 'pool', emoji: '💧', name: '存入存款池', desc: '昨日结余分配', amount: '16' },
  { id: 'h2', date: '6月20日', type: 'carry', emoji: '🔄', name: '滚入次日额度', desc: '昨日结余分配', amount: '8' },
  { id: 'h3', date: '6月19日', type: 'wish', emoji: '⭐', name: '转入心愿罐', desc: '索尼降噪耳机', amount: '10' },
  { id: 'h4', date: '6月19日', type: 'pool', emoji: '💧', name: '存入存款池', desc: '昨日结余分配', amount: '15' },
  { id: 'h5', date: '6月18日', type: 'carry', emoji: '🔄', name: '滚入次日额度', desc: '昨日结余分配', amount: '5' },
  { id: 'h6', date: '6月18日', type: 'pool', emoji: '💧', name: '存入存款池', desc: '昨日结余分配', amount: '22' },
]);

const filteredHistory = computed(() => {
  if (filter.value === 'all') return history;
  return history.filter((h) => h.type === filter.value);
});

const groupedHistory = computed(() => {
  const groups = {};
  filteredHistory.value.forEach((h) => {
    if (!groups[h.date]) groups[h.date] = [];
    groups[h.date].push(h);
  });
  return Object.entries(groups).map(([date, items]) => ({ date, items }));
});

const stats = [
  { label: '总计存池', value: '¥53', color: '#3b82f6' },
  { label: '总计滚入', value: '¥13', color: '#25cc5d' },
  { label: '总计心愿', value: '¥10', color: '#f59e0b' },
];

const goBack = () => uni.navigateBack();
</script>

<style scoped>
.history-page { width: 375px; height: 100vh; margin: 0 auto; background: #f2fcf2; display: flex; flex-direction: column; overflow: hidden; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 44px 16px 10px; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b8c7a; font-size: 16px; }
.topbar-title { font-size: 17px; font-weight: 700; color: #0f1c14; }

.filter-bar { display: flex; gap: 8px; padding: 8px 16px; }
.filter-chip { padding: 5px 14px; border-radius: 14px; background: rgba(255,255,255,0.7); font-size: 11px; font-weight: 600; color: #6b8c7a; cursor: pointer; }
.filter-chip.active { background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; }

.stats-row { display: flex; }
.stat-block { flex: 1; text-align: center; }
.stat-val { font-size: 18px; font-weight: 800; display: block; }
.stat-lbl { font-size: 9px; color: #9bb8a8; margin-top: 2px; display: block; }

.date-sticky { font-size: 12px; color: #6b8c7a; font-weight: 700; padding: 10px 18px 6px; display: block; }
.card-item { animation: cardFadeIn 0.5s cubic-bezier(0.22,0.61,0.36,1) backwards; }
.history-row { display: flex; align-items: center; justify-content: space-between; }
.history-icon { font-size: 18px; }
.history-name { font-size: 13px; font-weight: 600; color: #0f1c14; display: block; }
.history-desc { font-size: 10px; color: #9bb8a8; }
.history-amount { font-size: 14px; font-weight: 700; color: #25cc5d; }
</style>
