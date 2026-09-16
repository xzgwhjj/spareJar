<template>
  <view class="detail-page" data-cmp="LedgerDetail" :style="pageStyle">
    <view class="topbar">
      <view class="topbar-left">
        <view class="back-btn" @click="goBack"><text>←</text></view>
        <!-- 收藏：置于返回键右侧；微信小程序不支持页面内联 svg，改用 <image> 引入静态 .svg 文件 -->
        <view
          class="fav-tooltip"
          :class="{
            faved: isFaved,
            entering: favAnim === 'entering',
            leaving: favAnim === 'leaving',
          }"
        >
          <view class="fav-trigger" @click="toggleFav">
            <image
              class="fav-heart fav-heart-outline"
              :class="{ hide: isFaved }"
              src="/static/fav/fav-heart-outline.svg"
              mode="aspectFit"
            />
            <image
              class="fav-heart fav-heart-filled"
              :class="{ show: isFaved }"
              src="/static/fav/fav-heart-filled.svg"
              mode="aspectFit"
            />
          </view>
        </view>
      </view>
    </view>

    <!-- 顶部 4:3 封面横幅：fixed 固定、顶到屏幕最顶部，不参与页面滚动 -->
    <view class="cover-banner">
      <image v-if="coverSrc" :src="coverSrc" mode="aspectFill" class="cover-banner-img" />
      <view v-else class="cover-banner-fallback"></view>
    </view>

    <!-- 待：右上角一个小狗双手交叉靠在上面，然后下巴贴在上面，然后向下看，然后点击切换成闭眼状态 -->
    <!-- 内容矩形：sticky 吸顶，初始交叠封面底部 1/3；开始滚动即上移到胶囊下方 50rpx 吸住，
         吸顶后内部 scroll-view 独立纵向滚动，封面始终固定。 -->
    <view class="content-sheet">
      <scroll-view
        class="sheet-scroll"
        scroll-y
        enhanced
        :show-scrollbar="false"
        :bounces="false"
      >
        <!-- 账本信息：扁平展示，去掉卡片框，紧贴内容矩形顶部下方 -->
        <view class="ledger-info">
          <!-- 行1：大号名称 + 类型徽章 -->
          <view class="hero-title-row">
            <text class="hero-name-lg" @click="showIntro = true">{{ ledger.name }}</text>
            <!-- 点击查看账本简介 -->
            <!-- 待：图标要替换 -->
            <view class="hero-intro-ico" @click="showIntro = true">
              <text class="hero-intro-ico-txt">ⓘ</text>
            </view>
            <text
              v-if="ledger.type === 'master'"
              class="hero-type master"
              :style="typeBadgeStyle"
              >主</text
            >
          </view>

          <!-- 待：图标要替换 -->
          <!-- 行2：小字 成员数 和 记录数（图标 + 成员数，空格分开 记录数） -->
          <view class="hero-meta">
            <text class="hero-meta-ico">👥</text>
            <text class="hero-meta-txt">{{ memberCount }}位成员</text>
            <text class="hero-meta-txt hero-meta-rec"
              ><text class="hero-meta-ico">📅</text>{{ ledger.records }}条记录</text
            >
          </view>

          <!-- 行3：成员头像横向排列，交叠 1/4，首位为自己 -->
          <view class="hero-members" v-if="displayMembers.length">
            <view
              v-for="(m, i) in displayMembers"
              :key="m.user_id"
              class="member-avatar"
              :class="{ self: m.is_self, excluded: excludedMembers.includes(m.user_id) }"
              :style="{ zIndex: displayMembers.length - i }"
              @click="toggleMember(m.user_id)"
            >
              <image
                v-if="m.avatar_url"
                :src="cloud.display(m.avatar_url)"
                mode="aspectFill"
                class="member-avatar-img"
              />
              <text v-else class="member-avatar-fallback">{{
                (m.nickname || "我").slice(0, 1)
              }}</text>
              <text v-if="m.is_self" class="member-self-tag">我</text>
            </view>
          </view>

          <!-- 行4：账本余额 / 账本消费 -->
          <!-- 行4：账本余额 / 账本消费 —— 双区域淡色背景，白色间隙分隔 -->
          <view class="hero-figures">
            <!-- 左：账本总余额（g0~g2 预设淡色，仅左侧上下圆角） -->
            <view class="figure-pane figure-left" :style="leftPaneStyle">
              <text class="hero-figure-label">账本余额</text>
              <text class="hero-figure-val">¥{{ fmt(ledger.balance) }}</text>
            </view>
            <!-- 中间白色间隙 -->
            <view class="figure-gap"></view>
            <!-- 中：周期支出（随日/月/年切换） -->
            <view class="figure-pane figure-mid">
              <text class="hero-figure-label">{{ periodWord }}支出</text>
              <text class="hero-figure-val">¥{{ fmt(ledgerExpense) }}</text>
            </view>
            <!-- 中间白色间隙 -->
            <view class="figure-gap"></view>
            <!-- 右：周期收入（动态账本主色调淡色，仅右侧上下圆角） -->
            <view class="figure-pane figure-right" :style="rightPaneStyle">
              <text class="hero-figure-label">{{ periodWord }}收入</text>
              <text class="hero-figure-val income">¥{{ fmt(ledgerIncome) }}</text>
            </view>
          </view>

          <!-- 行5：操作行 —— 圆形删除 / 圆形编辑 / 圆角记一笔 -->
          <view class="ledger-actions">
            <view
              v-if="!ledger.is_system"
              class="round-btn act-delete"
              @click="onMenuDelete"
            >
              <image
                class="round-btn-ico"
                src="/static/images/icon-delete.svg"
                mode="aspectFit"
              />
            </view>
            <view v-if="!ledger.is_system" class="round-btn act-edit" @click="onMenuEdit">
              <image
                class="round-btn-ico"
                src="/static/images/icon-edit.svg"
                mode="aspectFit"
              />
            </view>
            <view class="record-btn" @click="onRecord">
              <image
                class="record-btn-ico"
                src="/static/images/icon_record.png"
                mode="aspectFit"
              />
              <text class="record-btn-txt">记一笔</text>
            </view>
          </view>
        </view>

        <!-- 时间筛选 -->
        <!-- 时间筛选：可折叠卡片，含日/月/年维度切换与日历视图 -->
        <view class="filter-card">
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
          <!-- 待:加一个小狗坐着看日历的图 -->
        </view>

        <!-- 预算概览大卡片：左侧预算进度 + 右侧收支结余，底部居中悬浮百分比圆 -->
        <view class="budget-overview-card" :class="{ 'is-over': periodPct >= 100 }">
          <view class="bov-body">
            <!-- 左侧：预算进度 -->
            <view class="bov-left">
              <text class="bov-label">{{ budgetWord(timeDim) }}</text>
              <text class="bov-remain" :class="{ 'is-over': periodPct >= 100 }"
                >剩余 ¥{{ fmt(Math.max(periodBudget - periodSpent, 0)) }}</text
              >
              <text class="bov-spent"
                >¥{{ fmt(periodSpent) }} / ¥{{ fmt(periodBudget) }} ({{
                  periodPct
                }}%)</text
              >
              <view class="bov-bar" :class="{ 'is-over': periodPct >= 100 }">
                <view
                  class="bov-bar-fill"
                  :style="{
                    width: periodPct + '%',
                    background:
                      periodPct >= 100
                        ? 'linear-gradient(90deg,#ffb3b3,#ff6b6b)'
                        : 'linear-gradient(90deg,#89e59c,#25cc5d)',
                  }"
                />
              </view>
            </view>
          </view>
        </view>

        <!-- 分类统计图表 -->
        <view class="glass-mid chart-card">
          <view class="chart-head">
            <text class="section-title">{{ periodWord }}分类统计</text>
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
              <view class="bar-track">
                <view class="bar-fill" :style="{ width: c.width + '%' }" />
              </view>
            </view>
            <text class="bar-pct">{{ c.pct }}%</text>
          </view>
        </view>

        <!-- 明细 -->
        <view class="glass-mid detail-card">
          <view class="detail-head">
            <text class="section-title">明细 ({{ detailList.length }})</text>
            <view
              v-if="categoryFilter"
              class="filter-chip"
              @click="categoryFilter = null"
            >
              已筛选：{{ filterName }} ✕
            </view>
            <view
              v-if="excludedMembers.length"
              class="filter-chip"
              @click="excludedMembers = []"
            >
              排除 {{ excludedMembers.length }} 人 ✕
            </view>
          </view>
          <!-- 按成员联动：点击头像切换计入/排除，排除者变灰不计入全局汇总 -->
          <view v-if="displayMembers.length > 1" class="member-filter">
            <view
              v-for="m in displayMembers"
              :key="m.user_id"
              class="member-avatar"
              :class="{ excluded: excludedMembers.includes(m.user_id), self: m.is_self }"
              @click="toggleMember(m.user_id)"
            >
              <image
                v-if="m.avatar_url"
                class="member-avatar-img"
                :src="cloud.display(m.avatar_url)"
                mode="aspectFill"
              />
              <text v-else>{{ m.nickname.slice(0, 1) }}</text>
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
            <text
              class="sort-dir"
              @click="sortDir = sortDir === 'desc' ? 'asc' : 'desc'"
              >{{ sortDir === "desc" ? "↓" : "↑" }}</text
            >
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
                  >{{ r.date }} {{ r.time
                  }}<text v-if="r.note"> · {{ r.note }}</text></text
                >
              </view>
            </view>
            <text class="record-amount" :class="{ expense: r.isExpense }"
              >{{ r.amount >= 0 ? "+" : "" }}¥{{ fmt(Math.abs(r.amount)) }}</text
            >
          </view>
          <view v-if="detailList.length === 0" class="empty-hint">该时段暂无记录</view>
        </view>
      </scroll-view>
    </view>

    <!-- 编辑弹窗 -->
    <view v-if="showEdit" class="sheet-overlay" @click="showEdit = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle">
          <view class="handle-bar" />
        </view>
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

    <!-- 账本简介弹窗：通用可复用组件 -->
    <BaseModal
      :show="showIntro"
      title="账本简介"
      :content="ledgerIntro"
      :empty="!hasIntro"
      @close="showIntro = false"
    />
      
    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
</view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { onShow as uniOnShow } from "@dcloudio/uni-app";
import { useUserStore, setFavoriteLedgerAction } from "@/stores/user.js";
import { requireLogin } from '@/utils/guard.js';
import BaseModal from "@/components/BaseModal.vue";
import {
  updateLedger as apiUpdateLedger,
  getLedgerDetail,
  deleteLedger,
} from "@/api/sparejar.js";
import { formatDateKey, formatMonthKey } from "@/utils/date.js";
import { hexToRgba } from "@/utils/coverColor.js";
import { resolveCover, getCloudTempUrl, createCloudImageResolver } from "@/utils/cdn.js";

const { state, categoryMap, loadCategories } = useUserStore();
// cloud:// 头像需解析成临时 URL 才能被 <image> 渲染
const cloud = createCloudImageResolver();
function resolveMemberAvatars() {
  const self = (state.user && state.user.avatar_url) || "";
  const ids = [self, ...(members.value || []).map((m) => m.avatar_url)].filter(Boolean);
  cloud.resolve(ids);
}
uniOnShow(resolveMemberAvatars);

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
  intro: "", // 接口返回的账本简介（字段名 desc）
});
/** 用户上传封面存 cloud:// fileID，需经 getTempFileURL 解析为临时 URL 才能显示 */
const ledgerCoverUrl = ref("");
/** 封面最终显示地址：cloud:// → 解析后的临时链；其余走 resolveCover */
const coverSrc = computed(() =>
  ledger.cover && String(ledger.cover).startsWith("cloud://")
    ? ledgerCoverUrl.value
    : resolveCover(ledger.cover)
);
/** 成员总数（来自云函数 member_ledgers 关联统计，异常时降级为 0） */
const memberCount = ref(0);
/** 成员列表（来自云函数，含 user_id/nickname/avatar_url/is_self） */
const members = ref([]);
/** 展示用成员：始终包含自己（置于首位），用于头像交叠行 */
const displayMembers = computed(() => {
  const self = {
    user_id: state.uid,
    nickname: (state.user && state.user.nickname) || "我",
    avatar_url: (state.user && state.user.avatar_url) || "",
    is_self: true,
  };
  const others = members.value.filter((m) => m.user_id !== state.uid);
  return [self, ...others];
});
/** hero 支出/收入：随所选周期（日/月/年）联动，取当前周期汇总（与下方预算卡/图表同周期） */
const ledgerExpense = computed(() => summary.value.expense);
const ledgerIncome = computed(() => summary.value.income);

/** 行4 双区域背景：左侧从预设 g0~g2 梯度选一种淡色（可切换），
 * 右侧读取账本主题色并淡化为与左侧同一梯度的版本，保证左右淡度一致。 */
const leftTone = ref("g1"); // 可选 'g0' | 'g1' | 'g2'
/** 各梯度对应的淡化强度：g0 最淡 → g2 略深，使右侧主色淡化后与左侧视觉同梯度 */
const TONE_ALPHA = { g0: 0.06, g1: 0.09, g2: 0.14 };
const leftPaneStyle = computed(() => ({
  background: `var(--${leftTone.value})`,
}));
const rightPaneStyle = computed(() => ({
  background: hexToRgba(ledger.theme_color || "#25cc5d", TONE_ALPHA[leftTone.value]),
}));

/** 收藏按钮（Uiverse like 动效）：本地持久化，避免与全局底部胶囊冲突。
 * 生产环境如需多端同步，可将此处改为云函数写入独立 favorites 表。 */
const FAV_KEY = (id) => `sparejar_fav_${id}`;
const isFaved = ref(false);
const favAnim = ref(""); // '' | 'entering' | 'leaving'
onMounted(() => {
  if (!requireLogin('/pages/ledger-detail/ledger-detail')) return
  if (ledger._id) {
    isFaved.value = uni.getStorageSync(FAV_KEY(ledger._id)) === 1;
  }
});
async function toggleFav() {
  if (!ledger._id) return;
  const prev = isFaved.value;
  const next = !prev;
  // 乐观更新 + 本地缓存（未登录时也作为临时态兜底）
  isFaved.value = next;
  uni.setStorageSync(FAV_KEY(ledger._id), next ? 1 : 0);
  // 播放绕圈动画：收藏为进入、取消为离开（离开期间由 .leaving 保持填充与粉色边框）
  favAnim.value = next ? "entering" : "leaving";
  setTimeout(() => {
    favAnim.value = "";
  }, 700);
  if (!state.uid) return; // 未登录：仅本地收藏
  try {
    const res = await setFavoriteLedgerAction(ledger._id, next);
    if (res && typeof res.favorited === "boolean") {
      isFaved.value = res.favorited;
      uni.setStorageSync(FAV_KEY(ledger._id), res.favorited ? 1 : 0);
      // 云端结果与本地乐观不一致时，停止动画以贴合真实态
      if (res.favorited !== next) favAnim.value = "";
    }
  } catch (e) {
    // 云端同步失败：回滚到切换前状态
    isFaved.value = prev;
    favAnim.value = "";
    uni.setStorageSync(FAV_KEY(ledger._id), prev ? 1 : 0);
    uni.showToast({ title: "收藏同步失败", icon: "none" });
  }
}
/** 类型徽标配色：主账本沿用 CSS 绿渐变；子账本使用接口返回的主题色（无则回退默认样式） */
const typeBadgeStyle = computed(() => {
  if (ledger.type === "master" || !ledger.theme_color) return null;
  return { background: hexToRgba(ledger.theme_color, 0.12), color: ledger.theme_color };
});

// 内容矩形吸顶位置：滚动到微信小程序右上角胶囊按钮下方 50rpx（用户需求）
function resolveStickyTop() {
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect();
    if (menuButton?.bottom > 0) {
      const gap = uni.upx2px(50);
      return `${menuButton.bottom + gap}px`;
    }
  } catch (_) {}
  const { statusBarHeight = 0 } = uni.getSystemInfoSync();
  return `${statusBarHeight + uni.upx2px(138)}px`;
}
const stickyTop = ref(resolveStickyTop());
const pageStyle = computed(() => ({
  "--sticky-top": stickyTop.value,
}));

/** 属于本账本的全部未删除交易（加载一次，后续客户端筛选） */
const ledgerTxs = ref([]);

// 筛选/排序状态
const timeDim = ref("month"); // 'day' | 'month' | 'year'
const selectedKey = ref(formatMonthKey(new Date()));
const filterExpanded = ref(true); // 时间筛选区是否展开日历视图
const chartType = ref("expense"); // 'expense' | 'income'
const categoryFilter = ref(null); // category_id 或 null
// 成员排除集合：默认空（全部计入）。点击头像把该成员加入 → 全局联动排除
const excludedMembers = ref([]);
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

// 周期前缀：日/月/年，供 hero 与图表标题统一加前缀（账本余额保持总余额不加前缀）
const periodWord = computed(() =>
  timeDim.value === "day" ? "日" : timeDim.value === "year" ? "年" : "月"
);

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

// 切换某成员是否计入联动：点击头像在“计入/排除”间切换
function toggleMember(uid) {
  const i = excludedMembers.value.indexOf(uid);
  if (i >= 0) excludedMembers.value.splice(i, 1);
  else excludedMembers.value.push(uid);
}

// 周期交易：先按排除成员过滤，全局联动（hero/预算卡/图表/明细同源）
const periodTxs = computed(() =>
  ledgerTxs.value.filter(
    (t) => inRange(t) && !excludedMembers.value.includes(t.user_id)
  )
);

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
      intro: l.desc || "", // 接口返回的账本简介（字段名为 desc）
    });
    // 用户上传封面为 cloud:// fileID，解析为临时访问 URL
    ledgerCoverUrl.value =
      l.cover && String(l.cover).startsWith("cloud://")
        ? await getCloudTempUrl(l.cover)
        : "";
    memberCount.value = (data && data.memberCount) || 0;
    members.value = (data && data.members) || [];
    resolveMemberAvatars(); // 解析成员头像（cloud:// → 临时 URL）
    // 登录态下以云端收藏态为准，校正本地缓存（多端一致）
    if (state.uid && data && typeof data.is_favorited === "boolean") {
      isFaved.value = data.is_favorited;
      uni.setStorageSync(FAV_KEY(ledger._id), data.is_favorited ? 1 : 0);
    }
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

// 账本简介弹窗
const showIntro = ref(false);
const ledgerIntro = computed(() => (ledger.intro || "").trim());
const hasIntro = computed(() => ledgerIntro.value.length > 0);

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
// 记一笔：跳转记账页，带出当前账本
function onRecord() {
  const id = ledger._id;
  uni.navigateTo({
    url: id
      ? `/pages/add-record/add-record?ledger_id=${id}`
      : "/pages/add-record/add-record",
  });
}

const goBack = () => uni.navigateBack();
</script>

<style scoped lang="scss">
.detail-page {
  width: 750rpx;
  margin: 0 auto;
  background: #fff;
  position: relative;
  /* 整页可滚动：封面 fixed 固定不动；
     内容矩形用 position:sticky 吸顶到胶囊下方 50rpx（--sticky-top），
     page 滚动使其上移吸顶，吸顶后其内部 scroll-view 独立滚动。 */
  min-height: 100vh;
  overscroll-behavior-y: none;
  box-sizing: border-box;
}

.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 88rpx 32rpx 20rpx;

  /* 左侧分组：返回键 + 收藏按钮并排，避免收藏被 space-between 推到右上角胶囊下方被遮挡 */
  .topbar-left {
    display: flex;
    align-items: center;
  }

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

  /* 收藏按钮（image 引入静态 svg，规避微信小程序内联 svg 不支持）：置于返回键右侧 */
  .fav-tooltip {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72rpx;
    height: 72rpx;
    margin-left: 16rpx;
    --cl: #ff5c8a;
    --bg: var(--white-75);
    --sizer: 44rpx;
    cursor: pointer;
    transition: all 0.2s;
  }

  .fav-trigger {
    position: relative;
    background: var(--bg);
    border-radius: 50%;
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1rpx solid transparent;
    box-shadow: rgba(95, 95, 115, 0.25) 0 2rpx 5rpx -1rpx,
      rgba(255, 255, 255, 0.3) 0 1rpx 3rpx -1rpx;
    transition: border-color 0.35s ease;
  }

  /* 收藏后 / 取消动画期间：背景圆边框保持粉色 */
  .fav-tooltip.faved .fav-trigger,
  .fav-tooltip.leaving .fav-trigger {
    border-color: #ff5c8a;
  }

  /* 收藏或取消瞬间：一圈粉色边框绕圆旋转一周后淡出 */
  .fav-tooltip.entering .fav-trigger::after,
  .fav-tooltip.leaving .fav-trigger::after {
    content: "";
    position: absolute;
    top: -6rpx;
    right: -6rpx;
    bottom: -6rpx;
    left: -6rpx;
    border-radius: 50%;
    border: 3rpx solid transparent;
    border-top-color: #ff5c8a;
    border-right-color: #ff5c8a;
    animation: favRing 0.7s ease-in-out forwards;
  }

  @keyframes favRing {
    from {
      transform: rotate(0deg);
      opacity: 1;
    }
    to {
      transform: rotate(360deg);
      opacity: 0;
    }
  }

  .fav-heart {
    width: 44rpx;
    height: 44rpx;
    transition: all 0.2s ease;
  }

  /* 未收藏：显示描边爱心；收藏后：淡出描边、淡入实心 */
  .fav-heart-outline {
    display: block;
  }

  .fav-tooltip.faved .fav-heart-outline,
  .fav-tooltip.leaving .fav-heart-outline {
    display: none;
  }

  .fav-heart-filled {
    display: none;
  }

  .fav-tooltip.faved .fav-heart-filled,
  .fav-tooltip.leaving .fav-heart-filled {
    display: block;
  }

  /* 对勾圆环与文字已移除：点击收藏后只显示填充的粉色爱心 + 旋转的粉色边框圈 */
}

.edit-btn.disabled {
  opacity: 0.4;
  cursor: default;
}

/* ===== 全屏布局：顶部 4:3 封面横幅 + 融合内容层 ===== */
/* 封面横幅：宽高比 4:3（高 = 宽 × 3/4）；在小程序/web 以 aspect-ratio 精准还原 */
.cover-banner {
  /* 需求1：封面固定不动，不参与滚动，直接顶到屏幕最顶部（top:0）。
     微信小程序右上角胶囊为原生层，会浮在封面之上，属预期的大图封面效果。 */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  /* 显式高度：750rpx × 3/4 = 562.5rpx；避免纯 aspect-ratio 在 fixed 容器内塌陷为 0。 */
  height: 562.5rpx;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: #eef7ef;
  z-index: 1;
}
.cover-banner-img {
  width: 100%;
  height: 100%;
  display: block;
}

/* 无封面时的渐变兜底，避免破图 */
.cover-banner-fallback {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #d8f0dc, #bfe6c8);
}

/* 内容矩形：sticky 吸顶。一进来交叠在封面（margin-top:375rpx 起、向上交叠封面底部 1/3），
   封面顶部清晰露出；开始滚动后整体上移，吸顶到胶囊按钮下方 50rpx（--sticky-top），
   吸顶后占满“视口高 - 吸顶位”，内部 scroll-view 独立纵向滚动，封面始终固定不动。 */
.content-sheet {
  position: sticky;
  /* 吸顶位置：胶囊按钮下方 50rpx（由 JS 注入 --sticky-top，兜底 120rpx） */
  top: var(--sticky-top, 120rpx);
  /* 初始交叠：封面 fixed 不占文档流，故内容矩形从 450rpx 起、向上交叠封面底部约 112.5rpx（交叠较少） */
  margin-top: 450rpx;
  /* 吸顶后高度 = 视口高 - 吸顶位，使内部 scroll-view 填满并独立滚动 */
  height: calc(100vh - var(--sticky-top, 120rpx));
  z-index: 2;
  border-radius: 40rpx 40rpx 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  /* 顶部 112.5rpx 为交叠磨砂区（对应屏幕 450~562.5rpx 的封面底部），
     透明→磨砂→纯白，与固定封面自然融合；之后纯白承载滚动内容。 */
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0) 36rpx,
    rgba(255, 255, 255, 0.3) 72rpx,
    rgba(255, 255, 255, 0.8) 102rpx,
    #ffffff 112.5rpx,
    #ffffff 100%
  );
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
}

/* 内容滚动区：填满 content-sheet，独立纵向滚动；
   flex:1 + min-height:0 保证在 flex 容器内可被压缩并真正滚动。
   padding-top 让滚到最顶时，内容与矩形上沿（胶囊下方）之间留一点间隔，更美观。 */
.sheet-scroll {
  flex: 1;
  min-height: 0;
  width: 100%;
  padding-top: 32rpx;
}

/* 账本详情头部卡片（参考示例 GlassCard 设计） */
/* 行1：大号名称 + 类型徽章 */
.hero-title-row {
  display: flex;
  align-items: center;
  gap: 14rpx;

  .hero-name-lg {
    font-size: 44rpx;
    font-weight: 800;
    color: var(--ink);
    line-height: 1.2;
    cursor: pointer;
  }

  /* 简介提示图标：点击入口，增强可点性 */
  .hero-intro-ico {
    flex-shrink: 0;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    // background: rgba(var(--brand-rgb), 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s ease, background 0.2s ease;

    .hero-intro-ico-txt {
      font-size: 26rpx;
      font-weight: 700;
      // color: var(--g5);
      line-height: 1;
    }
  }
  .hero-intro-ico:active {
    transform: scale(0.9);
    background: rgba(var(--brand-rgb), 0.2);
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

/* 行2：小字 成员数 和 记录数 */
.hero-meta {
  display: flex;
  align-items: center;
  margin-top: 12rpx;

  .hero-meta-ico {
    font-size: 22rpx;
    margin-right: 8rpx;
  }

  .hero-meta-txt {
    font-size: 22rpx;
    color: var(--ink4);
  }

  /* 记录数与成员数之间留空格分开 */
  .hero-meta-rec {
    margin-left: 20rpx;
  }
}

/* 行3：成员头像横向排列，交叠 1/4，首位为自己 */
.hero-members {
  display: flex;
  align-items: center;
  margin-top: 28rpx;
  /* 容器左内缩，给首个头像留白边不被裁切 */
  padding-left: 4rpx;
}

.member-avatar {
  position: relative;
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: color-mix(in sRGB, var(--g5) 12%, transparent);
  border: 3rpx solid #fff;
  overflow: visible;
  flex-shrink: 0;
  /* 除首位外，每个头像向左偏移 1/4 宽度，形成 1/4 交叠 */
  margin-left: -18rpx;
  @include sj-flex-center;
  font-size: 30rpx;
  color: var(--ink);

  &:first-child {
    margin-left: 0;
  }

  .member-avatar-img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: block;
  }

  .member-avatar-fallback {
    font-size: 30rpx;
    font-weight: 700;
  }

  /* 自己：主题色描边 + 右下角“我”角标，便于识别默认付款人 */
  &.self {
    border-color: var(--g5);

    .member-self-tag {
      position: absolute;
      right: -6rpx;
      bottom: -6rpx;
      min-width: 28rpx;
      height: 28rpx;
      padding: 0 4rpx;
      border-radius: 14rpx;
      background: var(--g5);
      color: #fff;
      font-size: 18rpx;
      line-height: 28rpx;
      text-align: center;
      border: 2rpx solid #fff;
    }
  }
}

/* 行4：账本余额 / 账本消费 —— 双区域淡色背景，白色间隙分隔 */
.hero-figures {
  display: flex;
  align-items: stretch;
  margin-top: 32rpx;
  /* 容器白底，中间 gap 透出纯白，与左右淡色自然衔接 */
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;

  /* 中间白色间隙 */
  .figure-gap {
    width: 16rpx;
    flex-shrink: 0;
    background: #fff;
  }

  .figure-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    padding: 24rpx 28rpx;
  }

  /* 左侧仅左侧上下圆角 */
  .figure-left {
    border-radius: 24rpx 0 0 24rpx;
  }

  /* 中间栏无需圆角 */
  .figure-mid {
    border-radius: 0;
  }

  /* 右侧仅右侧上下圆角 */
  .figure-right {
    border-radius: 0 24rpx 24rpx 0;
  }

  .hero-figure-label {
    font-size: 22rpx;
    color: var(--ink4);
  }

  .hero-figure-val {
    font-size: 34rpx;
    font-weight: 800;
    color: var(--ink);
    letter-spacing: -1rpx;

    &.income {
      color: var(--g5);
    }

    &.expense {
      color: #ff6b6b;
    }
  }
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

/* 账本信息：扁平展示（无卡片框），紧贴内容矩形顶部下方；
   position: relative 供右上角操作菜单绝对定位。 */
.ledger-info {
  position: relative;
  padding: 24rpx 40rpx 8rpx 40rpx;
}

/* 行5：操作行 —— 圆形删除 / 圆形编辑 / 圆角记一笔 */
.ledger-actions {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 32rpx;
}

/* 圆形操作按钮（删除 / 编辑） */
.round-btn {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #e6e8eb;
  transition: transform 0.15s ease, background 0.2s ease;
}

.round-btn:active {
  transform: scale(0.92);
  background: #eaecef;
}

.round-btn-ico {
  width: 38rpx;
  height: 38rpx;
}

/* 圆形删除按钮：粉色浅底（--p1），与红色图标协调 */
.act-delete {
  background: var(--p1);
  // border-color: #ffd6e7;
}
.act-delete:active {
  background: var(--p2);
}
/* 记一笔：圆角主按钮，占据剩余宽度 */
.record-btn {
  flex: 1;
  height: 76rpx;
  border-radius: 38rpx;
  /* 以品牌绿 g4 → g5 做渐变背景 */
  background: linear-gradient(135deg, var(--g4), var(--g5));
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  box-shadow: 0 6rpx 16rpx color-mix(in sRGB, var(--g5) 28%, transparent);
  transition: transform 0.15s ease;
}

.record-btn:active {
  transform: scale(0.97);
}

.record-btn-ico {
  width: 32rpx;
  height: 32rpx;
}

.record-btn-txt {
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
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
  position: relative;
  margin: 32rpx 32rpx 32rpx;
  padding: 20rpx 28rpx;
  cursor: pointer;
  box-shadow: var(--shadow-light);
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

/* 周期预算进度条：复用 ledger 列表的浮雕点状风格，高度较列表(12rpx)加大 */
.period-bar {
  --light: color-mix(in sRGB, var(--base) 35%, #fff);
  --dark: color-mix(in sRGB, var(--base) 90%, #000);
  --transparent: transparent;
  position: relative;
  height: 22rpx;
  border-radius: 22rpx;
  overflow: hidden;
  margin-top: 20rpx;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.85) 2rpx, transparent 3rpx) 0
      0 / 22rpx 22rpx,
    linear-gradient(transparent 70%, var(--dark) 100%), var(--light);
  box-shadow: inset 2rpx 2rpx 4rpx rgba(206, 232, 218, 0.35),
    inset -2rpx -2rpx 4rpx rgba(255, 255, 255, 0.65);

  .period-bar-fill {
    position: relative;
    height: 100%;
    border-radius: 0 22rpx 22rpx 0;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.85) 2rpx, transparent 3rpx)
        0 0 / 22rpx 22rpx,
      linear-gradient(
        90deg,
        color-mix(in sRGB, var(--base) 80%, #fff),
        var(--transparent) 24rpx
      ),
      linear-gradient(transparent 82%, var(--dark) 100%),
      color-mix(in sRGB, var(--base) 60%, #fff);
    transition: width 0.6s ease;

    &.is-over {
      background: linear-gradient(90deg, var(--red-soft), #ff9b9b);
    }
  }
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

/* 预算概览：悬浮面板（参考 BudgetGaugeCard 的 panel-float 外观与动效） */
.budget-overview-card {
  position: relative;
  z-index: 5; /* 上叠 hero、下叠分类卡片时压在上方 */
  margin: -22rpx 140rpx -18rpx; /* 上下各与相邻卡片重叠一点点；左右边距加大→宽度更窄 */
  padding: 28rpx 28rpx 30rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 2rpx solid rgba(255, 255, 255, 0.9);
  outline: 2rpx solid rgba(37, 204, 93, 0.18);
  outline-offset: -1;
  box-shadow: 0 16rpx 56rpx rgba(37, 204, 93, 0.2), 0 2px 8px rgba(0, 0, 0, 0.07),
    inset 0 1.5px 0 rgba(255, 255, 255, 0.98);
  transform: rotate(-3deg);
  animation: budget-card-kf 4.5s ease-in-out infinite;
  overflow: hidden;

  &.is-over {
    outline: 2rpx solid rgba(255, 107, 107, 0.18);
    box-shadow: 0 16rpx 56rpx rgba(255, 107, 107, 0.14), 0 2px 8px rgba(0, 0, 0, 0.05),
      inset 0 1.5px 0 rgba(255, 255, 255, 0.98);
  }
}

.bov-body {
  display: flex;
  align-items: stretch;
  gap: 20rpx;
}

/* 左侧：预算进度 */
.bov-left {
  flex: 1.4;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.bov-label {
  font-size: 20rpx;
  font-weight: 600;
  color: var(--ink4);
  margin-bottom: 8rpx;
  display: block;
}

.bov-remain {
  font-size: 40rpx;
  font-weight: 900;
  color: var(--g5);
  letter-spacing: -2rpx;
  line-height: 1.1;
  margin-bottom: 8rpx;
  display: block;

  &.is-over {
    color: #ff6b6b;
  }
}

.bov-spent {
  font-size: 20rpx;
  color: var(--ink3);
  font-weight: 500;
  margin-bottom: 14rpx;
  display: block;
}

.bov-bar {
  height: 14rpx;
  border-radius: 10rpx;
  background: rgba(37, 204, 93, 0.14);
  overflow: hidden;

  &.is-over {
    background: rgba(255, 107, 107, 0.14);
  }
}

.bov-bar-fill {
  height: 100%;
  border-radius: 10rpx;
  transition: width 0.8s cubic-bezier(0.34, 1.2, 0.64, 1);
}

/* 悬浮面板弹跳动效（与 BudgetGaugeCard 一致）：轻微倾斜 + 上下浮动 */
@keyframes budget-card-kf {
  0% {
    transform: rotate(-3deg) translateY(0);
  }
  50% {
    transform: rotate(-3deg) translateY(-6rpx);
  }
  100% {
    transform: rotate(-3deg) translateY(0);
  }
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

/* 明细卡：按成员筛选头像行 */
.member-filter {
  display: flex;
  align-items: center;
  padding: 4rpx 0 14rpx;
}

/* 被排除的成员：变灰、降低不透明度，表示不计入全局联动 */
.member-avatar.excluded {
  filter: grayscale(1);
  opacity: 0.4;
  border-color: #d8d8d8;
  box-shadow: none;
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
