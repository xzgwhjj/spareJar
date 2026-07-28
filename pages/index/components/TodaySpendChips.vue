<template>
  <view class="today-spend card-in-1" style="margin: var(--band-gap) var(--page-margin) 0;" data-cmp="TodaySpendChips">
    <view class="ts-head">
      <text class="ts-icon">🧾</text>
      <text class="ts-title">今日消费</text>
      <text class="ts-total">共 {{ txCount }} 笔 · 合计 <text class="strong" :class="{ 'over-total': isOver }">¥{{ totalText }}</text></text>
    </view>
    <view class="ts-chips">
      <view v-for="b in chips" :key="b.id" class="ts-chip" :style="{ background: b.bg }">
        <text class="ts-chip-icon">{{ b.icon }}</text>
        <text class="ts-chip-amt">{{ b.amountText }}</text>
      </view>
      <text v-if="chips.length === 0" class="ts-empty">今日暂无消费</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import { useUserStore } from '@/stores/user.js';
import { formatFen } from '@/utils/money.js';

const { state, categoryMap, isOverLimit } = useUserStore();
const isOver = computed(() => isOverLimit.value);

const chips = computed(() => {
  const map = categoryMap.value;
  return (state.dashboard.transactions || []).slice(0, 8).map((tx) => {
    const cat = tx.category_id ? map[String(tx.category_id)] : null;
    return {
      id: String(tx._id),
      icon: cat ? cat.icon : (tx.type === 'income' ? '💰' : '📦'),
      bg: tx.type === 'income' ? '#E6F7EC' : '#FFEAEA',
      amountText: formatFen(tx.amount)
    };
  });
});

const txCount = computed(() => (state.dashboard.transactions || []).length);
const totalText = computed(() => {
  const total = (state.dashboard.transactions || []).reduce(
    (s, tx) => s + (typeof tx.amount === 'number' ? Math.abs(tx.amount) : 0),
    0
  );
  return formatFen(total);
});
</script>

<style scoped lang="scss">
.today-spend {
  padding: 24rpx 28rpx 22rpx;

  .ts-head {
    display: flex;
    align-items: center;
    gap: 10rpx;
    margin-bottom: 16rpx;
  }
  .ts-icon { font-size: 26rpx; color: #25cc5d; }
  .ts-title { font-size: 24rpx; font-weight: 700; color: var(--ink); }
  .ts-total {
    margin-left: auto;
    font-size: 21rpx;
    color: #9bb8a8;
    .strong { font-weight: 700; color: var(--ink2); }
    .over-total { color: #ff6b6b; }
  }

  .ts-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
  }
  .ts-chip {
    display: flex;
    align-items: center;
    gap: 6rpx;
    padding: 8rpx 18rpx;
    border-radius: 40rpx;
    font-size: 22rpx;
    font-weight: 600;
    color: #3a5244;
  }
  .ts-chip-icon { font-size: 22rpx; }
  .ts-empty { font-size: 22rpx; color: var(--ink4); }
}
</style>
