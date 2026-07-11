<template>
  <view class="ledger-page" data-cmp="LedgerPage">
    <!-- 极光背景 -->
    <view class="aurora-bg-wrap">
      <view class="aurora-bg-base" />
      <view class="aurora-band-1" />
      <view class="aurora-band-2" />
      <view class="blob-top-l" />
      <view class="blob-top-r" />
      <view class="blob-mid" />
    </view>

    <!-- 内容区 -->
    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="height:calc(100% - 74px);z-index:2;">
      <!-- TopBar -->
      <view class="topbar">
        <view>
          <text class="topbar-sub">账本中心</text>
          <text class="topbar-title">我的账本</text>
        </view>
        <view class="topbar-actions">
          <view class="action-btn" @click="goAssetMgr"><text>💳</text></view>
          <view class="action-btn" @click="goStickerLib"><text>⭐</text></view>
        </view>
      </view>

      <!-- Page tabs -->
      <view class="page-tab-bar">
        <view
          v-for="t in PAGE_TABS"
          :key="t.key"
          class="page-tab"
          :class="{ active: pageTab === t.key }"
          @click="pageTab = t.key"
        >
          <text class="page-tab-icon">{{ t.icon }}</text>
          <text>{{ t.label }}</text>
        </view>
      </view>

      <!-- TAB: 账本 -->
      <view v-show="pageTab === 'ledger'">
        <!-- 总览卡片 -->
        <view class="card-1 glass-mid" style="margin:16px 16px 0;padding:18px;">
          <view class="summary-row">
            <view>
              <text class="summary-label">全部账本总余额</text>
              <text class="summary-amount">¥34,720</text>
            </view>
            <view style="text-align:right;">
              <text class="summary-label">本月结余</text>
              <text class="summary-income">+¥4,360</text>
            </view>
          </view>
          <view class="summary-stats">
            <view v-for="s in summaryStats" :key="s.label" class="stat-item">
              <text class="stat-label">{{ s.label }}</text>
              <text class="stat-value" :style="{ color: s.color }">{{ s.value }}</text>
            </view>
          </view>
        </view>

        <!-- 账本列表标题 -->
        <view class="section-header">
          <view class="section-title-grp">
            <text class="section-icon">📚</text>
            <text class="section-title">我的账本</text>
          </view>
          <view class="add-btn" @click="showNewLedger = true">
            <text>+ 新增账本</text>
          </view>
        </view>

        <!-- 账本列表 -->
        <view v-for="l in LEDGERS" :key="l.id" class="ledger-card glass-thin card-item" style="margin:0 16px 8px;padding:14px 16px;" @click="openLedgerSheet(l)">
          <view class="ledger-row">
            <view class="ledger-icon" :style="{ background: l.colorBg }">
              <text>{{ l.emoji }}</text>
            </view>
            <view class="ledger-info">
              <view class="ledger-name-row">
                <text class="ledger-name">{{ l.name }}</text>
                <text class="ledger-type" :class="l.type">{{ l.type === 'master' ? '主账本' : '子账本' }}</text>
              </view>
              <text class="ledger-meta">{{ l.members }}人 · {{ l.records }}笔</text>
            </view>
            <view class="ledger-balance">
              <text class="balance-num">¥{{ l.balance.toLocaleString() }}</text>
              <text class="balance-sub">预算 ¥{{ l.budget.toLocaleString() }}</text>
            </view>
          </view>
          <view class="ledger-bar">
            <view class="ledger-bar-fill" :style="{ width: (l.spent / l.budget * 100) + '%', background: `linear-gradient(90deg,${l.color}80,${l.color})` }" />
          </view>
        </view>
      </view>

      <!-- TAB: 资产 -->
      <view v-show="pageTab === 'asset'">
        <view class="asset-mode-bar" style="margin:16px;">
          <view v-for="m in assetModes" :key="m.id" class="asset-mode-btn" :class="{ active: assetMode === m.id }" @click="assetMode = m.id">
            {{ m.label }}
          </view>
        </view>
        <view class="glass-mid" style="margin:0 16px;padding:16px;">
          <text class="asset-total-label">{{ assetMode === 'disposable' ? '可支配资产' : assetMode === 'withInvest' ? '含投资' : '总资产净值' }}</text>
          <text class="asset-total-num" :style="{ color: assetDisplay >= 0 ? '#25cc5d' : '#ff6b6b' }">¥{{ Math.abs(assetDisplay).toLocaleString() }}</text>
        </view>
        <view v-for="a in ACCOUNTS" :key="a.id" class="asset-card glass-thin" style="margin:8px 16px 0;padding:14px 16px;">
          <view class="asset-row">
            <view class="asset-icon-box" :style="{ background: a.colorBg }">
              <text>{{ a.icon }}</text>
            </view>
            <view class="asset-info">
              <text class="asset-name">{{ a.name }}</text>
              <text class="asset-type">{{ a.type }}</text>
            </view>
            <text class="asset-balance" :style="{ color: a.balance >= 0 ? '#0f1c14' : '#ff6b6b' }">¥{{ a.balance.toLocaleString() }}</text>
          </view>
        </view>
      </view>

      <!-- TAB: 报表 -->
      <view v-show="pageTab === 'chart'">
        <view class="glass-mid" style="margin:16px;padding:18px;">
          <text class="chart-title">📊 月度收支趋势</text>
          <view class="chart-area">
            <view v-for="(s, i) in MONTHLY" :key="i" class="chart-col" :style="{ flexDirection: 'column-reverse', alignItems: 'center', height: '180px', justifyContent: 'flex-end' }">
              <view class="bar-group">
                <view class="bar income-bar" :style="{ height: (s.income / maxBar * 120) + 'px' }" />
                <view class="bar expense-bar" :style="{ height: (s.expense / maxBar * 120) + 'px' }" />
              </view>
              <text class="bar-label">{{ s.month }}</text>
            </view>
          </view>
          <view style="display:flex;gap:16px;justify-content:center;margin-top:12px;">
            <view style="display:flex;align-items:center;gap:4px;">
              <view style="width:8px;height:8px;border-radius:2px;background:#25cc5d;" /><text style="font-size:11px;color:#6b8c7a;">收入</text>
            </view>
            <view style="display:flex;align-items:center;gap:4px;">
              <view style="width:8px;height:8px;border-radius:2px;background:#f59e0b;" /><text style="font-size:11px;color:#6b8c7a;">支出</text>
            </view>
          </view>
        </view>
      </view>

      <!-- TAB: 贴纸 -->
      <view v-show="pageTab === 'sticker'">
        <view class="sticker-grid" style="padding:16px;">
          <view v-for="s in STICKERS" :key="s.id" class="sticker-chip glass-thin" style="padding:12px 10px;text-align:center;">
            <text style="font-size:28px;display:block;">{{ s.emoji }}</text>
            <text style="font-size:10px;color:#3a5244;font-weight:600;display:block;margin-top:4px;">{{ s.name }}</text>
            <text style="font-size:9px;color:#9bb8a8;">已用 {{ s.used }} 次</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 新增账本弹窗 -->
    <view v-if="showNewLedger" class="sheet-overlay" @click="showNewLedger = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">新建账本</text>
        <input class="sheet-input" v-model="newLedgerName" placeholder="输入账本名称" />
        <view class="sheet-btn" @click="showNewLedger = false">
          <text>创建账本</text>
        </view>
      </view>
    </view>

    <!-- TabBar -->
    <TabBar :current="1" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import TabBar from '@/components/tabbar/tabbar.vue';

const PAGE_TABS = [
  { key: 'ledger', label: '账本', icon: '📖' },
  { key: 'asset', label: '资产', icon: '💰' },
  { key: 'chart', label: '报表', icon: '📊' },
  { key: 'sticker', label: '贴纸', icon: '🌟' },
];

const assetModes = [
  { id: 'disposable', label: '可支配' },
  { id: 'withInvest', label: '含投资' },
  { id: 'total', label: '总净值' },
];

const pageTab = ref('ledger');
const assetMode = ref('disposable');
const showNewLedger = ref(false);
const newLedgerName = ref('');

const LEDGERS = [
  { id: 'l1', emoji: '🏠', name: '家庭总账本', type: 'master', balance: 23840, budget: 12000, spent: 7230, color: '#25cc5d', colorBg: '#e1fae3', members: 3, records: 128 },
  { id: 'l2', emoji: '💼', name: '个人零花', type: 'sub', balance: 1480, budget: 3000, spent: 1420, color: '#7c6cf8', colorBg: '#f3f0ff', members: 1, records: 42 },
  { id: 'l3', emoji: '✈️', name: '旅行基金', type: 'sub', balance: 6200, budget: 10000, spent: 3800, color: '#f59e0b', colorBg: '#fffbeb', members: 2, records: 18 },
  { id: 'l4', emoji: '🎓', name: '教育学习', type: 'sub', balance: 3200, budget: 5000, spent: 1800, color: '#ec4899', colorBg: '#fff0f6', members: 1, records: 11 },
];

const ACCOUNTS = [
  { id: 'a1', icon: '💵', name: '钱包现金', type: '现金', balance: 380, color: '#25cc5d', colorBg: '#e1fae3' },
  { id: 'a2', icon: '🏦', name: '招商储蓄卡', type: '储蓄', balance: 23460, color: '#7c6cf8', colorBg: '#f3f0ff' },
  { id: 'a3', icon: '💳', name: '工行信用卡', type: '信用', balance: -3200, color: '#ff6b6b', colorBg: '#fff0f0' },
  { id: 'a4', icon: '📈', name: '基金账户', type: '投资', balance: 8780, color: '#f59e0b', colorBg: '#fffbeb' },
  { id: 'a5', icon: '🏠', name: '房贷', type: '贷款', balance: -320000, color: '#ff6b6b', colorBg: '#fff0f0' },
];

const STICKERS = [
  { id: 's1', emoji: '🍜', name: '拉面', used: 28, category: '餐饮' },
  { id: 's2', emoji: '☕', name: '咖啡', used: 35, category: '餐饮' },
  { id: 's3', emoji: '🚇', name: '地铁', used: 42, category: '交通' },
  { id: 's4', emoji: '🛍️', name: '购物', used: 22, category: '购物' },
  { id: 's5', emoji: '🎮', name: '游戏', used: 11, category: '娱乐' },
  { id: 's6', emoji: '💊', name: '药品', used: 4, category: '健康' },
  { id: 's7', emoji: '💰', name: '工资', used: 16, category: '收入' },
  { id: 's8', emoji: '🎁', name: '红包', used: 5, category: '收入' },
];

const MONTHLY = [
  { month: '1月', income: 8200, expense: 5340 },
  { month: '2月', income: 8200, expense: 4120 },
  { month: '3月', income: 8500, expense: 6780 },
  { month: '4月', income: 8200, expense: 5920 },
  { month: '5月', income: 9100, expense: 6230 },
  { month: '6月', income: 8200, expense: 3840 },
];

const maxBar = Math.max(...MONTHLY.map(s => s.income));

const cash = ACCOUNTS.filter(a => a.type !== '贷款' && a.type !== '投资').reduce((s, a) => s + a.balance, 0);
const invest = ACCOUNTS.find(a => a.type === '投资')?.balance ?? 0;
const total = ACCOUNTS.reduce((s, a) => s + a.balance, 0);
const assetDisplay = computed(() => assetMode.value === 'disposable' ? cash : assetMode.value === 'withInvest' ? cash + invest : total);

const summaryStats = [
  { label: '本月收入', value: '¥8,200', color: '#25cc5d' },
  { label: '本月支出', value: '¥3,840', color: '#f59e0b' },
  { label: '账本数量', value: `${LEDGERS.length}本`, color: '#7c6cf8' },
];

const openLedgerSheet = (l) => {
  uni.navigateTo({ url: `/pages/ledger-detail/ledger-detail?id=${l.id}` });
};
const goAssetMgr = () => uni.navigateTo({ url: '/pages/asset-mgr/asset-mgr' });
const goStickerLib = () => uni.navigateTo({ url: '/pages/sticker-lib/sticker-lib' });
</script>

<style scoped>
.ledger-page { width: 375px; height: 812px; overflow: hidden; position: relative; margin: 0 auto; background: #f2fcf2; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 52px 18px 0; }
.topbar-sub { font-size: 11px; color: #9bb8a8; display: block; margin-bottom: 2px; }
.topbar-title { font-size: 20px; font-weight: 900; color: #0f1c14; letter-spacing: -0.5; }
.topbar-actions { display: flex; gap: 8px; }
.action-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.88); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size:16px; }

.page-tab-bar { padding: 14px 16px 0; display: flex; gap: 8px; }
.page-tab { flex: 1; height: 38px; border-radius: 16px; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.7); color: #6b8c7a; cursor: pointer; }
.page-tab.active { background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; box-shadow: 0 4px 12px rgba(37,204,93,0.25); }
.page-tab-icon { font-size: 13px; }

.summary-row { display: flex; justify-content: space-between; margin-bottom: 14px; }
.summary-label { font-size: 10px; color: #9bb8a8; display: block; margin-bottom: 3px; }
.summary-amount { font-size: 32px; font-weight: 900; color: #0f1c14; letter-spacing: -1; }
.summary-income { font-size: 20px; font-weight: 800; color: #25cc5d; }
.summary-stats { display: flex; padding-top: 12px; border-top: 1px solid rgba(15,28,20,0.06); }
.stat-item { flex: 1; text-align: center; }
.stat-label { font-size: 10px; color: #9bb8a8; display: block; margin-bottom: 3px; }
.stat-value { font-size: 13px; font-weight: 700; }

.card-1 { animation: cardFadeIn 0.55s cubic-bezier(0.22, 0.61, 0.36, 1); }

.section-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 18px 8px; }
.section-title-grp { display: flex; align-items: center; gap: 6px; }
.section-icon { font-size: 14px; color: #25cc5d; }
.section-title { font-size: 13px; font-weight: 700; color: #0f1c14; }
.add-btn { padding: 5px 12px; border-radius: 14px; background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; font-size: 11px; font-weight: 700; cursor: pointer; box-shadow: 0 3px 10px rgba(37,204,93,0.25); }

.card-item { animation: cardFadeIn 0.65s cubic-bezier(0.22, 0.61, 0.36, 1) backwards; }
.card-item:nth-child(2) { animation-delay: 0.1s; }
.card-item:nth-child(3) { animation-delay: 0.2s; }
.card-item:nth-child(4) { animation-delay: 0.3s; }

.ledger-row { display: flex; align-items: center; gap: 10px; }
.ledger-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 18px; }
.ledger-info { flex: 1; }
.ledger-name-row { display: flex; align-items: center; gap: 6px; }
.ledger-name { font-size: 13px; font-weight: 700; color: #0f1c14; }
.ledger-type { font-size: 9px; padding: 1px 6px; border-radius: 6px; }
.ledger-type.master { background: rgba(37,204,93,0.12); color: #25cc5d; }
.ledger-type.sub { background: rgba(124,108,248,0.1); color: #7c6cf8; }
.ledger-meta { font-size: 10px; color: #9bb8a8; display: block; margin-top: 2px; }
.ledger-balance { text-align: right; }
.balance-num { font-size: 16px; font-weight: 800; color: #0f1c14; display: block; }
.balance-sub { font-size: 9px; color: #9bb8a8; }
.ledger-bar { height: 4px; border-radius: 3px; background: rgba(194,242,200,0.3); margin-top: 10px; overflow: hidden; }
.ledger-bar-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }

.asset-mode-bar { display: flex; background: rgba(255,255,255,0.6); border-radius: 14px; padding: 3px; }
.asset-mode-btn { flex: 1; padding: 8px; border-radius: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #6b8c7a; cursor: pointer; }
.asset-mode-btn.active { background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; }
.asset-total-label { font-size: 11px; color: #9bb8a8; display: block; }
.asset-total-num { font-size: 36px; font-weight: 900; display: block; margin-top: 4px; }
.asset-row { display: flex; align-items: center; gap: 10px; }
.asset-icon-box { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }
.asset-info { flex: 1; }
.asset-name { font-size: 13px; font-weight: 600; color: #0f1c14; display: block; }
.asset-type { font-size: 10px; color: #9bb8a8; }
.asset-balance { font-size: 15px; font-weight: 700; }

.chart-title { font-size: 13px; font-weight: 700; color: #0f1c14; display: block; margin-bottom: 16px; }
.chart-area { display: flex; justify-content: space-around; align-items: flex-end; }
.chart-col { display: flex; flex-direction: column-reverse; align-items: center; height: 180px; justify-content: flex-end; }
.bar-group { display: flex; gap: 3px; align-items: flex-end; transition: all 0.4s ease; }
.bar { width: 14px; border-radius: 4px 4px 0 0; }
.income-bar { background: linear-gradient(0deg,#4fd974,#25cc5d); }
.expense-bar { background: linear-gradient(0deg,#fbbf24,#f59e0b); }
.bar-label { font-size: 9px; color: #9bb8a8; margin-top: 6px; }

.sticker-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.sticker-chip { width: calc(33.33% - 7px); border-radius: 14px; cursor: pointer; }

/* Sheet */
.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 300; display: flex; align-items: flex-end; justify-content: center; }
.sheet-panel { width: 375px; padding: 20px 20px 30px; background: linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,252,242,0.96)); border-radius: 24px 24px 0 0; }
.sheet-handle { display: flex; justify-content: center; margin-bottom: 16px; }
.handle-bar { width: 38px; height: 4px; border-radius: 3px; background: rgba(194,242,200,0.8); }
.sheet-title { font-size: 16px; font-weight: 800; color: #0f1c14; display: block; margin-bottom: 14px; }
.sheet-input { width: 100%; height: 44px; border-radius: 14px; background: rgba(242,252,242,0.8); border: 1px solid rgba(194,242,200,0.4); padding: 0 14px; font-size: 14px; margin-bottom: 16px; }
.sheet-btn { width: 100%; padding: 14px; border-radius: 14px; background: linear-gradient(135deg,#4fd974,#25cc5d); text-align: center; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }
</style>
