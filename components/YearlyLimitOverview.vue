<template>
  <view class="yearly-section" v-if="list.length">
    <view class="yearly-head">
      <text class="yearly-title">{{ title }}</text>
      <text class="yearly-tip">{{ subtitle }}</text>
    </view>
    <view
      v-for="y in list"
      :key="y.year"
      class="yearly-card glass-thin"
      style="margin: 0 32rpx 16rpx; padding: 24rpx 28rpx;"
    >
      <view class="yearly-top">
        <text class="yearly-year">{{ y.year }} 年</text>
        <text class="yearly-days">记录 {{ y.days_count }} 天 · {{ y.months_tracked }} 个月</text>
      </view>
      <view class="yearly-body">
        <view class="yb-col">
          <text class="yb-label">日均额度</text>
          <text class="yb-val">¥{{ yuan(y.days_count ? Math.round(y.total_day_limit_fen / y.days_count) : 0) }}</text>
        </view>
        <view class="yb-col">
          <text class="yb-label">年池上限</text>
          <text class="yb-val">¥{{ yuan(y.year_limit_fen) }}</text>
        </view>
        <view class="yb-col">
          <text class="yb-label">总花费</text>
          <text class="yb-val" style="color: var(--red-soft);">¥{{ yuan(y.total_spent_fen) }}</text>
        </view>
        <view class="yb-col">
          <text class="yb-label">总结余</text>
          <text class="yb-val" style="color: var(--ink3);">¥{{ yuan(y.total_surplus_fen) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getLimitHistoryYearly } from '@/api/sparejar.js'

const props = defineProps({
  title: { type: String, default: '更早的年度概览' },
  subtitle: { type: String, default: '超过 3 年留存期，仅保留年度汇总' }
})

const list = ref([])

const yuan = (fen) => Math.round((fen || 0) / 100).toLocaleString('zh-CN')

onMounted(async () => {
  try {
    const res = await getLimitHistoryYearly()
    list.value = Array.isArray(res) ? res : []
  } catch (e) {
    list.value = []
  }
})
</script>

<style scoped lang="scss">
.yearly-section { padding-top: 16rpx; }
.yearly-head { display: flex; align-items: baseline; justify-content: space-between; padding: 0 32rpx 16rpx; }
.yearly-title { font-size: 28rpx; font-weight: 800; color: var(--ink); }
.yearly-tip { font-size: 20rpx; color: var(--ink4); }
.yearly-card { display: flex; flex-direction: column; gap: 16rpx; }
.yearly-top { display: flex; align-items: center; justify-content: space-between; }
.yearly-year { font-size: 28rpx; font-weight: 800; color: var(--ink); }
.yearly-days { font-size: 20rpx; color: var(--ink4); }
.yearly-body { display: flex; }
.yb-col { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.yb-label { font-size: 20rpx; color: var(--ink4); }
.yb-val { font-size: 26rpx; font-weight: 800; color: var(--ink); }
</style>
