<template>
  <view class="profile-page" data-cmp="ProfilePage">
    <!-- 极光背景 -->
    <view class="aurora-bg-wrap">
      <view class="aurora-bg-base" />
      <view class="aurora-top-halo" />
      <view class="blob-top-l" />
      <view class="blob-top-r" />
    </view>

    <view class="topbar" :style="{ paddingTop: pagePaddingTop }">
      <image
        :src="cdn('/app_static/images/icon_left.png')"
        class="back-icon"
        mode="aspectFit"
        @click="goBack"
      ></image>
      <text class="topbar-title"></text>
      <view style="width: 72rpx" />
    </view>

    <scroll-view
      class="page-scroll"
      scroll-y
      enhanced
      :show-scrollbar="false"
      style="height: calc(100% - 148rpx); position: relative; z-index: 2"
    >
      <!-- 头像区 -->
      <view class="profile-hero">
        <view class="card">
          <image
            class="card-bg"
            src="/static/images/card-bg.svg"
            mode="scaleToFill"
          ></image>
          <view class="cloud" :class="'cloud-' + cloudPeriod" @click="toggleGreet">
            <image class="cloud-icon" :src="greetIcon" mode="aspectFit"></image>
          </view>
          <view
            class="greet-bubble"
            :class="['greet-' + cloudPeriod, { open: greetOpen }]"
            @click="toggleGreet"
          >
            <view class="greet-arrow-border"></view>
            <view class="greet-arrow"></view>
            <text class="greet-text">{{ greetText }}</text>
          </view>
          <view class="card-user">
            <view class="avatar-ring">
              <view class="avatar-inner">
                <image class="avatar-img" :src="avatarUrl" mode="aspectFit"></image>
              </view>
            </view>
            <view class="card-user-info">
              <text class="profile-name">{{ isGuest ? "游客" : displayName }}</text>
              <text class="profile-meta">{{
                isGuest ? "登录后同步你的记账数据" : profileMeta
              }}</text>
              <text class="saved-amount">累计节省 ¥{{ savedTotalText }}</text>
              <view v-if="isGuest" class="profile-login-btn" @click="goLogin">
                <text>微信登录</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 注销冷静期横幅：申请注销后仍保持登录态，横幅读取云端 account_status；期内可撤销/导出，也可立即注销 -->
      <view v-if="pendingDeletion" class="delete-banner">
        <image
          class="delete-banner-icon"
          :src="cdn('/app_static/images/icon_timer.png')"
          mode="aspectFit"
        />
        <view class="delete-banner-body">
          <text class="delete-banner-title">账号注销处理中</text>
          <text class="delete-banner-text">
            你的账号将于 {{ formatDeleteDate() }} 永久删除，剩余约 {{ remainDays }} 天。期内可随时撤销并恢复全部数据，也可立即注销。
          </text>
          <view class="delete-banner-actions">
            <view class="banner-btn banner-btn-cancel" @click="cancelDeleting">
              <text>撤销注销</text>
            </view>
            <view class="banner-btn banner-btn-export" @click="exportData">
              <text>导出数据</text>
            </view>
            <view class="banner-btn banner-btn-immediate" @click="openImmediateDelete">
              <text>立即注销</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="!isGuest">
        <view class="glass-mid" style="margin: 0 32rpx 32rpx; padding: 32rpx">
          <view class="stats-row">
            <view v-for="s in userStats" :key="s.label" class="stat-block">
              <text class="stat-val" :style="{ color: s.color }">{{ s.value }}</text>
              <text class="stat-lbl">{{ s.label }}</text>
            </view>
          </view>
        </view>

        <!-- 设置菜单 -->
        <!-- 设置总标题 -->
        <text class="menu-top-title">设置</text>

        <!-- 横向大分类（无背景无框文字） -->
        <view class="cat-tabs">
          <view
            v-for="c in catList"
            :key="c.key"
            class="cat-tab"
            :class="{ active: activeCat === c.key }"
            @click="activeCat = c.key"
          >
            <text class="cat-tab-text">{{ c.title }}</text>
          </view>
        </view>

        <!-- 账户与数据 -->
        <view v-if="activeCat === 'account'" class="cat-panel">
          <view class="cat-list">
            <view
              v-for="m in menuItems"
              :key="m.label"
              class="menu-item glass-thin"
              style="margin: 0 32rpx 0; border-radius: 0"
              @click="m.action"
            >
              <view class="menu-left">
                <text class="menu-icon">{{ m.icon }}</text>
                <text class="menu-label">{{ m.label }}</text>
              </view>
              <text class="menu-arrow">›</text>
            </view>
            <view
              class="menu-item glass-thin menu-item-logout"
              style="margin: 0 32rpx 0; border-radius: 0"
              @click="handleLogout"
            >
              <view class="menu-left">
                <text class="menu-icon">🚪</text>
                <text class="menu-label logout-label">退出登录</text>
              </view>
              <text class="menu-arrow">›</text>
            </view>
            <view
              v-if="!isDeletingAccount"
              class="menu-item glass-thin menu-item-logout delete-account-item"
              style="margin: 0 32rpx 0; border-radius: 0"
              @click="openDeleteSheet"
            >
              <view class="menu-left">
                <text class="menu-icon">🗑️</text>
                <text class="menu-label logout-label">注销账号</text>
              </view>
              <text class="menu-arrow">›</text>
            </view>
          </view>
        </view>

        <!-- 健康与预算 -->
        <view v-if="activeCat === 'health'" class="cat-panel">
          <view class="cat-list">
            <view
              class="menu-item glass-thin"
              style="margin: 0 32rpx 0; border-radius: 0"
              @click="openRules"
            >
              <view class="menu-left"
                ><text class="menu-icon">📋</text
                ><text class="menu-label">预算规则</text></view
              >
              <text class="menu-arrow">›</text>
            </view>
            <view
              class="menu-item glass-thin"
              style="margin: 0 32rpx 0; border-radius: 0"
              @click="goLimitSetting"
            >
              <view class="menu-left"
                ><text class="menu-icon">🎯</text
                ><text class="menu-label">限额设置</text></view
              >
              <text class="menu-arrow">›</text>
            </view>
            <view
              class="menu-item glass-thin"
              style="margin: 0 32rpx 0; border-radius: 0"
              @click="goCategoryMgr"
            >
              <view class="menu-left"
                ><text class="menu-icon">🗂️</text
                ><text class="menu-label">分类管理</text></view
              >
              <text class="menu-arrow">›</text>
            </view>
          </view>
        </view>

        <!-- 功能设置 -->
        <view v-if="activeCat === 'feature'" class="cat-panel">
          <view class="cat-list">
            <view class="menu-item glass-thin" style="margin: 0 16px 0; border-radius: 0">
              <view class="menu-left">
                <text class="menu-icon">🍽️</text>
                <view class="menu-label-col">
                  <text class="menu-label">餐饮轻记录</text>
                  <text class="menu-sub">开启后餐饮账目可记录餐次与热量</text>
                </view>
              </view>
              <view class="sw-switch" :class="{ on: mealEnabled }" @click="toggleMeal">
                <view class="sw-knob" :class="{ on: mealEnabled }" />
              </view>
            </view>
            <view class="menu-item glass-thin" style="margin: 0 16px 0; border-radius: 0">
              <view class="menu-left">
                <text class="menu-icon">🔥</text>
                <view class="menu-label-col">
                  <text class="menu-label">减脂模式</text>
                  <text class="menu-sub">展示热量缺口（消耗−摄入）</text>
                </view>
              </view>
              <view
                class="sw-switch"
                :class="{ on: fatLossEnabled }"
                @click="toggleFatLoss"
              >
                <view class="sw-knob" :class="{ on: fatLossEnabled }" />
              </view>
            </view>
            <view
              class="menu-item glass-thin"
              style="margin: 0 32rpx 0; border-radius: 0"
              @click="goHealthSettings"
            >
              <view class="menu-left">
                <text class="menu-icon">⚖️</text>
                <text class="menu-label">身体数据设置</text>
              </view>
              <text class="menu-arrow">›</text>
            </view>
          </view>
        </view>

        <!-- 更多 -->
        <view v-if="activeCat === 'more'" class="cat-panel">
          <view class="cat-list">
            <view
              class="menu-item glass-thin"
              style="margin: 0 32rpx 0; border-radius: 0"
              @click="activeSheet = 'about'"
            >
              <view class="menu-left"
                ><text class="menu-icon">ℹ️</text
                ><text class="menu-label">关于余钱罐</text></view
              >
              <text class="menu-arrow">›</text>
            </view>
            <view
              class="menu-item glass-thin"
              style="margin: 0 32rpx 0; border-radius: 0"
              @click="activeSheet = 'feedback'"
            >
              <view class="menu-left"
                ><text class="menu-icon">💬</text
                ><text class="menu-label">意见反馈</text></view
              >
              <text class="menu-arrow">›</text>
            </view>
          </view>
        </view>

        <view style="height: 80rpx" />
      </view>
    </scroll-view>

    <!-- 规则设置弹窗 -->
    <view
      v-if="activeSheet === 'rules'"
      class="sheet-overlay"
      @click="activeSheet = null"
    >
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <view class="sheet-header-row">
          <view class="close-btn" @click="activeSheet = null"><text>←</text></view>
          <view>
            <text class="sheet-title">规则设置</text>
            <text class="sheet-sub">限额、存取与惩罚规则</text>
          </view>
        </view>
        <view class="sheet-body">
          <text class="form-label">💰 每日限额</text>
          <view class="form-row">
            <view class="form-input-wrap">
              <text class="form-prefix">¥</text>
              <number-field
                class="form-input"
                :model-value="dailyLimit"
                placeholder="每日限额"
                title="每日限额"
                :decimal-places="0"
                :max-integer="6"
                @update:model-value="(v) => (dailyLimit = v)"
              />
            </view>
            <view class="form-check-btn"><text>✓</text></view>
          </view>

          <text class="form-label" style="margin-top: 32rpx">📤 结余规则</text>
          <view class="seg-group">
            <view
              class="seg-btn"
              :class="{ active: surplusRule === 'pool' }"
              @click="surplusRule = 'pool'"
              >存入存款池</view
            >
            <view
              class="seg-btn"
              :class="{ active: surplusRule === 'next' }"
              @click="surplusRule = 'next'"
              >滚入次日</view
            >
          </view>

          <text class="form-label" style="margin-top: 16px">⚠️ 超支惩罚</text>
          <view class="seg-group">
            <view
              class="seg-btn"
              :class="{ active: penaltyRule === 'none' }"
              @click="penaltyRule = 'none'"
              >无惩罚</view
            >
            <view
              class="seg-btn"
              :class="{ active: penaltyRule === 'reduce' }"
              @click="penaltyRule = 'reduce'"
              >减少次日</view
            >
            <view
              class="seg-btn"
              :class="{ active: penaltyRule === 'freeze' }"
              @click="penaltyRule = 'freeze'"
              >冻结一日</view
            >
          </view>

          <view class="save-btn" @click="saveRules">
            <text>保存设置</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 关于弹窗 -->
    <view
      v-if="activeSheet === 'about'"
      class="sheet-overlay"
      @click="activeSheet = null"
    >
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">关于余钱罐</text>
        <view class="about-content">
          <text class="about-name">🐷 余钱罐 v1.0.0</text>
          <text class="about-desc"
            >一款帮助你管理每日消费、养成存钱习惯的智能记账工具。</text
          >
          <text class="about-desc">用存钱罐的趣味方式，让财务管理不再枯燥。</text>
        </view>
        <view class="save-btn" @click="activeSheet = null"><text>知道了</text></view>
      </view>
    </view>

    <!-- 反馈弹窗 -->
    <view
      v-if="activeSheet === 'feedback'"
      class="sheet-overlay"
      @click="activeSheet = null"
    >
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">意见反馈</text>
        <textarea
          class="feedback-area"
          v-model="feedbackText"
          placeholder="请输入你的建议或遇到的问题…"
        />
        <view class="save-btn" @click="activeSheet = null"><text>提交反馈</text></view>
      </view>
    </view>

    <!-- 注销账号确认弹窗 -->
    <view
      v-if="activeSheet === 'deleteAccount'"
      class="sheet-overlay"
      @click="activeSheet = null"
    >
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">注销账号</text>
        <view class="delete-warn">
          <text class="delete-warn-text"
            >注销后账号将被永久删除，以下数据无法恢复：全部记账记录、账本、心愿、资产账户、健康与餐次数据、贴纸与成就等。此操作不可撤销。</text
          >
        </view>
        <view class="agree-row" @click="agreeDelete = !agreeDelete">
          <image
            class="agree-icon"
            :src="
              agreeDelete
                ? '/static/images/icon_coin.png'
                : '/static/images/icon_coin_none.png'
            "
            mode="aspectFit"
          />
          <text class="agree-text">我已了解，注销后将永久删除我的全部数据</text>
        </view>
        <view
          class="save-btn delete-btn"
          :class="{ disabled: !agreeDelete || deleting }"
          @click="confirmDeleteAccount"
        >
          <text>{{ deleting ? "注销中…" : "下一步" }}</text>
        </view>
        <view class="sheet-cancel" @click="activeSheet = null">
          <text>取消</text>
        </view>
      </view>
    </view>

    <!-- 注销二次确认弹框：使用统一 BaseModal -->
    <BaseModal
      :show="showDeleteConfirm"
      title="确认注销账号"
      content="提交后账号将进入 7 天注销冷静期，期内可随时撤销并恢复全部数据；冷静期结束后数据将被永久删除且不可恢复。"
      cancel-text="再想想"
      confirm-text="提交注销"
      danger
      @confirm="onDeleteConfirm"
      @cancel="onDeleteCancel"
      @close="onDeleteCancel"
    />

    <!-- 立即注销二次确认：放弃冷静期，立即永久删除 -->
    <BaseModal
      :show="showImmediateDelete"
      title="立即注销账号"
      content="确认立即永久删除账号及全部数据？此操作不可撤销，将放弃剩余冷静期。删除后同微信再次登录将创建新账号。"
      cancel-text="再想想"
      confirm-text="立即注销"
      danger
      @confirm="confirmImmediateDelete"
      @cancel="showImmediateDelete = false"
      @close="showImmediateDelete = false"
    />

    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
  </view>
</template>

<script setup>
import { listTransactions, updateSettings } from "@/api/sparejar.js";
import { useUserStore } from "@/stores/user.js";
import { cdn } from "@/utils/cdn.js";
import BaseModal from "@/components/BaseModal.vue";
import { addDaysToDateKey, todayDateKey } from "@/utils/date.js";
import { formatFen } from "@/utils/money.js";
import { computed, onMounted, onUnmounted, ref } from "vue";

const {
  isGuest,
  state,
  currentStreak,
  savingsPoolBalanceFen,
  surplusPoolBalanceFen,
  wishes,
  loadWishes,
  logout,
  requestDeleteAccount,
  cancelDeleteAccount,
  exportUserData,
  deleteAccount,
  loadSettings,
  refreshTodayDashboard,
} = useUserStore();

const activeSheet = ref(null);
const dailyLimit = ref("200");
const surplusRule = ref("pool");
const penaltyRule = ref("reduce");
const feedbackText = ref("");

const displayName = computed(() => {
  const user = state.user;
  if (user && user.nickname) return user.nickname;
  return "余钱罐用户";
});

// 用户头像：接口返回优先，缺失或游客使用默认头像
const avatarUrl = computed(() => {
  const url = state.user && state.user.avatar;
  return url ? url : cdn("/app_static/images/icon_avatar.png");
});

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
onMounted(() => {
  const t = resolveTop();
  pagePaddingTop.value = t.padTop;
  // 每分钟刷新时段，跨时段自动切换问候
  greetTimer = setInterval(() => {
    nowHour.value = new Date().getHours();
    if (greetOpen.value) greetRotate.value += 1; // 展开时定时轮换
  }, 60000);
  // 加载全量交易与心愿，用于汇总总收入/总支出/存款
  if (!isGuest.value) {
    listTransactions({ limit: 10000 })
      .then((res) => {
        allTransactions.value = Array.isArray(res) ? res : [];
      })
      .catch(() => {
        allTransactions.value = [];
      });
    loadWishes().catch(() => {});
  }
});
onUnmounted(() => {
  if (greetTimer) clearInterval(greetTimer);
});

const profileMeta = computed(() => {
  const streak = currentStreak.value;
  return streak > 0 ? `连续记账 ${streak} 天` : "开始你的记账之旅";
});

// 累计节省 = 存款池余额（日限额未消费部分滚存 + 转入储蓄/心愿的部分，扣除实际消费）
const savedTotalFen = computed(() =>
  isGuest.value ? 0 : savingsPoolBalanceFen.value || 0
);
const savedTotalText = computed(() => formatFen(savedTotalFen.value));

// 全量交易（用于本地汇总总收入/总支出）
const allTransactions = ref([]);

const totalIncomeFen = computed(() =>
  allTransactions.value.reduce(
    (sum, t) =>
      t.type === "income" || t.type === "refund" ? sum + (Number(t.amount) || 0) : sum,
    0
  )
);
const totalExpenseFen = computed(() =>
  allTransactions.value.reduce(
    (sum, t) => (t.type === "expense" ? sum + (Number(t.amount) || 0) : sum),
    0
  )
);
// 存款 = 存款池余额 + 所有心愿已存金额
const wishSavedFen = computed(() =>
  (Array.isArray(wishes.value) ? wishes.value : []).reduce(
    (sum, w) => sum + (Number(w.saved_amount) || 0),
    0
  )
);
const depositFen = computed(
  () => (savingsPoolBalanceFen.value || 0) + wishSavedFen.value
);
// 总资产 = 存款（存款池 + 心愿已存）+ 结余池余额（流动资金）
const totalAssetFen = computed(
  () => depositFen.value + (surplusPoolBalanceFen.value || 0)
);

const userStats = computed(() => [
  {
    label: "总资产",
    value: formatFen(isGuest.value ? 0 : totalAssetFen.value),
    color: "var(--g5)",
  },
  {
    label: "总收入",
    value: formatFen(isGuest.value ? 0 : totalIncomeFen.value),
    color: "var(--b3)",
  },
  {
    label: "总支出",
    value: formatFen(isGuest.value ? 0 : totalExpenseFen.value),
    color: "var(--r6)",
  },
  {
    label: "存款",
    value: formatFen(isGuest.value ? 0 : depositFen.value),
    color: "var(--y5)",
  },
]);

const menuItems = [
  { icon: "📊", label: "数据导出", action: exportData },
  { icon: "🔔", label: "通知设置", action: goNotifySetting },
  { icon: "🔒", label: "隐私与安全", action: () => {} },
  { icon: "🗑️", label: "清理数据", action: () => {} },
];

// ===== 注销冷静期状态（account_status='deleting'） =====
const isDeletingAccount = computed(
  () => !!(state.user && state.user.account_status === "deleting")
);
const pendingDeletion = computed(
  () => !!(state.user && state.user.account_status === "deleting")
);
const deleteScheduledAt = computed(() => {
  if (state.user && state.user.delete_scheduled_at) return state.user.delete_scheduled_at;
  return "";
});
const deleteScheduledTs = computed(() => {
  const s = deleteScheduledAt.value;
  if (!s) return 0;
  const t = new Date(String(s).replace(" ", "T")).getTime();
  return Number.isNaN(t) ? 0 : t;
});
const remainDays = computed(() => {
  if (!deleteScheduledTs.value) return 0;
  const ms = deleteScheduledTs.value - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
});
function formatDeleteDate() {
  const t = deleteScheduledTs.value;
  if (!t) return "";
  const d = new Date(t);
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}

// 横向大分类（无背景无框文字） + 当前选中分类
const catList = [
  { key: "account", title: "账户数据" },
  { key: "health", title: "健康预算" },
  { key: "feature", title: "功能设置" },
  { key: "more", title: "更多" },
];
const activeCat = ref("account");

const goLimitSetting = () => {
  if (isGuest.value) {
    goLogin();
    return;
  }
  uni.navigateTo({ url: "/pages/limit-setting/limit-setting" });
};

const goCategoryMgr = () => {
  if (isGuest.value) {
    goLogin();
    return;
  }
  uni.navigateTo({ url: "/pages/category-mgr/category-mgr" });
};

const goNotifySetting = () => {
  if (isGuest.value) {
    goLogin();
    return;
  }
  uni.navigateTo({ url: "/pages/notify-setting/notify-setting" });
};

const goLogin = () => uni.navigateTo({ url: "/pages/login/login" });

const goBack = () => {
  if (getCurrentPages().length > 1) uni.navigateBack();
  else uni.reLaunch({ url: "/pages/index/index" });
};

// ===== 时段问候气泡（左侧展开动画 + 24h 动态话语） =====
const greetOpen = ref(true);
const nowHour = ref(new Date().getHours()); // 当前时段（按真实时间）
const greetRotate = ref(0); // 轮换索引，每次打开/定时 +1
let greetTimer = null;

// 各时段多条话语（记账 app 语境）
const greetPhrases = {
  morning: [
    "早安！今天也要好好记账呀",
    "新的一天，从记一笔开始",
    "早安，今天的小金库由你守护~",
    "记得吃顿热乎的早餐，胃暖一天都舒坦",
    "清晨喝杯温水，给身体充个电吧",
    "今天也要记得多喝水哦，小口慢饮更舒服",
    "出门前看眼天气，冷热自己加减件衣服",
  ],
  noon: [
    "午间小憩一下，别忘了记录午餐",
    "再忙也不要忘记吃午饭",
    "饭后站起来走两步，松松筋骨精神更好",
  ],
  afternoon: [
    "下午茶时间，理性消费更安心",
    "坚持记账的你超棒的，继续加油！",
    "工作间隙起身活动下，远眺一会儿护护眼",
    "累了就喝口水、伸个懒腰，别硬扛",
    "保持好心情，今天的小确幸也值得记一笔",
  ],
  evening: [
    "晚上好，今天的花销都记下了吗",
    "睡前看看今日结余，安心入眠",
    "晚饭别吃太撑，留点空间给好睡眠",
    "和家人聊聊天，或做点喜欢的事放松下",
    "今天辛苦啦，给自己一个小小的肯定",
  ],
  late: [
    "夜深了，早点休息，明天再记",
    "已经很晚了，放下手机睡吧",
    "明天还要早起的话，现在就关灯躺平吧",
    "睡前喝口温水、调暗灯光，更好入眠",
    "今天的事翻篇啦，安心睡个好觉",
  ],
};

const getPeriodKey = (h) => {
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 14) return "noon";
  if (h >= 14 && h < 18) return "afternoon";
  if (h >= 18 && h < 23) return "evening";
  return "late";
};

const greetText = computed(() => {
  const list = greetPhrases[getPeriodKey(nowHour.value)];
  return list[greetRotate.value % list.length];
});

// 时段对应图标（FR：morning/noon/afternoon/evening/late）
const periodIconMap = {
  morning: "icon_morning.png",
  noon: "icon_noon.png",
  afternoon: "icon_afternoon.png",
  evening: "icon_evening.png",
  late: "icon_night.png",
};
const greetIcon = computed(() =>
  cdn(`/app_static/images/${periodIconMap[getPeriodKey(nowHour.value)]}`)
);
// 当前时段 key，用于 .cloud 动态样式
const cloudPeriod = computed(() => getPeriodKey(nowHour.value));

const toggleGreet = () => {
  greetOpen.value = !greetOpen.value;
  if (greetOpen.value) greetRotate.value += 1; // 每次打开轮换一条
};

// ===== 阶段 11：餐饮轻记录 / 减脂模式开关 =====
const mealEnabled = computed(
  () => !!(state.settings && state.settings.meal_tracking_enabled)
);
const fatLossEnabled = computed(
  () => !!(state.settings && state.settings.fat_loss_mode_enabled)
);

async function toggleMeal() {
  if (isGuest.value) {
    goLogin();
    return;
  }
  const next = !mealEnabled.value;
  try {
    await updateSettings({ meal_tracking_enabled: next });
    await loadSettings();
    uni.showToast({ title: next ? "已开启餐饮轻记录" : "已关闭", icon: "none" });
  } catch (err) {
    uni.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
  }
}

async function toggleFatLoss() {
  if (isGuest.value) {
    goLogin();
    return;
  }
  const next = !fatLossEnabled.value;
  try {
    await updateSettings({ fat_loss_mode_enabled: next });
    await loadSettings();
    if (next) goHealthSettings();
    else uni.showToast({ title: "已关闭减脂模式", icon: "none" });
  } catch (err) {
    uni.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
  }
}

const goHealthSettings = () => {
  if (isGuest.value) {
    goLogin();
    return;
  }
  uni.navigateTo({ url: "/pages/health-settings/health-settings" });
};

function syncRulesFromSettings() {
  const s = state.settings;
  const eff =
    s &&
    s.pending_base_limit != null &&
    s.limit_effective_date &&
    s.limit_effective_date <= todayDateKey()
      ? s.pending_base_limit
      : s
      ? s.daily_base_limit
      : 10000;
  dailyLimit.value = String(Math.round(eff / 100));
  surplusRule.value = s && s.default_surplus_action === "savings_pool" ? "pool" : "next";
  penaltyRule.value = s && s.over_limit_penalty_enabled ? "reduce" : "none";
}

const openRules = () => {
  if (isGuest.value) {
    goLogin();
    return;
  }
  if (!state.settings)
    loadSettings()
      .then(syncRulesFromSettings)
      .catch(() => {});
  else syncRulesFromSettings();
  activeSheet.value = "rules";
};

const saveRules = async () => {
  const yuan = Math.floor(Number(dailyLimit.value));
  if (!Number.isFinite(yuan) || yuan < 1) {
    uni.showToast({ title: "每日限额需 ≥ 1 元", icon: "none" });
    return;
  }
  const patch = {
    pending_base_limit: yuan * 100,
    limit_effective_date: addDaysToDateKey(todayDateKey(), 1),
    default_surplus_action: surplusRule.value === "pool" ? "savings_pool" : "roll_over",
    over_limit_penalty_enabled: penaltyRule.value !== "none",
    penalty_streak_deduct: penaltyRule.value === "freeze" ? 2 : 1,
  };
  try {
    await updateSettings(patch);
    await loadSettings();
    await refreshTodayDashboard({ force: true });
    activeSheet.value = null;
    uni.showToast({ title: "设置已保存", icon: "success" });
  } catch (err) {
    uni.showToast({ title: (err && err.message) || "保存失败", icon: "none" });
  }
};

function handleLogout() {
  uni.showModal({
    title: "退出登录",
    content: "退出后将回到游客模式，本地登录信息会被清除，下次启动不会自动登录。",
    confirmText: "退出",
    confirmColor: "#ff6b6b",
    success(res) {
      if (!res.confirm) return;
      logout();
      uni.showToast({ title: "已退出登录", icon: "none" });
    },
  });
}

// ===== 注销账号：勾选 + 二次弹窗 → 申请 7 天冷静期（可撤销），不立即删数据 =====
const agreeDelete = ref(false);
const deleting = ref(false);
// 注销二次确认弹框（统一 BaseModal）显隐
const showDeleteConfirm = ref(false);

function openDeleteSheet() {
  agreeDelete.value = false;
  deleting.value = false;
  activeSheet.value = "deleteAccount";
}

// 勾选同意后点击「下一步」：打开统一二次确认弹框
function confirmDeleteAccount() {
  if (!agreeDelete.value || deleting.value) return;
  showDeleteConfirm.value = true;
}

// BaseModal 确认：执行注销提交
async function onDeleteConfirm() {
  if (deleting.value) return;
  deleting.value = true;
  showDeleteConfirm.value = false;
  try {
    await requestDeleteAccount(7);
    deleting.value = false;
    activeSheet.value = null;
    uni.showToast({ title: "已提交注销", icon: "none" });
  } catch (err) {
    deleting.value = false;
    uni.showToast({
      title: (err && err.message) || "提交失败，请稍后重试",
      icon: "none",
    });
  }
}

// BaseModal 取消 / 关闭：仅收起弹框
function onDeleteCancel() {
  showDeleteConfirm.value = false;
}

// 撤销注销：冷静期内恢复账号
async function cancelDeleting() {
  try {
    await cancelDeleteAccount();
    uni.showToast({ title: "已取消注销", icon: "none" });
  } catch (err) {
    uni.showToast({
      title: (err && err.message) || "操作失败，请稍后重试",
      icon: "none",
    });
  }
}

// 立即注销：放弃冷静期，立即硬删并登出（复用 auth.deleteAccount），之后同微信登录即新号
const showImmediateDelete = ref(false);
function openImmediateDelete() {
  showImmediateDelete.value = true;
}
async function confirmImmediateDelete() {
  showImmediateDelete.value = false;
  try {
    uni.showLoading({ title: "注销中…" });
    await deleteAccount();
    uni.hideLoading();
    uni.showToast({ title: "账号已彻底注销", icon: "none" });
  } catch (err) {
    uni.hideLoading();
    uni.showToast({
      title: (err && err.message) || "注销失败，请稍后重试",
      icon: "none",
    });
  }
}

// 导出用户全量数据为 JSON 文件（微信小程序：写入本地后分享；其他平台提示）
async function exportData() {
  try {
    uni.showLoading({ title: "导出中…" });
    const data = await exportUserData();
    const json = JSON.stringify(data, null, 2);
    const fileName = `余钱罐数据导出_${todayDateKey()}.json`;
    // #ifdef MP-WEIXIN
    const fs = uni.getFileSystemManager();
    const filePath = `${uni.env.USER_DATA_PATH}/${fileName}`;
    fs.writeFile({
      filePath,
      data: json,
      encoding: "utf8",
      success: () => {
        uni.hideLoading();
        // 优先用 uni 封装，缺失时回退到 wx 原生（微信文件分享到会话）
        const shareFn =
          typeof uni.shareFileMessage === "function"
            ? uni.shareFileMessage
            : typeof wx !== "undefined" && typeof wx.shareFileMessage === "function"
            ? wx.shareFileMessage
            : null;
        if (shareFn) {
          shareFn({
            filePath,
            fileName,
            success: () => {},
            fail: () => {
              uni.showToast({
                title: "已生成文件，可转发到聊天保存",
                icon: "none",
              });
            },
          });
        } else {
          uni.showToast({ title: "数据已导出至本地文件", icon: "none" });
        }
      },
      fail: () => {
        uni.hideLoading();
        uni.showToast({ title: "导出失败，请重试", icon: "none" });
      },
    });
    // #endif
    // #ifndef MP-WEIXIN
    uni.hideLoading();
    uni.showToast({ title: "当前平台暂不支持文件导出", icon: "none" });
    // #endif
  } catch (err) {
    uni.hideLoading();
    uni.showToast({
      title: (err && err.message) || "导出失败，请重试",
      icon: "none",
    });
  }
}
</script>

<style scoped lang="scss">
.profile-page {
  @include sj-theme-css-vars;
  width: 750rpx;
  height: 1624rpx;
  overflow: hidden;
  position: relative;
  margin: 0 auto;
  background: #ffffff;
}
.profile-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50rpx 0 40rpx;
  z-index: 20;
}
.topbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  z-index: 10;
}

.back-icon {
  width: 60rpx;
  height: 60rpx;
}
.topbar-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--ink);
}
.avatar-ring {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  padding: 6rpx;
  background: linear-gradient(135deg, var(--g3), var(--g5), var(--g4));
}
.avatar-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--g2-0), #fff);
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
.profile-name {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--ink);
}

/* 用户卡片（Uiverse.io by sahilxkhadka 改造·绿色系） */
.card {
  width: 684rpx;
  height: 260rpx;
  position: relative;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.card-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  border-radius: 36rpx;
  overflow: hidden;
}
.cloud {
  position: absolute;
  right: 12rpx;
  top: -59rpx;
  z-index: 100;
  cursor: pointer;
  transition: all 0.4s ease;
}
/* 不同时间段：云朵位置/缩放/旋转差异化 */
.cloud.cloud-morning {
  right: 12rpx;
  top: -65rpx;
}
.cloud.cloud-noon {
  top: -70rpx;
  z-index: -1;
  .cloud-icon {
    height: 170rpx;
    width: 170rpx;
    z-index: 20;
  }
}
.cloud.cloud-afternoon {
  top: -62rpx;
  z-index: -1;
}
.cloud.cloud-evening {
  top: -72rpx;
}
.cloud.cloud-late {
  top: -72rpx;
}
.cloud-icon {
  height: 180rpx;
  width: 180rpx;
  z-index: 20;
}
/* 左侧展开问候气泡（指向右上角图标，像图标在说话） */
.greet-bubble {
  position: absolute;
  right: 200rpx;
  top: -45rpx;
  z-index: 30;
  max-width: 0;
  padding: 0;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.92);
  border: 2rpx solid rgba(138, 233, 155, 0.6);
  border-radius: 24rpx;
  box-shadow: 0 6rpx 18rpx rgba(46, 92, 64, 0.15);
  opacity: 0;
  transform: translateX(-24rpx);
  transition: max-width 0.38s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease,
    transform 0.38s cubic-bezier(0.22, 1, 0.36, 1),
    padding 0.38s cubic-bezier(0.22, 1, 0.36, 1);
  cursor: pointer;
}
/* 收起态仍需裁切文字，展开态放开以显示尖角 */
.greet-bubble:not(.open) {
  overflow: hidden;
}
.greet-bubble.open {
  max-width: 440rpx;
  padding: 18rpx 24rpx;
  opacity: 1;
  transform: translateX(0);
  white-space: normal;
}

/* 不同时段：气泡主题色与位置差异化 */
.greet-bubble.greet-morning {
  top: -45rpx;
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(138, 233, 155, 0.6);
  box-shadow: 0 6rpx 18rpx rgba(46, 92, 64, 0.15);
}
.greet-bubble.greet-noon {
  top: -35rpx;
  background: rgba(255, 250, 232, 0.95);
  border-color: rgba(255, 198, 92, 0.65);
  box-shadow: 0 6rpx 18rpx rgba(180, 130, 30, 0.18);
}
.greet-bubble.greet-afternoon {
  top: -40rpx;
  background: rgba(255, 247, 240, 0.95);
  border-color: rgba(255, 170, 120, 0.6);
  box-shadow: 0 6rpx 18rpx rgba(190, 120, 70, 0.16);
}
.greet-bubble.greet-evening {
  top: -25rpx;
  background: rgba(245, 240, 255, 0.95);
  border-color: rgba(170, 142, 235, 0.6);
  box-shadow: 0 6rpx 18rpx rgba(110, 80, 180, 0.18);
}
.greet-bubble.greet-late {
  top: -24rpx;
  background: rgba(228, 233, 245, 0.95);
  border-color: rgba(120, 140, 180, 0.6);
  box-shadow: 0 6rpx 18rpx rgba(60, 75, 110, 0.2);
}
/* 尖角：真实 view 元素，旋转方块形成指向右侧图标的小三角 */
.greet-arrow,
.greet-arrow-border {
  position: absolute;
  right: -10rpx;
  top: 26rpx;
  width: 20rpx;
  height: 20rpx;
  border-radius: 4rpx;
  transform: rotate(45deg);
  z-index: 1;
}
.greet-arrow-border {
  background: rgba(138, 233, 155, 0.6);
}
.greet-arrow {
  right: -7rpx;
  background: rgba(255, 255, 255, 0.92);
}
.greet-text {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.4;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.card-user {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 28rpx;
  margin-top: 80rpx;
}
.card-user-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.saved-amount {
  font-size: 24rpx;
  font-weight: 800;
  color: var(--g7);
  margin-top: 16rpx;
}
.profile-meta {
  font-size: 24rpx;
  color: var(--ink4);
  margin-top: 8rpx;
}
.profile-login-btn {
  margin-top: 32rpx;
  padding: 20rpx 56rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
}

.stats-row {
  display: flex;
}
.stat-block {
  flex: 1;
  text-align: center;
}
.stat-val {
  font-size: 36rpx;
  font-weight: 800;
  display: block;
}
.stat-lbl {
  font-size: 20rpx;
  color: var(--ink4);
  margin-top: 4rpx;
  display: block;
}

/* 设置总标题 */
.menu-top-title {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: var(--ink);
  padding: 8rpx 36rpx 0;
}
/* 横向大分类（无背景无框文字，tab 过多可横向滚动） */
.cat-tabs {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 36rpx 8rpx;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.cat-tabs::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
.cat-tab {
  flex-shrink: 0;
  cursor: pointer;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  position: relative;
  transition: background 0.22s ease, transform 0.18s ease;
}
.cat-tab:active {
  transform: scale(0.94);
}
.cat-tab-text {
  font-size: 28rpx;
  color: var(--ink3);
  font-weight: 600;
  white-space: nowrap;
  transition: color 0.2s ease;
}
.cat-tab.active {
  background: var(--g2-0);
}
.cat-tab.active .cat-tab-text {
  color: var(--g6);
  font-weight: 800;
}
/* 大分类下的细分：统一圆角矩形 + g0~g2 渐变边框 */
.cat-panel {
  margin: 12rpx 32rpx 0;
  border-radius: 28rpx;
  padding: 2rpx;
  background: linear-gradient(135deg, var(--g0), var(--g2));
  animation: catFadeIn 0.3s ease;
}
.cat-list {
  background: #fff;
  border-radius: 26rpx;
  overflow: hidden;
  border: 4rpx solid var(--g3);
}
.cat-list .menu-item {
  margin: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  // border-bottom: 1rpx solid rgba(14, 146, 63, 0.1);
  /* glass-thin 的毛玻璃模糊会糊化 cat-list 左右边框线，形成内阴影错觉，需一并清除 */
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
.cat-list .menu-item:first-child,
.cat-list .menu-item:last-child {
  border-radius: 0 !important;
}
.cat-list .menu-item:last-child {
  border-bottom: none !important;
}
.cat-list .menu-item-logout {
  margin-top: 0 !important;
}
@keyframes catFadeIn {
  from {
    opacity: 0;
    transform: translateY(14rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.menu-item {
  padding: 28rpx 36rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.menu-item:first-child {
  border-radius: 28rpx 28rpx 0 0 !important;
}
.menu-item:last-child {
  border-radius: 0 0 28rpx 28rpx !important;
}
.menu-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.menu-icon {
  font-size: 32rpx;
}
.menu-label {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--ink);
}
.logout-label {
  color: var(--red-soft);
}
.menu-item-logout {
  margin-top: 16rpx !important;
  border-radius: 28rpx !important;
}
.menu-arrow {
  font-size: 36rpx;
  color: var(--g2-1);
}
.menu-label-col {
  display: flex;
  flex-direction: column;
}
.menu-sub {
  font-size: 22rpx;
  color: var(--ink3);
  margin-top: 4rpx;
}

/* 开关 */
.sw-switch {
  width: 92rpx;
  height: 52rpx;
  border-radius: 28rpx;
  background: var(--g2-0);
  position: relative;
  flex-shrink: 0;
  transition: background 0.22s ease;
  cursor: pointer;
}
.sw-switch.on {
  background: linear-gradient(135deg, var(--g4), var(--g5));
}
.sw-knob {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 6rpx;
  left: 6rpx;
  transition: left 0.22s cubic-bezier(0.34, 1.4, 0.64, 1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
.sw-knob.on {
  left: 46rpx;
}

/* Sheet */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 300;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet-panel {
  width: 750rpx;
  max-height: 85vh;
  overflow-y: auto;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), var(--g1));
  border-radius: 48rpx 48rpx 0 0;
  padding: 0 40rpx 60rpx;
}
.sheet-handle {
  display: flex;
  justify-content: center;
  padding: 24rpx 0 16rpx;
}
.handle-bar {
  width: 76rpx;
  height: 8rpx;
  border-radius: 6rpx;
  background: rgba(194, 242, 200, 0.8);
}
.sheet-header-row {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding: 16rpx 0 32rpx;
}
.close-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid var(--g2-1);
  color: var(--ink3);
}
.sheet-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--ink);
  display: block;
}
.sheet-sub {
  font-size: 22rpx;
  color: var(--ink4);
}
.sheet-body {
  padding-top: 16rpx;
}
.form-label {
  font-size: 24rpx;
  color: var(--ink3);
  font-weight: 600;
  display: block;
  margin-bottom: 16rpx;
}
.form-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.form-input-wrap {
  flex: 1;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 28rpx;
  border: 1px solid var(--g2-1);
  padding: 20rpx 28rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.form-prefix {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--g5);
}
.form-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 40rpx;
  font-weight: 700;
  color: var(--ink);
}
.form-check-btn {
  width: 88rpx;
  height: 88rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, var(--g4), var(--g5));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 36rpx;
  cursor: pointer;
}
.seg-group {
  display: flex;
  gap: 16rpx;
}
.seg-btn {
  flex: 1;
  padding: 20rpx;
  border-radius: 24rpx;
  text-align: center;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid var(--g2-1);
  font-size: 24rpx;
  font-weight: 600;
  color: var(--ink3);
  cursor: pointer;
}
.seg-btn.active {
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
  border-color: transparent;
}
.save-btn {
  width: 100%;
  padding: 28rpx;
  border-radius: 32rpx;
  background: linear-gradient(135deg, var(--g4), var(--g5));
  text-align: center;
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
  margin-top: 40rpx;
  cursor: pointer;
}

.about-content {
  padding: 32rpx 0;
}
.about-name {
  font-size: 40rpx;
  font-weight: 800;
  color: var(--ink);
  display: block;
  margin-bottom: 24rpx;
}
.about-desc {
  font-size: 26rpx;
  color: var(--ink3);
  line-height: 1.6;
  display: block;
  margin-bottom: 8rpx;
}
.feedback-area {
  width: 100%;
  height: 240rpx;
  border-radius: 28rpx;
  background: var(--g1);
  border: 1px solid var(--g2-1);
  padding: 28rpx;
  font-size: 26rpx;
  margin-top: 32rpx;
}

/* 注销账号入口：与退出登录同款红色，但视觉上区分（更靠下的危险操作） */
.delete-account-item {
  margin-top: 4rpx !important;
}
.delete-account-item .menu-icon {
  opacity: 0.9;
}

/* 注销确认弹窗 */
.delete-warn {
  padding: 24rpx 0 8rpx;
}
.delete-warn-text {
  font-size: 26rpx;
  color: var(--ink3);
  line-height: 1.6;
  display: block;
}
.agree-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 28rpx 0 8rpx;
  cursor: pointer;
}
.agree-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}
.agree-text {
  font-size: 26rpx;
  color: var(--ink);
  line-height: 1.4;
}
/* 注销主按钮：危险红，未勾选/进行中置灰 */
.delete-btn {
  background: linear-gradient(135deg, var(--r7), var(--r6));
  margin-top: 32rpx;
}
.delete-btn.disabled {
  background: var(--g2-0);
  color: var(--ink4);
  cursor: not-allowed;
}
.sheet-cancel {
  text-align: center;
  padding: 28rpx 0 8rpx;
  cursor: pointer;
}
.sheet-cancel text {
  font-size: 28rpx;
  color: var(--ink4);
}

/* 注销冷静期提示横幅 */
.delete-banner {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  margin: 0 32rpx 24rpx;
  padding: 28rpx 28rpx 24rpx;
  border-radius: 28rpx;
  /* 毛玻璃效果：半透明琥珀底 + 背景模糊，沿用项目 sj-glass 风格 */
  @include sj-glass(20rpx, rgba(255, 244, 224, 0.3), rgba(255, 184, 77, 0.2));
  box-shadow: 0 8rpx 28rpx rgba(245, 158, 11, 0.14);
}
.delete-banner-icon {
  width: 44rpx;
  height: 44rpx;
  flex-shrink: 0;
}
.delete-banner-body {
  flex: 1;
  min-width: 0;
}
.delete-banner-title {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--y8);
  display: block;
  margin-bottom: 8rpx;
}
.delete-banner-text {
  font-size: 24rpx;
  color: var(--y7);
  line-height: 1.5;
  display: block;
}
.delete-banner-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 30rpx;
}
.banner-btn {
  flex: 1;
  padding: 18rpx 0;
  border-radius: 24rpx;
  text-align: center;
  font-size: 26rpx;
  font-weight: 700;
  cursor: pointer;
}
.banner-btn text {
  color: #fff;
}
.banner-btn-cancel {
  background: linear-gradient(135deg, var(--y3), var(--y4));
}
.banner-btn-export {
  background: var(--white-75);
}
.banner-btn-export text {
  color: var(--y5);
}
.banner-btn-immediate {
  background: linear-gradient(135deg, var(--r7), var(--r6));
}
</style>
