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
<view class="ledger-tab">
        <!-- 总览卡片：默认简洁总览，点击展开日/月/年明细 -->
        <view class="overview-card"></view>
        <view
          class="overview-card-btn"
          :class="{ 'is-swapping': calSwapping, 'is-out': swapDir === 'out' }"
          @click="onCalBtn"
        >
          <view class="span-mother">
            <view
              v-for="(ch, i) in calSwapping
                ? swapFrom
                : ovExpanded
                ? '收起日历'
                : '查看日历'"
              :key="'m' + i"
              class="swap-ch"
              >{{ ch }}</view
            >
          </view>
          <view class="span-mother2">
            <view
              v-for="(ch, i) in calSwapping
                ? swapTo
                : ovExpanded
                ? '收起日历'
                : '查看日历'"
              :key="'n' + i"
              class="swap-ch"
              >{{ ch }}</view
            >
          </view>
        </view>
        <view class="card-1 glass-thin-2" style="margin: 84rpx 32rpx 0">
          <!-- 收起态：总余额 + 本月结余 -->
          <view v-show="!ovExpanded">
            <view class="summary-row">
              <view>
                <text class="summary-label">全部账本总余额</text>
                <text class="summary-amount">¥{{ fmt(totalBalance) }}</text>
              </view>
              <view style="text-align: right">
                <text class="summary-label">本月消费</text>
                <text class="summary-amount" style="color: var(--ink)"
                  >¥{{ fmt(monthExpense) }}</text
                >
              </view>
            </view>

            <view class="summary-stats">
              <view class="stat-item">
                <text class="stat-label">账本</text>
                <text class="stat-value">{{ ledgers.length }}本</text>
              </view>
              <view class="stat-item">
                <text class="stat-label">记录</text>
                <text class="stat-value">{{ transactions.length }}笔</text>
              </view>
              <view class="stat-item">
                <text class="stat-label">本月结余</text>
                <text
                  class="stat-value"
                  :style="{ color: monthNet >= 0 ? 'var(--g4)' : 'var(--red-soft)' }"
                  >{{ monthNet >= 0 ? "+" : "-" }}¥{{ fmt(Math.abs(monthNet)) }}</text
                >
              </view>
            </view>
          </view>

          <!-- 展开态：日/月/年视图切换 -->
          <view v-show="ovExpanded" class="ov-body">
            <view class="ov-head">
              <view>
                <text class="summary-label">全部账本总余额</text>
                <text class="summary-amount">¥{{ fmt(totalBalance) }}</text>
              </view>
              <view class="seg">
                <view
                  class="seg-item"
                  :class="{ active: ovDim === 'day' }"
                  @click="setOvDim('day')"
                  >日</view
                >
                <view
                  class="seg-item"
                  :class="{ active: ovDim === 'month' }"
                  @click="setOvDim('month')"
                  >月</view
                >
                <view
                  class="seg-item"
                  :class="{ active: ovDim === 'year' }"
                  @click="setOvDim('year')"
                  >年</view
                >
              </view>
            </view>

            <calendar-period-picker
              v-model="ovKey"
              :dim="ovDim"
              :day-expense-map="dayExpenseMap"
              :day-income-map="dayIncomeMap"
              :month-expense-map="monthExpenseMap"
              :month-income-map="monthIncomeMap"
              :year-expense-map="yearExpenseMap"
              :year-income-map="yearIncomeMap"
            />

            <scroll-view class="ov-scroll" scroll-x>
              <view class="ov-track">
                <view class="ov-chip">
                  <text class="ov-chip-label">支出</text>
                  <text class="ov-chip-val" style="color: var(--red-soft)"
                    >-¥{{ fmt(ovExpense) }}</text
                  >
                </view>
                <view class="ov-chip">
                  <text class="ov-chip-label">收入</text>
                  <text class="ov-chip-val" style="color: var(--g5)"
                    >+¥{{ fmt(ovIncome) }}</text
                  >
                </view>
                <view class="ov-chip">
                  <text class="ov-chip-label">结余</text>
                  <text
                    class="ov-chip-val"
                    :style="{ color: ovNet >= 0 ? 'var(--g5)' : 'var(--red-soft)' }"
                    >{{ ovNet >= 0 ? "+" : "-" }}¥{{ fmt(Math.abs(ovNet)) }}</text
                  >
                </view>
                <view class="ov-chip">
                  <text class="ov-chip-label">账本</text>
                  <text class="ov-chip-val" style="color: var(--amber2)"
                    >{{ ovLedgerCount }}本</text
                  >
                </view>
                <view class="ov-chip">
                  <text class="ov-chip-label">记录</text>
                  <text class="ov-chip-val" style="color: var(--blue)"
                    >{{ ovTxCount }}笔</text
                  >
                </view>
              </view>
            </scroll-view>
          </view>
        </view>

        <!-- 账本列表标题 -->
        <view class="section-header">
          <view class="section-title-grp">
            <!-- 待：图标替换，叠起来的书本图标 -->
            <text class="section-icon">📚</text>
            <text class="section-title">{{ multiSelect ? "选择账本" : "我的账本" }}</text>
          </view>
          <view class="header-actions">
            <view
              class="select-btn"
              :class="{ active: multiSelect }"
              @click="toggleMultiSelect"
            >
              <text>{{ multiSelect ? "完成" : "删除" }}</text>
            </view>
            <view v-if="!multiSelect" class="add-btn" @click="openNewLedger">
              <text>+ 新增账本</text>
            </view>
          </view>
        </view>

        <!-- 账本列表（列表布局）。
             外层 scroll-view 在账本数量超出可视区时独立纵向滚动（性能优化：enhanced + 隐藏滚动条）；
             数据较少时 max-height 不触发，高度自适应，不出现多余空白滚动区 -->
        <scroll-view
          class="ledger-list-scroll"
          scroll-y
          enhanced
          :show-scrollbar="false"
          enable-flex
        >
          <view class="ledger-list is-list">
            <view v-for="l in ledgerViews" :key="l._id" class="ledger-card-wrap">
              <!-- <view class="ledger-card-bg"></view> -->
              <view
                class="ledger-card card-item"
                @click="onCardClick(l)"
                @longpress="onCardLongPress(l)"
                hover-class="ledger-card--pressed"
              >
                <!-- 多选模式：卡片左侧复选框（仿 Uiverse radio-button，总账本不可选） -->
                <label
                  v-if="multiSelect && !l.is_system"
                  class="ledger-check"
                  :class="{ checked: selectedIds.includes(l._id) }"
                  @click.stop="toggleSelect(l)"
                >
                  <input
                    class="ledger-check-input"
                    type="checkbox"
                    :id="'chk-' + l._id"
                    :checked="selectedIds.includes(l._id)"
                  />
                  <span class="ledger-check-custom"></span>
                </label>
                <!-- 底层内容：封面 + 信息 + 操作入口（始终渲染，正常态显示） -->
                <!-- 封面图：列表模式作为左侧封面块 -->
                <image
                  :src="
                    coverErrors[l._id]
                      ? defaultCoverUrl
                      : coverDisplay(l) || defaultCoverUrl
                  "
                  mode="aspectFill"
                  class="ledger-cover"
                  @error="onCoverError(l)"
                ></image>
                <!-- 右侧内容栏：名称+类型 与 收支同处一行（左名右收支），进度条在下方 -->
                <view class="ledger-body">
                  <!-- 毛玻璃面板容器，收纳名称/收支/进度条等字段 -->
                  <view class="ledger-panel">
                    <view class="ledger-row">
                      <view class="ledger-info">
                        <view class="ledger-name-row">
                          <text class="ledger-name">{{ l.name }}</text>
                          <!-- 类型徽标：仅主账本显示"主"；子账本不显示 -->
                          <text v-if="l.type === 'master'" class="ledger-type master"
                            >主</text
                          >
                        </view>
                        <text class="ledger-meta"
                          >{{ l.members }}人 · {{ l.records }}条</text
                        >
                      </view>
                      <view class="ledger-balance">
                        <text class="balance-num inc">-¥{{ fmt(l.expense) }}</text>
                        <text class="balance-sub exp">+¥{{ fmt(l.income) }}</text>
                      </view>
                      <!-- 待：图标替换 -->
                    </view>
                    <view class="ledger-bar-wrap">
                      <view class="ledger-bar-label" :class="{ 'is-over': l.pct >= 100 }">
                        <text class="bar-dim">{{ budgetWord(l.dim) }}</text>
                        <text class="bar-val"
                          >¥{{ fmt(l.spent) }} / ¥{{ fmt(l.limit) }} ({{ l.pct }}%)</text
                        >
                      </view>
                      <view
                        class="ledger-bar"
                        :style="{ '--base': coverTheme(l) || l.color }"
                      >
                        <view
                          class="ledger-bar-fill"
                          :class="{ 'is-over': l.pct >= 100 }"
                          :style="{ width: l.pct + '%' }"
                        />
                      </view>
                    </view>
                  </view>
                </view>
                <!-- 操作入口：右上角「⋯」更多按钮（点击或长按卡片均可就地切换操作形态） -->
                <view
                  v-if="!multiSelect"
                  class="ledger-more-float"
                  @click.stop="toggleMenu(l)"
                  hover-class="ledger-more-hover"
                >
                  <text class="ledger-more-dot">⋯</text>
                </view>
                <!-- 操作形态：覆盖账本内容的遮罩层，正中居中 tabs 操作按钮（仿 Uiverse tabs+glider） -->
                <view
                  v-if="!multiSelect && openMenuId === l._id"
                  class="ledger-action"
                  @click.stop="cancelAction"
                >
                  <view class="tabs" @click.stop>
                    <view
                      v-if="l.type !== 'master'"
                      class="tab"
                      :class="{ active: actionTab === 'delete' }"
                      @click.stop="onMenuDelete(l)"
                      >删除</view
                    >
                    <view
                      class="tab"
                      :class="{ active: actionTab === 'edit' }"
                      @click.stop="onMenuEdit(l)"
                      >编辑</view
                    >
                    <view
                      class="glider"
                      :class="
                        l.type === 'master'
                          ? 'gl-left'
                          : actionTab === 'delete'
                          ? 'gl-left'
                          : 'gl-right'
                      "
                    >
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
</view>
</template>

<style scoped lang="scss">
@import "../../../styles/ledger-tabs.scss";
</style>
