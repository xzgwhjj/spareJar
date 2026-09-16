<template>
  <view class="history-page" data-cmp="LimitHistory">
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">限额历史</text>
      <view style="width:36px;" />
    </view>

    <!-- 汇总 -->
    <view class="glass-mid" style="margin:12px 16px;padding:14px;">
      <view class="stats-row">
        <view class="stat-block">
          <text class="stat-val" style="color:#25cc5d;">¥{{ totalLimitYuan }}</text>
          <text class="stat-lbl">累计配置额度</text>
        </view>
        <view class="stat-block">
          <text class="stat-val" style="color:#0f1c14;">¥{{ totalSpentYuan }}</text>
          <text class="stat-lbl">累计花费</text>
        </view>
        <view class="stat-block">
          <text class="stat-val" style="color:#6b8c7a;">¥{{ totalSurplusYuan }}</text>
          <text class="stat-lbl">累计结余</text>
        </view>
      </view>
    </view>

    <!-- 月份筛选 -->
    <view class="month-bar">
      <view
        v-for="m in monthOptions"
        :key="m.key"
        class="month-chip"
        :class="{ active: m.key === activeMonth }"
        @click="activeMonth = m.key"
      >
        <text>{{ m.label }}</text>
      </view>
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="flex:1;">
      <view v-if="filteredList.length" v-for="(item, i) in filteredList" :key="i" class="history-card glass-thin card-item" style="margin:0 16px 8px;padding:12px 14px;">
        <view class="history-top">
          <text class="history-date">{{ item.date_key.slice(5) }}</text>
          <text class="history-source" :class="item.source">{{ item.source === 'override' ? '硬覆盖' : '自动' }}</text>
        </view>
        <view class="history-body">
          <view class="hb-col">
            <text class="hb-label">当日额度</text>
            <text class="hb-val">¥{{ yuan(item.day_limit_fen) }}</text>
          </view>
          <view class="hb-col">
            <text class="hb-label">花费</text>
            <text class="hb-val" style="color:#e07a5f;">¥{{ yuan(item.spent_fen) }}</text>
          </view>
          <view class="hb-col">
            <text class="hb-label">结余</text>
            <text class="hb-val" style="color:#6b8c7a;">¥{{ yuan(item.surplus_fen) }}</text>
          </view>
        </view>
        <view v-if="item.surplus_fen > 0" class="history-dest">
          <text class="dest-tag" :class="item.surplus_dest">{{ destLabel(item.surplus_dest) }}</text>
        </view>
      </view>
      <view v-else class="empty-wrap">
        <text class="empty-text">暂无记录</text>
        <text class="empty-sub">配置了限额后，每日结算会自动归档</text>
      </view>
      <view style="height:24px;" />
    </scroll-view>

    <amount-keyboard />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getLimitHistory } from '@/api/sparejar.js';
import { requireLogin } from '@/utils/guard.js';
import { todayDateKey } from '@/utils/date.js';

const rawList = ref([]);
const activeMonth = ref(todayDateKey().slice(0, 7));

const yuan = (fen) => Math.round((fen || 0) / 100).toLocaleString('zh-CN');

const destMap = {
  rollover_tomorrow: '顺延明日',
  rollover_pool: '滚回月池',
  wish: '存入心愿',
  savings: '存入存款池',
  none: '无结余'
};
const destLabel = (d) => destMap[d] || '—';

const monthOptions = computed(() => {
  const arr = [];
  const now = new Date();
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    arr.push({ key, label: `${d.getMonth() + 1}月` });
  }
  return arr;
});

const filteredList = computed(() =>
  rawList.value.filter(it => it.date_key.slice(0, 7) === activeMonth.value)
);

const totalLimitYuan = computed(() =>
  rawList.value.reduce((s, it) => s + (it.day_limit_fen || 0), 0) / 100 | 0
);
const totalSpentYuan = computed(() =>
  rawList.value.reduce((s, it) => s + (it.spent_fen || 0), 0) / 100 | 0
);
const totalSurplusYuan = computed(() =>
  rawList.value.reduce((s, it) => s + (it.surplus_fen || 0), 0) / 100 | 0
);

async function load() {
  try {
    const startDate = monthOptions.value[0].key + '-01';
    const endDate = todayDateKey();
    const data = await getLimitHistory({ start_key: startDate, end_key: endDate, limit: 120 });
    rawList.value = data || [];
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
}

onMounted(() => {
  if (!requireLogin('/pages/limit-history/limit-history')) return
  load()
});
const goBack = () => uni.navigateBack();
</script>

<style scoped>
.history-page { width: 375px; height: 100vh; margin: 0 auto; background: #f2fcf2; display: flex; flex-direction: column; overflow: hidden; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 44px 16px 10px; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b8c7a; font-size: 16px; }
.topbar-title { font-size: 17px; font-weight: 700; color: #0f1c14; }

.stats-row { display: flex; }
.stat-block { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.stat-val { font-size: 16px; font-weight: 900; }
.stat-lbl { font-size: 11px; color: #9bb8a8; }

.month-bar { display: flex; gap: 8px; padding: 0 16px 12px; }
.month-chip { padding: 6px 14px; border-radius: 20px; background: rgba(242,252,242,0.8); border: 1px solid rgba(194,242,200,0.4); font-size: 13px; font-weight: 700; color: #6b8c7a; cursor: pointer; }
.month-chip.active { background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; border-color: transparent; }

.history-card { display: flex; flex-direction: column; gap: 8px; }
.history-top { display: flex; align-items: center; justify-content: space-between; }
.history-date { font-size: 14px; font-weight: 800; color: #0f1c14; }
.history-source { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
.history-source.auto { background: rgba(37,204,93,0.12); color: #25cc5d; }
.history-source.override { background: rgba(240,160,60,0.14); color: #d98a1a; }

.history-body { display: flex; }
.hb-col { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.hb-label { font-size: 10px; color: #9bb8a8; }
.hb-val { font-size: 14px; font-weight: 800; color: #0f1c14; }

.history-dest { display: flex; }
.dest-tag { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px; background: rgba(107,140,122,0.12); color: #6b8c7a; }
.dest-tag.rollover_tomorrow { background: rgba(37,204,93,0.12); color: #25cc5d; }
.dest-tag.rollover_pool { background: rgba(37,204,93,0.08); color: #6b8c7a; }
.dest-tag.wish { background: rgba(255,160,122,0.14); color: #e8845a; }
.dest-tag.savings { background: rgba(90,160,255,0.12); color: #5a9fff; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 60px 0; }
.empty-text { font-size: 15px; font-weight: 700; color: #6b8c7a; }
.empty-sub { font-size: 12px; color: #9bb8a8; }
</style>
