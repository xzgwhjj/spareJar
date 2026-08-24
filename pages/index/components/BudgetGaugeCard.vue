<template>
  <view class="budget-gauge-card card-in-1" :class="cardClass" data-cmp="BudgetGaugeCard">
    <!-- 背景光晕 -->
    <view class="bg-glow" :class="{ 'over-glow': isOver }" />

    <!-- 标题行 -->
    <view class="gauge-header">
      <!-- 待：符合风格的余钱罐图标 -->
      <text class="gauge-header-title">今日余钱罐</text>
      <view
        class="limit-btn"
        v-if="dailyLimitFen > 0"
        @tap="goLimitSetting"
        hover-class="limit-btn--hover"
      >
        <!-- 待：符合风格的限额图标 -->
        <text class="limit-btn-text">限额 ¥{{ totalDailyLimitText }}</text>
        <text class="limit-btn-arrow">›</text>
      </view>
      <view
        class="limit-btn limit-btn--unset"
        v-else
        @tap="goLimitSetting"
        hover-class="limit-btn--hover"
      >
        <text class="limit-btn-text">未设置</text>
        <text class="limit-btn-arrow">›</text>
      </view>
      <view v-if="isOver" class="over-badge">
        <text class="over-badge-text">已超支</text>
      </view>
    </view>

    <!-- 罐体 + 悬浮 HUD -->
    <view class="jar-hud-area">
      <!-- 存钱罐 SVG -->
      <view class="jar-wrapper">
        <SavingsJar
          :pct="pct"
          :is-over="isOver"
          :left-pct="pct"
          :auto-cycle="!hasLimit"
        />
        <text class="jar-limit-text" v-if="dailyLimitFen > 0"
          >满额 ¥{{ dailyLimitText }}</text
        >
      </view>

      <!-- 悬浮面板 -->
      <view
        class="panel-float"
        :style="{
          outline: isOver
            ? '2rpx solid rgba(255,107,107,0.18)'
            : '2rpx solid rgba(var(--brand-rgb), 0.18)',
          boxShadow: isOver
            ? '0 16rpx 56rpx rgba(255,107,107,0.14),0 2px 8px rgba(0,0,0,0.05), inset 0 1.5px 0 rgba(255,255,255,0.98)'
            : '0 16rpx 56rpx rgba(var(--brand-rgb), 0.2),0 2px 8px rgba(0,0,0,0.07), inset 0 1.5px 0 rgba(255,255,255,0.98)',
        }"
      >
        <view class="hud-inner">
          <text class="hud-label">{{ hudLabel }}</text>
          <!-- 完整金额气泡（点击金额切换显示，定位在金额上方，无遮罩） -->
          <view v-if="showAmountTip" class="amount-tip" @tap.stop>
            <text class="amount-tip-value">¥{{ hudAmountFull }}</text>
          </view>
          <text
            class="hud-amount"
            :class="{ 'over-amount': isOver, tappable: hudAmountTappable }"
            @tap="toggleAmountTip"
            >¥{{ hudAmount }}</text
          >
          <text
            class="hud-spent"
            v-if="hasLimit"
            :class="{ tappable: limitTipTappable }"
            @tap="toggleLimitTip"
            >已用 ¥{{ spentText
            }}<template v-if="totalDailyLimitFen > 0">
              · 限额 ¥{{ totalDailyLimitText }}</template
            ></text
          >
          <!-- 限额说明气泡（点击“已用·限额”一行弹出，展示固定限额+结余限额=总限额） -->
          <view v-if="showLimitTip && limitTipTappable" class="limit-tip" @tap.stop>
            <text class="limit-tip-row">固定限额 ¥{{ dailyLimitText }}</text>
            <text class="limit-tip-row" v-if="pendingRolloverFen > 0"
              >+ 结余限额 ¥{{ pendingRolloverText }}</text
            >
            <view class="limit-tip-divider" v-if="pendingRolloverFen > 0" />
            <text class="limit-tip-row limit-tip-total"
              >= 总限额 ¥{{ totalDailyLimitText }}</text
            >
          </view>
          <view class="hud-bar" :class="{ 'over-bar': isOver, 'loop-bar': !hasLimit }">
            <!-- 循环模式下的粒子拖尾光点（已设限额时隐藏） -->
            <view v-if="!hasLimit" class="bar-head" />
            <view
              class="bar-grow-inner"
              :style="{
                width: hasLimit ? spentPct * 100 + '%' : null,
                background: isOver
                  ? 'linear-gradient(90deg,#ffb3b3,#ff6b6b)'
                  : 'linear-gradient(90deg,#89e59c,#25cc5d)',
              }"
            />
          </view>
        </view>
      </view>
    </view>

    <!-- 今日消费 chips -->
    <view class="stats-panel" v-if="BILLS.length > 0">
      <text class="stats-title">今日消费</text>
      <view class="stats-chips">
        <view
          v-for="b in BILLS"
          :key="b.id"
          class="stat-chip"
          :style="{ background: b.bg }"
        >
          <text>{{ b.icon }}</text>
          <text>¥{{ Math.abs(b.amount) }}</text>
        </view>
      </view>
      <text class="stats-total">
        共 <text class="strong">{{ BILLS.length }}</text> 笔 · 合计
        <text class="strong" :class="{ 'over-total': isOver }">¥{{ TOTAL_BILLS }}</text>
      </text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from "vue";
import { onHide, onUnload } from "@dcloudio/uni-app";
import SavingsJar from "./SavingsJar.vue";
import { useUserStore } from "@/stores/user.js";
import { formatFen, formatFenCompact } from "@/utils/money.js";

const props = defineProps({
  isOver: { type: Boolean, default: false },
});

const {
  state,
  categoryMap,
  dailyLimitFen,
  pendingRolloverFen,
  totalDailyLimitFen,
  spentTodayFen,
  leftTodayFen,
  isOverLimit,
} = useUserStore();

// 今日消费明细（真实账单前若干条，单行紧凑排列）
const BILLS = computed(() => {
  const map = categoryMap.value;
  return (state.dashboard.transactions || []).slice(0, 12).map((tx) => {
    const cat = tx.category_id ? map[String(tx.category_id)] : null;
    const income = tx.type === "income" || tx.type === "refund";
    const amountFen = typeof tx.amount === "number" ? tx.amount : 0;
    return {
      id: String(tx._id),
      icon: cat ? cat.icon : income ? "💰" : "📦",
      bg: income ? "#E6F7EC" : "#FFEAEA",
      amount: amountFen / 100,
    };
  });
});
const TOTAL_BILLS = computed(
  () =>
    (state.dashboard.transactions || []).reduce(
      (s, tx) => s + (typeof tx.amount === "number" ? Math.abs(tx.amount) : 0),
      0
    ) / 100
);

const over = computed(() => props.isOver || isOverLimit.value);
const dailyLimitText = computed(() => formatFen(dailyLimitFen.value));
const totalDailyLimitText = computed(() => formatFen(totalDailyLimitFen.value));
const pendingRolloverText = computed(() => formatFen(pendingRolloverFen.value));
const spentText = computed(() => formatFen(spentTodayFen.value));
const leftText = computed(() => formatFen(leftTodayFen.value));
// 未设限额时，悬浮面板展示"已用"金额；已设限额时展示"还可花"金额
const hasLimit = computed(() => totalDailyLimitFen.value > 0);
const hudLabel = computed(() => (hasLimit.value ? "还可花" : "已用"));
// 主显示：已设限额（还可花）用紧凑格式避免过长；未设限额（已用）用标准两位小数格式
// 完整金额用于点击气泡（hudAmountFull 始终为标准格式）
const hudAmount = computed(() =>
  hasLimit.value ? formatFenCompact(leftTodayFen.value) : formatFen(spentTodayFen.value)
);
const hudAmountFull = computed(() => (hasLimit.value ? leftText.value : spentText.value));
// 仅当显示值被缩写（≠完整值）时才允许点击查看完整金额
const hudAmountTappable = computed(() => hudAmount.value !== hudAmountFull.value);

// 完整金额气泡
const showAmountTip = ref(false);
const toggleAmountTip = () => {
  if (hudAmountTappable.value) showAmountTip.value = !showAmountTip.value;
};

// 限额说明气泡（固定限额 + 结余限额 = 总限额）
const showLimitTip = ref(false);
const limitTipTappable = computed(() => totalDailyLimitFen.value > 0);
const toggleLimitTip = () => {
  if (limitTipTappable.value) showLimitTip.value = !showLimitTip.value;
};

// 页面隐藏/卸载时自动收起气泡（用户离开当前页面）
onHide(() => {
  showAmountTip.value = false;
  showLimitTip.value = false;
});
onUnload(() => {
  showAmountTip.value = false;
  showLimitTip.value = false;
});

const pct = computed(() => {
  const limit = totalDailyLimitFen.value;
  if (!limit || limit <= 0) return 0;
  return Math.max(0, Math.min(leftTodayFen.value / limit, 1));
});
const spentPct = computed(() => {
  const limit = totalDailyLimitFen.value;
  if (!limit || limit <= 0) return 0;
  return Math.min(spentTodayFen.value / limit, 1);
});
const cardClass = computed(() =>
  over.value ? "glass-hero-alert alert-flash" : "glass-hero"
);

const goLimitSetting = () =>
  uni.navigateTo({ url: "/pages/limit-setting/limit-setting" });
</script>

<style lang="scss" scoped>
// 引入全局主题变量与 mixin（uni.scss 已在编译期自动注入）
.budget-gauge-card {
  // 注入主题 CSS 变量，使组件内可直接使用 var(--g5) 等
  @include sj-theme-css-vars;

  margin: 32rpx 32rpx 0;
  padding: 36rpx 28rpx 32rpx;
  position: relative;
  overflow: hidden;

  // 局部 scss 变量：把超支色与品牌色统一定义，便于复用
  $brand: var(--g5);
  $brand-light: var(--g3);
  $over: var(--red-soft);
  $over-bg: var(--red-bg);
  $ink-title: var(--ink-deep);
  $ink-muted: var(--ink4);
  $ink-sub: var(--ink3);

  .bg-glow {
    position: absolute;
    top: -100rpx;
    right: -100rpx;
    width: 400rpx;
    height: 400rpx;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(79, 217, 116, 0.08), transparent 65%);
    pointer-events: none;

    &.over-glow {
      background: radial-gradient(circle, rgba(255, 107, 107, 0.06), transparent 65%);
    }
  }

  .gauge-header {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 28rpx;

    &-icon {
      font-size: 28rpx;
      color: $brand;
    }
    &-title {
      font-size: 26rpx;
      font-weight: 700;
      color: $ink-title;
    }
  }

  .limit-btn {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8rpx;
    // background: $ink-muted;
    border-radius: 20rpx;
    padding: 8rpx 20rpx;
    cursor: pointer;

    &-icon {
      font-size: 22rpx;
      color: $brand;
    }
    &-text {
      font-size: 22rpx;
      color: $brand;
      font-weight: 600;
    }
    &-arrow {
      font-size: 28rpx;
      color: $brand-light;
    }

    // 未设置状态：复用中性灰阶变量，保持风格统一
    &--unset {
      background: rgba(120, 140, 160, 0.1);
      border: 2rpx dashed rgba(120, 140, 160, 0.35);

      .limit-btn-text {
        color: $ink-sub;
        font-weight: 600;
      }
      .limit-btn-arrow {
        color: $ink-muted;
      }
    }

    // 点击反馈（微信小程序 hover-class）
    &--hover {
      opacity: 0.7;
      transform: scale(0.97);
    }
  }

  .over-badge {
    display: flex;
    align-items: center;
    gap: 6rpx;
    background: rgba(255, 107, 107, 0.12);
    border-radius: 20rpx;
    padding: 8rpx 18rpx;

    &-text {
      font-size: 22rpx;
      color: $over;
      font-weight: 600;
    }
  }

  /* 罐体 + HUD */
  .jar-hud-area {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    min-height: 387rpx;
    padding-left: 16rpx;
  }
  .jar-wrapper {
    position: relative;
    z-index: 1;
    margin-left: -48rpx;
  }
  .jar-limit-text {
    margin-top: 4rpx;
    font-size: 20rpx;
    color: $ink-muted;
    text-align: center;
    display: block;
  }

  .panel-float {
    position: absolute;
    right: 0;
    bottom: 72rpx;
    z-index: 10;
    min-width: 260rpx;
    width: auto;
    max-width: 500rpx;
    padding: 20rpx 22rpx 16rpx;
    border-radius: 36rpx;
    // 更透的毛玻璃：顶部更亮、底部更透的雾感渐变
    background: linear-gradient(
      160deg,
      rgba(255, 255, 255, 0.62) 0%,
      rgba(255, 255, 255, 0.42) 100%
    );
    // 强模糊 + 提升饱和，使背后色彩透出更润
    backdrop-filter: blur(30px) saturate(160%);
    -webkit-backdrop-filter: blur(30px) saturate(160%);
    border: 2rpx solid rgba(255, 255, 255, 0.55);
    // 柔和外发光 + 顶部内高光，强化玻璃边缘
    box-shadow: 0 16rpx 56rpx rgba(37, 204, 93, 0.16), 0 4rpx 12rpx rgba(0, 0, 0, 0.06),
      inset 0 1.5rpx 0 rgba(255, 255, 255, 0.9), inset 0 -1rpx 0 rgba(255, 255, 255, 0.25);
    outline-offset: -1;
    animation: panel-float-kf 4.5s ease-in-out infinite;

    .hud-inner {
      position: relative;
      .hud-label {
        font-size: 20rpx;
        color: $ink-muted;
        font-weight: 500;
        margin-bottom: 4rpx;
        display: block;
      }
      .hud-amount {
        font-size: 60rpx;
        font-weight: 900;
        color: $brand;
        letter-spacing: -3rpx;
        line-height: 1.1;
        // 超长金额允许换行，不省略、不截断
        word-break: break-all;

        &.over-amount {
          color: $over;
        }
        &.tappable {
          cursor: pointer;
          position: relative;
        }
      }
      // 完整金额气泡（点击金额弹出，定位在金额上方，无遮罩、小尺寸）
      .amount-tip {
        position: absolute;
        left: 22rpx;
        bottom: 100%;
        margin-bottom: 12rpx;
        z-index: 30;
        padding: 12rpx 22rpx;
        border-radius: 18rpx;
        display: inline-flex;
        align-items: center;
        background: rgba(245, 255, 247, 0.92);
        animation: tip-pop-kf 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        border: 2rpx solid rgba(140, 233, 155, 0.7);
        box-shadow: 0 0 16rpx rgba(140, 233, 155, 0.35);
        backdrop-filter: blur(12px) saturate(160%);
        -webkit-backdrop-filter: blur(12px) saturate(160%);

        &-value {
          font-size: 30rpx;
          font-weight: 900;
          color: var(--g7);
          letter-spacing: -1rpx;
          word-break: break-all;
          white-space: nowrap;
        }
      }
      // 限额说明气泡（点击“已用·限额”一行弹出，展示 固定+结余=总限额）
      .limit-tip {
        position: absolute;
        left: 22rpx;
        bottom: 56rpx;
        z-index: 30;
        padding: 14rpx 22rpx;
        border-radius: 18rpx;
        display: flex;
        flex-direction: column;
        gap: 6rpx;
        min-width: 240rpx;
        max-width: 460rpx;
        background: rgba(245, 255, 247, 0.95);
        animation: tip-pop-kf 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        border: 2rpx solid rgba(140, 233, 155, 0.7);
        box-shadow: 0 0 16rpx rgba(140, 233, 155, 0.35);
        backdrop-filter: blur(12px) saturate(160%);
        -webkit-backdrop-filter: blur(12px) saturate(160%);

        &-row {
          font-size: 26rpx;
          font-weight: 600;
          color: var(--ink3);
          white-space: nowrap;
        }
        &-total {
          font-size: 28rpx;
          font-weight: 900;
          color: var(--g7);
        }
        &-divider {
          height: 2rpx;
          background: rgba(140, 233, 155, 0.5);
          margin: 2rpx 0;
        }
      }
      @keyframes tip-fade-kf {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes tip-pop-kf {
        from {
          opacity: 0;
          transform: translateY(36rpx) scale(0.92);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes premiumGradient {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }
      .hud-spent {
        font-size: 21rpx;
        color: $ink-sub;
        font-weight: 500;
        display: block;
        margin-bottom: 16rpx;
      }
      .hud-bar {
        margin-top: 16rpx;
        height: 10rpx;
        border-radius: 6rpx;
        background: rgba(var(--brand-rgb), 0.14);
        overflow: hidden;

        &.over-bar {
          background: rgba(255, 107, 107, 0.14);
        }
        // 未设限额：进度条循环跑动（0%→100%，单次 10s，无限重复）
        &.loop-bar {
          position: relative;
          // 呼吸光晕：整条轨道随跑动节奏轻微发光
          animation: bar-glow-kf 10s ease-in-out infinite;
          will-change: box-shadow;

          .bar-grow-inner {
            position: relative;
            transition: none;
            width: 0;
            border-radius: 6rpx;
            // 连续顺滑流动（ease-in-out 首尾柔和、中段匀速）
            animation: bar-loop-kf 10s ease-in-out infinite;
            will-change: width, transform;
            transform-origin: left center;
            // 液态形变：沿 x 轴轻微拉伸回弹，像被拉动的液柱
            animation-composition: add;
          }

          // 粒子拖尾光点：跟随进度头部移动 + 模糊拖尾
          .bar-head {
            position: absolute;
            top: 50%;
            // 居中到进度条头部位置（与 bar-grow-inner 右端重合，交融无边界）
            left: 0;
            width: 30rpx;
            height: 30rpx;
            margin-top: -15rpx;
            margin-left: -15rpx;
            border-radius: 50%;
            // 毛玻璃：半透明白底 + 背景模糊
            background: rgba(255, 255, 255, 0.32);
            backdrop-filter: blur(10rpx);
            -webkit-backdrop-filter: blur(10rpx);
            // 滤色混合：与下方绿色进度条颜色叠加交融，弱化交界
            mix-blend-mode: screen;
            // 多层柔光晕开，边界虚化、无硬边
            box-shadow: 0 0 10rpx 4rpx rgba(255, 255, 255, 0.55),
              0 0 22rpx 10rpx rgba(var(--brand-rgb), 0.55),
              inset 0 0 8rpx 2rpx rgba(255, 255, 255, 0.6);
            animation: bar-head-kf 10s ease-in-out infinite,
              bar-pulse-kf 1.6s ease-in-out infinite;
            will-change: transform, opacity;
          }
        }
        .bar-grow-inner {
          height: 100%;
          border-radius: 6rpx;
          transition: width 0.8s cubic-bezier(0.34, 1.2, 0.64, 1);
        }
      }

      // 连续顺滑流动：单条缓动 0%→100%，无分段停顿
      @keyframes bar-loop-kf {
        0% {
          width: 0%;
          transform: scaleX(1);
        }
        100% {
          width: 100%;
          transform: scaleX(1);
        }
      }

      // 呼吸光晕：轨道外发光强弱循环
      @keyframes bar-glow-kf {
        0%,
        100% {
          box-shadow: 0 0 0 0 rgba(var(--brand-rgb), 0);
        }
        50% {
          box-shadow: 0 0 16rpx 2rpx rgba(var(--brand-rgb), 0.28);
        }
      }

      // 光点跟随头部（与进度条连续流动同步）
      @keyframes bar-head-kf {
        0% {
          left: 0%;
        }
        100% {
          left: 100%;
        }
      }

      // 光点自身呼吸脉冲，强化方向反馈
      @keyframes bar-pulse-kf {
        0%,
        100% {
          opacity: 0.85;
          transform: scale(0.9);
        }
        50% {
          opacity: 1;
          transform: scale(1.15);
        }
      }
    }
  }

  /* 悬浮面板弹跳动画 */
  @keyframes panel-float-kf {
    0% {
      transform: rotate(2.5deg) translateY(0);
    }
    50% {
      transform: rotate(2.5deg) translateY(-6rpx);
    }
    100% {
      transform: rotate(2.5deg) translateY(0);
    }
  }

  /* 今日消费 */
  .stats-panel {
    margin-top: 24rpx;
  }
  .stats-title {
    font-size: 22rpx;
    color: $ink-muted;
    font-weight: 600;
    display: block;
    margin-bottom: 16rpx;
  }
  .stats-chips {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 12rpx;
    -webkit-overflow-scrolling: touch;
  }
  .stat-chip {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 6rpx;
    padding: 8rpx 18rpx;
    border-radius: 40rpx;
    font-size: 22rpx;
    font-weight: 600;
    color: $ink-title;
    white-space: nowrap;
  }
  .stats-total {
    margin-top: 16rpx;
    margin-bottom: 8rpx;
    font-size: 22rpx;
    color: $ink-muted;
    display: block;

    .strong {
      font-weight: 700;
      color: $ink-title;
    }
    .over-total {
      color: $over;
    }
  }
}
</style>
