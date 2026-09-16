<template>
  <view class="drill-page">
    <!-- 顶部自定义导航：返回按钮与微信胶囊垂直居中对齐 -->
    <view class="topbar" :style="{ paddingTop: pagePaddingTop }">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">{{ yearKey }} 年度挑战</text>
      <view style="width: 36px" />
    </view>

    <!-- 待：右下角加一个小狗的图标，小狗翻日历 -->
    <!-- 顶部满宽年卡片 -->
    <view class="yr-hero">
      <view class="yr-hero-top">
        <text class="yr-hero-title">{{ yearKey }} 年度挑战</text>
        <text class="yr-hero-badge" :class="yearTrackClass">{{ yearBadgeText }}</text>
      </view>
      <view class="yr-hero-nums">
        <view class="yr-hero-block">
          <text class="yr-hero-label">已支出</text>
          <text class="yr-hero-val">{{ formatFen(yearConsumed) }}</text>
        </view>
        <view class="yr-hero-block">
          <text class="yr-hero-label">目标上限</text>
          <text class="yr-hero-val sub">{{ formatFen(yearTarget) }}</text>
        </view>
        <view class="yr-hero-block">
          <text class="yr-hero-label">剩余可用</text>
          <text class="yr-hero-val ok">{{
            formatFen(Math.max(0, yearTarget - yearConsumed))
          }}</text>
        </view>
      </view>
      <view class="yr-hero-track">
        <view
          class="yr-hero-fill progress-fill"
          :style="{
            width: yearPct + '%',
            background: yearOver
              ? 'linear-gradient(90deg,var(--y5),var(--red-soft))'
              : 'linear-gradient(90deg,var(--g4),var(--g5))',
          }"
        />
      </view>
      <view class="yr-hero-foot">
        <text class="yr-hero-range" v-if="yearRangeText">{{ yearRangeText }}</text>
        <text class="yr-hero-pct" :class="yearOver ? 'over' : ''">{{ yearPct }}%</text>
      </view>
    </view>

    <!-- 12 月卡片列表（点卡片在其下方内联展开日历） -->
    <view class="month-list">
      <view v-for="m in months" :key="m.month_key" class="month-block">
        <view
          class="month-card"
          :class="{ expanded: isExpanded(m.month_key) }"
          @click="toggleMonth(m)"
        >
          <view
            class="month-card-stripe"
            :class="m.status === 'over' ? 'fail' : m.limit > 0 ? 'ok' : 'pending'"
          />
          <view class="month-card-body">
            <view class="month-card-top">
              <text class="month-card-title">{{ monthLabel(m.month_key) }}</text>
              <text class="month-card-chevron" :class="{ rot: isExpanded(m.month_key) }"
                >›</text
              >
            </view>
            <text class="month-card-range" v-if="m.limit_start && m.limit_end"
              >{{ m.limit_start }} ~ {{ m.limit_end }}</text
            >
            <view class="month-card-nums">
              <view class="month-num-block">
                <text class="month-num-label">已支出</text>
                <text class="month-num-val" :class="m.spent > m.limit ? 'over' : ''">{{
                  formatFen(m.spent)
                }}</text>
              </view>
              <view class="month-num-divider" />
              <view class="month-num-block">
                <text class="month-num-label">目标上限</text>
                <text class="month-num-val sub">{{ formatFen(m.limit) }}</text>
              </view>
              <view class="month-num-divider" />
              <view class="month-num-block">
                <text class="month-num-label">剩余可用</text>
                <text class="month-num-val ok">{{
                  formatFen(Math.max(0, m.limit - m.spent))
                }}</text>
              </view>
            </view>
            <view class="month-card-track">
              <view
                class="month-card-fill progress-fill"
                :style="{
                  width: Math.min((m.spent / Math.max(1, m.limit)) * 100, 100) + '%',
                  background:
                    m.spent > m.limit
                      ? 'linear-gradient(90deg,var(--y5),var(--red-soft))'
                      : 'linear-gradient(90deg,var(--g4),var(--g5))',
                }"
              />
            </view>
            <view class="yr-hero-foot">
              <text class="yr-hero-range" v-if="m.limit_start && m.limit_end"
                >{{ m.limit_start }} ~ {{ m.limit_end }}</text
              >
              <text class="yr-hero-pct" :class="m.spent > m.limit ? 'over' : ''"
                >{{
                  Math.round(Math.min(m.spent / Math.max(1, m.limit), 1) * 100)
                }}%</text
              >
            </view>
          </view>
        </view>

        <!-- 内联展开的日历 -->
        <view v-if="isExpanded(m.month_key)" class="cal-inline">
          <text class="cal-inline-title">{{ m.month_key }} 每日明细</text>
          <view v-if="loadingMonth === m.month_key" class="cal-loading"
            ><text>加载中…</text></view
          >
          <view v-else class="cal-grid">
            <view
              v-for="d in daysOf(m.month_key)"
              :key="d.date_key"
              class="cal-cell"
              :class="{
                active: popDay === d,
                over: d.status === 'over',
                ok: d.status === 'ok' && d.base_limit > 0,
              }"
              @click.stop="toggleCell(d)"
            >
              <text class="cal-cell-day">{{ Number(d.date_key.slice(8, 10)) }}</text>
              <text class="cal-cell-spent">{{ formatFen(d.spent) }}</text>
              <view
                class="cal-cell-dot"
                :class="
                  d.status === 'over'
                    ? 'over'
                    : d.status === 'ok' && d.base_limit > 0
                    ? 'ok'
                    : 'none'
                "
              />
            </view>

            <!-- 点击日期的详情：显示在日历下方（文档流，占整行，不悬浮） -->
            <view
              v-if="popDay && popMonthKey === m.month_key"
              class="cal-popover"
              @click.stop
            >
            <view class="day-tip">
              <text class="day-tip-close" @click="closePop">×</text>
              <text class="day-tip-date">{{ popDay.date_key.slice(5) }}</text>
              <view class="day-tip-status-row">
                <text
                  class="day-tip-status"
                  :class="
                    'st-' +
                    (popDay.status === 'over' ? 'over' : popDay.limit > 0 ? 'ok' : 'none')
                  "
                  >{{
                    popDay.status === "over"
                      ? "超额"
                      : popDay.limit > 0
                      ? "未超额"
                      : "无目标"
                  }}</text
                >
                <text class="day-tip-used"
                  >已用 ¥{{ formatFen(popDay.spent) }} / 总限额 ¥{{
                    formatFen(popDay.limit)
                  }}</text
                >
              </view>
              <view class="day-tip-divider" />
              <text class="day-tip-row"
                >固定限额 ¥{{ formatFen(popDay.base_limit) }}</text
              >
              <text class="day-tip-row" v-if="popDay.rollover > 0"
                >+ 滚入结余 ¥{{ formatFen(popDay.rollover) }}</text
              >
              <view class="day-tip-divider" v-if="popDay.rollover > 0" />
              <text class="day-tip-row day-tip-total"
                >= 总限额 ¥{{ formatFen(popDay.limit) }}</text
              >
              <view class="day-tip-divider" />
              <text
                class="day-tip-row day-tip-surplus"
                v-if="popDay.limit - popDay.spent > 0"
                >🎉 已省下 ¥{{
                  formatFen(Math.max(0, popDay.limit - popDay.spent))
                }}</text
              >
              <text
                class="day-tip-row day-tip-over"
                v-if="popDay.spent - popDay.limit > 0"
                >⚠️ 超额 ¥{{ formatFen(Math.max(0, popDay.spent - popDay.limit)) }}</text
              >
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
  </view>
</template>

<script setup>
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useUserStore } from "@/stores/user.js";
import { requireLogin } from '@/utils/guard.js';
import { formatFen } from "@/utils/money.js";
import { formatYearKey, formatMonthKey } from "@/utils/date.js";

const store = useUserStore();
const yearKey = ref(formatYearKey());
const months = ref([]);
const yearConsumed = ref(0);
const yearTarget = ref(0);

function goBack() {
  uni.navigateBack({ delta: 1 });
}

// 严格与微信胶囊垂直居中对齐（略下移一点点，视觉更舒适）
// topbar 内容区精确等于胶囊横带 → paddingTop=胶囊.top+微调，高度=胶囊.height，返回钮 height:100%
function resolveTop() {
  try {
    const rect = uni.getMenuButtonBoundingClientRect();
    if (rect && rect.top > 0 && rect.height > 0) {
      return { padTop: `${rect.top + 4}px`, barH: `${rect.height}px` };
    }
  } catch (e) {}
  const { statusBarHeight = 20 } = uni.getSystemInfoSync();
  return { padTop: `${statusBarHeight + 48}px`, barH: "32px" };
}
const top = resolveTop();
const pagePaddingTop = ref(top.padTop);
const topbarH = ref(top.barH);

// 月日历内联展开 + 点击日悬浮气泡
const expandedMonthKey = ref(""); // 当前在卡片下方展开日历的月份
const monthDaysMap = ref({}); // month_key -> days[]
const popDay = ref(null); // 当前悬浮气泡对应的日期数据（绝对定位浮层）
const popMonthKey = ref(""); // 气泡所属的月份 key
const loadingMonth = ref(""); // 正在加载的月份 key

function daysOf(monthKey) {
  return monthDaysMap.value[monthKey] || [];
}
function isExpanded(monthKey) {
  return expandedMonthKey.value === monthKey;
}

onLoad((opts) => {
  if (!requireLogin('/pages/challenge/drill')) return
  if (opts && opts.key) yearKey.value = opts.key;
  const t = resolveTop();
  pagePaddingTop.value = t.padTop;
  topbarH.value = t.barH;
  loadYear();
});

async function loadYear() {
  try {
    // 进入年视图即同步当前年月/年挑战目标上限（保证月卡/年卡有真实数值，不阻塞主流程）
    store
      .syncPeriodTargetsAction()
      .catch((e) => console.error("[drill] syncPeriodTargets failed", e));
    const res = await store.loadLimitStatus("year", yearKey.value);
    months.value = ((res && res.months) || []).filter((m) => m.limit > 0);
    // 年汇总：从 challenge_summary 取当前年记录
    await store.loadChallengeSummary();
    const list = store.challenges && store.challenges.yearly;
    const byKey = list && list.find((y) => y.period_key === yearKey.value);
    const yc = byKey || (list && list[0]) || null;
    yearConsumed.value = yc
      ? yc.consumed_amount || 0
      : months.value.reduce((s, m) => s + (m.spent || 0), 0);
    yearTarget.value = yc
      ? yc.target_amount || 0
      : months.value.reduce((s, m) => s + (m.limit || 0), 0);
  } catch (e) {
    console.error("[drill] loadYear failed =>", e && (e.stack || e.message || e));
    uni.showToast({
      title: "加载失败: " + (e && e.message ? e.message : JSON.stringify(e)),
      icon: "none",
    });
  }
}

const yearPct = computed(() =>
  Math.round(Math.min(yearConsumed.value / Math.max(1, yearTarget.value), 1) * 100)
);
const yearOver = computed(
  () => yearTarget.value > 0 && yearConsumed.value > yearTarget.value
);
const yearTrackClass = computed(() => (yearOver.value ? "warn" : "ok"));
const yearBadgeText = computed(() => (yearOver.value ? "超前消费" : "进度正常"));

// 年卡区间：读 limit_start/limit_end（如 2026-07 ~ 2026-08 → 07月 ~ 08月）
// 优先从本地已加载的月列表算（months 每条都带 limit_start/limit_end，最可靠，不受 store 重拉覆盖影响），
// 再以 store.challenges.yearly 记录作兜底（与 challenge 列表同源）。
const yearRangeText = computed(() => {
  const fmt = (k) => (k && k.length >= 7 ? `${k.slice(5, 7)}月` : "");
  const ms = (months.value || []).filter((m) => m.limit_start || m.limit_end);
  if (ms.length) {
    const s = fmt(ms[0].limit_start);
    const e = fmt(ms[ms.length - 1].limit_end);
    if (s && e) return `${s} ~ ${e}`;
    if (s) return s;
  }
  const list = store.challenges && store.challenges.yearly;
  if (list && list.length) {
    const byKey = list.find((y) => y.period_key === yearKey.value);
    const yc = byKey && (byKey.limit_start || byKey.limit_end) ? byKey : list[0];
    if (yc) {
      const s = fmt(yc.limit_start);
      const e = fmt(yc.limit_end);
      if (s && e) return `${s} ~ ${e}`;
      if (s) return s;
    }
  }
  return "";
});
// 月卡标题：接口 month_key（YYYY-MM）转友好格式
const monthLabel = (mk) => (mk && mk.length >= 7 ? `${mk.slice(5, 7)}月` : mk || "");

// 点击月卡片：在卡片下方内联展开/收起日历
async function toggleMonth(m) {
  // 已展开 → 收起（并关闭气泡）
  if (expandedMonthKey.value === m.month_key) {
    expandedMonthKey.value = "";
    popDay.value = null;
    return;
  }
  expandedMonthKey.value = m.month_key;
  popDay.value = null;
  popMonthKey.value = "";
  // 已缓存则不再请求
  if (monthDaysMap.value[m.month_key]) return;
  loadingMonth.value = m.month_key;
  try {
    const res = await store.loadLimitStatus("month", m.month_key);
    monthDaysMap.value = {
      ...monthDaysMap.value,
      [m.month_key]: (res && res.days) || [],
    };
  } catch (e) {
    console.error("[drill] loadMonth failed =>", e && (e.stack || e.message || e));
    uni.showToast({
      title: "加载失败: " + (e && e.message ? e.message : JSON.stringify(e)),
      icon: "none",
    });
  } finally {
    loadingMonth.value = "";
  }
}
// 点击日期：灰色（无目标/无数据）不弹；否则切换悬浮气泡
function toggleCell(d) {
  if (d.status === "none" || !d.limit) return;
  if (popDay.value === d) {
    popDay.value = null;
    popMonthKey.value = "";
    return;
  }
  popDay.value = d;
  popMonthKey.value = expandedMonthKey.value;
}
function closePop() {
  popDay.value = null;
  popMonthKey.value = "";
}
</script>

<style scoped>
.drill-page {
  padding: 0 32rpx 60rpx;
  min-height: 100vh;
  background: #ffffff;
}
/* 顶部自定义导航：返回按钮与微信胶囊垂直居中对齐 */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 16px;
  padding-right: 16px;
}
.back-btn {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b8c7a;
  font-size: 18px;
}
.topbar-title {
  font-size: 17px;
  font-weight: 700;
  color: #1a2820;
}
/* 满宽年卡片 */
.yr-hero {
  margin: 0 -32rpx;
  border-radius: 0;
  padding: 48rpx 36rpx;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(40rpx) saturate(1.5);
  -webkit-backdrop-filter: blur(40rpx) saturate(1.5);
  border: 2rpx solid rgba(255, 255, 255, 0.86);
  border-radius: 48rpx;
  box-shadow: 0 12rpx 64rpx rgba(37, 204, 93, 0.08), 0 2rpx 8rpx rgba(15, 28, 20, 0.05);
  color: #1a2820;
}
.yr-hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.yr-hero-title {
  font-size: 32rpx;
  font-weight: 800;
}
.yr-hero-badge {
  font-size: 18rpx;
  font-weight: 700;
  padding: 3rpx 14rpx;
  border-radius: 20rpx;
}
.yr-hero-badge.ok {
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
}
.yr-hero-badge.warn {
  background: rgba(245, 158, 11, 0.15);
  color: var(--y5);
}
.yr-hero-nums {
  display: flex;
  justify-content: space-around;
  margin: 22rpx 0 16rpx;
}
.yr-hero-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.yr-hero-label {
  font-size: 18rpx;
  color: var(--ink4);
  margin-bottom: 4rpx;
}
.yr-hero-val {
  font-size: 38rpx;
  font-weight: 900;
}
.yr-hero-val.sub {
  color: var(--ink2);
}
.yr-hero-val.ok {
  color: var(--g5);
}
.yr-hero-track {
  margin: 48rpx 36rpx 0;
  height: 16rpx;
  border-radius: 16rpx;
  background: rgba(15, 28, 20, 0.07);
  overflow: hidden;
}
.yr-hero-fill {
  height: 100%;
  border-radius: 18rpx;
  transition: width 0.3s;
}
.yr-hero-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 8rpx;
}
.yr-hero-pct {
  font-size: 20rpx;
  font-weight: 600;
  color: var(--ink3);
}
.yr-hero-pct.over {
  color: var(--red-soft);
}
.yr-hero-range {
  font-size: 18rpx;
  color: var(--ink4);
}

/* 月列表 */
.month-list {
  margin-top: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.month-card {
  position: relative;
  border-radius: 24rpx;
  overflow: hidden;
  background: #ffffff;
  border: 2rpx solid #e8edea;
  display: flex;
}
.month-card-stripe {
  width: 10rpx;
  flex-shrink: 0;
}
.month-card-stripe.ok {
  background: linear-gradient(180deg, var(--g4), var(--g5));
}
.month-card-stripe.fail {
  background: linear-gradient(180deg, var(--y5), var(--red-soft));
}
.month-card-stripe.pending {
  background: var(--ink4);
}
.month-card-body {
  flex: 1;
  padding: 22rpx 24rpx;
}
.month-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.month-card-title {
  font-size: 26rpx;
  font-weight: 800;
  color: #1a2820;
}
.month-card-chevron {
  font-size: 32rpx;
  color: var(--ink4);
}
.month-card-range {
  display: block;
  margin-top: 4rpx;
  font-size: 16rpx;
  color: var(--ink4);
}
.month-card-nums {
  display: flex;
  align-items: flex-end;
  gap: 18rpx;
  margin: 12rpx 0;
}
.month-num-block {
  display: flex;
  flex-direction: column;
}
.month-num-label {
  font-size: 16rpx;
  color: var(--ink4);
}
.month-num-val {
  font-size: 26rpx;
  font-weight: 700;
  color: #1a2820;
}
.month-num-val.sub {
  color: var(--ink3);
}
.month-num-val.ok {
  color: var(--g5);
}
.month-num-val.over {
  color: var(--red-soft);
}
.month-num-divider {
  width: 2rpx;
  height: 36rpx;
  background: #e8edea;
}
.month-card-track {
  height: 12rpx;
  border-radius: 12rpx;
  background: rgba(15, 28, 20, 0.07);
  overflow: hidden;
}
.month-card-fill {
  height: 100%;
  border-radius: 12rpx;
  transition: width 0.3s;
}

/* 内联展开的月日历（点月卡片后在卡片下方显示） */
.month-block {
  position: relative;
  margin-bottom: 20rpx;
}
.month-card.expanded {
  border-color: var(--g5);
  box-shadow: 0 10rpx 30rpx rgba(140, 233, 155, 0.22);
}
.month-card-chevron {
  transition: transform 0.25s;
}
.month-card-chevron.rot {
  transform: rotate(90deg);
}
.cal-inline {
  margin: 4rpx 0 8rpx;
  padding: 20rpx 20rpx 24rpx;
  background: rgba(245, 255, 247, 0.7);
  border: 2rpx solid rgba(140, 233, 155, 0.45);
  border-radius: 20rpx;
}
@keyframes inline-fade {
  from {
    opacity: 0;
    transform: translateY(-8rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.cal-inline-title {
  display: block;
  font-size: 26rpx;
  font-weight: 800;
  color: #1a2820;
  margin-bottom: 16rpx;
  animation: inline-fade 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.cal-loading {
  padding: 40rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: var(--ink4);
}
.cal-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12rpx;
}
.cal-cell {
  position: relative;
  min-height: 96rpx;
  border-radius: 16rpx;
  background: #ffffff;
  border: 2rpx solid #e8edea;
  padding: 10rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.25s;
}
.cal-cell.active {
  border-color: var(--g5);
  box-shadow: 0 0 16rpx rgba(140, 233, 155, 0.5);
}
.cal-cell.over {
  border-color: var(--red-soft);
}
.cal-cell-day {
  font-size: 24rpx;
  font-weight: 800;
  color: #1a2820;
}
.cal-cell-spent {
  font-size: 16rpx;
  color: var(--ink3);
  margin-top: 2rpx;
}
.cal-cell-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  margin-top: 6rpx;
}
.cal-cell-dot.ok {
  background: var(--g5);
}
.cal-cell-dot.over {
  background: var(--red-soft);
}
.cal-cell-dot.none {
  background: var(--ink4);
}
.cal-cell.over {
  border-color: var(--red-soft);
}
/* 点击日详情：显示在日历正下方的整行卡片（文档流，占整行） */
.cal-popover {
  grid-column: 1 / -1;
  margin-top: 12rpx;
  animation: tip-pop 0.3s ease both;
}
@keyframes tip-pop {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.day-tip {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 22rpx 28rpx;
  border-radius: 22rpx;
  min-width: 280rpx;
  background: rgba(245, 255, 247, 0.6);
  border: 2rpx solid rgba(140, 233, 155, 0.7);
  box-shadow: 0 8rpx 30rpx rgba(140, 233, 155, 0.35);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
}
.day-tip-close {
  position: absolute;
  top: 10rpx;
  right: 18rpx;
  font-size: 30rpx;
  color: var(--ink4);
  line-height: 1;
}
.day-tip-date {
  font-size: 26rpx;
  font-weight: 800;
  color: #1a2820;
}
.day-tip-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}
.day-tip-status {
  font-size: 22rpx;
  font-weight: 700;
}
.day-tip-status.st-ok {
  color: var(--g5);
}
.day-tip-status.st-over {
  color: var(--red-soft);
}
.day-tip-status.st-none {
  color: var(--ink4);
}
.day-tip-used {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--ink3);
  white-space: nowrap;
}
.day-tip-row {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--ink3);
  white-space: nowrap;
}
.day-tip-total {
  font-size: 28rpx;
  font-weight: 900;
  color: var(--g5);
}
.day-tip-surplus {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--g5);
}
.day-tip-over {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--red-soft);
}
.day-tip-divider {
  height: 2rpx;
  background: rgba(140, 233, 155, 0.5);
  margin: 4rpx 0;
}
</style>
