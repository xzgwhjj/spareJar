<script setup>
import { inject } from "vue";
const ctx = inject("ledger");
const {
  calSwapping,
  swapFrom,
  ovExpanded,
  swapTo,
  swapDir,
  onCalBtn,
  totalBalance,
  fmt,
  monthExpense,
  monthNet,
  ledgers,
  transactions,
  multiSelect,
  toggleMultiSelect,
  openNewLedger,
  ledgerViews,
  onCardClick,
  onCardLongPress,
  selectedIds,
  toggleSelect,
  coverErrors,
  defaultCoverUrl,
  coverDisplay,
  onCoverError,
  budgetWord,
  coverTheme,
  toggleMenu,
  cancelAction,
  openMenuId,
  actionTab,
  onMenuDelete,
  onMenuEdit,
  ovDim,
  setOvDim,
  ovKey,
  dayExpenseMap,
  dayIncomeMap,
  monthExpenseMap,
  monthIncomeMap,
  yearExpenseMap,
  yearIncomeMap,
  ovExpense,
  ovIncome,
  ovNet,
  ovLedgerCount,
  ovTxCount,
  assetModes,
  assetMode,
  assetDisplay,
  cash,
  invest,
  liab,
  investGain,
  ACCOUNTS,
  accIconUrls,
  goAssetMgr,
  goAssetDetail,
  repKeyLabel,
  openRepPop,
  ledgerOptions,
  onRepLedgerChange,
  repLedgerId,
  currentLedgerName,
  exportMonth,
  dashColor,
  dashArcLen,
  GAUGE_CIRC,
  DASH_DEFS,
  dashMetric,
  dashDisplayText,
  dashMom,
  momClass,
  momIco,
  dashMomText,
  setDashMetric,
  metricValOf,
  dashCompare,
  assetFocus,
  assetMain,
  assetCash,
  assetInvest,
  assetLiab,
  accountDist,
  focusAsset,
  trendIsMock,
  trendIncUp,
  trendExpUp,
  trendNetUp,
  trendFocus,
  trendChart,
  trendDotR,
  trendData,
  onBarTap,
  hoverMonthIdx,
  maxBar,
  catIsMock,
  donut,
  onRingSpin,
  onDonutMove,
  onDonutLeave,
  haloStyle,
  pointer,
  hoverCatIdx,
  donutUp,
  onSegTap,
  onSegEnter,
  onCatLeave,
  onRoseTouch,
  onRoseTouchEnd,
  catMax,
  repPop,
  closeRepPop,
  repDim,
  setRepDim,
  repKey,
  repDayExpenseMap,
  repDayIncomeMap,
  repMonthExpenseMap,
  repMonthIncomeMap,
  repYearExpenseMap,
  stockCount,
  stickerConsumeMonth,
  lowStockCount,
  goStickerLib,
  stockGrid,
  stickerImg,
  isStickerOut,
  stickerBgStyle,
  onStickerTap,
  onStickerLong,
  goStickerCreate,
  cdn,
  materialCount,
  materialGrid,
  customCount,
  customGrid,
  isStickerLow,
  repYearIncomeMap,
  onCatCardMove,
} = ctx;
</script>

<template>
<view>
        <!-- 资产模式切换 -->
        <view style="margin: 32rpx 32rpx 0">
          <view class="glass-thin" style="padding: 8rpx; display: flex; gap: 8rpx">
            <view
              v-for="m in assetModes"
              :key="m.id"
              :style="
                assetMode === m.id
                  ? 'flex:1;height:64rpx;border-radius:28rpx;font-size:22rpx;font-weight:700;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, var(--g4), var(--g5));color:#fff;transition:all .2s'
                  : 'flex:1;height:64rpx;border-radius:28rpx;font-size:22rpx;font-weight:700;display:flex;align-items:center;justify-content:center;background:transparent;color:var(--ink3);transition:all .2s'
              "
              @click="assetMode = m.id"
              >{{ m.label }}</view
            >
          </view>
        </view>

        <!-- 大数字 + 三列（总资产 / 总负债 / 投资收益） -->
        <view style="margin: 28rpx 32rpx 0">
          <view class="glass-thin" style="padding: 44rpx 36rpx">
            <view style="text-align: center; margin-bottom: 32rpx">
              <text style="font-size: 22rpx; color: var(--ink4)">
                {{
                  assetMode === "disposable"
                    ? "可支配资产"
                    : assetMode === "withInvest"
                    ? "含投资资产"
                    : "净资产"
                }}
              </text>
              <text
                style="
                  display: block;
                  font-size: 76rpx;
                  font-weight: 900;
                  letter-spacing: -3rpx;
                  margin-top: 8rpx;
                "
                :style="{ color: assetDisplay >= 0 ? 'var(--ink)' : 'var(--red-soft)' }"
                >{{ assetDisplay < 0 ? "-" : "" }}¥{{ fmt(Math.abs(assetDisplay)) }}</text
              >
            </view>
            <view
              style="
                display: flex;
                padding-top: 24rpx;
                border-top: 1rpx solid rgba(15, 28, 20, 0.06);
              "
            >
              <view style="flex: 1; text-align: center">
                <text
                  style="
                    display: block;
                    font-size: 20rpx;
                    color: var(--ink4);
                    margin-bottom: 6rpx;
                  "
                  >总资产</text
                >
                <text style="font-size: 28rpx; font-weight: 700; color: var(--g5)"
                  >¥{{ fmt(cash + invest) }}</text
                >
              </view>
              <view
                style="width: 1rpx; background: rgba(15, 28, 20, 0.07); margin: 0 8rpx"
              />
              <view style="flex: 1; text-align: center">
                <text
                  style="
                    display: block;
                    font-size: 20rpx;
                    color: var(--ink4);
                    margin-bottom: 6rpx;
                  "
                  >总负债</text
                >
                <text style="font-size: 28rpx; font-weight: 700; color: var(--red-soft)"
                  >¥{{ fmt(liab) }}</text
                >
              </view>
              <view
                style="width: 1rpx; background: rgba(15, 28, 20, 0.07); margin: 0 8rpx"
              />
              <view style="flex: 1; text-align: center">
                <text
                  style="
                    display: block;
                    font-size: 20rpx;
                    color: var(--ink4);
                    margin-bottom: 6rpx;
                  "
                  >投资收益</text
                >
                <text style="font-size: 28rpx; font-weight: 700; color: var(--amber2)"
                  >+¥{{ fmt(investGain) }}</text
                >
              </view>
            </view>
          </view>
        </view>

        <!-- 账户列表标题 + 管理入口 -->
        <view
          style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: 32rpx 36rpx 16rpx;
          "
        >
          <text style="font-size: 26rpx; font-weight: 700; color: var(--ink)"
            >账户列表</text
          >
          <view style="display: flex; align-items: center; gap: 4rpx" @click="goAssetMgr">
            <text style="font-size: 24rpx; color: var(--ink3)">管理</text>
            <text style="color: var(--ink4); font-size: 28rpx">›</text>
          </view>
        </view>

        <!-- 账户列表 -->
        <view style="margin: 0 32rpx">
          <view class="glass-thin" style="padding: 8rpx 32rpx">
            <view
              v-for="(a, i) in ACCOUNTS"
              :key="a._id"
              style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 24rpx 0;
              "
              :style="
                i < ACCOUNTS.length - 1
                  ? { borderBottom: '1rpx solid rgba(15,28,20,0.05)' }
                  : {}
              "
              @click="goAssetDetail(a)"
            >
              <view style="display: flex; align-items: center; gap: 20rpx">
                <view
                  style="
                    width: 80rpx;
                    height: 80rpx;
                    border-radius: 26rpx;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 40rpx;
                    flex-shrink: 0;
                    overflow: hidden;
                  "
                  :style="{ background: a.colorBg }"
                >
                  <image
                    v-if="a.iconFileID && accIconUrls[a.iconFileID]"
                    :src="accIconUrls[a.iconFileID]"
                    mode="aspectFill"
                    style="width: 100%; height: 100%"
                  />
                  <image
                    v-else
                    :src="a.icon"
                    mode="aspectFit"
                    style="width: 48rpx; height: 48rpx"
                  />
                </view>
                <view>
                  <text
                    style="
                      display: block;
                      font-size: 26rpx;
                      font-weight: 600;
                      color: var(--ink);
                    "
                    >{{ a.name }}</text
                  >
                  <text
                    style="
                      display: block;
                      font-size: 24rpx;
                      color: var(--ink4);
                      margin-top: 6rpx;
                    "
                    >{{ a.type }}</text
                  >
                </view>
              </view>
              <text
                style="font-size: 28rpx; font-weight: 800"
                :style="{ color: a.balance >= 0 ? 'var(--ink)' : 'var(--red-soft)' }"
                >{{ a.balance < 0 ? "-" : "" }}¥{{ fmt(Math.abs(a.balance)) }}</text
              >
            </view>
          </view>
        </view>
</view>
</template>

<style scoped lang="scss">
@import "../../../styles/ledger-tabs.scss";
</style>
