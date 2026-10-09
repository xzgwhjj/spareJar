<template>
  <view class="index-root">
    <!-- 微信隐私协议弹窗（全局覆盖） -->
    <PrivacyPopup />
    <view class="index-page" data-cmp="Index">
      <!-- 极光背景 -->
      <view class="aurora-bg-wrap">
        <view class="aurora-bg-base" />
        <view class="aurora-top-halo" />
        <view class="aurora-band-1" />
        <view class="aurora-band-2" />
        <view class="blob-top-l" />
        <view class="blob-top-r" />
        <view class="blob-mid" />
        <view class="blob-bot" />
      </view>

      <!-- 刷新指示器 -->
      <view class="refresh-indicator" :class="{ visible: refreshing }">
        <view class="refresh-pill">
          <text class="spin-anim">⟳</text>
          <text class="refresh-text">正在刷新…</text>
        </view>
      </view>

      <!-- 顶部栏（吸顶固定，滑动时保持原位） -->
      <view class="topbar-sticky">
        <TopBar @refresh="handleRefresh" />
      </view>

      <!-- 可滚动内容区 -->
      <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false">
        <!-- 引导未完成提示条 -->
        <!-- 待：替换一个小狗拿着引导棒的图标 -->
        <view
          v-if="isLoggedIn && !onboardingDone"
          class="onboard-tip"
          @click="goOnboarding"
        >
          <image
            class="ot-icon"
            :src="cdn('/app_static/images/icon_newbie_setup.png')"
            mode="aspectFit"
          />
          <view class="ot-info">
            <text class="ot-title">完成新手设置，开启存钱之旅</text>
            <text class="ot-sub">设日限额，开启你的存钱循环</text>
          </view>
          <text class="ot-arrow">›</text>
        </view>

        <!-- Bento：余钱罐主视觉卡 + 心愿进度迷你卡（右格） -->
        <view class="bento">
          <view class="bento-jar">
            <BudgetGaugeCard :is-over="isOver" :over-kind="overLimitKind" />
          </view>
        </view>

        <!-- 盈余横幅 -->
        <SurplusBanner />

        <view class="bento">
          <view class="bento-wish">
            <WishMiniCard />
          </view>
        </view>

        <!-- 拍照识别记账（CTA）+ 存款池（含总余额）横排（1:2） -->
        <view class="quick-row">
          <!-- 拍照识别记账快速入口（阶段 9） -->
          <view class="quick-cell ocr-quick card-in-1" @click="goOcr">
            <image
              :src="cdn('/app_static/images/icon_recognize.png')"
              class="ocr-quick-icon"
              mode="aspectFit"
            ></image>
            <view class="ocr-quick-info">
              <text class="ocr-quick-title">拍照识别记账</text>
              <text class="ocr-quick-sub">小票 / 截图一键入账</text>
            </view>
          </view>

          <!-- 存款池（合并总余额） -->
          <view class="quick-cell savings-pool-band card-in-1">
            <view class="pool-inner"></view>
            <view class="glass-mid pool-row">
              <!-- 待：根据余钱罐和小狗的图，设计一个简版的图标 -->
              <image
                :src="cdn('/app_static/images/icon_spare_jar_simple.png')"
                class="pool-icon"
                mode="aspectFit"
              ></image>
              <view class="pool-info">
                <text class="pool-label">存款池余额</text>
                <text class="pool-amount">¥{{ savingsPoolText }}</text>
                <view class="pool-trend-item" v-if="saveStreak > 0">
                  <text class="trend-text">连续存款 {{ saveStreak }} 天</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 健康双轨 -->
        <HealthDualTrack />

        <!-- 首次记账情境引导（Onboarding 第3步下沉）：从未记过账时引导记第一笔 -->
        <view
          v-if="!hasAnyTx"
          class="first-record-guide card-in-1"
          @click="goFirstRecord"
        >
          <view class="frg-icon">💡</view>
          <view class="frg-info">
            <text class="frg-title">记下第一笔，看看结余怎么攒起来</text>
            <text class="frg-sub">每天没花完的钱会自动滚存，让存钱看得见</text>
          </view>
          <view class="frg-btn">记一笔</view>
        </view>

        <!-- 账单列表 -->
        <BillList />

        <view class="page-bottom-gap" />
      </scroll-view>
    </view>

    <TabBar :current="0" />

    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
  </view>
</template>

<script setup>
import TabBar from "@/components/tabbar/tabbar.vue";
import PrivacyPopup from "@/components/PrivacyPopup.vue";
import { ref, computed, onMounted } from "vue";
import BillList from "./components/BillList.vue";
import BudgetGaugeCard from "./components/BudgetGaugeCard.vue";
import HealthDualTrack from "./components/HealthDualTrack.vue";
import SurplusBanner from "./components/SurplusBanner.vue";
import TopBar from "./components/TopBar.vue";
import WishMiniCard from "./components/WishMiniCard.vue";
import { useUserStore } from "@/stores/user.js";
import { formatFen } from "@/utils/money.js";
import { todayDateKey, addDaysToDateKey } from "@/utils/date.js";
import { cdn } from "@/utils/cdn.js";

const {
  state,
  isLoggedIn,
  dailyLimitFen,
  spentTodayFen,
  leftTodayFen,
  isOverLimit,
  overLimitKind,
  savingsPoolBalanceFen,
  saveStreak,
  loadSaveStreakAction,
  refreshTodayDashboard,
  loadCategories,
  loadWishes,
  loadAssetAccounts,
  loadSurplusPool,
  loadSavingsPool,
  compensateDailySettlements,
  onboardingDone,
} = useUserStore();

const isOver = computed(() => isOverLimit.value);

// 阶段 10：总余额（全资产 = 可支配 + 投资 + 特殊资产）来自资产账户汇总
const totalBalanceFen = computed(() =>
  state.assetTotals ? state.assetTotals.full || 0 : 0
);
const savingsPoolText = computed(() => formatFen(savingsPoolBalanceFen.value || 0));

// 悬浮框总余额显示：直接显示完整金额
const balanceText = computed(() => formatFen(totalBalanceFen.value));

const goOnboarding = () => {
  uni.navigateTo({ url: "/pages/onboarding/onboarding" });
};

// 首次记账情境引导（Onboarding 第3步下沉）：从未记过账时，点此直达记账页
const hasAnyTx = computed(
  () => ((state.dashboard && state.dashboard.transactions) || []).length > 0
);
const goFirstRecord = () => {
  if (!isLoggedIn.value) {
    uni.navigateTo({
      url:
        "/pages/login/login?redirect=" +
        encodeURIComponent("/pages/add-record/add-record"),
    });
    return;
  }
  uni.navigateTo({ url: "/pages/add-record/add-record" });
};

const refreshing = ref(false);
const handleRefresh = async () => {
  refreshing.value = true;
  try {
    await Promise.all([
      refreshTodayDashboard({ force: true }),
      loadCategories(),
      loadWishes(),
    ]);
  } catch (err) {
    console.error("[index] 刷新看板失败", err);
  } finally {
    refreshing.value = false;
  }
};

onMounted(async () => {
  if (!isLoggedIn.value) return;

  try {
    // 先补跑“昨日”日终结算：本地无 cron，靠启动/进首页时补上，确保滚存已计入最新一天。
    // 必须在加载 surplusPool 之前 await 完成，否则看到的 roll 仍是旧的。
    const yesterdayKey = addDaysToDateKey(todayDateKey(), -1);
    await compensateDailySettlements(yesterdayKey).catch((e) =>
      console.warn("[index] 补跑昨日结算失败（已忽略）", e && e.message)
    );

    // 首页所需数据在 bootstrap 中已预加载；若缓存仍新鲜，直接复用避免重复请求
    const needDashboard =
      !state.dashboard.loadedAt || state.dashboard.dateKey !== todayDateKey();
    await Promise.all([
      needDashboard
        ? refreshTodayDashboard({ force: true })
        : Promise.resolve(state.dashboard.settlement),
      loadCategories(),
      loadWishes(),
      loadSaveStreakAction(),
      // 兜底：即便 bootstrap 因个别 loader 失败被中断，首页也确保把限额/余额所需数据补齐
      loadSurplusPool(),
      loadSavingsPool(),
    ]);
  } catch (err) {
    console.error("[index] 初始化看板失败", err);
  }
});

const goSurplusHistory = () => {
  uni.navigateTo({ url: "/pages/surplus-history/surplus-history" });
};

const goOcr = () => {
  if (!isLoggedIn.value) {
    uni.navigateTo({
      url: "/pages/login/login?redirect=" + encodeURIComponent("/pages/ocr/ocr"),
    });
    return;
  }
  uni.navigateTo({ url: "/pages/ocr/ocr" });
};

const onTotalBalancePlaceholder = () => {
  uni.navigateTo({ url: "/pages/asset-mgr/asset-mgr" });
};
</script>

<style scoped lang="scss">
.index-root {
  position: relative;
  min-height: 100vh;

  .index-page {
    /* 通过 CSS 自定义属性统一管理间距 / 圆角 / 字体，运行时可被外层主题覆盖 */
    --page-margin: 32rpx;
    --band-gap: 30rpx;
    --radius-pill: 40rpx;
    --radius-badge: 24rpx;
    --radius-icon: 28rpx;
    --font-family: "Inter", -apple-system, "PingFang SC", "Helvetica Neue", sans-serif;
    /* 渐变所需通道值（与主题 --g2/--g3 同源） */
    --g2-rgb: 194, 242, 200;
    --g3-rgb: 137, 229, 156;
    /* 顶部吸顶栏高度，用于滚动区抵消，避免内容被遮挡 */
    --topbar-h: 230rpx;
    /* 底部自定义 TabBar 高度（含安全区），用于滚动区留出空间 */
    --tabbar-h: calc(110rpx + env(safe-area-inset-bottom));

    max-width: 750rpx;
    min-height: 100vh;
    margin: 0 auto;
    overflow: hidden;
    position: relative;
    background: var(--g0);
    font-family: var(--font-family);

    .topbar-sticky {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      background: linear-gradient(
        180deg,
        rgba(244, 252, 247, 0.92) 0%,
        rgba(244, 252, 247, 0.78) 100%
      );
      backdrop-filter: blur(20rpx) saturate(180%);
      -webkit-backdrop-filter: blur(20rpx) saturate(180%);
    }

    .page-scroll {
      height: calc(100vh - var(--tabbar-h));
      padding-top: var(--topbar-h);
    }

    /* 引导未完成提示条 */
    .onboard-tip {
      display: flex;
      align-items: center;
      gap: 16rpx;
      margin: 40rpx var(--page-margin) 20rpx;
      padding: 20rpx 24rpx;
      border-radius: var(--radius-badge);
      background: linear-gradient(
        135deg,
        rgba(37, 204, 93, 0.1),
        rgba(37, 204, 93, 0.06)
      );
      border: 2rpx solid var(--g3);

      .ot-icon {
        width: 40rpx;
        height: 40rpx;
        flex-shrink: 0;
      }
      .ot-info {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      .ot-title {
        font-size: 26rpx;
        font-weight: 700;
        color: var(--ink);
      }
      .ot-sub {
        font-size: 20rpx;
        color: var(--g6);
        margin-top: 4rpx;
      }
      .ot-arrow {
        font-size: 36rpx;
        color: var(--g5);
      }
    }

    /* 首次记账情境引导卡 */
    .first-record-guide {
      display: flex;
      align-items: center;
      gap: 16rpx;
      margin: 20rpx var(--page-margin);
      padding: 28rpx 28rpx;
      border-radius: var(--radius-badge);
      background: linear-gradient(
        135deg,
        rgba(37, 204, 93, 0.12),
        rgba(37, 204, 93, 0.06)
      );
      border: 2rpx solid var(--g3);

      .frg-icon {
        font-size: 44rpx;
      }
      .frg-info {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      .frg-title {
        font-size: 28rpx;
        font-weight: 700;
        color: var(--ink);
      }
      .frg-sub {
        font-size: 20rpx;
        color: var(--g6);
        margin-top: 6rpx;
        line-height: 1.4;
      }
      .frg-btn {
        flex-shrink: 0;
        padding: 16rpx 32rpx;
        border-radius: var(--radius-pill);
        @include sj-brand-gradient;
        color: #fff;
        font-size: 26rpx;
        font-weight: 800;
      }
    }

    /* 刷新指示器 */
    .refresh-indicator {
      position: absolute;
      top: 32rpx;
      left: 50%;
      transform: translateX(-50%);
      z-index: 200;
      opacity: 0;
      transition: opacity 0.25s;
      pointer-events: none;

      &.visible {
        opacity: 1;
      }

      .refresh-pill {
        background: rgba(255, 255, 255, 0.94);
        border-radius: var(--radius-pill);
        padding: 12rpx 28rpx;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 12rpx;
        box-shadow: 0 8rpx 32rpx rgba(var(--brand-rgb), 0.14);

        .spin-anim {
          color: var(--g5);
          font-size: 26rpx;
        }
      }

      .refresh-text {
        font-size: 22rpx;
        color: var(--ink2);
      }
    }

    /* Bento：余钱罐主视觉卡（上）+ 心愿进度迷你卡（下），纵向堆叠互不干扰 */
    .bento {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 20rpx;
      margin: var(--band-gap) var(--page-margin) 0;

      .bento-jar {
        width: 100%;
        :deep(.budget-gauge-card) {
          margin: 0;
        }
      }
      .bento-wish {
        width: 100%;
        display: block;
        :deep(.wish-mini) {
          margin: 0;
          width: 100%;
        }
      }
    }

    /* 总余额（阶段 10 资产账户） */
    .total-balance-placeholder {
      margin: var(--band-gap) var(--page-margin) 0;
      padding: 24rpx 28rpx;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;

      .tb-left {
        display: flex;
        align-items: center;
        gap: 18rpx;
      }
      .tb-icon {
        font-size: 36rpx;
        width: 72rpx;
        height: 72rpx;
        border-radius: 22rpx;
        background: linear-gradient(
          135deg,
          rgba(194, 242, 200, 0.45),
          rgba(137, 229, 156, 0.3)
        );
        border: 2rpx solid rgba(137, 229, 156, 0.35);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .tb-info {
        display: flex;
        flex-direction: column;
      }
      .tb-label {
        font-size: 24rpx;
        color: var(--ink4);
      }
      .tb-amount {
        font-size: 32rpx;
        font-weight: 800;
        color: var(--ink);
        margin-top: 2rpx;
      }
      .tb-arrow {
        font-size: 36rpx;
        color: var(--g5);
      }
    }

    /* 首页快捷入口横排（1:1:2 圆角矩形） */
    .quick-row {
      display: flex;
      align-items: stretch;
      gap: 16rpx;
      margin: var(--band-gap) var(--page-margin) 0;
    }
    .quick-row > view {
      margin: 0;
    }
    .quick-cell {
      flex: 1.3;
      min-width: 0;
      border-radius: 24rpx;
      box-sizing: border-box;
      overflow: hidden;
    }
    .quick-cell.savings-pool-band {
      flex: 1.7;
      border-radius: 24rpx;
    }
    /* OCR 作为独立大按钮，保持横向 CTA 布局并整体居中 */
    .quick-row .ocr-quick {
      flex-direction: row;
      align-items: center;
      // justify-content: center;
      gap: 18rpx;
      background: var(--g1);
      border: 2rpx solid var(--g1);
      position: relative;
    }
    .quick-row .ocr-quick .ocr-quick-title {
      color: var(--ink);
    }
    .quick-row .ocr-quick .ocr-quick-sub {
      margin-top: 12rpx;
      color: var(--ink2);
    }
    .quick-row .ocr-quick .ocr-quick-arrow {
      color: var(--g5);
    }
    .quick-row .ocr-quick-icon {
      width: 150rpx;
      height: 110rpx;
    }

    /* 拍照识别记账快速入口（阶段 9） */
    .ocr-quick {
      margin: var(--band-gap) var(--page-margin) 0;
      padding: 24rpx 28rpx;
      display: flex;
      align-items: center;
      gap: 18rpx;
      cursor: pointer;

      .ocr-quick-icon {
        width: 150rpx;
        height: 110rpx;
        position: absolute;
        bottom: 10rpx;
        right: 10rpx;
        z-index: 0;
      }
      .ocr-quick-info {
        display: flex;
        flex-direction: column;
        z-index: 5;
      }
      .ocr-quick-title {
        font-size: 26rpx;
        font-weight: 700;
        color: var(--ink);
      }
      .ocr-quick-sub {
        font-size: 20rpx;
        color: var(--ink4);
        margin-top: 4rpx;
      }
      .ocr-quick-arrow {
        font-size: 36rpx;
        color: var(--g5);
      }
    }

    /* 存款池 */
    .savings-pool-band {
      margin: var(--band-gap) var(--page-margin) 0;
      background: rgba(255, 255, 255, 0.65);
      backdrop-filter: blur(32rpx) saturate(1.3);
      -webkit-backdrop-filter: blur(32rpx) saturate(1.3);
      border: 2rpx solid rgba(37, 204, 93, 0.55);
      border-radius: 36rpx;
      box-shadow: 0 4rpx 24rpx rgba(37, 204, 93, 0.06),
        inset 0 2rpx 0 rgba(255, 255, 255, 0.9);
      position: relative;

      // .pool-inner {
      //   width: 40rpx;
      //   height: 40rpx;
      //   border-radius: 14rpx 0 0 0;
      //   border-top: 5rpx solid var(--g5);
      //   border-left: 5rpx solid var(--g5);
      //   position: absolute;
      //   top: 5rpx;
      //   left: 5rpx;
      //   z-index: 10;
      // }

      .pool-row {
        padding: 28rpx 32rpx;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 24rpx;
        position: relative;
      }
    }

    .pool-icon {
      width: 150rpx;
      height: 116rpx;
      position: absolute;
      bottom: 10rpx;
      right: 10rpx;
      z-index: 0;
    }
    .pool-info {
      flex: 1;
      min-width: 0;
      z-index: 5;
    }

    .pool-label {
      font-size: 20rpx;
      color: var(--ink4);
      display: block;
      margin-bottom: 6rpx;
    }

    .pool-amount {
      font-size: 44rpx;
      font-weight: 900;
      color: var(--ink);
      letter-spacing: -1.6rpx;
      line-height: 1;
    }

    /* 总余额悬浮框（参考 BudgetGaugeCard.panel-float 毛玻璃风格） */
    .pool-balance-float {
      position: absolute;
      right: 10rpx;
      bottom: 10rpx;
      z-index: 10;
      min-width: 0;
      width: auto;
      max-width: 300rpx;
      padding: 16rpx 22rpx 14rpx;
      border-radius: 32rpx;
      background: linear-gradient(
        160deg,
        rgba(255, 255, 255, 0.2) 0%,
        rgba(255, 255, 255, 0.8) 100%
      );
      backdrop-filter: blur(44px);
      -webkit-backdrop-filter: blur(44px);
      border: 2rpx solid rgba(255, 255, 255, 0.8);
      cursor: pointer;

      .pbf-inner {
        position: relative;

        .pbf-label {
          font-size: 20rpx;
          color: var(--ink4);
          font-weight: 500;
          margin-bottom: 2rpx;
          display: block;
        }
        .pbf-amount {
          font-size: 40rpx;
          font-weight: 900;
          color: var(--g5);
          letter-spacing: -2rpx;
          line-height: 1.18;
          max-width: 100%;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
      }
    }
    .pool-trend-item {
      display: flex;
      align-items: center;
      gap: 6rpx;

      .trend-icon {
        font-size: 22rpx;
      }

      .trend-text {
        font-size: 20rpx;
        font-weight: 500;
        color: var(--g5);
      }
    }
    .pool-trend-box {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8rpx;
      z-index: 5;

      .pool-trend {
        display: flex;
        align-items: center;
        gap: 6rpx;
        cursor: pointer;

        .trend-text {
          font-size: 20rpx;
          color: var(--ink4);
        }

        .trend-arrow {
          font-size: 28rpx;
          color: var(--ink4);
        }
      }
    }

    /* 鼓励横幅 */
    .encourage-band {
      margin: var(--band-gap) var(--page-margin) 0;

      .encourage-inner {
        padding: 32rpx 36rpx;
      }

      .encourage-row {
        display: flex;
        align-items: center;
        gap: 16rpx;
      }
    }

    .encourage-title {
      font-size: 28rpx;
      font-weight: 700;
      color: var(--ink);
      display: block;
    }

    .encourage-sub {
      font-size: 22rpx;
      color: var(--ink3);
      display: block;
      margin-top: 4rpx;
    }

    .streak-badge {
      margin-left: auto;
      background: rgba(var(--brand-rgb), 0.1);
      border-radius: var(--radius-badge);
      padding: 8rpx 24rpx;

      text {
        font-size: 20rpx;
        color: var(--g5);
        font-weight: 700;
      }
    }

    .page-bottom-gap {
      height: 120rpx;
    }
  }
}
</style>
