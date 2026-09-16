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
    <!-- 贴纸统计条 -->
    <view class="sticker-stats glass-thin" style="margin: 24rpx 32rpx 0">
      <view class="sticker-stat">
        <text class="ss-val">{{ stockCount }}</text>
        <text class="ss-label">囤货种类</text>
      </view>
      <view class="sticker-stat">
        <text class="ss-val" style="color: var(--g4)">{{
          stickerConsumeMonth.count
        }}</text>
        <text class="ss-label">本月消耗(笔)</text>
      </view>
      <view class="sticker-stat">
        <text class="ss-val" style="color: #f59e0b">{{ lowStockCount }}</text>
        <text class="ss-label">库存紧张</text>
      </view>
    </view>

    <!-- 囤货贴纸卡片：最常用两行（3列×2行=6个） -->
    <view class="sticker-card-block">
      <view class="sticker-card-head">
        <view class="sticker-card-title">
          <text class="sticker-card-ico">📦</text>
          <text class="sticker-card-name">囤货贴纸</text>
          <text class="sticker-card-count">{{ stockCount }}</text>
        </view>
        <view class="sticker-card-more" @click="goStickerLib('stock')">
          <text>更多</text>
          <text class="sticker-more-arrow">›</text>
        </view>
      </view>
      <view class="sticker-grid">
        <view
          v-for="s in stockGrid"
          :key="s._id"
          class="sticker-chip sticker-item"
          :class="{ 'sticker-out': isStickerOut(s) }"
          :style="stickerBgStyle"
          @click="onStickerTap(s)"
          @longpress="onStickerLong(s)"
        >
          <image
            v-if="stickerImg(s)"
            class="sticker-thumb"
            :src="stickerImg(s)"
            mode="aspectFit"
          />
          <view v-else class="sticker-thumb sticker-thumb-ph">🏷️</view>
          <view v-if="isStickerLow(s)" class="sticker-badge low">库存紧张</view>
          <view v-if="isStickerOut(s)" class="sticker-badge out">需补货</view>
        </view>
        <view v-if="stockGrid.length === 0" class="sticker-empty sticker-empty-sm">
          <image
            class="sticker-empty-icon"
            :src="cdn('/app_static/images/icon_no_stock_sticker.png')"
            mode="aspectFit"
          />
          <text class="sticker-empty-text">还没有囤货贴纸</text>
          <view class="sticker-empty-btn" @click="goStickerCreate('stock')">＋ 新建</view>
        </view>
      </view>
    </view>

    <!-- 分类贴纸卡片：最常用两行 -->
    <view class="sticker-card-block">
      <view class="sticker-card-head">
        <view class="sticker-card-title">
          <text class="sticker-card-ico">🗂️</text>
          <text class="sticker-card-name">分类贴纸</text>
          <text class="sticker-card-count">{{ materialCount }}</text>
        </view>
        <view class="sticker-card-more" @click="goStickerLib('material')">
          <text>更多</text>
          <text class="sticker-more-arrow">›</text>
        </view>
      </view>
      <view class="sticker-grid">
        <view
          v-for="s in materialGrid"
          :key="s._id"
          class="sticker-chip sticker-item"
          :style="stickerBgStyle"
          @click="s.kind === 'category' ? goStickerLib('material') : onStickerTap(s)"
          @longpress="s.kind === 'category' ? null : onStickerLong(s)"
        >
          <image
            v-if="stickerImg(s)"
            class="sticker-thumb"
            :src="stickerImg(s)"
            mode="aspectFit"
          />
          <view v-else class="sticker-thumb sticker-thumb-ph">{{
            s.kind === "category" ? s.icon || "🗂️" : "🖼️"
          }}</view>
        </view>
        <view v-if="materialGrid.length === 0" class="sticker-empty sticker-empty-sm">
          <image
            class="sticker-empty-icon"
            :src="cdn('/app_static/images/icon_no_category_sticker.png')"
            mode="aspectFit"
          />
          <text class="sticker-empty-text">还没有分类贴纸</text>
          <view class="sticker-empty-btn" @click="goStickerCreate('material')"
            >＋ 新建</view
          >
        </view>
      </view>
    </view>

    <!-- 用户上传贴纸卡片：最常用两行（单独拍摄 + AI 组合） -->
    <view class="sticker-card-block">
      <view class="sticker-card-head">
        <view class="sticker-card-title">
          <text class="sticker-card-ico">⬆️</text>
          <text class="sticker-card-name">我的上传</text>
          <text class="sticker-card-count">{{ customCount }}</text>
        </view>
        <view class="sticker-card-more" @click="goStickerLib('custom')">
          <text>更多</text>
          <text class="sticker-more-arrow">›</text>
        </view>
      </view>
      <view class="sticker-grid">
        <view
          v-for="s in customGrid"
          :key="s._id"
          class="sticker-chip sticker-item"
          :style="stickerBgStyle"
          @click="onStickerTap(s)"
          @longpress="onStickerLong(s)"
        >
          <image
            v-if="stickerImg(s)"
            class="sticker-thumb"
            :src="stickerImg(s)"
            mode="aspectFit"
          />
          <view v-else class="sticker-thumb sticker-thumb-ph">⬆️</view>
          <view v-if="s.combo_type === 'combo'" class="sticker-badge combo">AI组合</view>
        </view>
        <view v-if="customGrid.length === 0" class="sticker-empty sticker-empty-sm">
          <image
            class="sticker-empty-icon"
            :src="cdn('/app_static/images/icon_create_sticker.png')"
            mode="aspectFit"
          />
          <text class="sticker-empty-text">上传或组合你的贴纸</text>
          <view class="sticker-empty-btn" @click="goStickerCreate('custom')"
            >＋ 上传</view
          >
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@import "../../../styles/ledger-tabs.scss";
</style>
