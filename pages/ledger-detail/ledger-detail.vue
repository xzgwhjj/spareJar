<template>
  <view class="detail-page" data-cmp="LedgerDetail">
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">账本详情</text>
    </view>

    <scroll-view
      class="page-scroll"
      scroll-y
      enhanced
      :show-scrollbar="false"
      style="flex: 1"
    >
      <!-- 账本信息：头像 + 名称/类型 + 成员/记录 + 余额 + 本月收支 -->
      <view class="detail-card" style="padding: 0rpx; margin-top: 32rpx">
        <view class="detail-card-glow"></view>
        <view
          class="glass-thin-2 card-in-1 detail-card-1"
          style="padding: 20px 20px 16px"
        >
          <!-- 右上角操作菜单：竖向“...” ⇄ 横向“...”，展开删除/编辑 -->
          <view v-if="!ledger.is_system" class="card-actions" :class="{ open: menuOpen }">
            <view class="act-item act-delete" @click.stop="onMenuDelete">删除</view>
            <view class="act-item act-edit" @click.stop="onMenuEdit">编辑</view>
            <view class="act-toggle" @click.stop="toggleMenu">
              <view class="dots">
                <view class="dot"></view>
                <view class="dot"></view>
                <view class="dot"></view>
              </view>
            </view>
          </view>
          <!-- 头部：头像 + 名称/类型 + 成员/记录 -->
          <view class="hero-header">
            <view class="hero-avatar">
              <image
                v-if="ledger.cover"
                :src="coverSrc"
                mode="aspectFill"
                class="hero-cover-img"
              />
              <text v-else>{{ ledger.emoji }}</text>
            </view>
            <view class="hero-head-main">
              <view class="hero-name-row">
                <text class="hero-name">{{ ledger.name }}</text>
                <text
                  v-if="ledger.type === 'master'"
                  class="hero-type master"
                  :style="typeBadgeStyle"
                  >主</text
                >
              </view>
              <!-- 待：替换图标 -->
              <view class="hero-sub">
                <view class="hero-sub-item">
                  <text class="hero-sub-ico">👥</text>
                  <text class="hero-sub-txt">{{ memberCount }} 位成员</text>
                </view>
                <view class="hero-sub-item">
                  <text class="hero-sub-ico">📅</text>
                  <text class="hero-sub-txt">{{ ledger.records }} 条记录</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 余额大字 -->
          <view class="hero-balance">
            <text class="hero-balance-label">账本余额</text>
            <text class="hero-balance-val">¥{{ fmt(ledger.balance) }}</text>
          </view>

          <!-- 本月收支三列 -->
          <!-- 待：替换图标 -->
          <view class="hero-stats">
            <view class="hero-stat">
              <view class="hero-stat-label">
                <text class="hero-stat-ico ico-income">↗</text>
                <text>本月收入</text>
              </view>
              <text class="hero-stat-val val-income">+¥{{ fmt(summary.income) }}</text>
            </view>
            <view class="hero-stat">
              <view class="hero-stat-label">
                <text class="hero-stat-ico ico-expense">↘</text>
                <text>本月支出</text>
              </view>
              <text class="hero-stat-val val-expense">-¥{{ fmt(summary.expense) }}</text>
            </view>
            <view class="hero-stat">
              <view class="hero-stat-label">
                <text class="hero-stat-ico ico-net">🐷</text>
                <text>月结余</text>
              </view>
              <text class="hero-stat-val val-net">¥{{ fmt(summary.net) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 时间筛选 -->
      <!-- 时间筛选：可折叠卡片，含日/月/年维度切换与日历视图 -->
      <view class="glass-thin-2 filter-card">
        <view class="filter-head" @click="filterExpanded = !filterExpanded">
          <view class="seg">
            <view
              class="seg-item"
              :class="{ active: timeDim === 'day' }"
              @click.stop="setDim('day')"
              >日</view
            >
            <view
              class="seg-item"
              :class="{ active: timeDim === 'month' }"
              @click.stop="setDim('month')"
              >月</view
            >
            <view
              class="seg-item"
              :class="{ active: timeDim === 'year' }"
              @click.stop="setDim('year')"
              >年</view
            >
          </view>
          <view class="filter-head-right">
            <text class="period-pick">{{ periodLabel }}</text>
            <text class="caret" :class="{ up: !filterExpanded }">▾</text>
          </view>
        </view>
        <view v-show="filterExpanded" class="filter-body">
          <calendar-period-picker
            v-model="selectedKey"
            :dim="timeDim"
            :day-expense-map="calMaps.dayExpense"
            :day-income-map="calMaps.dayIncome"
            :month-expense-map="calMaps.monthExpense"
            :month-income-map="calMaps.monthIncome"
            :year-expense-map="calMaps.yearExpense"
            :year-income-map="calMaps.yearIncome"
          />
        </view>
      </view>

      <!-- 预算（随所选时间维度 / 周期联动） -->
      <view class="glass-thin-2" style="margin: 0 16px 16px; padding: 18px">
        <text class="section-title">📊 {{ budgetWord(timeDim) }}</text>
        <view class="budget-row">
          <text class="budget-spent">已花 ¥{{ fmt(periodSpent) }}</text>
          <text class="budget-total">预算 ¥{{ fmt(periodBudget) }}</text>
        </view>
        <view class="budget-bar">
          <view
            class="budget-bar-fill"
            :class="{ 'is-over': periodPct >= 100 }"
            :style="{ width: periodPct + '%' }"
          />
        </view>
        <text class="budget-remain"
          >剩余 ¥{{ fmt(Math.max(periodBudget - periodSpent, 0)) }}</text
        >
      </view>

      <!-- 分类统计图表 -->
      <view class="glass-mid chart-card">
        <view class="chart-head">
          <text class="section-title">分类统计</text>
          <view class="chart-toggle">
            <text
              class="ct-item"
              :class="{ active: chartType === 'expense' }"
              @click="setChartType('expense')"
              >支出</text
            >
            <text
              class="ct-item"
              :class="{ active: chartType === 'income' }"
              @click="setChartType('income')"
              >收入</text
            >
          </view>
        </view>
        <view v-if="chartData.length === 0" class="empty-hint"
          >该时段暂无{{ chartType === "expense" ? "支出" : "收入" }}记录</view
        >
        <view
          v-for="(c, i) in chartData"
          :key="i"
          class="bar-row"
          :class="{ active: categoryFilter === c.category_id }"
          @click="onChartClick(c)"
        >
          <text class="bar-icon">{{ c.icon }}</text>
          <view class="bar-main">
            <view class="bar-top">
              <text class="bar-name">{{ c.name }}</text>
              <text class="bar-amt">¥{{ fmt(c.amount) }}</text>
            </view>
            <view class="bar-track"
              ><view class="bar-fill" :style="{ width: c.width + '%' }"
            /></view>
          </view>
          <text class="bar-pct">{{ c.pct }}%</text>
        </view>
      </view>

      <!-- 明细 -->
      <view class="glass-mid detail-card">
        <view class="detail-head">
          <text class="section-title">明细 ({{ detailList.length }})</text>
          <view v-if="categoryFilter" class="filter-chip" @click="categoryFilter = null">
            已筛选：{{ filterName }} ✕
          </view>
        </view>
        <view class="sort-ctrl">
          <text
            class="sort-item"
            :class="{ active: sortBy === 'time' }"
            @click="setSort('time')"
            >时间</text
          >
          <text
            class="sort-item"
            :class="{ active: sortBy === 'amount' }"
            @click="setSort('amount')"
            >金额</text
          >
          <text class="sort-dir" @click="sortDir = sortDir === 'desc' ? 'asc' : 'desc'">{{
            sortDir === "desc" ? "↓" : "↑"
          }}</text>
        </view>

        <view
          v-for="(r, i) in detailList"
          :key="r._id"
          class="record-item"
          :class="{ last: i === detailList.length - 1 }"
        >
          <view class="record-left">
            <text class="record-icon">{{ r.icon }}</text>
            <view>
              <text class="record-name">{{ r.name }}</text>
              <text class="record-time"
                >{{ r.date }} {{ r.time }}<text v-if="r.note"> · {{ r.note }}</text></text
              >
            </view>
          </view>
          <text class="record-amount" :class="{ expense: r.isExpense }"
            >{{ r.amount >= 0 ? "+" : "" }}¥{{ fmt(Math.abs(r.amount)) }}</text
          >
        </view>
        <view v-if="detailList.length === 0" class="empty-hint">该时段暂无记录</view>
      </view>

      <view v-if="!ledger.is_system" class="danger-btn" @click="openDelete"
        >删除账本</view
      >
    </scroll-view>

    <!-- 编辑弹窗 -->
    <view v-if="showEdit" class="sheet-overlay" @click="showEdit = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">编辑账本</text>
        <input class="sheet-input" v-model="editName" placeholder="账本名称" />
        <view class="icon-grid">
          <view
            v-for="ic in LEDGER_ICONS"
            :key="ic"
            class="icon-cell"
            :class="{ active: editIcon === ic }"
            @click="editIcon = ic"
            ><text>{{ ic }}</text></view
          >
        </view>
        <view class="save-btn" @click="saveEdit"><text>保存</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { useUserStore } from "@/stores/user.js";
import {
  updateLedger as apiUpdateLedger,
  getLedgerDetail,
  deleteLedger,
} from "@/api/sparejar.js";
import { formatDateKey, formatMonthKey } from "@/utils/date.js";
import { hexToRgba } from "@/utils/coverColor.js";
import { resolveCover, getCloudTempUrl } from "@/utils/cdn.js";

const { state, categoryMap, loadCategories } = useUserStore();

const LEDGER_ICONS = [
  "📒",
  "🏠",
  "💼",
  "✈️",
  "🎓",
  "🍜",
  "🛒",
  "💰",
  "🐱",
  "🚗",
  "🏥",
  "🎮",
  "☕",
  "🏀",
];

const ledgerId = ref("");
const ledger = reactive({
  _id: "",
  emoji: "📒",
  name: "",
  type: "sub",
  is_system: false,
  cover: "",
  theme_color: "",
  balance: 0,
  budget: 0,
  spent: 0,
  pct: 0,
  records: 0,
});
/** 用户上传封面存 cloud:// fileID，需经 getTempFileURL 解析为临时 URL 才能显示 */
const ledgerCoverUrl = ref("");
/** 封面最终显示地址：cloud:// → 解析后的临时链；其余走 resolveCover */
const coverSrc = computed(() =>
  ledger.cover && String(ledger.cover).startsWith("cloud://")
    ? ledgerCoverUrl.value
    : resolveCover(ledger.cover)
);
/** 成员总数（来自云函数 ledger_members 统计，异常时降级为 0） */
const memberCount = ref(0);
/** 类型徽标配色：主账本沿用 CSS 绿渐变；子账本使用接口返回的主题色（无则回退默认样式） */
const typeBadgeStyle = computed(() => {
  if (ledger.type === "master" || !ledger.theme_color) return null;
  return { background: hexToRgba(ledger.theme_color, 0.12), color: ledger.theme_color };
});
/** 属于本账本的全部未删除交易（加载一次，后续客户端筛选） */
const ledgerTxs = ref([]);

// 筛选/排序状态
const timeDim = ref("month"); // 'day' | 'month' | 'year'
const selectedKey = ref(formatMonthKey(new Date()));
const filterExpanded = ref(true); // 时间筛选区是否展开日历视图
const chartType = ref("expense"); // 'expense' | 'income'
const categoryFilter = ref(null); // category_id 或 null
const sortBy = ref("time"); // 'time' | 'amount'
const sortDir = ref("desc"); // 'desc' | 'asc'

const fmt = (fen) =>
  (fen / 100).toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
const pad2 = (n) => String(n).padStart(2, "0");
const fmtTime = (ts) => {
  const d = new Date(String(ts).replace(" ", "T"));
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const monthKey = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
})();

const periodLabel = computed(() => {
  const k = selectedKey.value;
  if (timeDim.value === "day") {
    const [y, m, d] = k.split("-");
    return `${y}年${Number(m)}月${Number(d)}日`;
  }
  if (timeDim.value === "month") {
    const [y, m] = k.split("-");
    return `${y}年${Number(m)}月`;
  }
  return `${k}年`;
});

// 预算周期命名：随上方所选日期维度联动（天→天预算 / 月→月度预算 / 年→年度预算）
const budgetWord = (dim) =>
  dim === "day" ? "天预算" : dim === "year" ? "年度预算" : "月度预算";

// 日历视图收支汇总（按日/月/年三套 key 聚合全部交易，供日历组件显示收/支小字）
const calMaps = computed(() => {
  const dE = {},
    dI = {},
    mE = {},
    mI = {},
    yE = {},
    yI = {};
  for (const t of ledgerTxs.value) {
    const amt = t.amount || 0;
    const inc = t.type !== "expense";
    const dk = t.date_key,
      mk = t.month_key,
      yk = (dk || "").slice(0, 4);
    if (dk) {
      if (inc) dI[dk] = (dI[dk] || 0) + amt;
      else dE[dk] = (dE[dk] || 0) + amt;
    }
    if (mk) {
      if (inc) mI[mk] = (mI[mk] || 0) + amt;
      else mE[mk] = (mE[mk] || 0) + amt;
    }
    if (yk) {
      if (inc) yI[yk] = (yI[yk] || 0) + amt;
      else yE[yk] = (yE[yk] || 0) + amt;
    }
  }
  return {
    dayExpense: dE,
    dayIncome: dI,
    monthExpense: mE,
    monthIncome: mI,
    yearExpense: yE,
    yearIncome: yI,
  };
});

const CHART_TYPES = { expense: ["expense"], income: ["income", "refund"] };

function defaultKey(dim) {
  const now = new Date();
  if (dim === "day") return formatDateKey(now);
  if (dim === "month") return formatMonthKey(now);
  return String(now.getFullYear());
}

function inRange(t) {
  if (timeDim.value === "day") return t.date_key === selectedKey.value;
  if (timeDim.value === "month") return t.month_key === selectedKey.value;
  return (t.date_key || "").startsWith(selectedKey.value + "-");
}

function setDim(dim) {
  timeDim.value = dim;
  selectedKey.value = defaultKey(dim);
  categoryFilter.value = null;
}
function setChartType(ct) {
  chartType.value = ct;
  categoryFilter.value = null;
}
function setSort(field) {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === "desc" ? "asc" : "desc";
  } else {
    sortBy.value = field;
    sortDir.value = "desc";
  }
}
function onChartClick(c) {
  if (!c.category_id) return; // 「其他」不筛选
  categoryFilter.value = categoryFilter.value === c.category_id ? null : c.category_id;
}

const periodTxs = computed(() => ledgerTxs.value.filter(inRange));

const summary = computed(() => {
  let income = 0,
    expense = 0;
  for (const t of periodTxs.value) {
    if (t.type === "expense") expense += t.amount;
    else if (t.type === "income" || t.type === "refund") income += t.amount;
  }
  return { income, expense, net: income - expense };
});

// 预算卡随所选周期联动：已花 = 当前周期支出；预算 = 月预算按维度折算（年×12 / 日÷30）
const periodSpent = computed(() => summary.value.expense);
const periodBudget = computed(() => {
  const m = ledger.budget || 0;
  if (timeDim.value === "year") return m * 12;
  if (timeDim.value === "day") return Math.round(m / 30);
  return m;
});
const periodPct = computed(() =>
  periodBudget.value > 0
    ? Math.min(Math.round((periodSpent.value / periodBudget.value) * 100), 100)
    : 0
);

const chartData = computed(() => {
  const map = {};
  let total = 0;
  for (const t of periodTxs.value) {
    if (!CHART_TYPES[chartType.value].includes(t.type)) continue;
    const cid = t.category_id || "__none__";
    if (!map[cid]) {
      const c = t.category_id ? categoryMap.value[String(t.category_id)] : null;
      map[cid] = {
        category_id: t.category_id || null,
        name: c ? c.name : chartType.value === "expense" ? "未分类" : "其他收入",
        icon: c ? c.icon : "📦",
        amount: 0,
      };
    }
    map[cid].amount += t.amount;
    total += t.amount;
  }
  let arr = Object.values(map).sort((a, b) => b.amount - a.amount);
  if (arr.length > 8) {
    const others = arr.slice(8);
    const otherAmt = others.reduce((s, o) => s + o.amount, 0);
    arr = arr.slice(0, 8);
    arr.push({ category_id: null, name: "其他", icon: "⋯", amount: otherAmt });
  }
  const max = arr.length ? arr[0].amount : 1;
  return arr.map((o) => ({
    ...o,
    pct: total > 0 ? Math.round((o.amount / total) * 100) : 0,
    width: max > 0 ? Math.round((o.amount / max) * 100) : 0,
  }));
});

const filterName = computed(() => {
  if (!categoryFilter.value) return "";
  const c = categoryMap.value[String(categoryFilter.value)];
  return c ? c.name : "未知分类";
});

const detailList = computed(() => {
  let list = periodTxs.value;
  if (categoryFilter.value)
    list = list.filter((t) => t.category_id === categoryFilter.value);
  const dir = sortDir.value === "asc" ? 1 : -1;
  list = [...list].sort((a, b) => {
    if (sortBy.value === "amount") return (a.amount - b.amount) * dir;
    return (a.transaction_at - b.transaction_at) * dir;
  });
  return list.map((t) => {
    const c = t.category_id ? categoryMap.value[String(t.category_id)] : null;
    const isExp = t.type === "expense";
    const label = isExp
      ? "支出"
      : t.type === "income"
      ? "收入"
      : t.type === "refund"
      ? "退款"
      : "其他";
    return {
      _id: t._id,
      icon: c ? c.icon : "📦",
      name: c ? c.name : label,
      note: t.note || "",
      date: t.date_key,
      time: fmtTime(t.transaction_at),
      amount: isExp ? -t.amount : t.amount,
      isExpense: isExp,
    };
  });
});

async function loadAll() {
  const uid = state.uid;
  const id = ledgerId.value;
  if (!uid || !id) return;
  try {
    if (!state.categories || !state.categories.length) await loadCategories();
    // 走云函数读取，禁止前端直连数据库
    const data = await getLedgerDetail(id);
    const l = data && data.ledger;
    if (!l || l.user_id !== uid) {
      uni.showToast({ title: "账本不存在", icon: "none" });
      return;
    }
    const isMaster = !!l.is_system;
    const all = data.transactions || [];
    const txs = isMaster ? all : all.filter((t) => t.ledger_id === id);
    ledgerTxs.value = txs;

    const income = txs
      .filter((t) => t.type !== "expense")
      .reduce((s, t) => s + t.amount, 0);
    const expense = txs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;
    const spent = txs
      .filter((t) => t.type === "expense" && t.month_key === monthKey)
      .reduce((s, t) => s + t.amount, 0);
    const budget = l.monthly_budget || 0;
    const pct = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;
    Object.assign(ledger, {
      _id: id,
      emoji: l.icon || "📒",
      name: l.name,
      type: isMaster ? "master" : "sub",
      is_system: isMaster,
      cover: l.cover || "",
      theme_color: l.theme_color || "",
      balance,
      budget,
      spent,
      pct,
      records: txs.length,
    });
    // 用户上传封面为 cloud:// fileID，解析为临时访问 URL
    ledgerCoverUrl.value =
      l.cover && String(l.cover).startsWith("cloud://")
        ? await getCloudTempUrl(l.cover)
        : "";
    memberCount.value = (data && data.memberCount) || 0;
  } catch (err) {
    console.error("[ledger-detail] load failed", err);
  }
}

onMounted(() => {
  const pages = getCurrentPages();
  const cur = pages[pages.length - 1];
  ledgerId.value = (cur && cur.options && cur.options.id) || "";
  loadAll();
});

// 编辑
const showEdit = ref(false);
const editName = ref("");
const editIcon = ref("");
const openEdit = () => {
  if (ledger.is_system) {
    uni.showToast({ title: "总账本不可编辑", icon: "none" });
    return;
  }
  editName.value = ledger.name;
  editIcon.value = ledger.emoji;
  showEdit.value = true;
};
async function saveEdit() {
  const name = editName.value.trim();
  if (!name) {
    uni.showToast({ title: "请输入账本名称", icon: "none" });
    return;
  }
  try {
    // 走云函数：updated_at 由服务端自动刷新（字符串），前端不传时间字段
    await apiUpdateLedger(ledger._id, { name, icon: editIcon.value });
    showEdit.value = false;
    uni.showToast({ title: "已保存", icon: "success" });
    await loadAll();
  } catch (err) {
    uni.showToast({ title: "保存失败", icon: "none" });
  }
}

// 删除
function openDelete() {
  if (ledger.is_system) {
    uni.showToast({ title: "总账本不可删除", icon: "none" });
    return;
  }
  uni.showActionSheet({
    itemList: ["数据转移至总账本", "彻底删除（含记录）"],
    success: async (res) => {
      const mode = res.tapIndex === 0 ? "transfer" : "purge";
      try {
        await deleteLedger(ledger._id, mode);
        uni.showToast({ title: "已删除", icon: "success" });
        setTimeout(() => uni.navigateBack(), 600);
      } catch (err) {
        const msg = err && err.message ? err.message : "删除失败";
        uni.showToast({ title: msg, icon: "none" });
      }
    },
  });
}

// 右上角操作菜单（“...” 展开 / 收回）
const menuOpen = ref(false);
function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}
function onMenuEdit() {
  openEdit();
  menuOpen.value = false;
}
function onMenuDelete() {
  openDelete();
  menuOpen.value = false;
}

const goBack = () => uni.navigateBack();
</script>

<style scoped lang="scss">
.detail-page {
  width: 750rpx;
  height: 100vh;
  margin: 0 auto;
  // background: var(--g0);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 88rpx 32rpx 20rpx;

  .topbar-title {
    font-size: 34rpx;
    font-weight: 700;
    color: var(--ink);
  }
  .back-btn,
  .edit-btn {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: var(--white-75);
    @include sj-flex-center;
    cursor: pointer;
    font-size: 32rpx;
  }
  .back-btn {
    color: var(--ink3);
  }
}
.edit-btn.disabled {
  opacity: 0.4;
  cursor: default;
}

/* 账本详情头部卡片（参考示例 GlassCard 设计） */
.hero-header {
  display: flex;
  align-items: flex-start;
  gap: 28rpx;
  margin-bottom: 36rpx;
}
.hero-avatar {
  width: 104rpx;
  height: 104rpx;
  border-radius: 32rpx;
  background: color-mix(in sRGB, var(--g5) 12%, transparent);
  @include sj-flex-center;
  font-size: 52rpx;
  flex-shrink: 0;
  overflow: hidden;

  .hero-cover-img {
    width: 100%;
    height: 100%;
    display: block;
  }
}
.hero-head-main {
  flex: 1;
  min-width: 0;
}
.hero-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 6rpx;

  .hero-name {
    font-size: 32rpx;
    font-weight: 800;
    color: var(--ink);
  }
  .hero-type {
    font-size: 18rpx;
    font-weight: 700;
    padding: 2rpx 12rpx;
    border-radius: 16rpx;
    background: linear-gradient(135deg, var(--g4), var(--g5));
    color: #fff;
    flex-shrink: 0;
  }
}
.hero-sub {
  display: flex;
  align-items: center;
  gap: 20rpx;

  .hero-sub-item {
    display: flex;
    align-items: center;
    gap: 6rpx;
  }
  .hero-sub-ico {
    font-size: 22rpx;
  }
  .hero-sub-txt {
    font-size: 22rpx;
    color: var(--ink4);
  }
}

.hero-balance {
  text-align: center;
  margin-bottom: 36rpx;

  .hero-balance-label {
    display: block;
    font-size: 22rpx;
    color: var(--ink4);
    margin-bottom: 8rpx;
  }
  .hero-balance-val {
    display: block;
    font-size: 80rpx;
    font-weight: 900;
    color: var(--ink);
    letter-spacing: -4rpx;
  }
}

.hero-stats {
  display: flex;
  padding-top: 28rpx;
  border-top: 2rpx solid color-mix(in sRGB, var(--ink) 6%, transparent);

  .hero-stat {
    flex: 1;
    text-align: center;
  }
  .hero-stat-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6rpx;
    margin-bottom: 6rpx;
    font-size: 20rpx;
    color: var(--ink4);
  }
  .hero-stat-ico {
    font-size: 24rpx;
  }
  .ico-income {
    color: var(--g5);
  }
  .ico-expense {
    color: var(--red-soft);
  }
  // .ico-net { color: var(--blue); }
  .hero-stat-val {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--ink);
  }
  .val-income {
    color: var(--g5);
  }
  .val-expense {
    color: var(--red-soft);
  }
  // .val-net { color: var(--blue); }
}
/* 卡片入场动画（参考示例 detailCardIn） */
@keyframes detailCardIn {
  from {
    opacity: 0;
    transform: translateY(24rpx) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.detail-card {
  position: relative;
  // height: 550rpx;
}

/* 右下角绿色光晕：垫在卡片下方的背景层（参考 ledger.vue 的 overview-card） */
.detail-card-glow {
  position: absolute;
  right: -12rpx;
  bottom: -12rpx;
  width: 40%;
  height: 36%;
  border-radius: 50%;
  background: var(--glow);
  // background: #000;
  filter: blur(80rpx);
  opacity: 0.45;
  pointer-events: none;
  z-index: 1;
}

.detail-card-1 {
  position: relative;
  z-index: 2;
  animation: detailCardIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both;
}

/* 右上角操作菜单：竖向“...”⇄横向“...” + 展开删除/编辑 */
.card-actions {
  position: absolute;
  top: -24rpx;
  right: 22rpx;
  display: flex;
  align-items: center;
  z-index: 5;
}

.card-actions .act-item {
  max-width: 0;
  opacity: 0;
  margin-right: 0;
  padding: 0;
  height: 56rpx;
  border-radius: 28rpx;
  font-size: 24rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  overflow: hidden;
  pointer-events: none;
  transition: max-width 0.28s ease, opacity 0.22s ease, margin 0.28s ease,
    padding 0.28s ease;
}

.card-actions.open .act-item {
  max-width: 200rpx;
  opacity: 1;
  margin-right: 12rpx;
  padding: 0 26rpx;
  pointer-events: auto;
}

.act-delete {
  background: rgba(255, 107, 107, 0.14);
  color: var(--red-soft);
}

.act-edit {
  background: rgba(37, 204, 93, 0.14);
  color: var(--g4);
}

.act-toggle {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: var(--white-75);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4rpx 14rpx rgba(0, 0, 0, 0.08);
}

.dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  transition: all 0.25s ease;
}

.card-actions .dots {
  flex-direction: column;
}

.card-actions.open .dots {
  flex-direction: row;
}

.dot {
  width: 7rpx;
  height: 7rpx;
  border-radius: 50%;
  background: var(--ink);
}

.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink);
  display: block;
  margin-bottom: 28rpx;
}

/* 时间筛选：可折叠卡片（含维度切换 + 日历视图） */
.filter-card {
  margin: 0 32rpx 32rpx;
  padding: 20rpx 28rpx;
  cursor: pointer;
}

.filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.filter-head-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.period-pick {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ink);
  padding: 12rpx 20rpx;
  background: color-mix(in sRGB, var(--g0) 80%, transparent);
  border-radius: 20rpx;
}
.caret {
  color: var(--g5);
  font-size: 24rpx;
  transition: transform 0.25s ease;

  &.up {
    transform: rotate(180deg);
  }
}
.filter-body {
  margin-top: 16rpx;
}
.seg {
  display: flex;
  background: color-mix(in sRGB, var(--g2) 25%, transparent);
  border-radius: 24rpx;
  padding: 6rpx;

  .seg-item {
    padding: 12rpx 28rpx;
    border-radius: 18rpx;
    font-size: 26rpx;
    font-weight: 600;
    color: var(--ink3);
    cursor: pointer;

    &.active {
      background: #fff;
      color: var(--g5);
      box-shadow: 0 4rpx 12rpx color-mix(in sRGB, var(--g5) 15%, transparent);
    }
  }
}

/* 预算 */
.budget-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.budget-spent {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--ink);
}
.budget-total {
  font-size: 26rpx;
  color: var(--ink4);
}
.budget-bar {
  height: 16rpx;
  border-radius: 10rpx;
  background: color-mix(in sRGB, var(--g2) 30%, transparent);
  overflow: hidden;
  margin-bottom: 8rpx;

  .budget-bar-fill {
    height: 100%;
    border-radius: 10rpx;
    background: linear-gradient(90deg, var(--g3), var(--g5));
    transition: width 0.6s ease;

    &.is-over {
      background: linear-gradient(90deg, var(--red-soft), #ff9b9b);
    }
  }
}
.budget-remain {
  font-size: 20rpx;
  color: var(--g5);
  font-weight: 600;
  display: block;
}

/* 汇总 */
.summary-card {
  margin: 0 32rpx 32rpx;
  padding: 36rpx;
}
.sum-row {
  display: flex;
  justify-content: space-between;
}
.sum-cell {
  flex: 1;
  text-align: center;
}
.sum-label {
  font-size: 22rpx;
  color: var(--ink4);
  display: block;
  margin-bottom: 8rpx;
}
.sum-val {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--ink);
}
.sum-val.income {
  color: var(--g5);
}
.sum-val.expense {
  color: var(--red-soft);
}

/* 分类图表 */
.chart-card {
  margin: 0 32rpx 32rpx;
  padding: 36rpx;
}
.chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28rpx;
}
.chart-head .section-title {
  margin-bottom: 0;
}
.chart-toggle {
  display: flex;
  background: color-mix(in sRGB, var(--g2) 25%, transparent);
  border-radius: 20rpx;
  padding: 4rpx;

  .ct-item {
    padding: 10rpx 24rpx;
    border-radius: 16rpx;
    font-size: 24rpx;
    font-weight: 600;
    color: var(--ink3);
    cursor: pointer;

    &.active {
      background: #fff;
      color: var(--g5);
    }
  }
}
.bar-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 18rpx 16rpx;
  border-radius: 24rpx;
  cursor: pointer;

  &.active {
    background: color-mix(in sRGB, var(--g5) 10%, transparent);
  }
  .bar-icon {
    font-size: 36rpx;
    width: 44rpx;
    text-align: center;
  }
  .bar-main {
    flex: 1;
  }
  .bar-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10rpx;
  }
  .bar-name {
    font-size: 26rpx;
    font-weight: 600;
    color: var(--ink);
  }
  .bar-amt {
    font-size: 24rpx;
    font-weight: 700;
    color: var(--ink);
  }
  .bar-track {
    height: 14rpx;
    border-radius: 8rpx;
    background: color-mix(in sRGB, var(--g2) 30%, transparent);
    overflow: hidden;

    .bar-fill {
      height: 100%;
      border-radius: 8rpx;
      background: linear-gradient(90deg, var(--g3), var(--g5));
      transition: width 0.5s ease;
    }
  }
  .bar-pct {
    font-size: 22rpx;
    color: var(--ink4);
    width: 68rpx;
    text-align: right;
  }
}

/* 明细 */
.detail-card {
  margin: 0 32rpx 48rpx;
  padding: 36rpx;
}
.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.detail-head .section-title {
  margin-bottom: 0;
}
.filter-chip {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--g5);
  background: color-mix(in sRGB, var(--g5) 12%, transparent);
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  cursor: pointer;
}
.sort-ctrl {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}
.sort-item {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--ink4);
  padding: 8rpx 20rpx;
  border-radius: 16rpx;
  cursor: pointer;

  &.active {
    color: var(--g5);
    background: color-mix(in sRGB, var(--g5) 10%, transparent);
  }
}
.sort-dir {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--g5);
  cursor: pointer;
  padding: 0 12rpx;
}

.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 2rpx solid color-mix(in sRGB, var(--ink) 4%, transparent);

  &.last {
    border-bottom: none;
  }
  .record-left {
    display: flex;
    align-items: center;
    gap: 20rpx;
  }
  .record-icon {
    font-size: 36rpx;
  }
  .record-name {
    font-size: 26rpx;
    font-weight: 600;
    color: var(--ink);
    display: block;
  }
  .record-time {
    font-size: 20rpx;
    color: var(--ink4);
  }
  .record-amount {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--g5);
  }
  .record-amount.expense {
    color: var(--red-soft);
  }
}

.empty-hint {
  text-align: center;
  font-size: 24rpx;
  color: var(--ink4);
  padding: 36rpx 0;
}

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
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.98),
    color-mix(in sRGB, var(--g0) 96%, transparent)
  );
  border-radius: 48rpx 48rpx 0 0;
  padding: 0 40rpx 60rpx;

  .sheet-handle {
    @include sj-flex-center;
    padding: 24rpx 0 16rpx;
  }
  .handle-bar {
    width: 76rpx;
    height: 8rpx;
    border-radius: 6rpx;
    background: color-mix(in sRGB, var(--g2) 80%, transparent);
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
    background: color-mix(in sRGB, var(--g0) 80%, transparent);
    border: 2rpx solid color-mix(in sRGB, var(--g2) 40%, transparent);
    padding: 0 28rpx;
    font-size: 28rpx;
    margin-bottom: 28rpx;
  }
  .save-btn {
    padding: 28rpx;
    border-radius: 32rpx;
    background: linear-gradient(135deg, var(--g4), var(--g5));
    text-align: center;
    color: #fff;
    font-size: 28rpx;
    font-weight: 800;
    cursor: pointer;
  }
}
.danger-btn {
  margin: 0 32rpx 48rpx;
  padding: 28rpx;
  border-radius: 32rpx;
  background: var(--red-bg);
  border: 2rpx solid color-mix(in sRGB, var(--red-soft) 30%, transparent);
  text-align: center;
  color: var(--red-soft);
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
  background: color-mix(in sRGB, var(--g0) 80%, transparent);
  border: 2rpx solid color-mix(in sRGB, var(--g2) 40%, transparent);
  @include sj-flex-center;
  font-size: 40rpx;
  cursor: pointer;

  &.active {
    border-color: var(--g5);
    background: color-mix(in sRGB, var(--g5) 12%, transparent);
  }
}
</style>
