<template>
  <view class="challenge-page" data-cmp="ChallengePage">
    <!-- 极光背景 -->
    <view class="aurora-bg-wrap">
      <view class="aurora-bg-base" />
      <view class="aurora-band-1" />
      <view class="blob-top-l" />
      <view class="blob-top-r" />
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="height:calc(100% - 74px);z-index:2;">
      <!-- 顶部 -->
      <view class="topbar">
        <view>
          <text class="topbar-sub">挑战中心</text>
          <text class="topbar-title">🏆 余钱罐挑战</text>
        </view>
        <view class="streak-badge badge-pulse">
          <text>🔥 连击 {{ DAILY.streak }} 天</text>
        </view>
      </view>

      <!-- 每日挑战 -->
      <view class="glass-hero card-in-1" style="margin:16px;padding:20px;">
        <view class="challenge-header">
          <text class="ch-icon">📅</text>
          <view>
            <text class="ch-title">每日挑战</text>
            <text class="ch-sub">今日限额 ¥{{ DAILY.dailyLimit }}</text>
          </view>
          <text class="ch-status" :class="DAILY.success ? 'success' : 'fail'">
            {{ DAILY.success ? '✅ 达成' : '❌ 超支' }}
          </text>
        </view>

        <!-- 进度环 -->
        <view class="ring-container">
          <view class="ring-label">
            <text class="ring-spent">¥{{ DAILY.todaySpent }}</text>
            <text class="ring-remain">剩余 ¥{{ DAILY.dailyLimit - DAILY.todaySpent }}</text>
          </view>
        </view>

        <!-- 7日热力图 -->
        <text class="section-subtitle">最近 7 天</text>
        <view class="heatmap">
          <view v-for="(d, i) in DAILY.historyDays" :key="i" class="heat-day">
            <view class="heat-bar" :class="d.success ? 'success' : 'fail'" :style="{ height: (d.spent / d.limit * 50) + 'px' }" />
            <text class="heat-label">{{ d.date }}</text>
          </view>
        </view>
      </view>

      <!-- 月度挑战 -->
      <view class="glass-mid card-in-1" style="margin:0 16px 16px;padding:18px;">
        <text class="section-title">📆 月度挑战</text>
        <view v-for="mc in MONTH_CHALLENGES" :key="mc.id" class="challenge-card" style="margin-top:12px;">
          <view class="ch-card-header">
            <text class="ch-card-title">{{ mc.title }}</text>
            <text class="ch-card-status" :class="mc.done ? (mc.success ? 'success' : 'fail') : 'pending'">
              {{ mc.done ? (mc.success ? '已完成' : '未达成') : '进行中' }}
            </text>
          </view>
          <view class="ch-card-bar">
            <view class="ch-card-fill" :style="{ width: Math.min(mc.spent / mc.target * 100, 100) + '%', background: mc.spent > mc.target ? '#ff6b6b' : 'linear-gradient(90deg,#89e59c,#25cc5d)' }" />
          </view>
          <view class="ch-card-meta">
            <text>¥{{ mc.spent }} / ¥{{ mc.target }}</text>
            <text>{{ mc.startDate }} - {{ mc.endDate }}</text>
          </view>
        </view>
      </view>

      <!-- 年度挑战 -->
      <view class="glass-mid card-in-1" style="margin:0 16px 16px;padding:18px;">
        <text class="section-title">🎯 年度挑战</text>
        <view v-for="yc in YEAR_CHALLENGES" :key="yc.id" class="challenge-card" style="margin-top:12px;">
          <view class="ch-card-header">
            <text class="ch-card-title">{{ yc.title }}</text>
            <text class="ch-card-status" :class="yc.done ? (yc.success ? 'success' : 'fail') : 'pending'">
              {{ yc.done ? (yc.success ? '已完成' : '未达成') : '进行中' }}
            </text>
          </view>
          <view class="ch-card-bar">
            <view class="ch-card-fill" :style="{ width: Math.min(yc.spent / yc.target * 100, 100) + '%' }" />
          </view>
          <view class="ch-card-meta">
            <text>¥{{ yc.spent.toLocaleString() }} / ¥{{ yc.target.toLocaleString() }}</text>
            <text>{{ yc.year }}年</text>
          </view>
        </view>
      </view>

      <!-- 徽章墙 -->
      <view class="glass-mid card-in-1" style="margin:0 16px 24px;padding:18px;">
        <text class="section-title">🎖️ 徽章成就</text>
        <view class="badge-grid">
          <view v-for="b in BADGES" :key="b.id" class="badge-item" :class="{ unlocked: b.unlocked }">
            <view class="badge-icon-box" :class="b.tier">
              <text class="badge-emoji">{{ b.unlocked ? b.emoji : '🔒' }}</text>
            </view>
            <text class="badge-name">{{ b.name }}</text>
            <text class="badge-tier">{{ tierLabel(b.tier) }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- TabBar -->
    <TabBar current-tab="challenge" />
  </view>
</template>

<script setup>
import TabBar from '@/components/TabBar.vue';

const DAILY = {
  streak: 23,
  todaySpent: 134.5,
  dailyLimit: 200,
  success: true,
  historyDays: [
    { date: '06-15', spent: 98, limit: 200, success: true },
    { date: '06-16', spent: 176, limit: 200, success: true },
    { date: '06-17', spent: 210, limit: 200, success: false },
    { date: '06-18', spent: 145, limit: 200, success: true },
    { date: '06-19', spent: 88, limit: 200, success: true },
    { date: '06-20', spent: 190, limit: 200, success: true },
    { date: '06-21', spent: 134, limit: 200, success: true },
  ],
};

const MONTH_CHALLENGES = [
  { id: 'm1', title: '6月餐饮控制', target: 3000, spent: 2340, startDate: '06-01', endDate: '06-30', done: false, success: false },
  { id: 'm2', title: '6月日用品管控', target: 1200, spent: 1150, startDate: '06-01', endDate: '06-30', done: false, success: false },
];

const YEAR_CHALLENGES = [
  { id: 'y1', title: '2024 年存款目标', target: 50000, spent: 28500, year: 2024, done: false, success: false },
];

const BADGES = [
  { id: 'b1', emoji: '🔥', name: '七日连击', desc: '', condition: '', unlocked: true, unlockedAt: '', tier: 'bronze', category: 'daily' },
  { id: 'b2', emoji: '💎', name: '月度达人', desc: '', condition: '', unlocked: true, unlockedAt: '', tier: 'silver', category: 'monthly' },
  { id: 'b3', emoji: '👑', name: '存款万元户', desc: '', condition: '', unlocked: true, unlockedAt: '', tier: 'gold', category: 'special' },
  { id: 'b4', emoji: '🌟', name: '年度英雄', desc: '', condition: '', unlocked: false, unlockedAt: '', tier: 'diamond', category: 'yearly' },
  { id: 'b5', emoji: '🎯', name: '精准射手', desc: '', condition: '', unlocked: false, unlockedAt: '', tier: 'silver', category: 'monthly' },
  { id: 'b6', emoji: '🏆', name: '冠军', desc: '', condition: '', unlocked: false, unlockedAt: '', tier: 'gold', category: 'special' },
];

const tierLabel = (t) => ({ bronze: '铜', silver: '银', gold: '金', diamond: '钻' })[t] || t;
</script>

<style scoped>
.challenge-page { width: 375px; height: 812px; overflow: hidden; position: relative; margin: 0 auto; background: #f2fcf2; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 52px 18px 0; }
.topbar-sub { font-size: 11px; color: #9bb8a8; display: block; margin-bottom: 2px; }
.topbar-title { font-size: 20px; font-weight: 900; color: #0f1c14; }
.streak-badge { padding: 6px 14px; border-radius: 22px; background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; font-size: 12px; font-weight: 700; box-shadow: 0 4px 14px rgba(37,204,93,0.3); }

.challenge-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.ch-icon { font-size: 24px; }
.ch-title { font-size: 15px; font-weight: 800; color: #0f1c14; display: block; }
.ch-sub { font-size: 11px; color: #9bb8a8; }
.ch-status { margin-left: auto; font-size: 14px; font-weight: 700; }
.ch-status.success { color: #25cc5d; }
.ch-status.fail { color: #ff6b6b; }

.ring-container { display: flex; justify-content: center; padding: 10px 0; }
.ring-label { text-align: center; }
.ring-spent { font-size: 36px; font-weight: 900; color: #0f1c14; display: block; }
.ring-remain { font-size: 12px; color: #25cc5d; font-weight: 600; }

.section-subtitle { font-size: 12px; color: #6b8c7a; font-weight: 600; display: block; margin: 12px 0 8px; }

.heatmap { display: flex; justify-content: space-around; align-items: flex-end; height: 64px; }
.heat-day { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.heat-bar { width: 12px; border-radius: 3px 3px 0 0; }
.heat-bar.success { background: linear-gradient(0deg,#4fd974,#25cc5d); }
.heat-bar.fail { background: #ffb3b3; }
.heat-label { font-size: 9px; color: #9bb8a8; }

.section-title { font-size: 14px; font-weight: 700; color: #0f1c14; }

.challenge-card { padding: 12px 0; border-top: 1px solid rgba(15,28,20,0.04); }
.ch-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.ch-card-title { font-size: 13px; font-weight: 600; color: #3a5244; }
.ch-card-status { font-size: 11px; font-weight: 600; }
.ch-card-status.success { color: #25cc5d; }
.ch-card-status.fail { color: #ff6b6b; }
.ch-card-status.pending { color: #f59e0b; }
.ch-card-bar { height: 6px; border-radius: 4px; background: rgba(194,242,200,0.3); overflow: hidden; }
.ch-card-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
.ch-card-meta { display: flex; justify-content: space-between; margin-top: 4px; font-size: 10px; color: #9bb8a8; }

.badge-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 14px; }
.badge-item { width: calc(33.33% - 8px); text-align: center; opacity: 0.5; }
.badge-item.unlocked { opacity: 1; }
.badge-icon-box { width: 48px; height: 48px; border-radius: 14px; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; }
.badge-icon-box.bronze { background: linear-gradient(135deg,#f5e6cc,#e8c97a); }
.badge-icon-box.silver { background: linear-gradient(135deg,#e8e8e8,#c0c0c0); }
.badge-icon-box.gold { background: linear-gradient(135deg,#ffe999,#f5c842); }
.badge-icon-box.diamond { background: linear-gradient(135deg,#e8d4ff,#b38dff); }
.badge-emoji { font-size: 24px; }
.badge-name { font-size: 10px; font-weight: 600; color: #3a5244; display: block; }
.badge-tier { font-size: 8px; color: #9bb8a8; }
</style>
