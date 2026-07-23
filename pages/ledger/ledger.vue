<template>
  <view class="ledger-page" data-cmp="LedgerPage" :style="{ paddingTop: pagePaddingTop }">
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
    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false"
      style="height:calc(100% - 148rpx);z-index:2;">
      <!-- TopBar -->
      <view class="topbar">
        <view>
          <text class="topbar-sub">账本中心</text>
          <text class="topbar-title">我的账本</text>
        </view>
        <view class="topbar-actions">
          <!-- 待：替换图标，成员 -->
          <view class="action-btn" @click="goAssetMgr"><text>💳</text></view>
          <!-- <view class="action-btn" @click="goStickerLib"><text>⭐</text></view> -->
        </view>
      </view>

      <!-- Page tabs -->
      <!-- 待：替换图标 -->
      <view class="page-tab-bar">
        <view v-for="t in PAGE_TABS" :key="t.key" class="page-tab" :class="{ active: pageTab === t.key }"
          :style="{ width: pageTab === t.key ? '76rpx' : `calc((100% - 48rpx - 76rpx) / 3)` }"
          @click="switchTab(t.key)">
          <text class="tab-label">{{ t.label }}</text>
          <view class="tab-icon-wrap">
            <text class="tab-icon">{{ t.icon }}</text>
          </view>
        </view>
      </view>

      <!-- TAB: 账本 -->
      <view v-show="pageTab === 'ledger'" class="ledger-tab">
        <!-- 总览卡片：默认简洁总览，点击展开日/月/年明细 -->
        <view class="overview-card"></view>
        <view class="overview-card-btn" :class="{ 'is-swapping': calSwapping, 'is-out': swapDir === 'out' }"
          @click="onCalBtn">
          <view class="span-mother">
            <view v-for="(ch, i) in (calSwapping ? swapFrom : (ovExpanded ? '收起日历' : '查看日历'))" :key="'m' + i"
              class="swap-ch">{{ ch }}</view>
          </view>
          <view class="span-mother2">
            <view v-for="(ch, i) in (calSwapping ? swapTo : (ovExpanded ? '收起日历' : '查看日历'))" :key="'n' + i"
              class="swap-ch">{{ ch }}</view>
          </view>
        </view>
        <view class="card-1 glass-thin-2" style="margin:84rpx 32rpx 0;">
          <!-- 收起态：总余额 + 本月结余 -->
          <view v-show="!ovExpanded">
            <view class="summary-row">
              <view>
                <text class="summary-label">全部账本总余额</text>
                <text class="summary-amount">¥{{ fmt(totalBalance) }}</text>
              </view>
              <view style="text-align:right;">
                <text class="summary-label">本月消费</text>
                <text class="summary-amount" style="color: var(--ink)">¥{{ fmt(monthExpense) }}</text>
              </view>
            </view>

            <view class="summary-stats">
              <view class="stat-item">
                <text class="stat-label">账本</text>
                <text class="stat-value">{{ ledgers.length }}本</text>
              </view>
              <view class="stat-item">
                <text class="stat-label">记录</text>
                <text class="stat-value">{{ transactions.length }}笔</text>
              </view>
              <view class="stat-item">
                <text class="stat-label">本月结余</text>
                <text class="stat-value" :style="{ color: monthNet >= 0 ? 'var(--g4)' : 'var(--red-soft)' }">{{
                  monthNet >= 0 ? '+' : '-' }}¥{{ fmt(Math.abs(monthNet)) }}</text>
              </view>
            </view>
          </view>

          <!-- 展开态：日/月/年视图切换 -->
          <view v-show="ovExpanded" class="ov-body">
            <view class="ov-head">
              <view>
                <text class="summary-label">全部账本总余额</text>
                <text class="summary-amount">¥{{ fmt(totalBalance) }}</text>
              </view>
              <view class="seg">
                <view class="seg-item" :class="{ active: ovDim === 'day' }" @click="setOvDim('day')">日</view>
                <view class="seg-item" :class="{ active: ovDim === 'month' }" @click="setOvDim('month')">月</view>
                <view class="seg-item" :class="{ active: ovDim === 'year' }" @click="setOvDim('year')">年</view>
              </view>
            </view>

            <calendar-period-picker v-model="ovKey" :dim="ovDim" :day-expense-map="dayExpenseMap"
              :day-income-map="dayIncomeMap" :month-expense-map="monthExpenseMap" :month-income-map="monthIncomeMap"
              :year-expense-map="yearExpenseMap" :year-income-map="yearIncomeMap" />

            <scroll-view class="ov-scroll" scroll-x>
              <view class="ov-chip">
                <text class="ov-chip-label">支出</text>
                <text class="ov-chip-val" style="color:var(--red-soft)">-¥{{ fmt(ovExpense) }}</text>
              </view>
              <view class="ov-chip">
                <text class="ov-chip-label">收入</text>
                <text class="ov-chip-val" style="color:var(--g5)">+¥{{ fmt(ovIncome) }}</text>
              </view>
              <view class="ov-chip">
                <text class="ov-chip-label">结余</text>
                <text class="ov-chip-val" :style="{ color: ovNet >= 0 ? 'var(--g5)' : 'var(--red-soft)' }">{{
                  ovNet >= 0 ? '+' : '-' }}¥{{ fmt(Math.abs(ovNet)) }}</text>
              </view>
              <view class="ov-chip">
                <text class="ov-chip-label">账本</text>
                <text class="ov-chip-val" style="color:var(--amber2)">{{ ovLedgerCount }}本</text>
              </view>
              <view class="ov-chip">
                <text class="ov-chip-label">记录</text>
                <text class="ov-chip-val" style="color:var(--blue)">{{ ovTxCount }}笔</text>
              </view>
            </scroll-view>
          </view>
        </view>


        <!-- 账本列表标题 -->
        <view class="section-header">
          <view class="section-title-grp">
            <!-- 待：图标替换 -->
            <text class="section-icon">📚</text>
            <text class="section-title">{{ multiSelect ? '选择账本' : '我的账本' }}</text>
          </view>
          <view class="header-actions">
            <view class="select-btn" :class="{ active: multiSelect }" @click="toggleMultiSelect">
              <text>{{ multiSelect ? '完成' : '删除' }}</text>
            </view>
            <template v-if="!multiSelect">
              <view class="add-btn" @click="showNewLedger = true">
                <text>+ 新增账本</text>
              </view>
              <view class="list-toggle" :class="{ active: listGrid }" @click="listGrid = !listGrid">
                <view class="lt-bar lt-bar1"></view>
                <view class="lt-bar lt-bar2"></view>
                <view class="lt-bar lt-bar3"></view>
              </view>
            </template>
          </view>
        </view>

        <!-- 账本列表：列表 / 田字格 两种布局，随 listGrid 互斥切换 -->
        <view class="ledger-list" :class="listGrid ? 'is-grid' : 'is-list'">
          <view v-for="l in ledgerViews" :key="l._id" class="ledger-card-wrap">
            <view class="ledger-card-bg"></view>
            <view class="ledger-card card-item" @click="multiSelect ? toggleSelect(l) : openLedgerSheet(l)">
              <!-- 多选模式：卡片左侧复选框（总账本不可选） -->
              <view v-if="multiSelect && !l.is_system" class="ledger-check"
                :class="{ checked: selectedIds.includes(l._id) }" @click.stop="toggleSelect(l)">
                <text v-if="selectedIds.includes(l._id)" class="ledger-check-mark">✓</text>
              </view>
              <!-- 封面图：田字格时铺满卡片背景，列表时作左侧封面块 -->
              <image src="/static/images/icon_cover.png" mode="aspectFill" class="ledger-cover"></image>
              <!-- 右侧内容栏：名称+类型 与 收支/操作 同处一行（左名右收支），进度条在下方 -->
              <view class="ledger-body">
                <!-- 田字格下：该面板作为毛玻璃容器收纳除 badge 外的全部字段，框体随内容收缩 -->
                <view class="ledger-panel">
                  <view class="ledger-row">
                    <view class="ledger-info">
                      <view class="ledger-name-row">
                        <text class="ledger-name">{{ l.name }}</text>
                        <text class="ledger-type" :class="l.type">{{ l.type === 'master' ? '主账本' : '子账本' }}</text>
                      </view>
                      <text class="ledger-meta">{{ l.records }}笔</text>
                    </view>
                    <view class="ledger-balance">
                      <text class="balance-num inc">+¥{{ fmt(l.income) }}</text>
                      <text class="balance-sub exp">-¥{{ fmt(l.expense) }}</text>
                    </view>
                    <view v-if="!l.is_system && !multiSelect" class="ledger-actions">
                      <view class="ledger-act" @click.stop="openEdit(l)" hover-class="ledger-act-hover"><text>✏️</text>
                      </view>
                      <view class="ledger-act" @click.stop="openDelete(l)" hover-class="ledger-act-hover"><text>🗑️</text>
                      </view>
                    </view>
                  </view>
                  <view class="ledger-bar-wrap">
                    <text class="ledger-bar-label">
                      <text class="bar-dim">{{ dimWord(l.dim) }}</text>用 ¥{{ fmt(l.spent) }} / 限 ¥{{ fmt(l.limit) }}
                    </text>
                    <view class="ledger-bar" :style="{ '--base': l.color }">
                      <view class="ledger-bar-fill" :style="{ width: l.pct + '%' }" />
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- TAB: 资产 -->
      <view v-show="pageTab === 'asset'">
        <view class="asset-mode-bar" style="margin:32rpx;">
          <view v-for="m in assetModes" :key="m.id" class="asset-mode-btn" :class="{ active: assetMode === m.id }"
            @click="assetMode = m.id">
            {{ m.label }}
          </view>
        </view>
        <view class="glass-mid" style="margin:0 32rpx;padding:32rpx;">
          <text class="asset-total-label">{{ assetMode === 'disposable' ? '可支配资产' : assetMode === 'withInvest' ? '含投资' :
            '总资产净值' }}</text>
          <text class="asset-total-num" :style="{ color: assetDisplay >= 0 ? 'var(--g5)' : 'var(--red-soft)' }">¥{{
            fmt(Math.abs(assetDisplay)) }}</text>
        </view>
        <view v-for="a in ACCOUNTS" :key="a._id" class="asset-card glass-thin"
          style="margin:16rpx 32rpx 0;padding:28rpx 32rpx;" @click="goAssetDetail(a)">
          <view class="asset-row">
            <view class="asset-icon-box" :style="{ background: a.colorBg }">
              <text>{{ a.icon }}</text>
            </view>
            <view class="asset-info">
              <text class="asset-name">{{ a.name }}</text>
              <text class="asset-type">{{ a.type }}</text>
            </view>
            <text class="asset-balance" :style="{ color: a.balance >= 0 ? 'var(--ink)' : 'var(--red-soft)' }">¥{{
              fmt(a.balance) }}</text>
          </view>
        </view>
      </view>

      <!-- TAB: 报表 -->
      <view v-show="pageTab === 'chart'">
        <view class="glass-mid" style="margin:32rpx;padding:36rpx;">
          <text class="chart-title">📊 月度收支趋势</text>
          <view class="chart-area">
            <view v-for="(s, i) in MONTHLY" :key="i" class="chart-col"
              :style="{ flexDirection: 'column-reverse', alignItems: 'center', height: '360rpx', justifyContent: 'flex-end' }">
              <view class="bar-group">
                <view class="bar income-bar" :style="{ height: (s.income / maxBar * 240) + 'rpx' }" />
                <view class="bar expense-bar" :style="{ height: (s.expense / maxBar * 240) + 'rpx' }" />
              </view>
              <text class="bar-label">{{ s.month }}</text>
            </view>
          </view>
          <view style="display:flex;gap:32rpx;justify-content:center;margin-top:24rpx;">
            <view style="display:flex;align-items:center;gap:8rpx;">
              <view style="width:16rpx;height:16rpx;border-radius:4rpx;background:var(--g5);" /><text
                style="font-size:22rpx;color:var(--ink3);">收入</text>
            </view>
            <view style="display:flex;align-items:center;gap:8rpx;">
              <view style="width:16rpx;height:16rpx;border-radius:4rpx;background:var(--amber);" /><text
                style="font-size:22rpx;color:var(--ink3);">支出</text>
            </view>
          </view>
        </view>
      </view>

      <!-- TAB: 贴纸 -->
      <view v-show="pageTab === 'sticker'">
        <view class="sticker-grid" style="padding:32rpx;">
          <view v-for="s in STICKERS" :key="s.id" class="sticker-chip glass-thin"
            style="padding:24rpx 20rpx;text-align:center;">
            <text style="font-size:56rpx;display:block;">{{ s.emoji }}</text>
            <text style="font-size:20rpx;color:var(--ink2);font-weight:600;display:block;margin-top:8rpx;">{{ s.name
              }}</text>
            <text style="font-size:18rpx;color:var(--ink4);">已用 {{ s.used }} 次</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 多选批量操作栏 -->
    <view v-if="multiSelect" class="batch-bar">
      <view class="batch-info">
        <text class="batch-count">已选 {{ selectedIds.length }} 个</text>
        <text v-if="selectedIds.length === 0" class="batch-hint">点击卡片勾选要删除的账本</text>
      </view>
      <view class="batch-actions">
        <view class="batch-btn batch-cancel" @click="exitMultiSelect"><text>取消</text></view>
        <view class="batch-btn batch-del" :class="{ disabled: selectedIds.length === 0 }"
          @click="selectedIds.length > 0 && openBatchDelete()">
          <text>删除{{ selectedIds.length > 0 ? '(' + selectedIds.length + ')' : '' }}</text>
        </view>
      </view>
    </view>

    <!-- 删除确认弹窗（单选 / 多选通用）：列出即将删除的账本名称 -->
    <view v-if="showDelConfirm" class="sheet-overlay" @click="showDelConfirm = false">
      <view class="sheet-panel del-panel" @click.stop>
        <view class="sheet-handle">
          <view class="handle-bar" />
        </view>
        <text class="sheet-title">确认删除账本</text>
        <view class="del-list">
          <view v-for="d in delTargets" :key="d._id" class="del-item">
            <text class="del-emoji">{{ d.emoji }}</text>
            <text class="del-name">{{ d.name }}</text>
          </view>
        </view>
        <text class="del-tip">删除后账本及其记录将按所选方式处理，操作不可恢复</text>
        <view class="del-actions">
          <view class="del-btn del-transfer" @click="confirmDelete('transfer')">
            <text>数据转移至总账本</text>
          </view>
          <view class="del-btn del-purge" @click="confirmDelete('purge')">
            <text>彻底删除（含记录）</text>
          </view>
        </view>
        <view class="del-cancel" @click="showDelConfirm = false"><text>取消</text></view>
      </view>
    </view>

    <!-- 新增账本弹窗 -->
    <view v-if="showNewLedger" class="sheet-overlay" @click="showNewLedger = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle">
          <view class="handle-bar" />
        </view>
        <text class="sheet-title">新建账本</text>
        <input class="sheet-input" v-model="newLedgerName" placeholder="输入账本名称" />
        <view class="icon-grid">
          <view v-for="ic in LEDGER_ICONS" :key="ic" class="icon-cell" :class="{ active: newLedgerIcon === ic }"
            @click="newLedgerIcon = ic"><text>{{ ic }}</text></view>
        </view>
        <view class="sheet-btn" @click="createLedger">
          <text>创建账本</text>
        </view>
      </view>
    </view>

    <!-- 编辑账本弹窗 -->
    <view v-if="showEdit" class="sheet-overlay" @click="showEdit = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle">
          <view class="handle-bar" />
        </view>
        <text class="sheet-title">编辑账本</text>
        <input class="sheet-input" v-model="editName" placeholder="账本名称" />
        <view class="icon-grid">
          <view v-for="ic in LEDGER_ICONS" :key="ic" class="icon-cell" :class="{ active: editIcon === ic }"
            @click="editIcon = ic"><text>{{ ic }}</text></view>
        </view>
        <view class="sheet-btn" @click="saveEdit">
          <text>保存</text>
        </view>
      </view>
    </view>

    <!-- TabBar -->
    <TabBar :current="1" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import TabBar from '@/components/tabbar/tabbar.vue';
import { useUserStore, checkLoggedIn } from '@/stores/user.js';
import { deleteLedger, ensureMasterLedger } from '@/api/sparejar.js';
import { formatDateKey, formatMonthKey } from '@/utils/date.js';

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

const userStore = useUserStore();
const { state } = userStore;

const pageTab = ref('ledger');
const assetMode = ref('disposable');

// 新建账本
const showNewLedger = ref(false);

// 账本列表的「列表 / 田字格」视图切换（图标按钮动画状态）
const listGrid = ref(false);
const newLedgerName = ref('');
const newLedgerIcon = ref('📒');
const LEDGER_ICONS = ['📒', '🏠', '💼', '✈️', '🎓', '🍜', '🛒', '💰', '🐱', '🚗', '🏥', '🎮', '☕', '🏀'];

// 编辑账本
const showEdit = ref(false);
const editTarget = ref(null);
const editName = ref('');
const editIcon = ref('');

// 多选删除：模式开关、已选账本 id、删除确认弹窗目标
const multiSelect = ref(false);
const selectedIds = ref([]);
const delTargets = ref([]);
const showDelConfirm = ref(false);

// 真实账本 + 交易（用于聚合）
const ledgers = ref([]);
const transactions = ref([]);

const PALETTE = [
  { color: '#25cc5d', colorBg: '#e1fae3' },
  { color: '#7c6cf8', colorBg: '#f3f0ff' },
  { color: '#f59e0b', colorBg: '#fffbeb' },
  { color: '#ec4899', colorBg: '#fff0f6' },
  { color: '#06b6d4', colorBg: '#e0f7fb' },
  { color: '#ef4444', colorBg: '#fff0f0' }
];

const monthKey = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
})();

const fmt = (fen) => (fen / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const totalBalance = computed(() =>
  transactions.value.reduce((s, t) => s + (t.type === 'expense' ? -t.amount : t.amount), 0)
);
const monthIncome = computed(() =>
  transactions.value.filter(t => t.type !== 'expense' && t.month_key === monthKey).reduce((s, t) => s + t.amount, 0)
);
const monthExpense = computed(() =>
  transactions.value.filter(t => t.type === 'expense' && t.month_key === monthKey).reduce((s, t) => s + t.amount, 0)
);
const monthNet = computed(() => monthIncome.value - monthExpense.value);

// 全局统计卡片：默认简洁总览，点击展开日/月/年明细
const ovExpanded = ref(false);

// 点击切换时的逐字滑出/滑入动画反馈（取自 uiverse.io KINGFRESS/giant-deer-25 的 hover 效果）
const calSwapping = ref(false);
const swapFrom = ref('');
const swapTo = ref('');
const swapDir = ref('in'); // 'in'：收起日历滑入；'out'：收起日历滑出
let calSwapTimer = null;
const onCalBtn = () => {
  // 先捕获点击前的文案用于离场、点击后的文案用于入场，避免 ovExpanded 翻转后两层文字错乱
  swapFrom.value = ovExpanded.value ? '收起日历' : '查看日历';
  swapTo.value = ovExpanded.value ? '查看日历' : '收起日历';
  // 由「查看日历」点出 → 收起日历滑入；由「收起日历」点出 → 收起日历滑出（方向相反）
  swapDir.value = ovExpanded.value ? 'out' : 'in';
  ovExpanded.value = !ovExpanded.value;
  calSwapping.value = true;
  clearTimeout(calSwapTimer);
  calSwapTimer = setTimeout(() => { calSwapping.value = false; }, 750);
};
const ovDim = ref('month'); // 'day' | 'month' | 'year'
const ovKey = ref(formatMonthKey(new Date()));
function ovDefaultKey(dim) {
  const now = new Date();
  if (dim === 'day') return formatDateKey(now);
  if (dim === 'month') return formatMonthKey(now);
  return String(now.getFullYear());
}
function setOvDim(dim) {
  ovDim.value = dim;
  ovKey.value = ovDefaultKey(dim);
}
// 下方数据区：随选中的 年/月/日 实时联动。
// 关键：在每个 computed 顶部直接读取 ovDim.value / ovKey.value（ref），
// 确保依赖被 Vue 精准追踪，切换日期/维度时即时重算并重新渲染。
function inSelectedPeriod(t) {
  const dim = ovDim.value
  const key = ovKey.value
  if (dim === 'day') return t.date_key === key
  if (dim === 'month') return t.month_key === key
  return (t.date_key || '').startsWith(key + '-')
}
const ovExpense = computed(() => {
  const dim = ovDim.value
  const key = ovKey.value
  let s = 0
  for (const t of transactions.value) {
    if (t.type !== 'expense') continue
    if (dim === 'day' && t.date_key !== key) continue
    if (dim === 'month' && t.month_key !== key) continue
    if (dim === 'year' && !(t.date_key || '').startsWith(key + '-')) continue
    s += t.amount
  }
  return s
});
const ovIncome = computed(() => {
  const dim = ovDim.value
  const key = ovKey.value
  let s = 0
  for (const t of transactions.value) {
    if (t.type === 'expense') continue
    if (dim === 'day' && t.date_key !== key) continue
    if (dim === 'month' && t.month_key !== key) continue
    if (dim === 'year' && !(t.date_key || '').startsWith(key + '-')) continue
    s += t.amount
  }
  return s
});
const ovNet = computed(() => ovIncome.value - ovExpense.value);
const ovTxCount = computed(() => {
  const dim = ovDim.value
  const key = ovKey.value
  let n = 0
  for (const t of transactions.value) {
    if (dim === 'day' && t.date_key !== key) continue
    if (dim === 'month' && t.month_key !== key) continue
    if (dim === 'year' && !(t.date_key || '').startsWith(key + '-')) continue
    n++
  }
  return n
});
// 账本：当前周期内「有流水」的账本数（按 ledger_id 去重），随日期动态变化，而非固定总数
const ovLedgerCount = computed(() => {
  const dim = ovDim.value
  const key = ovKey.value
  const set = new Set()
  for (const t of transactions.value) {
    if (dim === 'day' && t.date_key !== key) continue
    if (dim === 'month' && t.month_key !== key) continue
    if (dim === 'year' && !(t.date_key || '').startsWith(key + '-')) continue
    if (t.ledger_id) set.add(t.ledger_id)
  }
  return set.size
});

// 日历网格用：按日 / 按月 / 按年聚合收入与支出（分），用于格子下方的金额提示
const dayExpenseMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type === 'expense' && t.date_key) map[t.date_key] = (map[t.date_key] || 0) + t.amount;
  }
  return map;
});
const dayIncomeMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type !== 'expense' && t.date_key) map[t.date_key] = (map[t.date_key] || 0) + t.amount;
  }
  return map;
});
const monthExpenseMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type === 'expense' && t.month_key) map[t.month_key] = (map[t.month_key] || 0) + t.amount;
  }
  return map;
});
const monthIncomeMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type !== 'expense' && t.month_key) map[t.month_key] = (map[t.month_key] || 0) + t.amount;
  }
  return map;
});
const yearExpenseMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type === 'expense' && t.date_key) {
      const y = t.date_key.slice(0, 4);
      map[y] = (map[y] || 0) + t.amount;
    }
  }
  return map;
});
const yearIncomeMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type !== 'expense' && t.date_key) {
      const y = t.date_key.slice(0, 4);
      map[y] = (map[y] || 0) + t.amount;
    }
  }
  return map;
});

// 每个账本的展示视图：聚合交易，按当前选中的 日/月/年 维度实时联动
// （收入、支出、使用额、限额、笔数均随 ovDim/ovKey 变化）
const ledgerViews = computed(() =>
  ledgers.value.map((l, i) => {
    const isMaster = !!l.is_system;
    const txs = isMaster ? transactions.value : transactions.value.filter(t => t.ledger_id === l._id);
    const dim = ovDim.value;
    const key = ovKey.value;
    const inPeriod = (t) => {
      if (dim === 'day') return t.date_key === key;
      if (dim === 'month') return t.month_key === key;
      return (t.date_key || '').startsWith(key + '-');
    };
    const periodTxs = txs.filter(inPeriod);
    const income = periodTxs.filter(t => t.type !== 'expense').reduce((s, t) => s + t.amount, 0);
    const expense = periodTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    // 限额随维度换算：月=月预算，日=月预算/30，年=月预算×12
    const monthly = l.monthly_budget || 0;
    let limit = monthly;
    if (dim === 'day') limit = monthly ? Math.round(monthly / 30) : 0;
    else if (dim === 'year') limit = monthly * 12;

    const spent = expense;
    const pct = limit > 0 ? Math.min(Math.round(spent / limit * 100), 100) : 0;
    const pal = PALETTE[i % PALETTE.length];
    return {
      _id: l._id,
      emoji: l.icon || '📒',
      name: l.name,
      type: isMaster ? 'master' : 'sub',
      is_system: isMaster,
      income,
      expense,
      balance,
      limit,
      spent,
      pct,
      dim,
      records: periodTxs.length,
      color: pal.color,
      colorBg: pal.colorBg
    };
  })
);

// 维度中文前缀：用于进度条“使用/限额”标签
const dimWord = (dim) => (dim === 'day' ? '日' : dim === 'year' ? '年' : '月');

// —— 资产 Tab：接入真实资产账户（阶段 10） ——
const ASSET_SUBTYPE_ICON = {
  wechat: '💚', alipay: '💙', bank: '🏦', cash: '💵',
  provident_fund: '🏠', insurance: '🛡️',
  fund: '📈', stock: '📊', bond: '📜', gold: '🪙', wealth: '💼', other: '📦'
}
const ASSET_SUBTYPE_BG = {
  wechat: '#e8f8ec', alipay: '#e8f1fb', bank: '#f3f0ff', cash: '#e1fae3',
  provident_fund: '#eaf3ff', insurance: '#fdeef0',
  fund: '#fffbeb', stock: '#eef5ff', bond: '#f3f0ff', gold: '#fbf3e0', wealth: '#eafaf1', other: '#eef1f4'
}
const ASSET_SUBTYPE_LABEL = {
  wechat: '微信', alipay: '支付宝', bank: '银行卡', cash: '现金',
  provident_fund: '公积金', insurance: '医保',
  fund: '基金', stock: '股票', bond: '债券', gold: '黄金', wealth: '理财', other: '其他'
}
const ACCOUNTS = computed(() => (state.assets || []).map((a) => ({
  _id: a._id,
  icon: ASSET_SUBTYPE_ICON[a.account_subtype] || '💳',
  colorBg: ASSET_SUBTYPE_BG[a.account_subtype] || '#e1fae3',
  name: a.name,
  type: ASSET_SUBTYPE_LABEL[a.account_subtype] || a.account_subtype,
  balance: a.balance
})))

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

const cash = computed(() => (state.assetTotals ? state.assetTotals.disposable : 0));
const invest = computed(() => (state.assetTotals ? state.assetTotals.investment : 0));
const total = computed(() => (state.assetTotals ? state.assetTotals.full : 0));
const assetDisplay = computed(() => assetMode.value === 'disposable' ? cash.value : assetMode.value === 'withInvest' ? cash.value + invest.value : total.value);

async function loadData() {
  const uid = state.uid;
  console.log('[ledger][loadData] called, uid =', JSON.stringify(uid));
  if (!uid) {
    console.warn('[ledger][loadData] uid 为空，跳过加载');
    return;
  }
  try {
    const db = uniCloud.database();
    // 不在 where 里用 deleted_at: cmd.eq(null)，改为查询后 JS 过滤，
    // 避免客户端 JQL 对 cmd.eq(null) 的序列化差异导致返回 0 行。
    const ledgerWhere = { user_id: uid };
    console.log('[ledger][loadData] 查询账本请求参数 ledgerWhere =', JSON.stringify(ledgerWhere));
    const [ledgerRes, txRes] = await Promise.all([
      db.collection('ledgers').where(ledgerWhere).orderBy('sort_order', 'asc').get(),
      db.collection('transactions').where({ user_id: uid }).get()
    ]);
    // 客户端 JQL 的 get() 响应可能被包在 result 字段下（{ result: { data } }），
    // 也可能直接返回 { data }；两种结构都兼容，否则会误判「无总账本」而重复兜底创建。
    const ledgerData = (ledgerRes && ledgerRes.result && Array.isArray(ledgerRes.result.data))
      ? ledgerRes.result.data
      : (Array.isArray(ledgerRes && ledgerRes.data) ? ledgerRes.data : [])
    const txData = (txRes && txRes.result && Array.isArray(txRes.result.data))
      ? txRes.result.data
      : (Array.isArray(txRes && txRes.data) ? txRes.data : [])
    console.log('[ledger][loadData] 账本接口响应 result =', JSON.stringify(ledgerRes));
    console.log('[ledger][loadData] 账本原始 data 长度 =', ledgerData.length);
    console.log('[ledger][loadData] 交易接口响应 data 长度 =', txData.length);

    // JS 端过滤软删（deleted_at 为空/未设置的才是有效账本）
    let list = ledgerData.filter(l => !l.deleted_at);
    console.log('[ledger][loadData] 过滤软删后有效账本数 =', list.length);
    const hasMaster = list.some(l => l.is_system);
    console.log('[ledger][loadData] 响应中是否含总账本(is_system) =', hasMaster,
      '各账本 is_system =', JSON.stringify(list.map(l => ({ name: l.name, is_system: !!l.is_system }))));

    if (!hasMaster) {
      console.log('[ledger][loadData] 未检测到总账本，尝试 ensureMasterLedger() 兜底创建');
      try {
        const master = await ensureMasterLedger();
        console.log('[ledger][loadData] ensureMasterLedger 返回 =', JSON.stringify(master));
        list.unshift(master);
      } catch (err) {
        console.error('[ledger][loadData] ensure master ledger failed, fallback to direct create', err);
        try {
          const addRes = await db.collection('ledgers').add({
            user_id: uid,
            name: '总账本',
            icon: '📒',
            is_system: true,
            is_default: false,
            is_shared: false,
            sort_order: 0,
            created_at: Date.now()
          });
          console.log('[ledger][loadData] 前端直写总账本成功, id =', addRes.id);
          list.unshift({ _id: addRes.id, name: '总账本', icon: '📒', is_system: true, sort_order: 0 });
        } catch (err2) {
          console.error('[ledger][loadData] direct create master ledger failed', err2);
        }
      }
    } else {
      console.log('[ledger][loadData] 总账本已存在，无需创建');
    }
    // 总账本始终置顶，其余按 sort_order 升序
    list.sort((a, b) => {
      if (a.is_system && !b.is_system) return -1;
      if (!a.is_system && b.is_system) return 1;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
    console.log('[ledger][loadData] 最终渲染列表长度 =', list.length,
      '顺序 =', JSON.stringify(list.map(l => ({ name: l.name, is_system: !!l.is_system }))));
    ledgers.value = list;
    transactions.value = txData;
    if (list.length === 0) {
      console.warn('[ledger][loadData] ⚠️ 最终列表仍为空：请确认已登录（非游客）且 ensureMasterLedger 或前端直写成功，详见上方日志');
    }
    await userStore.loadAssetAccounts().catch(() => { });
  } catch (err) {
    console.error('[ledger][loadData] load failed', err);
  }
}

// 顶部安全区：避开微信小程序右上角原生胶囊按钮（与 index/TopBar 一致）
function resolveTopPadding() {
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect();
    if (menuButton?.bottom > 0) {
      const gap = uni.upx2px(16);
      return `${menuButton.bottom + gap}px`;
    }
  } catch (_) { }
  const { statusBarHeight = 0 } = uni.getSystemInfoSync();
  return `${statusBarHeight + uni.upx2px(88)}px`;
}
const pagePaddingTop = ref(resolveTopPadding());

// 会话恢复是异步云调用，页面挂载时 uid 可能尚未就绪；
// 因此除首次挂载外，还在「会话就绪」与「每次进入 tab」时重新加载，
// 避免列表因竞态而永远为空、总账本永远不被创建。
function onSessionReady() {
  if (state.uid) loadData();
}

onMounted(() => {
  pagePaddingTop.value = resolveTopPadding();
  if (state.uid) loadData();
  uni.$on('sparejar-session-ready', onSessionReady);
});

onShow(() => {
  // 双保险：即便绕过 TabBar 拦截直接进入账本页，未登录也重定向到登录页
  if (!checkLoggedIn()) {
    uni.showToast({ title: '请先登录后查看账本', icon: 'none' });
    uni.navigateTo({ url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/ledger/ledger') });
    return;
  }
  if (state.uid) loadData();
});

onUnmounted(() => {
  uni.$off('sparejar-session-ready', onSessionReady);
});

const openLedgerSheet = (l) => {
  uni.navigateTo({ url: `/pages/ledger-detail/ledger-detail?id=${l._id}` });
};
const goAssetMgr = () => uni.navigateTo({ url: '/pages/asset-mgr/asset-mgr' });
const goAssetDetail = (a) => uni.navigateTo({ url: `/pages/asset-detail/asset-detail?id=${a._id}` });
const goStickerLib = () => uni.navigateTo({ url: '/pages/sticker-lib/sticker-lib' });

/** 顶部 Tab 切换；贴纸 Tab 跳转到独立贴纸库页（避免内联占位）。 */
function switchTab(key) {
  if (key === 'sticker') {
    uni.navigateTo({ url: '/pages/sticker-lib/sticker-lib' });
    return
  }
  pageTab.value = key
}

// 新建账本
async function createLedger() {
  const name = newLedgerName.value.trim();
  if (!name) { uni.showToast({ title: '请输入账本名称', icon: 'none' }); return; }
  const customCount = ledgers.value.filter(l => !l.is_system).length;
  const max = (state.settings && state.settings.max_custom_ledgers) || 5;
  if (customCount >= max) { uni.showToast({ title: `最多创建 ${max} 个账本`, icon: 'none' }); return; }
  try {
    const db = uniCloud.database();
    await db.collection('ledgers').add({
      user_id: state.uid,
      name,
      icon: newLedgerIcon.value,
      is_system: false,
      is_default: false,
      is_shared: false,
      monthly_budget: 0,
      sort_order: ledgers.value.length,
      created_at: Date.now()
    });
    showNewLedger.value = false;
    newLedgerName.value = '';
    newLedgerIcon.value = '📒';
    uni.showToast({ title: '已创建', icon: 'success' });
    await loadData();
  } catch (err) {
    const msg = (err && (err.message || err.errMsg)) || '创建失败';
    uni.showToast({ title: /uk_user_name|重复|duplicate/i.test(msg) ? '账本名称已存在' : '创建失败', icon: 'none' });
  }
}

// 编辑账本
function openEdit(l) {
  if (l.is_system) { uni.showToast({ title: '总账本不可编辑', icon: 'none' }); return; }
  editTarget.value = l;
  editName.value = l.name;
  editIcon.value = l.icon || '📒';
  showEdit.value = true;
}
async function saveEdit() {
  const name = editName.value.trim();
  if (!name) { uni.showToast({ title: '请输入账本名称', icon: 'none' }); return; }
  try {
    const db = uniCloud.database();
    await db.collection('ledgers').doc(editTarget.value._id).update({ name, icon: editIcon.value, updated_at: Date.now() });
    showEdit.value = false;
    uni.showToast({ title: '已保存', icon: 'success' });
    await loadData();
  } catch (err) {
    uni.showToast({ title: '保存失败', icon: 'none' });
  }
}

// 多选模式开关：进入时隐藏底部 tabbar，退出时恢复
function toggleMultiSelect() {
  if (multiSelect.value) {
    exitMultiSelect();
  } else {
    multiSelect.value = true;
    uni.$emit('hide-tabbar');
  }
}
function exitMultiSelect() {
  multiSelect.value = false;
  selectedIds.value = [];
  uni.$emit('show-tabbar');
}

// 勾选 / 取消勾选（总账本不可选）
function toggleSelect(l) {
  if (l.is_system) return;
  const id = l._id;
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter(x => x !== id)
    : [...selectedIds.value, id];
}

// 单选删除：弹出二次确认（列出账本名，选择处理方式）
function openDelete(l) {
  if (l.is_system) { uni.showToast({ title: '总账本不可删除', icon: 'none' }); return; }
  delTargets.value = [l];
  showDelConfirm.value = true;
}

// 批量删除：收集已选非系统账本，弹出二次确认
function openBatchDelete() {
  const targets = ledgerViews.value.filter(l => selectedIds.value.includes(l._id) && !l.is_system);
  if (!targets.length) return;
  delTargets.value = targets;
  showDelConfirm.value = true;
}

// 执行删除（单选 / 多选共用）：转移或彻底删除，均带确认
async function confirmDelete(mode) {
  const targets = delTargets.value;
  if (!targets.length) return;
  try {
    await Promise.all(targets.map(t => deleteLedger(t._id, mode)));
    uni.showToast({ title: `已删除 ${targets.length} 个账本`, icon: 'success' });
    showDelConfirm.value = false;
    delTargets.value = [];
    selectedIds.value = [];
    if (multiSelect.value) exitMultiSelect();
    await loadData();
  } catch (err) {
    const msg = err && err.message ? err.message : '删除失败';
    uni.showToast({ title: msg, icon: 'none' });
  }
}

// 组件卸载时若仍处于多选态，恢复 tabbar 显示
onUnmounted(() => {
  if (multiSelect.value) uni.$emit('show-tabbar');
});
</script>

<style scoped lang="scss">
.ledger-page {
  width: 750rpx;
  height: 1624rpx;
  overflow: hidden;
  position: relative;
  margin: 0 auto;
  background: var(--g0);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 36rpx;

  &-sub {
    font-size: 22rpx;
    color: var(--ink4);
    display: block;
    margin-bottom: 4rpx;
  }

  &-title {
    font-size: 40rpx;
    font-weight: 900;
    color: var(--ink);
    letter-spacing: -1rpx;
  }

  &-actions {
    display: flex;
    gap: 16rpx;
  }
}

.action-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  @include sj-glass(32rpx, rgba(255, 255, 255, 0.4));
  @include sj-flex-center;
  cursor: pointer;
  font-size: 32rpx;
  box-shadow: 0 8rpx 64rpx rgba(0, 0, 0, 0.08);
}

.page-tab-bar {
  padding: 28rpx 32rpx 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.page-tab {
  position: relative;
  height: 76rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16rpx;
  border-radius: 38rpx;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(36rpx) saturate(1.3);
  -webkit-backdrop-filter: blur(36rpx) saturate(1.3);
  border: 2rpx solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8rpx 15rpx rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  overflow: hidden;
  cursor: pointer;
  transition: width 0.2s ease, background 0.2s ease;
  // transition: width 0.38s cubic-bezier(0.34, 1.5, 0.64, 1),
  //             border-radius 0.38s cubic-bezier(0.34, 1.5, 0.64, 1),
  //             background 0.38s ease,
  //             box-shadow 0.38s ease,
  //             padding 0.38s ease;

  &.active {
    border-radius: 50%;
    padding: 0;
    background-image: linear-gradient(to left bottom, #c2f2c81e, #b0eeb825, #9ce9a834, #88e5994d, #72e08a3a, #6cdf8534, #66dd8231, #60dc7f1f, #6bde866b, #76e18d5d, #7fe3955a, #89e59b65);
    backdrop-filter: blur(32rpx);
    -webkit-backdrop-filter: blur(32rpx);
    border-color: transparent;
    box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.08);
    border: 2rpx solid #89e59b2a;
  }
}

.tab-label {
  position: absolute;
  left: 32rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--ink3);
  white-space: nowrap;
  // transition: opacity 0.28s ease, transform 0.28s ease;

  .page-tab.active & {
    opacity: 0;
    transform: translateX(-20rpx);
    pointer-events: none;
  }
}

.tab-icon-wrap {
  position: absolute;
  right: 10rpx;
  top: 10rpx;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #89e59b2c;
  backdrop-filter: blur(32rpx);
  -webkit-backdrop-filter: blur(32rpx);
  border: 2rpx solid #89e59b54;
  display: flex;
  align-items: center;
  justify-content: center;

  .page-tab.active & {
    right: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background: transparent;
  }
}

.tab-icon {
  font-size: 26rpx;
  line-height: 1;

  .page-tab.active & {
    font-size: 34rpx;
    color: #fff;
  }
}


.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 28rpx;
}

.summary-label {
  font-size: 20rpx;
  color: var(--ink4);
  display: block;
  margin-bottom: 6rpx;
}

.summary-amount {
  font-size: 64rpx;
  font-weight: 900;
  color: var(--ink);
  letter-spacing: -2rpx;
}

.summary-income {
  font-size: 40rpx;
  font-weight: 800;
  color: var(--g5);
}

/* 全局统计卡：视图切换 */
.ov-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.seg {
  display: flex;
  background: rgba(194, 242, 200, 0.25);
  border-radius: 24rpx;
  padding: 6rpx;

  &-item {
    padding: 12rpx 28rpx;
    border-radius: 18rpx;
    font-size: 24rpx;
    font-weight: 600;
    color: var(--ink3);
    cursor: pointer;

    &.active {
      background: #fff;
      color: var(--g5);
      box-shadow: 0 4rpx 12rpx rgba(37, 204, 93, 0.15);
    }
  }
}

.ov-scroll {
  /* 功能性：保留占满 card-1 宽度并贴底（上一需求的布局约束） */
  position: absolute;
  left: 1%;
  right: 1%;
  bottom: 8rpx;
  width: 98%;
  box-sizing: border-box;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  display: flex;
  align-items: center;
  padding: 0 16rpx;
  height: 100rpx;
  /* 来自 Uiverse 按钮的初始默认静态样式（已排除 transition / :hover / :active / :focus 等交互与动画规则） */
  background: linear-gradient(-75deg,
      rgba(255, 255, 255, 0.05),
      rgba(255, 255, 255, 0.2),
      rgba(255, 255, 255, 0.05));
  border-radius: 999vw;
  box-shadow:
    inset 0 0.125em 0.125em rgba(0, 0, 0, 0.05),
    inset 0 -0.125em 0.125em rgba(255, 255, 255, 0.5),
    0 0.25em 0.125em -0.125em rgba(0, 0, 0, 0.2),
    0 0 0.1em 0.25em inset rgba(255, 255, 255, 0.2),
    0 0 0 0 rgba(255, 255, 255, 1);
  backdrop-filter: blur(clamp(1px, 0.125em, 4px));
  -webkit-backdrop-filter: blur(clamp(1px, 0.125em, 4px));
  -moz-backdrop-filter: blur(clamp(1px, 0.125em, 4px));
  -ms-backdrop-filter: blur(clamp(1px, 0.125em, 4px));

  .ov-chip {
    display: inline-block;
    vertical-align: top;
    min-width: 156rpx;
    margin-right: 16rpx;
    padding: 18rpx 24rpx;
    background: var(--g0);
    border-radius: 20rpx;
    text-align: left;
    box-sizing: border-box;

    .ov-chip-label {
      font-size: 20rpx;
      color: var(--ink4);
      margin-bottom: 6rpx;
    }

    .ov-chip-val {
      font-size: 30rpx;
      font-weight: 800;
      color: var(--ink);
    }
  }
}

.ov-body {
  /* 预留底部空间，供绝对定位的 ov-scroll 贴底展示，避免遮挡日历 */
  padding-bottom: 76rpx;
}

.summary-stats {
  display: flex;
  padding-top: 24rpx;
  border-top: 2rpx solid rgba(15, 28, 20, 0.06);
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-label {
  font-size: 20rpx;
  color: var(--ink4);
  display: block;
  margin-bottom: 6rpx;
}

.stat-value {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--g4);
}

.ledger-tab {
  position: relative;

  .overview-card {
    position: absolute;
    top: -46rpx;
    left: 44rpx;
    width: 80%;
    height: 59%;
    background: radial-gradient(120% 90% at 0% 0%, rgba(169, 253, 186, 0.534) 0%, rgba(194, 242, 200, 0) 55%),
      radial-gradient(120% 90% at 100% 0%, rgba(149, 238, 167, 0.14) 0%, rgba(159, 236, 174, 0) 55%),
      radial-gradient(140% 120% at 100% 100%, rgba(37, 204, 93, 0.119) 0%, rgba(37, 204, 93, 0) 60%),
      linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(253, 255, 253, 0.84));
    border-radius: 32rpx;

    &-btn {
      position: absolute;
      top: -46rpx;
      right: 32rpx;
      border-radius: 32rpx;
      background: var(--g4);
      padding: 10rpx 20rpx;
      border-top-left-radius: 75rpx;
      border-bottom-right-radius: 75rpx;
      transition: 0.2s;
      display: flex;
      justify-content: center;
      align-items: center;
      color: #fff;
      font-size: 24rpx;
    }
  }
}

/* 账本总览切换按钮：取自 uiverse.io KINGFRESS/giant-deer-25 的逐字滑出/滑入 hover 动画，
   作为点击反馈；仅新增动画所需的结构样式，不改变按钮原有外观与页面布局 */
.overview-card-btn {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;

  .span-mother {
    display: flex;
    overflow: hidden;
  }

  .span-mother2 {
    display: flex;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    // 默认（滑入方向）：新文字从上方隐藏
    .swap-ch {
      transform: translateY(-42rpx);
    }
  }

  // 滑出方向：新文字从下方隐藏（静止态）
  &.is-out .span-mother2 .swap-ch {
    transform: translateY(42rpx);
  }

  &.is-swapping {

    // 滑入：当前文字向下退出，新文字从上方滑入
    .span-mother .swap-ch {
      transform: translateY(42rpx);
    }

    .span-mother2 .swap-ch {
      transform: translateY(0);
    }

    // 滑出：当前文字向上退出，新文字从下方滑入（与滑入方向相反）
    &.is-out .span-mother .swap-ch {
      transform: translateY(-42rpx);
    }

    &.is-out .span-mother2 .swap-ch {
      transform: translateY(0);
    }

    // 过渡仅在交换过程中启用，逐字递增形成级联；静止态无过渡，复位时瞬间归位，避免另一层文字回滑露出残影
    .swap-ch:nth-child(1) {
      transition: transform 0.2s;
    }

    .swap-ch:nth-child(2) {
      transition: transform 0.3s;
    }

    .swap-ch:nth-child(3) {
      transition: transform 0.4s;
    }

    .swap-ch:nth-child(4) {
      transition: transform 0.5s;
    }
  }

  .swap-ch {
    display: block;
    height: 42rpx;
    line-height: 42rpx;
    overflow: hidden;
  }
}

// .overview-card {
//   position: relative;
//   margin: 32rpx 32rpx 0;
//   padding: 6rpx;
//   border-radius: 44rpx;
//   overflow: hidden;
//   background:
//     radial-gradient(120% 90% at 0% 0%, rgba(124, 108, 248, 0.16) 0%, rgba(124, 108, 248, 0) 55%),
//     radial-gradient(120% 90% at 100% 0%, rgba(6, 182, 212, 0.14) 0%, rgba(6, 182, 212, 0) 55%),
//     radial-gradient(140% 120% at 100% 100%, rgrgba(37, 204, 93, 0.20) 0%, rgba(37, 204, 93, 0) 60%),
//     linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(242, 252, 242, 0.84));
//   box-shadow:
//     0 10rpx 40rpx rgba(37, 204, 93, 0.12),
//     0 2rpx 10rpx rgba(0, 0, 0, 0.04),
//     inset 0 2rpx 0 rgba(255, 255, 255, 0.9);
// }

.card-1 {
  position: relative;
  padding: 36rpx 36rpx 46rpx 36rpx;
  animation: cardFadeIn 0.55s cubic-bezier(0.22, 0.61, 0.36, 1);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 36rpx 36rpx 16rpx;
}

.section-title-grp {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.section-icon {
  font-size: 28rpx;
  color: var(--g5);
}

.section-title {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ink);
}

.add-btn {
  /* 参考 Uiverse (mrhyddenn) 暗色按钮风格 */
  position: relative;
  margin: 0;
  padding: 10rpx 24rpx;
  /* 当前尺寸（基于 22rpx 字号） */
  outline: none;
  text-decoration: none;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  border: none;
  text-transform: uppercase;
  background-color: var(--g4);
  /* 背景色 */
  border-radius: 20rpx;
  /* 10px 圆角 */
  color: #fff;
  /* 文字色 */
  font-weight: 300;
  font-size: 22rpx;
  /* 18px */
  font-family: inherit;
  z-index: 0;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.02, 0.01, 0.47, 1);
}

/* hover 时从右下角溢出的白色光晕（::before / ::after 双圆） */
.add-btn::before,
.add-btn::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  width: 90rpx;
  /* 随按钮新尺寸等比缩小（原 100px≈200rpx 已过大） */
  height: 90rpx;
  border-radius: 50%;
  background: #fff;
  opacity: 0;
  transition: transform 0.15s cubic-bezier(0.02, 0.01, 0.47, 1), opacity 0.15s cubic-bezier(0.02, 0.01, 0.47, 1);
  z-index: -1;
  transform: translate(100%, -25%);
}

// .add-btn:hover {
//   animation: addBtnShake 0.5s ease-in-out both;       /* 轻微摇摆 */
// }

.add-btn:hover::before,
.add-btn:hover::after {
  opacity: 0.15;
  transition: transform 0.2s cubic-bezier(0.02, 0.01, 0.47, 1), opacity 0.2s cubic-bezier(0.02, 0.01, 0.47, 1);
}

.add-btn:hover::before {
  transform: translate(50%, 0) scale(0.9);
}

.add-btn:hover::after {
  transform: translate(50%, 0) scale(1.1);
}

@keyframes addBtnShake {
  0% {
    transform: rotate(0deg) translate3d(0, 0, 0);
  }

  25% {
    transform: rotate(7deg) translate3d(0, 0, 0);
  }

  50% {
    transform: rotate(-7deg) translate3d(0, 0, 0);
  }

  75% {
    transform: rotate(1deg) translate3d(0, 0, 0);
  }

  100% {
    transform: rotate(0deg) translate3d(0, 0, 0);
  }
}

/* 标题栏右侧操作组：新增账本 + 列表/田字格切换 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

/* 列表 ⇄ 田字格 图标按钮（圆角正方形，与 add-btn 同色系） */
.list-toggle {
  position: relative;
  width: 46rpx;
  /* 与左侧 add-btn 高度一致 */
  height: 46rpx;
  border-radius: 16rpx;
  /* 与 add-btn 圆角统一 */
  background-color: var(--g4);
  cursor: pointer;
  flex: none;
}

/* 三条圆角矩形（列表图标初始态） */
.lt-bar {
  position: absolute;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(36rpx) saturate(1.3);
  -webkit-backdrop-filter: blur(36rpx) saturate(1.3);
  border: 2rpx solid rgba(255, 255, 255, 0.5);
  border-radius: 3rpx;
  will-change: top, left, width, height, border-radius;
  transition: top 0.35s cubic-bezier(0.65, 0, 0.35, 1),
    left 0.35s cubic-bezier(0.65, 0, 0.35, 1),
    width 0.35s cubic-bezier(0.65, 0, 0.35, 1),
    height 0.35s cubic-bezier(0.65, 0, 0.35, 1),
    border-radius 0.35s cubic-bezier(0.65, 0, 0.35, 1);
}

/* 列表态：三条水平圆角矩形，垂直居中分布（按 46rpx 容器等比缩放） */
.lt-bar1 {
  top: 13rpx;
  left: 12rpx;
  width: 23rpx;
  height: 4rpx;
}

.lt-bar2 {
  top: 21rpx;
  left: 12rpx;
  width: 23rpx;
  height: 4rpx;
}

.lt-bar3 {
  top: 29rpx;
  left: 12rpx;
  width: 23rpx;
  height: 4rpx;
}

/* 田字格态：变形为三个圆角正方形，分布 左上 / 右上 / 左下，右下留空（按 46rpx 容器等比缩放） */
.list-toggle.active .lt-bar1 {
  top: 6rpx;
  left: 6rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 4rpx;
}

.list-toggle.active .lt-bar2 {
  top: 6rpx;
  left: 26rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 4rpx;
}

.list-toggle.active .lt-bar3 {
  top: 26rpx;
  left: 6rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 4rpx;
}

/* 反向（田字格 → 列表）：与正向完全对称、互为镜像。
   过渡属性/时长/缓动与基础态一致，仅 起止坐标互换，
   因此三格正方形会同步「收缩尺寸 + 位移重组」回三条水平圆角矩形，无跳变。 */
.list-toggle.active .lt-bar {
  transition: top 0.35s cubic-bezier(0.65, 0, 0.35, 1),
    left 0.35s cubic-bezier(0.65, 0, 0.35, 1),
    width 0.35s cubic-bezier(0.65, 0, 0.35, 1),
    height 0.35s cubic-bezier(0.65, 0, 0.35, 1),
    border-radius 0.35s cubic-bezier(0.65, 0, 0.35, 1);
}

.card-item {
  animation: cardFadeIn 0.65s cubic-bezier(0.22, 0.61, 0.36, 1) backwards;

  &:nth-child(2) {
    animation-delay: 0.1s;
  }

  &:nth-child(3) {
    animation-delay: 0.2s;
  }

  &:nth-child(4) {
    animation-delay: 0.3s;
  }
}

/* 账本列表布局：列表 / 田字格 两种模式，互斥切换 */
.ledger-list .ledger-card {
  /* 切换布局时让边距/内边距平滑过渡 */
  transition: margin 0.3s ease, padding 0.3s ease, border-radius 0.3s ease;
}

/* 列表态外层包裹：仅作定位上下文（position:relative，无 z-index → 不形成层叠上下文），
   供内部 .ledger-card-bg（绿色层叠背景）绝对定位。
   卡片用 position:relative 回归常规流，使 wrap 获得正确高度、多卡纵向排列不重叠。 */
.ledger-list.is-list .ledger-card-wrap {
  position: relative;
}

/* 绿色层叠背景：绝对定位于 wrap 内、卡片之下（z-index:0）。
   四周比卡片各探出 8rpx（左右/底部），形成“卡片下垫一层圆角矩形”的层叠视觉。 */
.ledger-list.is-list .ledger-card-bg {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  top: 8rpx;
  bottom: -8rpx;
  background: linear-gradient(to right, var(--g1) 0%, var(--g1) 80%, var(--g0) 100%);
  border-radius: 28rpx;
  z-index: 0;
  box-shadow: 0 12rpx 30rpx rgba(74, 222, 128, 0.18);
}

/* 列表态：卡片（毛玻璃）视觉，背景为 Uiverse(Smit-Prajapati) 白色半透明叠加层 + blur。
   回归常规流（position:relative）使 wrap 获得正确高度，多张卡片纵向排列且不重叠；
   z-index:1 确保压在绿色背景之上。
   采用两栏布局：左图标 + 右内容栏（信息/余额/操作 + 进度条）。 */
.ledger-list.is-list .ledger-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
  margin: 0 32rpx 16rpx;
  padding: 28rpx 32rpx;
  background: linear-gradient(0deg, rgba(255, 255, 255, 0.349) 0%, rgba(255, 255, 255, 0.815) 100%);
  backdrop-filter: blur(10rpx) saturate(1.3);
  -webkit-backdrop-filter: blur(10rpx) saturate(1.3);
  border-left: 2rpx solid white;
  border-bottom: 2rpx solid white;
}

/* 列表态：封面图作为左侧封面块（沿用原图标封面位置与尺寸），不再隐藏 */
.ledger-list.is-list .ledger-cover {
  position: relative;
  display: block;
  width: 88rpx;
  height: 120rpx;
  flex-shrink: 0;
  border-radius: 18rpx;
  overflow: hidden;
}

/* 列表态：右侧内容栏，纵向排列行（信息/余额/操作）与进度条 */
.ledger-list.is-list .ledger-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 列表态：封面图固定在最左，作为不被压缩的左侧缩略图（尺寸同上） */

/* 列表态：行内元素两端对齐——账本名居左、收支/操作靠右 */
.ledger-list.is-list .ledger-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

/* 列表态：info 不占满整行，并用 margin-right:auto 把名称顶到最左、收支/操作推到最右 */
.ledger-list.is-list .ledger-info {
  flex: 0 0 auto;
  margin-right: auto;
  min-width: 0;
}

/* 列表态：进度条容器（承载右上角“使用/限额”标签）与上方行保持间距 */
.ledger-list.is-list .ledger-bar-wrap {
  position: relative;
  margin-top: 16rpx;
}

/* 网格态不显示层叠背景 */
.ledger-list.is-grid .ledger-card-wrap::before {
  display: none;
}

/* 田字格态：一行两列网格，元素顺序不变 */
.ledger-list.is-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  /* 响应式：每列随屏宽自适应 */
  gap: 16rpx;
  padding: 0 32rpx;
  align-items: start;
}

.ledger-list.is-grid .ledger-card {
  position: relative;
  overflow: hidden;
  /* 与参考卡片一致的竖版比例 190:254（约 0.748）；高度随 2 列列宽自动推导 */
  aspect-ratio: 190 / 254;
  border-radius: 12rpx;
  border: 1.5rpx solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 10rpx 30rpx rgba(15, 28, 20, 0.12);
  margin: 0;
  padding: 20rpx;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 16rpx;
}

/* 田字格：封面图绝对铺满整卡，作为卡片背景（z-index:0 置于最底层） */
.ledger-list.is-grid .ledger-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  display: block;
}

/* 田字格：毛玻璃严格局部化——仅作用于含文字的区域（参考 .description/.badge 的
   做法：backdrop-filter 加在文字容器上），无文字区域保持透明、直接透出封面背景图 */

/* 田字格：内容栏纵向，面板贴底 */
.ledger-list.is-grid .ledger-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

/* 田字格：图标/信息/操作/进度条等内容浮于封面之上 */
.ledger-list.is-grid .ledger-card > .ledger-body,
.ledger-list.is-grid .ledger-card > .ledger-check {
  position: relative;
  z-index: 2;
}

/* 田字格：底部毛玻璃面板——收纳除 badge 外的所有字段，
   框体随内容自然收缩（不拉伸占满整卡），靠 margin-top:auto 贴到卡片底部 */
.ledger-list.is-grid .ledger-panel {
  margin-top: auto;
  background: rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(10rpx) saturate(1.3);
  -webkit-backdrop-filter: blur(10rpx) saturate(1.3);
  border-radius: 16rpx;
  padding: 20rpx 16rpx;
  box-shadow: 0 6rpx 18rpx rgba(15, 28, 20, 0.10);
}

/* 田字格：框内第一行 —— 笔数(左) 与 收支(右) 两端对齐；操作附于右侧 */
.ledger-list.is-grid .ledger-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.ledger-list.is-grid .ledger-info {
  flex: 1 1 auto;
  min-width: 0;
}

/* 顶部 badge：账本名 + 类型，浮于封面左上角（相对 .ledger-body 定位） */
.ledger-list.is-grid .ledger-name-row {
  position: absolute;
  top: -260rpx;
  left: 0rpx;
  z-index: 3;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10rpx) saturate(1.3);
  -webkit-backdrop-filter: blur(10rpx) saturate(1.3);
  border-radius: 999rpx;
  padding: 8rpx 18rpx;
  box-shadow: 0 6rpx 18rpx rgba(15, 28, 20, 0.10);
}

/* 收支：置于右端，文字右对齐更整齐 */
.ledger-list.is-grid .ledger-balance {
  text-align: right;
  flex: 0 0 auto;
}

/* 进度条：归入面板，跟随内容自然排列（无独立背景，故必然可见） */
.ledger-list.is-grid .ledger-bar-wrap {
  margin-top: 20rpx;
}

.ledger-list.is-grid .ledger-actions {
  flex-direction: row;
  margin-left: 0;
  gap: 12rpx;
  flex: 0 0 auto;
}

.ledger-list.is-grid .ledger-act {
  width: 48rpx;
  height: 48rpx;
  font-size: 22rpx;
}

.ledger-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.ledger-icon {
  width: 80rpx;
  height: 120rpx;
  border-radius: 24rpx;
  @include sj-flex-center;
  flex-shrink: 0;
  font-size: 36rpx;
}

.ledger-info {
  flex: 1;
  min-width: 0;
}

.ledger-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.ledger-name {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ink);
}

.ledger-type {
  font-size: 18rpx;
  padding: 2rpx 12rpx;
  border-radius: 12rpx;

  &.master {
    background: rgba(37, 204, 93, 0.12);
    color: var(--g5);
  }

  &.sub {
    background: rgba(124, 108, 248, 0.1);
    color: #7c6cf8;
  }
}

.ledger-meta {
  font-size: 20rpx;
  color: var(--ink4);
  display: block;
  margin-top: 4rpx;
}

.ledger-balance {
  text-align: right;
  // flex-shrink: 0;
}

.balance-num {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--ink);
  display: block;
  line-height: 1;
}

.balance-sub {
  display: block;
  font-size: 18rpx;
  color: var(--ink4);
  line-height: 1;
  margin-top: 2rpx;
}

/* 余额区：收入(绿) / 支出(红) 配色，与顶部汇总芯片保持一致 */
.ledger-balance .inc {
  color: var(--g5);
}

.ledger-balance .exp {
  color: var(--red-soft);
}

.ledger-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-left: 16rpx;
  flex-shrink: 0;
}

.ledger-act {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  @include sj-flex-center;
  cursor: pointer;
  font-size: 26rpx;

  &-hover {
    background: rgba(37, 204, 93, 0.12);
  }
}

/* 进度条：参照 Uiverse.io(FColombati) kawaii 风格
   白色描边胶囊 + 糖果波点纹理 + 底部暗边；填充末端带可爱圆帽。
   核心功能（按 l.pct 百分比填充）不变，仅重构视觉呈现。 */
.ledger-bar {
  --light: color-mix(in sRGB, var(--base) 35%, #fff);
  --dark: color-mix(in sRGB, var(--base) 90%, #000);
  --transparent: transparent;
  position: relative;
  height: 28rpx;
  border: 6rpx solid #fff;
  border-radius: 28rpx;
  box-shadow: 0 0 12rpx rgba(0, 0, 0, 0.06), 0 4rpx 8rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.85) 2rpx, transparent 3rpx) 0 0 / 22rpx 22rpx,
    linear-gradient(transparent 70%, var(--dark) 100%),
    var(--light);
}

/* 进度条右上角的“使用/限额”标签：定位在胶囊右上角外侧，随维度切换文案 */
.ledger-bar-label {
  position: absolute;
  top: 0;
  right: 0;
  transform: translateY(-100%);
  font-size: 18rpx;
  line-height: 1.3;
  color: var(--ink4);
  white-space: nowrap;
  margin-top: 6rpx;
}

.ledger-bar-label .bar-dim {
  color: var(--g5);
  font-weight: 600;
  margin-right: 4rpx;
}

.ledger-bar-fill {
  position: relative;
  height: 100%;
  border-radius: 0 28rpx 28rpx 0;
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.85) 2rpx, transparent 3rpx) 0 0 / 22rpx 22rpx,
    linear-gradient(90deg, color-mix(in sRGB, var(--base) 80%, #fff), var(--transparent) 24rpx),
    linear-gradient(transparent 70%, var(--dark) 100%),
    var(--base);
  transition: width 0.6s ease;
}

/* 填充末端的 kawaii 圆帽：糖果头 + 探出的小脚，模拟滑块 thumb */
.ledger-bar-fill::after {
  content: '';
  position: absolute;
  right: -12rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background:
    radial-gradient(circle at 8rpx 9rpx, rgba(255, 255, 255, 0.9) 2rpx, transparent 3rpx),
    var(--base);
  box-shadow:
    inset -5rpx 0 5rpx -2rpx var(--base),
    4rpx 6rpx 0 -3rpx var(--base),
    9rpx 6rpx 0 -3rpx var(--base),
    14rpx 6rpx 0 -3rpx var(--base);
}

.asset-mode-bar {
  display: flex;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 28rpx;
  padding: 6rpx;
}

.asset-mode-btn {
  flex: 1;
  padding: 16rpx;
  border-radius: 24rpx;
  text-align: center;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--ink3);
  cursor: pointer;

  &.active {
    @include sj-brand-gradient;
    color: #fff;
  }
}

.asset-total-label {
  font-size: 22rpx;
  color: var(--ink4);
  display: block;
}

.asset-total-num {
  font-size: 72rpx;
  font-weight: 900;
  display: block;
  margin-top: 8rpx;
}

.asset-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.asset-icon-box {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  @include sj-flex-center;
  flex-shrink: 0;
  font-size: 32rpx;
}

.asset-info {
  flex: 1;
}

.asset-name {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--ink);
  display: block;
}

.asset-type {
  font-size: 20rpx;
  color: var(--ink4);
}

.asset-balance {
  font-size: 30rpx;
  font-weight: 700;
}

.chart-title {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ink);
  display: block;
  margin-bottom: 32rpx;
}

.chart-area {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
}

.chart-col {
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  height: 360rpx;
  justify-content: flex-end;
}

.bar-group {
  display: flex;
  gap: 6rpx;
  align-items: flex-end;
  transition: all 0.4s ease;
}

.bar {
  width: 28rpx;
  border-radius: 8rpx 8rpx 0 0;
}

.income-bar {
  @include sj-brand-gradient(0deg);
}

.expense-bar {
  background: linear-gradient(0deg, #fbbf24, var(--amber));
}

.bar-label {
  font-size: 18rpx;
  color: var(--ink4);
  margin-top: 12rpx;
}

.sticker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.sticker-chip {
  width: calc(33.33% - 14rpx);
  border-radius: 28rpx;
  cursor: pointer;
}

/* Sheet */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 300;
  @include sj-flex-center;
  align-items: flex-end;
}

.sheet-panel {
  width: 750rpx;
  padding: 40rpx 40rpx 60rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(242, 252, 242, 0.96));
  border-radius: 48rpx 48rpx 0 0;
}

.sheet-handle {
  @include sj-flex-center;
  margin-bottom: 32rpx;
}

.handle-bar {
  width: 76rpx;
  height: 8rpx;
  border-radius: 6rpx;
  background: rgba(194, 242, 200, 0.8);
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--ink);
  display: block;
  margin-bottom: 28rpx;
}

.sheet-input {
  width: 100%;
  height: 88rpx;
  border-radius: 28rpx;
  background: rgba(242, 252, 242, 0.8);
  border: 2rpx solid rgba(194, 242, 200, 0.4);
  padding: 0 28rpx;
  font-size: 28rpx;
  margin-bottom: 32rpx;
}

.sheet-btn {
  width: 100%;
  padding: 28rpx;
  border-radius: 28rpx;
  @include sj-brand-gradient;
  text-align: center;
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  cursor: pointer;
}

.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.icon-cell {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  background: rgba(242, 252, 242, 0.8);
  border: 2rpx solid rgba(194, 242, 200, 0.4);
  @include sj-flex-center;
  font-size: 40rpx;
  cursor: pointer;

  &.active {
    border-color: var(--g5);
    background: rgba(37, 204, 93, 0.12);
  }
}

/* 多选入口按钮 */
.select-btn {
  padding: 12rpx 24rpx;
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.6);
  border: 2rpx solid rgba(137, 229, 156, 0.25);
  font-size: 24rpx;
  font-weight: 700;
  color: var(--g3);
  cursor: pointer;
}

.select-btn.active {
  background: var(--g3);
  color: #fff;
  border-color: var(--g3);
}

/* 卡片左侧复选框（多选模式） */
.ledger-check {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
  align-self: center;
  border-radius: 50%;
  border: 3rpx solid var(--g5);
  background: rgba(255, 255, 255, 0.9);
  @include sj-flex-center;
  cursor: pointer;
}

.ledger-check.checked {
  background: var(--g5);
  border-color: var(--g5);
}

.ledger-check-mark {
  color: #fff;
  font-size: 26rpx;
  font-weight: 800;
  line-height: 1;
}

/* 底部批量操作栏 */
.batch-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 20rpx 32rpx calc(20rpx + constant(safe-area-inset-bottom));
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(242, 252, 242, 0.98));
  box-shadow: 0 -6rpx 24rpx rgba(15, 28, 20, 0.12);
}

.batch-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.batch-count {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--ink);
}

.batch-hint {
  font-size: 20rpx;
  color: var(--ink4);
  margin-top: 2rpx;
}

.batch-actions {
  display: flex;
  gap: 16rpx;
  flex-shrink: 0;
}

.batch-btn {
  height: 72rpx;
  padding: 0 32rpx;
  border-radius: 16rpx;
  @include sj-flex-center;
  font-size: 26rpx;
  font-weight: 700;
}

.batch-cancel {
  background: rgba(124, 108, 248, 0.1);
  color: #7c6cf8;
}

.batch-del {
  background: linear-gradient(135deg, #ff8a8a, #ff5b5b);
  color: #fff;
}

.batch-del.disabled {
  opacity: 0.45;
}

/* 删除确认弹窗 */
.del-panel {
  padding: 0 32rpx 36rpx;
}

.del-list {
  max-height: 360rpx;
  overflow-y: auto;
  margin-bottom: 16rpx;
}

.del-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 2rpx solid rgba(15, 28, 20, 0.05);
}

.del-emoji {
  font-size: 36rpx;
}

.del-name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--ink);
}

.del-tip {
  font-size: 22rpx;
  color: var(--ink4);
  margin-bottom: 20rpx;
}

.del-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.del-btn {
  height: 84rpx;
  border-radius: 16rpx;
  @include sj-flex-center;
  font-size: 28rpx;
  font-weight: 700;
}

.del-transfer {
  background: rgba(37, 204, 93, 0.12);
  color: var(--g5);
}

.del-purge {
  background: linear-gradient(135deg, #ff8a8a, #ff5b5b);
  color: #fff;
}

.del-cancel {
  height: 80rpx;
  @include sj-flex-center;
  margin-top: 8rpx;
  font-size: 28rpx;
  color: var(--ink3);
}
</style>
