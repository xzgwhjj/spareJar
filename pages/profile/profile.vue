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
      <view class="back-btn" @click="goBack">
        <image
          :src="cdn('/app_static/images/icon_left.png')"
          class="back-icon"
          mode="aspectFit"
        ></image>
      </view>
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
          <view class="cloud" @click="toggleGreet">
            <image
              class="cloud-icon"
              :src="cdn('/app_static/images/icon_morning.png')"
              mode="aspectFit"
            ></image>
          </view>
          <view class="greet-bubble" :class="{ open: greetOpen }" @click="toggleGreet">
            <text class="greet-text">{{ greetText }}</text>
          </view>
          <view class="card-user">
            <view class="avatar-ring">
              <view class="avatar-inner">
                <text class="avatar-emoji">{{ isGuest ? "👤" : "🐶" }}</text>
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
        <view class="menu-group">
          <text class="menu-title">账户与数据</text>
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
        </view>

        <view class="menu-group" style="margin-top: 32rpx">
          <text class="menu-title">健康与预算</text>
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

        <view class="menu-group" style="margin-top: 32rpx">
          <text class="menu-title">功能设置</text>
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

        <view class="menu-group" style="margin-top: 32rpx">
          <text class="menu-title">更多</text>
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

    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useUserStore } from "@/stores/user.js";
import { updateSettings } from "@/api/sparejar.js";
import { todayDateKey, addDaysToDateKey } from "@/utils/date.js";
import { cdn } from "@/utils/cdn.js";
import { formatFen } from "@/utils/money.js";

const {
  isGuest,
  state,
  currentStreak,
  savingsPoolBalanceFen,
  logout,
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

const userStats = [
  { label: "总记账", value: "1,248", color: "#25cc5d" },
  { label: "存款池", value: "¥3,240", color: "#3b82f6" },
  { label: "连续天数", value: "23", color: "#f59e0b" },
];

const menuItems = [
  { icon: "📊", label: "数据导出", action: () => {} },
  { icon: "🔔", label: "通知设置", action: goNotifySetting },
  { icon: "🔒", label: "隐私与安全", action: () => {} },
  { icon: "🗑️", label: "清理数据", action: () => {} },
];

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
const nowHour = ref(new Date().getHours());
const greetRotate = ref(0); // 轮换索引，每次打开/定时 +1
let greetTimer = null;

// 各时段多条话语（记账 app 语境）
const greetPhrases = {
  morning: [
    "早安！今天也要好好记账呀 ☀️",
    "新的一天，从记一笔开始 🌿",
    "早安，今天的小金库由你守护~",
  ],
  noon: ["午间小憩一下，别忘了记午餐 🍱", "午后记得复盘上午的花费哦"],
  afternoon: [
    "下午茶时间，理性消费更安心 🍵",
    "坚持记账的你超棒的，继续加油！",
  ],
  evening: [
    "晚上好，今天的花销都记下了吗 🌙",
    "睡前看看今日结余，安心入眠",
  ],
  late: ["夜深了，早点休息，明天再记 💤", "已经很晚了，放下手机睡吧"],
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
</script>

<style scoped lang="scss">
.profile-page {
  @include sj-theme-css-vars;
  width: 750rpx;
  height: 1624rpx;
  overflow: hidden;
  position: relative;
  margin: 0 auto;
  background: var(--g1);
}
.profile-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0 40rpx;
  z-index: 20;
}
.topbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx 20rpx;
  z-index: 10;
}
.back-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b8c7a;
  font-size: 32rpx;
  .back-icon {
    width: 50rpx;
    height: 36rpx;
  }
}
.topbar-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--ink);
}
.avatar-ring {
  width: 160rpx;
  height: 160rpx;
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
.avatar-emoji {
  font-size: 72rpx;
}
.profile-name {
  font-size: 36rpx;
  font-weight: 800;
  color: var(--ink);
}

/* 用户卡片（Uiverse.io by sahilxkhadka 改造·绿色系） */
.card {
  width: 684rpx;
  height: 368rpx;
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
  top: 12rpx;
  z-index: 100;
  cursor: pointer;
}
.cloud-icon {
  height: 180rpx;
  width: 180rpx;
  z-index: 20;
}
/* 左侧展开问候气泡（指向右上角图标，像图标在说话） */
.greet-bubble {
  position: absolute;
  right: 20rpx;
  top: 120rpx;
  z-index: 30;
  max-width: 0;
  padding: 0;
  overflow: hidden;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.92);
  border: 2rpx solid rgba(138, 233, 155, 0.6);
  border-radius: 24rpx;
  box-shadow: 0 6rpx 18rpx rgba(46, 92, 64, 0.15);
  opacity: 0;
  transform: translateX(-24rpx);
  transition: max-width 0.38s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.3s ease, transform 0.38s cubic-bezier(0.22, 1, 0.36, 1),
    padding 0.38s cubic-bezier(0.22, 1, 0.36, 1);
  cursor: pointer;
}
.greet-bubble.open {
  max-width: 460rpx;
  padding: 18rpx 24rpx;
  opacity: 1;
  transform: translateX(0);
  white-space: normal;
}
/* 尖角：指向右上方的图标 */
.greet-bubble.open::before {
  content: "";
  position: absolute;
  right: 40rpx;
  top: -14rpx;
  border: 8rpx solid transparent;
  border-bottom-color: rgba(255, 255, 255, 0.92);
}
.greet-text {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.4;
}
.card-user {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 28rpx;
}
.card-user-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.saved-amount {
  font-size: 30rpx;
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

.menu-group {
  margin-top: 32rpx;
}
.menu-title {
  font-size: 22rpx;
  color: var(--ink4);
  font-weight: 600;
  padding: 0 36rpx 16rpx;
  display: block;
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
</style>
