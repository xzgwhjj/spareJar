<template>
  <view class="challenge-page" data-cmp="ChallengePage">
    <!-- 极光背景 -->
    <view class="aurora-bg-wrap">
      <view class="aurora-bg-base" />
      <view class="ch-aurora-1" />
      <view class="ch-aurora-2" />
      <view class="ch-aurora-3" />
      <view class="ch-blob-1" />
      <view class="ch-blob-2" />
      <!-- 不规则变形装饰形状 -->
      <view class="morph-blob" />
      <view class="morph-blob2" />
    </view>

    <!-- 顶部（固定在极光背景之上，独立于滚动区，避免被胶囊遮挡） -->
    <view class="topbar" :style="{ paddingTop: topbarPad + 'px' }">
      <view class="topbar-left">
        <text class="topbar-sub">挑战中心</text>
        <text class="topbar-title">🏆 余钱罐挑战</text>
      </view>
      <view class="streak-badge badge-pulse flame-pulse">
        <text>🔥 连击 {{ streakDays }} 天</text>
      </view>
    </view>

    <scroll-view
      class="page-scroll"
      scroll-y
      enhanced
      :show-scrollbar="false"
      style="z-index: 2"
    >
      <!-- 每日挑战 -->
      <view class="card-slide-1">
        <view class="ch-glass daily-card">
          <!-- 背景装饰圆 -->
          <view class="daily-deco" />

          <view class="daily-top">
            <!-- 左侧 -->
            <view class="daily-left">
              <view class="daily-status">
                <view
                  class="status-dot"
                  :class="dailyChallenge.success ? 'ok' : 'pending'"
                />
                <text
                  class="daily-status-text"
                  :class="dailyChallenge.success ? 'ok' : 'pending'"
                  >{{ dailyChallenge.success ? "今日达标 ✓" : "挑战进行中" }}</text
                >
              </view>
              <view class="daily-sub-label">今日支出</view>
              <view class="daily-amount num-in">
                <text class="daily-yen">¥</text>
                <text class="daily-num">{{ dailyChallenge.spentYuan }}</text>
              </view>
              <view class="daily-meta">
                <text class="daily-meta-label">日限额</text>
                <text class="daily-meta-limit">¥{{ dailyChallenge.limitYuan }}</text>
                <text
                  class="daily-meta-diff"
                  :class="dailyChallenge.success ? 'ok' : 'pending'"
                  >还剩 ¥{{ dailyChallenge.remainYuan }}</text
                >
              </view>
            </view>

            <!-- 右侧 环形进度（canvas 羽化发光，还原原版柔光感） -->
            <RingProgress
              :pct="dailyChallenge.pct"
              :size="100"
              :stroke-w="8"
              :color-from="dailyChallenge.pct >= 1 ? '#ef4444' : '#8ae99b'"
              :color-to="dailyChallenge.pct >= 1 ? '#ef4444' : '#25cc5d'"
              :track-color="'rgba(15,28,20,0.07)'"
            >
              <text class="ring-pct" :class="dailyChallenge.pct >= 1 ? 'over' : ''"
                >{{ Math.round(dailyChallenge.pct * 100) }}%</text
              >
              <text class="ring-pct-label">已用</text>
            </RingProgress>
          </view>

          <!-- 线形进度条 -->
          <view class="daily-track">
            <view
              class="daily-track-fill progress-fill"
              :style="{
                width: Math.min(dailyChallenge.pct, 1) * 100 + '%',
                background:
                  dailyChallenge.pct >= 1
                    ? 'linear-gradient(90deg,var(--amber),var(--red-soft))'
                    : 'linear-gradient(90deg,var(--g4),var(--g5))',
              }"
            />
          </view>

          <!-- 限额状态热力（近7日 / 日历指定日·月·年） -->
          <view class="week-row">
            <view class="week-head">
              <text class="week-label">{{ calDim === "week" ? "一周" : calLabel }}</text>
              <view class="week-actions">
                <text v-if="calDim !== 'week'" class="week-reset" @click="resetToWeek"
                  >一周</text
                >
                <text class="week-cal-btn" @click="openCalSheet">📅 日历</text>
              </view>
            </view>
            <view
              v-if="calLoading || (initialLoading && calDim === 'week')"
              class="week-loading"
              ><text>加载中…</text></view
            >
            <view v-else-if="calDim !== 'week' && !heatData.length" class="week-loading"
              ><text>暂无数据</text></view
            >
            <view v-else class="week-bars">
              <view v-for="(d, i) in heatData" :key="i" class="week-col">
                <!-- 固定高柱体，内部填充高度随比例变化（贴合原版规格） -->
                <view
                  class="week-bar"
                  :class="['st-' + d.status, { 'is-today': d.dateKey === todayKey }]"
                  @click="onBarTap(d)"
                >
                  <view
                    class="week-fill"
                    :class="['st-' + d.status]"
                    :style="{
                      height:
                        (d.status === 'none'
                          ? 100
                          : d.limit > 0
                          ? Math.min(d.spent / d.limit, 1) * 100
                          : 0) + '%',
                    }"
                  >
                    <text v-if="d.status === 'ok'" class="week-check">✓</text>
                  </view>
                </view>
                <text class="week-date" :class="{ 'is-today': d.dateKey === todayKey }">{{
                  d.date
                }}</text>
              </view>
            </view>
          </view>
          <!-- 点击柱子的限额说明气泡（无遮罩，直接显示） -->
          <view v-if="showDayTip && dayTip" class="day-tip">
            <text class="day-tip-close" @click="closeDayTip">×</text>
            <text class="day-tip-date">{{ dayTip.label }}</text>
            <view class="day-tip-status-row">
              <text
                class="day-tip-status"
                :class="
                  'st-' +
                  (dayTip.statusText === '未超额'
                    ? 'ok'
                    : dayTip.statusText === '未消费'
                    ? 'none'
                    : 'over')
                "
                >{{ dayTip.statusText }}</text
              >
              <text class="day-tip-used"
                >已用 ¥{{ dayTipSpent }} / 总限额 ¥{{ dayTipLimit }}</text
              >
            </view>
            <view class="day-tip-divider" />
            <!-- 所有天都拆解：固定限额 + 滚入结余 = 总限额（字段来自 daily_settlements） -->
            <text class="day-tip-row">固定限额 ¥{{ dayTipFixed }}</text>
            <text class="day-tip-row" v-if="dayTip.rolloverLimit > 0"
              >+ 滚入结余 ¥{{ dayTipRoll }}</text
            >
            <view class="day-tip-divider" v-if="dayTip.rolloverLimit > 0" />
            <text class="day-tip-row day-tip-total">= 总限额 ¥{{ dayTipLimit }}</text>
            <view class="day-tip-divider" />
            <text class="day-tip-row day-tip-surplus" v-if="dayTip.surplus > 0"
              >🎉 已省下 ¥{{ dayTipSurplus }}</text
            >
            <text class="day-tip-row day-tip-over" v-if="dayTip.overAmount > 0"
              >⚠️ 超额 ¥{{ dayTipOver }}</text
            >
          </view>
        </view>
      </view>

      <!-- 年度挑战（采用月度卡片样式；内部嵌入当月卡片，其余月份点击下钻查看） -->
      <view class="ch-glass card-slide-2" style="margin: 0 32rpx 32rpx; padding: 36rpx">
        <view class="section-title-row">
          <text class="section-title">🎯 年度挑战</text>
          <text class="ch-count">{{
            yearlyChallenges.length ? yearlyChallenges[0].period_key + " 年" : ""
          }}</text>
        </view>
        <view v-if="!yearlyChallenges.length" class="ch-empty"
          ><text>今年还没有挑战目标，点「设目标」开启</text></view
        >
        <view
          v-for="yc in yearlyChallenges"
          :key="yc._id"
          class="challenge-card"
          style="margin-top: 24rpx"
          @click="onYearTap(yc)"
        >
          <view class="ch-card-inner">
            <!-- 状态色带 -->
            <view
              class="ch-card-stripe"
              :class="
                yc.status === 'completed' ? (yc.is_success ? 'ok' : 'fail') : 'pending'
              "
            />
            <view class="ch-card-body">
              <view class="ch-card-top">
                <view class="ch-card-title-wrap">
                  <text class="ch-card-title">{{
                    yc.ledger_id ? "绑定账本挑战" : yc.period_key + " 年度消费挑战"
                  }}</text>
                  <text v-if="yearTrack(yc)" class="ch-badge ok">进度正常</text>
                  <text v-else class="ch-badge fail">超前消费</text>
                </view>
                <text class="ch-card-chevron">›</text>
              </view>
              <view class="ch-card-nums">
                <view class="ch-num-block">
                  <text class="ch-num-label">已支出</text>
                  <text
                    class="ch-num-val"
                    :class="yc.consumed_amount > yc.target_amount ? 'over' : ''"
                    >{{ formatFen(yc.consumed_amount) }}</text
                  >
                </view>
                <view class="ch-num-divider" />
                <view class="ch-num-block">
                  <text class="ch-num-label">目标上限</text>
                  <text class="ch-num-val sub">{{ formatFen(yc.target_amount) }}</text>
                </view>
                <template v-if="yc.status !== 'completed'">
                  <view class="ch-num-divider" />
                  <view class="ch-num-block">
                    <text class="ch-num-label">剩余可用</text>
                    <text class="ch-num-val ok">{{
                      formatFen(Math.max(0, yc.target_amount - yc.consumed_amount))
                    }}</text>
                  </view>
                </template>
              </view>
              <!-- 进度条 -->
              <view class="ch-card-track">
                <view
                  class="ch-card-fill progress-fill"
                  :style="{
                    width:
                      Math.min(
                        (yc.consumed_amount / Math.max(1, yc.target_amount)) * 100,
                        100
                      ) + '%',
                    background:
                      yc.consumed_amount > yc.target_amount
                        ? 'linear-gradient(90deg,var(--y5),var(--red-soft))'
                        : 'linear-gradient(90deg,var(--g4),var(--g5))',
                  }"
                />
              </view>
              <view class="ch-card-foot">
                <text class="ch-card-range">{{ yearRangeText }}</text>
                <text
                  class="ch-card-pct"
                  :class="yc.consumed_amount > yc.target_amount ? 'over' : ''"
                  >{{
                    Math.round(
                      Math.min(yc.consumed_amount / Math.max(1, yc.target_amount), 1) *
                        100
                    )
                  }}%</text
                >
              </view>
              <view v-if="yc._derived" class="ch-card-hint"
                ><text>此目标由首页限额自动同步，点「设目标」可单独设置</text></view
              >

              <!-- 当月卡片（嵌套显示，其余月份点击年度卡片下钻查看） -->
              <view v-if="currentMonth" class="ch-month-nested">
                <view class="ch-month-nested-head">
                  <text class="ch-month-nested-label">📆 本月</text>
                  <text class="ch-month-nested-go">查看全年 12 个月 ›</text>
                </view>
                <view class="challenge-card ch-month-card" @click.stop="onYearTap(yc)">
                  <view class="ch-card-inner">
                    <view
                      class="ch-card-stripe"
                      :class="
                        currentMonth.status === 'completed'
                          ? currentMonth.is_success
                            ? 'ok'
                            : 'fail'
                          : 'pending'
                      "
                    />
                    <view class="ch-card-body">
                      <view class="ch-card-top">
                        <view class="ch-card-title-wrap">
                          <text class="ch-card-title">{{
                            currentMonth.ledger_id
                              ? "绑定账本挑战"
                              : currentMonth.period_key + " 月消费挑战"
                          }}</text>
                          <text
                            v-if="
                              currentMonth.status === 'completed' &&
                              currentMonth.is_success
                            "
                            class="ch-badge ok"
                            >已达标</text
                          >
                          <text
                            v-else-if="
                              currentMonth.status === 'completed' &&
                              !currentMonth.is_success
                            "
                            class="ch-badge fail"
                            >未达标</text
                          >
                          <text v-else class="ch-badge pending">进行中</text>
                        </view>
                      </view>
                      <view class="ch-card-nums">
                        <view class="ch-num-block">
                          <text class="ch-num-label">已支出</text>
                          <text
                            class="ch-num-val"
                            :class="
                              currentMonth.consumed_amount > currentMonth.target_amount
                                ? 'over'
                                : ''
                            "
                            >{{ formatFen(currentMonth.consumed_amount) }}</text
                          >
                        </view>
                        <view class="ch-num-divider" />
                        <view class="ch-num-block">
                          <text class="ch-num-label">目标上限</text>
                          <text class="ch-num-val sub">{{
                            formatFen(currentMonth.target_amount)
                          }}</text>
                        </view>
                        <template v-if="currentMonth.status !== 'completed'">
                          <view class="ch-num-divider" />
                          <view class="ch-num-block">
                            <text class="ch-num-label">剩余可用</text>
                            <text class="ch-num-val ok">{{
                              formatFen(
                                Math.max(
                                  0,
                                  currentMonth.target_amount -
                                    currentMonth.consumed_amount
                                )
                              )
                            }}</text>
                          </view>
                        </template>
                      </view>
                      <view class="ch-card-track">
                        <view
                          class="ch-card-fill progress-fill"
                          :style="{
                            width:
                              Math.min(
                                (currentMonth.consumed_amount /
                                  Math.max(1, currentMonth.target_amount)) *
                                  100,
                                100
                              ) + '%',
                            background:
                              currentMonth.consumed_amount > currentMonth.target_amount
                                ? 'linear-gradient(90deg,var(--y5),var(--red-soft))'
                                : 'linear-gradient(90deg,var(--g4),var(--g5))',
                          }"
                        />
                      </view>
                      <view class="ch-card-foot">
                        <text class="ch-card-range">{{ monthRangeText }}</text>
                        <text
                          class="ch-card-pct"
                          :class="
                            currentMonth.consumed_amount > currentMonth.target_amount
                              ? 'over'
                              : ''
                          "
                          >{{
                            Math.round(
                              Math.min(
                                currentMonth.consumed_amount /
                                  Math.max(1, currentMonth.target_amount),
                                1
                              ) * 100
                            )
                          }}%</text
                        >
                      </view>
                      <view v-if="currentMonth._derived" class="ch-card-hint"
                        ><text
                          >此目标由首页限额自动同步，点「设目标」可单独设置</text
                        ></view
                      >
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 徽章墙 -->
      <view class="ch-glass card-slide-4" style="margin: 0 32rpx 48rpx; padding: 36rpx">
        <text class="section-title">🎖️ 徽章成就</text>
        <view v-if="!achievementsList.length" class="ch-empty"
          ><text>完成记账、设限额、连续打卡即可点亮徽章</text></view
        >
        <view class="badge-grid">
          <view
            v-for="b in achievementsList"
            :key="b.code"
            class="badge-item badge-shine"
            :class="{ unlocked: b.unlocked }"
            @click="openPoster(b)"
          >
            <view class="badge-icon-box" :class="tierOf(b)">
              <text class="badge-emoji">{{ b.unlocked ? badgeEmoji(b) : "🔒" }}</text>
            </view>
            <text class="badge-name">{{ b.name }}</text>
            <text class="badge-tier">{{ b.unlocked ? "已解锁" : "未解锁" }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 日历查看弹层 -->
    <view v-if="showCalSheet" class="sheet-overlay" @click="showCalSheet = false">
      <view class="sheet" @click.stop>
        <view class="cal-head">
          <text class="sheet-title">查看限额状态</text>
          <view class="cal-tabs">
            <text
              v-for="t in ['day', 'month', 'year']"
              :key="t"
              class="cal-tab"
              :class="{ active: calView === t }"
              @click="calView = t"
              >{{ t === "day" ? "日" : t === "month" ? "月" : "年" }}</text
            >
          </view>
        </view>
        <calendar-period-picker
          :dim="calView"
          :model-value="calKey"
          @change="onCalPick"
        />
      </view>
    </view>

    <!-- 设置目标弹窗 -->
    <view v-if="showTargetSheet" class="sheet-overlay" @click="showTargetSheet = false">
      <view class="sheet" @click.stop>
        <text class="sheet-title">{{
          targetType === "monthly" ? "设置月度挑战目标" : "设置年度挑战目标"
        }}</text>
        <text class="sheet-sub">周期内总消费不超过该金额即达标</text>
        <number-field
          class="sheet-input"
          :model-value="targetAmountYuan"
          placeholder="目标金额（元）"
          title="挑战目标金额"
          :decimal-places="2"
          :max-integer="9"
          @update:model-value="(v) => (targetAmountYuan = v)"
        />
        <text class="sheet-label">绑定账本（可选，仅统计该账本消费）</text>
        <picker
          class="sheet-picker"
          :range="ledgerOptions"
          range-key="label"
          @change="onLedgerPick"
        >
          <view class="sheet-picker-text">{{ ledgerLabel }}</view>
        </picker>
        <view class="sheet-actions">
          <view class="sheet-btn ghost" @click="showTargetSheet = false">取消</view>
          <view class="sheet-btn" @click="confirmTarget">保存</view>
        </view>
      </view>
    </view>

    <!-- 分享海报弹层 -->
    <view v-if="showPoster" class="sheet-overlay" @click="showPoster = false">
      <view class="poster-sheet" @click.stop>
        <view class="poster-card">
          <text class="poster-emoji">{{ posterAch ? badgeEmoji(posterAch) : "🏆" }}</text>
          <text class="poster-name">{{ posterAch ? posterAch.name : "" }}</text>
          <text class="poster-desc">{{
            posterAch ? posterAch.description || "" : ""
          }}</text>
          <view class="poster-streak"
            ><text>🔥 连续挑战 {{ streakDays }} 天</text></view
          >
          <text class="poster-brand">余钱罐 · 把省下的钱攒成惊喜</text>
        </view>
        <view class="sheet-actions">
          <view class="sheet-btn ghost" @click="showPoster = false">关闭</view>
          <view class="sheet-btn" @click="savePoster">保存海报</view>
        </view>
      </view>
    </view>

    <canvas
      canvas-id="posterCanvas"
      :style="{
        position: 'fixed',
        left: '-9999px',
        top: '0',
        width: '300px',
        height: '420px',
      }"
    />

    <!-- TabBar -->
    <TabBar :current="3" />

    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import TabBar from "@/components/tabbar/tabbar.vue";
import RingProgress from "@/components/ring-progress/ring-progress.vue";
import CalendarPeriodPicker from "@/components/calendar-period-picker/calendar-period-picker.vue";
import { useUserStore } from "@/stores/user.js";
import { listLedgers } from "@/api/sparejar.js";
import { formatFen, yuanToFen } from "@/utils/money.js";
import { formatMonthKey, formatYearKey } from "@/utils/date.js";

const store = useUserStore();
const toast = (title, icon = "none") => uni.showToast({ title, icon });

// 动态计算顶栏上边距，避开微信状态栏 + 右上角胶囊按钮（全机型适配）
// 注意：该值为系统 px（来自 getWindowInfo），不可转 rpx，直接注入 style
const topbarPad = ref(88);
function calcTopbarPad() {
  try {
    const win = (uni.getWindowInfo && uni.getWindowInfo()) || uni.getSystemInfoSync();
    const statusBar = win.statusBarHeight || 20;
    const rect = uni.getMenuButtonBoundingClientRect();
    // 导航栏高度 = 胶囊上下间距对称 ⇒ (胶囊.top - 状态栏高) * 2 + 胶囊高
    const navBar = rect && rect.height ? (rect.top - statusBar) * 2 + rect.height : 44;
    topbarPad.value = Math.ceil(statusBar + navBar); // 6px 为与胶囊的额外间距
  } catch (e) {
    topbarPad.value = 76;
  }
}

const summary = computed(() => store.state.challenges);
// 首次加载态：避免数据未回来时柱状图区域一片空白（像"没展示"）
const initialLoading = ref(true);
const achievementsList = computed(() => store.state.achievements || []);
const streakDays = computed(() => store.currentStreak.value);

const dailyChallenge = computed(() => {
  // 与首页限额同源：直接读今日 daily_settlements（store.state.dashboard.settlement）
  const set = store.state.dashboard.settlement;
  const consumed = set ? set.consumed || 0 : 0;
  // 限额口径：含待滚入结余的总日限额（totalDailyLimitFen），与首页完全一致
  const limit = store.totalDailyLimitFen.value || store.dailyLimitFen.value || 0;
  const success = limit > 0 ? consumed <= limit : false;
  const remain = Math.max(0, limit - consumed);
  return {
    consumed,
    limit,
    success,
    has: limit > 0,
    spentYuan: (consumed / 100).toFixed(2),
    limitYuan: (limit / 100).toFixed(2),
    remainYuan: (remain / 100).toFixed(2),
    pct: limit > 0 ? consumed / limit : 0,
  };
});

// 由 实际支出/限额/是否达标 计算状态：
// none 无数据 | ok 未超出(达标) | warn 超出不多(黄) | over 超出太多(红)
// 超出比例 = spent/limit - 1；≤ WARN_RATIO 视为 warn，超过为 over
const WARN_RATIO = 0.2;
function calcStatus(spent, limit, isSuccess) {
  if (!limit || limit <= 0) return "none";
  if (isSuccess) return "ok";
  const overRatio = spent / limit - 1;
  return overRatio <= WARN_RATIO ? "warn" : "over";
}

// 近7日数据源：优先用云函数返回的 history7；
// 今天日期 key（YYYY-MM-DD），用于标记当天柱子
const todayKey = (() => {
  const pad2 = (n) => (n < 10 ? `0${n}` : String(n));
  const n = new Date();
  return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`;
})();
const history7 = computed(() => {
  // 直接渲染后端返回的 history7（后端已按「本周一~周日」对齐生成，无需前端重建骨架）
  const raw = summary.value ? summary.value.history7 || [] : [];
  const out = raw.map((d) => ({
    date: (d.date_key || "").slice(5),
    dateKey: d.date_key,
    spent: d.consumed || 0,
    limit: d.base_limit || 0,
    fixedLimit: d.fixed_limit || 0,
    rolloverLimit: d.rollover_limit || 0,
    surplus: d.surplus || 0,
    overAmount: d.over_amount || 0,
    success: !!d.is_success,
    status: calcStatus(d.consumed || 0, d.base_limit || 0, !!d.is_success),
  }));
  console.log(
    "[challenge] summary.value =>",
    JSON.stringify(
      summary.value && {
        keys: Object.keys(summary.value),
        history7Len: (summary.value.history7 || []).length,
      }
    )
  );
  console.log(
    "[challenge] history7 computed =>",
    JSON.stringify(
      out.map((h) => ({
        dateKey: h.dateKey,
        limit: h.limit,
        spent: h.spent,
        status: h.status,
      }))
    )
  );
  return out;
});

// ── 日历查看模式：近7日 / 指定日 / 指定月 / 指定年 ──
const calDim = ref("week"); // 'week' | 'day' | 'month' | 'year'
const calKey = ref(""); // 选中 key（day→YYYY-MM-DD 等）
const calLoading = ref(false);
const calData = ref(null); // 接口返回的 day/month/year 数据

// 点击柱子弹出的限额说明气泡
const showDayTip = ref(false);
const dayTip = ref(null); // { date, label, statusText, spent, limit, isToday }
function onBarTap(d) {
  // 再次点击同一柱子则关闭
  if (showDayTip.value && dayTip.value && dayTip.value.label === d.dateKey) {
    showDayTip.value = false;
    return;
  }
  const isToday = d.dateKey === todayKey;
  // 所有天统一用后端返回的含滚入口径（daily_settlements.available_start）
  const limit = d.limit;
  const statusMap = { ok: "未超额", warn: "超额", over: "严重超额", none: "未消费" };
  dayTip.value = {
    label: d.dateKey,
    statusText: statusMap[d.status] || "未消费",
    spent: d.spent || 0,
    limit,
    fixedLimit: d.fixedLimit || 0,
    rolloverLimit: d.rolloverLimit || 0,
    surplus: d.surplus || 0,
    overAmount: d.overAmount || 0,
    isToday,
  };
  showDayTip.value = true;
}
function closeDayTip() {
  showDayTip.value = false;
}
// 气泡展示用的格式化文本
const dayTipSpent = computed(() => (dayTip.value ? formatFen(dayTip.value.spent) : "0"));
const dayTipLimit = computed(() => (dayTip.value ? formatFen(dayTip.value.limit) : "0"));
const dayTipFixed = computed(() => formatFen(dayTip.value ? dayTip.value.fixedLimit : 0));
const dayTipRoll = computed(() =>
  formatFen(dayTip.value ? dayTip.value.rolloverLimit : 0)
);
const dayTipSurplus = computed(() => formatFen(dayTip.value ? dayTip.value.surplus : 0));
const dayTipOver = computed(() => formatFen(dayTip.value ? dayTip.value.overAmount : 0));

// 柱状图数据源：默认近7日；日历选规格时取接口数据
const heatData = computed(() => {
  if (calDim.value === "week") return history7.value;
  if (!calData.value) return [];
  if (calDim.value === "day") {
    const d = calData.value;
    return [
      {
        date: d.date_key ? d.date_key.slice(5) : "",
        dateKey: d.date_key,
        spent: d.spent || 0,
        limit: d.limit || 0,
        success: !!d.is_success,
        status: calcStatus(d.spent || 0, d.limit || 0, !!d.is_success),
      },
    ];
  }
  if (calDim.value === "month") {
    return (calData.value.days || []).map((d) => ({
      date: d.date_key ? d.date_key.slice(5) : "",
      dateKey: d.date_key,
      spent: d.spent || 0,
      limit: d.limit || 0,
      success: !!d.is_success,
      status: calcStatus(d.spent || 0, d.limit || 0, !!d.is_success),
    }));
  }
  // year：以每月汇总作为柱子
  return (calData.value.months || []).map((m) => ({
    date: m.month_key ? m.month_key.slice(5) + "月" : "",
    dateKey: m.month_key,
    spent: m.spent || 0,
    limit: m.limit || 0,
    success: !!m.is_success,
    status: calcStatus(m.spent || 0, m.limit || 0, !!m.is_success),
  }));
});

// 日历弹层
const showCalSheet = ref(false);
const calView = ref("day"); // 日历内部视图 day/month/year

function openCalSheet() {
  // 打开时默认用当前选中的规格初始化
  calView.value = calDim.value === "week" ? "day" : calDim.value;
  showCalSheet.value = true;
}

function onCalPick(key) {
  calKey.value = key;
  calDim.value = calView.value;
  showCalSheet.value = false;
  loadByCalendar();
}

async function loadByCalendar() {
  if (calDim.value === "week") return;
  calLoading.value = true;
  try {
    calData.value = await store.loadLimitStatus(calDim.value, calKey.value);
  } catch (e) {
    calData.value = null;
    uni.showToast({ title: "加载失败", icon: "none" });
  } finally {
    calLoading.value = false;
  }
}

function resetToWeek() {
  calDim.value = "week";
  calKey.value = "";
  calData.value = null;
}

// 年度挑战：已过去的月数（含当月），用于时间进度双轨
function yearMonthsGone(yc) {
  const now = new Date();
  const curY = now.getFullYear();
  const y = yc && yc.period_key ? Number(String(yc.period_key).slice(0, 4)) : curY;
  if (y !== curY) return y < curY ? 12 : 0;
  return now.getMonth() + 1;
}
function yearMonthPct(yc) {
  return Math.round((yearMonthsGone(yc) / 12) * 100);
}
// 进度正常：支出进度未明显超前于时间进度
function yearTrack(yc) {
  const spentPct = Math.min(yc.consumed_amount / Math.max(1, yc.target_amount), 1);
  return spentPct <= yearMonthsGone(yc) / 12 + 0.05;
}

// 当前规格的标题
const calLabel = computed(() => {
  if (calDim.value === "day") return calKey.value || "当日";
  if (calDim.value === "month") return calKey.value || "当月";
  if (calDim.value === "year") return calKey.value || "当年";
  return "近7日";
});
const monthlyChallenges = computed(() =>
  summary.value ? summary.value.monthly || [] : []
);
const yearlyChallenges = computed(() =>
  summary.value ? summary.value.yearly || [] : []
);
// 年度挑战区间文本：读接口返回的 limit_start/limit_end（如 2026-07 ~ 2026-08 → 07月 ~ 08月）
const yearRangeText = computed(() => {
  const yc = yearlyChallenges.value[0];
  if (!yc) return "";
  const fmt = (k) => (k && k.length >= 7 ? `${k.slice(5, 7)}月` : "");
  const start = fmt(yc.limit_start);
  const end = fmt(yc.limit_end);
  if (start && end) return `${start} ~ ${end}`;
  if (start) return start;
  return "全年";
});
// 当年卡片内嵌套展示的「当前月」挑战（取最新一条月记录）
const currentMonth = computed(() =>
  monthlyChallenges.value && monthlyChallenges.value.length
    ? monthlyChallenges.value[0]
    : null
);
// 当月挑战区间文本：读接口返回的 limit_start/limit_end（如 2026-07-21 ~ 2026-07-31）
const monthRangeText = computed(() => {
  const m = currentMonth.value;
  if (!m) return "";
  if (m.limit_start && m.limit_end) return `${m.limit_start} ~ ${m.limit_end}`;
  if (m.period_key) return `${m.period_key}-01 ~ ${m.period_key}-31`;
  return "";
});

const badgeEmoji = (b) => {
  if (b.code === "streak_7" || b.code === "streak_30") return "🔥";
  if (b.code === "first_record") return "📝";
  if (b.code === "first_wish") return "💡";
  if (b.code === "limit_set") return "🎯";
  if (b.code === "monthly_success") return "📆";
  const map = { streak: "🔥", record: "✨", limit: "🎯", challenge: "🏆", custom: "⭐" };
  return map[b.condition_type] || "🏅";
};
const tierOf = (b) => {
  if (b.unlock_skin_id === "celadon_jar") return "diamond";
  if (b.unlock_skin_id === "warm_gold") return "gold";
  return b.unlocked ? "silver" : "bronze";
};

// 设置目标
const showTargetSheet = ref(false);
const targetType = ref("monthly");
const targetAmountYuan = ref("");
const targetLedgerId = ref("");
const ledgers = ref([]);
const ledgerOptions = computed(() =>
  [{ id: "", label: "全部账本（默认）" }].concat(
    ledgers.value.map((l) => ({ id: l._id, label: l.name }))
  )
);
const ledgerLabel = computed(() => {
  const f = ledgerOptions.value.find((o) => o.id === targetLedgerId.value);
  return f ? f.label : "全部账本（默认）";
});
const onLedgerPick = (e) => {
  targetLedgerId.value = ledgerOptions.value[e.detail.value].id;
};

async function loadLedgers() {
  try {
    // 走云函数读取，禁止前端直连数据库
    ledgers.value = await listLedgers();
  } catch (err) {
    ledgers.value = [];
  }
}
// 点击年度卡片：下钻查看全年 12 个月（Phase 3）
function onYearTap(yc) {
  const key = yc && yc.period_key ? yc.period_key : formatYearKey();
  uni.navigateTo({ url: `/pages/challenge/drill?type=year&key=${key}` });
}
function openTargetSheet(type) {
  targetType.value = type;
  targetAmountYuan.value = "";
  targetLedgerId.value = "";
  loadLedgers();
  showTargetSheet.value = true;
}
async function confirmTarget() {
  const fen = yuanToFen(targetAmountYuan.value);
  if (!fen.ok) {
    toast(fen.error && fen.error.message ? fen.error.message : "请输入有效金额");
    return;
  }
  const periodKey = targetType.value === "monthly" ? formatMonthKey() : formatYearKey();
  try {
    await store.setChallengeTargetAction(
      targetType.value,
      periodKey,
      fen.value,
      targetLedgerId.value || undefined
    );
    showTargetSheet.value = false;
    toast("目标已设置", "success");
  } catch (err) {
    toast(err && err.message ? err.message : "设置失败");
  }
}

// 分享海报
const showPoster = ref(false);
const posterAch = ref(null);
function openPoster(b) {
  if (!b.unlocked) return;
  posterAch.value = b;
  showPoster.value = true;
}
function savePoster() {
  const a = posterAch.value;
  if (!a) return;
  const ctx = uni.createCanvasContext("posterCanvas");
  ctx.setFillStyle("#0f1c14");
  ctx.fillRect(0, 0, 300, 420);
  ctx.setFillStyle("#25cc5d");
  ctx.setFontSize(22);
  ctx.fillText("余钱罐 · 成就解锁", 24, 56);
  ctx.setFillStyle("#ffffff");
  ctx.setFontSize(38);
  ctx.fillText(a.name, 24, 130);
  ctx.setFillStyle("#9bb8a8");
  ctx.setFontSize(14);
  ctx.fillText(a.description || "", 24, 170);
  ctx.setFillStyle("#ffd866");
  ctx.setFontSize(20);
  ctx.fillText("连续挑战 " + streakDays.value + " 天", 24, 250);
  ctx.setFillStyle("#9bb8a8");
  ctx.setFontSize(13);
  ctx.fillText("把省下的钱攒成惊喜", 24, 392);
  ctx.draw(false, () => {
    uni.canvasToTempFilePath({
      canvasId: "posterCanvas",
      success: (res) => {
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => toast("已保存到相册", "success"),
          fail: () => toast("保存失败，请授权相册"),
        });
      },
      fail: () => toast("生成海报失败"),
    });
  });
}

async function refresh() {
  try {
    // 进入挑战页即同步当前年月/年挑战目标上限（保证月卡/年卡有真实数值，不阻塞主流程）
    store
      .syncPeriodTargetsAction()
      .catch((e) => console.error("[challenge] syncPeriodTargets failed", e));
    await Promise.all([
      store.loadChallengeSummary(),
      store.loadStreak && store.loadStreak(),
      store.evaluateAchievementsAction(),
      store.loadAchievements(),
    ]);
  } catch (e) {
    console.error("[challenge] refresh failed", e);
  } finally {
    initialLoading.value = false;
  }
}

onMounted(() => {
  calcTopbarPad();
  refresh();
});
onShow(refresh);
</script>

<style scoped lang="scss">
.challenge-page {
  @include sj-theme-css-vars;
  width: 750rpx;
  height: 100vh;
  overflow: hidden;
  position: relative;
  margin: 0 auto;
  background: var(--g0);
  display: flex;
  flex-direction: column;
}

/* ── 极光背景（液态毛玻璃升级版） ── */
.aurora-bg-base {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    165deg,
    var(--g0) 0%,
    var(--g2) 38%,
    #ebfded55 70%,
    var(--g0) 100%
  );
}
.ch-aurora-1 {
  position: absolute;
  top: -160rpx;
  left: -120rpx;
  width: 840rpx;
  height: 640rpx;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at 40% 50%,
    #acf5b766 0%,
    #ebfded33 55%,
    transparent 78%
  );
  filter: blur(56rpx);
  animation: challengeAurora1 24s ease-in-out infinite;
}
.ch-aurora-2 {
  position: absolute;
  top: 560rpx;
  right: -160rpx;
  width: 700rpx;
  height: 560rpx;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at 60% 40%,
    #8ae99b44 0%,
    #acf5b722 55%,
    transparent 78%
  );
  filter: blur(64rpx);
  animation: challengeAurora2 31s ease-in-out infinite;
}
.ch-aurora-3 {
  position: absolute;
  bottom: 240rpx;
  left: -80rpx;
  width: 600rpx;
  height: 480rpx;
  border-radius: 50%;
  background: radial-gradient(ellipse at 50% 50%, #ebfded55 0%, transparent 70%);
  filter: blur(48rpx);
  animation: challengeAurora3 19s ease-in-out infinite;
}
.ch-blob-1 {
  position: absolute;
  top: 120rpx;
  right: 60rpx;
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  background: radial-gradient(circle, #8ae99b66, transparent 70%);
  filter: blur(36rpx);
  animation: chBlob1 13s ease-in-out infinite;
}
.ch-blob-2 {
  position: absolute;
  bottom: 400rpx;
  left: 40rpx;
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: radial-gradient(circle, #acf5b755, transparent 70%);
  filter: blur(28rpx);
  animation: chBlob2 17s ease-in-out infinite;
}

/* ── 不规则变形装饰形状 ── */
.morph-blob {
  position: absolute;
  top: -60rpx;
  right: -48rpx;
  width: 280rpx;
  height: 280rpx;
  background: linear-gradient(135deg, #8ae99b33, #ebfded44);
  z-index: 0;
  pointer-events: none;
  animation: morphBlob 8s ease-in-out infinite;
}
.morph-blob2 {
  position: absolute;
  top: 640rpx;
  left: -80rpx;
  width: 220rpx;
  height: 220rpx;
  background: linear-gradient(135deg, #acf5b722, #8ae99b33);
  z-index: 0;
  pointer-events: none;
  animation: morphBlob2 11s ease-in-out infinite;
}

/* ── Glass 卡片通用 ── */
.ch-glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(40rpx) saturate(1.5);
  -webkit-backdrop-filter: blur(40rpx) saturate(1.5);
  border: 2rpx solid rgba(255, 255, 255, 0.86);
  border-radius: 48rpx;
  box-shadow: 0 12rpx 64rpx rgba(37, 204, 93, 0.08), 0 2rpx 8rpx rgba(15, 28, 20, 0.05);
}
.ch-glass-dark {
  background: rgba(15, 28, 20, 0.72);
  backdrop-filter: blur(44rpx) saturate(1.4);
  -webkit-backdrop-filter: blur(44rpx) saturate(1.4);
  border: 2rpx solid rgba(79, 217, 116, 0.2);
  border-radius: 48rpx;
}
.ch-pill-nav {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(56rpx) saturate(1.6);
  -webkit-backdrop-filter: blur(56rpx) saturate(1.6);
  border: 2rpx solid rgba(255, 255, 255, 0.97);
  box-shadow: 0 12rpx 56rpx rgba(37, 204, 93, 0.12), 0 4rpx 20rpx rgba(0, 0, 0, 0.07),
    inset 0 3rpx 0 rgba(255, 255, 255, 0.95);
}
.morph-blob {
  animation: morphBlob 8s ease-in-out infinite;
}
.morph-blob2 {
  animation: morphBlob2 11s ease-in-out infinite;
}
.ch-float {
  animation: chFloat 5s ease-in-out infinite;
}
.num-in {
  animation: numIn 0.55s cubic-bezier(0.34, 1.4, 0.64, 1) forwards;
}
.progress-fill {
  animation: progressFill 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.ring-glow {
  animation: ringGlow 2.4s ease-in-out infinite;
}
.streak-pop {
  animation: streakPop 0.6s cubic-bezier(0.34, 1.5, 0.64, 1) forwards;
}
.spin-slow {
  animation: spin360 12s linear infinite;
}
.card-slide-1 {
  padding: 36rpx 32rpx 0;
  animation: cardSlideUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both;
}
.card-slide-2 {
  animation: cardSlideUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.14s both;
}
.card-slide-3 {
  animation: cardSlideUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.23s both;
}
.card-slide-4 {
  animation: cardSlideUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.32s both;
}
.card-slide-5 {
  animation: cardSlideUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.41s both;
}
.topbar {
  position: relative;
  z-index: 3;
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24rpx;
  padding: 0 32rpx 16rpx 32rpx;
}
.topbar-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.page-scroll {
  flex: 1;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
}
.topbar-sub {
  font-size: 22rpx;
  color: var(--ink4);
  display: block;
  margin-bottom: 4rpx;
}
.topbar-title {
  font-size: 40rpx;
  font-weight: 900;
  color: var(--ink);
}
.streak-badge {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
  box-shadow: 0 8rpx 28rpx rgba(37, 204, 93, 0.3);
}

/* ── 每日挑战卡片 ── */
.daily-card {
  position: relative;
  overflow: hidden;
  margin: 32rpx 0rpx;
  padding: 44rpx 40rpx 36rpx;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.82),
    rgba(225, 250, 230, 0.75)
  );
}
.daily-deco {
  position: absolute;
  top: -56rpx;
  right: -56rpx;
  width: 220rpx;
  height: 220rpx;
  border-radius: 50%;
  background: radial-gradient(circle, #8ae99b22, transparent 70%);
  pointer-events: none;
}
.daily-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.daily-left {
  flex: 1;
  min-width: 0;
}
.daily-status {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.status-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}
.status-dot.ok {
  background: var(--g5);
  box-shadow: 0 0 16rpx #8ae99b99;
}
.status-dot.pending {
  background: var(--y5);
  box-shadow: 0 0 16rpx rgba(245, 158, 11, 0.6);
}
.daily-status-text {
  font-size: 22rpx;
  font-weight: 700;
}
.daily-status-text.ok {
  color: var(--g5);
}
.daily-status-text.pending {
  color: var(--y5);
}
.daily-sub-label {
  font-size: 22rpx;
  color: var(--ink4);
  margin-bottom: 4rpx;
}
.daily-amount {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
}
.daily-yen {
  font-size: 22rpx;
  color: var(--ink3);
  font-weight: 500;
}
.daily-num {
  font-size: 76rpx;
  font-weight: 900;
  color: var(--ink);
  letter-spacing: -3rpx;
}
.daily-meta {
  display: flex;
  align-items: flex-end;
  gap: 8rpx;
  margin-top: 8rpx;
  flex-wrap: wrap;
}
.daily-meta-label {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--ink4);
}
.daily-meta-limit {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ink2);
}
.daily-meta-diff {
  font-size: 22rpx;
  font-weight: 600;
  margin-left: 8rpx;
}
.daily-meta-diff.ok {
  color: var(--g5);
}
.daily-meta-diff.pending {
  color: var(--y5);
}

/* 环形进度（slot 内容：见 RingProgress 组件） */
.ring-pct {
  font-size: 36rpx;
  font-weight: 900;
  color: var(--ink);
  letter-spacing: -1rpx;
}
.ring-pct.over {
  color: var(--red-soft);
}
.ring-pct-label {
  font-size: 18rpx;
  color: var(--ink4);
  margin-top: 2rpx;
}

/* 线形进度条 */
.daily-track {
  margin-top: 32rpx;
  height: 12rpx;
  border-radius: 12rpx;
  background: rgba(15, 28, 20, 0.07);
  overflow: hidden;
}
.daily-track-fill {
  height: 100%;
  border-radius: 12rpx;
  transition: width 1.2s cubic-bezier(0.22, 1, 0.36, 1);
}

/* 近7日 / 日历规格 柱状热力图 */
.week-row {
  margin-top: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.week-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.week-label {
  font-size: 20rpx;
  font-weight: 700;
  color: var(--ink2);
}
.week-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.week-cal-btn {
  font-size: 20rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--g4), var(--g5));
  padding: 6rpx 18rpx;
  border-radius: 30rpx;
}
.week-reset {
  font-size: 20rpx;
  color: var(--g5);
  font-weight: 600;
}
.week-loading {
  font-size: 22rpx;
  color: var(--ink4);
  padding: 20rpx 0;
  text-align: center;
}
.week-bars {
  display: flex;
  align-items: flex-end;
  gap: 4rpx;
}
.week-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  min-width: 0;
}
/* 三态：ok 达标绿 / warn 超出不多黄 / over 超出太多红 / none 无数据灰
   柱体固定高 28px，内部填充高度随比例变化（贴合原版规格） */
.week-bar {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12rpx;
  background: rgba(15, 28, 20, 0.06);
  position: relative;
  overflow: hidden;
}
.week-bar.st-ok {
  background: linear-gradient(180deg, var(--g3), var(--g5));
  box-shadow: 0 2px 8px #8ae99b44;
}
.week-bar.st-warn {
  background: linear-gradient(180deg, #ffd98a, var(--y5));
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.35);
}
.week-bar.st-over {
  background: linear-gradient(180deg, #ffb4a8, var(--red-soft));
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35);
}
.week-bar.st-none {
  background: rgba(15, 28, 20, 0.06);
}
.week-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-radius: 0 0 12rpx 12rpx;
  background: rgba(15, 28, 20, 0.1);
  overflow: hidden;
}
/* 玻璃质感：顶部一道白色高光，模拟玻璃反射 */
.week-fill::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 38%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0));
  pointer-events: none;
}
.week-fill.st-ok {
  background: linear-gradient(
    180deg,
    rgba(138, 233, 155, 0.55) 0%,
    rgba(138, 233, 155, 0.8) 30%,
    var(--g5) 100%
  );
}
.week-fill.st-warn {
  background: linear-gradient(
    180deg,
    rgba(255, 207, 110, 0.55) 0%,
    rgba(255, 207, 110, 0.82) 30%,
    var(--y5) 100%
  );
}
.week-fill.st-over {
  background: linear-gradient(
    180deg,
    rgba(255, 154, 138, 0.55) 0%,
    rgba(255, 154, 138, 0.82) 30%,
    var(--red-soft) 100%
  );
}
.week-fill.st-none {
  background: linear-gradient(
    180deg,
    rgba(190, 198, 194, 0.18) 0%,
    rgba(170, 180, 175, 0.28) 30%,
    rgba(150, 160, 155, 0.32) 100%
  );
}
/* 当天柱子：仅文字高亮，柱体不加放大/边框 */
.week-bar.is-today {
  z-index: 2;
}
.week-check {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20rpx;
  opacity: 0.85;
  z-index: 1;
}
.week-date {
  font-size: 16rpx;
  color: var(--ink4);
  white-space: nowrap;
}
.week-date.is-today {
  color: var(--g5);
  font-weight: 800;
}

/* 点击柱子的限额说明气泡（无遮罩，直接内嵌显示） */
.day-tip {
  position: relative;
  margin-top: 16rpx;
  padding: 22rpx 28rpx;
  border-radius: 22rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 280rpx;
  max-width: 520rpx;
  align-self: stretch;
  background: rgba(245, 255, 247, 0.96);
  border: 2rpx solid rgba(140, 233, 155, 0.7);
  box-shadow: 0 0 20rpx rgba(140, 233, 155, 0.4);
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  animation: tip-pop-kf 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.day-tip-close {
  position: absolute;
  top: 10rpx;
  right: 18rpx;
  font-size: 34rpx;
  line-height: 1;
  color: var(--ink4);
  font-weight: 700;
}
.day-tip-date {
  font-size: 26rpx;
  font-weight: 800;
  color: var(--ink);
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
  color: var(--g7);
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
@keyframes tip-pop-kf {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 日历弹层 */
.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.cal-tabs {
  display: flex;
  background: var(--g0);
  border-radius: 30rpx;
  padding: 4rpx;
}
.cal-tab {
  font-size: 22rpx;
  color: var(--ink3);
  padding: 8rpx 24rpx;
  border-radius: 26rpx;
  font-weight: 600;
}
.cal-tab.active {
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
}

.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink);
}
.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.add-target {
  font-size: 24rpx;
  color: var(--g5);
  font-weight: 700;
}

/* ── 月度挑战卡片（浅色玻璃） ── */
.challenge-card {
  border-radius: 24rpx;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.66);
  border: 2rpx solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 6rpx 28rpx rgba(37, 204, 93, 0.06);
}
.ch-card-inner {
  position: relative;
  display: flex;
  min-height: 150rpx;
}
/* 左侧状态色带 */
.ch-card-stripe {
  width: 8rpx;
  flex-shrink: 0;
  border-radius: 24rpx 0 0 24rpx;
}
.ch-card-stripe.ok {
  background: linear-gradient(180deg, var(--g4), var(--g5));
}
.ch-card-stripe.fail {
  background: linear-gradient(180deg, var(--y5), var(--red-soft));
}
.ch-card-stripe.pending {
  background: linear-gradient(180deg, var(--g3), var(--g4));
}
.ch-card-body {
  flex: 1;
  padding: 22rpx 24rpx 20rpx 26rpx;
}
.ch-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
}
.ch-card-title-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.ch-card-title {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--ink);
}
.ch-card-chevron {
  font-size: 36rpx;
  color: var(--ink4);
  font-weight: 300;
  line-height: 1;
}
.ch-badge {
  font-size: 18rpx;
  font-weight: 700;
  padding: 3rpx 14rpx;
  border-radius: 20rpx;
}
.ch-badge.ok {
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
}
.ch-badge.fail {
  background: rgba(245, 158, 11, 0.15);
  color: var(--y5);
}
.ch-badge.pending {
  background: var(--g1);
  color: var(--g5);
}
.ch-count {
  font-size: 22rpx;
  color: var(--ink4);
  font-weight: 600;
}
.ch-empty-dark {
  background: rgba(15, 28, 20, 0.55);
  border: 2rpx solid rgba(79, 217, 116, 0.18);
  color: rgba(255, 255, 255, 0.6);
  border-radius: 20rpx;
  padding: 28rpx;
  text-align: center;
  font-size: 24rpx;
}
.ch-card-nums {
  display: flex;
  align-items: flex-end;
  gap: 22rpx;
  margin-bottom: 16rpx;
}
.ch-num-block {
  display: flex;
  flex-direction: column;
}
.ch-num-label {
  font-size: 18rpx;
  color: var(--ink4);
  margin-bottom: 3rpx;
}
.ch-num-val {
  font-size: 30rpx;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.5rpx;
}
.ch-num-val.sub {
  color: var(--ink2);
}
.ch-num-val.ok {
  color: var(--g5);
}
.ch-num-val.over {
  color: var(--red-soft);
}
.ch-num-divider {
  width: 2rpx;
  height: 44rpx;
  background: rgba(15, 28, 20, 0.07);
  align-self: flex-end;
  margin-bottom: 4rpx;
}
.ch-card-track {
  height: 10rpx;
  border-radius: 10rpx;
  background: rgba(15, 28, 20, 0.07);
  overflow: hidden;
}
.ch-card-fill {
  height: 100%;
  border-radius: 10rpx;
}
.ch-card-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 8rpx;
}
.ch-card-range {
  font-size: 18rpx;
  color: var(--ink4);
}
.ch-card-pct {
  font-size: 20rpx;
  font-weight: 600;
  color: var(--ink3);
}
.ch-card-pct.over {
  color: var(--red-soft);
}
.ch-card-hint {
  margin-top: 12rpx;
  padding: 8rpx 14rpx;
  border-radius: 12rpx;
  background: rgba(79, 217, 116, 0.1);
  border: 1rpx dashed rgba(79, 217, 116, 0.35);
  font-size: 18rpx;
  color: var(--g5);
  line-height: 1.4;
}

/* 年卡内嵌「当月」卡片 */
.ch-month-nested {
  margin-top: 22rpx;
  padding-top: 22rpx;
  border-top: 2rpx dashed rgba(79, 217, 116, 0.25);
}
.ch-month-nested-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14rpx;
}
.ch-month-nested-label {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--ink2);
}
.ch-month-nested-go {
  font-size: 18rpx;
  color: var(--g5);
}
.ch-month-card {
  margin-top: 0;
}

/* ── 年度挑战卡片（采用月度卡片样式，见上方 .challenge-card 系列） ── */

.badge-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
  margin-top: 28rpx;
}
.badge-item {
  width: calc(33.33% - 16rpx);
  text-align: center;
  opacity: 0.5;
}
.badge-item.unlocked {
  opacity: 1;
}
.badge-icon-box {
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
  margin: 0 auto 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.badge-icon-box.bronze {
  background: linear-gradient(135deg, #f5e6cc, #e8c97a);
}
.badge-icon-box.silver {
  background: linear-gradient(135deg, #e8e8e8, #c0c0c0);
}
.badge-icon-box.gold {
  background: linear-gradient(135deg, #ffe999, #f5c842);
}
.badge-icon-box.diamond {
  background: linear-gradient(135deg, #e8d4ff, #b38dff);
}
.badge-emoji {
  font-size: 48rpx;
}
.badge-name {
  font-size: 20rpx;
  font-weight: 600;
  color: var(--ink2);
  display: block;
}
.badge-tier {
  font-size: 16rpx;
  color: var(--ink4);
}

.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 28, 20, 0.45);
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
  padding: 44rpx 40rpx calc(44rpx + env(safe-area-inset-bottom));
}
.sheet-title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--ink);
  display: block;
}
.sheet-sub {
  font-size: 22rpx;
  color: var(--ink4);
  display: block;
  margin: 8rpx 0 28rpx;
}
.sheet-input {
  height: 88rpx;
  border-radius: 24rpx;
  background: var(--g0);
  padding: 0 28rpx;
  font-size: 30rpx;
  margin-bottom: 28rpx;
}
.sheet-label {
  font-size: 22rpx;
  color: var(--ink3);
  display: block;
  margin-bottom: 12rpx;
}
.sheet-picker {
  height: 88rpx;
  border-radius: 24rpx;
  background: var(--g0);
  display: flex;
  align-items: center;
  padding: 0 28rpx;
  margin-bottom: 32rpx;
}
.sheet-picker-text {
  font-size: 28rpx;
  color: var(--ink2);
}
.sheet-actions {
  display: flex;
  gap: 24rpx;
}
.sheet-btn {
  flex: 1;
  height: 92rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-btn.ghost {
  background: var(--g0);
  color: var(--ink2);
}

.poster-sheet {
  width: 100%;
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
  padding: 44rpx 40rpx calc(44rpx + env(safe-area-inset-bottom));
}
.poster-card {
  background: linear-gradient(160deg, var(--ink), #1f3a2a);
  border-radius: 36rpx;
  padding: 56rpx 40rpx;
  text-align: center;
  margin-bottom: 32rpx;
}
.poster-emoji {
  font-size: 112rpx;
  display: block;
}
.poster-name {
  font-size: 44rpx;
  font-weight: 900;
  color: #fff;
  display: block;
  margin: 20rpx 0 12rpx;
}
.poster-desc {
  font-size: 24rpx;
  color: var(--ink4);
  display: block;
  margin-bottom: 32rpx;
}
.poster-streak {
  display: inline-block;
  padding: 12rpx 28rpx;
  border-radius: 40rpx;
  background: rgba(255, 216, 102, 0.15);
  color: var(--y4);
  font-size: 26rpx;
  font-weight: 700;
}
.poster-brand {
  font-size: 22rpx;
  color: var(--ink3);
  display: block;
  margin-top: 32rpx;
}

/* ── 动画 keyframes ── */
@keyframes challengeAurora1 {
  0% {
    transform: translateX(0) translateY(0) rotate(-15deg) scale(1);
    opacity: 0.55;
  }
  35% {
    transform: translateX(-44rpx) translateY(28rpx) rotate(-10deg) scale(1.06);
    opacity: 0.7;
  }
  68% {
    transform: translateX(-70rpx) translateY(-16rpx) rotate(-18deg) scale(0.94);
    opacity: 0.48;
  }
  100% {
    transform: translateX(0) translateY(0) rotate(-15deg) scale(1);
    opacity: 0.55;
  }
}
@keyframes challengeAurora2 {
  0% {
    transform: translateX(0) translateY(0) rotate(12deg) scale(1);
    opacity: 0.4;
  }
  42% {
    transform: translateX(56rpx) translateY(-32rpx) rotate(16deg) scale(1.08);
    opacity: 0.58;
  }
  78% {
    transform: translateX(20rpx) translateY(20rpx) rotate(9deg) scale(0.96);
    opacity: 0.42;
  }
  100% {
    transform: translateX(0) translateY(0) rotate(12deg) scale(1);
    opacity: 0.4;
  }
}
@keyframes challengeAurora3 {
  0% {
    transform: translateX(0) translateY(0) rotate(5deg) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translateX(-28rpx) translateY(-40rpx) rotate(8deg) scale(1.1);
    opacity: 0.48;
  }
  100% {
    transform: translateX(0) translateY(0) rotate(5deg) scale(1);
    opacity: 0.3;
  }
}
@keyframes chBlob1 {
  0%,
  100% {
    transform: scale(1) translate(0, 0);
  }
  30% {
    transform: scale(1.12) translate(20rpx, -28rpx);
  }
  65% {
    transform: scale(0.9) translate(-16rpx, 18rpx);
  }
}
@keyframes chBlob2 {
  0%,
  100% {
    transform: scale(1) translate(0, 0);
  }
  45% {
    transform: scale(1.08) translate(-24rpx, 16rpx);
  }
  80% {
    transform: scale(0.95) translate(12rpx, -12rpx);
  }
}
@keyframes flamePulse {
  0%,
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 12rpx rgba(255, 160, 60, 0.7));
  }
  50% {
    transform: scale(1.18) translateY(-4rpx);
    filter: drop-shadow(0 0 28rpx rgba(255, 100, 30, 0.9));
  }
}
@keyframes ringGlow {
  0%,
  100% {
    filter: drop-shadow(0 0 12rpx rgba(37, 204, 93, 0.5));
  }
  50% {
    filter: drop-shadow(0 0 36rpx rgba(37, 204, 93, 0.9));
  }
}
@keyframes badgeShine {
  0%,
  100% {
    box-shadow: 0 8rpx 40rpx rgba(37, 204, 93, 0.2), 0 0 0 0 rgba(37, 204, 93, 0.15);
  }
  50% {
    box-shadow: 0 16rpx 64rpx rgba(37, 204, 93, 0.45), 0 0 0 16rpx rgba(37, 204, 93, 0.05);
  }
}
@keyframes chFloat {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8rpx);
  }
}
@keyframes numIn {
  from {
    opacity: 0;
    transform: translateY(16rpx) scale(0.92);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes progressFill {
  from {
    width: 0%;
  }
}
@keyframes streakPop {
  0% {
    transform: scale(0.7) rotate(-6deg);
    opacity: 0;
  }
  60% {
    transform: scale(1.18) rotate(3deg);
    opacity: 1;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}
@keyframes cardSlideUp {
  from {
    opacity: 0;
    transform: translateY(56rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes spin360 {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
@keyframes morphBlob {
  0%,
  100% {
    border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%;
  }
  33% {
    border-radius: 40% 60% 30% 70% / 60% 40% 60% 40%;
  }
  66% {
    border-radius: 70% 30% 50% 50% / 40% 70% 30% 60%;
  }
}
@keyframes morphBlob2 {
  0%,
  100% {
    border-radius: 40% 60% 55% 45% / 55% 45% 55% 45%;
  }
  50% {
    border-radius: 55% 45% 40% 60% / 45% 55% 45% 55%;
  }
}
</style>
