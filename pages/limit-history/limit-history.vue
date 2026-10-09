<template>
  <view class="history-page" data-cmp="LimitHistory">
    <PageHeader title="限额历史" @back="goBack" />

    <!-- 汇总 -->
    <view class="glass-mid" style="margin: 24rpx 32rpx; padding: 28rpx">
      <view class="stats-row">
        <view class="stat-block">
          <text class="stat-val" style="color: var(--g5)">¥{{ totalLimitYuan }}</text>
          <text class="stat-lbl">累计配置额度</text>
        </view>
        <view class="stat-block">
          <text class="stat-val" style="color: var(--ink)">¥{{ totalSpentYuan }}</text>
          <text class="stat-lbl">累计花费</text>
        </view>
        <view class="stat-block">
          <text class="stat-val" style="color: var(--ink3)">¥{{ totalSurplusYuan }}</text>
          <text class="stat-lbl">累计结余</text>
        </view>
      </view>
    </view>

    <!-- 维度筛选：年 / 月 / 日 -->
    <!-- 限额筛选：可折叠，折叠时仅暴露月份 -->
    <view class="filter-block">
      <view class="filter-head" @click="collapsed = !collapsed">
        <text class="filter-title">限额筛选</text>
        <text class="filter-toggle">{{ collapsed ? "展开 ▾" : "收起 ▴" }}</text>
      </view>

      <view v-show="!collapsed" class="filter-row">
        <scroll-view
          id="svYear"
          :scroll-left="scrollLeftYear"
          scroll-x
          class="chip-scroll"
          :show-scrollbar="false"
        >
          <view class="chip-track">
            <view
              v-for="y in yearOptions"
              :key="y"
              :id="'y-chip-' + y"
              class="month-chip"
              :class="{ active: y === activeYear }"
              @click="selectYear(y)"
            >
              <text>{{ y }} 年</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="filter-row">
        <scroll-view
          id="svMonth"
          :scroll-left="scrollLeftMonth"
          scroll-x
          class="chip-scroll"
          :show-scrollbar="false"
        >
          <view class="chip-track">
            <view
              v-for="m in monthOptions"
              :key="m.key"
              :id="'m-chip-' + m.key"
              class="month-chip"
              :class="{ active: m.key === activeMonth }"
              @click="selectMonth(m.key)"
            >
              <text>{{ m.label }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view v-show="!collapsed" class="filter-row" v-if="dayOptions.length">
        <scroll-view
          id="svDay"
          :scroll-left="scrollLeftDay"
          scroll-x
          class="chip-scroll"
          :show-scrollbar="false"
        >
          <view class="chip-track">
            <view
              id="d-chip-all"
              class="month-chip"
              :class="{ active: !activeDay }"
              @click="activeDay = null"
            >
              <text>全月</text>
            </view>
            <view
              v-for="d in dayOptions"
              :key="d"
              :id="'d-chip-' + d"
              class="month-chip day-chip"
              :class="{ active: d === activeDay }"
              @click="selectDay(d)"
            >
              <text>{{ d }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <scroll-view
      class="page-scroll"
      scroll-y
      enhanced
      :show-scrollbar="false"
      style="flex: 1"
    >
      <template v-if="filteredList.length">
        <view
          v-for="(item, i) in filteredList"
          :key="i"
          class="history-card glass-thin card-item"
          style="margin: 0 32rpx 16rpx; padding: 24rpx 28rpx"
        >
          <view class="history-top">
            <text class="history-date">{{ item.date_key.slice(5) }}</text>
            <text class="history-source" :class="item.source">{{
              item.source === "override" ? "硬覆盖" : "自动"
            }}</text>
          </view>
          <view class="history-body">
            <view class="hb-col">
              <text class="hb-label">当日额度</text>
              <text class="hb-val">¥{{ yuan(item.day_limit_fen) }}</text>
            </view>
            <view class="hb-col">
              <text class="hb-label">花费</text>
              <text class="hb-val" style="color: var(--red-soft)"
                >¥{{ yuan(item.spent_fen) }}</text
              >
            </view>
            <view class="hb-col">
              <text class="hb-label">结余</text>
              <text class="hb-val" style="color: var(--ink3)"
                >¥{{ yuan(item.surplus_fen) }}</text
              >
            </view>
          </view>
          <view v-if="item.surplus_fen > 0" class="history-dest">
            <text class="dest-tag" :class="item.surplus_dest">{{
              destLabel(item.surplus_dest)
            }}</text>
          </view>
        </view>
      </template>
      <view v-else class="empty-wrap">
        <image
          class="empty-icon"
          :src="cdn('/app_static/images/icon_limit_history_empty.png')"
          mode="aspectFit"
        />
        <text class="empty-text">暂无记录</text>
        <text class="empty-sub">配置了限额后，每日结算会自动归档</text>
      </view>

      <!-- 超 3 年留存期的年度归档汇总（明细已清理，仅保留年度聚合） -->
      <YearlyLimitOverview />

      <view style="height: 48rpx" />
    </scroll-view>

    <amount-keyboard />
  </view>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { getLimitHistory } from "@/api/sparejar.js";
import { requireLogin } from "@/utils/guard.js";
import { todayDateKey } from "@/utils/date.js";
import PageHeader from "@/components/PageHeader.vue";
import { cdn } from "@/utils/cdn.js";
import YearlyLimitOverview from "@/components/YearlyLimitOverview.vue";

const rawList = ref([]);
const NOW = new Date();
const currentYear = String(NOW.getFullYear());
const currentMonthKey = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(
  2,
  "0"
)}`;
const retentionStart = new Date(NOW.getFullYear() - 3, NOW.getMonth(), 1);
const activeYear = ref(currentYear);
const activeMonth = ref(currentMonthKey);
const activeDay = ref(null);
// 筛选栏折叠：true 时只暴露月份，年/日需展开
const collapsed = ref(true);
// 各 scroll-view 的横向滚动偏移（用于把选中 chip 滚入可视区）
const scrollLeftYear = ref(0);
const scrollLeftMonth = ref(0);
const scrollLeftDay = ref(0);
// 选中项贴边时与可视区边缘保留的空隙（rpx → px，按设备宽度换算，保证各屏一致）
const __sys = (uni.getWindowInfo && uni.getWindowInfo()) ||
  (uni.getSystemInfoSync && uni.getSystemInfoSync()) || { windowWidth: 375 };
const EDGE_GAP_PX = (16 * (__sys.windowWidth || 375)) / 750;

// 将选中的 chip 滚入可视区：已在可视范围内则不滚动；否则贴右边缘显示
const scrollRowIntoView = (svId, chipId, scrollLeftRef) => {
  nextTick(() => {
    const q = uni.createSelectorQuery();
    q.select("#" + svId).boundingClientRect();
    q.select("#" + svId).scrollOffset();
    q.select("#" + chipId).boundingClientRect();
    q.exec((res) => {
      if (!res || res.length < 3) return;
      const svRect = res[0];
      const svOffset = res[1];
      const chipRect = res[2];
      if (!svRect || !svOffset || !chipRect) return;
      const containerW = svRect.width;
      const chipLeftInContent = chipRect.left - svRect.left + svOffset.scrollLeft;
      const chipRightInContent = chipLeftInContent + chipRect.width;
      let target = scrollLeftRef.value;
      if (chipRightInContent > svOffset.scrollLeft + containerW) {
        target = chipRightInContent - containerW + EDGE_GAP_PX;
      } else if (chipLeftInContent < svOffset.scrollLeft) {
        target = chipLeftInContent - EDGE_GAP_PX;
      }
      if (target < 0) target = 0;
      scrollLeftRef.value = target;
    });
  });
};

const yuan = (fen) => Math.round((fen || 0) / 100).toLocaleString("zh-CN");

const destMap = {
  rollover_tomorrow: "顺延明日",
  rollover_pool: "滚回月池",
  wish: "存入心愿",
  savings: "存入存款池",
  none: "无结余",
};
const destLabel = (d) => destMap[d] || "—";

// 留存窗口内的可选年份（近 3 年）
const yearOptions = computed(() => {
  const arr = [];
  for (let y = retentionStart.getFullYear(); y <= NOW.getFullYear(); y++)
    arr.push(String(y));
  return arr;
});

// 选中年份下、落在留存窗口内的月份
const monthOptions = computed(() => {
  const arr = [];
  for (let m = 1; m <= 12; m++) {
    const d = new Date(Number(activeYear.value), m - 1, 1);
    if (d < retentionStart || d > NOW) continue;
    const key = `${activeYear.value}-${String(m).padStart(2, "0")}`;
    arr.push({ key, label: `${m} 月` });
  }
  return arr;
});

// 选中月份下有记录的天（用于「日」维度快速跳转；点「全月」取消）
const dayOptions = computed(() => {
  const set = new Set();
  for (const it of rawList.value) {
    if (it.date_key.slice(0, 7) === activeMonth.value) set.add(it.date_key.slice(8, 10));
  }
  return Array.from(set).sort();
});

const selectYear = (y) => {
  activeYear.value = y;
  activeDay.value = null;
  const opts = monthOptions.value;
  activeMonth.value =
    y === currentYear
      ? currentMonthKey
      : opts.length
      ? opts[opts.length - 1].key
      : activeMonth.value;
  scrollRowIntoView("svYear", "y-chip-" + y, scrollLeftYear);
  scrollRowIntoView("svMonth", "m-chip-" + activeMonth.value, scrollLeftMonth);
};
const selectMonth = (key) => {
  activeMonth.value = key;
  activeYear.value = key.slice(0, 4);
  activeDay.value = null;
  scrollRowIntoView("svMonth", "m-chip-" + key, scrollLeftMonth);
};
const selectDay = (d) => {
  const next = activeDay.value === d ? null : d;
  activeDay.value = next;
  scrollRowIntoView("svDay", next ? "d-chip-" + d : "d-chip-all", scrollLeftDay);
};

// 留存下限（与后端 3 年一致）；即便不一致，后端也会强制钳制
function retentionFloorKey() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const filteredList = computed(() =>
  rawList.value.filter((it) => {
    if (it.date_key.slice(0, 4) !== activeYear.value) return false;
    if (it.date_key.slice(0, 7) !== activeMonth.value) return false;
    if (activeDay.value && it.date_key.slice(8, 10) !== activeDay.value) return false;
    return true;
  })
);

const totalLimitYuan = computed(
  () => (rawList.value.reduce((s, it) => s + (it.day_limit_fen || 0), 0) / 100) | 0
);
const totalSpentYuan = computed(
  () => (rawList.value.reduce((s, it) => s + (it.spent_fen || 0), 0) / 100) | 0
);
const totalSurplusYuan = computed(
  () => (rawList.value.reduce((s, it) => s + (it.surplus_fen || 0), 0) / 100) | 0
);

async function load() {
  try {
    // 分页累加拉取整个留存窗口（近 3 年）；后端已钳制下限并做游标分页
    const endDate = todayDateKey();
    const PAGE = 200;
    let cursor = null;
    let hasMore = true;
    rawList.value = [];
    while (hasMore) {
      const data = await getLimitHistory({
        start_key: retentionFloorKey(),
        end_key: endDate,
        before_key: cursor || undefined,
        limit: PAGE,
      });
      const list = (data && data.list) || [];
      rawList.value = rawList.value.concat(list);
      hasMore = !!(data && data.has_more);
      cursor = data && data.next_cursor;
      if (!hasMore || !cursor) break;
    }
  } catch (e) {
    uni.showToast({ title: "加载失败", icon: "none" });
  }
}

// 展开时把年/日已选项也滚入可视区
watch(collapsed, (v) => {
  if (!v) {
    scrollRowIntoView("svYear", "y-chip-" + activeYear.value, scrollLeftYear);
    scrollRowIntoView(
      "svDay",
      activeDay.value ? "d-chip-" + activeDay.value : "d-chip-all",
      scrollLeftDay
    );
  }
});

onMounted(() => {
  if (!requireLogin("/pages/limit-history/limit-history")) return;
  load();
  // 当前月份默认贴右边缘，进入即可见
  scrollRowIntoView("svMonth", "m-chip-" + activeMonth.value, scrollLeftMonth);
});
const goBack = () => uni.navigateBack();
</script>

<style scoped lang="scss">
.history-page {
  @include sj-theme-css-vars;
  width: 750rpx;
  height: 100vh;
  margin: 0 auto;
  background: var(--g1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.stats-row {
  display: flex;
}
.stat-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.stat-val {
  font-size: 32rpx;
  font-weight: 900;
}
.stat-lbl {
  font-size: 22rpx;
  color: var(--ink4);
}

.filter-block {
  padding: 0 0 12rpx;
}
.filter-row {
  margin-bottom: 12rpx;
}
.chip-scroll {
  width: 100%;
  white-space: nowrap;
}
.chip-track {
  display: inline-flex;
  gap: 16rpx;
  padding: 0 32rpx;
}
.day-chip {
  min-width: 76rpx;
  text-align: center;
}
.filter-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 32rpx 12rpx;
}
.filter-title {
  font-size: 24rpx;
  color: var(--ink4);
  font-weight: 700;
}
.filter-toggle {
  font-size: 22rpx;
  color: var(--ink3);
}
.month-chip {
  padding: 12rpx 28rpx;
  border-radius: 40rpx;
  background: var(--g0);
  border: 2rpx solid var(--g2-1);
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ink3);
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}
.month-chip.active {
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
  border-color: transparent;
}

.history-card {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.history-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.history-date {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--ink);
}
.history-source {
  font-size: 20rpx;
  font-weight: 700;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}
.history-source.auto {
  background: var(--g0);
  color: var(--g5);
}
.history-source.override {
  background: var(--amber-bg);
  color: var(--amber);
}

.history-body {
  display: flex;
}
.hb-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.hb-label {
  font-size: 20rpx;
  color: var(--ink4);
}
.hb-val {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--ink);
}

.history-dest {
  display: flex;
}
.dest-tag {
  font-size: 22rpx;
  font-weight: 700;
  padding: 6rpx 20rpx;
  border-radius: 24rpx;
  background: var(--g1);
  color: var(--ink3);
}
.dest-tag.rollover_tomorrow {
  background: var(--g0);
  color: var(--g5);
}
.dest-tag.rollover_pool {
  background: var(--g0);
  color: var(--ink3);
}
.dest-tag.wish {
  background: var(--red-bg);
  color: var(--red-soft);
}
.dest-tag.savings {
  background: var(--b2);
  color: var(--b2-1);
}

.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 120rpx 0;
}
.empty-icon {
  width: 350rpx;
  height: 350rpx;
}
.empty-text {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--ink3);
}
.empty-sub {
  font-size: 24rpx;
  color: var(--ink4);
}
</style>
