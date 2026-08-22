<template>
  <!-- 待：所有图标都替换一下 -->
  <view class="wish-page" data-cmp="WishPage" @click="showMonthlyBubble = false">
    <!-- 极光背景 -->
    <view class="aurora-bg-wrap">
      <view class="aurora-bg-base" />
      <view class="aurora-band-1" />
      <view class="blob-top-l" />
      <view class="blob-top-r" />
    </view>

    <view class="wish-header">
      <!-- 顶部 -->
      <view class="topbar">
        <view class="topbar-main">
          <text class="topbar-title">心愿罐 🌟</text>
          <text class="topbar-sub">一点一点，实现你的梦</text>
        </view>
        <view class="add-btn add-btn-pulse" @click="showNewWish = true">
          <text class="add-btn-icon">＋</text>
        </view>
      </view>
      <!-- 待：卡片右上角画一个小狗，一个拿着星星的小狗图，为了替换上面的添加，星星上面要有加号 -->

      <!-- 存款池卡片 -->
      <view class="pool-card-wrap">
        <view class="wish-pool-card pool-float" @click="openSavings('deposit')">
          <view class="pool-glow glow-a" />
          <view class="pool-glow glow-b" />

          <view class="pool-card-inner">
            <!-- 标题行 -->
            <view class="pool-head">
              <view class="pool-head-left">
                <!-- 待：替换成小狗往储蓄罐里面存钱的图标 -->
                <view class="pool-icon">🐷</view>
                <view>
                  <text class="pool-title">通用存款池</text>
                  <text class="pool-sub">点击存入 · 取出</text>
                </view>
              </view>
              <view class="pool-head-right" @click.stop="toggleMonthlyBubble">
                <text
                  class="pool-trend-icon"
                  :class="monthlySavedFen >= 0 ? 'up' : 'down'"
                  >{{ monthlySavedFen >= 0 ? "▲" : "▼" }}</text
                >
                <text class="pool-trend-val"
                  >{{ monthlySavedFen >= 0 ? "+" : "-" }}¥{{
                    formatFen(Math.abs(monthlySavedFen))
                  }}
                  本月</text
                >
                <text class="pool-arrow">›</text>
                <view v-if="showMonthlyBubble" class="monthly-bubble" @click.stop>
                  <text class="monthly-bubble-title">本月累计存款</text>
                  <view class="monthly-bubble-row">
                    <text class="monthly-bubble-label">心愿存入</text>
                    <text class="monthly-bubble-val"
                      >+¥{{ formatFen(monthlyWishFen) }}</text
                    >
                  </view>
                  <view class="monthly-bubble-row">
                    <text class="monthly-bubble-label">存款池存入</text>
                    <text class="monthly-bubble-val"
                      >+¥{{ formatFen(monthlyPoolFen) }}</text
                    >
                  </view>
                  <view class="monthly-bubble-divider" />
                  <view class="monthly-bubble-row">
                    <text class="monthly-bubble-label">合计</text>
                    <text class="monthly-bubble-val total"
                      >+¥{{ formatFen(monthlySavedFen) }}</text
                    >
                  </view>
                </view>
              </view>
            </view>

            <!-- 余额 + 汇总 -->
            <view class="pool-balance-row">
              <view>
                <text class="pool-balance-label">存款池余额</text>
                <text class="pool-balance-val">¥{{ savingsBalance }}</text>
              </view>
              <view class="pool-summary">
                <text class="pool-summary-label">心愿进行中</text>
                <text class="pool-summary-val">{{ activeCount }} 个</text>
                <text class="pool-summary-sub">共存 ¥{{ formatFen(totalSavedFen) }}</text>
              </view>
            </view>

            <!-- 总体进度 -->
            <view v-if="totalTargetFen > 0" class="pool-progress">
              <view class="pool-progress-head">
                <text class="pool-progress-label">总进度</text>
                <text class="pool-progress-pct">{{ totalPct }}%</text>
              </view>
              <view class="wish-progress-track">
                <view class="wish-progress-fill" :style="{ width: totalPct + '%' }" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 心愿分类切换 -->
      <view class="wish-tabs">
        <view
          class="wish-tab"
          :class="viewTab === 'active' ? 'wish-tab-active' : 'wish-tab-idle'"
          @click="switchTab('active')"
        >
          <text class="wish-tab-icon">🎁</text>
          <text>进行中</text>
          <text v-if="activeWishes.length > 0" class="wish-tab-count"
            >({{ activeWishes.length }})</text
          >
        </view>
        <view
          class="wish-tab"
          :class="viewTab === 'archived' ? 'wish-tab-active' : 'wish-tab-idle'"
          @click="switchTab('archived')"
        >
          <text class="wish-tab-icon">📦</text>
          <text>历史心愿</text>
          <text v-if="archivedWishes.length > 0" class="wish-tab-count"
            >({{ archivedWishes.length }})</text
          >
        </view>
      </view>

      <!-- 历史心愿二级筛选 -->
      <view v-if="viewTab === 'archived'" class="archived-filter">
        <view
          class="archived-filter-chip"
          :class="{ active: archivedFilter === '' }"
          @click="switchArchivedFilter('')"
        >
          全部</view
        >
        <view
          class="archived-filter-chip"
          :class="{ active: archivedFilter === 'completed' }"
          @click="switchArchivedFilter('completed')"
          >已达成</view
        >
        <view
          class="archived-filter-chip"
          :class="{ active: archivedFilter === 'deleted' }"
          @click="switchArchivedFilter('deleted')"
          >已删除</view
        >
        <view
          class="archived-filter-chip"
          :class="{ active: archivedFilter === 'expired' }"
          @click="switchArchivedFilter('expired')"
          >已过期</view
        >
      </view>
    </view>

    <scroll-view
      class="page-scroll wish-scroll"
      scroll-y
      enhanced
      :show-scrollbar="false"
      style="
        position: relative;
        z-index: 10;
        flex: 1;
        min-height: 0;
        width: calc(100% - 88rpx);
        white-space: normal;
        margin: 24rpx 44rpx 0;
        padding-bottom: calc(110rpx + env(safe-area-inset-bottom));
      "
    >
      <!-- 内容根容器：约束宽度，杜绝横向溢出（微信 scroll-view 对 flex 子项溢出不裁剪） -->
      <view class="wish-scroll-inner">
        <!-- 空态（沿用原样式） -->
        <view
          v-if="!displayWishes.length"
          class="wish-empty glass-thin"
          style="
            height: 100%;
            margin: 16rpx 32rpx;
            padding: 48rpx;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          "
        >
          <view class="wish-empty-ph" />
          <text class="wish-empty-text">{{
            viewTab === "archived" ? "还没有历史心愿" : "还没有心愿"
          }}</text>
          <text v-if="viewTab === 'active'" class="wish-empty-sub"
            >点击上方「通用存款池」卡片右上角的星星小狗按钮，建一个心愿吧</text
          >
        </view>

        <!-- 不规则双列瀑布流 -->
        <view
          v-else
          style="display: flex; gap: 24rpx; width: 100%; box-sizing: border-box"
        >
          <!-- 左列 -->
          <view
            style="
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;
              gap: 24rpx;
            "
          >
            <WishCard
              v-for="(w, i) in displayWishes.filter((_, idx) => idx % 2 === 0)"
              :key="w._id"
              :wish="w"
              :index="i * 2"
              :logo-url="logoUrlMap[logoFileIdOf(w)]"
              @click="openDetail(w)"
            />
          </view>
          <!-- 右列（整体往下偏移产生瀑布错位） -->
          <view
            style="
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;
              gap: 24rpx;
              margin-top: 20rpx;
            "
          >
            <WishCard
              v-for="(w, i) in displayWishes.filter((_, idx) => idx % 2 === 1)"
              :key="w._id"
              :wish="w"
              :index="i * 2 + 1"
              :logo-url="logoUrlMap[logoFileIdOf(w)]"
              @click="openDetail(w)"
            />
          </view>
        </view>

        <view
          v-if="displayWishes.length"
          class="compliance-banner glass-thin"
          style="margin: 24rpx 0; padding: 24rpx 28rpx"
        >
          <text class="compliance-icon">⚠️</text>
          <text class="compliance-text"
            >心愿与存款池均为虚拟记账额度，非真实资金账户，仅用于攒钱激励与管控。</text
          >
        </view>
      </view>
    </scroll-view>

    <!-- 心愿详情弹窗 -->
    <view v-if="detailWish" class="sheet-overlay" @click="closeDetail">
      <view class="sheet-panel wish-sheet sheet-slide-up" @click.stop>
        <!-- 把手 -->
        <view class="wish-sheet-handle" :style="{ background: detailHandleBg }" />

        <!-- 封面 header -->
        <view class="detail-header">
          <!-- 底衬：白底 + 居中 logo（毛玻璃后朦胧可见） -->
          <view class="detail-header-bg">
            <image
              v-if="isLogoWish(detailWish) && !isSysLogoWish(detailWish)"
              class="detail-bg-logo"
              :class="{ 'detail-bg-logo--fill': logoModeOf(detailWish) === 'aspectFill' }"
              :src="logoUrlMap[logoFileIdOf(detailWish)]"
              :mode="logoModeOf(detailWish)"
            />
            <view
              v-else-if="isSysLogoWish(detailWish)"
              class="detail-bg-syslogo"
              :style="{ background: sysLogoPlaceholderBg(sysLogoIndex(detailWish)) }"
            >
              <text class="detail-bg-syslogo-text">{{
                SYS_LOGO_PRESETS[sysLogoIndex(detailWish)]?.label
              }}</text>
            </view>
            <text v-else class="detail-bg-emoji">{{ coverEmoji(detailWish) }}</text>
          </view>
          <view class="detail-header-glass" />
          <view class="detail-header-glow" />
          <view class="detail-header-top">
            <view class="detail-header-left">
              <view class="detail-title-wrap">
                <text class="detail-name">{{ detailWish.name }}</text>
                <text v-if="detailWish.start_date" class="detail-deadline">{{
                  detailStartText
                }}</text>
                <text
                  v-if="detailWish.end_date || detailWish.deadline"
                  class="detail-deadline"
                  >{{ detailEndText }}</text
                >
              </view>
            </view>
            <view class="detail-close" @click="closeDetail"><text>✕</text></view>
          </view>

          <view class="detail-progress">
            <view class="detail-progress-top">
              <text class="detail-progress-saved"
                >已存 ¥{{ formatFen(detailWish.saved_amount || 0) }}</text
              >
              <text class="detail-progress-pct" :style="{ color: detailProgressPctColor }"
                >{{
                  Math.round(
                    ((detailWish.saved_amount || 0) / (detailWish.target_amount || 1)) *
                      100
                  )
                }}%</text
              >
            </view>
            <view class="detail-bar" :style="{ background: detailProgressTrackBg }">
              <view
                class="detail-bar-fill"
                :style="{
                  width:
                    Math.min(
                      ((detailWish.saved_amount || 0) / (detailWish.target_amount || 1)) *
                        100,
                      100
                    ) + '%',
                  background: detailProgressFillBg,
                }"
              />
            </view>
            <view class="detail-progress-bottom">
              <text class="detail-progress-target"
                >目标 ¥{{ formatFen(detailWish.target_amount || 0) }}</text
              >
              <text
                class="detail-progress-left"
                :class="
                  (detailWish.saved_amount || 0) > (detailWish.target_amount || 0)
                    ? 'detail-progress-over'
                    : ''
                "
                >{{
                  (detailWish.saved_amount || 0) > (detailWish.target_amount || 0)
                    ? "超存 ¥" +
                      formatFen(
                        (detailWish.saved_amount || 0) - (detailWish.target_amount || 0)
                      )
                    : "还差 ¥" +
                      formatFen(
                        Math.max(
                          0,
                          (detailWish.target_amount || 0) - (detailWish.saved_amount || 0)
                        )
                      )
                }}</text
              >
            </view>
          </view>

          <view
            v-if="
              (detailWish.saved_amount || 0) >= (detailWish.target_amount || 0) &&
              (detailWish.target_amount || 0) > 0 && !isDetailArchived
            "
            class="detail-done-badge"
            :style="detailDoneBadgeStyle"
          >
            <text v-if="hasPhaseTasks">✨ 达成 {{ donePhaseCount }} 阶段目标！</text>
            <text v-else>✨ 目标达成！</text>
          </view>
          <text v-if="detailWish.archived_reason" class="detail-reason-badge">{{
            reasonLabel(detailWish.archived_reason)
          }}</text>
        </view>

        <!-- Tab 切换 -->
        <view class="wish-tabs" :style="{ background: detailTabBg }">
          <view
            class="wish-tab"
            :class="{ active: detailTab === 'detail' }"
            :style="
              detailTab === 'detail'
                ? {
                    color: detailTabActiveColor,
                    boxShadow: `0 4rpx 16rpx ${detailTabActiveColor}1f`,
                  }
                : {}
            "
            @click="detailTab = 'detail'"
            >进度详情</view
          >
          <view
            class="wish-tab"
            :class="{ active: detailTab === 'records' }"
            :style="
              detailTab === 'records'
                ? {
                    color: detailTabActiveColor,
                    boxShadow: `0 4rpx 16rpx ${detailTabActiveColor}1f`,
                  }
                : {}
            "
            @click="detailTab = 'records'"
            >存入明细</view
          >
        </view>

        <!-- 进度详情（仅进行中心愿） -->
        <view v-if="!isDetailArchived && detailTab === 'detail'" class="detail-panel">
          <view class="detail-cards">
            <view class="detail-stat">
              <text class="detail-stat-label">已存金额</text>
              <text class="detail-stat-value" :style="{ color: detailTabActiveColor }"
                >¥{{ formatFen(detailWish.saved_amount || 0) }}</text
              >
            </view>
            <view class="detail-stat">
              <text class="detail-stat-label">剩余金额</text>
              <text class="detail-stat-value" :style="{ color: detailTabActiveColor }"
                >¥{{
                  formatFen(
                    Math.max(0, (detailWish.target_amount || 0) - (detailWish.saved_amount || 0))
                  )
                }}</text
              >
            </view>
            <view class="detail-stat">
              <text class="detail-stat-label">完成阶段</text>
              <text class="detail-stat-value" :style="{ color: detailTabActiveColor }"
                >{{ detailWish.done_phases || 0 }} / {{ wishPhasesCum.length || 0 }}</text
              >
            </view>
          </view>

          <!-- 分阶段进度时间线 -->
          <view class="phase-timeline">
            <view class="phase-tl-title" :style="{ color: detailTabActiveColor }"
              >阶段进度</view
            >
            <view
              v-for="ph in wishPhasesCum"
              :key="ph.index"
              class="phase-tl-item"
              :class="ph.effStatus"
            >
              <view
                class="phase-tl-node"
                :style="{
                  background:
                    ph.effStatus === 'done' ? detailTabActiveColor : detailAccentTint,
                  color: ph.effStatus === 'done' ? '#fff' : detailTabActiveColor,
                }"
              >
                <text>{{ ph.index }}</text>
              </view>
              <view class="phase-tl-body">
                <view class="phase-tl-head">
                  <text class="phase-tl-name">第{{ ph.index }}阶段</text>
                  <text
                    class="phase-tl-state"
                    :class="ph.effStatus"
                    :style="{
                      color:
                        ph.effStatus === 'expired' ? 'var(--ink4)' : detailTabActiveColor,
                    }"
                    >{{
                      ph.effStatus === "done"
                        ? "已完成"
                        : ph.effStatus === "expired"
                        ? "已过期"
                        : "进行中"
                    }}</text
                  >
                </view>
                <view class="phase-tl-bar">
                  <view
                    class="phase-tl-fill"
                    :style="{
                      width:
                        Math.min(
                          100,
                          Math.round(((ph.saved || 0) / (ph.target || 1)) * 100)
                        ) + '%',
                      background: detailProgressFillBg,
                    }"
                  />
                </view>
                <view class="phase-tl-num">
                  <text>¥{{ formatFen(ph.saved || 0) }}</text>
                  <text class="phase-tl-target">/ ¥{{ formatFen(ph.target || 0) }}</text>
                  <text class="phase-tl-cum"
                    >总 ¥{{ formatFen(ph.cumSaved) }} / ¥{{ formatFen(ph.cumTarget) }}</text
                  >
                  <text v-if="ph.done_at" class="phase-tl-date">{{
                    fmtDate(ph.done_at)
                  }}</text>
                </view>
                <view v-if="ph.start_date || ph.end_date" class="phase-tl-range">
                  <text v-if="ph.start_date" class="phase-tl-range-item"
                    >📅 {{ ph.start_date
                    }}<text v-if="ph.start_time"> {{ ph.start_time }}</text></text
                  >
                  <text v-if="ph.end_date" class="phase-tl-range-item"
                    >→ {{ ph.end_date
                    }}<text v-if="ph.end_time"> {{ ph.end_time }}</text></text
                  >
                  <text v-else class="phase-tl-range-item phase-tl-range-open"
                    >→ 无限期</text
                  >
                </view>
              </view>
            </view>

            <!-- 进行中且尚无下一阶段：可随时预设下一阶段（不要求当前阶段达成） -->
            <view
              v-if="!isDetailArchived && !hasNextPhase"
              class="phase-tl-advance"
              :style="{ borderColor: detailAccentBorder, color: detailTabActiveColor }"
              @click="openAdvance"
            >
              <text>➕ 开启下一阶段</text>
            </view>
          </view>

          <!-- 操作区（仅进行中心愿） -->
          <template v-if="!isDetailArchived">
            <view v-if="detailAction === 'none'" class="detail-op-row">
              <view
                class="wish-btn-primary"
                :style="{ background: detailPrimaryBg, color: detailBtnTextColor }"
                @click="detailAction = 'deposit'"
              >
                <text>⬇ 存入</text>
              </view>
              <view
                class="wish-btn-ghost"
                :style="{
                  borderColor: detailAccentBorder,
                  color: detailTabActiveColor,
                }"
                @click="detailAction = 'withdraw'"
              >
                <text>⬆ 取出</text>
              </view>
              <view
                v-if="currentPhaseDone"
                class="wish-btn-ghost wish-btn-archive-mini"
                :style="{ borderColor: detailAccentBorder, color: detailTabActiveColor }"
                @click="doArchive"
                ><text>归档</text></view
              >
            </view>

            <view
              v-else
              class="detail-op-card"
              :style="{ borderColor: detailAccentBorder }"
            >
              <text class="detail-op-title">{{
                detailAction === "deposit" ? "📥 存入心愿" : "📤 从心愿取出"
              }}</text>

              <view v-if="detailAction === 'deposit'" class="detail-sources">
                <view
                  v-for="s in depositSources"
                  :key="s.value"
                  class="detail-source"
                  :class="{
                    active: depositSource === s.value,
                    disabled: isDepositSourceDisabled(s.value),
                  }"
                  :style="
                    depositSource === s.value
                      ? {
                          background: detailAccentTint,
                          borderColor: detailTabActiveColor,
                          color: detailTabActiveColor,
                        }
                      : { borderColor: detailAccentBorder }
                  "
                  @click="!isDepositSourceDisabled(s.value) && (depositSource = s.value)"
                  >{{ s.label }}</view
                >
              </view>

              <view
                v-if="detailAction === 'deposit' && depositSource === 'account'"
                class="detail-account-picker"
              >
                <picker
                  mode="selector"
                  :range="accountList"
                  range-key="name"
                  @change="(e) => (depositAccountId = accountList[e.detail.value]._id)"
                >
                  <view
                    class="detail-account-item"
                    :style="{ borderColor: detailAccentBorder }"
                  >
                    <text>{{
                      depositAccount
                        ? depositAccount.name +
                          "（¥" +
                          formatFen(depositAccount.current_balance || 0) +
                          "）"
                        : "选择资产账户"
                    }}</text>
                    <text class="detail-account-arrow">▾</text>
                  </view>
                </picker>
                <text v-if="depositAmount && depositAccount" class="detail-balance-after"
                  >存入后余额 ¥{{ formatFen(depositAccountAfter) }}</text
                >
              </view>

              <view
                v-if="detailAction === 'deposit' && depositSource === 'savings'"
                class="detail-pool-tip"
                :style="{
                  background: detailAccentTint,
                  color: detailTabActiveColor,
                }"
                >存款池余额 ¥{{ savingsBalance }}</view
              >
              <view
                v-if="detailAction === 'deposit' && depositSource === 'surplus'"
                class="detail-pool-tip"
                :style="{
                  background: detailAccentTint,
                  color: detailTabActiveColor,
                }"
                >结余池余额 ¥{{ surplusBalance }}</view
              >

              <view v-if="detailAction === 'deposit'" class="detail-quick">
                <view
                  class="detail-quick-btn"
                  :style="{
                    borderColor: detailAccentBorder,
                    color: detailTabActiveColor,
                  }"
                  @click="setDepositQuick(depositRemain)"
                  >存满剩余</view
                >
                <view
                  class="detail-quick-btn"
                  :style="{
                    borderColor: detailAccentBorder,
                    color: detailTabActiveColor,
                  }"
                  @click="setDepositQuick(Math.floor(depositSourceAvail / 2))"
                  >存一半</view
                >
                <view
                  class="detail-quick-btn"
                  :style="{
                    borderColor: detailAccentBorder,
                    color: detailTabActiveColor,
                  }"
                  @click="setDepositQuick(Math.floor(depositSourceAvail / 3))"
                  >存1/3</view
                >
                <view
                  class="detail-quick-btn"
                  :style="{
                    borderColor: detailAccentBorder,
                    color: detailTabActiveColor,
                  }"
                  @click="setDepositQuick(Math.floor(depositSourceAvail / 4))"
                  >存1/4</view
                >
              </view>

              <view v-if="detailAction === 'withdraw'" class="detail-sources">
                <view
                  v-for="s in withdrawSources"
                  :key="s.value"
                  class="detail-source"
                  :class="{
                    active: withdrawSource === s.value,
                    disabled: isWithdrawSourceDisabled(s.value),
                  }"
                  :style="
                    withdrawSource === s.value
                      ? {
                          background: detailAccentTint,
                          borderColor: detailTabActiveColor,
                          color: detailTabActiveColor,
                        }
                      : { borderColor: detailAccentBorder }
                  "
                  @click="
                    !isWithdrawSourceDisabled(s.value) && (withdrawSource = s.value)
                  "
                  >{{ s.label }}</view
                >
              </view>

              <view
                v-if="detailAction === 'withdraw' && withdrawSource === 'account'"
                class="detail-account-picker"
              >
                <picker
                  mode="selector"
                  :range="accountList"
                  range-key="name"
                  @change="(e) => (withdrawAccountId = accountList[e.detail.value]._id)"
                >
                  <view
                    class="detail-account-item"
                    :style="{ borderColor: detailAccentBorder }"
                  >
                    <text>{{
                      withdrawAccount
                        ? withdrawAccount.name +
                          "（¥" +
                          formatFen(withdrawAccount.current_balance || 0) +
                          "）"
                        : "选择资产账户"
                    }}</text>
                    <text class="detail-account-arrow">▾</text>
                  </view>
                </picker>
                <text
                  v-if="withdrawAmount && withdrawAccount"
                  class="detail-balance-after"
                  >取出后余额 ¥{{ formatFen(withdrawAccountAfter) }}</text
                >
              </view>

              <view
                v-if="detailAction === 'withdraw' && withdrawSource === 'savings'"
                class="detail-pool-tip"
                :style="{
                  background: detailAccentTint,
                  color: detailTabActiveColor,
                }"
                >存款池余额 ¥{{ savingsBalance }}</view
              >
              <view
                v-if="detailAction === 'withdraw' && withdrawSource === 'surplus'"
                class="detail-pool-tip"
                :style="{
                  background: detailAccentTint,
                  color: detailTabActiveColor,
                }"
                >结余池余额 ¥{{ surplusBalance }}</view
              >

              <view class="detail-note-row">
                <input
                  class="detail-note-input"
                  :model-value="detailAction === 'deposit' ? depositNote : withdrawNote"
                  :placeholder="
                    detailAction === 'deposit'
                      ? '备注（选填，如：发工资存一笔）'
                      : '备注（选填，如：临时取用）'
                  "
                  :style="{ borderColor: detailAccentBorder }"
                  @input="
                    (e) =>
                      detailAction === 'deposit'
                        ? (depositNote = e.detail.value)
                        : (withdrawNote = e.detail.value)
                  "
                />
              </view>

              <view class="detail-input-row" :style="{ borderColor: detailAccentBorder }">
                <number-field
                  class="detail-input"
                  :model-value="
                    detailAction === 'deposit' ? depositAmount : withdrawAmount
                  "
                  :placeholder="
                    detailAction === 'deposit' ? '存入金额(元)' : '取出金额(元)'
                  "
                  title=""
                  :decimal-places="2"
                  :max-integer="9"
                  @update:model-value="
                    (v) =>
                      detailAction === 'deposit'
                        ? (depositAmount = v)
                        : (withdrawAmount = v)
                  "
                />
              </view>

              <view class="detail-op-actions">
                <view
                  class="wish-btn-ghost"
                  :style="{
                    borderColor: detailAccentBorder,
                    color: detailTabActiveColor,
                  }"
                  @click="detailAction = 'none'"
                  ><text>取消</text></view
                >
                <view
                  class="wish-btn-primary"
                  :style="{ background: detailPrimaryBg, color: detailBtnTextColor }"
                  @click="detailAction === 'deposit' ? doDeposit() : doWithdraw()"
                >
                  <text>确认</text></view
                >
              </view>
            </view>

            <view class="detail-danger" @click="doDelete"><text>删除心愿</text></view>
          </template>

          <!-- 历史心愿只读 -->
          <view v-if="isDetailArchived" class="archived-readonly">
            <text class="archived-readonly-text"
              >该心愿已于
              {{ detailWish.updated_at ? fmtDate(detailWish.updated_at) : "—" }}
              {{
                reasonLabel(detailWish.archived_reason)
              }}，已归档为历史记录，不可再存入或取出。</text
            >
            <!-- 历史只读时间线 -->
            <view class="phase-timeline">
              <view class="phase-tl-title">阶段进度</view>
              <view
                v-for="ph in wishPhasesCum"
                :key="ph.index"
                class="phase-tl-item"
                :class="ph.effStatus"
              >
                <!-- 待：完成的在圆圈的右上方 -->
                <view class="phase-tl-node">
                  <text>{{ ph.index }}</text>
                </view>
                <view class="phase-tl-body">
                  <view class="phase-tl-head">
                    <text class="phase-tl-name">第{{ ph.index }}阶段</text>
                    <text class="phase-tl-state" :class="ph.effStatus">{{
                      ph.effStatus === "done"
                        ? "已完成"
                        : ph.effStatus === "expired"
                        ? "已过期"
                        : "进行中"
                    }}</text>
                  </view>
                  <view class="phase-tl-bar">
                    <view
                      class="phase-tl-fill"
                      :style="{
                        width:
                          Math.min(
                            100,
                            Math.round(((ph.saved || 0) / (ph.target || 1)) * 100)
                          ) + '%',
                        background: detailProgressFillBg,
                      }"
                    />
                  </view>
                  <view class="phase-tl-num">
                    <text>¥{{ formatFen(ph.saved || 0) }}</text>
                    <text class="phase-tl-target"
                      >/ ¥{{ formatFen(ph.target || 0) }}</text
                    >
                    <text class="phase-tl-cum"
                      >总 ¥{{ formatFen(ph.cumSaved) }} / ¥{{ formatFen(ph.cumTarget) }}</text
                    >
                    <text v-if="ph.done_at" class="phase-tl-date">{{
                      fmtDate(ph.done_at)
                    }}</text>
                  </view>
                  <view v-if="ph.start_date || ph.end_date" class="phase-tl-range">
                    <text v-if="ph.start_date" class="phase-tl-range-item"
                      >📅 {{ ph.start_date
                      }}<text v-if="ph.start_time"> {{ ph.start_time }}</text></text
                    >
                    <text v-if="ph.end_date" class="phase-tl-range-item"
                      >→ {{ ph.end_date
                      }}<text v-if="ph.end_time"> {{ ph.end_time }}</text></text
                    >
                    <text v-else class="phase-tl-range-item phase-tl-range-open"
                      >→ 无限期</text
                    >
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 存入明细 -->
        <view v-if="!isDetailArchived && detailTab === 'records'" class="records-panel">
          <view v-if="!fundLogs.length" class="record-empty"><text>暂无记录</text></view>
          <view
            v-for="r in fundLogs"
            :key="r._id || r.created_at"
            class="record-row"
            :style="{ borderBottomColor: detailAccentBorder }"
          >
            <view class="record-left">
              <view
                class="record-icon"
                :class="r.direction === 'in' ? 'in' : 'out'"
                :style="
                  r.direction === 'in'
                    ? { background: detailAccentTint, color: detailTabActiveColor }
                    : {}
                "
              >
                <text>{{ r.direction === "in" ? "⬇" : "⬆" }}</text>
              </view>
              <view class="record-info">
                <text class="record-type">{{ sourceLabel(r.source) }}</text>
                <text class="record-date">{{ fmtDate(r.created_at) }}</text>
              </view>
            </view>
            <text
              class="record-amount"
              :class="r.direction"
              :style="r.direction === 'in' ? { color: detailTabActiveColor } : {}"
              >{{ r.direction === "in" ? "+" : "-" }}¥{{ formatFen(r.amount || 0) }}</text
            >
          </view>
        </view>
      </view>
    </view>

    <!-- 开启下一阶段弹窗 -->
    <view v-if="advanceModal" class="sheet-overlay" @click="advanceModal = false">
      <view class="sheet-panel advance-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <view class="advance-head">
          <text class="advance-title">➕ 开启下一阶段</text>
          <view class="advance-close" @click="advanceModal = false"><text>×</text></view>
        </view>
        <view class="advance-input-row">
          <text class="advance-input-label">本阶段目标（元）</text>
          <view class="advance-input-wrap" :style="{ borderColor: detailAccentBorder }">
            <number-field
              class="advance-input"
              :model-value="nextTargetYuan"
              :placeholder="'本阶段目标(元)'"
              title=""
              :decimal-places="2"
              :max-integer="9"
              @update:model-value="(v) => (nextTargetYuan = v)"
            />
          </view>
        </view>
        <view class="advance-date-row">
          <view
            class="advance-date-box advance-date-full"
            :style="{ borderColor: detailAccentBorder }"
            @click="showAdvanceDatePicker = true"
          >
            <text class="advance-date-cap">起止</text>
            <text class="advance-date-val">{{
              nextStartKey
                ? nextStartKey + "  ~  " + (nextEndKey || "可选")
                : "选择日期区间"
            }}</text>
          </view>
        </view>
        <DateRangePicker
          :visible="showAdvanceDatePicker"
          :model-value="{
            start: nextStartKey,
            end: nextEndKey,
            startTime: nextStartTime,
            endTime: nextEndTime,
          }"
          quick-range-direction="future"
          @update:visible="(v) => (showAdvanceDatePicker = v)"
          @confirm="onAdvanceDateConfirm"
        />
        <view
          class="wish-btn-primary advance-confirm"
          :style="{ background: detailPrimaryBg, color: detailBtnTextColor }"
          @click="confirmAdvance"
          ><text>确认开启</text></view
        >
      </view>
    </view>

    <!-- 新建心愿弹窗 -->
    <view v-if="showNewWish" class="sheet-overlay" @click="closeNewWish">
      <view class="sheet-panel wish-new-panel" @click.stop>
        <view class="sheet-handle">
          <view class="handle-bar" />
        </view>
        <view class="newwish-head">
          <text class="newwish-title">✨ 新建心愿</text>
          <view class="newwish-close" @click="closeNewWish">
            <text class="newwish-close-x">×</text>
          </view>
        </view>

        <!-- 封面预览 -->
        <view class="newwish-cover" :style="{ background: activeGradient }">
          <image
            v-if="logoLocalPath"
            class="newwish-cover-logo"
            :src="logoLocalPath"
            mode="aspectFit"
          />
          <view
            v-else-if="selectedSysLogo >= 0"
            class="newwish-cover-syslogo"
            :style="{ background: sysLogoPlaceholderBg(selectedSysLogo) }"
          >
            <text class="newwish-cover-syslogo-text">{{
              SYS_LOGO_PRESETS[selectedSysLogo]?.label
            }}</text>
          </view>
          <text v-else class="newwish-cover-emoji">{{ activeLabel }}</text>
          <view class="newwish-cover-meta">
            <text class="newwish-cover-name">{{ newWishName.trim() || "我的心愿" }}</text>
            <text class="newwish-cover-target"
              >目标 ¥{{ newWishAmount.trim() || "—" }}</text
            >
          </view>
        </view>

        <!-- 封面选择 -->
        <view class="newwish-covers">
          <view
            v-for="(p, i) in COVER_PRESETS"
            :key="i"
            class="newwish-cover-chip"
            :class="{ active: !useCustomColor && newWishCoverIdx === i }"
            :style="{ background: p.gradient }"
            @click="selectPreset(i)"
          >
            <text>{{ p.label }}</text>
          </view>
          <view
            class="newwish-cover-chip newwish-cover-chip--custom"
            :class="{ active: useCustomColor }"
            :style="{
              background: useCustomColor ? activeGradient : 'rgba(255,255,255,0.5)',
            }"
            @click="openColorModal"
          >
            <text>🎨</text>
          </view>
        </view>

        <!-- 封面 Logo 入口（系统 Logo / 上传） -->
        <view class="newwish-logo-entry" @click="showLogoModal = true">
          <text class="newwish-logo-entry-icon">{{
            logoLocalPath || selectedSysLogo >= 0 ? "🖼️" : "➕"
          }}</text>
          <text class="newwish-logo-entry-text">{{
            logoLocalPath
              ? "已选自定义 Logo"
              : selectedSysLogo >= 0
              ? SYS_LOGO_PRESETS[selectedSysLogo]?.label
              : "选择系统图标 / 上传 Logo"
          }}</text>
          <text
            v-if="logoLocalPath || selectedSysLogo >= 0"
            class="newwish-logo-entry-clear"
            @click.stop="clearLogoSelection"
            >✕ 清除</text
          >
        </view>

        <!-- 自定义颜色弹窗（色板选择） -->
        <view v-if="showColorModal" class="cp-overlay" @click="showColorModal = false">
          <view class="cp-panel" @click.stop>
            <text class="cp-title">自定义颜色</text>
            <view class="cp-upload-entry" @click="showLogoModal = true">
              <text class="cp-upload-entry-text">{{
                logoLocalPath ? "更换心愿 Logo" : "上传心愿 Logo"
              }}</text>
            </view>
            <!-- 饱和度/明度方块 -->
            <view
              class="cp-sv"
              @touchstart="onSvStart"
              @touchmove="onSvMove"
              :style="svStyle"
            >
              <view class="cp-sv-cursor" :style="svCursorStyle"></view>
            </view>
            <!-- 色相滑块 -->
            <view
              class="cp-hue"
              @touchstart="onHueStart"
              @touchmove="onHueMove"
              :style="hueStyle"
            >
              <view class="cp-hue-cursor" :style="hueCursorStyle"></view>
            </view>
            <!-- 实时渐变预览 -->
            <view class="custom-preview" :style="{ background: pickerGradient }">
              <text class="custom-preview-emoji">{{ pickerLabel }}</text>
            </view>
            <view class="cp-actions">
              <view class="cp-cancel" @click="showColorModal = false">取消</view>
              <view class="cp-confirm" @click="confirmColorModal">确定</view>
            </view>
          </view>
        </view>

        <!-- 表单 -->
        <text class="newwish-label">心愿名称</text>
        <input
          class="sheet-input"
          v-model="newWishName"
          placeholder="比如：买一双新球鞋"
        />
        <text class="newwish-label">目标金额</text>
        <view class="sheet-input">
          <number-field
            class="sheet-input-inner"
            :model-value="newWishAmount"
            placeholder="¥"
            title="心愿目标金额"
            :decimal-places="2"
            :max-integer="9"
            @update:model-value="(v) => (newWishAmount = v)"
          />
        </view>
        <text class="newwish-label">心愿日期区间（可选）</text>
        <view class="sheet-input date-range-trigger" @click="showDatePicker = true">
          <text class="date-range-text">{{
            dateRangeText || "点击选择起始—截止日期"
          }}</text>
          <text class="date-range-arrow">›</text>
        </view>
        <DateRangePicker
          :visible="showDatePicker"
          :model-value="{
            start: newWishStart,
            end: newWishEnd,
            startTime: newWishStartTime,
            endTime: newWishEndTime,
          }"
          quick-range-direction="future"
          @update:visible="(v) => (showDatePicker = v)"
          @confirm="onDateRangeConfirm"
        />
        <view class="save-btn" @click="createWish"><text>🌟 创建心愿</text></view>
      </view>
    </view>

    <!-- 存款池存取弹窗 -->
    <view v-if="showSavings" class="sheet-overlay" @click="showSavings = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle">
          <view class="handle-bar" />
        </view>
        <text class="sheet-title">通用存款池（虚拟记账）</text>
        <view class="savings-balance-row">
          <text>当前余额</text>
          <text class="savings-balance">¥{{ savingsBalance }}</text>
        </view>
        <view class="op-sources" style="margin: 16rpx 40rpx 8rpx">
          <view
            class="op-source"
            :class="{ active: savingsMode === 'deposit' }"
            @click="savingsMode = 'deposit'"
            >存入
          </view>
          <view
            class="op-source"
            :class="{ active: savingsMode === 'withdraw' }"
            @click="savingsMode = 'withdraw'"
            >取出
          </view>
        </view>

        <view class="op-input-row" style="margin: 16rpx 40rpx">
          <number-field
            class="op-input"
            :model-value="savingsAmount"
            placeholder="金额(元)"
            title="存款池金额"
            :decimal-places="2"
            :max-integer="9"
            @update:model-value="(v) => (savingsAmount = v)"
          />
          <view
            class="op-confirm"
            :class="{ withdraw: savingsMode === 'withdraw' }"
            @click="doSavings"
          >
            <text>{{ savingsMode === "deposit" ? "存入" : "取出" }}</text>
          </view>
        </view>

        <text class="compliance-note"
          >存款池为虚拟记账额度，非真实资金账户，取出仅回退至累计结余池。</text
        >
      </view>
    </view>

    <!-- TabBar -->
    <TabBar :current="4" />

    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />

    <!-- 心愿封面 Logo 弹框（系统图标 + 上传自定义） -->
    <view v-if="showLogoModal" class="cp-overlay" @click="cancelLogoModal">
      <view class="cp-panel" @click.stop>
        <text class="cp-title">封面 Logo</text>

        <!-- 系统预设图标（占位矩形，待替换真实素材） -->
        <text class="cp-subtitle">系统图标（占位，后续替换）</text>
        <view class="sys-logo-grid">
          <view
            v-for="s in SYS_LOGO_PRESETS"
            :key="s.id"
            class="sys-logo-item"
            :class="{ active: selectedSysLogo === s.id }"
            :style="{ background: sysLogoPlaceholderBg(s.id) }"
            @click="selectSysLogo(s.id)"
          >
            <text class="sys-logo-text">{{ s.label }}</text>
          </view>
        </view>

        <view class="cp-divider" />

        <!-- 自定义上传 -->
        <view class="cp-upload-box" @click="chooseLogo">
          <image
            v-if="logoLocalPath"
            class="cp-upload-img"
            :src="logoLocalPath"
            mode="aspectFit"
          />
          <view v-else class="cp-upload-placeholder">
            <text class="cp-upload-plus">＋</text>
            <text class="cp-upload-tip">点击选择透明背景图片</text>
          </view>
        </view>
        <text class="cp-upload-hint">透明背景图片将保持透明，不添加任何背景填充</text>

        <view class="cp-actions">
          <view class="cp-cancel" @click="cancelLogoModal">取消</view>
          <view class="cp-confirm" @click="confirmLogoModal">确认</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import TabBar from "@/components/tabbar/tabbar.vue";
import { useUserStore } from "@/stores/user.js";
import { advanceWishPhaseAction } from "@/stores/wish.js";
import { formatFen, safeYuanToFen } from "@/utils/money.js";
import { hexToHsv, hsvToHex } from "@/utils/coverColor.js";
import { uploadWishLogo, deleteWishLogo } from "@/utils/cloudFile.js";
import { getCloudTempUrl, getCloudTempUrls } from "@/utils/cdn.js";
import DateRangePicker from "@/components/date-range-picker/date-range-picker.vue";
import WishCard from "@/components/wish-card/wish-card.vue";

const {
  state,
  savingsPoolBalanceFen,
  surplusPoolBalanceFen,
  loadWishes,
  loadSavingsPool,
  loadArchivedWishesAction,
  createWishAction,
  archiveWishAction,
  deleteWishAction,
  loadWishFundLogsAction,
  loadSavingsPoolLogsAction,
  depositWishFromAccountAction,
  depositWishFromSurplusAction,
  depositWishFromSavingsAction,
  withdrawWishToSurplusAction,
  withdrawWishToAccountAction,
  withdrawWishToSavingsAction,
  depositSavingsPoolAction,
  withdrawSavingsPoolAction,
  loadAssetAccounts,
} = useUserStore();

const viewTab = ref("active");
const wishes = computed(() => (Array.isArray(state.wishes) ? state.wishes : []));
const activeWishes = computed(() => wishes.value.filter((w) => !w.archived));
const archivedWishes = computed(() =>
  Array.isArray(state.archivedWishes) ? state.archivedWishes : []
);
// 历史心愿二级筛选：'' 全部 / completed 已达成 / deleted 已删除 / expired 已过期
const archivedFilter = ref("");
const displayWishes = computed(() => {
  if (viewTab.value === "active") return activeWishes.value;
  const list = archivedWishes.value;
  return archivedFilter.value
    ? list.filter((w) => w.archived_reason === archivedFilter.value)
    : list;
});
// 列表数据变化时，批量解析上传 logo 的临时 URL
watch(
  displayWishes,
  (list) => {
    refreshLogoUrls(list);
  },
  { immediate: true, deep: false }
);

function switchTab(tab) {
  viewTab.value = tab;
  if (tab === "archived") loadArchivedWishesAction(archivedFilter.value);
}
function switchArchivedFilter(reason) {
  archivedFilter.value = reason;
  loadArchivedWishesAction(reason);
}
const reasonLabel = (r) =>
  ({ completed: "已达成", deleted: "已删除", expired: "已过期" }[r] || "历史");
const savingsBalance = computed(() => formatFen(savingsPoolBalanceFen.value));
const surplusBalance = computed(() => formatFen(surplusPoolBalanceFen.value));

const activeCount = computed(() => activeWishes.value.length);
const totalSavedFen = computed(() =>
  activeWishes.value.reduce((s, w) => s + Number(w.saved_fen || 0), 0)
);
const totalTargetFen = computed(() =>
  activeWishes.value.reduce((s, w) => s + Number(w.target_fen || 0), 0)
);
const totalPct = computed(() =>
  totalTargetFen.value > 0
    ? Math.min(100, Math.round((totalSavedFen.value / totalTargetFen.value) * 100))
    : 0
);

// 本月存入总额（含涨跌）：心愿 + 通用存款池
const monthlyWishFen = ref(0);
const monthlyPoolFen = ref(0);
const monthlySavedFen = computed(() => monthlyWishFen.value + monthlyPoolFen.value);
const showMonthlyBubble = ref(false);
function toggleMonthlyBubble() {
  showMonthlyBubble.value = !showMonthlyBubble.value;
}

/* 解析封面渐变：直接读独立字段 cover_gradient（任意封面类型都带），
   无则用统一兜底色（不再按 index 猜测，避免错位） */
const FALLBACK_GRADIENT = "linear-gradient(135deg,#ebfded 0%,#c6fbce 60%,#8ae99b 100%)";
const grad = (arg) => {
  if (typeof arg === "object" && arg) {
    return arg.cover_gradient || FALLBACK_GRADIENT;
  }
  return FALLBACK_GRADIENT;
};
/* 进度条配色：与 wish-card 一致的「浅/中/深」三段渐变 + 半透明轨道 */
function extractGradientColors(str) {
  const m = String(str).match(/#([0-9a-fA-F]{3,8})/g) || [];
  const colors = m.map((c) => c);
  if (colors.length === 0) return ["#acf5b7", "#8ae99b", "#25cc5d"];
  if (colors.length === 1) return [colors[0], colors[0], colors[0]];
  return [colors[0], colors[colors.length - 1], colors[colors.length - 1]];
}
function hexToRgb(hex) {
  let h = String(hex).replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (h.length === 6) h += "ff";
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
function buildThreeTone(baseHex) {
  const { h, s, l } = hexToHsl(baseHex);
  const light = hslToHex(h, Math.max(0, s - 6), Math.min(100, l + 14));
  const base = hslToHex(h, s, l);
  const deep = hslToHex(h, Math.min(100, s + 4), Math.max(0, l - 16));
  return [light, base, deep];
}
const detailProgressFillBg = computed(() => {
  const [head, , tail] = extractGradientColors(grad(detailWish.value));
  const baseHex = tail || head || "#8ae99b";
  const [light, base, deep] = buildThreeTone(baseHex);
  return `linear-gradient(90deg, ${light} 0%, ${base} 50%, ${deep} 100%)`;
});
const detailProgressTrackBg = computed(() => {
  const [, , tail] = extractGradientColors(grad(detailWish.value));
  const baseHex = tail || "#8ae99b";
  const { r, g, b } = hexToRgb(baseHex);
  // 动态色轨道：白混 30%（保留更多色相，更实），叠 0.5 透明度，比之前更清晰
  const mix = (c) => Math.round(c + (255 - c) * 0.3);
  return `rgba(${mix(r)},${mix(g)},${mix(b)},0.5)`;
});
// 百分比文字色：取封面基色派生的中段色，与进度条同色系（在浅底上清晰）
const detailProgressPctColor = computed(() => {
  const [, , tail] = extractGradientColors(grad(detailWish.value));
  const baseHex = tail || "#8ae99b";
  const [, base] = buildThreeTone(baseHex);
  return base;
});
// Tab 容器底色：封面基色向中性浅灰混合（去饱和、更灰），对应 rgba(194,242,200,*) 色阶
const detailTabBg = computed(() => {
  const [, , tail] = extractGradientColors(grad(detailWish.value));
  const baseHex = tail || "#8ae99b";
  const { r, g, b } = hexToRgb(baseHex);
  // 基色占比 16%，其余 84% 为极浅灰(244)，更白一点的灰白
  const mix = (c) => Math.round(c * 0.16 + 250 * 0.84);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
});
// Tab 选中文字色 + 阴影：封面基色派生的深一档（清晰可读）
const detailTabActiveColor = computed(() => {
  const [, , tail] = extractGradientColors(grad(detailWish.value));
  const baseHex = tail || "#8ae99b";
  const [, , deep] = buildThreeTone(baseHex);
  return deep;
});
// 主按钮底色：直接用接口返回的封面原渐变（cover_gradient）
const detailPrimaryBg = computed(() => grad(detailWish.value));
// 主按钮文字色：按封面渐变深档基色的 HSL 亮度动态决定黑/白，保证可读
const detailBtnTextColor = computed(() => {
  const [, , tail] = extractGradientColors(grad(detailWish.value));
  const baseHex = tail || "#8ae99b";
  const { l } = hexToHsl(baseHex);
  return l > 62 ? "var(--ink2)" : "#fff";
});
// 强调描边色：封面基色白混 60% 的淡实色
const detailAccentBorder = computed(() => {
  const [, , tail] = extractGradientColors(grad(detailWish.value));
  const baseHex = tail || "#8ae99b";
  const { r, g, b } = hexToRgb(baseHex);
  const mix = (c) => Math.round(c + (255 - c) * 0.6);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
});
// 强调浅底/浅描边：封面基色白混 84% 的淡实色（对应 rgba(194,242,200,*) 色阶）
const detailAccentTint = computed(() => {
  const [, , tail] = extractGradientColors(grad(detailWish.value));
  const baseHex = tail || "#8ae99b";
  const { r, g, b } = hexToRgb(baseHex);
  const mix = (c) => Math.round(c + (255 - c) * 0.84);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
});
// Sheet 把手底色：封面基色带 0.5 透明度（随心愿封面动态变化）
const detailHandleBg = computed(() => {
  const [, , tail] = extractGradientColors(grad(detailWish.value));
  const baseHex = tail || "#8ae99b";
  const { r, g, b } = hexToRgb(baseHex);
  return `rgba(${r},${g},${b},0.5)`;
});
/* 解析封面展示 emoji：
   - 有图片(fileID / sys::) → 返回 ""（由 <image>/占位矩形显示）
   - 否则返回心愿名首字符或 ⭐ */
const coverEmoji = (w) => {
  if (!w) return "⭐";
  const img = w.cover_image_url || "";
  if (img) return ""; // 有图片则不显示 emoji
  return w.name ? w.name.trim().charAt(0) || "⭐" : "⭐";
};
/* 上传/系统 logo 回显：cover_image_url 为纯图片字段（fileID 或 sys::idx） */
const logoUrlMap = reactive({});
// 记录每个 logo fileID 是否为透明背景图（true=透明），用于切换 image 的 mode
const logoHasAlphaMap = reactive({});
/* 判断 logo 是否为透明背景图，用于切换 image 的 mode：
   - 透明（png/webp/bmp 或检测到位图含 alpha<255）→ heightFix
   - 不透明（jpg/jpeg 或检测确认全图无透明像素）→ aspectFill
   判定优先级：扩展名 → 逐像素检测；两者都无法确定时保守按不透明(aspectFill)，
   避免把不透明图误当透明（heightFix 居中会很难看）。 */
function detectLogoAlpha(id, url) {
  if (!id || !url) return;
  // 先默认不透明（aspectFill），检测到透明再翻成 true
  logoHasAlphaMap[id] = false;
  const pathForExt = id || url;
  const ext = (pathForExt
    .split("?")[0]
    .split("#")[0]
    .match(/\.([a-z0-9]+)$/i) || [])[1];
  const lower = (ext || "").toLowerCase();
  const opaqueExt = ["jpg", "jpeg"];
  const transExt = ["png", "webp", "bmp", "gif"];
  if (transExt.includes(lower)) {
    logoHasAlphaMap[id] = true; // 扩展名已能确定透明
    return;
  }
  if (opaqueExt.includes(lower)) {
    logoHasAlphaMap[id] = false; // 扩展名已能确定不透明
    return;
  }
  const markIfTransparent = (data) => {
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        logoHasAlphaMap[id] = true;
        break;
      }
    }
  };
  // #ifdef H5
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const cv = document.createElement("canvas");
    const w = (cv.width = img.naturalWidth || img.width);
    const h = (cv.height = img.naturalHeight || img.height);
    if (!w || !h) return;
    const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0);
    try {
      markIfTransparent(ctx.getImageData(0, 0, w, h).data);
    } catch (e) {
      // 跨域读不到：保留扩展名/默认判定
    }
  };
  img.onerror = () => {};
  img.src = url;
  // #endif
  // #ifndef H5
  // 先下载到本地临时文件，避免直接 draw 网络图渲染时序问题导致读不到像素
  uni.downloadFile({
    url,
    success: (dl) => {
      const local = dl.tempFilePath;
      uni.getImageInfo({
        src: local,
        success: (info) => {
          const w = info.width;
          const h = info.height;
          if (!w || !h) return;
          const ctx = uni.createCanvasContext("_logoAlphaProbe");
          ctx.drawImage(local, 0, 0, w, h);
          ctx.draw(false, () => {
            uni.canvasGetImageData({
              canvasId: "_logoAlphaProbe",
              x: 0,
              y: 0,
              width: w,
              height: h,
              success: (res) => markIfTransparent(res.data),
              fail: () => {}, // 读不到保留默认/扩展名判定
            });
          });
        },
        fail: () => {},
      });
    },
    fail: () => {},
  });
  // #endif
}
/* 根据 logo 是否透明返回 image 的 mode：
   - 透明背景图 → heightFix（保留比例，底部透出）
   - 不透明图 → aspectFill（铺满裁切）
   未检测完成 / 检测失败 → 默认 aspectFill（不透明假设），避免把不透明图误当透明 */
function logoModeOf(w) {
  const id = logoFileIdOf(w);
  return logoHasAlphaMap[id] === false ? "aspectFill" : "heightFix";
}
function isLogoWish(w) {
  const img = String(w?.cover_image_url || "");
  // 系统图标无远程图，但也是「有封面图」分支（由本地预设渲染占位矩形）
  return img.startsWith("cloud://") || img.startsWith("sys::");
}
/* 是否为「系统 Logo」（占位矩形，无远程图，由本地预设渲染） */
function isSysLogoWish(w) {
  return String(w?.cover_image_url || "").startsWith("sys::");
}
// 详情页起止时间（完整：日期 + 时间）
const detailStartText = computed(() => {
  const w = detailWish.value;
  if (!w) return "";
  const s = w.start_date || "";
  return "开始时间：" + (s + (w.start_time ? " " + w.start_time : ""));
});
const detailEndText = computed(() => {
  const w = detailWish.value;
  if (!w) return "";
  // 优先显示整体 deadline（开启下一阶段后已同步为各阶段结束日的更晚者）
  const e = w.deadline || w.end_date || "";
  const et = w.deadline ? w.end_time : w.end_time;
  return "结束时间：" + (e + (et ? " " + et : ""));
});
function logoFileIdOf(w) {
  const img = String(w.cover_image_url || "");
  return img.startsWith("cloud://") ? img : "";
}
/* 系统 Logo 预设序号（用于回显占位矩形样式） */
function sysLogoIndex(w) {
  const parts = String(w.cover_image_url || "").split("::");
  return parts[0] === "sys" ? Number(parts[1]) || 0 : -1;
}
async function refreshLogoUrls(list) {
  const ids = (list || []).filter(isLogoWish).map(logoFileIdOf).filter(Boolean);
  if (!ids.length) return;
  const map = await getCloudTempUrls(ids);
  for (const id of ids) {
    if (map[id]) {
      logoUrlMap[id] = map[id];
      detectLogoAlpha(id, map[id]);
    }
  }
}

const toast = (title, icon = "none") => uni.showToast({ title, icon });
const fmtDate = (ts) => {
  if (!ts) return "";
  const d = new Date(String(ts).replace(" ", "T"));
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const sourceLabel = (s) => {
  const map = {
    manual: "手动虚拟",
    surplus_pool: "结余池转入",
    savings_pool: "存款池转入",
    withdraw: "取出退回",
    to_wish: "转入心愿",
    from_wish: "心愿退回",
  };
  return map[s] || s || "";
};

/* ===== 分阶段进度时间线 ===== */
// 当前阶段指针（0-based），缺失时按 0 处理（兼容旧数据无 phases）
const currentPhaseIdx = computed(() => {
  const w = detailWish.value;
  if (!w) return 0;
  return Math.max(0, w.current_phase || 0);
});
// 阶段列表（旧数据无 phases 时，用单阶段兼容展示）
// effStatus：对外展示用的阶段状态，基于「是否达成」+「是否时间过期」推导，而非存储的 skipped：
//   - 已存 >= 目标          → done（已完成）
//   - 未达成且结束时间已过  → expired（已过期）
//   - 否则                  → active（进行中）
// （存储 status 的 skipped 仅表示「未达成旧阶段」，统一映射为 expired）
const wishPhases = computed(() => {
  const w = detailWish.value;
  if (!w) return [];
  const today = todayKey();
  const raw = Array.isArray(w.phases) && w.phases.length
    ? w.phases
    : [
        {
          index: 1,
          mode: "add",
          target: w.target_amount || 0,
          saved: w.saved_amount || 0,
          status: w.status === "archived" ? "done" : "active",
          done_at: w.completed_at || null,
        },
      ];
  return raw.map((p) => {
    const saved = Number(p.saved) || 0;
    const target = Number(p.target) || 0;
    let eff = p.status;
    if (target > 0 && saved >= target) eff = "done";
    else if (p.status === "skipped") eff = "expired";
    else if (p.end_date && p.end_date < today) eff = "expired";
    return { ...p, effStatus: eff };
  });
});
// 阶段列表（增强）：每个阶段附带「到该阶段为止的累计目标/已存」
const wishPhasesCum = computed(() => {
  const list = wishPhases.value;
  let cumTarget = 0;
  let cumSaved = 0;
  return list.map((p) => {
    cumTarget += Number(p.target) || 0;
    cumSaved += Number(p.saved) || 0;
    return { ...p, cumTarget, cumSaved };
  });
});
// 当前阶段是否已达成（effStatus 为 done）
const currentPhaseDone = computed(() => {
  const ph = wishPhases.value[currentPhaseIdx.value];
  return ph ? ph.effStatus === "done" : false;
});
// 是否还有下一阶段（非最后一阶段 active）
const hasNextPhase = computed(() => {
  const list = wishPhases.value;
  return list.length > currentPhaseIdx.value + 1;
});
// 已达成阶段数（effStatus 为 done）
const donePhaseCount = computed(
  () => wishPhases.value.filter((p) => p.effStatus === "done").length
);
// 是否处于分阶段模式（已有多阶段或存在下一阶段）
const hasPhaseTasks = computed(
  () => wishPhases.value.length > 1 || hasNextPhase.value || donePhaseCount.value > 0
);
// 达成徽标样式：同封面色系（文字/描边/浅底）
const detailDoneBadgeStyle = computed(() => {
  const [, , tail] = extractGradientColors(grad(detailWish.value));
  const baseHex = tail || "#8ae99b";
  const { r, g, b } = hexToRgb(baseHex);
  const mix = (c) => Math.round(c * 0.16 + 247 * 0.84);
  return {
    color: detailProgressPctColor.value,
    borderColor: detailProgressPctColor.value,
    background: `rgba(${mix(r)},${mix(g)},${mix(b)},0.5)`,
  };
});

/* 开启下一阶段弹窗 */
const advanceModal = ref(false);
const nextTargetYuan = ref("");
const nextStartKey = ref(""); // 阶段开始日期 YYYY-MM-DD
const nextEndKey = ref(""); // 阶段结束日期 YYYY-MM-DD（可空）
const nextStartTime = ref(""); // 阶段起始时间 HH:mm:ss（回显用）
const nextEndTime = ref(""); // 阶段截止时间 HH:mm:ss（回显用）
const showAdvanceDatePicker = ref(false); // 阶段起止连选组件
const todayKey = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const nowHms = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const openAdvance = () => {
  const ph = wishPhases.value[currentPhaseIdx.value];
  // 默认建议：沿用当前阶段目标（元）
  const sugg = Math.round((ph?.target || 0) / 100) || 0;
  nextTargetYuan.value = sugg ? String(sugg) : "";
  // 默认开始时间 = 创建下一阶段的当天；结束时间留空由用户选
  nextStartKey.value = todayKey();
  nextEndKey.value = "";
  // 起始/截止时分秒：优先用新建心愿时记录的时分秒，否则回退到当前真实时间（避免 00:00:00）
  nextStartTime.value = newWishStartTime.value || nowHms();
  nextEndTime.value = newWishEndTime.value || "23:59:59";
  advanceModal.value = true;
};
const confirmAdvance = async () => {
  const w = detailWish.value;
  if (!w) return;
  const res = safeYuanToFen(nextTargetYuan.value);
  if (!res.ok || res.value < 1) return toast("请输入有效目标金额");
  if (nextEndKey.value && nextStartKey.value && nextEndKey.value < nextStartKey.value)
    return toast("结束日期不能早于开始日期");
  try {
    await advanceWishPhaseAction(
      w._id,
      res.value,
      "add",
      nextStartKey.value,
      nextEndKey.value,
      nextStartTime.value,
      nextEndTime.value
    );
    advanceModal.value = false;
    // 用云端返回的更新后文档（含总目标/总已存/完成次数等汇总字段）直接刷新详情，
    // 保证进度条立即反映心愿接口写回的「总」金额；再同步 store 列表引用。
    if (detailWish.value && res) {
      detailWish.value = { ...detailWish.value, ...res };
    }
    detailWish.value =
      wishes.value.find((x) => x._id === w._id) || detailWish.value;
    toast("已开启下一阶段", "success");
  } catch (err) {
    toast(err.message || "开启失败");
  }
};
// 阶段起止连选确认：start 必填（默认今天），end 可空；回存时分秒用于再次打开时回显
function onAdvanceDateConfirm(payload) {
  nextStartKey.value = payload.start || todayKey();
  nextEndKey.value = payload.end || "";
  nextStartTime.value = payload.startTime || "";
  nextEndTime.value = payload.endTime || "";
}

onMounted(async () => {
  try {
    await Promise.all([loadWishes(), loadSavingsPool(), loadArchivedWishesAction()]);
    await loadMonthlySaved();
    await loadAssetAccounts().catch(() => {});
    autoOpenFromQuery();
  } catch (err) {
    console.error("[wish] 加载失败", err);
  }
});

// 从心愿详情页跳回时，自动展开对应心愿的操作弹窗
const pendingOpenId = ref("");
const pendingAction = ref("none");
onLoad((options) => {
  if (options && options.id) {
    pendingOpenId.value = decodeURIComponent(options.id);
    pendingAction.value = options.action || "none";
  }
});
function autoOpenFromQuery() {
  if (!pendingOpenId.value) return;
  const id = pendingOpenId.value;
  const action = pendingAction.value;
  const target =
    wishes.value.find((w) => w._id === id) ||
    archivedWishes.value.find((w) => w._id === id) ||
    null;
  pendingOpenId.value = "";
  pendingAction.value = "none";
  if (target) {
    openDetail(target);
    if (action && action !== "none") detailAction.value = action;
  }
}

// 聚合本月"存入(in)"流水总额：心愿 + 通用存款池
async function loadMonthlySaved() {
  try {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    let wishSum = 0;
    for (const w of activeWishes.value) {
      const logs = await loadWishFundLogsAction(w._id);
      for (const r of logs || []) {
        if (r.direction !== "in") continue;
        const d = new Date(String(r.created_at).replace(" ", "T"));
        if (d.getFullYear() === y && d.getMonth() === m) {
          wishSum += Number(r.amount || 0);
        }
      }
    }
    monthlyWishFen.value = wishSum;

    let poolSum = 0;
    const poolLogs = await loadSavingsPoolLogsAction();
    for (const r of poolLogs || []) {
      if (r.direction !== "in") continue;
      const d = new Date(String(r.created_at).replace(" ", "T"));
      if (d.getFullYear() === y && d.getMonth() === m) {
        poolSum += Number(r.amount || 0);
      }
    }
    monthlyPoolFen.value = poolSum;
  } catch (err) {
    console.error("[wish] 本月聚合失败", err);
  }
}

/* 详情 */
const detailWish = ref(null);
// 详情面板 tab：进度详情 / 存入明细
const detailTab = ref("detail");
// 操作状态：none / deposit / withdraw（点击按钮后展开输入区）
const detailAction = ref("none");
// 重置详情交互状态（打开/关闭时）
function resetDetailUi() {
  detailTab.value = "detail";
  detailAction.value = "none";
  depositSource.value = "account";
  depositAccountId.value = "";
  depositAmount.value = "";
  depositNote.value = "";
  withdrawSource.value = "surplus";
  withdrawAccountId.value = "";
  withdrawAmount.value = "";
  withdrawNote.value = "";
}
const fundLogs = ref([]);
const isDetailArchived = computed(
  () => !!(detailWish.value && detailWish.value.archived_reason)
);
const openDetail = (w) => {
  resetDetailUi();
  detailWish.value = w;
  loadLogs(w._id);
};
// 统一关闭详情（重置交互状态）
function closeDetail() {
  detailWish.value = null;
  resetDetailUi();
}
const loadLogs = async (wishId) => {
  fundLogs.value = await loadWishFundLogsAction(wishId);
};
// loadWishes / loadArchivedWishes 会整体替换数组，需把详情对象重新指向最新引用
const syncDetail = () => {
  if (!detailWish.value) return;
  const fresh = isDetailArchived.value
    ? archivedWishes.value.find((w) => w._id === detailWish.value._id)
    : wishes.value.find((w) => w._id === detailWish.value._id);
  if (fresh) detailWish.value = fresh;
};

/* 存款 */
const depositSource = ref("account");
const depositSources = [
  { value: "account", label: "从资产账户" },
  { value: "surplus", label: "从结余池" },
  { value: "savings", label: "从存款池" },
];
// 资产账户列表（供「从资产账户」选择）
const accountList = computed(() => state.assets || []);
const depositAccountId = ref("");
const depositAccount = computed(() =>
  accountList.value.find((a) => a._id === depositAccountId.value)
);
const depositAmount = ref("");
const depositNote = ref("");
// 来源可用性：无账户时禁用「从资产账户」；池子余额为 0 时禁用对应池子
const noAccount = computed(() => accountList.value.length === 0);
const depositAccountDisabled = computed(() => noAccount.value);
const depositSavingsDisabled = computed(() => (savingsPoolBalanceFen.value || 0) <= 0);
const depositSurplusDisabled = computed(() => (surplusPoolBalanceFen.value || 0) <= 0);
const isDepositSourceDisabled = (v) =>
  (v === "account" && depositAccountDisabled.value) ||
  (v === "savings" && depositSavingsDisabled.value) ||
  (v === "surplus" && depositSurplusDisabled.value);
// 选账户时预览存入后余额
const depositAccountAfter = computed(() => {
  const amt = safeYuanToFen(depositAmount.value).value || 0;
  return (depositAccount.value?.current_balance || 0) - amt;
});
// 当前选中来源的可用额度（用于快捷比例按钮的基数）
const depositSourceAvail = computed(() => {
  if (depositSource.value === "surplus") return surplusPoolBalanceFen.value || 0;
  if (depositSource.value === "savings") return savingsPoolBalanceFen.value || 0;
  return depositAccount.value?.current_balance || 0;
});
// 心愿剩余缺口（用于「存满剩余」按钮，且作为比例按钮的上限）
const depositRemain = computed(() => {
  const w = detailWish.value;
  if (!w) return 0;
  return Math.max(0, (w.target_amount || 0) - (w.saved_amount || 0));
});
const setDepositQuick = (fen) => {
  depositAmount.value = (fen / 100).toString();
};
const doDeposit = async () => {
  const w = detailWish.value;
  if (!w) return;
  const res = safeYuanToFen(depositAmount.value);
  if (!res.ok) return toast("金额无效");
  try {
    if (depositSource.value === "account") {
      if (!depositAccountId.value) return toast("请选择资产账户");
      const bal = depositAccount.value?.current_balance || 0;
      if (res.value > bal) return toast("账户余额不足");
      await depositWishFromAccountAction(
        w._id,
        depositAmount.value,
        depositAccountId.value,
        depositNote.value.trim()
      );
    } else if (depositSource.value === "surplus")
      await depositWishFromSurplusAction(
        w._id,
        depositAmount.value,
        depositNote.value.trim()
      );
    else
      await depositWishFromSavingsAction(
        w._id,
        depositAmount.value,
        depositNote.value.trim()
      );
    depositAmount.value = "";
    depositNote.value = "";
    await loadLogs(w._id);
    syncDetail();
    toast("存入成功", "success");
  } catch (err) {
    toast(err.message || "存入失败");
  }
};

/* 取出 */
const withdrawSource = ref("surplus");
const withdrawSources = [
  { value: "account", label: "到资产账户" },
  { value: "surplus", label: "到结余池" },
  { value: "savings", label: "到存款池" },
];
const withdrawAccountId = ref("");
const withdrawAccount = computed(() =>
  accountList.value.find((a) => a._id === withdrawAccountId.value)
);
const withdrawAmount = ref("");
const withdrawNote = ref("");
const withdrawAccountDisabled = computed(() => noAccount.value);
const withdrawSavingsDisabled = computed(() => (savingsPoolBalanceFen.value || 0) <= 0);
const withdrawSurplusDisabled = computed(() => (surplusPoolBalanceFen.value || 0) <= 0);
const isWithdrawSourceDisabled = (v) =>
  (v === "account" && withdrawAccountDisabled.value) ||
  (v === "savings" && withdrawSavingsDisabled.value) ||
  (v === "surplus" && withdrawSurplusDisabled.value);
const withdrawAccountAfter = computed(() => {
  const amt = safeYuanToFen(withdrawAmount.value).value || 0;
  return (withdrawAccount.value?.current_balance || 0) + amt;
});
const doWithdraw = async () => {
  const w = detailWish.value;
  if (!w) return;
  const res = safeYuanToFen(withdrawAmount.value);
  if (!res.ok) return toast("金额无效");
  if (res.value > (w.saved_amount || 0)) return toast("超过已存金额");
  try {
    if (withdrawSource.value === "account") {
      if (!withdrawAccountId.value) return toast("请选择资产账户");
      await withdrawWishToAccountAction(
        w._id,
        withdrawAmount.value,
        withdrawAccountId.value,
        withdrawNote.value.trim()
      );
    } else if (withdrawSource.value === "surplus")
      await withdrawWishToSurplusAction(
        w._id,
        withdrawAmount.value,
        withdrawNote.value.trim()
      );
    else
      await withdrawWishToSavingsAction(
        w._id,
        withdrawAmount.value,
        withdrawNote.value.trim()
      );
    withdrawAmount.value = "";
    withdrawNote.value = "";
    await loadLogs(w._id);
    syncDetail();
    toast("取出成功");
  } catch (err) {
    toast(err.message || "取出失败");
  }
};

/* 归档 */
const doArchive = async () => {
  const w = detailWish.value;
  if (!w || isDetailArchived.value) return;
  try {
    await archiveWishAction(w._id);
    closeDetail();
    toast("已归档", "success");
  } catch (err) {
    toast(err.message || "归档失败");
  }
};

/* 删除（进入历史心愿，原因=deleted） */
const doDelete = () => {
  const w = detailWish.value;
  if (!w || isDetailArchived.value) return;
  uni.showModal({
    title: "删除心愿",
    content: `确定删除「${w.name}」吗？它将作为「已删除」归档到历史心愿，删除后不可再存入。`,
    confirmText: "删除",
    confirmColor: "#e0556b",
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await deleteWishAction(w._id);
        closeDetail();
        toast("已删除并归档", "success");
      } catch (err) {
        toast(err.message || "删除失败");
      }
    },
  });
};

/* 新建 */
const COVER_PRESETS = [
  {
    label: "🎁",
    gradient: "linear-gradient(135deg,#ebfded 0%,#c6fbce 60%,#8ae99b 100%)",
    color: "#c6fbce",
  },
  {
    label: "🌟",
    gradient: "linear-gradient(135deg,#ffd6e7 0%,#ffc4dd 60%,#ff97c4 100%)",
    color: "#ffc4dd",
  },
  {
    label: "🏖️",
    gradient: "linear-gradient(135deg,#e0f2fe 0%,#bae6fd 60%,#a8d4ff 100%)",
    color: "#bae6fd",
  },
  {
    label: "💰",
    gradient: "linear-gradient(135deg,#f4eeff 0%,#e0d2ff 60%,#cbb6ff 100%)",
    color: "#e0d2ff",
  },
  {
    label: "📚",
    gradient: "linear-gradient(135deg,#fffdf2 0%,#fffae0 60%,#fcd34d 100%)",
    color: "#fffae0",
  },
];

/* 自定义颜色：HSV 拖动取色（与 ledger 取色器一致） */
const showColorModal = ref(false);
const pickerHue = ref(200);
const pickerSat = ref(80);
const pickerVal = ref(90);
const cpBaseColor = computed(() =>
  hsvToHex(pickerHue.value, pickerSat.value, pickerVal.value)
);
function openColorModal() {
  // 用当前已选基色初始化 HSV，避免每次从头开始
  const cur = customThree.value.length ? customThree.value[1].color : "#25cc5d";
  const hsv = hexToHsv(cur);
  pickerHue.value = hsv.h;
  pickerSat.value = hsv.s;
  pickerVal.value = hsv.v;
  showColorModal.value = true;
}
function confirmColorModal() {
  useCustomColor.value = true;
  showColorModal.value = false;
}

/* ===== 系统 Logo 预设（占位矩形，后续替换真实素材） ===== */
/* kind 仅作样式区分；当前用统一矩形占位，替换素材时按 index 映射即可 */
const SYS_LOGO_PRESETS = [
  { id: 0, label: "系统图标 1" },
  { id: 1, label: "系统图标 2" },
  { id: 2, label: "系统图标 3" },
  { id: 3, label: "系统图标 4" },
  { id: 4, label: "系统图标 5" },
  { id: 5, label: "系统图标 6" },
];

/* ===== 上传心愿 Logo ===== */
const showLogoModal = ref(false);
const logoLocalPath = ref(""); // 本地临时预览路径
const logoFileID = ref(""); // 已上传云存储的 fileID（落库值）
const selectedSysLogo = ref(-1); // 已选系统 Logo 序号（-1 未选）
function chooseLogo() {
  uni.chooseImage({
    count: 1,
    sizeType: ["original"], // 保留原始透明通道，不做压缩
    sourceType: ["album", "camera"],
    success: async (res) => {
      const path = res.tempFilePaths[0];
      logoLocalPath.value = path; // 透明背景原样保留
    },
  });
}
function cancelLogoModal() {
  if (logoFileID.value) deleteWishLogo(logoFileID.value); // 已上传但未确认则清理
  logoLocalPath.value = "";
  logoFileID.value = "";
  selectedSysLogo.value = -1;
  showLogoModal.value = false;
}
/* 清除已选封面 Logo（自定义图 / 系统图标） */
function clearLogoSelection() {
  if (logoFileID.value) deleteWishLogo(logoFileID.value);
  logoLocalPath.value = "";
  logoFileID.value = "";
  selectedSysLogo.value = -1;
}
/* 关闭新建心愿面板：若已上传 Logo 到云端但未落库，清理孤儿文件并重置 */
function closeNewWish() {
  if (logoFileID.value) deleteWishLogo(logoFileID.value); // 已上传云端但心愿未创建
  showLogoModal.value = false;
  showNewWish.value = false;
  logoLocalPath.value = "";
  logoFileID.value = "";
  selectedSysLogo.value = -1;
  useCustomColor.value = false;
  newWishName.value = "";
  newWishAmount.value = "";
  newWishDeadline.value = "";
  newWishStart.value = "";
  newWishEnd.value = "";
  newWishStartTime.value = "";
  newWishEndTime.value = "";
  newWishCoverIdx.value = 0;
  pickerHue.value = 200;
  pickerSat.value = 80;
  pickerVal.value = 90;
  customDir.value = "to right";
}
/* 系统 Logo 占位矩形背景（临时，待替换为真实素材） */
function sysLogoPlaceholderBg(idx) {
  const bgs = [
    "rgba(255,255,255,0.85)",
    "rgba(255,240,200,0.9)",
    "rgba(220,240,255,0.9)",
    "rgba(235,225,255,0.9)",
    "rgba(220,255,230,0.9)",
    "rgba(255,225,235,0.9)",
  ];
  return bgs[idx % bgs.length];
}
/* 选择系统 Logo（占位矩形，无上传） */
function selectSysLogo(idx) {
  // 切换为系统 Logo 时，清掉已上传的自定义图（避免混淆）
  if (logoFileID.value) deleteWishLogo(logoFileID.value);
  logoLocalPath.value = "";
  logoFileID.value = "";
  selectedSysLogo.value = idx;
}
async function confirmLogoModal() {
  // 系统 Logo：无需上传，直接确认
  if (selectedSysLogo.value >= 0) {
    showLogoModal.value = false;
    return;
  }
  if (!logoLocalPath.value) {
    toast("请先选择图片或系统图标");
    return;
  }
  try {
    // 本地预览为 dataURL 或临时路径；若为 dataURL（抠图后）需先落盘再上传
    let upPath = logoLocalPath.value;
    if (upPath.startsWith("data:image")) {
      upPath = await new Promise((resolve, reject) => {
        const base64 = upPath.split(",")[1];
        const fs = uni.getFileSystemManager();
        const fp = `${uni.env.USER_DATA_PATH}/logo_${Date.now()}.png`;
        fs.writeFile({
          filePath: fp,
          data: base64,
          encoding: "base64",
          success: () => resolve(fp),
          fail: reject,
        });
      });
    }
    const { fileID } = await uploadWishLogo(upPath);
    logoFileID.value = fileID;
    showLogoModal.value = false;
  } catch (e) {
    toast("上传失败：" + (e?.message || e));
  }
}

/* 取色器视觉样式（背景随时钟更新） */
const svStyle = computed(() => ({
  background: `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgba(255,255,255,0)), hsl(${pickerHue.value}, 100%, 50%)`,
}));
const svCursorStyle = computed(() => ({
  left: pickerSat.value + "%",
  top: 100 - pickerVal.value + "%",
  background: cpBaseColor.value,
}));
const hueStyle = computed(() => ({
  background:
    "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0f0 50%, #0ff 67%, #f0f 83%, #f00 100%)",
}));
const hueCursorStyle = computed(() => ({
  left: (pickerHue.value / 360) * 100 + "%",
}));

/* 拖动取坐标（小程序触摸事件在 touchstart 的元素上持续派发 touchmove） */
let _svRect = null;
let _hueRect = null;
function getRect(sel) {
  return new Promise((resolve) => {
    uni
      .createSelectorQuery()
      .select(sel)
      .boundingClientRect((r) => resolve(r || null))
      .exec();
  });
}
async function onSvStart(e) {
  _svRect = await getRect(".cp-sv");
  onSvMove(e);
}
function onSvMove(e) {
  if (!_svRect) return;
  const t = e.touches[0];
  let x = (t.clientX - _svRect.left) / _svRect.width;
  let y = (t.clientY - _svRect.top) / _svRect.height;
  x = Math.max(0, Math.min(1, x));
  y = Math.max(0, Math.min(1, y));
  pickerSat.value = Math.round(x * 100);
  pickerVal.value = Math.round((1 - y) * 100);
}
async function onHueStart(e) {
  _hueRect = await getRect(".cp-hue");
  onHueMove(e);
}
function onHueMove(e) {
  if (!_hueRect) return;
  const t = e.touches[0];
  let x = (t.clientX - _hueRect.left) / _hueRect.width;
  x = Math.max(0, Math.min(1, x));
  pickerHue.value = Math.round(x * 360);
}

/* HEX -> HSL */
function hexToHsl(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let sat = 0;
  const lum = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = lum > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) hue = ((b - r) / d + 2) / 6;
    else hue = ((r - g) / d + 4) / 6;
  }
  return { h: hue * 360, s: sat * 100, l: lum * 100 };
}
/* HSL -> HEX */
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
/* 基于基色生成三衍生色（HSL 调整亮度/饱和度），组合成三色标渐变 */
function buildGradient(baseHex, dir) {
  const { h, s, l } = hexToHsl(baseHex);
  const light = hslToHex(h, Math.max(0, s - 8), Math.min(100, l + 14)); // 浅
  const base = hslToHex(h, s, l); // 基准
  const deep = hslToHex(h, Math.min(100, s + 6), Math.max(0, l - 14)); // 深
  return {
    gradient: `linear-gradient(${dir}, ${light} 0%, ${base} 60%, ${deep} 100%)`,
    colors: [
      { label: "浅", color: light },
      { label: "基", color: base },
      { label: "深", color: deep },
    ],
  };
}

const useCustomColor = ref(false);
const customDir = ref("to right");

const customThree = computed(
  () => buildGradient(cpBaseColor.value, customDir.value).colors
);
const activeGradient = computed(() => {
  if (useCustomColor.value) {
    return buildGradient(cpBaseColor.value, customDir.value).gradient;
  }
  return COVER_PRESETS[newWishCoverIdx.value].gradient;
});
const activeLabel = computed(() =>
  useCustomColor.value ? "🎨" : COVER_PRESETS[newWishCoverIdx.value].label
);
/* 取色弹框内的实时预览：弹框打开时直接反映取色器当前基色，不依赖 useCustomColor */
const pickerGradient = computed(
  () => buildGradient(cpBaseColor.value, customDir.value).gradient
);
const pickerLabel = computed(() => "🎨");
function selectPreset(i) {
  useCustomColor.value = false;
  newWishCoverIdx.value = i;
}

const showNewWish = ref(false);
const newWishName = ref("");
const newWishAmount = ref("");

const newWishDeadline = ref("");
const showDatePicker = ref(false);
const newWishStart = ref(""); // YYYY-MM-DD 起始
const newWishEnd = ref(""); // YYYY-MM-DD 截止
const newWishStartTime = ref(""); // HH:mm:ss 起始时间
const newWishEndTime = ref(""); // HH:mm:ss 截止时间
const dateRangeText = computed(() => {
  if (newWishStart.value && newWishEnd.value) {
    const s = newWishStartTime.value
      ? `${newWishStart.value} ${newWishStartTime.value}`
      : newWishStart.value;
    const e = newWishEndTime.value
      ? `${newWishEnd.value} ${newWishEndTime.value}`
      : newWishEnd.value;
    return `${s} ~ ${e}`;
  }
  return "";
});
function onDateRangeConfirm(payload) {
  newWishStart.value = payload.start || "";
  newWishEnd.value = payload.end || "";
  newWishStartTime.value = payload.startTime || "";
  newWishEndTime.value = payload.endTime || "";
  newWishDeadline.value = newWishEnd.value; // 兼容旧字段：截止 = 区间终点
}
const newWishCoverIdx = ref(0);
const createWish = async () => {
  if (!newWishName.value.trim()) return toast("请输入心愿名称");
  const res = safeYuanToFen(newWishAmount.value);
  if (!res.ok) return toast("目标金额无效");
  // 封面拆分为两个独立字段：图片(fileID/系统图标) + 渐变色
  const coverImageUrl = logoFileID.value
    ? logoFileID.value
    : selectedSysLogo.value >= 0
    ? `sys::${selectedSysLogo.value}`
    : "";
  const coverGradient = useCustomColor.value
    ? activeGradient.value
    : COVER_PRESETS[newWishCoverIdx.value].gradient;
  try {
    await createWishAction({
      name: newWishName.value.trim(),
      target_amount: res.value,
      start_date: newWishStart.value || "",
      end_date: newWishEnd.value || "",
      start_time: newWishStartTime.value || "",
      end_time: newWishEndTime.value || "",
      deadline: newWishEnd.value || "",
      cover_image_url: coverImageUrl,
      cover_gradient: coverGradient,
    });
    showNewWish.value = false;
    useCustomColor.value = false;
    logoLocalPath.value = "";
    logoFileID.value = "";
    selectedSysLogo.value = -1;
    pickerHue.value = 200;
    pickerSat.value = 80;
    pickerVal.value = 90;
    customDir.value = "to right";
    newWishName.value = "";
    newWishAmount.value = "";
    newWishDeadline.value = "";
    newWishStart.value = "";
    newWishEnd.value = "";
    newWishCoverIdx.value = 0;
    toast("心愿已创建", "success");
  } catch (err) {
    // 保存失败：若 logo 已上传到云端但数据库未落库，清理孤儿文件
    if (logoFileID.value) deleteWishLogo(logoFileID.value);
    selectedSysLogo.value = -1;
    toast(err.message || "创建失败");
  }
};

/* 存款池存取 */
const showSavings = ref(false);
const savingsMode = ref("deposit");
const savingsAmount = ref("");
const openSavings = (mode) => {
  savingsMode.value = mode;
  showSavings.value = true;
};
const doSavings = async () => {
  const res = safeYuanToFen(savingsAmount.value);
  if (!res.ok) return toast("金额无效");
  try {
    if (savingsMode.value === "deposit")
      await depositSavingsPoolAction(res.value, "manual");
    else await withdrawSavingsPoolAction(res.value, "manual");
    savingsAmount.value = "";
    toast("操作成功", "success");
  } catch (err) {
    toast(err.message || "操作失败");
  }
};
</script>

<style scoped lang="scss">
.wish-page {
  @include sj-theme-css-vars;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  background: #f2fcf2;

  .wish-header {
    flex-shrink: 0;
  }

  // 内容根容器：强制约束宽度，防止 flex 子项在微信 scroll-view 内横向溢出
  .wish-scroll-inner {
    width: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }

  .topbar {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 180rpx 44rpx 0;

    &-main {
      margin-bottom: 8rpx;
    }

    &-title {
      font-size: 48rpx;
      font-weight: 900;
      color: var(--ink);
      letter-spacing: -1rpx;
      display: block;
    }

    &-sub {
      font-size: 26rpx;
      color: var(--ink3);
      margin-top: 4rpx;
      display: block;
    }
  }

  .add-btn {
    width: 84rpx;
    height: 84rpx;
    border-radius: 50%;
    @include sj-brand-gradient(135deg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10rpx 30rpx rgba(37, 204, 93, 0.4);
    cursor: pointer;

    &-icon {
      font-size: 48rpx;
      color: #fff;
      font-weight: 300;
      line-height: 1;
    }

    &-pulse {
      animation: addBtnPulse 2.4s ease-in-out infinite;
    }
  }

  @keyframes addBtnPulse {
    0% {
      transform: scale(1);
      box-shadow: 0 10rpx 30rpx rgba(37, 204, 93, 0.4);
    }

    50% {
      transform: scale(1.06);
      box-shadow: 0 14rpx 40rpx rgba(37, 204, 93, 0.55);
    }

    100% {
      transform: scale(1);
      box-shadow: 0 10rpx 30rpx rgba(37, 204, 93, 0.4);
    }
  }

  .pool-card-wrap {
    position: relative;
    z-index: 10;
    padding: 32rpx 44rpx 0;
  }

  .wish-pool-card {
    position: relative;
    overflow: hidden;
    border-radius: 56rpx;
    padding: 36rpx 40rpx;
    cursor: pointer;
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.78) 0%,
      rgba(225, 250, 230, 0.68) 50%,
      rgba(194, 242, 200, 0.58) 100%
    );
    backdrop-filter: blur(48rpx) saturate(2);
    -webkit-backdrop-filter: blur(48rpx) saturate(2);
    border: 3rpx solid rgba(255, 255, 255, 0.9);
    box-shadow: 0 32rpx 96rpx rgba(37, 204, 93, 0.16), 0 8rpx 32rpx rgba(37, 204, 93, 0.1),
      inset 0 3rpx 0 rgba(255, 255, 255, 0.95);
  }

  .pool-float {
    animation: poolFloat 5.5s ease-in-out infinite;
  }

  @keyframes poolFloat {
    0%,
    100% {
      transform: translateY(0) rotate(0deg);
    }

    33% {
      transform: translateY(-12rpx) rotate(1.5deg);
    }

    66% {
      transform: translateY(-6rpx) rotate(-1deg);
    }
  }

  .pool-glow {
    position: absolute;
    border-radius: 50%;
    animation: poolGlow 3s ease-in-out infinite;
  }

  @keyframes poolGlow {
    0%,
    100% {
      opacity: 0.55;
      transform: scale(1);
    }

    50% {
      opacity: 0.85;
      transform: scale(1.05);
    }
  }

  .glow-a {
    top: -60rpx;
    right: -60rpx;
    width: 260rpx;
    height: 260rpx;
    background: radial-gradient(circle, rgba(137, 229, 156, 0.27) 0%, transparent 70%);
    filter: blur(48rpx);
  }

  .glow-b {
    bottom: -40rpx;
    left: -40rpx;
    width: 200rpx;
    height: 200rpx;
    background: radial-gradient(circle, rgba(194, 242, 200, 0.2) 0%, transparent 70%);
    filter: blur(36rpx);
  }

  .pool-card-inner {
    position: relative;
    z-index: 1;
  }

  .pool-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 28rpx;

    &-left {
      display: flex;
      align-items: center;
      gap: 16rpx;
    }
  }

  .pool-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--g4) 0%, var(--g5) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    box-shadow: 0 8rpx 24rpx rgba(37, 204, 93, 0.27);
  }

  .pool-title {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--ink);
    display: block;
  }

  .pool-sub {
    font-size: 22rpx;
    color: var(--ink3);
    display: block;
    margin-top: 2rpx;
  }

  .pool-head-right {
    display: flex;
    align-items: center;
    gap: 8rpx;
    position: relative;
  }

  .pool-trend-icon {
    font-size: 22rpx;

    &.up {
      color: var(--g5);
    }

    &.down {
      color: var(--r8);
    }
  }

  .pool-trend-val {
    font-size: 22rpx;
    color: var(--g5);
    font-weight: 600;
  }

  .pool-arrow {
    font-size: 28rpx;
    color: var(--ink4);
  }

  .monthly-bubble {
    position: absolute;
    top: 52rpx;
    right: 0;
    z-index: 20;
    width: 320rpx;
    padding: 22rpx 24rpx;
    background: rgba(255, 255, 255, 0.96);
    border-radius: 20rpx;
    box-shadow: 0 16rpx 48rpx rgba(20, 30, 50, 0.18);
    display: flex;
    flex-direction: column;
  }

  .monthly-bubble-title {
    font-size: 22rpx;
    color: var(--ink3);
    margin-bottom: 14rpx;
  }

  .monthly-bubble-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10rpx;
  }

  .monthly-bubble-label {
    font-size: 24rpx;
    color: var(--ink);
  }

  .monthly-bubble-val {
    font-size: 24rpx;
    font-weight: 700;
    color: var(--g5);

    &.total {
      color: var(--ink);
    }
  }

  .monthly-bubble-divider {
    height: 1rpx;
    background: var(--g3);
    margin: 4rpx 0 12rpx;
  }

  .pool-balance-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
  }

  .pool-balance-label {
    font-size: 22rpx;
    color: var(--ink4);
    display: block;
    margin-bottom: 4rpx;
  }

  .pool-balance-val {
    font-size: 60rpx;
    font-weight: 900;
    color: var(--ink);
    letter-spacing: -2rpx;
    display: block;
  }

  .pool-summary {
    text-align: right;

    &-label {
      font-size: 22rpx;
      color: var(--ink4);
      display: block;
    }

    &-val {
      font-size: 32rpx;
      font-weight: 800;
      color: var(--ink2);
      display: block;
    }

    &-sub {
      font-size: 22rpx;
      color: var(--ink4);
      display: block;
    }
  }

  .pool-progress {
    margin-top: 24rpx;

    &-head {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10rpx;
    }

    &-label {
      font-size: 22rpx;
      color: var(--ink3);
    }

    &-pct {
      font-size: 22rpx;
      font-weight: 700;
      color: var(--g5);
    }
  }

  .wish-progress-track {
    background: rgba(194, 242, 200, 0.32);
    border-radius: 99rpx;
    overflow: hidden;
    height: 12rpx;
  }

  .wish-progress-fill {
    height: 100%;
    border-radius: 99rpx;
    background: linear-gradient(90deg, var(--g4) 0%, var(--g5) 100%);
    transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .wish-tabs {
    position: relative;
    z-index: 10;
    display: flex;
    margin: 28rpx 44rpx 0;
    padding: 8rpx;
    background: rgba(194, 242, 200, 0.22);
    border-radius: 32rpx;
  }

  .wish-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10rpx;
    padding: 16rpx 0;
    font-size: 26rpx;
    border-radius: 24rpx;
  }

  .wish-tab-idle {
    color: var(--ink3);
  }

  .wish-tab-active {
    color: var(--ink);
    background: #fff;
    font-weight: 700;
    box-shadow: 0 8rpx 20rpx rgba(20, 30, 50, 0.08);
  }

  .wish-tab-icon {
    font-size: 26rpx;
  }

  .wish-tab-count {
    font-size: 22rpx;
    opacity: 0.7;
  }

  /* 历史心愿二级筛选 */
  .archived-filter {
    display: flex;
    gap: 16rpx;
    padding: 20rpx 44rpx 4rpx;
    flex-shrink: 0;
  }

  .archived-filter-chip {
    padding: 10rpx 24rpx;
    border-radius: 999rpx;
    font-size: 24rpx;
    color: var(--t2);
    background: rgba(255, 255, 255, 0.55);
    border: 2rpx solid transparent;
    transition: all 0.15s ease;
  }

  .archived-filter-chip.active {
    color: #fff;
    background: linear-gradient(135deg, #7ad389 0%, #57c06f 100%);
    box-shadow: 0 6rpx 16rpx rgba(87, 192, 111, 0.28);
  }

  /* 历史心愿卡片原因标签 */
  .wish-card-archived {
    opacity: 0.96;
  }

  .wish-reason-badge {
    position: absolute;
    top: 14rpx;
    left: 14rpx;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    color: #fff;
    background: rgba(20, 30, 50, 0.42);
    backdrop-filter: blur(4rpx);
  }

  .wish-cover {
    position: relative;
  }

  /* 详情归档原因标签 */
  .detail-reason-badge {
    margin-left: 12rpx;
    padding: 4rpx 16rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
    color: #fff;
    background: linear-gradient(135deg, #9a8cff 0%, #7c6cf0 100%);
  }

  /* 历史心愿只读说明 */
  .archived-readonly {
    margin-top: 8rpx;
    padding: 24rpx;
    border-radius: 24rpx;
    background: rgba(20, 30, 50, 0.04);
  }

  .archived-readonly-text {
    font-size: 24rpx;
    line-height: 1.6;
    color: var(--t2);
  }

  .wish-empty {
    border-radius: 32rpx;

    &-ph {
      width: 120rpx;
      height: 120rpx;
      margin: 0 auto 24rpx;
      border-radius: 24rpx;
      background: var(--g3);
    }

    &-text {
      font-size: 28rpx;
      font-weight: 700;
      color: var(--ink);
      display: block;
      margin-bottom: 8rpx;
    }

    &-sub {
      font-size: 22rpx;
      color: var(--ink4);
    }
  }

  .compliance-banner {
    border-radius: 28rpx;
    display: flex;
    align-items: flex-start;
    gap: 16rpx;

    .compliance-icon {
      font-size: 28rpx;
    }

    .compliance-text {
      flex: 1;
      font-size: 22rpx;
      color: var(--ink4);
      line-height: 1.5;
    }
  }

  /* 上传 Logo 入口 / 弹框 */
  .cp-upload-entry {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 20rpx 24rpx;
    margin-bottom: 24rpx;
    border-radius: 18rpx;
    background: rgba(37, 204, 93, 0.08);
    border: 2rpx dashed rgba(37, 204, 93, 0.4);
    cursor: pointer;
  }

  .cp-upload-entry-icon {
    font-size: 32rpx;
  }

  .cp-upload-entry-text {
    font-size: 26rpx;
    color: var(--g5);
    font-weight: 600;
  }

  .cp-upload-box {
    width: 100%;
    height: 320rpx;
    border-radius: 20rpx;
    background: rgba(0, 0, 0, 0.03);
    border: 2rpx dashed rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    cursor: pointer;
  }

  .cp-upload-img {
    width: 100%;
    height: 100%;
  }

  .cp-upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10rpx;
  }

  .cp-upload-plus {
    font-size: 64rpx;
    color: var(--ink4);
    line-height: 1;
  }

  .cp-upload-tip {
    font-size: 24rpx;
    color: var(--ink4);
  }

  .cp-upload-hint {
    display: block;
    font-size: 22rpx;
    color: var(--ink4);
    margin: 14rpx 0 4rpx;
    line-height: 1.5;
  }

  /* 封面 / 详情中的 logo 图片（透明保持） */
  .newwish-cover-logo,
  .wish-cover-logo,
  .detail-logo {
    width: 140rpx;
    height: 140rpx;
    border-radius: 20rpx;
  }

  /* 系统 Logo 占位矩形（待替换真实素材） */
  .newwish-cover-syslogo,
  .wish-cover-syslogo,
  .detail-syslogo {
    width: 140rpx;
    height: 140rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .newwish-cover-syslogo-text,
  .wish-cover-syslogo-text,
  .detail-syslogo-text {
    font-size: 22rpx;
    color: var(--ink6);
    text-align: center;
    padding: 0 8rpx;
  }

  /* 封面板中「选择系统图标/上传 Logo」入口 */
  .newwish-logo-entry {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin: 18rpx 28rpx 6rpx;
    padding: 18rpx 20rpx;
    background: var(--g0);
    border-radius: 16rpx;
  }

  .newwish-logo-entry-icon {
    font-size: 32rpx;
  }

  .newwish-logo-entry-text {
    flex: 1;
    font-size: 26rpx;
    color: var(--ink5);
  }

  .newwish-logo-entry-clear {
    font-size: 24rpx;
    color: #e0556b;
  }

  /* 弹框内系统图标网格 */
  .cp-subtitle {
    display: block;
    font-size: 24rpx;
    color: var(--ink4);
    margin: 16rpx 0 12rpx;
  }

  .sys-logo-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
  }

  .sys-logo-item {
    width: calc((100% - 32rpx) / 3);
    height: 120rpx;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3rpx solid transparent;
  }

  .sys-logo-item.active {
    border-color: #25cc5d;
  }

  .sys-logo-text {
    font-size: 22rpx;
    color: var(--ink6);
    text-align: center;
    padding: 0 6rpx;
  }

  .cp-divider {
    height: 1rpx;
    background: var(--g3, #e3e8eb);
    margin: 22rpx 0 14rpx;
  }

  .sheet-overlay {
    position: fixed;
    inset: 0;
    // background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(4rpx);
    -webkit-backdrop-filter: blur(4rpx);
    z-index: 200;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .wish-sheet {
    background: rgba(248, 255, 250, 0.96);
    backdrop-filter: blur(64rpx) saturate(2);
    -webkit-backdrop-filter: blur(64rpx) saturate(2);
    border-top: 3rpx solid rgba(255, 255, 255, 0.95);
    border-radius: 64rpx 64rpx 0 0;
    box-shadow: 0 -32rpx 96rpx rgba(37, 204, 93, 0.14), 0 -8rpx 32rpx rgba(0, 0, 0, 0.06);
  }

  .sheet-panel {
    width: 100%;
    max-height: 85vh;
    overflow-y: auto;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.98),
      rgba(242, 252, 242, 0.96)
    );
    border-radius: 48rpx 48rpx 0 0;
  }

  /* ── Sheet 滑入 ── */
  @keyframes sheetSlideUp {
    0% {
      transform: translateY(100%);
      opacity: 0;
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .sheet-slide-up {
    animation: sheetSlideUp 0.36s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .sheet-handle {
    display: flex;
    justify-content: center;
    padding: 24rpx 0 16rpx;

    .handle-bar {
      width: 76rpx;
      height: 8rpx;
      border-radius: 6rpx;
      background: rgba(194, 242, 200, 0.8);
    }
  }

  .sheet-title {
    font-size: 32rpx;
    font-weight: 800;
    color: var(--ink);
    display: block;
    padding: 0 40rpx 28rpx;
  }

  /* 新建心愿弹窗 */
  .wish-new-panel {
    padding-bottom: 48rpx;
  }

  .newwish-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8rpx 40rpx 20rpx;
  }

  .newwish-title {
    font-size: 32rpx;
    font-weight: 800;
    color: var(--ink);
  }

  .newwish-close {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: rgba(194, 242, 200, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .newwish-close-x {
    font-size: 36rpx;
    line-height: 1;
    color: var(--ink3);
  }

  .newwish-cover {
    position: relative;
    margin: 0 40rpx 32rpx;
    height: 176rpx;
    border-radius: 40rpx;
    display: flex;
    align-items: center;
    padding: 0 40rpx;
    border: 3rpx solid rgba(255, 255, 255, 0.82);
    overflow: hidden;
  }

  .newwish-cover::after {
    content: "";
    position: absolute;
    top: -40rpx;
    right: -40rpx;
    width: 180rpx;
    height: 180rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.22);
    filter: blur(32rpx);
  }

  .newwish-cover-emoji {
    font-size: 64rpx;
    margin-right: 22rpx;
  }

  .newwish-cover-meta {
    display: flex;
    flex-direction: column;
  }

  .newwish-cover-name {
    font-size: 32rpx;
    font-weight: 800;
    color: var(--ink);
  }

  .newwish-cover-target {
    font-size: 24rpx;
    color: var(--ink3);
  }

  .newwish-covers {
    display: flex;
    gap: 16rpx;
    padding: 0 40rpx 24rpx;
  }

  .newwish-cover-chip {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 34rpx;
    border: 4rpx solid transparent;
    cursor: pointer;
    transition: border 0.18s, box-shadow 0.18s;

    &.active {
      border-color: var(--g5);
      box-shadow: 0 4rpx 20rpx rgba(87, 192, 111, 0.4);
    }

    &--custom.active {
      border-color: var(--pu5);
      box-shadow: 0 4rpx 20rpx rgba(124, 108, 248, 0.4);
    }
  }

  .cp-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 400;
    /* 高于 .sheet-overlay(300)，确保从面板内打开时位于最上层 */
  }

  .cp-panel {
    width: 84%;
    max-width: 620rpx;
    padding: 36rpx;
    border-radius: 28rpx;
    background: #fff;
    box-shadow: 0 12rpx 48rpx rgba(0, 0, 0, 0.18);
  }

  .cp-title {
    display: block;
    font-size: 30rpx;
    font-weight: 700;
    color: var(--ink2);
    margin-bottom: 24rpx;
  }

  .cp-actions {
    display: flex;
    gap: 20rpx;
    margin-top: 28rpx;
  }

  .cp-cancel,
  .cp-confirm {
    flex: 1;
    text-align: center;
    padding: 22rpx 0;
    font-size: 28rpx;
    border-radius: 18rpx;
    cursor: pointer;
  }

  .cp-cancel {
    background: rgba(0, 0, 0, 0.06);
    color: var(--ink3);
  }

  .cp-confirm {
    background: var(--g5);
    color: #fff;
    font-weight: 600;
  }

  .cp-sv {
    position: relative;
    width: 100%;
    height: 320rpx;
    border-radius: 20rpx;
    margin-bottom: 24rpx;
    cursor: crosshair;
    overflow: hidden;
  }

  .cp-sv-cursor {
    position: absolute;
    width: 32rpx;
    height: 32rpx;
    border-radius: 50%;
    border: 4rpx solid #fff;
    box-shadow: 0 0 0 2rpx rgba(0, 0, 0, 0.3);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .cp-hue {
    position: relative;
    width: 100%;
    height: 32rpx;
    border-radius: 16rpx;
    margin-bottom: 8rpx;
    cursor: pointer;
  }

  .cp-hue-cursor {
    position: absolute;
    top: 50%;
    width: 32rpx;
    height: 32rpx;
    border-radius: 50%;
    border: 4rpx solid #fff;
    box-shadow: 0 0 0 2rpx rgba(0, 0, 0, 0.3);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .custom-dir {
    margin-bottom: 24rpx;
  }

  .custom-dir-label {
    display: block;
    font-size: 24rpx;
    color: var(--ink3);
    margin-bottom: 14rpx;
  }

  .custom-dir-opts {
    display: flex;
    gap: 14rpx;
  }

  .custom-dir-opt {
    flex: 1;
    text-align: center;
    padding: 14rpx 0;
    font-size: 24rpx;
    border-radius: 16rpx;
    background: rgba(255, 255, 255, 0.7);
    color: var(--ink3);
    border: 2rpx solid transparent;
    cursor: pointer;

    &.active {
      border-color: var(--pu5);
      color: var(--pu5);
      font-weight: 600;
    }
  }

  .custom-preview {
    height: 120rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 22rpx 0rpx;
  }

  .custom-preview-emoji {
    font-size: 48rpx;
  }

  .custom-colors {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }

  .custom-color-item {
    display: flex;
    align-items: center;
    gap: 14rpx;
  }

  .custom-color-dot {
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    border: 2rpx solid rgba(0, 0, 0, 0.1);
  }

  .custom-color-text {
    font-size: 22rpx;
    color: var(--ink3);
    letter-spacing: 0.3rpx;
  }

  .newwish-label {
    display: block;
    font-size: 24rpx;
    font-weight: 600;
    color: var(--ink3);
    padding: 0 40rpx 10rpx;
  }

  .sheet-input {
    box-sizing: border-box;
    width: calc(100% - 80rpx);
    margin: 0 40rpx 20rpx;
    height: 88rpx;
    border-radius: 28rpx;
    background: rgba(242, 252, 242, 0.8);
    border: 2rpx solid rgba(194, 242, 200, 0.4);
    padding: 0 28rpx;
    font-size: 28rpx;
  }

  /* 日期区间触发入口：与普通 input 同框同高 */
  .date-range-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .date-range-text {
    flex: 1;
    font-size: 28rpx;
    color: var(--ink5);
  }

  .date-range-arrow {
    font-size: 36rpx;
    color: var(--g5);
    margin-left: 12rpx;
  }

  /* number-field 内嵌时：外框由外层 view.sheet-input 提供，内部铺满即可 */
  .sheet-input-inner {
    width: 100%;
    height: 100%;
    font-size: 28rpx;
    color: var(--ink5);
  }

  .save-btn {
    margin: 28rpx 40rpx 60rpx;
    padding: 28rpx;
    border-radius: 32rpx;
    @include sj-brand-gradient(135deg);
    text-align: center;
    color: #fff;
    font-size: 28rpx;
    font-weight: 800;
    cursor: pointer;
  }

  /* ── 详情 Sheet（对齐示例 React 版） ── */

  .wish-sheet-handle {
    width: 72rpx;
    height: 8rpx;
    border-radius: 99rpx;
    background: rgba(137, 229, 156, 0.5);
    margin: 24rpx auto 0;
  }

  /* 封面 header */
  .detail-header {
    position: relative;
    margin: 128rpx 40rpx 0;
    border-radius: 44rpx;
    padding: 36rpx 40rpx;
    // overflow: hidden;
    border: 2rpx solid rgba(255, 255, 255, 0.45);
    /* 内浮雕：外阴影 + 内高光/内暗，营造浮起又内凹的白玻璃质感 */
    box-shadow: 0 16rpx 48rpx rgba(37, 204, 93, 0.1),
      inset 0 3rpx 0 rgba(255, 255, 255, 0.9),
      inset 0 -10rpx 24rpx rgba(37, 204, 93, 0.06);

    // 底层：白色背景 + 居中 logo（毛玻璃后朦胧可见，z-index:0）
    &-bg {
      position: absolute;
      top: 0rpx;
      left: 0;
      inset: 0;
      border-radius: inherit;
      z-index: 0;
      pointer-events: none;
      // background: #c9c0c0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    // 中层：更白一点的内浮雕毛玻璃罩（叠在渐变上，z-index:1）
    &-glass {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      z-index: 1;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10rpx) saturate(1.25);
      -webkit-backdrop-filter: blur(10rpx) saturate(1.25);
      /* 内浮雕高光（顶）+ 内暗（底），加强白玻璃的凹凸感 */
      box-shadow: inset 0 3rpx 10rpx rgba(255, 255, 255, 0.85),
        inset 0 -8rpx 20rpx rgba(0, 0, 0, 0.05);
      pointer-events: none;
    }
  }

  /* 底衬内 logo（class 名与模板一致：detail-bg-*），统一绝对定位钉在顶部上移 */
  .detail-bg-logo {
    position: absolute;
    top: -104rpx;
    width: 250rpx;
    height: 250rpx;
    /* 覆盖父级 flex 居中，改为贴顶上移 */
    align-self: flex-start;
    margin-top: 8rpx;
  }

  /* 不透明图（aspectFill）：铺满整张卡片，跟随圆角裁切 */
  .detail-bg-logo--fill {
    position: absolute;
    top: -104rpx;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    object-fit: cover;
    object-position: center top;
  }

  .detail-bg-syslogo {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    &-text {
      font-size: 80rpx;
      color: #fff;
      font-weight: 700;
    }
  }

  .detail-bg-emoji {
    font-size: 200rpx;
    line-height: 1;
  }

  .detail-header-glow {
    position: absolute;
    top: -40rpx;
    right: -40rpx;
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    filter: blur(40rpx);
    pointer-events: none;
    z-index: 2;
  }

  .detail-header-top {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  .detail-header-left {
    display: flex;
    align-items: center;
    gap: 20rpx;
  }

  .detail-logo {
    width: 96rpx;
    height: 96rpx;
    border-radius: 28rpx;
    background: rgba(255, 255, 255, 0.85);
  }

  .detail-syslogo {
    width: 96rpx;
    height: 96rpx;
    border-radius: 28rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    &-text {
      font-size: 24rpx;
      color: #fff;
      font-weight: 700;
    }
  }

  .detail-emoji {
    font-size: 64rpx;
    line-height: 1;
  }

  .detail-title-wrap {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }

  .detail-name {
    font-size: 36rpx;
    font-weight: 800;
    color: var(--ink);
  }

  .detail-deadline {
    font-size: 24rpx;
    color: var(--ink2);
  }

  .detail-close {
    width: 60rpx;
    height: 60rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30rpx;
    color: var(--ink3);
    cursor: pointer;
  }

  /* 进度 */
  .detail-progress {
    position: relative;
    z-index: 2;
    margin-top: 28rpx;
  }

  .detail-progress-top,
  .detail-progress-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .detail-progress-top {
    margin-bottom: 24rpx;
  }

  .detail-progress-saved {
    font-size: 24rpx;
    color: var(--ink2);
  }

  .detail-progress-pct {
    font-size: 24rpx;
    font-weight: 700;
    color: var(--g5);
    /* 实际颜色由 :style 动态绑定 detailProgressPctColor（封面同色系）覆盖 */
  }

  .detail-bar {
    height: 24rpx;
    border-radius: 12rpx;
    background: rgba(255, 255, 255, 0.45);
    overflow: hidden;
    box-shadow: inset 0 1rpx 3rpx rgba(0, 0, 0, 0.06);

    &-fill {
      height: 100%;
      border-radius: 10rpx;
      box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.12);
    }
  }

  .detail-progress-bottom {
    margin-top: 12rpx;
  }

  .detail-progress-target,
  .detail-progress-left {
    font-size: 22rpx;
    color: var(--ink3);
  }
  .detail-progress-over {
    color: #f53f3f;
    font-weight: 600;
  }

  /* 达成徽章 */
  .detail-done-badge {
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 12rpx;
    margin-top: 20rpx;
    padding: 8rpx 24rpx;
    border-radius: 40rpx;
    background: rgba(37, 204, 93, 0.13);
    border: 2rpx solid rgba(37, 204, 93, 0.33);
    font-size: 24rpx;
    font-weight: 700;
    color: var(--g5);
  }

  .detail-reason-badge {
    position: relative;
    z-index: 2;
    display: inline-block;
    margin-top: 16rpx;
    font-size: 22rpx;
    color: var(--ink3);
  }

  /* Tab 切换 */
  .wish-tabs {
    display: flex;
    gap: 0;
    margin: 32rpx 40rpx 0;
    background: rgba(194, 242, 200, 0.22); /* 兜底，实际由 :style detailTabBg 覆盖 */
    border-radius: 32rpx;
    padding: 8rpx;
  }

  .wish-tab {
    flex: 1;
    text-align: center;
    padding: 16rpx 0;
    border-radius: 24rpx;
    font-size: 26rpx;
    font-weight: 600;
    color: var(--ink3);
    cursor: pointer;

    &.active {
      background: #fff;
      color: var(--g5); /* 兜底，实际由 :style detailTabActiveColor 覆盖 */
      box-shadow: 0 4rpx 16rpx rgba(37, 204, 93, 0.12); /* 兜底 */
    }
  }

  /* 详情面板 */
  .detail-panel {
    padding: 32rpx 40rpx 56rpx;
  }

  .detail-cards {
    display: flex;
    gap: 20rpx;
    margin-bottom: 28rpx;
  }

  .detail-stat {
    flex: 1;
    background: rgba(255, 255, 255, 0.68);
    border-radius: 32rpx;
    padding: 24rpx 28rpx;
    border: 2rpx solid rgba(255, 255, 255, 0.8);

    &-label {
      font-size: 22rpx;
      color: var(--ink4);
      display: block;
    }

    &-value {
      font-size: 40rpx;
      font-weight: 800;
      color: var(--g5);
      margin-top: 4rpx;
      display: block;
    }
  }

  /* 操作按钮区 */
  .detail-op-row {
    display: flex;
    gap: 20rpx;
    margin-bottom: 28rpx;
  }

  .wish-btn-primary {
    flex: 1;
    padding: 28rpx 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    border-radius: 28rpx;
    @include sj-brand-gradient(135deg);
    color: #fff;
    font-size: 28rpx;
    font-weight: 700;
    cursor: pointer;
  }

  .wish-btn-ghost {
    flex: 1;
    padding: 28rpx 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    border-radius: 28rpx;
    background: rgba(255, 255, 255, 0.7);
    border: 2rpx solid #c2f2c8;
    color: var(--ink3);
    font-size: 28rpx;
    font-weight: 700;
    cursor: pointer;
  }

  .wish-btn-archive {
    flex: 1;
    padding: 28rpx 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10rpx;
    border-radius: 28rpx;
    background: linear-gradient(135deg, #fffbe6 0%, #fff3c0 100%);
    border: 2rpx solid rgba(245, 158, 11, 0.4);
    color: #d97706;
    font-size: 26rpx;
    font-weight: 600;
    cursor: pointer;
  }

  /* 展开输入区 */
  .detail-op-card {
    background: rgba(255, 255, 255, 0.7);
    border-radius: 36rpx;
    padding: 28rpx 32rpx;
    margin-bottom: 28rpx;
    border: 2rpx solid rgba(194, 242, 200, 0.6);
  }

  .detail-op-title {
    font-size: 26rpx;
    font-weight: 600;
    color: var(--ink2);
    display: block;
    margin-bottom: 20rpx;
  }

  .detail-sources {
    display: flex;
    gap: 16rpx;
    margin-bottom: 20rpx;
  }

  .detail-source {
    flex: 1;
    text-align: center;
    padding: 16rpx 0;
    border-radius: 24rpx;
    border: 2rpx solid rgba(194, 242, 200, 0.6);
    background: transparent;
    font-size: 22rpx;
    font-weight: 600;
    color: var(--ink3);
    cursor: pointer;

    &.active {
      background: rgba(194, 242, 200, 0.18);
      border-color: var(--g5);
      color: var(--g5);
    }
  }

  .detail-pool-tip {
    font-size: 22rpx;
    color: var(--ink4);
    background: rgba(194, 242, 200, 0.2);
    border-radius: 20rpx;
    padding: 12rpx 20rpx;
    margin-bottom: 20rpx;

    &.warn {
      background: rgba(255, 180, 180, 0.18);
      color: #e0556b;
    }
  }

  /* 资产账户选择 */
  .detail-account-picker {
    margin-bottom: 20rpx;
  }

  .detail-account-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20rpx 24rpx;
    border-radius: 24rpx;
    border: 2rpx solid rgba(194, 242, 200, 0.6);
    background: rgba(255, 255, 255, 0.7);
    font-size: 26rpx;
    color: var(--ink2);
    cursor: pointer;
  }

  .detail-account-arrow {
    color: var(--ink4);
    font-size: 24rpx;
  }

  /* 来源禁用态 */
  .detail-source.disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background: rgba(0, 0, 0, 0.04);
    color: var(--ink4);
    border-color: rgba(0, 0, 0, 0.08) !important;
  }

  /* 存入/取出后余额预览 */
  .detail-balance-after {
    display: block;
    margin-top: 12rpx;
    font-size: 22rpx;
    color: var(--g5);
    font-weight: 600;
  }

  /* 快捷金额 */
  .detail-quick {
    display: flex;
    gap: 16rpx;
    margin-bottom: 20rpx;
  }

  .detail-quick-btn {
    flex: 1;
    text-align: center;
    padding: 14rpx 0;
    border-radius: 20rpx;
    border: 2rpx solid rgba(194, 242, 200, 0.6);
    background: rgba(255, 255, 255, 0.6);
    font-size: 24rpx;
    color: var(--g5);
    font-weight: 600;
    cursor: pointer;
  }

  /* 备注框 */
  .detail-note-row {
    margin-bottom: 20rpx;
  }

  .detail-note-input {
    width: 100%;
    height: 80rpx;
    border-radius: 24rpx;
    background: rgba(255, 255, 255, 0.85);
    border: 2rpx solid rgba(194, 242, 200, 0.5);
    padding: 0 28rpx;
    font-size: 26rpx;
    color: var(--ink2);
    box-sizing: border-box;
  }

  .detail-input-row {
    margin-bottom: 20rpx;
    height: 80rpx;
    border-radius: 24rpx;
    background: rgba(255, 255, 255, 0.85);
    border: 2rpx solid rgba(194, 242, 200, 0.5);
    padding: 0 28rpx;
    box-sizing: border-box;
  }

  .detail-input {
    width: 100%;
    height: 100%;
    font-size: 26rpx;
    color: var(--ink2);
  }

  .detail-op-actions {
    display: flex;
    gap: 20rpx;
  }

  .detail-danger {
    text-align: center;
    padding: 24rpx;
    border-radius: 28rpx;
    background: rgba(255, 255, 255, 0.7);
    border: 2rpx solid #f3c2cb;
    color: #e0556b;
    font-size: 28rpx;
    font-weight: 700;
    cursor: pointer;
  }

  .archived-readonly {
    padding: 28rpx;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 32rpx;
    border: 2rpx solid rgba(255, 255, 255, 0.8);

    &-text {
      font-size: 24rpx;
      color: var(--ink3);
      line-height: 1.6;
    }
  }

  /* 分阶段时间线 */
  .phase-timeline {
    margin-top: 28rpx;
    padding: 24rpx 28rpx;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 32rpx;
    border: 2rpx solid rgba(255, 255, 255, 0.8);
  }
  .phase-tl-title {
    font-size: 24rpx;
    font-weight: 700;
    color: var(--ink2);
    margin-bottom: 16rpx;
  }
  .phase-tl-item {
    display: flex;
    gap: 20rpx;
    padding: 14rpx 0;
    position: relative;
  }
  .phase-tl-node {
    flex: 0 0 48rpx;
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24rpx;
    font-weight: 700;
    background: rgba(194, 242, 200, 0.4);
    color: var(--g5);
    position: relative;
    // 两圆中间的连接短线：从本圆底下方留白处起，到下一圆顶上方留白处止
    &::after {
      content: "";
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      top: calc(100% + 8rpx);
      width: 4rpx;
      height: 90rpx;
      background: rgba(120, 120, 120, 0.28);
    }
    &.done {
      background: var(--g5);
      color: #fff;
    }
    &.expired {
      background: rgba(150, 150, 150, 0.25);
      color: var(--ink4);
    }
  }
  // 最后一个阶段圆点不画向下连接线
  .phase-tl-item:last-child .phase-tl-node::after {
    display: none;
  }
  .phase-tl-body {
    flex: 1;
    min-width: 0;
  }
  .phase-tl-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8rpx;
  }
  .phase-tl-name {
    font-size: 24rpx;
    font-weight: 600;
    color: var(--ink);
  }
  .phase-tl-state {
    font-size: 20rpx;
    color: var(--g5);
    &.done {
      color: var(--g5);
    }
    &.expired {
      color: var(--ink4);
    }
    &.active {
      color: var(--g5);
    }
  }
  .phase-tl-bar {
    height: 12rpx;
    border-radius: 6rpx;
    background: rgba(194, 242, 200, 0.28);
    overflow: hidden;
  }
  .phase-tl-fill {
    height: 100%;
    border-radius: 6rpx;
  }
  .phase-tl-num {
    display: flex;
    align-items: baseline;
    gap: 8rpx;
    margin-top: 6rpx;
    font-size: 22rpx;
    font-weight: 600;
    color: var(--ink);
  }
  .phase-tl-target {
    color: var(--ink4);
    font-weight: 400;
  }
  .phase-tl-cum {
    margin-left: auto;
    color: var(--ink3);
    font-weight: 600;
    font-size: 20rpx;
  }
  .phase-tl-date {
    margin-left: auto;
    color: var(--ink4);
    font-weight: 400;
    font-size: 20rpx;
  }
  .phase-tl-range {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    margin-top: 6rpx;
  }
  .phase-tl-range-item {
    font-size: 20rpx;
    color: var(--ink3);
    font-weight: 400;
  }
  .phase-tl-range-open {
    color: var(--ink4);
  }
  .phase-tl-advance {
    margin-top: 16rpx;
    padding: 18rpx;
    text-align: center;
    font-size: 26rpx;
    font-weight: 600;
    border: 2rpx dashed;
    border-radius: 24rpx;
  }

  /* 开启下一阶段弹窗 */
  .advance-panel {
    padding: 28rpx 36rpx 48rpx;
  }
  .advance-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24rpx;
  }
  .advance-title {
    font-size: 32rpx;
    font-weight: 800;
    color: var(--ink);
  }
  .advance-close {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40rpx;
    color: var(--ink3);
  }
  .advance-input-row {
    margin-bottom: 28rpx;
  }
  .advance-input-label {
    font-size: 24rpx;
    color: var(--ink3);
    display: block;
    margin-bottom: 12rpx;
  }
  .advance-input-wrap {
    width: 100%;
    box-sizing: border-box;
    height: 80rpx;
    padding: 0 24rpx;
    border: 2rpx solid rgba(255, 255, 255, 0.8);
    border-radius: 20rpx;
    background: rgba(255, 255, 255, 0.7);
    overflow: hidden;
  }
  .advance-input {
    width: 100%;
    height: 100%;
    font-size: 32rpx;
    line-height: 80rpx;
    color: var(--ink5);
  }
  .advance-input .nf-field {
    width: 100%;
    font-size: 32rpx;
    line-height: 80rpx;
    color: var(--ink5);
  }
  .advance-confirm {
    margin-top: 8rpx;
  }
  .advance-date-row {
    display: flex;
    gap: 20rpx;
    margin-bottom: 28rpx;
  }
  .advance-date-picker {
    flex: 1;
    min-width: 0;
  }
  .advance-date-box {
    display: flex;
    align-items: center;
    gap: 12rpx;
    width: 100%;
    box-sizing: border-box;
    min-height: 72rpx;
    padding: 14rpx 24rpx;
    border: 2rpx solid rgba(255, 255, 255, 0.8);
    border-radius: 20rpx;
    background: rgba(255, 255, 255, 0.7);
    cursor: pointer;
  }
  .advance-date-full {
    width: 100%;
  }
  .advance-date-cap {
    font-size: 22rpx;
    color: var(--ink3);
    flex: 0 0 auto;
  }
  .advance-date-val {
    font-size: 26rpx;
    color: var(--ink);
    font-weight: 600;
  }

  /* 明细面板 */
  .records-panel {
    padding: 32rpx 40rpx 56rpx;
  }

  .record-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx;
    border-bottom: 2rpx solid var(--rec-divider, rgba(194, 242, 200, 0.28));
  }

  .record-left {
    display: flex;
    align-items: center;
    gap: 20rpx;
  }

  .record-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;

    &.in {
      background: rgba(194, 242, 200, 0.33);
      color: var(--g5);
    }

    &.out {
      background: rgba(255, 180, 180, 0.25);
      color: #ff6b6b;
    }
  }

  .record-info {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }

  .record-type {
    font-size: 26rpx;
    font-weight: 600;
    color: var(--ink);
  }

  .record-date {
    font-size: 20rpx;
    color: var(--ink4);
  }

  .record-amount {
    font-size: 30rpx;
    font-weight: 700;

    &.in {
      color: var(--g5);
    }

    &.out {
      color: #ff6b6b;
    }
  }

  .record-empty {
    font-size: 26rpx;
    color: var(--ink4);
    text-align: center;
    padding: 64rpx 0;
  }

  .savings-balance-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 40rpx 8rpx;

    text:first-child {
      font-size: 26rpx;
      color: var(--ink3);
    }
  }

  .savings-balance {
    font-size: 40rpx;
    font-weight: 900;
    color: var(--ink);
  }

  .compliance-note {
    display: block;
    padding: 28rpx 40rpx 56rpx;
    font-size: 22rpx;
    color: var(--ink4);
    line-height: 1.5;
  }
}
</style>
