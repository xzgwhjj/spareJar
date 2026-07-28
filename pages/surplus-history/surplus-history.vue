<template>
  <view class="history-page" data-cmp="SurplusHistory">
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">结余与分配</text>
      <view style="width:36px;" />
    </view>

    <!-- 累计结余池余额 -->
    <view class="balance-card glass-mid" style="margin:12px 16px;padding:16px;">
      <text class="balance-label">累计结余池（虚拟）</text>
      <text class="balance-amount">¥{{ poolBalance }}</text>
      <text class="balance-note">省下的钱滚存于此，计入每日可用额度</text>
      <text class="balance-warn">⚠️ 累计结余池为虚拟记账额度，非真实资金账户</text>
    </view>

    <!-- 统计 -->
    <view class="glass-mid" style="margin:0 16px 12px;padding:14px;">
      <view class="stats-row">
        <view v-for="s in stats" :key="s.label" class="stat-block">
          <text class="stat-val" :style="{ color: s.color }">¥{{ s.value }}</text>
          <text class="stat-lbl">{{ s.label }}</text>
        </view>
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="flex:1;">
      <view v-if="groupedHistory.length" v-for="(group, gi) in groupedHistory" :key="gi">
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
            <text class="history-amount" :class="item.type">+¥{{ item.amount }}</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-wrap">
        <text class="empty-text">还没有分配记录</text>
        <text class="empty-sub">每日有结余时，来这里分配去向</text>
      </view>
      <view style="height:24px;" />
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user.js';
import { formatFen } from '@/utils/money.js';

const { surplusPoolBalanceFen, loadSurplusAllocationsAction } = useUserStore();

const poolBalance = computed(() => formatFen(surplusPoolBalanceFen.value));
const allocations = ref([]);

const TYPE_META = {
  roll_over: { emoji: '🔄', name: '滚存次日额度', color: '#25cc5d' },
  wish: { emoji: '⭐', name: '存入心愿', color: '#f59e0b' },
  savings_pool: { emoji: '💧', name: '存入存款池', color: '#3b82f6' }
};

const flatRows = computed(() => {
  const rows = [];
  allocations.value.forEach((a) => {
    const items = Array.isArray(a.items) ? a.items : [];
    items.forEach((it) => {
      const meta = TYPE_META[it.target_type] || { emoji: '💰', name: it.target_type, color: '#6b8c7a' };
      rows.push({
        date: a.date_key,
        type: it.target_type,
        emoji: meta.emoji,
        name: meta.name,
        desc: a.is_auto ? '日结自动分配' : '手动分配',
        amount: formatFen(it.amount || 0),
        amountFen: it.amount || 0
      });
    });
  });
  return rows;
});

const stats = computed(() => {
  const sum = (t) => flatRows.value.filter((r) => r.type === t).reduce((s, r) => s + r.amountFen, 0);
  return [
    { label: '总计滚存', value: formatFen(sum('roll_over')), color: '#25cc5d' },
    { label: '总计心愿', value: formatFen(sum('wish')), color: '#f59e0b' },
    { label: '总计存款池', value: formatFen(sum('savings_pool')), color: '#3b82f6' }
  ];
});

const groupedHistory = computed(() => {
  const groups = {};
  flatRows.value.forEach((h) => {
    if (!groups[h.date]) groups[h.date] = [];
    groups[h.date].push(h);
  });
  return Object.entries(groups).map(([date, items]) => ({ date, items }));
});

const goBack = () => uni.navigateBack();

onMounted(async () => {
  try {
    allocations.value = await loadSurplusAllocationsAction();
  } catch (err) {
    console.error('[surplus-history] 加载失败', err);
    allocations.value = [];
  }
});
</script>

<style scoped>
.history-page { width: 375px; height: 100vh; margin: 0 auto; background: #f2fcf2; display: flex; flex-direction: column; overflow: hidden; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 44px 16px 10px; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b8c7a; font-size: 16px; }
.topbar-title { font-size: 17px; font-weight: 700; color: #0f1c14; }

.balance-label { font-size: 11px; color: #9bb8a8; display: block; }
.balance-amount { font-size: 26px; font-weight: 900; color: #0f1c14; display: block; margin: 4px 0; }
.balance-note { font-size: 10px; color: #9bb8a8; }
.balance-warn { font-size: 10px; color: #d9a406; margin-top: 4px; display: block; }

.stats-row { display: flex; }
.stat-block { flex: 1; text-align: center; }
.stat-val { font-size: 16px; font-weight: 800; display: block; }
.stat-lbl { font-size: 9px; color: #9bb8a8; margin-top: 2px; display: block; }

.date-sticky { font-size: 12px; color: #6b8c7a; font-weight: 700; padding: 10px 18px 6px; display: block; }
.card-item { animation: cardFadeIn 0.5s cubic-bezier(0.22,0.61,0.36,1) backwards; }
.history-row { display: flex; align-items: center; justify-content: space-between; }
.history-icon { font-size: 18px; }
.history-name { font-size: 13px; font-weight: 600; color: #0f1c14; display: block; }
.history-desc { font-size: 10px; color: #9bb8a8; }
.history-amount { font-size: 14px; font-weight: 700; color: #25cc5d; }

.empty-wrap { padding: 40px 16px; text-align: center; }
.empty-text { font-size: 14px; font-weight: 700; color: #3a5244; display: block; margin-bottom: 6px; }
.empty-sub { font-size: 11px; color: #9bb8a8; display: block; }
</style>
