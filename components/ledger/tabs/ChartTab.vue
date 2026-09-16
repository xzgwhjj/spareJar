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
        <!-- 时间周期切换 + 账本筛选（复用既有日历维度 / picker） -->
        <view class="rep-toolbar">
          <view class="rep-key" @click="openRepPop">
            <text class="rep-key-label">{{ repKeyLabel }}</text>
            <text class="rep-ledger-caret">▾</text>
          </view>
          <picker
            mode="selector"
            :range="ledgerOptions"
            range-key="label"
            @change="onRepLedgerChange"
          >
            <view class="rep-ledger">
              <text>{{ repLedgerId ? currentLedgerName : "全部账本" }}</text>
              <text class="rep-ledger-caret">▾</text>
            </view>
          </picker>
          <view class="rep-export" @click="exportMonth">
            <text>导出</text>
          </view>
        </view>

        <!-- P0：动态收支仪表盘 -->
        <view class="glass-mid dash">
          <view class="dash-head">
            <text class="chart-ico">🎛️</text>
            <text class="chart-h-title">收支仪表盘</text>
            <view class="dash-live">
              <view class="dash-live-dot" />
              <text>实时</text>
            </view>
          </view>

          <!-- Gauge 主仪表（静态轨道用 image 引入 svg 文件，动态弧保留内联） -->
          <view class="dash-gauge" :style="{ '--dash-c': dashColor }">
            <image
              class="dash-track"
              src="/static/images/gauge-track.svg"
              mode="scaleToFill"
            />
            <svg viewBox="0 0 200 110" class="dash-svg">
              <defs>
                <filter id="gaugeGlow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="2" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="gaugeGrad" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stop-color="#38bdf8" />
                  <stop offset="100%" stop-color="#0ca678" />
                </linearGradient>
              </defs>
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                :stroke="dashMetric === 'expense' ? '#e8590c' : 'url(#gaugeGrad)'"
                stroke-width="16"
                stroke-linecap="round"
                :stroke-dasharray="`${dashArcLen} ${GAUGE_CIRC}`"
                class="dash-arc"
                filter="url(#gaugeGlow)"
              />
            </svg>
            <view class="dash-center">
              <text class="dash-center-label">{{ DASH_DEFS[dashMetric].label }}</text>
              <text class="dash-center-val" :style="{ color: dashColor }">{{
                dashDisplayText
              }}</text>
              <view class="mom" :class="momClass(dashMom)">
                <text class="mom-ico">{{ momIco(dashMom) }}</text>
                <text>{{ dashMomText }}</text>
              </view>
            </view>
          </view>

          <!-- 指标切换（联动） -->
          <view class="dash-metrics">
            <view
              v-for="(def, k) in DASH_DEFS"
              :key="k"
              class="dash-metric"
              :class="{ active: dashMetric === k }"
              :style="dashMetric === k ? { '--mc': def.color } : {}"
              @click="setDashMetric(k)"
            >
              <text class="dash-m-label">{{ def.label }}</text>
              <text class="dash-m-val">{{ metricValOf(k) }}</text>
            </view>
          </view>

          <!-- 本期 vs 上期 对比条 -->
          <view class="dash-compare">
            <view v-for="c in dashCompare" :key="c.label" class="dash-cmp-row">
              <text class="dash-cmp-label">{{ c.label }}</text>
              <view class="dash-cmp-track">
                <view
                  class="dash-cmp-fill"
                  :style="{
                    width: c.pct + '%',
                    background: c.label === '本期' ? dashColor : 'rgba(15,28,20,0.12)',
                  }"
                />
              </view>
              <text class="dash-cmp-val">¥{{ fmt(c.value) }}</text>
            </view>
          </view>
        </view>

        <!-- P1：未来科技资产面板 + 账户分布 -->
        <view class="tech-asset">
          <view class="tech-bg" />
          <view class="tech-scan" />
          <view class="tech-particle p1" />
          <view class="tech-particle p2" />
          <view class="tech-particle p3" />
          <view class="tech-particle p4" />
          <view class="tech-corner tl" />
          <view class="tech-corner tr" />
          <view class="tech-corner bl" />
          <view class="tech-corner br" />

          <view class="tech-head">
            <view class="tech-title">
              <view class="tech-pulse" />
              <text class="tech-title-text">资产净值</text>
            </view>
            <text class="tech-status">{{ assetFocus === "net" ? "实时" : "账户" }}</text>
          </view>

          <!-- 主读数（联动滚动） -->
          <view class="tech-main">
            <text class="tech-main-label" :style="{ color: assetMain.color }">{{
              assetMain.label
            }}</text>
            <text class="tech-main-val" :style="{ color: assetMain.color }">{{
              "¥" + fmt(Math.round(assetMain.v))
            }}</text>
          </view>

          <!-- 子指标 -->
          <view class="tech-subs">
            <view class="tech-sub">
              <text class="tech-sub-label">可用</text>
              <text class="tech-sub-val">¥{{ fmt(Math.round(assetCash.display)) }}</text>
            </view>
            <view class="tech-sub">
              <text class="tech-sub-label">投资</text>
              <text class="tech-sub-val"
                >¥{{ fmt(Math.round(assetInvest.display)) }}</text
              >
            </view>
            <view class="tech-sub">
              <text class="tech-sub-label">负债</text>
              <text class="tech-sub-val tech-liab"
                >¥{{ fmt(Math.round(assetLiab.display)) }}</text
              >
            </view>
          </view>

          <!-- 账户分布（霓虹流光条，点击联动） -->
          <view class="tech-dist">
            <view
              v-for="g in accountDist"
              :key="g.key"
              class="tech-dist-item"
              :class="{
                active: assetFocus === g.key,
                dim: assetFocus !== 'net' && assetFocus !== g.key,
              }"
              @click="focusAsset(g.key)"
            >
              <view class="tech-dist-top">
                <image class="tech-dist-ico" :src="g.icon" mode="aspectFit" />
                <text class="tech-dist-name">{{ g.name }}</text>
                <text class="tech-dist-val">¥{{ fmt(g.value) }}</text>
                <text class="tech-dist-pct">{{ g.pct }}%</text>
              </view>
              <view class="tech-dist-track">
                <view
                  class="tech-dist-fill"
                  :style="{
                    width: Math.max(4, g.pct) + '%',
                    background: g.accent,
                    boxShadow: '0 0 12rpx ' + g.accent,
                  }"
                >
                  <view class="tech-dist-sheen" />
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 月度收支趋势 -->
        <view class="glass-mid chart-card tech-trend-card">
          <view class="chart-head">
            <text class="chart-ico">📈</text>
            <text class="chart-h-title">近6个月收支趋势</text>
            <view v-if="trendIsMock" class="mock-badge">演示数据</view>
          </view>
          <!-- 聚焦月份实时汇总（数字滚动） -->
          <view class="trend-sum">
            <view class="trend-sum-item">
              <text class="trend-sum-label">收入</text>
              <text class="trend-sum-val inc">¥{{ fmt(trendIncUp.display) }}</text>
            </view>
            <view class="trend-sum-item">
              <text class="trend-sum-label">支出</text>
              <text class="trend-sum-val exp">¥{{ fmt(trendExpUp.display) }}</text>
            </view>
            <view class="trend-sum-item">
              <text class="trend-sum-label">结余</text>
              <text class="trend-sum-val net">¥{{ fmt(trendNetUp.display) }}</text>
            </view>
            <view class="trend-sum-month">{{ trendFocus.month }}</view>
          </view>
          <view class="tech-bar-area">
            <view class="tech-bar-grid" />
            <view class="bar-area">
              <!-- 叠加层：面积 + 折线 + 散点（与柱状图共用同一坐标系） -->
              <svg viewBox="0 0 300 240" class="trend-overlay" aria-hidden="true">
                <defs>
                  <linearGradient id="areaIncG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#25cc5d" stop-opacity="0.32" />
                    <stop offset="100%" stop-color="#25cc5d" stop-opacity="0.02" />
                  </linearGradient>
                  <linearGradient id="areaExpG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.28" />
                    <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0.02" />
                  </linearGradient>
                  <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.2" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path :d="trendChart.areaInc" fill="url(#areaIncG)" class="trend-area" />
                <path
                  :d="trendChart.areaExp"
                  fill="url(#areaExpG)"
                  class="trend-area trend-area-exp"
                />
                <path
                  :d="trendChart.lineInc"
                  fill="none"
                  class="trend-line line-inc"
                  filter="url(#lineGlow)"
                />
                <path
                  :d="trendChart.lineExp"
                  fill="none"
                  class="trend-line line-exp"
                  filter="url(#lineGlow)"
                />
                <circle
                  v-for="p in trendChart.points"
                  :key="'inc' + p.i"
                  :cx="p.x"
                  :cy="p.yInc"
                  :r="trendDotR(p.i)"
                  fill="#fff"
                  stroke="#25cc5d"
                  stroke-width="2"
                  class="trend-dot dot-inc"
                  :style="{ animationDelay: 0.3 + p.i * 0.12 + 's' }"
                />
                <circle
                  v-for="p in trendChart.points"
                  :key="'exp' + p.i"
                  :cx="p.x"
                  :cy="p.yExp"
                  :r="trendDotR(p.i)"
                  fill="#fff"
                  stroke="#0ea5e9"
                  stroke-width="2"
                  class="trend-dot dot-exp"
                  :style="{ animationDelay: 0.3 + p.i * 0.12 + 's' }"
                />
              </svg>
              <view
                v-for="(s, i) in trendData"
                :key="i"
                class="bar-col"
                @click="onBarTap(i)"
                :class="{ 'bar-col-hover': hoverMonthIdx === i }"
              >
                <view class="bar-pair">
                  <view
                    class="bar income-bar"
                    :style="{
                      height: Math.round((s.income / maxBar) * 220) + 'rpx',
                      opacity: hoverMonthIdx === -1 || hoverMonthIdx === i ? 1 : 0.35,
                      '--d': i * 0.1 + 's',
                    }"
                  />
                  <view
                    class="bar expense-bar"
                    :style="{
                      height: Math.round((s.expense / maxBar) * 220) + 'rpx',
                      opacity: hoverMonthIdx === -1 || hoverMonthIdx === i ? 1 : 0.35,
                      '--d': i * 0.1 + 's',
                    }"
                  />
                  <!-- 悬停提示：紧贴柱顶，随柱高/窗口实时同步 -->
                  <view v-if="hoverMonthIdx === i" class="bar-tip">
                    <view class="tip-row">
                      <view class="tip-dot inc" />
                      <text class="tip-label">收入</text>
                      <text class="tip-val inc">¥{{ fmt(s.income) }}</text>
                    </view>
                    <view class="tip-row">
                      <view class="tip-dot exp" />
                      <text class="tip-label">支出</text>
                      <text class="tip-val exp">¥{{ fmt(s.expense) }}</text>
                    </view>
                    <view class="tip-row">
                      <view class="tip-dot net" />
                      <text class="tip-label">结余</text>
                      <text class="tip-val net">¥{{ fmt(s.income - s.expense) }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
          <view class="bar-months">
            <text
              v-for="(s, i) in trendData"
              :key="i"
              class="bar-month-label"
              :class="{
                'bar-month-active':
                  hoverMonthIdx === i ||
                  (hoverMonthIdx === -1 && i === trendData.length - 1),
              }"
              >{{ s.month }}</text
            >
          </view>
          <view class="chart-legend">
            <view class="legend-item">
              <view class="legend-dot income-dot" />
              <text class="legend-text">收入</text>
            </view>
            <view class="legend-item">
              <view class="legend-dot expense-dot" />
              <text class="legend-text">支出</text>
            </view>
            <view class="legend-item">
              <view class="legend-dot trend-dot-legend inc" />
              <text class="legend-text">收入趋势</text>
            </view>
            <view class="legend-item">
              <view class="legend-dot trend-dot-legend exp" />
              <text class="legend-text">支出趋势</text>
            </view>
          </view>
        </view>

        <!-- 本月支出分类 -->
        <view class="glass-mid chart-card cat-card" @mousemove="onCatCardMove">
          <view class="cat-bg-grid" />
          <view class="cat-aurora cat-aurora-a" />
          <view class="cat-aurora cat-aurora-b" />
          <!-- 能量标题 -->
          <view class="cat-head">
            <view class="cat-eq" aria-hidden="true">
              <view
                v-for="n in 5"
                :key="n"
                class="cat-eq-bar"
                :style="{ animationDelay: n * 0.18 + 's' }"
              />
            </view>
            <view class="cat-head-t">
              <text class="cat-h-title">本月支出</text>
              <text class="cat-h-sub">ENERGY RING · {{ donut.segs.length }} 分类</text>
            </view>
            <view v-if="catIsMock" class="mock-badge">演示数据</view>
          </view>

          <view class="cat-stage">
            <!-- 左：动态扇形环（点击旋转、悬停高亮联动） -->
            <view
              class="donut-wrap"
              @click="onRingSpin"
              @mousemove="onDonutMove"
              @mouseleave="onDonutLeave"
            >
              <view class="donut-halo" :style="haloStyle" />
              <!-- 指针跟随光晕 -->
              <view
                v-if="pointer.show"
                class="donut-cursor"
                :style="{
                  left: pointer.x + 'px',
                  top: pointer.y + 'px',
                  background: pointer.color,
                }"
              />
              <!-- 南丁格尔玫瑰图：canvas 绘制（微信小程序不支持内联 svg，改用 2d canvas） -->
              <canvas
                id="roseCanvas"
                class="donut-canvas"
                type="2d"
                @touchstart="onRoseTouch"
                @touchmove="onRoseTouch"
                @touchend="onRoseTouchEnd"
              />
              <!-- 中心文字（HTML 覆盖层，三端通用） -->
              <view class="donut-core-glow" />
              <view class="donut-center">
                <transition name="fade-up" mode="out-in">
                  <text
                    :key="hoverCatIdx >= 0 ? 'n' + hoverCatIdx : 't'"
                    class="donut-c-name"
                    v-if="hoverCatIdx >= 0"
                    >{{ donut.segs[hoverCatIdx].name }}</text
                  >
                  <text :key="'t'" class="donut-c-label" v-else>本月支出</text>
                </transition>
                <text class="donut-c-val"
                  >¥{{
                    fmt(
                      hoverCatIdx >= 0 ? donut.segs[hoverCatIdx].value : donutUp.display
                    )
                  }}</text
                >
                <transition name="fade-up" mode="out-in">
                  <text
                    :key="hoverCatIdx >= 0 ? 'p' + hoverCatIdx : 'tp'"
                    class="donut-c-pct"
                    v-if="hoverCatIdx >= 0"
                    >{{ donut.segs[hoverCatIdx].pct }}%</text
                  >
                  <text :key="'tp'" class="donut-c-pct" v-else
                    >共 {{ donut.segs.length }} 类</text
                  >
                </transition>
              </view>
            </view>

            <!-- 右：呼吸感毛玻璃卡片列表 -->
            <view class="cat-list">
              <view
                v-for="(seg, i) in donut.segs"
                :key="seg.id"
                class="cat-g-card"
                :class="{
                  active: hoverCatIdx === i,
                  dim: hoverCatIdx !== -1 && hoverCatIdx !== i,
                }"
                :style="{ animationDelay: -i * 0.9 + 's' }"
                @click="onSegTap(i)"
                @mouseenter="onSegEnter(i)"
                @mouseleave="onCatLeave"
              >
                <view
                  class="cat-g-accent"
                  :style="{ background: seg.color, boxShadow: '0 0 12rpx ' + seg.color }"
                />
                <text class="cat-e-idx">{{ seg.idxStr }}</text>
                <view class="cat-e-body">
                  <view class="cat-e-top">
                    <view class="cat-e-name-wrap">
                      <text class="cat-e-name">{{ seg.name }}</text>
                    </view>
                    <text class="cat-e-val">¥{{ fmt(seg.value) }}</text>
                  </view>
                  <view class="cat-e-bottom">
                    <view class="cat-e-track">
                      <view
                        class="cat-e-fill"
                        :style="{
                          width:
                            Math.max(4, Math.round((seg.value / catMax) * 100)) + '%',
                          background:
                            'linear-gradient(90deg,' +
                            seg.color +
                            '66,' +
                            seg.color +
                            ')',
                          boxShadow: '0 0 14rpx ' + seg.color,
                        }"
                      />
                    </view>
                    <text class="cat-e-pct"
                      >{{ seg.pct }}%
                      <text
                        v-if="seg.mom !== null"
                        class="cat-e-mom"
                        :class="seg.mom >= 0 ? 'up' : 'down'"
                        >{{ seg.mom >= 0 ? "▲" : "▼" }}{{ Math.abs(seg.mom) }}%</text
                      ></text
                    >
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 周期选择弹层（复用 calendar-period-picker） -->
        <view v-if="repPop" class="rep-pop">
          <view class="rep-pop-mask" @click="closeRepPop" />
          <view class="rep-pop-sheet">
            <view class="rep-pop-head">
              <text class="rep-pop-title">选择周期</text>
              <view class="rep-dim rep-dim-pop">
                <view
                  v-for="d in [
                    { k: 'day', t: '日' },
                    { k: 'month', t: '月' },
                    { k: 'year', t: '年' },
                  ]"
                  :key="d.k"
                  class="rep-dim-item"
                  :class="{ active: repDim === d.k }"
                  @click="setRepDim(d.k)"
                  >{{ d.t }}</view
                >
              </view>
            </view>
            <scroll-view scroll-y class="rep-pop-body">
              <calendar-period-picker
                v-model="repKey"
                :dim="repDim"
                :day-expense-map="repDayExpenseMap"
                :day-income-map="repDayIncomeMap"
                :month-expense-map="repMonthExpenseMap"
                :month-income-map="repMonthIncomeMap"
                :year-expense-map="repYearExpenseMap"
                :year-income-map="repYearIncomeMap"
              />
            </scroll-view>
            <view class="rep-pop-foot">
              <view class="rep-pop-cancel" @click="closeRepPop">取消</view>
              <view class="rep-pop-ok" @click="closeRepPop">完成</view>
            </view>
          </view>
        </view>
</view>
</template>

<style scoped lang="scss">
@import "../../../styles/ledger-tabs.scss";
</style>
