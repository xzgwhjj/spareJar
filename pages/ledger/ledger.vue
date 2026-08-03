<template>
  <view class="ledger-page" data-cmp="LedgerPage" :style="{ paddingTop: pagePaddingTop }">
    <!-- 离屏画布：仅供封面主色提取使用（不可见） -->
    <canvas type="2d" id="coverColorCanvas" class="cover-color-canvas"></canvas>

    <!-- 极光背景 -->
    <view class="aurora-bg-wrap">
      <view class="aurora-bg-base" />
      <view class="aurora-band-1" />
      <view class="aurora-band-2" />
      <view class="blob-top-l" />
      <view class="blob-top-r" />
      <view class="blob-mid" />
    </view>

    <!-- 内容区 -->
    <scroll-view
      class="page-scroll"
      scroll-y
      enhanced
      :show-scrollbar="false"
      style="
        height: 100%;
        z-index: 2;
        padding-bottom: calc(90rpx + env(safe-area-inset-bottom));
      "
    >
      <!-- TopBar -->
      <view class="topbar">
        <view>
          <text class="topbar-sub">账本中心</text>
          <text class="topbar-title">我的账本</text>
        </view>
        <view class="topbar-actions">
          <view class="action-btn" @click="openMemberMgr"><text>👥</text></view>
          <view class="action-btn" @click="goAssetMgr"><text>💳</text></view>
          <!-- <view class="action-btn" @click="goStickerLib"><text>⭐</text></view> -->
        </view>
      </view>

      <!-- Page tabs -->
      <!-- 待：替换图标 -->
      <view class="page-tab-bar">
        <view
          v-for="t in PAGE_TABS"
          :key="t.key"
          class="page-tab"
          :class="{ active: pageTab === t.key }"
          @click="switchTab(t.key)"
        >
          <text class="tab-label">{{ t.label }}</text>
          <view class="tab-icon-wrap">
            <text class="tab-icon">{{ t.icon }}</text>
          </view>
        </view>
        <view
          class="tab-slider"
          :style="{
            left: 'calc(10rpx + ' + sliderIndex + ' * ((100% - 68rpx) / 4 + 16rpx))',
          }"
        ></view>
      </view>

      <!-- TAB: 账本 -->
      <view v-show="pageTab === 'ledger'" class="ledger-tab">
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

      <!-- TAB: 资产 -->
      <view v-show="pageTab === 'asset'">
        <view class="asset-mode-bar" style="margin: 32rpx">
          <view
            v-for="m in assetModes"
            :key="m.id"
            class="asset-mode-btn"
            :class="{ active: assetMode === m.id }"
            @click="assetMode = m.id"
          >
            {{ m.label }}
          </view>
        </view>
        <view class="glass-mid" style="margin: 0 32rpx; padding: 32rpx">
          <text class="asset-total-label">{{
            assetMode === "disposable"
              ? "可支配资产"
              : assetMode === "withInvest"
              ? "含投资"
              : "总资产净值"
          }}</text>
          <text
            class="asset-total-num"
            :style="{ color: assetDisplay >= 0 ? 'var(--g5)' : 'var(--red-soft)' }"
            >¥{{ fmt(Math.abs(assetDisplay)) }}</text
          >
        </view>
        <view
          v-for="a in ACCOUNTS"
          :key="a._id"
          class="asset-card glass-thin"
          style="margin: 16rpx 32rpx 0; padding: 28rpx 32rpx"
          @click="goAssetDetail(a)"
        >
          <view class="asset-row">
            <view class="asset-icon-box" :style="{ background: a.colorBg }">
              <text>{{ a.icon }}</text>
            </view>
            <view class="asset-info">
              <text class="asset-name">{{ a.name }}</text>
              <text class="asset-type">{{ a.type }}</text>
            </view>
            <text
              class="asset-balance"
              :style="{ color: a.balance >= 0 ? 'var(--ink)' : 'var(--red-soft)' }"
              >¥{{ fmt(a.balance) }}</text
            >
          </view>
        </view>
      </view>

      <!-- TAB: 报表 -->
      <view v-show="pageTab === 'chart'">
        <view class="glass-mid" style="margin: 32rpx; padding: 36rpx">
          <text class="chart-title">📊 月度收支趋势</text>
          <view class="chart-area">
            <view
              v-for="(s, i) in MONTHLY"
              :key="i"
              class="chart-col"
              :style="{
                flexDirection: 'column-reverse',
                alignItems: 'center',
                height: '360rpx',
                justifyContent: 'flex-end',
              }"
            >
              <view class="bar-group">
                <view
                  class="bar income-bar"
                  :style="{ height: (s.income / maxBar) * 240 + 'rpx' }"
                />
                <view
                  class="bar expense-bar"
                  :style="{ height: (s.expense / maxBar) * 240 + 'rpx' }"
                />
              </view>
              <text class="bar-label">{{ s.month }}</text>
            </view>
          </view>
          <view
            style="display: flex; gap: 32rpx; justify-content: center; margin-top: 24rpx"
          >
            <view style="display: flex; align-items: center; gap: 8rpx">
              <view
                style="
                  width: 16rpx;
                  height: 16rpx;
                  border-radius: 4rpx;
                  background: var(--g5);
                "
              /><text style="font-size: 22rpx; color: var(--ink3)">收入</text>
            </view>
            <view style="display: flex; align-items: center; gap: 8rpx">
              <view
                style="
                  width: 16rpx;
                  height: 16rpx;
                  border-radius: 4rpx;
                  background: var(--amber);
                "
              /><text style="font-size: 22rpx; color: var(--ink3)">支出</text>
            </view>
          </view>
        </view>
      </view>

      <!-- TAB: 贴纸 -->
      <view v-show="pageTab === 'sticker'">
        <view class="sticker-grid" style="padding: 32rpx">
          <view
            v-for="s in STICKERS"
            :key="s.id"
            class="sticker-chip glass-thin"
            style="padding: 24rpx 20rpx; text-align: center"
          >
            <text style="font-size: 56rpx; display: block">{{ s.emoji }}</text>
            <text
              style="
                font-size: 20rpx;
                color: var(--ink2);
                font-weight: 600;
                display: block;
                margin-top: 8rpx;
              "
              >{{ s.name }}</text
            >
            <text style="font-size: 18rpx; color: var(--ink4)">已用 {{ s.used }} 次</text>
          </view>
        </view>
      </view>

      <!-- 底部留白：避免列表最后一项被固定 TabBar 遮挡 -->
      <view class="list-bottom-gap" />
    </scroll-view>

    <!-- 多选批量操作栏 -->
    <view v-if="multiSelect" class="batch-bar">
      <view class="batch-info">
        <text class="batch-count">已选 {{ selectedIds.length }} 个</text>
        <text v-if="selectedIds.length === 0" class="batch-hint">勾选要删除的账本</text>
      </view>
      <view class="batch-actions">
        <view class="batch-btn batch-cancel" @click="exitMultiSelect"
          ><text>取消</text></view
        >
        <view
          class="batch-btn batch-del"
          :class="{ disabled: selectedIds.length === 0 }"
          @click="selectedIds.length > 0 && openBatchDelete()"
        >
          <text
            >删除{{ selectedIds.length > 0 ? "(" + selectedIds.length + ")" : "" }}</text
          >
        </view>
      </view>
    </view>

    <!-- 删除确认弹窗（单选 / 多选通用）：列出即将删除的账本名称 -->
    <view v-if="showDelConfirm" class="sheet-overlay" @click="showDelConfirm = false">
      <view class="sheet-panel del-panel" @click.stop>
        <view class="sheet-handle">
          <view class="handle-bar" />
        </view>
        <text class="sheet-title">确认删除账本</text>
        <view class="del-list">
          <view v-for="d in delTargets" :key="d._id" class="del-item">
            <text class="del-emoji">{{ d.emoji }}</text>
            <text class="del-name">{{ d.name }}</text>
          </view>
        </view>
        <text class="del-tip">删除后账本及其记录将按所选方式处理，操作不可恢复</text>
        <view class="del-actions">
          <view class="del-btn del-transfer" @click="confirmDelete('transfer')">
            <text>数据转移至总账本</text>
          </view>
          <view class="del-btn del-purge" @click="confirmDelete('purge')">
            <text>彻底删除（含记录）</text>
          </view>
        </view>
        <view class="del-cancel" @click="showDelConfirm = false"><text>取消</text></view>
      </view>
    </view>

    <!-- 新增账本弹窗：四模块表单（封面 / 名称 / 简介 / 系统默认图） -->
    <view v-if="showNewLedger" class="sheet-overlay" @click="closeNewLedger(false)">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle">
          <view class="handle-bar" />
        </view>
        <text class="sheet-title">新建账本</text>

        <!-- 2. 名称 -->
        <view class="form-label">名称</view>
        <input
          class="sheet-input"
          :class="{ focused: nameFocused }"
          v-model="newLedgerName"
          placeholder="输入账本名称"
          maxlength="32"
          @focus="nameFocused = true"
          @blur="nameFocused = false"
        />

        <!-- 封面 + 系统默认图：左右横向布局（左 3:4 封面 / 右 图标网格） -->
        <view class="cover-icon-row">
          <!-- 左：封面（3:4） -->
          <view class="cover-col">
            <view class="form-label">封面</view>
            <view
              class="cover-upload"
              :class="{ pressed: coverPressed }"
              @click="chooseCover('new')"
              @touchstart="coverPressed = true"
              @touchend="coverPressed = false"
              @touchcancel="coverPressed = false"
            >
              <image
                v-if="newLedgerCover"
                class="cover-img"
                :src="newLedgerCover"
                mode="aspectFill"
              />
              <view v-else class="cover-placeholder">
                <text class="cover-tip">点击从相册选择</text>
              </view>
              <view
                v-if="newLedgerCover"
                class="cover-remove"
                @click.stop="removeCover('new')"
                >×</view
              >
            </view>
          </view>
          <!-- 右：系统默认图网格 -->
          <view class="icon-col">
            <view class="form-label">选择图标</view>
            <view class="icon-grid">
              <view
                v-for="ic in LEDGER_ICONS"
                :key="ic.id"
                class="icon-cell"
                :class="{ active: newLedgerIcon === ic.id }"
                @click="pickSystemIcon(ic, 'new')"
              >
                <image class="icon-img" :src="resolveCover(ic.img43)" mode="aspectFill" />
              </view>
            </view>
          </view>
        </view>

        <!-- 主题色 -->
        <view class="form-label">主题色</view>
        <view class="color-opts">
          <!-- 自定义颜色选择器 -->
          <view class="color-opt" :class="{ active: true }" @click="openCustomColor">
            <view class="color-opt-ico" :style="{ background: newLedgerColor }"> </view>
            <text class="color-opt-label">自定义</text>
          </view>
        </view>
        <!-- 自动取色色板（点选可微调） -->
        <view v-if="autoPaletteNew.length" class="auto-palette">
          <view
            v-for="(c, i) in autoPaletteNew"
            :key="'n' + i"
            class="auto-swatch"
            :class="{ active: c === newLedgerColor }"
            :style="{ background: c }"
            @click="pickAutoSwatch('new', c)"
          ></view>
        </view>

        <!-- 3. 简介（多行文本） -->
        <view class="form-label">简介</view>
        <textarea
          class="sheet-textarea"
          :class="{ focused: descFocused }"
          v-model="newLedgerDesc"
          placeholder="添加一段描述，方便日后回忆"
          maxlength="200"
          @focus="descFocused = true"
          @blur="descFocused = false"
        />

        <view
          class="sheet-btn"
          :class="{ 'is-full': fillComplete }"
          :style="{ '--fill': fillRatio }"
          @click="onSubmit"
        >
          <text class="sheet-btn__base">创建账本</text>
          <view class="sheet-btn__fill">
            <view class="sheet-btn__fill-txt">创建账本</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 自定义颜色选择器弹窗（HSV 拖动取色，跨端通用） -->
    <view v-if="showColorPicker" class="cp-overlay" @click="showColorPicker = false">
      <view class="cp-panel" @click.stop>
        <text class="cp-title">自定义颜色</text>
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
        <!-- 预览 + hex -->
        <view class="cp-preview">
          <view class="cp-preview-dot" :style="{ background: cpHex }"></view>
          <text class="cp-hex">{{ cpHex }}</text>
        </view>
        <view class="cp-actions">
          <view class="cp-cancel" @click="showColorPicker = false">取消</view>
          <view class="cp-confirm" @click="confirmCustomColor">确定</view>
        </view>
      </view>
    </view>

    <!-- 比例选择：选图后先提供 3:4 与 4:3 两种形态预览 -->
    <view v-if="showRatioPicker" class="ratio-overlay" @click.stop>
      <view class="ratio-panel" @click.stop>
        <view class="crop-head">选择裁剪比例</view>
        <view class="ratio-row">
          <view
            class="ratio-card"
            :class="{ done: cropDone('34') }"
            @click="enterCrop(0.75)"
          >
            <view class="ratio-thumb ratio-34">
              <image class="ratio-thumb-img" :src="crop34 && crop34.temp ? crop34.temp : pendingCropSrc" mode="aspectFill" />
              <view v-if="cropDone('34')" class="ratio-done">✓</view>
            </view>
            <text class="ratio-label">3 : 4</text>
          </view>
          <view
            class="ratio-card"
            :class="{ done: cropDone('43') }"
            @click="enterCrop(4 / 3)"
          >
            <view class="ratio-thumb ratio-43">
              <image class="ratio-thumb-img" :src="crop43 && crop43.temp ? crop43.temp : pendingCropSrc" mode="aspectFill" />
              <view v-if="cropDone('43')" class="ratio-done">✓</view>
            </view>
            <text class="ratio-label">4 : 3</text>
          </view>
        </view>
        <view class="ratio-tip" v-if="!(cropDone('34') || cropDone('43'))"
          >点击比例可裁剪对应形态</view
        >
        <view class="crop-actions">
          <view class="crop-btn crop-cancel" @click="cancelRatio"><text>取消</text></view>
          <view
            class="crop-btn crop-ok"
            :class="{ disabled: !(cropDone('34') || cropDone('43')) }"
            @click="finishCrop"
            ><text>完成</text></view
          >
        </view>
      </view>
    </view>

    <!-- 图片裁剪弹窗：支持 3:4 / 4:3，双指缩放图片、拖动/四角调整裁剪框 -->
    <view v-if="showCropper" class="crop-overlay" @click.stop>
      <view class="crop-panel" @click.stop>
        <view class="crop-head">裁剪为 {{ cropRatioLabel }}</view>

        <!-- 舞台：图片居中显示；单指拖动裁剪框移动，四角缩放尺寸，双指缩放图片 -->
        <view
          id="cropStage"
          class="crop-stage"
          :style="stageStyle"
          @touchstart="onCropTouchStart"
          @touchmove="onCropTouchMove"
          @touchend="onCropTouchEnd"
        >
          <image class="crop-img" :src="cropSrc" :style="imgStyle" />
          <view class="crop-box" :style="boxStyle">
            <view class="crop-grid" />
            <view class="crop-handle tl"></view>
            <view class="crop-handle tr"></view>
            <view class="crop-handle bl"></view>
            <view class="crop-handle br"></view>
          </view>
        </view>

        <!-- 预览 -->
        <view class="crop-row">
          <text class="crop-row-label">预览</text>
          <view class="crop-prev" :style="previewBoxStyle">
            <image class="crop-prev-img" :src="cropSrc" :style="previewStyle" />
          </view>
        </view>

        <view class="crop-actions">
          <view class="crop-btn crop-cancel" @click="cancelCrop"><text>取消</text></view>
          <view class="crop-btn crop-ok" @click="confirmCrop"><text>确认裁剪</text></view>
        </view>
      </view>
      <canvas type="2d" id="cropExport" class="crop-export-canvas" />
    </view>

    <!-- 编辑账本弹窗 -->
    <view v-if="showEdit" class="sheet-overlay" @click="closeEditLedger(false)">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle">
          <view class="handle-bar" />
        </view>
        <text class="sheet-title">编辑账本</text>

        <!-- 名称 -->
        <view class="form-label">名称</view>
        <input
          class="sheet-input"
          :class="{ focused: nameFocused }"
          v-model="editName"
          placeholder="账本名称"
          maxlength="32"
          @focus="nameFocused = true"
          @blur="nameFocused = false"
        />

        <!-- 封面 + 系统默认图：左右横向布局（复用新建弹窗样式） -->
        <view class="cover-icon-row">
          <view class="cover-col">
            <view class="form-label">封面（可选）</view>
            <view
              class="cover-upload"
              :class="{ pressed: coverPressed }"
              @click="chooseCover('edit')"
              @touchstart="coverPressed = true"
              @touchend="coverPressed = false"
              @touchcancel="coverPressed = false"
            >
              <image
                v-if="editLedgerCover"
                class="cover-img"
                :src="editLedgerCover"
                mode="aspectFill"
              />
              <view v-else class="cover-placeholder">
                <text class="cover-tip">点击从相册选择</text>
              </view>
              <view
                v-if="editLedgerCover"
                class="cover-remove"
                @click.stop="removeCover('edit')"
                >×</view
              >
            </view>
          </view>
          <view class="icon-col">
            <view class="form-label">选择图标</view>
            <view class="icon-grid">
              <view
                v-for="ic in LEDGER_ICONS"
                :key="ic.id"
                class="icon-cell"
                :class="{ active: editIcon === ic.id }"
                @click="pickSystemIcon(ic, 'edit')"
              >
                <image class="icon-img" :src="resolveCover(ic.img43)" mode="aspectFill" />
              </view>
            </view>
          </view>
        </view>

        <!-- 主题色 -->
        <view class="form-label">主题色</view>
        <view class="color-opts">
          <view class="color-opt" :class="{ active: true }" @click="openEditCustomColor">
            <view class="color-opt-ico" :style="{ background: editColor }"> </view>
            <text class="color-opt-label">自定义</text>
          </view>
        </view>
        <!-- 自动取色色板（点选可微调） -->
        <view v-if="autoPaletteEdit.length" class="auto-palette">
          <view
            v-for="(c, i) in autoPaletteEdit"
            :key="'e' + i"
            class="auto-swatch"
            :class="{ active: c === editColor }"
            :style="{ background: c }"
            @click="pickAutoSwatch('edit', c)"
          ></view>
        </view>

        <!-- 简介 -->
        <view class="form-label">简介</view>
        <textarea
          class="sheet-textarea"
          :class="{ focused: editDescFocused }"
          v-model="editLedgerDesc"
          placeholder="添加一段描述，方便日后回忆"
          maxlength="200"
          @focus="editDescFocused = true"
          @blur="editDescFocused = false"
        />

        <view
          class="sheet-btn sheet-btn--emboss"
          :style="{ '--fill': editFillRatio }"
          @click="saveEdit"
        >
          <!-- 浮雕基底：未填充时纹理清晰突出于表面；液体升起后被淹没 -->
          <view class="emboss-base"></view>
          <!-- 液体填充：从底部升起淹没浮雕，液面带高光 -->
          <view class="emboss-liquid"></view>
          <!-- 文字：深绿（未淹没区可见）+ 白字（淹没区可见），随 --fill 互补裁切 -->
          <text class="emboss-text emboss-text--base">保存</text>
          <text class="emboss-text emboss-text--top">保存</text>
        </view>
      </view>
    </view>

    <!-- TabBar -->
    <TabBar :current="1" />

    <MemberManager
      :visible="showMemberMgr"
      :ledger-id="memberMgrLedgerId"
      :ledger-name="memberMgrLedgerName"
      @close="showMemberMgr = false"
  />
  </view>
</template>

<script setup>
import {
  createLedger as apiCreateLedger,
  updateLedger as apiUpdateLedger,
  deleteLedger,
  ensureMasterLedger,
  listLedgers,
  listTransactions,
  getLedgerDetail,
} from "@/api/sparejar.js";
import TabBar from "@/components/tabbar/tabbar.vue";
import MemberManager from "@/components/MemberManager.vue";
import { checkLoggedIn, useUserStore } from "@/stores/user.js";
import { cdn, resolveCover, getCloudTempUrl, getCloudTempUrls } from "@/utils/cdn.js";
import { deleteLedgerCover, uploadLedgerCover } from "@/utils/cloudFile.js";
import {
  hexToHsv,
  hsvToHex,
  extractCoverColor,
  extractCoverPalette,
} from "@/utils/coverColor.js";
import { formatDateKey, formatMonthKey } from "@/utils/date.js";
import { onShow } from "@dcloudio/uni-app";
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";

const PAGE_TABS = [
  { key: "ledger", label: "账本", icon: "📖" },
  { key: "asset", label: "资产", icon: "💰" },
  { key: "chart", label: "报表", icon: "📊" },
  { key: "sticker", label: "贴纸", icon: "🌟" },
];

const assetModes = [
  { id: "disposable", label: "可支配" },
  { id: "withInvest", label: "含投资" },
  { id: "total", label: "总净值" },
];

const userStore = useUserStore();
const { state } = userStore;

const pageTab = ref("ledger");
const sliderIndex = ref(0);
watch(pageTab, (k) => {
  sliderIndex.value = Math.max(
    0,
    PAGE_TABS.findIndex((t) => t.key === k)
  );
});
const assetMode = ref("disposable");

// 新建账本
const showNewLedger = ref(false);
// 打开新建弹窗：复位填充动画状态，避免上次成功后按钮卡在满格
function openNewLedger() {
  resetNewLedger();
  showNewLedger.value = true;
}

// 复位新建表单（含封面相对路径与待清理标记）
function resetNewLedger() {
  fillComplete.value = false;
  newLedgerName.value = "";
  newLedgerIcon.value = "";
  newLedgerCover.value = "";
  newLedgerCoverRel.value = "";
  newLedgerCover34.value = "";
  newLedgerCoverRel34.value = "";
  newLedgerDesc.value = "";
  newLedgerColor.value = "#25cc5d";
  autoPaletteNew.value = [];
  crop34.value = null;
  crop43.value = null;
  activeUploads = [];
  pendingCover.value = null;
  coverUploading = null;
}

// 关闭新建弹窗：committed=true 表示创建成功（封面已落库，保留文件）；
// 其余（蒙版取消/未创建）作废进行中的上传并清理临时文件，防止孤儿残留
async function closeNewLedger(committed = false) {
  if (!committed) currentUploadToken.value.new++; // 取消 → 作废进行中的上传
  if (coverUploading) {
    try {
      await coverUploading;
    } catch (e) {
      /* 失败已提示 */
    }
  }
  if (!committed) await clearPending("new");
  resetNewLedger();
  showNewLedger.value = false;
}

const newLedgerName = ref("");
// 名称输入框聚焦态（小程序 input 不支持 :focus 伪类，用事件切换 class）
const nameFocused = ref(false);
// 简介输入框聚焦态
const descFocused = ref(false);
// 封面上传区按下态（小程序 view 的 :active 不生效，用 touch 事件切换 class）
const coverPressed = ref(false);

// 创建按钮：随填写进度的填充动画（三个字段：名称/封面/简介）
const fillComplete = ref(false);
const createProgress = computed(() => {
  let n = 0;
  if (newLedgerName.value.trim()) n++; // 名称（必填）
  if (newLedgerCover.value) n++; // 封面
  if (newLedgerDesc.value.trim()) n++; // 简介
  return n / 3;
});
// 当前填充比例：点击提交时强制 3/3，否则跟随实际进度
const fillRatio = computed(() => (fillComplete.value ? 1 : createProgress.value));

// 点击创建：先校验必填，未通过则直接提示并停留在当前进度（不播放填满动画），
// 避免「按钮先填满又退回 + 失败提示」的割裂体验
async function onSubmit() {
  if (fillComplete.value) return; // 防止连点重复触发
  if (!newLedgerName.value.trim()) {
    uni.showToast({ title: "请输入账本名称", icon: "none" });
    return;
  }
  fillComplete.value = true;
  await new Promise((r) => setTimeout(r, 500)); // 让填充动画可见
  await createLedger();
  fillComplete.value = false; // 复位（失败/关闭后）
}
const newLedgerIcon = ref("");
const newLedgerCover = ref(""); // 预览地址（显示/取色用）
const newLedgerCoverRel = ref(""); // 落库值：系统图为 /app_static/...，用户上传为 cloud:// fileID
const newLedgerCover34 = ref(""); // 3:4 副比例预览地址
const newLedgerCoverRel34 = ref(""); // 3:4 副比例落库值（cloud:// fileID）
let coverUploading = null; // 自定义封面上传中的 promise
let activeUploads = []; // 进行中的封面上传 promise 集合（双比例可能并行）
const pendingCover = ref(null); // 已上传未提交的临时文件 { target, rel, fileID }
// 上传令牌：每次 applyCover 自增并记入闭包。上传完成回调比对当前令牌，
// 若已被替换/移除/取消（令牌失效），立即删除孤儿文件，不再写入 pendingCover。
const currentUploadToken = ref({ new: 0, edit: 0 });
const newLedgerDesc = ref("");
// 系统默认图：每个图标同时包含 4:3 与 3:4 两种比例的资源（后续替换为对应图片文件）。
// 网格展示统一使用 4:3（img43）；落库封面也存 4:3 资源路径。
const LEDGER_ICONS = [
  {
    id: "cover",
    img43: "/app_static/images/icon_cover.png",
    img34: "/app_static/images/icon_cover.png",
  },
  {
    id: "sunny",
    img43: "/app_static/images/icon_sunny.png",
    img34: "/app_static/images/icon_sunny.png",
  },
  {
    id: "surplus",
    img43: "/app_static/images/icon_surplus.png",
    img34: "/app_static/images/icon_surplus.png",
  },
];
// 默认封面相对路径（封面为空时兜底展示）
const DEFAULT_COVER_REL = "/app_static/images/icon_cover.png";
const defaultCoverUrl = cdn(DEFAULT_COVER_REL);

// 封面加载失败（404 / 网络错误等）：用响应式错误表（按账本 _id 记录）回退到默认图。
// 注意：ledgerViews 是 computed，每次返回全新普通对象；若把 coverError 直接挂在 item 上，
// 该赋值非响应式、且不随 item 持久，导致 fallback 永不生效。故用独立响应式 map 记录失败项。
const coverErrors = reactive({});
// 云存储封面（用户上传，存 cloud:// fileID）解析后的临时访问 URL，按账本 _id 记录。
// 云存储与网页托管不互通，fileID 不能直接拼 CDN 域名，必须经 getTempFileURL 换临时链。
const coverUrlMap = reactive({});
// 封面显示：优先展示 3:4 版本（cover34），无则回退主封面 cover（4:3）。
// cloud:// → 用预解析的临时链（按 fileID 存）；/app_static → 拼 CDN；/ledger_img（旧数据）→ 留空走默认图
function coverDisplay(l) {
  const c = String(l.cover34 || l.cover || "");
  if (!c) return "";
  if (c.startsWith("cloud://")) return coverUrlMap[c] || "";
  if (c.startsWith("/ledger_img/")) return "";
  return resolveCover(c);
}
function onCoverError(item) {
  if (item && item._id) {
    coverErrors[item._id] = true;
  }
}

// 判断是否为图片路径（与 emoji 图标区分），兼容旧 emoji 数据
function isImg(v) {
  return (
    typeof v === "string" &&
    (v.startsWith("/") || v.startsWith("http") || v.startsWith("data:"))
  );
}

// cropTarget：裁剪结果写入目标，'new'=新建账本封面 / 'edit'=编辑账本封面
const cropTarget = ref("new");
// 两种比例的裁剪结果：{ temp: 预览地址, fileID: 云存储ID, rel: 落库值 }；null 表示未裁剪
const crop34 = ref(null);
const crop43 = ref(null);

// 封面默认占位图（3:4），封面为空时优先展示
const COVER_PLACEHOLDER = DEFAULT_COVER_REL;

// 封面：从本地相册选取；选图后先提供 3:4 / 4:3 两种形态预览，用户选择比例后再进入对应裁剪。
// target: 'new' | 'edit'
function chooseCover(target = "new") {
  uni.chooseImage({
    count: 1,
    sourceType: ["album", "camera"],
    success: (res) => {
      const path = res.tempFilePaths[0];
      uni.getImageInfo({
        src: path,
        success: (info) => {
          // 重新选图：清空上一轮两个比例的裁剪结果
          crop34.value = null;
          crop43.value = null;
          activeUploads = [];
          pendingCropTarget.value = target;
          pendingCropSrc.value = path;
          pendingCropInfo.value = info;
          showRatioPicker.value = true;
        },
        fail: () => {
          applyCover(target, path);
        },
      });
    },
  });
}
// 清理某个 target 下"已上传但未提交"的临时封面（取消/替换/关闭时调用）
async function clearPending(target) {
  const p = pendingCover.value;
  if (!p) return;
  if (target && p.target !== target) return;
  pendingCover.value = null;
  await deleteLedgerCover(p.fileID);
}
function removeCover(target = "new") {
  // 作废进行中的上传（令牌失效），上传完成回调会删除孤儿文件
  currentUploadToken.value[target]++;
  activeUploads = [];
  if (target === "edit") {
    editLedgerCover.value = "";
    editLedgerCoverRel.value = "";
    autoPaletteEdit.value = [];
  } else {
    newLedgerCover.value = "";
    newLedgerCoverRel.value = "";
    autoPaletteNew.value = [];
  }
  clearPending(target);
}
// 用户自定义上传：本地临时图先用于预览/取色，同时异步上传到云端 ledger_img 目录
function applyCover(target, path) {
  if (!path) {
    removeCover(target);
    return;
  }
  if (target === "edit") editLedgerCover.value = path;
  else newLedgerCover.value = path;
  // 选封面后自动提取色板（展示在主题色区底部）
  autoExtract(target);
  // 本次上传令牌：后续若被替换/移除/取消，令牌会自增失效，上传完成即删孤儿文件
  const myToken = ++currentUploadToken.value[target];
  // 替换场景：先清理上一张待提交的上传
  clearPending(target).then(() => {
    const run = uploadLedgerCover(path)
      .then(({ rel, fileID }) => {
        // 令牌失效（已被替换/移除/取消）→ 本次上传不再需要，立即删除孤儿文件
        if (currentUploadToken.value[target] !== myToken) {
          return deleteLedgerCover(fileID);
        }
        // 落库用云存储 fileID（cloud://...），回显时经 getTempFileURL 解析，不再拼 CDN 域名
        if (target === "edit") editLedgerCoverRel.value = fileID;
        else newLedgerCoverRel.value = fileID;
        pendingCover.value = { target, rel, fileID };
      })
      .catch((e) => {
        console.error("[ledger] 封面上传失败:", e);
        uni.showToast({ title: "封面上传失败", icon: "none" });
      });
    coverUploading = run;
  });
}
// 选择系统默认图：存图标 id 与 4:3 资源路径（网格/落库统一用 4:3）。
// target: 'new' | 'edit'
function pickSystemIcon(ic, target) {
  // 选系统图 → 放弃自定义上传：作废进行中的上传，清理临时文件
  currentUploadToken.value[target]++;
  if (target === "edit") {
    editIcon.value = ic.id;
    editLedgerCover.value = resolveCover(ic.img43);
    editLedgerCoverRel.value = ic.img43;
  } else {
    newLedgerIcon.value = ic.id;
    newLedgerCover.value = resolveCover(ic.img43);
    newLedgerCoverRel.value = ic.img43;
  }
  clearPending(target); // 选了系统图 → 清理之前可能上传的自定义临时图
  autoExtract(target); // 选封面后自动提取色板（展示在主题色区底部）
}

// 主题色：自定义取色 + 选封面后自动生成的色板建议（见 autoExtract）
const newLedgerColor = ref("#25cc5d"); // 自定义选中的 hex

// 自定义颜色选择器弹窗状态（HSV 拖动）
const showColorPicker = ref(false);
const pickerHue = ref(200);
const pickerSat = ref(80);
const pickerVal = ref(90);
// 当前取色结果（由 HSV 实时换算）
const cpHex = computed(() => hsvToHex(pickerHue.value, pickerSat.value, pickerVal.value));

// 打开自定义：用当前已选色初始化 HSV，避免每次从头开始
// 自定义颜色选择器：区分「新建 / 编辑」两个上下文，确认时写回对应状态
const colorContext = ref("new");
function openCustomColor() {
  colorContext.value = "new";
  const hsv = hexToHsv(newLedgerColor.value);
  pickerHue.value = hsv.h;
  pickerSat.value = hsv.s;
  pickerVal.value = hsv.v;
  showColorPicker.value = true;
}
function openEditCustomColor() {
  colorContext.value = "edit";
  const hsv = hexToHsv(editColor.value);
  pickerHue.value = hsv.h;
  pickerSat.value = hsv.s;
  pickerVal.value = hsv.v;
  showColorPicker.value = true;
}
function confirmCustomColor() {
  if (colorContext.value === "edit") editColor.value = cpHex.value;
  else newLedgerColor.value = cpHex.value;
  showColorPicker.value = false;
}

// 封面自动取色：选封面后静默提取主色 + 调色盘（见 utils/coverColor.js）。
// 主色仅在新建态直接落色；编辑态保留已存/已选主题色，仅把色板展示在主题色区底部供点选微调。
const autoPaletteNew = ref([]);
const autoPaletteEdit = ref([]);
async function autoExtract(context) {
  const cover = context === "edit" ? editLedgerCover.value : newLedgerCover.value;
  if (!cover) return;
  const palRef = context === "edit" ? autoPaletteEdit : autoPaletteNew;
  try {
    const [main, pal] = await Promise.all([
      extractCoverColor(cover),
      extractCoverPalette(cover, 20),
    ]);
    if (context === "new" && main) newLedgerColor.value = main;
    palRef.value = pal && pal.length ? pal : main ? [main] : [];
  } catch (e) {
    console.error("[ledger] 封面自动取色失败:", e);
    palRef.value = [];
  }
}
// 点击自动取色得到的色板色卡：写回主题色（用于精细挑选）
function pickAutoSwatch(context, hex) {
  if (context === "edit") editColor.value = hex;
  else newLedgerColor.value = hex;
}

// 选择器视觉样式（背景随时钟更新）
const svStyle = computed(() => ({
  background: `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgba(255,255,255,0)), hsl(${pickerHue.value}, 100%, 50%)`,
}));
const svCursorStyle = computed(() => ({
  left: pickerSat.value + "%",
  top: 100 - pickerVal.value + "%",
  background: cpHex.value,
}));
const hueStyle = computed(() => ({
  background:
    "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
}));
const hueCursorStyle = computed(() => ({
  left: (pickerHue.value / 360) * 100 + "%",
}));

// 拖动取坐标（小程序触摸事件在 touchstart 的元素上持续派发 touchmove）
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

// ===== 图片裁剪（支持 3:4 与 4:3）=====
const showRatioPicker = ref(false); // 选图后先选择裁剪比例
const pendingCropSrc = ref(""); // 待裁剪原图路径
const pendingCropInfo = ref(null); // 原图尺寸信息
const pendingCropTarget = ref("new"); // 裁剪结果写入目标
const cropRatio = ref(0.75); // 目标宽高比 宽/高（0.75=3:4，4/3=4:3）
const OUT_W = 600; // 导出宽度固定，高度按 cropRatio 计算

const showCropper = ref(false);
const cropSrc = ref("");
const stageW = ref(300);
const stageH = ref(300);
const imgW = ref(0);
const imgH = ref(0);
const baseScale = ref(1); // 自然尺寸 → 初始 fit 显示比例
const imgScale = ref(1); // 用户双指缩放因子
const dispScale = computed(() => baseScale.value * imgScale.value); // 综合显示比例
const imgX = ref(0); // 显示图中左上角在舞台中的坐标
const imgY = ref(0);
const boxW = ref(0); // 裁剪框（显示坐标）
const boxH = ref(0);
const boxX = ref(0);
const boxY = ref(0);
const stageRectVal = ref({ left: 0, top: 0 }); // 舞台在视口中的位置（v-if 打开后异步查询）

const stageStyle = computed(() => ({
  width: stageW.value + "px",
  height: stageH.value + "px",
}));
const imgStyle = computed(() => ({
  width: imgW.value * dispScale.value + "px",
  height: imgH.value * dispScale.value + "px",
  left: imgX.value + "px",
  top: imgY.value + "px",
}));
const boxStyle = computed(() => ({
  width: boxW.value + "px",
  height: boxH.value + "px",
  left: boxX.value + "px",
  top: boxY.value + "px",
}));
// 预览：用 CSS 把当前裁剪区域映射到固定 96x128 的 3:4 预览框
const previewStyle = computed(() => {
  const PW = 96;
  const k = PW / boxW.value;
  return {
    width: imgW.value * dispScale.value * k + "px",
    height: imgH.value * dispScale.value * k + "px",
    left: -((boxX.value - imgX.value) * k) + "px",
    top: -((boxY.value - imgY.value) * k) + "px",
  };
});
// 预览容器：按当前裁剪比例设定宽高，保证预览不变形
const previewBoxStyle = computed(() => {
  const PW = 96;
  return { width: PW + "px", height: PW / cropRatio.value + "px" };
});
const cropRatioLabel = computed(() =>
  Math.abs(cropRatio.value - 0.75) < 0.001 ? "3 : 4" : "4 : 3"
);
// 模板辅助：该比例是否已裁剪完成
function cropDone(key) {
  return key === "34" ? !!crop34.value : !!crop43.value;
}

function initCropper(path, info, ratio) {
  cropRatio.value = ratio;
  cropTarget.value = pendingCropTarget.value;
  const sys = uni.getSystemInfoSync();
  // 舞台宽度严格受面板内容区约束（面板 width:100% / max-width:680rpx，左右 padding 32rpx），避免超出弹窗右侧
  const rpxPx = sys.windowWidth / 750;
  const panelMax = Math.min(sys.windowWidth, 680 * rpxPx);
  const w = Math.min(panelMax - 64 * rpxPx, 320);
  stageW.value = w;
  stageH.value = w;
  imgW.value = info.width;
  imgH.value = info.height;
  baseScale.value = Math.min(stageW.value / imgW.value, stageH.value / imgH.value);
  imgScale.value = 1;
  const dw = imgW.value * baseScale.value,
    dh = imgH.value * baseScale.value;
  imgX.value = (stageW.value - dw) / 2;
  imgY.value = (stageH.value - dh) / 2;
  const bw = Math.min(dw, dh * cropRatio.value); // 裁剪框最大可容纳尺寸（保持目标比例）
  boxW.value = bw;
  boxH.value = bw / cropRatio.value;
  boxX.value = imgX.value + (dw - bw) / 2;
  boxY.value = imgY.value + (dh - boxH.value) / 2;
  cropSrc.value = path;
  showCropper.value = true;
  // 打开后查询舞台在视口中的位置，供触摸坐标换算为舞台局部坐标（小程序无 getBoundingClientRect）
  nextTick(() => {
    uni
      .createSelectorQuery()
      .select("#cropStage")
      .boundingClientRect((r) => {
        if (r) stageRectVal.value = { left: r.left, top: r.top };
      })
      .exec();
  });
}

// 将裁剪框约束在图片显示范围内
function clampBox(nx, ny) {
  const minX = imgX.value;
  const minY = imgY.value;
  const maxX = imgX.value + imgW.value * dispScale.value - boxW.value;
  const maxY = imgY.value + imgH.value * dispScale.value - boxH.value;
  boxX.value = Math.max(minX, Math.min(maxX, nx));
  boxY.value = Math.max(minY, Math.min(maxY, ny));
}

// ===== 裁剪手势：单指拖动裁剪框移动 / 四角拖动改尺寸（保持比例）/ 双指缩放图片 =====
let cropMode = null; // 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | 'pinch'
let moveOffset = { x: 0, y: 0 };
let pinchDist0 = 0;
let pinchScale0 = 1;
const HANDLE_HIT = 26; // 四角命中半径(px)
const MIN_BOX = 40; // 裁剪框最小边长(px)

function stageRect() {
  // 返回已缓存的舞台视口位置（initCropper 打开后用 selector 查询写入）
  return stageRectVal.value;
}
function localPoint(e) {
  const rect = stageRectVal.value;
  const t = e.touches[0];
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}
function hitCorner(x, y) {
  const corners = {
    tl: [boxX.value, boxY.value],
    tr: [boxX.value + boxW.value, boxY.value],
    bl: [boxX.value, boxY.value + boxH.value],
    br: [boxX.value + boxW.value, boxY.value + boxH.value],
  };
  for (const k in corners) {
    if (Math.hypot(x - corners[k][0], y - corners[k][1]) <= HANDLE_HIT) return k;
  }
  return null;
}
function insideBox(x, y) {
  return (
    x >= boxX.value &&
    x <= boxX.value + boxW.value &&
    y >= boxY.value &&
    y <= boxY.value + boxH.value
  );
}
// 双指缩放：以图片中心为锚点缩放显示尺寸
function setImgScale(s) {
  imgScale.value = Math.max(1, Math.min(5, s));
  const f = baseScale.value * imgScale.value;
  const dw = imgW.value * f,
    dh = imgH.value * f;
  imgX.value = (stageW.value - dw) / 2;
  imgY.value = (stageH.value - dh) / 2;
  clampBox(boxX.value, boxY.value); // 框仍约束在图片内
}
// 四角拖动：固定对角，保持比例，约束在图片显示范围内
function doResize(corner, px, py) {
  const ratio = cropRatio.value;
  const left0 = boxX.value,
    top0 = boxY.value,
    right0 = boxX.value + boxW.value,
    bottom0 = boxY.value + boxH.value;
  const fx = corner.includes("l") ? right0 : left0; // 固定角 x
  const fy = corner.includes("t") ? bottom0 : top0; // 固定角 y
  let w = Math.abs(px - fx);
  let h = w / ratio;
  const maxW = corner.includes("l")
    ? fx - imgX.value
    : imgX.value + imgW.value * dispScale.value - fx;
  const maxH = corner.includes("t")
    ? fy - imgY.value
    : imgY.value + imgH.value * dispScale.value - fy;
  w = Math.max(MIN_BOX, Math.min(w, maxW, maxH * ratio));
  h = w / ratio;
  const left = corner.includes("l") ? fx - w : fx;
  const right = corner.includes("l") ? fx : fx + w;
  const top = corner.includes("t") ? fy - h : fy;
  const bottom = corner.includes("t") ? fy : fy + h;
  boxX.value = left;
  boxY.value = top;
  boxW.value = right - left;
  boxH.value = bottom - top;
}
function onCropTouchStart(e) {
  if (e.touches.length >= 2) {
    const [a, b] = e.touches;
    pinchDist0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
    pinchScale0 = imgScale.value;
    cropMode = "pinch";
    return;
  }
  const p = localPoint(e);
  const corner = hitCorner(p.x, p.y);
  if (corner) {
    cropMode = "resize-" + corner;
  } else if (insideBox(p.x, p.y)) {
    cropMode = "move";
    moveOffset = { x: boxX.value - p.x, y: boxY.value - p.y };
  } else {
    cropMode = null;
  }
}
function onCropTouchMove(e) {
  if (cropMode === "pinch" && e.touches.length >= 2) {
    const [a, b] = e.touches;
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
    setImgScale(pinchScale0 * (d / pinchDist0));
    return;
  }
  if (e.touches.length >= 2) return; // 多指期间忽略单指逻辑
  const p = localPoint(e);
  if (cropMode === "move") {
    clampBox(moveOffset.x + p.x, moveOffset.y + p.y);
  } else if (cropMode && cropMode.startsWith("resize-")) {
    doResize(cropMode.slice(7), p.x, p.y);
  }
}
function onCropTouchEnd(e) {
  cropMode = null; // 抬起后重置，避免跳变
}

// 比例选择：选图后从 3:4 / 4:3 预览进入对应裁剪
function enterCrop(ratio) {
  showRatioPicker.value = false;
  initCropper(pendingCropSrc.value, pendingCropInfo.value, ratio);
}
// 单比例裁剪结果上传（复用云存储，带令牌防孤儿），并合并进 coverUploading 供保存 await
function uploadCrop(storeRef, target) {
  const myToken = ++currentUploadToken.value[target];
  const path = storeRef.value.temp;
  const p = uploadLedgerCover(path)
    .then(({ rel, fileID }) => {
      if (currentUploadToken.value[target] !== myToken) {
        return deleteLedgerCover(fileID); // 令牌失效 → 删孤儿
      }
      storeRef.value = { ...storeRef.value, fileID, rel };
      syncCoverPreview();
    })
    .catch((e) => {
      console.error("[ledger] 封面上传失败:", e);
      uni.showToast({ title: "封面上传失败", icon: "none" });
    });
  activeUploads.push(p);
  coverUploading = Promise.all(activeUploads.slice());
}
// 把已裁剪的比例同步到表单封面字段：主封面优先 4:3（与系统图/网格一致），3:4 作为副比例落库
function syncCoverPreview() {
  const t = cropTarget.value;
  const main = crop43.value || crop34.value; // 主封面（优先 4:3）
  const sec = crop34.value; // 副比例固定 3:4
  if (t === "edit") {
    editLedgerCover.value = main ? main.temp : "";
    editLedgerCoverRel.value = main ? main.fileID || main.rel : "";
    editLedgerCover34.value = sec ? sec.temp : "";
    editLedgerCoverRel34.value = sec ? sec.fileID || sec.rel : "";
  } else {
    newLedgerCover.value = main ? main.temp : "";
    newLedgerCoverRel.value = main ? main.fileID || main.rel : "";
    newLedgerCover34.value = sec ? sec.temp : "";
    newLedgerCoverRel34.value = sec ? sec.fileID || sec.rel : "";
  }
  autoExtract(t);
}
// 比例选择"完成"：把已裁剪比例写入封面字段并关闭
function finishCrop() {
  syncCoverPreview();
  showRatioPicker.value = false;
  pendingCropSrc.value = "";
  pendingCropInfo.value = null;
}
// 取消：已裁剪任一比例则保留结果（等同完成），否则作废
function cancelRatio() {
  if (crop34.value || crop43.value) {
    finishCrop();
    return;
  }
  currentUploadToken.value[pendingCropTarget.value]++;
  showRatioPicker.value = false;
  pendingCropSrc.value = "";
  pendingCropInfo.value = null;
}

function cancelCrop() {
  showCropper.value = false;
  cropSrc.value = "";
}

// 确认裁剪：用 Canvas 2D 把裁剪区域绘制到 600x800 画布并导出
function confirmCrop() {
  const factor = dispScale.value;
  const sx = (boxX.value - imgX.value) / factor;
  const sy = (boxY.value - imgY.value) / factor;
  const sw = boxW.value / factor;
  const sh = boxH.value / factor;
  const outH = OUT_W / cropRatio.value;
  uni
    .createSelectorQuery()
    .select("#cropExport")
    .node()
    .exec((res) => {
      const canvas = res[0] && res[0].node;
      if (!canvas) {
        uni.showToast({ title: "裁剪失败", icon: "none" });
        return;
      }
      const ctx = canvas.getContext("2d");
      const img = canvas.createImage();
      img.onload = () => {
        canvas.width = OUT_W;
        canvas.height = outH;
        ctx.clearRect(0, 0, OUT_W, outH);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUT_W, outH);
        uni.canvasToTempFilePath({
          canvas,
          x: 0,
          y: 0,
          width: OUT_W,
          height: outH,
          destWidth: OUT_W,
          destHeight: outH,
          fileType: "png",
          success: (r) => {
            // 按当前比例写入对应裁剪结果（3:4→crop34 / 4:3→crop43），随后回到比例选择，可继续裁剪另一比例
            const is34 = Math.abs(cropRatio.value - 0.75) < 0.001;
            const storeRef = is34 ? crop34 : crop43;
            storeRef.value = { temp: r.tempFilePath, fileID: null, rel: "" };
            uploadCrop(storeRef, cropTarget.value);
            syncCoverPreview();
            showCropper.value = false;
            cropSrc.value = "";
            showRatioPicker.value = true;
          },
          fail: () => uni.showToast({ title: "裁剪失败", icon: "none" }),
        });
      };
      img.onerror = () => uni.showToast({ title: "裁剪失败", icon: "none" });
      img.src = cropSrc.value;
    });
}

// 编辑账本
const showEdit = ref(false);
const editTarget = ref(null);
const editName = ref("");
const editIcon = ref("");
const editLedgerCover = ref(""); // 预览地址
const editLedgerCover34 = ref(""); // 3:4 副比例预览地址
const editLedgerCoverRel34 = ref(""); // 3:4 副比例落库值
const editLedgerCoverRel = ref(""); // 落库值：系统图为 /app_static/...，用户上传为 cloud:// fileID
const editOldCoverFileID = ref(""); // 编辑前已有的用户封面 fileID，替换成功后清理旧文件
const editLedgerDesc = ref(""); // 简介（与新建字段一致）
// 主题色：自定义取色 + 选封面后自动生成的色板建议（见 autoExtract）
const editColor = ref("#25cc5d"); // 自定义选中的 hex
const editDescFocused = ref(false); // 简介输入框聚焦态

// 编辑弹窗"保存"按钮的浮雕液态填充比例：随表单字段完成度 0→1（未填 0 / 部分 / 全填 1）
const editFillRatio = computed(() => {
  let r = 0;
  if (editName.value.trim()) r += 0.5;
  if (editIcon.value) r += 0.25;
  if (editLedgerCover.value) r += 0.25;
  return r;
});

// 多选删除：模式开关、已选账本 id、删除确认弹窗目标
const multiSelect = ref(false);
const selectedIds = ref([]);
const delTargets = ref([]);
const showDelConfirm = ref(false);
// 就地操作菜单：记录当前展开菜单的账本 _id（仅一个，其他账本不受影响）
const openMenuId = ref(null);

// 真实账本 + 交易（用于聚合）
const ledgers = ref([]);
const transactions = ref([]);

// 调色板（无封面取色/旧账本回退）：与封面取色锚点一致，更深、更高饱和、对比更高
const PALETTE = [
  { color: "#8ae99b", colorBg: "#e1fae3" },
  { color: "#5b3fc4", colorBg: "#f3f0ff" },
];

const monthKey = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
})();

const fmt = (fen) =>
  (fen / 100).toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const totalBalance = computed(() =>
  transactions.value.reduce(
    (s, t) => s + (t.type === "expense" ? -t.amount : t.amount),
    0
  )
);
const monthIncome = computed(() =>
  transactions.value
    .filter((t) => t.type !== "expense" && t.month_key === monthKey)
    .reduce((s, t) => s + t.amount, 0)
);
const monthExpense = computed(() =>
  transactions.value
    .filter((t) => t.type === "expense" && t.month_key === monthKey)
    .reduce((s, t) => s + t.amount, 0)
);
const monthNet = computed(() => monthIncome.value - monthExpense.value);

// 全局统计卡片：默认简洁总览，点击展开日/月/年明细
const ovExpanded = ref(false);

// 点击切换时的逐字滑出/滑入动画反馈（取自 uiverse.io KINGFRESS/giant-deer-25 的 hover 效果）
const calSwapping = ref(false);
const swapFrom = ref("");
const swapTo = ref("");
const swapDir = ref("in"); // 'in'：收起日历滑入；'out'：收起日历滑出
let calSwapTimer = null;
const onCalBtn = () => {
  // 先捕获点击前的文案用于离场、点击后的文案用于入场，避免 ovExpanded 翻转后两层文字错乱
  swapFrom.value = ovExpanded.value ? "收起日历" : "查看日历";
  swapTo.value = ovExpanded.value ? "查看日历" : "收起日历";
  // 由「查看日历」点出 → 收起日历滑入；由「收起日历」点出 → 收起日历滑出（方向相反）
  swapDir.value = ovExpanded.value ? "out" : "in";
  ovExpanded.value = !ovExpanded.value;
  calSwapping.value = true;
  clearTimeout(calSwapTimer);
  calSwapTimer = setTimeout(() => {
    calSwapping.value = false;
  }, 750);
};
const ovDim = ref("month"); // 'day' | 'month' | 'year'
const ovKey = ref(formatMonthKey(new Date()));
function ovDefaultKey(dim) {
  const now = new Date();
  if (dim === "day") return formatDateKey(now);
  if (dim === "month") return formatMonthKey(now);
  return String(now.getFullYear());
}
function setOvDim(dim) {
  ovDim.value = dim;
  ovKey.value = ovDefaultKey(dim);
}
// 下方数据区：随选中的 年/月/日 实时联动。
// 关键：在每个 computed 顶部直接读取 ovDim.value / ovKey.value（ref），
// 确保依赖被 Vue 精准追踪，切换日期/维度时即时重算并重新渲染。
function inSelectedPeriod(t) {
  const dim = ovDim.value;
  const key = ovKey.value;
  if (dim === "day") return t.date_key === key;
  if (dim === "month") return t.month_key === key;
  return (t.date_key || "").startsWith(key + "-");
}
const ovExpense = computed(() => {
  const dim = ovDim.value;
  const key = ovKey.value;
  let s = 0;
  for (const t of transactions.value) {
    if (t.type !== "expense") continue;
    if (dim === "day" && t.date_key !== key) continue;
    if (dim === "month" && t.month_key !== key) continue;
    if (dim === "year" && !(t.date_key || "").startsWith(key + "-")) continue;
    s += t.amount;
  }
  return s;
});
const ovIncome = computed(() => {
  const dim = ovDim.value;
  const key = ovKey.value;
  let s = 0;
  for (const t of transactions.value) {
    if (t.type === "expense") continue;
    if (dim === "day" && t.date_key !== key) continue;
    if (dim === "month" && t.month_key !== key) continue;
    if (dim === "year" && !(t.date_key || "").startsWith(key + "-")) continue;
    s += t.amount;
  }
  return s;
});
const ovNet = computed(() => ovIncome.value - ovExpense.value);
const ovTxCount = computed(() => {
  const dim = ovDim.value;
  const key = ovKey.value;
  let n = 0;
  for (const t of transactions.value) {
    if (dim === "day" && t.date_key !== key) continue;
    if (dim === "month" && t.month_key !== key) continue;
    if (dim === "year" && !(t.date_key || "").startsWith(key + "-")) continue;
    n++;
  }
  return n;
});
// 账本：当前周期内「有流水」的账本数（按 ledger_id 去重），随日期动态变化，而非固定总数
const ovLedgerCount = computed(() => {
  const dim = ovDim.value;
  const key = ovKey.value;
  const set = new Set();
  for (const t of transactions.value) {
    if (dim === "day" && t.date_key !== key) continue;
    if (dim === "month" && t.month_key !== key) continue;
    if (dim === "year" && !(t.date_key || "").startsWith(key + "-")) continue;
    if (t.ledger_id) set.add(t.ledger_id);
  }
  return set.size;
});

// 日历网格用：按日 / 按月 / 按年聚合收入与支出（分），用于格子下方的金额提示
const dayExpenseMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type === "expense" && t.date_key)
      map[t.date_key] = (map[t.date_key] || 0) + t.amount;
  }
  return map;
});
const dayIncomeMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type !== "expense" && t.date_key)
      map[t.date_key] = (map[t.date_key] || 0) + t.amount;
  }
  return map;
});
const monthExpenseMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type === "expense" && t.month_key)
      map[t.month_key] = (map[t.month_key] || 0) + t.amount;
  }
  return map;
});
const monthIncomeMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type !== "expense" && t.month_key)
      map[t.month_key] = (map[t.month_key] || 0) + t.amount;
  }
  return map;
});
const yearExpenseMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type === "expense" && t.date_key) {
      const y = t.date_key.slice(0, 4);
      map[y] = (map[y] || 0) + t.amount;
    }
  }
  return map;
});
const yearIncomeMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type !== "expense" && t.date_key) {
      const y = t.date_key.slice(0, 4);
      map[y] = (map[y] || 0) + t.amount;
    }
  }
  return map;
});

// 每个账本的展示视图：聚合交易，按当前选中的 日/月/年 维度实时联动
// （收入、支出、使用额、限额、笔数均随 ovDim/ovKey 变化）
const ledgerViews = computed(() =>
  ledgers.value.map((l, i) => {
    const isMaster = !!l.is_system;
    const txs = isMaster
      ? transactions.value
      : transactions.value.filter((t) => t.ledger_id === l._id);
    const dim = ovDim.value;
    const key = ovKey.value;
    const inPeriod = (t) => {
      if (dim === "day") return t.date_key === key;
      if (dim === "month") return t.month_key === key;
      return (t.date_key || "").startsWith(key + "-");
    };
    const periodTxs = txs.filter(inPeriod);
    const income = periodTxs
      .filter((t) => t.type !== "expense")
      .reduce((s, t) => s + t.amount, 0);
    const expense = periodTxs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    // 限额随维度换算：月=月预算，日=月预算/30，年=月预算×12
    const monthly = l.monthly_budget || 0;
    let limit = monthly;
    if (dim === "day") limit = monthly ? Math.round(monthly / 30) : 0;
    else if (dim === "year") limit = monthly * 12;

    const spent = expense;
    const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
    const pal = PALETTE[i % PALETTE.length];
    return {
      _id: l._id,
      emoji: l.icon || "📒",
      name: l.name,
      type: isMaster ? "master" : "sub",
      is_system: isMaster,
      income,
      expense,
      balance,
      limit,
      spent,
      pct,
      dim,
      records: periodTxs.length,
      members: l.memberCount || 1,
      color: pal.color,
      colorBg: pal.colorBg,
      cover: l.cover || "",
      theme_color: l.theme_color || "",
    };
  })
);

// 维度中文前缀：用于进度条"使用/限额"标签
const dimWord = (dim) => (dim === "day" ? "日" : dim === "year" ? "年" : "月");

// 预算周期命名：随上方所选日期维度联动（天→天预算 / 月→月度预算 / 年→年度预算）
const budgetWord = (dim) =>
  dim === "day" ? "天预算" : dim === "year" ? "年度预算" : "月度预算";

// 主题色：列表直接读取数据库持久化的 theme_color，不在进入时自动提取。
// 主账本恒返回 null（沿用原 CSS 绿）；其余账本返回 theme_color，无则回退到调色板 l.color。
function coverTheme(l) {
  if (l.type === "master") return null;
  return l.theme_color || null;
}

// —— 资产 Tab：接入真实资产账户（阶段 10） ——
const ASSET_SUBTYPE_ICON = {
  wechat: "💚",
  alipay: "💙",
  bank: "🏦",
  cash: "💵",
  provident_fund: "🏠",
  insurance: "🛡️",
  fund: "📈",
  stock: "📊",
  bond: "📜",
  gold: "🪙",
  wealth: "💼",
  other: "📦",
};
const ASSET_SUBTYPE_BG = {
  wechat: "#e8f8ec",
  alipay: "#e8f1fb",
  bank: "#f3f0ff",
  cash: "#e1fae3",
  provident_fund: "#eaf3ff",
  insurance: "#fdeef0",
  fund: "#fffbeb",
  stock: "#eef5ff",
  bond: "#f3f0ff",
  gold: "#fbf3e0",
  wealth: "#eafaf1",
  other: "#eef1f4",
};
const ASSET_SUBTYPE_LABEL = {
  wechat: "微信",
  alipay: "支付宝",
  bank: "银行卡",
  cash: "现金",
  provident_fund: "公积金",
  insurance: "医保",
  fund: "基金",
  stock: "股票",
  bond: "债券",
  gold: "黄金",
  wealth: "理财",
  other: "其他",
};
const ACCOUNTS = computed(() =>
  (state.assets || []).map((a) => ({
    _id: a._id,
    icon: ASSET_SUBTYPE_ICON[a.account_subtype] || "💳",
    colorBg: ASSET_SUBTYPE_BG[a.account_subtype] || "#e1fae3",
    name: a.name,
    type: ASSET_SUBTYPE_LABEL[a.account_subtype] || a.account_subtype,
    balance: a.balance,
  }))
);

const STICKERS = [
  { id: "s1", emoji: "🍜", name: "拉面", used: 28, category: "餐饮" },
  { id: "s2", emoji: "☕", name: "咖啡", used: 35, category: "餐饮" },
  { id: "s3", emoji: "🚇", name: "地铁", used: 42, category: "交通" },
  { id: "s4", emoji: "🛍️", name: "购物", used: 22, category: "购物" },
  { id: "s5", emoji: "🎮", name: "游戏", used: 11, category: "娱乐" },
  { id: "s6", emoji: "💊", name: "药品", used: 4, category: "健康" },
  { id: "s7", emoji: "💰", name: "工资", used: 16, category: "收入" },
  { id: "s8", emoji: "🎁", name: "红包", used: 5, category: "收入" },
];

const MONTHLY = [
  { month: "1月", income: 8200, expense: 5340 },
  { month: "2月", income: 8200, expense: 4120 },
  { month: "3月", income: 8500, expense: 6780 },
  { month: "4月", income: 8200, expense: 5920 },
  { month: "5月", income: 9100, expense: 6230 },
  { month: "6月", income: 8200, expense: 3840 },
];

const maxBar = Math.max(...MONTHLY.map((s) => s.income));

const cash = computed(() => (state.assetTotals ? state.assetTotals.disposable : 0));
const invest = computed(() => (state.assetTotals ? state.assetTotals.investment : 0));
const total = computed(() => (state.assetTotals ? state.assetTotals.full : 0));
const assetDisplay = computed(() =>
  assetMode.value === "disposable"
    ? cash.value
    : assetMode.value === "withInvest"
    ? cash.value + invest.value
    : total.value
);

async function loadData() {
  const uid = state.uid;
  console.log("[ledger][loadData] called, uid =", JSON.stringify(uid));
  if (!uid) {
    console.warn("[ledger][loadData] uid 为空，跳过加载");
    return;
  }
  try {
    // 走云函数读取，禁止前端直连数据库
    const [ledgerData, txData] = await Promise.all([listLedgers(), listTransactions({})]);
    console.log("[ledger][loadData] 账本接口响应长度 =", ledgerData.length);
    console.log("[ledger][loadData] 交易接口响应长度 =", txData.length);

    // JS 端过滤软删（deleted_at 为空/未设置的才是有效账本）
    let list = ledgerData.filter((l) => !l.deleted_at);
    console.log("[ledger][loadData] 过滤软删后有效账本数 =", list.length);
    const hasMaster = list.some((l) => l.is_system);
    console.log(
      "[ledger][loadData] 响应中是否含总账本(is_system) =",
      hasMaster,
      "各账本 is_system =",
      JSON.stringify(list.map((l) => ({ name: l.name, is_system: !!l.is_system })))
    );

    if (!hasMaster) {
      console.log(
        "[ledger][loadData] 未检测到总账本，尝试 ensureMasterLedger() 兜底创建"
      );
      try {
        const master = await ensureMasterLedger();
        console.log(
          "[ledger][loadData] ensureMasterLedger 返回 =",
          JSON.stringify(master)
        );
        list.unshift(master);
      } catch (err) {
        // 总账本统一由 ensureMasterLedger 云函数创建，前端不再直写数据库
        console.error("[ledger][loadData] ensure master ledger failed", err);
      }
    } else {
      console.log("[ledger][loadData] 总账本已存在，无需创建");
    }
    // 总账本始终置顶，其余按 sort_order 升序
    list.sort((a, b) => {
      if (a.is_system && !b.is_system) return -1;
      if (!a.is_system && b.is_system) return 1;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
    console.log(
      "[ledger][loadData] 最终渲染列表长度 =",
      list.length,
      "顺序 =",
      JSON.stringify(list.map((l) => ({ name: l.name, is_system: !!l.is_system })))
    );
    ledgers.value = list;
    transactions.value = txData;
    // 预解析云存储封面（用户上传，存 cloud:// fileID）为临时访问 URL。
    // 同时解析 3:4 版本 cover34 与 4:3 主封面 cover，按 fileID 存入 coverUrlMap 供 coverDisplay 取用
    const cloudCovers = list
      .flatMap((l) => [l.cover, l.cover34])
      .filter((x) => x && String(x).startsWith("cloud://"));
    if (cloudCovers.length) {
      const map = await getCloudTempUrls(cloudCovers);
      for (const f of cloudCovers) {
        if (map[f]) coverUrlMap[f] = map[f];
      }
    }
    if (list.length === 0) {
      console.warn(
        "[ledger][loadData] ⚠️ 最终列表仍为空：请确认已登录（非游客）且 ensureMasterLedger 或前端直写成功，详见上方日志"
      );
    }
    await userStore.loadAssetAccounts().catch(() => {});
  } catch (err) {
    console.error("[ledger][loadData] load failed", err);
  }
}

// 顶部安全区：避开微信小程序右上角原生胶囊按钮（与 index/TopBar 一致）
function resolveTopPadding() {
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect();
    if (menuButton?.bottom > 0) {
      const gap = uni.upx2px(16);
      return `${menuButton.bottom + gap}px`;
    }
  } catch (_) {}
  const { statusBarHeight = 0 } = uni.getSystemInfoSync();
  return `${statusBarHeight + uni.upx2px(88)}px`;
}
const pagePaddingTop = ref(resolveTopPadding());

// 会话恢复是异步云调用，页面挂载时 uid 可能尚未就绪；
// 因此除首次挂载外，还在「会话就绪」与「每次进入 tab」时重新加载，
// 避免列表因竞态而永远为空、总账本永远不被创建。
function onSessionReady() {
  if (state.uid) loadData();
}

onMounted(() => {
  pagePaddingTop.value = resolveTopPadding();
  if (state.uid) loadData();
  uni.$on("sparejar-session-ready", onSessionReady);
});

onShow(() => {
  // 双保险：即便绕过 TabBar 拦截直接进入账本页，未登录也重定向到登录页
  if (!checkLoggedIn()) {
    uni.showToast({ title: "请先登录后查看账本", icon: "none" });
    uni.navigateTo({
      url: "/pages/login/login?redirect=" + encodeURIComponent("/pages/ledger/ledger"),
    });
    return;
  }
  if (state.uid) loadData();
  // 从贴纸库等页面返回时，滑块复位到当前内容 Tab
  sliderIndex.value = Math.max(
    0,
    PAGE_TABS.findIndex((t) => t.key === pageTab.value)
  );
});

onUnmounted(() => {
  uni.$off("sparejar-session-ready", onSessionReady);
});

const openLedgerSheet = (l) => {
  uni.navigateTo({ url: `/pages/ledger-detail/ledger-detail?id=${l._id}` });
};
const goAssetMgr = () => uni.navigateTo({ url: "/pages/asset-mgr/asset-mgr" });

// ===== 成员管理（用户级全局成员 + 账本关联） =====
// 从账本列表页进入，管理成员与「主账本」的关联。
const showMemberMgr = ref(false)
const memberMgrLedgerId = ref('')
const memberMgrLedgerName = ref('')

function getMasterLedger() {
  const id = userStore.state.defaultLedgerId
  if (id) {
    const l = ledgers.value.find((x) => x._id === id)
    if (l) return l
  }
  return ledgers.value[0] || null
}

async function loadMemberMgrMembers() {
  const l = getMasterLedger()
  if (!l) return
  memberMgrLedgerId.value = l._id
  memberMgrLedgerName.value = l.name || '账本'
}

async function openMemberMgr() {
  await loadMemberMgrMembers()
  showMemberMgr.value = true
}
const goAssetDetail = (a) =>
  uni.navigateTo({ url: `/pages/asset-detail/asset-detail?id=${a._id}` });
const goStickerLib = () => uni.navigateTo({ url: "/pages/sticker-lib/sticker-lib" });

/** 顶部 Tab 切换；贴纸 Tab 跳转到独立贴纸库页（避免内联占位）。 */
function switchTab(key) {
  // 先把滑块滑到目标项（含贴纸），再处理跳转或内容切换
  const idx = PAGE_TABS.findIndex((t) => t.key === key);
  if (idx >= 0) sliderIndex.value = idx;
  if (key === "sticker") {
    uni.navigateTo({ url: "/pages/sticker-lib/sticker-lib" });
    return;
  }
  pageTab.value = key;
}

// 未选择封面时，从系统默认图库均匀随机分配一张（排除占位项 icon_cover.png）
function pickRandomCover() {
  const pool = LEDGER_ICONS.filter((ic) => ic !== COVER_PLACEHOLDER);
  return pool[Math.floor(Math.random() * pool.length)];
}

// 新建账本
async function createLedger() {
  const name = newLedgerName.value.trim();
  if (!name) {
    uni.showToast({ title: "请输入账本名称", icon: "none" });
    return;
  }
  const customCount = ledgers.value.filter((l) => !l.is_system).length;
  const max = (state.settings && state.settings.max_custom_ledgers) || 5;
  if (customCount >= max) {
    uni.showToast({ title: `最多创建 ${max} 个账本`, icon: "none" });
    return;
  }
  // 封面：未选择时从系统默认图库均匀随机分配一张；已手动选择则保留相对路径
  let finalCover = newLedgerCoverRel.value;
  let finalIcon = newLedgerIcon.value;
  // 用户刚上传自定义图但还在上传中 → 等上传完成以拿到落库相对路径
  if (coverUploading) {
    try {
      await coverUploading;
    } catch (e) {
      /* 失败已在 applyCover 内提示 */
    }
    finalCover = newLedgerCoverRel.value || finalCover;
  }
  if (!finalCover) {
    finalCover = pickRandomCover();
    if (!finalIcon) finalIcon = finalCover; // 未选图标则同步用随机封面，保持视觉统一
  }
  // 主题色：仅自定义取色（封面自动取色已移除），直接落库所选 hex
  const themeColor = newLedgerColor.value;
  try {
    // 走云函数：created_at/updated_at 由服务端自动填充（字符串），前端不传时间字段
    await apiCreateLedger({
      name,
      icon: finalIcon || LEDGER_ICONS[0],
      cover: finalCover,
      cover34: newLedgerCoverRel34.value,
      desc: newLedgerDesc.value,
      monthly_budget: 0,
      sort_order: ledgers.value.length,
      theme_color: themeColor,
    });
    // 创建成功：封面已正式引用，解除"待清理"标记，避免被误删
    pendingCover.value = null;
    closeNewLedger(true);
    uni.showToast({ title: "已创建", icon: "success" });
    await loadData();
  } catch (err) {
    console.error("[ledger][createLedger] 创建账本失败:", err);
    // 创建失败：新上传的封面未落库，清理云存储临时文件，避免孤儿残留
    if (pendingCover.value) deleteLedgerCover(pendingCover.value.fileID);
    const msg = (err && (err.message || err.errMsg)) || "创建失败";
    uni.showToast({
      title: /already exists/i.test(msg) ? "创建冲突，请重试" : "创建失败",
      icon: "none",
    });
  }
}

// 编辑账本（主账本仅允许改名/图标，不可删除）
async function openEdit(l) {
  editTarget.value = l;
  editName.value = l.name;
  // 仅当现有图标在图片库中才选中，否则不预选（避免强制选中首项）
  editIcon.value = l.icon && LEDGER_ICONS.some((x) => x.id === l.icon) ? l.icon : "";
  // 落库值兼容系统图(/app_static)与云存储(cloud://)
  editLedgerCoverRel.value =
    l.cover && (String(l.cover).startsWith("/") || String(l.cover).startsWith("cloud://"))
      ? l.cover
      : "";
  // 预览地址：系统图/emoji 用 resolveCover 直出；用户上传为 cloud:// fileID，需解析为临时 URL 才能显示
  if (l.cover && String(l.cover).startsWith("cloud://")) {
    editLedgerCover.value = await getCloudTempUrl(l.cover);
  } else {
    editLedgerCover.value = resolveCover(l.cover);
  }
  // 3:4 副比例：与主封面同理加载，保证编辑保存时不丢失已存的 cover34
  const cover34 = l.cover34 || "";
  editLedgerCoverRel34.value =
    cover34 && (String(cover34).startsWith("/") || String(cover34).startsWith("cloud://"))
      ? cover34
      : "";
  if (cover34 && String(cover34).startsWith("cloud://")) {
    editLedgerCover34.value = await getCloudTempUrl(cover34);
  } else {
    editLedgerCover34.value = resolveCover(cover34);
  }
  // 还原已裁剪比例，避免保存时 syncCoverPreview 误将 cover34 清空
  crop43.value = l.cover
    ? { temp: editLedgerCover.value, fileID: String(l.cover).startsWith("cloud://") ? l.cover : null, rel: l.cover }
    : null;
  crop34.value = cover34
    ? { temp: editLedgerCover34.value, fileID: String(cover34).startsWith("cloud://") ? cover34 : null, rel: cover34 }
    : null;
  // 记录编辑前的用户封面 fileID，替换成功后删旧文件，避免云存储冗余
  editOldCoverFileID.value =
    l.cover && String(l.cover).startsWith("cloud://") ? l.cover : "";
  // 简介：与新建字段一致
  editLedgerDesc.value = l.desc || "";
  // 主题色：保留已持久化的颜色
  editColor.value = l.theme_color || "#25cc5d";
  // 已有封面则自动提取色板（编辑态仅作建议，不覆盖已存主题色）
  autoExtract("edit");
  showEdit.value = true;
}

// 卡片点击：多选态为勾选，否则进账本；若菜单已展开则先收起菜单；长按后抑制紧随的点击以免误开
let justLongPressed = false;
function onCardClick(l) {
  if (justLongPressed) {
    justLongPressed = false;
    return;
  }
  if (openMenuId.value === l._id) {
    openMenuId.value = null;
    return;
  }
  if (multiSelect.value) toggleSelect(l);
  else openLedgerSheet(l);
}

// 切换就地操作菜单（绑定账本 _id；再次点击同一卡片的 ⋯ 收起）
function toggleMenu(l) {
  if (multiSelect.value) return;
  const willOpen = openMenuId.value !== l._id;
  openMenuId.value = willOpen ? l._id : null;
  if (willOpen) actionTab.value = "edit"; // 打开时滑块复位到「编辑」
}
// tabs 当前高亮项（控制 glider 滑块位置；默认"编辑"为安全高亮）
const actionTab = ref("edit");
function onMenuDelete(l) {
  actionTab.value = "delete";
  // 先让滑块滑到"删除"，再弹出删除确认，使 tabs 高亮可见
  setTimeout(() => {
    openMenuId.value = null;
    openDelete(l);
  }, 180);
}
function onMenuEdit(l) {
  actionTab.value = "edit";
  setTimeout(() => {
    openMenuId.value = null;
    openEdit(l);
  }, 180);
}
// 操作形态下点击卡片空白处（非按钮区域）收起，恢复常规形态
function cancelAction() {
  openMenuId.value = null;
}
function onCardLongPress(l) {
  justLongPressed = true;
  setTimeout(() => {
    justLongPressed = false;
  }, 400);
  if (multiSelect.value) return;
  openMenuId.value = l._id;
}
async function saveEdit() {
  const name = editName.value.trim();
  if (!name) {
    uni.showToast({ title: "请输入账本名称", icon: "none" });
    return;
  }
  // 若新封面还在上传中，等完成以拿到落库相对路径
  if (coverUploading) {
    try {
      await coverUploading;
    } catch (e) {
      /* 失败已提示 */
    }
  }
  try {
    // 走云函数：updated_at 由服务端自动刷新（字符串），前端不传时间字段
    // cover 落库值：系统图为 /app_static/...，用户上传为 cloud:// fileID
    const newCover = editLedgerCoverRel.value;
    // 主题色：仅自定义取色（封面自动取色已移除），直接落库所选 hex
    const themeColor = editColor.value;
    await apiUpdateLedger(editTarget.value._id, {
      name,
      icon: editIcon.value || LEDGER_ICONS[0].id,
      cover: newCover,
      cover34: editLedgerCoverRel34.value,
      desc: editLedgerDesc.value,
      theme_color: themeColor,
    });
    // 保存成功：若封面被替换，清理编辑前的旧用户封面文件（cloud://），避免云存储冗余
    if (editOldCoverFileID.value && editOldCoverFileID.value !== newCover) {
      deleteLedgerCover(editOldCoverFileID.value);
    }
    editOldCoverFileID.value = "";
    // 保存成功：封面已正式引用，解除"待清理"标记
    pendingCover.value = null;
    closeEditLedger(true);
    uni.showToast({ title: "已保存", icon: "success" });
    await loadData();
  } catch (err) {
    // 保存失败：新上传的封面未落库，清理云存储临时文件，避免孤儿残留
    if (pendingCover.value) deleteLedgerCover(pendingCover.value.fileID);
    uni.showToast({ title: "保存失败", icon: "none" });
  }
}

// 关闭编辑弹窗：若上传了新封面但最终未保存，清理 CDN 上的临时文件
// 关闭编辑弹窗：committed=true 表示保存成功（封面已落库，保留文件）；
// 其余（蒙版取消/未保存）作废进行中的上传并清理临时文件，防止孤儿残留
async function closeEditLedger(committed = false) {
  if (!committed) currentUploadToken.value.edit++; // 取消 → 作废进行中的上传
  if (coverUploading) {
    try {
      await coverUploading;
    } catch (e) {
      /* 失败已提示 */
    }
  }
  if (!committed) await clearPending("edit");
  editTarget.value = null;
  editName.value = "";
  editIcon.value = "";
  editLedgerCover.value = "";
  editLedgerCoverRel.value = "";
  editLedgerCover34.value = "";
  editLedgerCoverRel34.value = "";
  editLedgerDesc.value = "";
  editColor.value = "#25cc5d";
  autoPaletteEdit.value = [];
  crop34.value = null;
  crop43.value = null;
  activeUploads = [];
  showEdit.value = false;
}

// 多选模式开关：进入时隐藏底部 tabbar，退出时恢复
function toggleMultiSelect() {
  if (multiSelect.value) {
    exitMultiSelect();
  } else {
    multiSelect.value = true;
    uni.$emit("hide-tabbar");
  }
}
function exitMultiSelect() {
  multiSelect.value = false;
  selectedIds.value = [];
  uni.$emit("show-tabbar");
}

// 勾选 / 取消勾选（总账本不可选）
function toggleSelect(l) {
  if (l.is_system) return;
  const id = l._id;
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((x) => x !== id)
    : [...selectedIds.value, id];
}

// 单选删除：弹出二次确认（列出账本名，选择处理方式）
function openDelete(l) {
  if (l.is_system) {
    uni.showToast({ title: "总账本不可删除", icon: "none" });
    return;
  }
  delTargets.value = [l];
  showDelConfirm.value = true;
}

// 批量删除：收集已选非系统账本，弹出二次确认
function openBatchDelete() {
  const targets = ledgerViews.value.filter(
    (l) => selectedIds.value.includes(l._id) && !l.is_system
  );
  if (!targets.length) return;
  delTargets.value = targets;
  showDelConfirm.value = true;
}

// 执行删除（单选 / 多选共用）：转移或彻底删除，均带确认
async function confirmDelete(mode) {
  const targets = delTargets.value;
  if (!targets.length) return;
  try {
    await Promise.all(targets.map((t) => deleteLedger(t._id, mode)));
    uni.showToast({ title: `已删除 ${targets.length} 个账本`, icon: "success" });
    showDelConfirm.value = false;
    delTargets.value = [];
    selectedIds.value = [];
    if (multiSelect.value) exitMultiSelect();
    await loadData();
  } catch (err) {
    const msg = err && err.message ? err.message : "删除失败";
    uni.showToast({ title: msg, icon: "none" });
  }
}

// 组件卸载时若仍处于多选态，恢复 tabbar 显示
onUnmounted(() => {
  if (multiSelect.value) uni.$emit("show-tabbar");
});
</script>

<style scoped lang="scss">
/* 离屏取色画布：移出可视区但保留真实尺寸，供封面主色提取 */
.cover-color-canvas {
  position: fixed;
  left: -9999rpx;
  top: -9999rpx;
  width: 32rpx;
  height: 32rpx;
  opacity: 0;
  pointer-events: none;
}

.ledger-page {
  width: 750rpx;
  height: 100vh;
  overflow: hidden;
  position: relative;
  margin: 0 auto;
  // background: var(--g0);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 36rpx;

  &-sub {
    font-size: 22rpx;
    color: var(--ink4);
    display: block;
    margin-bottom: 4rpx;
  }

  &-title {
    font-size: 40rpx;
    font-weight: 900;
    color: var(--ink);
    letter-spacing: -1rpx;
  }

  &-actions {
    display: flex;
    gap: 16rpx;
  }
}

.action-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.8) 0%,
    rgba(255, 255, 255, 1) 100%
  );
  backdrop-filter: blur(12rpx) saturate(1.3);
  -webkit-backdrop-filter: blur(12rpx) saturate(1.3);
  border: 4rpx solid rgba(255, 255, 255, 1);
  @include sj-flex-center;
  cursor: pointer;
  font-size: 32rpx;
  box-shadow: 0 8rpx 64rpx rgba(0, 0, 0, 0.08);
}

/* 标签栏：Uiverse 风格分段开关（轨道 + 滑动旋钮） */
.page-tab-bar {
  position: relative;
  margin: 28rpx 32rpx 0;
  padding: 10rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  /* 轨道本体：白底 + 深色描边 + 斑点圆角 + 投影 */
  background: linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.8) 0%,
    rgba(255, 255, 255, 1) 100%
  );
  backdrop-filter: blur(12rpx) saturate(1.3);
  -webkit-backdrop-filter: blur(12rpx) saturate(1.3);
  transform: translate3d(0px, 0px, 30px);
  border: 2rpx solid rgba(255, 255, 255, 1);
  border-radius: 36rpx 110rpx 110rpx 110rpx;
  box-shadow: inset 6rpx 6rpx 12rpx rgba(206, 232, 218, 0.3),
    inset -6rpx -6rpx 12rpx rgba(255, 255, 255, 0.6);
  box-sizing: border-box;
}

/* 滑动滑块：承载选中态的黄色填充，随 activeIndex 平移 */
.tab-slider {
  position: absolute;
  top: 10rpx;
  left: 10rpx;
  z-index: 0;
  width: calc((100% - 68rpx) / 4);
  height: 76rpx;
  background: linear-gradient(135deg, #e6f8ed 0%, #ffffff 45%);
  border: 2rpx solid rgba(214, 233, 222, 0.9);
  border-radius: 110rpx 110rpx 36rpx 110rpx;
  box-shadow: inset 6rpx 6rpx 12rpx rgba(206, 232, 218, 0.3),
    inset -6rpx -6rpx 12rpx rgba(255, 255, 255, 0.6);
  box-sizing: border-box;
  pointer-events: none;
  transition: left 0.42s cubic-bezier(0.34, 1.4, 0.64, 1);
}

.page-tab {
  position: relative;
  z-index: 1;
  height: 76rpx;
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 0 16rpx;
  border-radius: 36rpx 110rpx 110rpx 110rpx;
  background: transparent;
  border: 3rpx solid transparent;
  overflow: hidden;
  cursor: pointer;
  box-sizing: border-box;
  transition: background 0.45s ease, border-color 0.45s ease,
    border-radius 0.45s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.45s ease;

  /* 激活态：黄色填充交给滑块承载，tab 自身保持透明，内容变深色 */
  &.active {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }
}

.tab-label {
  position: static;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--ink3);
  line-height: 1;
  white-space: nowrap;
  transition: color 0.3s ease;

  .page-tab.active & {
    color: var(--ink2);
  }
}

.tab-icon-wrap {
  position: static;
  width: auto;
  height: auto;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.3s ease;
}

.tab-icon {
  font-size: 26rpx;
  line-height: 1;
  color: #fde881;
  transition: color 0.3s ease, font-size 0.3s ease;

  .page-tab.active & {
    font-size: 32rpx;
    color: var(--ink, #222);
  }
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 28rpx;
}

.summary-label {
  font-size: 20rpx;
  color: var(--ink4);
  display: block;
  margin-bottom: 6rpx;
}

.summary-amount {
  font-size: 64rpx;
  font-weight: 900;
  color: var(--ink);
  letter-spacing: -2rpx;
}

.summary-income {
  font-size: 40rpx;
  font-weight: 800;
  color: var(--g5);
}

/* 全局统计卡：视图切换 */
.ov-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.seg {
  display: flex;
  background: rgba(194, 242, 200, 0.25);
  border-radius: 24rpx;
  padding: 6rpx;

  &-item {
    padding: 12rpx 28rpx;
    border-radius: 18rpx;
    font-size: 24rpx;
    font-weight: 600;
    color: var(--ink3);
    cursor: pointer;

    &.active {
      background: #fff;
      color: var(--g5);
      box-shadow: 0 4rpx 12rpx rgba(37, 204, 93, 0.15);
    }
  }
}

.ov-scroll {
  /* 功能性：保留占满 card-1 宽度并贴底（上一需求的布局约束） */
  position: absolute;
  left: 1%;
  right: 1%;
  bottom: 12rpx;
  width: 98%;
  box-sizing: border-box;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  padding: 0 16rpx;
  height: 100rpx;

  /* 垂直居中层：普通 view 用 flex 可靠居中；inline-flex 让轨道按内容宽度撑开，横向滚动照常 */
  .ov-track {
    display: inline-flex;
    align-items: center;
    height: 100%;
    white-space: nowrap;
  }
  /* 仿列表卡片：软 UI 浮雕（inset 双阴影 + 浅绿渐变 + 描边），内层 chip 保持平铺 */
  background: linear-gradient(135deg, #e6f8ed 0%, #ffffff 27%);
  border: 2rpx solid rgba(214, 233, 222, 0.9);
  border-radius: 28rpx;
  box-shadow: inset 6rpx 6rpx 12rpx rgba(206, 232, 218, 0.3),
    inset -6rpx -6rpx 12rpx rgba(255, 255, 255, 0.6);

  .ov-chip {
    display: inline-flex;
    flex-direction: column;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
    min-width: 156rpx;
    height: 72rpx;
    margin-right: 16rpx;
    padding: 0 24rpx;
    background: var(--g0);
    border-radius: 20rpx;
    text-align: left;
    box-sizing: border-box;

    .ov-chip-label {
      font-size: 20rpx;
      color: var(--ink4);
      margin-bottom: 6rpx;
    }

    .ov-chip-val {
      font-size: 30rpx;
      font-weight: 800;
      color: var(--ink);
    }
  }
}

.ov-body {
  /* 预留底部空间，供绝对定位的 ov-scroll 贴底展示，避免遮挡日历；
     适当加大以拉开日历与底部 chip 托盘的间距 */
  padding-bottom: 90rpx;
}

.summary-stats {
  display: flex;
  padding-top: 24rpx;
  border-top: 2rpx solid rgba(15, 28, 20, 0.06);
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-label {
  font-size: 20rpx;
  color: var(--ink4);
  display: block;
  margin-bottom: 6rpx;
}

.stat-value {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--g4);
}

.ledger-tab {
  position: relative;

  .overview-card {
    position: absolute;
    top: -46rpx;
    left: 44rpx;
    width: 80%;
    height: 350rpx;
    background: radial-gradient(
        120% 90% at 0% 0%,
        rgba(169, 253, 186, 0.534) 0%,
        rgba(194, 242, 200, 0) 55%
      ),
      radial-gradient(
        120% 90% at 100% 0%,
        rgba(149, 238, 167, 0.14) 0%,
        rgba(159, 236, 174, 0) 55%
      ),
      radial-gradient(
        140% 120% at 100% 100%,
        rgba(37, 204, 93, 0.119) 0%,
        rgba(37, 204, 93, 0) 60%
      ),
      linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(253, 255, 253, 0.84));
    border-radius: 32rpx;

    &-btn {
      position: absolute;
      top: -46rpx;
      right: 32rpx;
      border-radius: 32rpx;
      background: var(--g4);
      padding: 10rpx 20rpx;
      border-top-left-radius: 75rpx;
      border-bottom-right-radius: 75rpx;
      transition: 0.2s;
      display: flex;
      justify-content: center;
      align-items: center;
      color: #fff;
      font-size: 24rpx;
    }
  }
}

/* 账本总览切换按钮：取自 uiverse.io KINGFRESS/giant-deer-25 的逐字滑出/滑入 hover 动画，
   作为点击反馈；仅新增动画所需的结构样式，不改变按钮原有外观与页面布局 */
.overview-card-btn {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;

  .span-mother {
    display: flex;
    overflow: hidden;
  }

  .span-mother2 {
    display: flex;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    // 默认（滑入方向）：新文字从上方隐藏
    .swap-ch {
      transform: translateY(-42rpx);
    }
  }

  // 滑出方向：新文字从下方隐藏（静止态）
  &.is-out .span-mother2 .swap-ch {
    transform: translateY(42rpx);
  }

  &.is-swapping {
    // 滑入：当前文字向下退出，新文字从上方滑入
    .span-mother .swap-ch {
      transform: translateY(42rpx);
    }

    .span-mother2 .swap-ch {
      transform: translateY(0);
    }

    // 滑出：当前文字向上退出，新文字从下方滑入（与滑入方向相反）
    &.is-out .span-mother .swap-ch {
      transform: translateY(-42rpx);
    }

    &.is-out .span-mother2 .swap-ch {
      transform: translateY(0);
    }

    // 过渡仅在交换过程中启用，逐字递增形成级联；静止态无过渡，复位时瞬间归位，避免另一层文字回滑露出残影
    .swap-ch:nth-child(1) {
      transition: transform 0.2s;
    }

    .swap-ch:nth-child(2) {
      transition: transform 0.3s;
    }

    .swap-ch:nth-child(3) {
      transition: transform 0.4s;
    }

    .swap-ch:nth-child(4) {
      transition: transform 0.5s;
    }
  }

  .swap-ch {
    display: block;
    height: 42rpx;
    line-height: 42rpx;
    overflow: hidden;
  }
}

// .overview-card {
//   position: relative;
//   margin: 32rpx 32rpx 0;
//   padding: 6rpx;
//   border-radius: 44rpx;
//   overflow: hidden;
//   background:
//     radial-gradient(120% 90% at 0% 0%, rgba(124, 108, 248, 0.16) 0%, rgba(124, 108, 248, 0) 55%),
//     radial-gradient(120% 90% at 100% 0%, rgba(6, 182, 212, 0.14) 0%, rgba(6, 182, 212, 0) 55%),
//     radial-gradient(140% 120% at 100% 100%, rgrgba(37, 204, 93, 0.20) 0%, rgba(37, 204, 93, 0) 60%),
//     linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(242, 252, 242, 0.84));
//   box-shadow:
//     0 10rpx 40rpx rgba(37, 204, 93, 0.12),
//     0 2rpx 10rpx rgba(0, 0, 0, 0.04),
//     inset 0 2rpx 0 rgba(255, 255, 255, 0.9);
// }

.card-1 {
  position: relative;
  padding: 36rpx 36rpx 46rpx 36rpx;
  animation: cardFadeIn 0.55s cubic-bezier(0.22, 0.61, 0.36, 1);
  overflow: hidden;
}

.section-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 36rpx 36rpx 26rpx;
}

.section-title-grp {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.section-icon {
  font-size: 28rpx;
  color: var(--g5);
}

.section-title {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ink);
}

.add-btn {
  /* 参考 Uiverse (mrhyddenn) 暗色按钮风格 */
  position: relative;
  margin: 0;
  padding: 12rpx 24rpx;
  /* 当前尺寸（基于 22rpx 字号） */
  outline: none;
  text-decoration: none;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  border: none;
  text-transform: uppercase;
  background-color: var(--g4);
  /* 背景色 */
  border-radius: 20rpx;
  /* 10px 圆角 */
  color: #fff;
  /* 文字色 */
  font-weight: 500;
  font-size: 22rpx;
  /* 18px */
  font-family: inherit;
  z-index: 0;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.02, 0.01, 0.47, 1);
}

/* hover 时从右下角溢出的白色光晕（::before / ::after 双圆） */
.add-btn::before,
.add-btn::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  width: 90rpx;
  /* 随按钮新尺寸等比缩小（原 100px≈200rpx 已过大） */
  height: 90rpx;
  border-radius: 50%;
  background: #fff;
  opacity: 0;
  transition: transform 0.15s cubic-bezier(0.02, 0.01, 0.47, 1),
    opacity 0.15s cubic-bezier(0.02, 0.01, 0.47, 1);
  z-index: -1;
  transform: translate(100%, -25%);
}

// .add-btn:hover {
//   animation: addBtnShake 0.5s ease-in-out both;       /* 轻微摇摆 */
// }

.add-btn:hover::before,
.add-btn:hover::after {
  opacity: 0.15;
  transition: transform 0.2s cubic-bezier(0.02, 0.01, 0.47, 1),
    opacity 0.2s cubic-bezier(0.02, 0.01, 0.47, 1);
}

.add-btn:hover::before {
  transform: translate(50%, 0) scale(0.9);
}

.add-btn:hover::after {
  transform: translate(50%, 0) scale(1.1);
}

@keyframes addBtnShake {
  0% {
    transform: rotate(0deg) translate3d(0, 0, 0);
  }

  25% {
    transform: rotate(7deg) translate3d(0, 0, 0);
  }

  50% {
    transform: rotate(-7deg) translate3d(0, 0, 0);
  }

  75% {
    transform: rotate(1deg) translate3d(0, 0, 0);
  }

  100% {
    transform: rotate(0deg) translate3d(0, 0, 0);
  }
}

/* 标题栏右侧操作组：新增账本 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.card-item {
  animation: cardFadeIn 0.65s cubic-bezier(0.22, 0.61, 0.36, 1) backwards;

  &:nth-child(2) {
    animation-delay: 0.1s;
  }

  &:nth-child(3) {
    animation-delay: 0.2s;
  }

  &:nth-child(4) {
    animation-delay: 0.3s;
  }
}

/* 账本列表布局（列表模式） */
.ledger-list.is-list {
  margin-top: 20rpx;
}

.ledger-list .ledger-card {
  /* 边距/内边距平滑过渡 */
  transition: margin 0.3s ease, padding 0.3s ease, border-radius 0.3s ease;
}

/* 列表态外层包裹：仅作定位上下文（position:relative，无 z-index → 不形成层叠上下文），
   供内部 .ledger-card-bg（绿色层叠背景）绝对定位。
   卡片用 position:relative 回归常规流，使 wrap 获得正确高度、多卡纵向排列不重叠。 */
.ledger-list.is-list .ledger-card-wrap {
  position: relative;
}

/* 绿色层叠背景：绝对定位于 wrap 内、卡片之下（z-index:0）。
   四周比卡片各探出 8rpx（左右/底部），形成"卡片下垫一层圆角矩形"的层叠视觉。 */
.ledger-list.is-list .ledger-card-bg {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  top: 8rpx;
  bottom: -8rpx;
  background: linear-gradient(to right, var(--g1) 0%, var(--g1) 80%, var(--g0) 100%);
  border-radius: 28rpx;
  z-index: 0;
  box-shadow: 0 12rpx 30rpx rgba(74, 222, 128, 0.18);
  height: 150rpx;
}

/* 列表态：卡片（毛玻璃）视觉，背景为 Uiverse(Smit-Prajapati) 白色半透明叠加层 + blur。
   回归常规流（position:relative）使 wrap 获得正确高度，多张卡片纵向排列且不重叠；
   z-index:1 确保压在绿色背景之上。
   采用两栏布局：左图标 + 右内容栏（信息/余额/操作 + 进度条）。 */
.ledger-list.is-list .ledger-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
  margin: 0 32rpx 40rpx;
  padding: 28rpx 32rpx;
  background: linear-gradient(135deg, #e6f8ed 0%, #ffffff 27%);
  border: 2rpx solid rgba(214, 233, 222, 0.9);
  border-radius: 28rpx;
  /* 仿 Uiverse neu-button：内陷（inset）双阴影，营造软 UI 浮雕 */
  box-shadow: inset 6rpx 6rpx 12rpx rgba(206, 232, 218, 0.3),
    inset -6rpx -6rpx 12rpx rgba(255, 255, 255, 0.6);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

/* 列表态：neu 按压态（仿 Uiverse neu-button hover/focus：内陷+外凸浮雕） */
.ledger-list.is-list .ledger-card--pressed,
.ledger-list.is-list .ledger-card:active {
  box-shadow: inset 3rpx 3rpx 6rpx rgba(206, 232, 218, 0.3),
    inset -3rpx -3rpx 6rpx rgba(255, 255, 255, 0.6),
    3rpx 3rpx 6rpx rgba(206, 232, 218, 0.27), -3rpx -3rpx 6rpx rgba(255, 255, 255, 0.6);
  transform: scale(0.99);
}

/* 列表态：封面图作为左侧封面块，高度拉伸至与右侧内容栏（.ledger-body）完全一致，
   去掉固定高度 + align-self:stretch 使其填满卡片交叉轴高度；aspectFill 裁切填满不变形 */
.ledger-list.is-list .ledger-cover {
  position: relative;
  display: block;
  width: 120rpx;
  height: 160rpx;
  flex-shrink: 0;
  border-radius: 18rpx;
  overflow: hidden;
}

/* 列表态：右侧内容栏，纵向排列行（信息/余额/操作）与进度条 */
.ledger-list.is-list .ledger-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 列表态：封面图固定在最左，作为不被压缩的左侧缩略图（尺寸同上） */

/* 列表态：行内元素两端对齐——账本名居左、收支靠右（右侧留出空间以免被⋯按钮遮挡） */
.ledger-list.is-list .ledger-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  padding-top: 16rpx;
}

/* 列表态：info 不占满整行，并用 margin-right:auto 把名称顶到最左、收支/操作推到最右 */
.ledger-list.is-list .ledger-info {
  flex: 0 0 auto;
  margin-right: auto;
  min-width: 0;
}

/* 列表态：进度条容器（承载右上角"使用/限额"标签）与上方行保持间距 */
.ledger-list.is-list .ledger-bar-wrap {
  position: relative;
  margin-top: 40rpx;
  /* 标签行与进度条改为正常文档流，用 flex 列 + gap 控制间距，响应式稳定、两端对齐不变 */
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* 账本列表独立滚动容器：
   - max-height 仅在内容超出时生效，数据较少时高度自适应（内容高度），不预留固定空白，布局自然紧凑；
   - 配合外层 page-scroll，账本过多时仅列表纵向滚动，顶部总览与标题保持稳固；
   - enhanced + 隐藏滚动条提升滚动流畅度与视觉整洁 */
.ledger-list-scroll {
  width: 100%;
  -webkit-overflow-scrolling: touch;
}

.ledger-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.ledger-icon {
  width: 80rpx;
  height: 120rpx;
  border-radius: 24rpx;
  @include sj-flex-center;
  flex-shrink: 0;
  font-size: 36rpx;
}

.ledger-info {
  flex: 1;
  min-width: 0;
}

.ledger-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.ledger-name {
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.2;
  color: var(--ink);
}

.ledger-type {
  font-size: 18rpx;
  line-height: 1;
  padding: 4rpx 12rpx;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;

  &.master {
    background: linear-gradient(135deg, var(--g4) 0%, var(--g5));
    color: #fff;
  }
  &.sub {
    background: rgba(124, 108, 248, 0.1);
    color: #7c6cf8;
  }
}

.ledger-meta {
  font-size: 22rpx;
  color: var(--ink4);
  display: block;
  margin-top: 8rpx;
}

.ledger-balance {
  text-align: right;
  // flex-shrink: 0;
}

.balance-num {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--ink);
  display: block;
  // line-height: 1;
}

.balance-sub {
  display: block;
  font-size: 22rpx;
  color: var(--ink4);
  line-height: 1;
  margin-top: 8rpx;
}

/* 余额区：收入(绿) / 支出(红) 配色，与顶部汇总芯片保持一致 */
.ledger-balance .inc {
  color: var(--ink);
}

.ledger-balance .exp {
  color: var(--g5);
}

.ledger-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-left: 16rpx;
  flex-shrink: 0;
}

.ledger-act {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  @include sj-flex-center;
  cursor: pointer;
  font-size: 26rpx;

  &-hover {
    background: rgba(37, 204, 93, 0.12);
  }

  &.ledger-act-del {
    background: rgba(255, 240, 240, 0.75);
  }

  &.ledger-act-del.ledger-act-hover {
    background: rgba(255, 99, 99, 0.14);
  }
}

/* 操作入口：右上角「⋯」更多按钮（点击或长按卡片展开菜单），紧贴卡片右上角 */
.ledger-more-float {
  position: absolute;
  top: -30rpx;
  right: 0;
  z-index: 4;
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 外缘（上、右）贴齐卡片直角，内下角柔化；右上圆角对齐卡片 28rpx 圆角 */
  border-radius: 16rpx;
  background: linear-gradient(135deg, #e6f8ed 0%, #ffffff 27%);
  /* neu 内凹（反向浮雕）：顶部阴影 / 底部高光，与原外凸完全反转；尺寸、圆角、模糊、透明度保持一致 */
  box-shadow: inset 4rpx 4rpx 8rpx rgba(206, 232, 218, 0.3),
    inset -4rpx -4rpx 8rpx rgba(255, 255, 255, 0.6);
}

.ledger-more-hover {
  background: linear-gradient(135deg, #e6f8ed 0%, #ffffff 45%);
  /* neu 反向：按压时外凸弹出，与原「按压内陷」相反 */
  box-shadow: 4rpx 4rpx 8rpx rgba(206, 232, 218, 0.3),
    -4rpx -4rpx 8rpx rgba(255, 255, 255, 0.6);
}

.ledger-more-dot {
  font-size: 28rpx;
  color: #2b3a2f;
}

/* 操作形态：覆盖账本内容的半透明遮罩，正中居中 tabs 操作按钮（仿 Uiverse tabs+glider） */
.ledger-action {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
  overflow: hidden;
  /* 遮罩：半透明压暗 + 模糊账本内容 */
  background: rgba(255, 255, 255, 0.32);
  backdrop-filter: blur(6rpx);
  -webkit-backdrop-filter: blur(6rpx);
}

/* 仿 Uiverse tabs 容器 */
.tabs {
  display: flex;
  position: relative;
  background-color: #fff;
  box-shadow: 0 0 2rpx 0 rgba(24, 94, 224, 0.15), 0 12rpx 24rpx 0 rgba(24, 94, 224, 0.15);
  padding: 5rpx;
  border-radius: 12rpx;
}

.tab {
  z-index: 2;
}

.tab {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60rpx;
  width: 140rpx;
  font-size: 26rpx;
  color: #2b3a2f;
  font-weight: 500;
  border-radius: 99rpx;
  cursor: pointer;
  transition: color 0.15s ease-in;
}

.tab.active {
  color: var(--g5);
}

/* 仿 notification 徽标（放在编辑 tab 上） */
.notification {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22rpx;
  padding: 0 8rpx;
  position: absolute;
  top: -16rpx;
  right: 12rpx;
  font-size: 18rpx;
  border-radius: 8rpx;
  background-color: #e6f5ea;
  color: var(--g5);
  transition: 0.15s ease-in;
}

.tab.active .notification {
  background-color: var(--g5);
  color: #fff;
}

/* glider 滑块 */
.glider {
  position: absolute;
  display: flex;
  height: 60rpx;
  width: 140rpx;
  background-color: var(--g0);
  z-index: 1;
  border-radius: 8rpx;
  transition: 0.15s ease-out;
  transform: translateX(100%);
}

.glider.gl-left {
  transform: translateX(0);
}

.glider.gl-right {
  transform: translateX(100%);
}

/* 进度条：参照 Uiverse.io(FColombati) kawaii 风格
   白色描边胶囊 + 糖果波点纹理 + 底部暗边；填充末端带可爱圆帽。
   核心功能（按 l.pct 百分比填充）不变，仅重构视觉呈现。 */
.ledger-bar {
  --light: color-mix(in sRGB, var(--base) 35%, #fff);
  --dark: color-mix(in sRGB, var(--base) 90%, #000);
  --transparent: transparent;
  position: relative;
  height: 12rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.85) 2rpx, transparent 3rpx) 0
      0 / 22rpx 22rpx,
    linear-gradient(transparent 70%, var(--dark) 100%), var(--light);
  /* 间距由 wrap 的 flex gap 控制；浮雕：未走过部分的浅浮雕（暗部薄荷 / 亮部纯白），与页面半浮雕风格一致；填充部分会盖住已走区域，仅未走部分显浮雕 */
  box-shadow: inset 2rpx 2rpx 4rpx rgba(206, 232, 218, 0.35),
    inset -2rpx -2rpx 4rpx rgba(255, 255, 255, 0.65);
}

/* 进度条上方的"使用/限额"标签行：左右两端对齐，随维度切换文案；回归正常流，间距由 wrap 的 gap 控制 */
.ledger-bar-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
  min-width: 0;
  font-size: 22rpx;
  color: var(--ink4);
  white-space: nowrap;
}

.ledger-bar-label.is-over {
  color: var(--red-soft);
}

.ledger-bar-label .bar-dim {
  color: var(--ink4);
  font-weight: 600;
  font-size: 22rpx;
}

.ledger-bar-label .bar-val {
  color: var(--ink3);
  font-weight: 600;
}

.ledger-bar-fill {
  position: relative;
  height: 100%;
  border-radius: 0 18rpx 18rpx 0;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.85) 2rpx, transparent 3rpx) 0
      0 / 22rpx 22rpx,
    linear-gradient(
      90deg,
      color-mix(in sRGB, var(--base) 80%, #fff),
      var(--transparent) 24rpx
    ),
    linear-gradient(transparent 82%, var(--dark) 100%),
    color-mix(in sRGB, var(--base) 60%, #fff);
  transition: width 0.6s ease;
}

.ledger-bar-fill.is-over {
  background: linear-gradient(90deg, var(--red-soft), #ff9b9b);
}

/* 填充末端的 kawaii 圆帽：糖果头 + 探出的小脚，模拟滑块 thumb */
.ledger-bar-fill::after {
  content: "";
  position: absolute;
  right: -12rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: radial-gradient(
      circle at 8rpx 9rpx,
      rgba(255, 255, 255, 0.9) 2rpx,
      transparent 3rpx
    ),
    var(--base);
  box-shadow: inset -5rpx 0 5rpx -2rpx var(--base), 4rpx 6rpx 0 -3rpx var(--base),
    9rpx 6rpx 0 -3rpx var(--base), 14rpx 6rpx 0 -3rpx var(--base);
}

.asset-mode-bar {
  display: flex;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 28rpx;
  padding: 6rpx;
}

.asset-mode-btn {
  flex: 1;
  padding: 16rpx;
  border-radius: 24rpx;
  text-align: center;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--ink3);
  cursor: pointer;

  &.active {
    @include sj-brand-gradient;
    color: #fff;
  }
}

.asset-total-label {
  font-size: 22rpx;
  color: var(--ink4);
  display: block;
}

.asset-total-num {
  font-size: 72rpx;
  font-weight: 900;
  display: block;
  margin-top: 8rpx;
}

.asset-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.asset-icon-box {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  @include sj-flex-center;
  flex-shrink: 0;
  font-size: 32rpx;
}

.asset-info {
  flex: 1;
}

.asset-name {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--ink);
  display: block;
}

.asset-type {
  font-size: 20rpx;
  color: var(--ink4);
}

.asset-balance {
  font-size: 30rpx;
  font-weight: 700;
}

.chart-title {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ink);
  display: block;
  margin-bottom: 32rpx;
}

.chart-area {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
}

.chart-col {
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  height: 360rpx;
  justify-content: flex-end;
}

.bar-group {
  display: flex;
  gap: 6rpx;
  align-items: flex-end;
  transition: all 0.4s ease;
}

.bar {
  width: 28rpx;
  border-radius: 8rpx 8rpx 0 0;
}

.income-bar {
  @include sj-brand-gradient(0deg);
}

.expense-bar {
  background: linear-gradient(0deg, #fbbf24, var(--amber));
}

.bar-label {
  font-size: 18rpx;
  color: var(--ink4);
  margin-top: 12rpx;
}

.sticker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.sticker-chip {
  width: calc(33.33% - 14rpx);
  border-radius: 28rpx;
  cursor: pointer;
}

/* Sheet */
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
  max-height: 86vh;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 40rpx 40rpx 60rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 1));
  border-radius: 48rpx 48rpx 0 0;
}

.sheet-handle {
  @include sj-flex-center;
  margin-bottom: 32rpx;
}

.handle-bar {
  width: 100rpx;
  height: 16rpx;
  border-radius: 12rpx;
  background: linear-gradient(180deg, var(--g4) 0%, var(--g3) 40%, #ffffff 100%);
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--ink);
  display: block;
  margin-bottom: 28rpx;
}

/* 通用渐变：薄荷色 -> 白色，输入框与封面框共用 */
$coverGrad: linear-gradient(135deg, rgba(242, 252, 242, 0.4) 0%, #ffffff 50%);

.sheet-input {
  width: 100%;
  height: 88rpx;
  box-sizing: border-box;
  border-radius: 28rpx;
  background: $coverGrad;
  border: 2rpx solid rgba(194, 242, 200, 0.4);
  padding: 0 28rpx;
  font-size: 28rpx;
  margin-bottom: 32rpx;
  outline: none;
  /* 仅过渡颜色与阴影，避免 border 宽度变化触发布局重排导致抖动 */
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &.focused {
    border-color: rgba(37, 204, 93, 0.9);
    box-shadow: 0 0 0 4rpx rgba(37, 204, 93, 0.12);
  }
}

/* 表单分区标签 */
.form-label {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ink2);
  margin: 12rpx 0 16rpx;
}

/* 主题色（自定义取色） */
.color-opts {
  display: flex;
  gap: 20rpx;
  margin-bottom: 8rpx;
}

.color-opt {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 16rpx 0;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.55);
  border: 3rpx solid rgba(255, 255, 255, 1);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.color-opt.active {
  border-color: var(--g5);
  background: var(--g1);
}

.color-opt-ico {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  @include sj-flex-center;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.12);
}

.color-opt-img {
  width: 100%;
  height: 100%;
}

.color-opt-auto {
  font-size: 28rpx;
  font-weight: 800;
  color: #fff;
  background: var(--g5);
  width: 100%;
  height: 100%;
  @include sj-flex-center;
}

.color-opt-plus {
  font-size: 40rpx;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}

.color-opt-label {
  font-size: 22rpx;
  color: var(--ink3);
  font-weight: 600;
}

/* 自动取色色板：提取出的代表色卡，点选可微调主题色 */
.auto-palette {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 12rpx;
  margin: 14rpx 0 4rpx;
}
.auto-swatch {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.12);
  cursor: pointer;
  border: 3rpx solid transparent;
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.auto-swatch.active {
  border-color: var(--ink);
  transform: scale(1.08);
}

/* 列表底部留白：高度覆盖固定 TabBar（含安全区），保证最后一项完整可见 */
.list-bottom-gap {
  width: 100%;
  height: calc(env(safe-area-inset-bottom) + 130rpx);
}

/* 自定义颜色选择器弹窗 */
.cp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  @include sj-flex-center;
  z-index: 1000;
}

.cp-panel {
  width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-sizing: border-box;
}

.cp-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 24rpx;
  display: block;
}

.cp-sv {
  position: relative;
  width: 100%;
  height: 320rpx;
  border-radius: 16rpx;
  overflow: hidden;
  touch-action: none;
}

.cp-sv-cursor {
  position: absolute;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  box-shadow: 0 0 0 1rpx rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.cp-hue {
  position: relative;
  width: 100%;
  height: 28rpx;
  border-radius: 14rpx;
  margin: 28rpx 0;
  overflow: visible;
  touch-action: none;
}

.cp-hue-cursor {
  position: absolute;
  top: 50%;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  background: transparent;
  box-shadow: 0 0 0 1rpx rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.cp-preview {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.cp-preview-dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(0, 0, 0, 0.1);
}

.cp-hex {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink2);
  letter-spacing: 1rpx;
}

.cp-actions {
  display: flex;
  gap: 20rpx;
}

.cp-cancel,
.cp-confirm {
  flex: 1 1 0;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 700;
  cursor: pointer;
}

.cp-cancel {
  background: rgba(0, 0, 0, 0.05);
  color: var(--ink3);
}

.cp-confirm {
  background: var(--g5);
  color: #fff;
}

/* 封面 + 系统默认图：左右横向布局 */
.cover-icon-row {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 8rpx;
}

.cover-col {
  flex: 0 0 240rpx;
  min-width: 0;
}

.icon-col {
  flex: 1 1 auto;
  min-width: 0;
}

/* 封面：图片上传 + 预览（3:4 比例，左列展示） */
.cover-upload {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 28rpx;
  background: $coverGrad;
  border: 2rpx dashed rgba(194, 242, 200, 0.7);
  @include sj-flex-center;
  overflow: hidden;
  margin-bottom: 0;
  cursor: pointer;
  /* 点击/按下动效：过渡曲线与时长与输入框一致 */
  transition: all 0.1s cubic-bezier(0.19, 1, 0.22, 1);

  &.pressed {
    transform: scale(0.95);
    border: 2rpx solid rgba(194, 242, 200, 1);
  }
}

.cover-img {
  width: 100%;
  height: 100%;
}

.cover-placeholder {
  @include sj-flex-center;
  flex-direction: column;
  gap: 8rpx;
  position: relative;
  z-index: 1;
}

.cover-plus {
  font-size: 56rpx;
  color: var(--g4);
  line-height: 1;
}

.cover-tip {
  font-size: 24rpx;
  color: var(--g5);
}

.cover-remove {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 36rpx;
  line-height: 48rpx;
  text-align: center;
  z-index: 2;
}

/* 简介：多行文本 */
.sheet-textarea {
  width: 100%;
  height: 160rpx;
  border-radius: 28rpx;
  background: $coverGrad;
  border: 2rpx solid rgba(194, 242, 200, 0.4);
  padding: 20rpx 28rpx;
  font-size: 28rpx;
  margin-bottom: 32rpx;
  box-sizing: border-box;
  outline: none;
  /* 仅过渡颜色与阴影，避免 border 宽度变化触发布局重排导致抖动 */
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &.focused {
    border-color: rgba(37, 204, 93, 0.9);
    box-shadow: 0 0 0 4rpx rgba(37, 204, 93, 0.12);
  }
}

/* 图片裁剪弹窗 */
.crop-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 400;
  @include sj-flex-center;
  padding: 40rpx;
  box-sizing: border-box;
}

.crop-panel {
  width: 100%;
  max-width: 680rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 32rpx;
  box-sizing: border-box;
}

.crop-head {
  font-size: 30rpx;
  font-weight: 800;
  color: var(--ink);
  text-align: center;
  margin-bottom: 24rpx;
}

.crop-stage {
  position: relative;
  overflow: hidden;
  // background: #111;
  margin: 0 auto;
  border-radius: 12rpx;
  touch-action: none;
}

.crop-img {
  position: absolute;
}

.crop-box {
  position: absolute;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
  border: 2rpx solid #fff;
  box-sizing: border-box;
  pointer-events: none;
}

.crop-grid {
  width: calc(100% - 24rpx);
  height: calc(100% - 24rpx);
  /* 九宫格参考线：在 1/3、2/3 处显式绘制，不依赖平铺，保证严格居中对称 */
  background-image: linear-gradient(
      90deg,
      transparent 33.33%,
      rgba(255, 255, 255, 0.45) 33.33%,
      rgba(255, 255, 255, 0.45) 34%,
      transparent 34%
    ),
    linear-gradient(
      90deg,
      transparent 66.66%,
      rgba(255, 255, 255, 0.45) 66.66%,
      rgba(255, 255, 255, 0.45) 67.33%,
      transparent 67.33%
    ),
    linear-gradient(
      180deg,
      transparent 33.33%,
      rgba(255, 255, 255, 0.45) 33.33%,
      rgba(255, 255, 255, 0.45) 34%,
      transparent 34%
    ),
    linear-gradient(
      180deg,
      transparent 66.66%,
      rgba(255, 255, 255, 0.45) 66.66%,
      rgba(255, 255, 255, 0.45) 67.33%,
      transparent 67.33%
    );
  background-repeat: no-repeat;
  background-size: 100% 100%;
}

.crop-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.crop-row-label {
  font-size: 26rpx;
  color: var(--ink2);
  flex: 0 0 auto;
  width: 72rpx;
}

/* 比例选择弹窗 */
.ratio-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.ratio-panel {
  width: 600rpx;
  max-width: 92vw;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-sizing: border-box;
}
.ratio-row {
  display: flex;
  gap: 28rpx;
  margin: 28rpx 0;
}
.ratio-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 0;
  border-radius: 16rpx;
  // background: var(--g0);
  transition: transform 0.12s ease;
}
.ratio-card:active {
  transform: scale(0.96);
}
.ratio-thumb {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 12rpx;
  background: #eef6f0;
}
/* 两种比例缩略图容器：3:4 与 4:3，统一宽度、按高度差异呈现形态差异 */
/* 两种比例缩略图：用 aspect-ratio 保证视觉比例正确（3:4 竖长、4:3 横扁） */
.ratio-34 {
  aspect-ratio: 3 / 4;
  height: auto;
}
.ratio-43 {
  aspect-ratio: 4 / 3;
  height: auto;
}
.ratio-thumb-img {
  width: 100%;
  height: 100%;
}
.ratio-label {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink2);
}
.ratio-done {
  position: absolute;
  right: 8rpx;
  bottom: 8rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: var(--g5);
  color: #fff;
  font-size: 24rpx;
  line-height: 36rpx;
  text-align: center;
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.2);
}
.ratio-tip {
  text-align: center;
  font-size: 24rpx;
  color: var(--ink3);
  margin-bottom: 8rpx;
}
.crop-btn.disabled {
  opacity: 0.45;
  pointer-events: none;
}

/* 裁剪框四角手柄（手势在 stage 层按落点 proximity 识别，此处仅视觉） */
.crop-handle {
  position: absolute;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: #fff;
  border: 3rpx solid var(--g5);
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.25);
}
.crop-handle.tl {
  left: -14rpx;
  top: -14rpx;
}
.crop-handle.tr {
  right: -14rpx;
  top: -14rpx;
}
.crop-handle.bl {
  left: -14rpx;
  bottom: -14rpx;
}
.crop-handle.br {
  right: -14rpx;
  bottom: -14rpx;
}

.crop-prev {
  width: 96px;
  height: 128px;
  border-radius: 8rpx;
  overflow: hidden;
  // background: #eee;
  border: 2rpx solid var(--g2);
  position: relative;
  flex: 0 0 auto;
}

.crop-prev-img {
  position: absolute;
}

.crop-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 8rpx;
}

.crop-btn {
  flex: 1;
  text-align: center;
  padding: 24rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.crop-cancel {
  background: var(--g0);
  color: var(--ink3);
}

.crop-ok {
  @include sj-brand-gradient;
  color: #fff;
}

.crop-export-canvas {
  position: fixed;
  left: -9999px;
  top: 0;
  width: 600px;
  height: 800px;
}

.sheet-btn {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 28rpx;
  border-radius: 28rpx;
  /* 未填写时：透明背景 + 品牌绿边框，仅显示边框颜色 */
  background: transparent;
  border: 2rpx solid var(--g4);
  font-size: 28rpx;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.4s ease;

  /* 底层：品牌绿文字，始终可见（透明底上清晰） */
  &__base {
    position: relative;
    z-index: 1;
    color: var(--g5);
  }

  /* 顶层白字层：覆盖整个按钮，文字绝对居中、位置固定不参与动画；
     仅用 clip-path 斜切窗口"揭示"白字，窗口随 --fill 移动，文字本身不动。 */
  &__fill {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    -webkit-clip-path: polygon(
      0 0,
      calc(var(--fill, 0) * 100%) 0,
      calc(var(--fill, 0) * 100% - 40rpx * (1 - var(--fill, 0))) 100%,
      0 100%
    );
    clip-path: polygon(
      0 0,
      calc(var(--fill, 0) * 100%) 0,
      calc(var(--fill, 0) * 100% - 40rpx * (1 - var(--fill, 0))) 100%,
      0 100%
    );
    transition: clip-path 0.6s cubic-bezier(0.19, 1, 0.22, 1);

    &-txt {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
  }

  /* 进度填充：斜切纯色，与白字窗口形状完全一致，宽度跟随 --fill；
     只移动斜切窗口（背景），文字层不动。 */
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: var(--g5);
    -webkit-clip-path: polygon(
      0 0,
      calc(var(--fill, 0) * 100%) 0,
      calc(var(--fill, 0) * 100% - 40rpx * (1 - var(--fill, 0))) 100%,
      0 100%
    );
    clip-path: polygon(
      0 0,
      calc(var(--fill, 0) * 100%) 0,
      calc(var(--fill, 0) * 100% - 40rpx * (1 - var(--fill, 0))) 100%,
      0 100%
    );
    z-index: 0;
    transition: clip-path 0.6s cubic-bezier(0.19, 1, 0.22, 1);
  }

  &:active {
    transform: scale(0.97);
  }

  /* 完全填满（fill=1）：去掉右下角斜切尾，整块铺满不留缺口。
     完整矩形与斜切多边形顶点数一致，clip-path 可平滑过渡。 */
  &.is-full {
    &::before,
    &__fill {
      -webkit-clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
      clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
    }
  }
}

/* 编辑弹窗"保存"按钮：浮雕液态填充（未填充 / 部分 / 完全 三阶段） */
.sheet-btn--emboss {
  /* 重置继承自 .sheet-btn 的斜切填充伪元素，避免干扰浮雕效果 */
  &::before {
    display: none;
    content: none;
  }
  /* 基底：浅薄荷渐变 + 品牌绿边框，作浮雕底衬（覆盖 .sheet-btn 的透明底） */
  background: linear-gradient(135deg, rgba(242, 252, 242, 0.6) 0%, #ffffff 60%);
  border-color: var(--g4);
  min-height: 84rpx;
  overflow: hidden;

  /* 浮雕基底层：双向内凹阴影 + 点状纹理，未填充时清晰突出于表面 */
  .emboss-base {
    position: absolute;
    inset: 0;
    z-index: 0;
    background-image: radial-gradient(
      circle,
      rgba(37, 204, 93, 0.22) 1.5rpx,
      transparent 2rpx
    );
    background-size: 18rpx 18rpx;
    background-position: 0 0;
    box-shadow: inset 3rpx 3rpx 7rpx rgba(255, 255, 255, 0.95),
      inset -3rpx -3rpx 7rpx rgba(160, 224, 178, 0.85);
  }

  /* 液体填充层：高度随 --fill 从底部升起，淹没浮雕；完全填充时铺满、表面平滑 */
  .emboss-liquid {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: calc(var(--fill, 0) * 100%);
    z-index: 1;
    background: linear-gradient(
      180deg,
      var(--g5),
      color-mix(in sRGB, var(--g5) 78%, #0a86a0)
    );
    /* 仅底部加暗内阴影给液体体积感，避免顶部白边（满填时会顶到按钮上边，否则显"没填满"） */
    box-shadow: inset 0 -10rpx 18rpx rgba(0, 0, 0, 0.12);
    transition: height 0.6s cubic-bezier(0.22, 1, 0.36, 1);

    /* 液面高光：模拟液体上表面反光，随填充升起；满填时(表面到顶)淡出，去除顶部白边 */
    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 10rpx;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.6), transparent);
      opacity: calc(1 - var(--fill, 0));
      transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1);
    }
  }

  /* 文字层：两层叠放，按 --fill 互补裁切，实现深绿↔白字平滑切换 */
  .emboss-text {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    font-weight: 700;
    pointer-events: none;
  }

  /* 深绿字：仅未淹没区（顶部）可见，随填充被裁掉 */
  .emboss-text--base {
    z-index: 2;
    color: var(--g5);
    -webkit-clip-path: polygon(
      0 0,
      100% 0,
      100% calc((1 - var(--fill, 0)) * 100%),
      0 calc((1 - var(--fill, 0)) * 100%)
    );
    clip-path: polygon(
      0 0,
      100% 0,
      100% calc((1 - var(--fill, 0)) * 100%),
      0 calc((1 - var(--fill, 0)) * 100%)
    );
    transition: clip-path 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* 白字：仅淹没区（底部）可见，随填充显出 */
  .emboss-text--top {
    z-index: 3;
    color: #fff;
    -webkit-clip-path: polygon(
      0 calc((1 - var(--fill, 0)) * 100%),
      100% calc((1 - var(--fill, 0)) * 100%),
      100% 100%,
      0 100%
    );
    clip-path: polygon(
      0 calc((1 - var(--fill, 0)) * 100%),
      100% calc((1 - var(--fill, 0)) * 100%),
      100% 100%,
      0 100%
    );
    transition: clip-path 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }
}

.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.icon-cell {
  width: 110rpx;
  aspect-ratio: 3 / 4;
  border-radius: 24rpx;
  background: rgba(242, 252, 242, 0.8);
  border: 2rpx solid rgba(194, 242, 200, 0.4);
  @include sj-flex-center;
  overflow: hidden;
  cursor: pointer;

  .icon-img {
    width: 100%;
    height: 100%;
  }

  &.active {
    border-color: var(--g5);
    background: rgba(37, 204, 93, 0.12);
  }
}

/* 多选入口按钮 */
.select-btn {
  padding: 12rpx 24rpx;
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.6);
  border: 2rpx solid rgba(137, 229, 156, 0.25);
  font-size: 24rpx;
  font-weight: 700;
  color: var(--g3);
  cursor: pointer;
}

.select-btn.active {
  background: var(--g3);
  color: #fff;
  border-color: var(--g3);
}

/* 多选模式复选框：仿 Uiverse.io (gharsh11032000) radio-button */
.ledger-check {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  align-self: center;
  width: 32rpx;
  height: 32rpx;
  cursor: pointer;
}

.ledger-check-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.ledger-check-custom {
  position: absolute;
  top: 0;
  left: 0;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  border: 2rpx solid var(--g5);
  background: rgba(255, 255, 255, 0.9);
  @include sj-flex-center;
  /* 辉光（无延迟）先亮起；背景填充（延迟 0.2s）随后填入 —— 跨端稳定，避免 keyframes/var 兼容问题 */
  transition: transform 0.3s ease, box-shadow 0.25s ease, background-color 0.3s ease 0.2s,
    border-color 0.3s ease 0.2s;
}

/* 选中态：由 Vue 状态 class 驱动（兼容小程序），先辉光后填充 */
.ledger-check.checked .ledger-check-custom {
  border-color: transparent;
  background-color: var(--g4);
  box-shadow: 0 0 20rpx rgba(37, 204, 93, 0.5);
  /* 选中瞬间辉光脉冲一下（仅动 box-shadow，填充仍由 class 过渡负责，避开 keyframes 填不满的坑） */
  animation: checkPulse 0.5s ease;
  border-radius: 50%;
}

/* 点击选中：绿光由弱到强再回落的脉冲 */
@keyframes checkPulse {
  0% {
    box-shadow: 0 0 6rpx rgba(37, 204, 93, 0.3);
  }

  50% {
    box-shadow: 0 0 30rpx rgba(37, 204, 93, 0.8);
  }

  100% {
    box-shadow: 0 0 20rpx rgba(37, 204, 93, 0.5);
  }
}

/* 底部批量操作栏 */
.batch-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 20rpx 32rpx calc(20rpx + constant(safe-area-inset-bottom));
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 1);
  backdrop-filter: blur(36rpx) saturate(1.3);
  -webkit-backdrop-filter: blur(36rpx) saturate(1.3);
  border-top: 2rpx solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 6rpx 40rpx rgba($sj-brand, 0.1), 0 10rpx 16rpx rgba(0, 0, 0, 0.1),
    inset 0 2rpx 0 rgba(255, 255, 255, 0.94);
  border-radius: 24rpx 24rpx 0 0;
}

.batch-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.batch-count {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--ink);
}

.batch-hint {
  font-size: 20rpx;
  color: var(--ink4);
  margin-top: 2rpx;
}

.batch-actions {
  display: flex;
  gap: 16rpx;
  flex-shrink: 0;
}

.batch-btn {
  height: 72rpx;
  padding: 0 32rpx;
  border-radius: 16rpx;
  @include sj-flex-center;
  font-size: 26rpx;
  font-weight: 700;
}

.batch-cancel {
  color: var(--ink3);
}

.batch-del {
  background: linear-gradient(135deg, #ff8a8a, #ff6b6b);
  color: #fff;
}

.batch-del.disabled {
  opacity: 0.45;
}

/* 删除确认弹窗 */
.del-panel {
  padding: 0 32rpx 36rpx;
}

.del-list {
  max-height: 360rpx;
  overflow-y: auto;
  margin-bottom: 16rpx;
}

.del-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 2rpx solid rgba(15, 28, 20, 0.05);
}

.del-emoji {
  font-size: 36rpx;
}

.del-name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--ink);
}

.del-tip {
  font-size: 22rpx;
  color: var(--ink4);
  margin-bottom: 20rpx;
}

.del-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.del-btn {
  height: 84rpx;
  border-radius: 16rpx;
  @include sj-flex-center;
  font-size: 28rpx;
  font-weight: 700;
}

.del-transfer {
  background: rgba(37, 204, 93, 0.12);
  color: var(--g5);
}

.del-purge {
  background: linear-gradient(135deg, #ff8a8a, #ff5b5b);
  color: #fff;
}

.del-cancel {
  height: 80rpx;
  @include sj-flex-center;
  margin-top: 8rpx;
  font-size: 28rpx;
  color: var(--ink3);
}
</style>
