<template>
  <view class="dev-page" data-cmp="DevTools">
    <PageHeader title="数据维护" @back="goBack" />

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="flex:1;">
      <view class="glass-mid" style="margin:24rpx 32rpx;padding:28rpx;">
        <text class="dev-desc">限额历史默认仅保留近 3 年明细；更早数据由定时任务归档为「年度汇总」并清理明细。以下为手动触发入口（日常由日切任务每月 1 号自动执行）。</text>
      </view>

      <view class="dev-actions">
        <view class="dev-btn" @click="runPurge">
          <text>手动归档清理超期限额历史</text>
        </view>
        <view class="dev-btn ghost" @click="loadYearly">
          <text>查看年度归档汇总</text>
        </view>
      </view>

      <view v-if="purgeResult" class="glass-thin" style="margin:0 32rpx 16rpx;padding:24rpx 28rpx;">
        <text class="result-title">归档清理结果</text>
        <text class="result-line">留存下限 floor：{{ purgeResult.floor }}</text>
        <text class="result-line">已清理明细条数：{{ purgeResult.purged }}</text>
        <text class="result-line">涉及年度分组：{{ purgeResult.years }}</text>
      </view>

      <view v-if="yearlyList.length" class="yearly-wrap">
        <text class="result-title" style="padding:8rpx 32rpx 4rpx;">年度归档（{{ yearlyList.length }} 年）</text>
        <view v-for="y in yearlyList" :key="y.year" class="glass-thin" style="margin:0 32rpx 16rpx;padding:24rpx 28rpx;">
          <view class="y-row">
            <text class="y-year">{{ y.year }} 年</text>
            <text class="y-sub">记录 {{ y.days_count }} 天 · {{ y.months_tracked }} 个月</text>
          </view>
          <view class="y-grid">
            <view class="y-cell">
              <text class="y-l">日均额度</text>
              <text class="y-v">¥{{ yuan(y.days_count ? Math.round(y.total_day_limit_fen / y.days_count) : 0) }}</text>
            </view>
            <view class="y-cell">
              <text class="y-l">年池上限</text>
              <text class="y-v">¥{{ yuan(y.year_limit_fen) }}</text>
            </view>
            <view class="y-cell">
              <text class="y-l">总花费</text>
              <text class="y-v">¥{{ yuan(y.total_spent_fen) }}</text>
            </view>
            <view class="y-cell">
              <text class="y-l">总结余</text>
              <text class="y-v">¥{{ yuan(y.total_surplus_fen) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view style="height:48rpx;" />
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { cronPurgeOldLimitHistory, getLimitHistoryYearly } from '@/api/sparejar.js'
import { requireLogin } from '@/utils/guard.js'
import PageHeader from '@/components/PageHeader.vue'

const purgeResult = ref(null)
const yearlyList = ref([])

const yuan = (fen) => Math.round((fen || 0) / 100).toLocaleString('zh-CN')

async function runPurge() {
  if (!requireLogin('/pages/devtools/devtools')) return
  try {
    uni.showLoading({ title: '归档中' })
    const res = await cronPurgeOldLimitHistory({})
    purgeResult.value = res || null
    uni.hideLoading()
    uni.showToast({ title: res && res.purged ? `已清理 ${res.purged} 条` : '无超期数据', icon: 'none' })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function loadYearly() {
  if (!requireLogin('/pages/devtools/devtools')) return
  try {
    const res = await getLimitHistoryYearly()
    yearlyList.value = Array.isArray(res) ? res : []
  } catch (e) {
    yearlyList.value = []
  }
}

const goBack = () => uni.navigateBack()

onMounted(() => {
  if (!requireLogin('/pages/devtools/devtools')) return
  loadYearly()
})
</script>

<style scoped lang="scss">
.dev-page {
  @include sj-theme-css-vars;
  width: 750rpx;
  height: 100vh;
  margin: 0 auto;
  background: var(--g1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.dev-desc { font-size: 24rpx; color: var(--ink3); line-height: 1.6; }
.dev-actions { display: flex; flex-direction: column; gap: 16rpx; padding: 0 32rpx 24rpx; }
.dev-btn {
  padding: 28rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
  text-align: center;
  cursor: pointer;
}
.dev-btn.ghost {
  background: var(--g0);
  color: var(--g5);
  border: 2rpx solid var(--g2-1);
}
.result-title { font-size: 26rpx; font-weight: 800; color: var(--ink); }
.result-line { display: block; font-size: 24rpx; color: var(--ink3); margin-top: 8rpx; }
.yearly-wrap { display: flex; flex-direction: column; }
.y-row { display: flex; align-items: center; justify-content: space-between; }
.y-year { font-size: 28rpx; font-weight: 800; color: var(--ink); }
.y-sub { font-size: 20rpx; color: var(--ink4); }
.y-grid { display: flex; flex-wrap: wrap; margin-top: 16rpx; }
.y-cell { width: 50%; display: flex; flex-direction: column; gap: 4rpx; margin-bottom: 12rpx; }
.y-l { font-size: 20rpx; color: var(--ink4); }
.y-v { font-size: 26rpx; font-weight: 800; color: var(--ink); }
</style>
