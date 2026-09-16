<template>
  <view class="add-record-page" data-cmp="AddRecordPage">
    <!-- 顶部栏 -->
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">{{ pageTitle }}</text>
      <view class="topbar-spacer" />
    </view>

    <!-- 固定顶部：类型 + 金额 + 备注 -->
    <view class="fixed-top">
      <view class="type-switch" :style="{ '--type-index': typeIndex }">
        <view
          class="type-tab"
          :class="{ active: draft.type === 'expense', disabled: editingId }"
          @click="setType('expense')"
          >支出</view
        >
        <view
          class="type-tab"
          :class="{ active: draft.type === 'income', disabled: editingId }"
          @click="setType('income')"
          >收入</view
        >
        <view
          class="type-tab"
          :class="{ active: draft.type === 'refund', disabled: editingId }"
          @click="setType('refund')"
          >退款</view
        >
        <view class="type-indicator" />
      </view>

      <!-- 待：弄个小狗在写的动画，只要不输入就停下，输入就写。 -->
      <!-- 金额卡片 -->
      <view class="amount-card">
        <view class="amount-line1">
          <text class="amount-symbol">¥</text>
          <!-- 点击弹出自定义数字键盘（替代系统键盘） -->
          <number-field
            class="amount-input"
            :class="{ 'is-placeholder': !draft.amount }"
            :model-value="draft.amount"
            placeholder="0.00"
            title="输入金额"
            :decimal-places="2"
            :max-integer="9"
            :style="{ width: inputWidth }"
            @update:model-value="onAmountKeyInput"
          />
          <!-- 隐藏尺子：按当前内容宽度动态决定 input 宽度 -->
          <text class="amount-input-mirror">{{ amountMirrorText }}</text>
        </view>
        <text class="amount-upper" :class="{ placeholder: !amountInChinese }">{{
          amountInChinese || "大写金额"
        }}</text>
        <view class="amount-line3">
          <text class="amount-type" :class="draft.type">{{ typeLabel }}</text>
          <view class="amount-tags">
            <view
              v-for="(t, ti) in draft.tags"
              :key="ti"
              class="amount-tag"
              @click="removeTag(ti)"
            >
              <text class="amount-tag-name">{{ t }}</text>
              <text class="amount-tag-x">×</text>
            </view>
            <input
              v-if="tagEditing"
              class="amount-tag-input"
              v-model="newTag"
              placeholder="标签"
              placeholder-class="amount-tag-ph"
              maxlength="10"
              @confirm="addTag"
              @blur="addTag"
            />
            <view v-else class="amount-tag-add" @click="startTagInput">标签+</view>
          </view>
        </view>
      </view>

      <!-- 底部叠加信息卡：横排药丸（日期 / 账本 / 成员） -->
      <view class="info-card">
        <view class="pill-row">
          <!-- 日期药丸（点击弹日历选择） -->
          <view class="pill pill-date" @click="datePickerShow = true">
            <text class="pill-icon">📅</text>
            <text class="pill-text">{{ draft.dateKey }}</text>
          </view>

          <!-- 账本药丸（点击弹选择弹窗） -->
          <view class="pill pill-date pill-ledger" @click="ledgerPickerShow = true">
            <image
              v-if="ledgerCover"
              class="pill-avatar"
              :src="ledgerCover"
              mode="aspectFill"
            />
            <image
              v-else
              class="pill-avatar"
              :src="cdn('/app_static/images/icon_cover.png')"
              mode="aspectFill"
            />
            <text class="pill-ledger-name">{{ ledgerNameOnly || "选择账本" }}</text>
          </view>

          <!-- 成员药丸（默认显示自己，点击弹出成员多选） -->
          <view class="pill pill-date pill-member" @click="memberPickerShow = true">
            <image
              v-if="selfAvatar"
              class="pill-avatar"
              :src="selfAvatar"
              mode="aspectFill"
            />
            <image
              v-else
              class="pill-avatar"
              :src="cdn('/app_static/images/icon_avatar.png')"
              mode="aspectFit"
            />
            <text class="pill-text">{{ memberPillLabel }}</text>
          </view>
          <text v-if="!members.length" class="pill pill-member disabled">无成员</text>
        </view>
      </view>
    </view>
    <!-- 备注 -->
    <view class="info-note-row">
      <input
        class="info-note-inline"
        v-model="draft.note"
        placeholder="添加备注…"
        placeholder-class="info-note-ph"
        maxlength="200"
      />
    </view>

    <!-- 常驻餐次快捷入口：一步点标签直接进餐次编辑弹窗 -->
    <view v-if="mealEnabled" class="meal-quick-bar">
      <text class="meal-quick-title">🍽️ 餐次</text>
      <scroll-view scroll-x enhanced :show-scrollbar="false" class="meal-quick-scroll">
        <view class="meal-quick-row">
          <view
            v-for="mt in MEAL_TYPES"
            :key="mt.id"
            class="meal-quick-chip"
            :class="{ active: mealEntered && draft.mealType === mt.id }"
            @click="tapMealChip(mt)"
          >
            <text>{{ mt.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 快捷入口：账本分类 / 付款账户 / 餐次与热量 / 还款 -->
    <view class="quick-entries">
      <view
        class="q-entry"
        v-for="(e, i) in quickEntries"
        :key="i"
        @click="openQuickEntry(e.key)"
      >
        <image class="q-thumb" :src="e.icon" mode="aspectFit" />
        <!-- 右侧叠加：上方超出矩形的竖矩形 -->
        <view class="q-tag" :style="{ background: e.tagBg }"></view>
        <!-- 居左大字 -->
        <text class="q-title">{{
          e.key === "category" && selectedCategory ? selectedCategory.name : e.title
        }}</text>
      </view>
    </view>

    <!-- 凭证图片 & 拍照扫描记账（两个独立卡片，自动循环展开动画） -->
    <view class="scan-row">
      <!-- 卡片一：凭证图片 -->
      <view
        class="scan-banner scan-banner--green"
        :class="{ playing: scanPlaying }"
        @click="onScanBannerClick('image')"
      >
        <view class="scan-border"></view>
        <view class="scan-content">
          <view class="scan-main">
            <view class="scan-icon"><text class="scan-icon-emoji">🖼️</text></view>
            <text class="scan-title">凭证图片</text>
          </view>
          <text class="scan-sub">上传 / 添加票据凭证</text>
          <text class="scan-bottom-text">凭证管理</text>
        </view>
      </view>

      <!-- 卡片二：拍照扫描记账 -->
      <view
        class="scan-banner scan-banner--green"
        :class="{ playing: scanPlaying }"
        @click="onScanBannerClick('scan')"
      >
        <view class="scan-border"></view>
        <view class="scan-content">
          <view class="scan-main">
            <view class="scan-icon"><text class="scan-icon-emoji">📷</text></view>
            <text class="scan-title">拍照扫描记账</text>
          </view>
          <text class="scan-sub">拍照自动识别录入</text>
          <text class="scan-bottom-text">AI 智能识别</text>
        </view>
      </view>
    </view>

    <!-- 凭证图片：缩略图网格（点上方“凭证图片”卡片展开；编辑/预填有图时自动显示） -->
    <view v-if="showImageSection" class="image-section">
      <view class="section-label">凭证图片</view>
      <view class="image-row">
        <view v-for="(img, idx) in draft.imageUrls" :key="idx" class="image-thumb">
          <image :src="cloud.display(img)" mode="aspectFill" class="image-thumb-img" />
          <view class="image-remove" @click="removeImage(idx)">×</view>
        </view>
        <view v-if="draft.imageUrls.length < 9" class="image-add" @click="chooseImages">
          <text class="image-add-plus">＋</text>
          <text class="image-add-text">{{ uploading ? "上传中" : "添加" }}</text>
        </view>
      </view>
    </view>

    <!-- 账本选择弹窗 -->
    <view v-if="ledgerPickerShow" class="sheet-mask" @click="ledgerPickerShow = false">
      <view class="sheet" @click.stop>
        <view class="sheet-title">选择账本</view>
        <scroll-view scroll-y enhanced :show-scrollbar="false" class="sheet-scroll">
          <view class="ledger-grid">
            <view
              v-for="l in ledgers"
              :key="l._id"
              class="ledger-card"
              :class="{ active: draft.ledgerId === l._id }"
              @click="onPickLedger(l._id)"
            >
              <view class="ledger-cover-wrap">
                <image
                  class="ledger-cover"
                  :src="
                    ledgerCoverErrors[l._id]
                      ? defaultCoverUrl
                      : ledgerCoverDisplay(l) || defaultCoverUrl
                  "
                  mode="aspectFill"
                  @error="onLedgerCoverError(l)"
                ></image>
                <text v-if="draft.ledgerId === l._id" class="ledger-check">✓</text>
              </view>
              <text class="ledger-card-name">{{ l.name }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="sheet-cancel" @click="ledgerPickerShow = false">取消</view>
      </view>
    </view>

    <!-- 成员多选弹窗 -->
    <view v-if="memberPickerShow" class="sheet-mask" @click="memberPickerShow = false">
      <view class="sheet" @click.stop>
        <view class="sheet-title">选择成员</view>
        <scroll-view scroll-y enhanced :show-scrollbar="false" class="sheet-scroll">
          <view
            v-for="m in members"
            :key="m._id"
            class="sheet-item"
            :class="{ active: draft.memberIds.includes(m._id) }"
            @click="toggleMember(m._id)"
          >
            <image
              v-if="m.avatar"
              class="sheet-item-icon"
              :src="m.avatar"
              mode="aspectFill"
            />
            <image
              v-else
              class="sheet-item-icon"
              :src="cdn('/app_static/images/icon_avatar.png')"
              mode="aspectFit"
            />
            <text class="sheet-item-name"
              >{{ m.name }}{{ m.is_self ? "（自己）" : "" }}</text
            >
            <text v-if="draft.memberIds.includes(m._id)" class="sheet-item-check">✓</text>
          </view>
        </scroll-view>
        <view class="sheet-cancel" @click="memberPickerShow = false">完成</view>
      </view>
    </view>

    <!-- 日期日历弹窗 -->
    <view v-if="datePickerShow" class="sheet-mask" @click="datePickerShow = false">
      <view class="sheet" @click.stop>
        <view class="sheet-title">选择日期</view>
        <calendar-period-picker
          dim="day"
          :model-value="draft.dateKey"
          @change="onDateChange"
        />
        <view class="sheet-cancel" @click="datePickerShow = false">取消</view>
      </view>
    </view>

    <!-- 快捷入口弹框：选择账本分类 -->
    <view v-if="quickPopup === 'category'" class="sheet-mask" @click="closeQuickPopup">
      <view class="sheet" @click.stop>
        <view class="sheet-title">选择账本分类</view>
        <swiper
          class="cat-swiper"
          :current="activePage"
          @change="onPageChange"
          :duration="250"
        >
          <swiper-item v-for="(page, pi) in pagedCats" :key="pi">
            <scroll-view scroll-y enhanced :show-scrollbar="false" class="cat-scroll">
              <view class="cat-grid">
                <view
                  v-for="c in page.cats"
                  :key="c._id"
                  class="cat-chip"
                  :class="{ active: draft.categoryId === c._id }"
                  @click="
                    draft.categoryId = c._id;
                    closeQuickPopup();
                  "
                >
                  <text class="cat-emoji">{{ c.icon }}</text>
                  <text class="cat-name">{{ c.name }}</text>
                </view>
              </view>
            </scroll-view>
          </swiper-item>
        </swiper>
        <view class="page-dots">
          <view
            v-for="(page, pi) in pagedCats"
            :key="pi"
            class="dot"
            :class="{ active: activePage === pi }"
            @click="activePage = pi"
          />
        </view>
        <view v-if="!pagedCats.length" class="empty-hint">暂无分类</view>
        <view class="sheet-cancel" @click="closeQuickPopup">取消</view>
      </view>
    </view>

    <!-- 快捷入口弹框：付款账户 -->
    <view v-if="quickPopup === 'account'" class="sheet-mask" @click="closeQuickPopup">
      <view class="sheet" @click.stop>
        <view class="sheet-title">付款账户（可选）</view>
        <scroll-view scroll-y enhanced :show-scrollbar="false" class="sheet-scroll">
          <view
            class="sheet-item"
            :class="{ active: !draft.accountId }"
            @click="
              draft.accountId = '';
              closeQuickPopup();
            "
          >
            <text class="sheet-item-name">不关联</text>
            <text v-if="!draft.accountId" class="sheet-item-check">✓</text>
          </view>
          <view class="section-label">日常账户</view>
          <view
            v-for="acc in dailyAccounts"
            :key="acc._id"
            class="sheet-item"
            :class="{ active: draft.accountId === acc._id }"
            @click="
              draft.accountId = acc._id;
              closeQuickPopup();
            "
          >
            <image class="sheet-item-icon" :src="acc.icon" mode="aspectFit" />
            <text class="sheet-item-name">{{ acc.name }}</text>
            <text v-if="draft.accountId === acc._id" class="sheet-item-check">✓</text>
          </view>
          <template v-if="liabilityAccounts.length">
            <view class="section-label">负债账户（刷卡消费·欠款增加）</view>
            <view
              v-for="acc in liabilityAccounts"
              :key="acc._id"
              class="sheet-item liability"
              :class="{ active: draft.accountId === acc._id }"
              @click="
                draft.accountId = acc._id;
                closeQuickPopup();
              "
            >
              <image class="sheet-item-icon" :src="acc.icon" mode="aspectFit" />
              <text class="sheet-item-name">{{ acc.name }}</text>
              <text class="sheet-item-sub">欠 {{ fenToYuanString(acc.balance) }}</text>
              <text v-if="draft.accountId === acc._id" class="sheet-item-check">✓</text>
            </view>
          </template>
        </scroll-view>
        <view class="sheet-cancel" @click="closeQuickPopup">取消</view>
      </view>
    </view>

    <!-- 快捷入口弹框：还款（日常账户 -> 负债账户，转账减欠款） -->
    <view v-if="quickPopup === 'repay'" class="sheet-mask" @click="closeQuickPopup">
      <view class="sheet" @click.stop>
        <view class="sheet-title">还款（日常账户 → 负债账户）</view>
        <view class="repay-amount-row">
          <text class="repay-amount-symbol">¥</text>
          <input
            class="repay-amount-input"
            type="digit"
            v-model="repayAmount"
            placeholder="0.00"
            placeholder-class="repay-amount-ph"
          />
        </view>
        <scroll-view scroll-y enhanced :show-scrollbar="false" class="sheet-scroll">
          <view class="section-label">从（付款日常账户）</view>
          <view
            v-for="acc in dailyAccounts"
            :key="acc._id"
            class="sheet-item"
            :class="{ active: repayFromId === acc._id }"
            @click="repayFromId = acc._id"
          >
            <image class="sheet-item-icon" :src="acc.icon" mode="aspectFit" />
            <text class="sheet-item-name">{{ acc.name }}</text>
            <text v-if="repayFromId === acc._id" class="sheet-item-check">✓</text>
          </view>
          <view class="section-label">还到（负债账户）</view>
          <view
            v-for="acc in liabilityAccounts"
            :key="acc._id"
            class="sheet-item liability"
            :class="{ active: repayToId === acc._id }"
            @click="repayToId = acc._id"
          >
            <image class="sheet-item-icon" :src="acc.icon" mode="aspectFit" />
            <text class="sheet-item-name">{{ acc.name }}</text>
            <text class="sheet-item-sub">欠 {{ fenToYuanString(acc.balance) }}</text>
            <text v-if="repayToId === acc._id" class="sheet-item-check">✓</text>
          </view>
        </scroll-view>
        <view
          class="sheet-confirm"
          :class="{ disabled: !repayFromId || !repayToId || !repayAmount }"
          @click="submitRepay"
          >确认还款 ¥{{ repayAmount || "0.00" }}</view
        >
        <view class="sheet-cancel" @click="closeQuickPopup">取消</view>
      </view>
    </view>

    <!-- 快捷入口弹框：餐次与热量 -->
    <view
      v-if="quickPopup === 'meal' && isFoodMeal"
      class="sheet-mask"
      @click="closeQuickPopup"
    >
      <view class="sheet" @click.stop>
        <view class="sheet-title">餐次与热量</view>
        <scroll-view scroll-y enhanced :show-scrollbar="false" class="sheet-scroll">
          <view class="section-label">餐次</view>
          <view class="meal-type-row">
            <view
              v-for="mt in MEAL_TYPES"
              :key="mt.id"
              class="meal-type-chip"
              :class="{ active: draft.mealType === mt.id }"
              @click="selectMealType(mt)"
            >
              <text>{{ mt.label }}</text>
            </view>
          </view>

          <view class="section-label">热量录入模式</view>
          <view class="seg-group">
            <view
              class="seg-btn"
              :class="{ active: draft.calorieMode === 'whole' }"
              @click="draft.calorieMode = 'whole'"
              >整餐</view
            >
            <view
              class="seg-btn"
              :class="{ active: draft.calorieMode === 'itemized' }"
              @click="draft.calorieMode = 'itemized'"
              >分项</view
            >
            <view
              class="seg-btn"
              :class="{ active: draft.calorieMode === 'partial' }"
              @click="draft.calorieMode = 'partial'"
              >部分分项</view
            >
          </view>

          <view v-if="draft.calorieMode === 'whole'" class="field-row">
            <text class="field-label">本餐总热量</text>
            <number-field
              class="field-input"
              :model-value="draft.wholeOverride"
              placeholder="如 600"
              title="本餐总热量"
              :decimal-places="0"
              :max-integer="6"
              @update:model-value="(v) => (draft.wholeOverride = v)"
            />
            <text class="field-unit">kcal</text>
          </view>

          <block v-if="draft.calorieMode !== 'whole'">
            <view class="section-label">食物项（勾选 ≥2 项可组合）</view>
            <view class="food-items">
              <view
                v-for="(f, i) in draft.foodItems"
                :key="i"
                class="food-item"
                :class="{ 'food-item--combo': f.source === 'combo' }"
              >
                <view
                  v-if="f.source !== 'combo'"
                  class="food-check"
                  :class="{ on: selectedFoodIdx.includes(i) }"
                  @click="toggleFoodSelect(i)"
                  >✓</view
                >
                <view class="food-main">
                  <view class="food-line1">
                    <input class="food-name" placeholder="食物名" v-model="f.name" />
                    <view class="food-qty">
                      <text class="qty-label">×</text>
                      <number-field
                        class="qty-input"
                        :model-value="f.qty"
                        :decimal-places="0"
                        :max-integer="3"
                        title="数量"
                        @update:model-value="(v) => (f.qty = v)"
                      />
                    </view>
                    <text class="food-source" :class="'src-' + f.source">{{
                      sourceLabel(f.source)
                    }}</text>
                  </view>
                  <view class="food-line2">
                    <view class="food-cal">
                      <text
                        v-if="f.source === 'combo'"
                        class="cal-auto"
                        :class="{ on: f.calorieAuto }"
                        @click="f.calorieAuto = !f.calorieAuto"
                        >{{ f.calorieAuto ? "自动" : "手动" }}</text
                      >
                      <text v-if="f.source === 'combo' && f.calorieAuto" class="food-kcal"
                        >{{ comboTotal(f) }} kcal</text
                      >
                      <number-field
                        v-else
                        class="food-kcal"
                        :model-value="f.calories"
                        placeholder="热量"
                        title="热量"
                        :decimal-places="0"
                        :max-integer="6"
                        @update:model-value="(v) => (f.calories = v)"
                      />
                      <text class="food-kcal-unit">kcal</text>
                    </view>
                    <view class="food-sticker" @click="openFoodStickerPicker(i)">
                      <image
                        v-if="f.sticker_image_url"
                        :src="cloud.display(f.sticker_image_url)"
                        mode="aspectFill"
                        class="food-sticker-img"
                      />
                      <text v-else class="food-sticker-plus">🏷️</text>
                    </view>
                    <view class="food-del" @click="removeFoodItem(i)"
                      ><text>🗑️</text></view
                    >
                  </view>
                  <!-- 组合明细：可编辑子项 / 重新合成 -->
                  <view v-if="f.source === 'combo' && f.comboItems" class="combo-detail">
                    <view v-for="(c, ci) in f.comboItems" :key="ci" class="combo-sub">
                      <input class="combo-sub-name" v-model="c.name" placeholder="子项" />
                      <number-field
                        class="combo-sub-cal"
                        :model-value="c.calories"
                        placeholder="热量"
                        title="热量"
                        :decimal-places="0"
                        :max-integer="6"
                        @update:model-value="(v) => (c.calories = v)"
                      />
                      <text class="combo-sub-src" :class="'src-' + c.source">{{
                        sourceLabel(c.source)
                      }}</text>
                      <view class="combo-sub-del" @click="removeComboSub(i, ci)">×</view>
                    </view>
                    <view class="combo-actions">
                      <text class="combo-resynth" @click="resynthCombo(i)"
                        >🔄 重新合成</text
                      >
                      <text class="combo-total">总热量 {{ comboTotal(f) }} kcal</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
            <view class="add-food-btn" @click="addFoodItem"
              ><text>＋ 添加食物</text></view
            >
            <view v-if="selectedFoodIdx.length >= 2" class="combo-btn" @click="doCombine"
              >🧩 组合选中（{{ selectedFoodIdx.length }}）</view
            >
            <view
              v-if="draft.calorieMode === 'partial'"
              class="field-row"
              style="margin-top: 12rpx"
            >
              <text class="field-label">确认总热量</text>
              <number-field
                class="field-input"
                :model-value="draft.wholeOverride"
                :placeholder="String(itemizedSum)"
                title="确认总热量"
                :decimal-places="0"
                :max-integer="6"
                @update:model-value="(v) => (draft.wholeOverride = v)"
              />
              <text class="field-unit">kcal</text>
            </view>
            <text class="food-sum" v-else>分项合计：{{ itemizedSum }} kcal</text>
          </block>
        </scroll-view>
        <view class="sheet-cancel" @click="closeQuickPopup">取消</view>
      </view>
    </view>

    <!-- 可滚动：退款关联 / 凭证图片 / 商品贴纸 -->
    <scroll-view scroll-y enhanced :show-scrollbar="false" class="page-scroll">
      <view v-if="draft.type === 'refund'" class="refund-card">
        <view class="section-label">关联原支出（冲减原分类）</view>
        <view v-if="!draft.relatedId" class="refund-pick" @click="openOriginalPicker">
          <text class="refund-pick-plus">＋</text>
          <text class="refund-pick-text">选择要退款的原支出</text>
        </view>
        <view v-else class="refund-linked" @click="openOriginalPicker">
          <text class="refund-linked-icon">{{ originalCat.icon }}</text>
          <view class="refund-linked-info">
            <text class="refund-linked-cat">{{ originalCat.name }}</text>
            <text class="refund-linked-meta"
              >原支出 ¥{{ originalAmountYuan }} · {{ originalTx.date_key }}</text
            >
          </view>
          <view class="refund-clear" @click.stop="clearRelated">清除</view>
        </view>
      </view>

      <view class="section-label">商品贴纸</view>
      <view class="sticker-row">
        <view
          v-if="draft.stickerId || draft.stickerImageUrl"
          class="sticker-chosen"
          @click="openStickerLib"
        >
          <image :src="stickerPreview" mode="aspectFill" class="sticker-chosen-img" />
          <view class="sticker-chosen-info">
            <text class="sticker-chosen-name">{{ stickerChosenName }}</text>
            <text class="sticker-chosen-tip">点击更换</text>
          </view>
          <view class="sticker-qty" @click.stop>
            <view
              class="qty-btn"
              @click="draft.stickerQty = Math.max(1, (draft.stickerQty || 1) - 1)"
              >−</view
            >
            <text class="qty-num">{{ draft.stickerQty || 1 }}</text>
            <view class="qty-btn" @click="draft.stickerQty = (draft.stickerQty || 1) + 1"
              >＋</view
            >
          </view>
          <view class="sticker-chosen-clear" @click.stop="clearSticker">×</view>
        </view>
        <view v-else class="sticker-add sticker-add--single" @click="openStickerLib">
          <text class="sticker-add-plus">🏷️</text>
          <text class="sticker-add-text">添加商品贴纸</text>
        </view>
      </view>

      <view class="scroll-bottom-gap" />
    </scroll-view>

    <!-- 商品贴纸选择面板：囤货贴纸 / 用户上传 两个 tab，均可新增 -->
    <view v-if="showStickerLib" class="picker-mask" @click="showStickerLib = false">
      <view class="picker-sheet picker-sheet--tabs" @click.stop>
        <view class="picker-head">
          <text class="picker-title">选择商品贴纸</text>
          <text class="picker-close" @click="showStickerLib = false">×</text>
        </view>
        <view class="lib-tabs">
          <view
            class="lib-tab"
            :class="{ active: stickerLibTab === 'stock' }"
            @click="stickerLibTab = 'stock'"
            >📦 囤货贴纸</view
          >
          <view
            class="lib-tab"
            :class="{ active: stickerLibTab === 'material' }"
            @click="stickerLibTab = 'material'"
            >🖼️ 用户上传</view
          >
        </view>
        <scroll-view scroll-y enhanced :show-scrollbar="false" class="picker-grid">
          <!-- 用户上传：拍照一次性 + 新增贴纸 + 素材列表 -->
          <template v-if="stickerLibTab === 'material'">
            <view
              class="picker-sticker picker-upload"
              @click.stop="
                showStickerLib = false;
                chooseStickerPhoto();
              "
            >
              <text class="picker-upload-plus">📷</text>
              <text class="picker-sticker-name">拍照上传</text>
            </view>
            <view
              class="picker-sticker picker-new"
              @click.stop="addStickerFromLib('material')"
            >
              <text class="picker-upload-plus">＋</text>
              <text class="picker-sticker-name">新增贴纸</text>
            </view>
            <view
              v-for="s in materialStickers"
              :key="s._id"
              class="picker-sticker"
              @click="selectSticker(s)"
            >
              <image
                :src="cloud.display(s.image_url)"
                mode="aspectFill"
                class="picker-sticker-img"
              />
              <text class="picker-sticker-name">{{ s.name }}</text>
            </view>
            <view v-if="materialStickers.length === 0" class="picker-empty"
              >暂无上传贴纸，点「新增贴纸」创建</view
            >
          </template>
          <!-- 囤货贴纸：新增 + 列表（带库存角标） -->
          <template v-else>
            <view
              class="picker-sticker picker-new"
              @click.stop="addStickerFromLib('stock')"
            >
              <text class="picker-upload-plus">＋</text>
              <text class="picker-sticker-name">新增囤货</text>
            </view>
            <view
              v-for="s in stockStickers"
              :key="s._id"
              class="picker-sticker"
              :class="{ 'is-low': s.stock_qty != null && s.stock_qty <= 0 }"
              @click="selectSticker(s)"
            >
              <image
                :src="cloud.display(s.image_url)"
                mode="aspectFill"
                class="picker-sticker-img"
              />
              <text class="picker-sticker-name">{{ s.name }}</text>
              <text class="picker-sticker-badge">{{
                s.stock_qty != null && s.stock_qty <= 0 ? "无货" : "×" + s.stock_qty
              }}</text>
            </view>
            <view v-if="stockStickers.length === 0" class="picker-empty"
              >暂无囤货贴纸，点「新增囤货」创建</view
            >
          </template>
        </scroll-view>
      </view>
    </view>

    <!-- 保存 -->
    <view class="save-bar">
      <view class="save-main-btn" :class="{ loading: saving }" @click="saveRecord">
        <text>{{ saving ? "保存中…" : "保存记录" }}</text>
      </view>
    </view>

    <!-- 关联原支出选择器 -->
    <view
      v-if="showOriginalPicker"
      class="picker-mask"
      @click="showOriginalPicker = false"
    >
      <view class="picker-sheet" @click.stop>
        <view class="picker-head">
          <text class="picker-title">选择原支出</text>
          <text class="picker-close" @click="showOriginalPicker = false">×</text>
        </view>
        <scroll-view scroll-y enhanced :show-scrollbar="false" class="picker-list">
          <view
            v-for="o in originalList"
            :key="o._id"
            class="picker-item"
            @click="selectOriginal(o)"
          >
            <text class="picker-item-icon">{{ categoryIconOf(o.category_id) }}</text>
            <view class="picker-item-main">
              <text class="picker-item-cat">{{ categoryNameOf(o.category_id) }}</text>
              <text class="picker-item-meta"
                >{{ o.date_key }} · {{ o.note || "无备注" }}</text
              >
            </view>
            <text class="picker-item-amt">¥{{ fenToYuanString(o.amount) }}</text>
          </view>
          <view v-if="!originalList.length" class="picker-empty">暂无支出记录</view>
        </scroll-view>
      </view>
    </view>
    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
  </view>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
} from "vue";
import { onShow as uniOnShow, onUnload } from "@dcloudio/uni-app";
import {
  useUserStore,
  loadStickers,
  decrementStickerStockAction,
} from "@/stores/user.js";
import { consumeOcrPrefill } from "@/stores/ocrPrefill.js";
import {
  createTransaction,
  updateTransaction,
  getTransaction,
  listTransactions,
  listLedgers,
  getLedgerDetail,
  listCategories,
} from "@/api/sparejar.js";
import { yuanToFen, fenToYuanString } from "@/utils/money.js";
import { yuanToChinese } from "@/utils/chineseAmount.js";
import {
  cdn,
  resolveCover,
  getCloudTempUrl,
  getCloudTempUrls,
  createCloudImageResolver,
} from "@/utils/cdn.js";
import { todayDateKey } from "@/utils/date.js";

const userStore = useUserStore();
// cloud:// 需解析成临时 URL 才能被 <image> 渲染；onShow 重新解析以撑过切后台过期
const cloud = createCloudImageResolver();
function resolveDraftImages() {
  const ids = [
    draft.stickerImageUrl,
    ...(draft.imageUrls || []),
    ...(draft.foodItems || []).map((f) => f.sticker_image_url).filter(Boolean),
    ...(materialStickers.value || []).map((s) => s.image_url).filter(Boolean),
  ].filter(Boolean);
  cloud.resolve(ids);
}
uniOnShow(resolveDraftImages);

const draft = reactive({
  type: "expense",
  amount: "",
  categoryId: "",
  note: "",
  dateKey: todayDateKey(),
  ledgerId: "",
  accountId: "", // 关联付款账户（资产账户，可选）
  memberIds: [], // 参与成员（花费/收款人）
  tags: [], // 自定义标签
  imageUrls: [],
  relatedId: "", // 关联的原支出交易 _id（退款冲减原分类）
  stickerId: "", // 绑定的普通素材贴纸（stickers._id）
  stickerImageUrl: "", // 一次性拍照贴纸图（不入库 stickers）
  stickerQty: 1, // 商品贴纸数量（囤货=消耗件数）
  ocrMeta: null, // OCR 识别元数据（来自拍照识别记账，失败兜底手动时带入）
  toAccountId: "", // 还款场景：收款负债账户
  // 阶段 11：餐次与热量（仅餐饮分类 + 已开启轻记录时生效）
  mealType: "lunch",
  calorieMode: "itemized", // whole / itemized / partial
  wholeOverride: "", // 整餐模式总热量
  // 每条食物项：name 名称 / qty 数量 / calories 热量 / calorieAuto 自动算 / source 来源 / sticker / comboItems 组合明细
  foodItems: [], // [{ name, qty, calories, calorieAuto, source, sticker_id, sticker_image_url, comboItems }]
});

const allCats = ref([]);
const ledgers = ref([]);
const members = ref([]); // 当前账本成员列表

// 当前选中的分类（用于快捷卡片回显）
const selectedCategory = computed(() => {
  if (!draft.categoryId) return null;
  return allCats.value.find((c) => c._id === draft.categoryId) || null;
});

// 快捷入口（占位大图，后续替换为真实图片）
const quickEntries = ref([
  {
    key: "category",
    title: "选择账本分类",
    icon: cdn("/app_static/images/icon_book_category.png"),
    tagBg: "rgba(37,204,93,0.18)",
  },
  {
    key: "account",
    title: "付款账户",
    icon: cdn("/app_static/images/icon_pay_account.png"),
    tagBg: "rgba(61,123,240,0.18)",
  },
  {
    key: "meal",
    title: "餐次与热量",
    icon: cdn("/app_static/images/icon_meal_calorie.png"),
    tagBg: "rgba(255,93,143,0.18)",
  },
  {
    key: "repay",
    title: "还款",
    icon: cdn("/app_static/images/icon_repayment.png"),
    tagBg: "rgba(240,69,95,0.18)",
  },
]);

// 快捷入口点击 -> 弹出对应选择框（分类/付款账户/餐次与热量/还款）
const quickPopup = ref(""); // '' | 'category' | 'account' | 'meal' | 'repay'
function openQuickEntry(type) {
  if (type === "category" && !pagedCats.value.length) {
    uni.showToast({ title: "暂无分类", icon: "none" });
    return;
  }
  if (type === "repay") {
    if (!dailyAccounts.value.length) {
      uni.showToast({ title: "请先添加日常账户", icon: "none" });
      return;
    }
    if (!liabilityAccounts.value.length) {
      uni.showToast({ title: "暂无负债账户", icon: "none" });
      return;
    }
    repayFromId.value = "";
    repayToId.value = "";
    repayAmount.value = "";
  }
  quickPopup.value = type;
}
function closeQuickPopup() {
  quickPopup.value = "";
}

// 凭证图片 / 拍照扫描 横幅：自动循环展开 -> 停留 -> 合上
const scanPlaying = ref(false);
let scanTimer = null;
function startScanLoop() {
  const cycle = () => {
    scanPlaying.value = true; // 展开（等价于 hover）
    scanTimer = setTimeout(() => {
      scanPlaying.value = false; // 合上（等价于移开）
      scanTimer = setTimeout(cycle, 1000); // 间隔 1s 后再展开
    }, 10000); // 展开后停留约 10s
  };
  cycle();
}
function stopScanLoop() {
  if (scanTimer) clearTimeout(scanTimer);
  scanTimer = null;
  scanPlaying.value = false;
}
onMounted(() => {
  startScanLoop();
});
onBeforeUnmount(() => {
  stopScanLoop();
});
function onScanBannerClick(mode) {
  if (mode === "image") {
    chooseImages(); // 直接打开相册/拍照，成功后 draft.imageUrls 有图，下方管理区自动显示
  } else {
    uni.showToast({ title: "拍照扫描记账（待接入）", icon: "none" });
  }
}
// 自己（默认选中，头像+昵称，可切换其他成员）
const selfAvatar = computed(
  () =>
    (
      members.value.find((m) => m.is_self) ||
      members.value.find((m) => m.user_id === userStore.state.uid) ||
      null
    )?.avatar ||
    userStore.state.user?.avatar ||
    ""
);
const newTag = ref(""); // 标签输入框临时值
const tagEditing = ref(false); // 是否正在输入标签
const ledgerPickerShow = ref(false); // 账本选择弹窗
const memberPickerShow = ref(false); // 成员多选弹窗
const datePickerShow = ref(false); // 日期日历弹窗

// 成员药丸显示文案：仅展示自己 + 已选其他成员数量
const selectedMembers = computed(() =>
  members.value.filter((m) => draft.memberIds.includes(m._id))
);
const memberPillLabel = computed(() => {
  const s = selectedMembers.value;
  if (!s.length) return "选择成员";
  const self = s.find((m) => m.is_self);
  const others = s.filter((m) => !m.is_self);
  if (self && others.length) return `自己 +${others.length}`;
  if (self) return "自己";
  return s.map((m) => m.name).join("、");
});
const currentLedgerName = computed(() => {
  const l = ledgers.value.find((x) => x._id === draft.ledgerId);
  return l ? `${l.icon || "📒"} ${l.name}` : "";
});
const ledgerNameOnly = computed(() => {
  const l = ledgers.value.find((x) => x._id === draft.ledgerId);
  return l ? l.name : "";
});
const ledgerCover = ref("");
const coverUrlMap = reactive({});
watch(
  [() => draft.ledgerId, () => ledgers.value],
  async () => {
    const l = ledgers.value.find((x) => x._id === draft.ledgerId);
    if (!l) {
      ledgerCover.value = "";
      return;
    }
    const raw = l.cover || l.cover34 || "";
    if (!raw) {
      ledgerCover.value = "";
      return;
    }
    if (String(raw).startsWith("cloud://")) {
      // 与 ledger.vue coverDisplay 完全一致的云存储换链
      const map = await getCloudTempUrls([raw]);
      coverUrlMap[raw] = map[raw] || "";
      ledgerCover.value = coverUrlMap[raw] || "";
    } else {
      ledgerCover.value = resolveCover(raw);
    }
  },
  { immediate: true }
);

// 账本九宫格封面：与 ledger.vue / LedgerTab 完全一致的显示逻辑
const DEFAULT_COVER_REL = "/app_static/images/icon_cover.png";
const defaultCoverUrl = cdn(DEFAULT_COVER_REL);
const ledgerCloud = createCloudImageResolver();
const ledgerCoverErrors = reactive({}); // 按账本 _id 记录封面加载失败

// 封面显示：优先 3:4 版本(cover34)，无则回退主封面 cover；
// cloud:// → 预解析临时链；/ledger_img(旧数据) → 空走默认图；其它 → resolveCover
function ledgerCoverDisplay(l) {
  const c = String(l.cover34 || l.cover || "");
  if (!c) return "";
  if (c.startsWith("cloud://")) return ledgerCloud.display(c);
  if (c.startsWith("/ledger_img/")) return "";
  return resolveCover(c);
}
function onLedgerCoverError(l) {
  if (l && l._id) ledgerCoverErrors[l._id] = true;
}
watch(
  () => ledgers.value,
  (list) => {
    const ids = (list || [])
      .map((l) => l.cover34 || l.cover || "")
      .filter((r) => String(r).startsWith("cloud://"));
    if (ids.length) ledgerCloud.resolve(ids);
  },
  { immediate: true }
);

const amountMirrorText = computed(() => draft.amount || "0.00");
const inputWidth = ref("180px");
// 金额输入统一走 App.vue 全局数字键盘（AmountKeyboard 单例 + NumberField）
function onAmountKeyInput(val) {
  draft.amount = val;
}
const saving = ref(false);
const uploading = ref(false);
// 凭证图片：默认隐藏，成功上传至少一张（或编辑/OCR 预填已有图）后自动显示
const showImageSection = computed(() => draft.imageUrls.length > 0);
// 云存储清理：记录本次会话新上传的文件 ID；保存成功后清空，离场未保存则删除残留
const savedFlag = ref(false);
const uploadedThisSession = new Set();
// 当前选中的分类分页（swiper 页索引）
const activePage = ref(0);
// 关联原支出：原交易对象 + 选择器弹层 + 候选列表
const originalTx = ref(null);
const showOriginalPicker = ref(false);
const originalList = ref([]);

// 普通商品贴纸：一次性拍照图 / 素材库选择
const showStickerLib = ref(false);
// 商品贴纸面板 tab：stock=囤货贴纸 / material=用户上传
const stickerLibTab = ref("material");
const materialStickers = computed(() =>
  (userStore.state.stickers || []).filter((s) => s.type === "material")
);
// 阶段 10：可选付款账户（仅日常账户可作为消费来源）
const ASSET_SUBTYPE_ICON = {
  wechat: cdn("/app_static/images/icon_wechat.png"),
  alipay: cdn("/app_static/images/icon_alipay.png"),
  bank_card: cdn("/app_static/images/icon_bank_card.png"),
  bank: cdn("/app_static/images/icon_bank_card.png"),
  cash: cdn("/app_static/images/icon_cash.png"),
  huabei: cdn("/app_static/images/icon_huabei.png"),
  credit_card: cdn("/app_static/images/icon_credit_card.png"),
  jdbt: cdn("/app_static/images/icon_jdbt.png"),
  loan: cdn("/app_static/images/icon_loan.png"),
  provident_fund: cdn("/app_static/images/icon_provident_fund.png"),
  insurance: cdn("/app_static/images/icon_insurance.png"),
  fund: cdn("/app_static/images/icon_fund.png"),
  stock: cdn("/app_static/images/icon_stock.png"),
  bond: cdn("/app_static/images/icon_bond.png"),
  gold: cdn("/app_static/images/icon_gold.png"),
  other: cdn("/app_static/images/icon_other.png"),
};
// 阶段 11：餐次与热量
const mealEnabled = computed(
  () => !!(userStore.state.settings && userStore.state.settings.meal_tracking_enabled)
);
// 是否已进入餐次模式（点过某个餐次标签 / 编辑餐次），控制保存时走餐次分支，避免所有支出都变餐次
const mealEntered = ref(false);
const foodCatId = computed(() => {
  const c = (userStore.state.categories || []).find(
    (x) => x.name === "餐饮" && x.type === "expense"
  );
  return c ? c._id : null;
});
const isFoodMeal = computed(
  () => mealEnabled.value && draft.type === "expense" && !editingId.value
);
const MEAL_TYPES = [
  { id: "breakfast", label: "🌅 早餐" },
  { id: "lunch", label: "☀️ 午餐" },
  { id: "dinner", label: "🌙 晚餐" },
  { id: "morning_snack", label: "🥐 早加餐" },
  { id: "afternoon_tea", label: "🍰 下午茶" },
  { id: "evening_snack", label: "🌛 晚加餐" },
  { id: "night_snack", label: "🍜 夜宵" },
];
const itemizedSum = computed(() =>
  draft.foodItems.reduce((s, f) => s + Math.round(Number(f.calories) || 0), 0)
);
// 确认总热量：整餐模式取 override；分项/部分分项取分项之和（部分分项用户可改 wholeOverride 作为最终值）
const confirmedCalories = computed(() => {
  if (draft.calorieMode === "whole") return Math.round(Number(draft.wholeOverride) || 0);
  if (draft.calorieMode === "partial" && draft.wholeOverride !== "")
    return Math.round(Number(draft.wholeOverride) || 0);
  return itemizedSum.value;
});

function addFoodItem() {
  draft.foodItems.push({
    name: "",
    qty: 1,
    calories: "",
    calorieAuto: false,
    source: "upload",
    sticker_id: "",
    sticker_image_url: "",
    comboItems: null,
  });
}
function selectMealType(mt) {
  draft.mealType = mt.id;
  mealEntered.value = true;
}
// 顶部常驻餐次栏：一步点标签 -> 进入餐次编辑弹窗
function tapMealChip(mt) {
  selectMealType(mt);
  quickPopup.value = "meal";
}
function removeFoodItem(i) {
  draft.foodItems.splice(i, 1);
}
// 可选贴纸来源：囤货（含库存）/ 素材 / 组合 / 拍照上传
const stockStickers = computed(() =>
  (userStore.state.stickers || []).filter((s) => s.type === "stock")
);
const comboStickers = computed(() =>
  (userStore.state.stickers || []).filter((s) => s.combo_type === "combo")
);
const selectedFoodIdx = ref([]);
function toggleFoodSelect(i) {
  const k = selectedFoodIdx.value.indexOf(i);
  if (k >= 0) selectedFoodIdx.value.splice(k, 1);
  else selectedFoodIdx.value.push(i);
}
function sourceLabel(s) {
  return { stock: "囤货", upload: "普通", material: "素材", combo: "组合" }[s] || "普通";
}
function comboTotal(f) {
  if (!f.comboItems) return Math.round(Number(f.calories) || 0);
  return f.comboItems.reduce(
    (s, c) =>
      s +
      Math.round(Number(c.calories) || 0) * Math.max(1, Math.round(Number(c.qty) || 1)),
    0
  );
}
// 拍照上传到某个食物项（一次性普通贴纸，不入 stickers 库）
function chooseStickerPhotoForFood(i) {
  if (uploading.value) return;
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    success: async (res) => {
      const p = (res.tempFilePaths || [])[0];
      if (!p) return;
      uploading.value = true;
      try {
        const ext = (p.split(".").pop() || "png").split("?")[0].toLowerCase();
        const cloudPath = `transactions/${
          userStore.state.uid
        }/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await uniCloud.uploadFile({ filePath: p, cloudPath });
        const url = (up && up.fileID) || (up && up.url) || "";
        if (url) {
          draft.foodItems[i].source = "upload";
          draft.foodItems[i].sticker_id = "";
          draft.foodItems[i].sticker_image_url = url;
          uploadedThisSession.add(url);
          cloud.resolve([url]);
        }
      } catch (e) {
        uni.showToast({ title: "上传失败", icon: "none" });
      } finally {
        uploading.value = false;
      }
    },
  });
}
// 选择某食物项的贴纸：囤货 / 素材 / 组合 / 拍照上传；囤货无货则转普通上传
function openFoodStickerPicker(i) {
  const groups = [];
  const map = [];
  stockStickers.value.forEach((s) => {
    const low = s.stock_qty == null ? false : s.stock_qty <= 0;
    groups.push(
      (low ? "⚠️无货 " : "📦囤货 ") + (s.name || "贴纸") + (low ? "" : ` ×${s.stock_qty}`)
    );
    map.push({ kind: "stock", idx: stockStickers.value.indexOf(s), low });
  });
  materialStickers.value.forEach((s) => {
    groups.push("🖼️素材 " + (s.name || "贴纸"));
    map.push({ kind: "material", idx: materialStickers.value.indexOf(s) });
  });
  comboStickers.value.forEach((s) => {
    groups.push("🧩组合 " + (s.name || "贴纸"));
    map.push({ kind: "combo", idx: comboStickers.value.indexOf(s) });
  });
  groups.push("📷 拍照上传");
  map.push({ kind: "upload" });
  uni.showActionSheet({
    itemList: groups,
    success: (res) => {
      const m = map[res.tapIndex];
      if (!m) return;
      if (m.kind === "upload") {
        chooseStickerPhotoForFood(i);
        return;
      }
      if (m.kind === "stock" && m.low) {
        const sName =
          (stockStickers.value[m.idx] && stockStickers.value[m.idx].name) || "该囤货";
        uni.showModal({
          title: "囤货无库存",
          content: `「${sName}」已无库存，是否转为普通拍照上传？`,
          confirmText: "转普通上传",
          cancelText: "取消",
          success: (r) => {
            if (r.confirm) chooseStickerPhotoForFood(i);
          },
        });
        return;
      }
      const listMap = {
        stock: stockStickers,
        material: materialStickers,
        combo: comboStickers,
      };
      const s = listMap[m.kind].value[m.idx];
      if (s) {
        const src =
          m.kind === "stock" ? "stock" : m.kind === "material" ? "material" : "combo";
        draft.foodItems[i].source = src;
        draft.foodItems[i].sticker_id = s._id;
        draft.foodItems[i].sticker_image_url = s.image_url || "";
        cloud.resolve([s.image_url]);
      }
    },
  });
}
// 组合：勾选的若干项 → AI 合成一张可复用组合贴纸 + 生成本餐一条 combo 项
async function doCombine() {
  const idxs = selectedFoodIdx.value.slice().sort((a, b) => a - b);
  if (idxs.length < 2) return;
  const parts = idxs.map((i) => {
    const f = draft.foodItems[i];
    return {
      name: f.name || "食物",
      qty: Math.max(1, Math.round(Number(f.qty) || 1)),
      source: f.source || "upload",
      calories: Math.round(Number(f.calories) || 0),
      sticker_id: f.sticker_id || null,
      sticker_image_url: f.sticker_image_url || null,
    };
  });
  const sourceImages = parts.map((p) => p.sticker_image_url).filter(Boolean);
  if (sourceImages.length < 2) {
    uni.showToast({ title: "组合需至少 2 张贴纸图", icon: "none" });
    return;
  }
  try {
    const res = await userStore.combineStickerAction({
      name: parts.map((p) => p.name).join("+"),
      source_images: sourceImages,
      combo_items: parts,
    });
    const comboItem = {
      name: res.name || "组合",
      qty: 1,
      calories: parts.reduce((s, p) => s + p.calories, 0),
      calorieAuto: true,
      source: "combo",
      sticker_id: res.sticker_id || "",
      sticker_image_url: res.image_url || "",
      comboItems: parts,
    };
    for (let k = idxs.length - 1; k >= 0; k--) draft.foodItems.splice(idxs[k], 1);
    draft.foodItems.push(comboItem);
    selectedFoodIdx.value = [];
    cloud.resolve([comboItem.sticker_image_url]);
    uni.showToast({ title: "已组合", icon: "success" });
  } catch (e) {
    uni.showToast({ title: (e && e.message) || "组合失败", icon: "none" });
  }
}
// 组合子项编辑后重算热量
function removeComboSub(fi, ci) {
  const f = draft.foodItems[fi];
  if (!f || !f.comboItems) return;
  f.comboItems.splice(ci, 1);
  if (!f.comboItems.length) {
    f.source = "upload";
    f.sticker_id = "";
    f.comboItems = null;
  } else if (f.calorieAuto) {
    f.calories = comboTotal(f);
  }
}
// 组合子项变动后重新 AI 合成图（消耗积分）
async function resynthCombo(i) {
  const f = draft.foodItems[i];
  if (!f || !f.comboItems) return;
  const sourceImages = f.comboItems.map((c) => c.sticker_image_url).filter(Boolean);
  if (sourceImages.length < 2) {
    uni.showToast({ title: "组合需至少 2 张图", icon: "none" });
    return;
  }
  try {
    const res = await userStore.combineStickerAction({
      name: f.name || "组合",
      source_images: sourceImages,
      combo_items: f.comboItems,
    });
    f.sticker_id = res.sticker_id || f.sticker_id;
    f.sticker_image_url = res.image_url || f.sticker_image_url;
    cloud.resolve([f.sticker_image_url]);
    uni.showToast({ title: "已重新合成", icon: "success" });
  } catch (e) {
    uni.showToast({ title: (e && e.message) || "合成失败", icon: "none" });
  }
}
const dailyAccounts = computed(() =>
  (userStore.state.assets || [])
    .filter((a) => a.account_class === "daily")
    .map((a) => ({
      _id: a._id,
      name: a.name,
      icon:
        ASSET_SUBTYPE_ICON[a.account_subtype] || cdn("/app_static/images/icon_other.png"),
    }))
);
// 负债账户列表（还款/刷卡消费联动用）
const liabilityAccounts = computed(() =>
  (userStore.state.assets || [])
    .filter((a) => a.account_class === "liability")
    .map((a) => ({
      _id: a._id,
      name: a.name,
      icon:
        ASSET_SUBTYPE_ICON[a.account_subtype] || cdn("/app_static/images/icon_other.png"),
      balance: a.current_balance || 0,
    }))
);
// 还款弹框：付款日常账户 + 收款负债账户
const repayFromId = ref("");
const repayToId = ref("");
const repayAmount = ref(""); // 还款独立金额（不复用主表单 draft.amount）
const stickerPreview = computed(() => {
  if (draft.stickerImageUrl) return cloud.display(draft.stickerImageUrl);
  const s = (userStore.state.stickers || []).find((x) => x._id === draft.stickerId);
  return s ? cloud.display(s.image_url) : "";
});
const stickerChosenName = computed(() => {
  if (draft.stickerImageUrl && !draft.stickerId) return "拍照贴纸";
  const s = (userStore.state.stickers || []).find((x) => x._id === draft.stickerId);
  return s ? s.name : "已选贴纸";
});

function chooseStickerPhoto() {
  if (uploading.value) return;
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    success: async (res) => {
      const p = (res.tempFilePaths || [])[0];
      if (!p) return;
      uploading.value = true;
      try {
        const ext = (p.split(".").pop() || "png").split("?")[0].toLowerCase();
        const cloudPath = `transactions/${
          userStore.state.uid
        }/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await uniCloud.uploadFile({ filePath: p, cloudPath });
        const fileID = (up && up.fileID) || "";
        const url = fileID || (up && up.url) || "";
        if (url) {
          draft.stickerImageUrl = url;
          draft.stickerId = ""; // 拍照与素材库二选一
          cloud.resolve([url]); // cloud:// → 临时 URL 供 <image> 渲染
        }
      } catch (err) {
        console.error("[add-record] upload sticker failed", err);
        uni.showToast({ title: "贴纸图片上传失败", icon: "none" });
      } finally {
        uploading.value = false;
      }
    },
  });
}

function openStickerLib() {
  showStickerLib.value = true;
}

// 从商品贴纸面板跳转到贴纸创建页（预置类型），创建后返回自动刷新列表
function addStickerFromLib(type) {
  showStickerLib.value = false;
  uni.navigateTo({ url: `/pages/sticker-lib/sticker-edit?type=${type}` });
}

function selectSticker(s) {
  draft.stickerId = s._id;
  draft.stickerImageUrl = ""; // 素材库与拍照二选一
  draft.stickerQty = 1; // 新选贴纸数量重置为 1
  showStickerLib.value = false;
}

function clearSticker() {
  draft.stickerId = "";
  draft.stickerImageUrl = "";
  draft.stickerQty = 1;
}

// 选了囤货贴纸作为本笔商品贴纸时，保存即按数量扣库存（编辑且未更换则不重复扣）
async function consumeSelectedStockSticker(prevStickerId) {
  const id = draft.stickerId;
  if (!id) return;
  if (prevStickerId && prevStickerId === id) return; // 编辑同一囤货，已扣过
  const s = (userStore.state.stickers || []).find((x) => x._id === id);
  if (!s || s.type !== "stock") return;
  await decrementStickerStockAction(id, draft.stickerQty || 1);
}

// 编辑模式：从首页账单点击进入时携带 ?id=，加载原交易预填
const editingId = ref("");
const editingOriginalType = ref("");
// 编辑时记录原始顶层贴纸 _id，用于判断是否需要扣库存（未更换则不重复扣）
const editingStickerId = ref("");
// 阶段 11：餐次编辑（从餐次详情进入，携带 ?mealId=）
const editingMealId = ref("");

const pageTitle = computed(() =>
  editingId.value || editingMealId.value ? "编辑餐次" : "记一笔"
);

// 实时人民币大写（随金额输入变化）
const amountInChinese = computed(() => yuanToChinese(draft.amount));

// 金额类型标签（支出/收入/退款）
const typeLabel = computed(() => {
  if (draft.type === "expense") return "支出";
  if (draft.type === "refund") return "退款";
  return "收入";
});
const typeIndex = computed(() => {
  if (draft.type === "expense") return 0;
  if (draft.type === "income") return 1;
  return 2;
});

// 关联原支出后，原分类信息（用于展示与冲减原分类）
const originalCat = computed(() => {
  const id = originalTx.value && originalTx.value.category_id;
  if (!id) return { icon: "📦", name: "原分类" };
  const c = allCats.value.find((x) => x._id === id);
  return c ? { icon: c.icon, name: c.name } : { icon: "📦", name: "原分类" };
});
const originalAmountYuan = computed(() => {
  const amt = originalTx.value && originalTx.value.amount;
  return amt ? fenToYuanString(amt) : "0.00";
});

// 分类按固定每页分页（去掉二级 group，整 type 平铺）
const PAGE_SIZE = 12;
const pagedCats = computed(() => {
  const list = allCats.value
    .filter((c) => c.type === draft.type)
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const pages = [];
  for (let i = 0; i < list.length; i += PAGE_SIZE) {
    pages.push({ cats: list.slice(i, i + PAGE_SIZE) });
  }
  return pages;
});

function setType(t) {
  if (editingId.value) return; // 编辑模式不允许切换类型
  if (draft.type === t) return;
  draft.type = t;
  draft.categoryId = ""; // 切换类型清空已选分类（分类按 type 隔离）
  activePage.value = 0; // 回到第一页
  if (t !== "refund") {
    // 离开退款类型时清除关联（分类由普通分组重新选择）
    draft.relatedId = "";
    originalTx.value = null;
  }
}

function onPageChange(e) {
  activePage.value = e.detail.current;
}

/** 根据分类 id 找到所属分页（用于编辑预填时定位 swiper） */
function findPageIndexByCategory(catId) {
  if (!catId) return 0;
  const list = pagedCats.value;
  for (let pi = 0; pi < list.length; pi++) {
    if (list[pi].cats.some((c) => c._id === catId)) return pi;
  }
  return 0;
}

async function loadTransactionForEdit(id) {
  const uid = userStore.state.uid;
  if (!uid) return;
  try {
    // 走云函数读取，禁止前端直连数据库
    const tx = await getTransaction(id);
    if (!tx || tx.user_id !== uid) {
      uni.showToast({ title: "账目不存在", icon: "none" });
      return;
    }
    editingId.value = id;
    editingOriginalType.value = tx.type;
    draft.type =
      tx.type === "income" || tx.type === "transfer"
        ? "income"
        : tx.type === "refund"
        ? "refund"
        : "expense";
    draft.amount = fenToYuanString(tx.amount);
    draft.categoryId = tx.category_id || "";
    draft.ledgerId = tx.ledger_id || "";
    draft.note = tx.note || "";
    draft.dateKey = tx.date_key || todayDateKey();
    draft.imageUrls = Array.isArray(tx.image_urls) ? tx.image_urls.slice() : [];
    draft.stickerId = tx.sticker_id || "";
    editingStickerId.value = tx.sticker_id || "";
    draft.stickerImageUrl = tx.sticker_image_url || "";
    draft.stickerQty = tx.sticker_qty || 1;
    resolveDraftImages(); // 解析编辑载入的 cloud:// 图片
    if (tx.type === "refund" && tx.related_transaction_id) {
      // 退款：加载原支出用于展示与冲减原分类
      draft.relatedId = tx.related_transaction_id;
      await loadRelatedOriginal(tx.related_transaction_id);
    } else {
      activePage.value = findPageIndexByCategory(draft.categoryId);
    }
  } catch (err) {
    console.error("[add-record] load transaction for edit failed", err);
  }
}

// 阶段 11：餐次编辑预填
async function loadMealForEdit(id) {
  try {
    const m = await userStore.getMealAction(id);
    if (!m) {
      uni.showToast({ title: "餐次不存在", icon: "none" });
      return;
    }
    const tx = m.transaction || {};
    editingMealId.value = id;
    draft.type = "expense";
    draft.amount = fenToYuanString(tx.amount || 0);
    draft.categoryId = tx.category_id || foodCatId.value;
    draft.ledgerId = tx.ledger_id || draft.ledgerId;
    draft.note = tx.note || "";
    draft.dateKey = tx.date_key || todayDateKey();
    draft.accountId = tx.account_id || "";
    draft.imageUrls = Array.isArray(tx.image_urls) ? tx.image_urls.slice() : [];
    draft.mealType = m.meal_type || "lunch";
    draft.calorieMode = m.calorie_mode || "itemized";
    draft.wholeOverride =
      m.calorie_mode === "whole" || m.calorie_mode === "partial"
        ? String(m.confirmed_calories || 0)
        : "";
    mealEntered.value = true;
    draft.foodItems = (m.food_items || []).map((f) => ({
      name: f.name || "",
      qty: f.qty || 1,
      calories: String(f.calories || 0),
      calorieAuto: !!f.calorie_auto,
      source: f.source || "upload",
      sticker_id: f.sticker_id || "",
      sticker_image_url: f.sticker_image_url || "",
      comboItems: Array.isArray(f.combo_items) ? f.combo_items : null,
    }));
    activePage.value = findPageIndexByCategory(draft.categoryId);
    resolveDraftImages(); // 解析编辑载入的 cloud:// 图片
  } catch (err) {
    console.error("[add-record] load meal for edit failed", err);
  }
}

function onDateChange(key) {
  draft.dateKey = key;
  datePickerShow.value = false;
}

/** 切换账本时加载该账本成员 */
async function selectLedger(id) {
  draft.ledgerId = id;
  draft.memberIds = [];
  await loadMembers(id);
}

/** 加载账本成员（用于选择花费/收款人） */
async function loadMembers(ledgerId) {
  if (!ledgerId) {
    members.value = [];
    return;
  }
  try {
    const res = await getLedgerDetail(ledgerId);
    const list = (res.members || []).map((m) => ({
      _id: m._id,
      user_id: m.user_id || "",
      name: m.nickname || "成员",
      avatar: m.avatar_url || "",
      is_self: !!m.is_self,
    }));
    members.value = list;
    // 默认选中自己（未被显式选过时）
    if (draft.memberIds.length === 0) {
      const self = list.find((m) => m.is_self);
      if (self) draft.memberIds.push(self._id);
    }
  } catch (err) {
    console.error("[add-record] load members failed", err);
    members.value = [];
  }
}

/** 切换成员选中态 */
function toggleMember(uid) {
  const i = draft.memberIds.indexOf(uid);
  if (i >= 0) draft.memberIds.splice(i, 1);
  else draft.memberIds.push(uid);
}

/** 开始输入标签（在 type 右侧展开输入框） */
function startTagInput() {
  tagEditing.value = true;
}

/** 添加标签（确认或失焦时） */
function addTag() {
  const t = (newTag.value || "").trim();
  if (t && !draft.tags.includes(t)) draft.tags.push(t);
  newTag.value = "";
  tagEditing.value = false;
}

/** 移除标签 */
function removeTag(idx) {
  draft.tags.splice(idx, 1);
}

/** 弹窗中选择账本 */
async function onPickLedger(id) {
  ledgerPickerShow.value = false;
  if (id === draft.ledgerId) return;
  await selectLedger(id);
}

const MAX_IMAGES = 9;

/** 选择图片（最多 9 张） */
function chooseImages() {
  if (uploading.value) return;
  const remain = MAX_IMAGES - draft.imageUrls.length;
  if (remain <= 0) return;
  uni.chooseImage({
    count: remain,
    sizeType: ["compressed"],
    success: async (res) => {
      const paths = (res.tempFilePaths || []).filter(Boolean);
      if (paths.length) await uploadImages(paths);
    },
  });
}

/** 从 uniCloud 云存储删除一张凭证图（best-effort，失败仅告警不阻断） */
function deleteCloudImage(fileID) {
  if (!fileID || !String(fileID).startsWith("cloud://")) return; // 仅清理云存储文件
  uniCloud
    .deleteFile({ fileList: [fileID] })
    .then(() => console.log("[add-record] 已删除云存储图片:", fileID))
    .catch((e) => console.warn("[add-record] 删除云存储图片失败:", fileID, e));
}

/** 上传选中的图片到 uniCloud 存储，URL 写入 draft.imageUrls */
async function uploadImages(paths) {
  const uid = userStore.state.uid;
  if (!uid) return;
  uploading.value = true;
  try {
    for (const p of paths) {
      if (draft.imageUrls.length >= MAX_IMAGES) break;
      const ext = (p.split(".").pop() || "png").split("?")[0].toLowerCase();
      const cloudPath = `transactions/${uid}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const up = await uniCloud.uploadFile({ filePath: p, cloudPath });
      const fileID = (up && up.fileID) || "";
      const url = fileID || (up && up.url) || "";
      if (url) {
        draft.imageUrls.push(url);
        uploadedThisSession.add(url); // 记录本次会话新上传，离场未保存时清理
      }
    }
    cloud.resolve(draft.imageUrls); // 解析本次上传的 cloud:// 凭证图
  } catch (err) {
    console.error("[add-record] upload image failed", err);
    uni.showToast({ title: "图片上传失败", icon: "none" });
  } finally {
    uploading.value = false;
  }
}

/** 移除已选图片（同时从云存储清理） */
function removeImage(idx) {
  const removed = draft.imageUrls[idx];
  draft.imageUrls.splice(idx, 1);
  uploadedThisSession.delete(removed);
  deleteCloudImage(removed);
}

/** 加载近期支出记录，供退款关联选择 */
async function loadOriginalExpenses() {
  const uid = userStore.state.uid;
  if (!uid) return;
  try {
    // 走云函数读取，禁止前端直连数据库
    const list = await listTransactions({
      type: "expense",
      limit: 40,
      orderBy: "transaction_at",
      orderDir: "desc",
    });
    originalList.value = (list || []).map((t) => ({
      _id: t._id,
      category_id: t.category_id,
      amount: t.amount,
      date_key: t.date_key,
      note: t.note || "",
    }));
  } catch (err) {
    console.error("[add-record] load original expenses failed", err);
  }
}

/** 分类图标/名称查表（基于已加载的 allCats） */
function categoryIconOf(catId) {
  const c = allCats.value.find((x) => x._id === catId);
  return c ? c.icon : "📦";
}
function categoryNameOf(catId) {
  const c = allCats.value.find((x) => x._id === catId);
  return c ? c.name : "未分类";
}

/** 打开关联原支出选择器 */
function openOriginalPicker() {
  if (editingId.value) return; // 编辑模式不允许更换关联
  showOriginalPicker.value = true;
}

/** 选中原支出：自动带出分类（冲减原分类）并预填全额退款金额 */
function selectOriginal(o) {
  draft.relatedId = o._id;
  originalTx.value = o;
  draft.categoryId = o.category_id || ""; // 退款沿用原分类，冲减原分类统计
  draft.amount = fenToYuanString(o.amount); // 默认全额退款，可改部分
  showOriginalPicker.value = false;
}

/** 清除关联 */
function clearRelated() {
  if (editingId.value) return;
  draft.relatedId = "";
  originalTx.value = null;
  draft.categoryId = "";
  draft.amount = "";
}

/** 编辑退款时按 related_transaction_id 加载原支出展示 */
async function loadRelatedOriginal(id) {
  const uid = userStore.state.uid;
  if (!uid) return;
  try {
    // 走云函数读取，禁止前端直连数据库
    const o = await getTransaction(id);
    if (o && o.user_id === uid) {
      originalTx.value = o;
      draft.categoryId = o.category_id || draft.categoryId;
    }
  } catch (err) {
    console.error("[add-record] load related original failed", err);
  }
}

async function loadCategories() {
  const uid = userStore.state.uid;
  if (!uid) return;
  try {
    // 走云函数读取，禁止前端直连数据库
    const list = await listCategories();
    allCats.value = (list || []).map((c) => ({
      _id: c._id,
      type: c.type,
      name: c.name,
      icon: c.icon,
    }));
  } catch (err) {
    console.error("[add-record] load categories failed", err);
  }
}

async function loadLedgers() {
  const uid = userStore.state.uid;
  if (!uid) return;
  try {
    // 走云函数读取，禁止前端直连数据库
    const list = await listLedgers();
    ledgers.value = (list || [])
      .filter((l) => !l.deleted_at)
      .map((l) => ({
        _id: l._id,
        name: l.name,
        icon: l.icon,
        cover: l.cover,
        cover34: l.cover34,
      }));
    const def = ledgers.value.find((l) => l._id === userStore.state.defaultLedgerId);
    draft.ledgerId = (def || ledgers.value[0] || {})._id || "";
    if (draft.ledgerId) await loadMembers(draft.ledgerId);
  } catch (err) {
    console.error("[add-record] load ledgers failed", err);
  }
}

onMounted(async () => {
  if (!userStore.state.uid) {
    uni.showToast({ title: "请先登录", icon: "none" });
    uni.navigateTo({
      url:
        "/pages/login/login?redirect=" +
        encodeURIComponent("/pages/add-record/add-record"),
    });
    return;
  }
  const pages = getCurrentPages();
  const cur = pages[pages.length - 1];
  const editId = cur && cur.options ? cur.options.id : "";
  const mealIdOpt = cur && cur.options ? cur.options.mealId : "";
  const ledgerIdOpt = cur && cur.options ? cur.options.ledger_id : "";
  await Promise.all([
    loadCategories(),
    loadLedgers(),
    loadOriginalExpenses(),
    loadStickers(),
    userStore.loadAssetAccounts(),
  ]);
  // 从账本详情“记一笔”进入：预选当前账本
  if (ledgerIdOpt && !editId && !mealIdOpt) draft.ledgerId = ledgerIdOpt;
  if (editId) {
    await loadTransactionForEdit(editId);
  } else if (mealIdOpt) {
    await loadMealForEdit(mealIdOpt);
  } else {
    // 阶段 9：OCR 识别失败兜底手动记账，带入已上传图片与识别字段
    const prefill = consumeOcrPrefill();
    if (prefill.imageUrl) {
      if (!draft.imageUrls.includes(prefill.imageUrl))
        draft.imageUrls.push(prefill.imageUrl);
      if (prefill.amount) draft.amount = prefill.amount;
      if (prefill.note) draft.note = prefill.note;
      if (prefill.dateKey) draft.dateKey = prefill.dateKey;
      if (prefill.categoryId) draft.categoryId = prefill.categoryId;
      draft.ocrMeta = prefill.ocrMeta || null;
    }
  }
  measureInputWidth();
});

/** 根据隐藏尺子测量金额输入框宽度 */
function measureInputWidth() {
  nextTick(() => {
    const query = uni.createSelectorQuery();
    query
      .select(".amount-input-mirror")
      .boundingClientRect((rect) => {
        if (rect && rect.width) {
          inputWidth.value = `${rect.width + 10}px`;
        } else {
          inputWidth.value = `${Math.max(
            120,
            (amountMirrorText.value.length + 1) * 48
          )}px`;
        }
      })
      .exec();
  });
}

/** 金额内容变化时动态调整输入框宽度 */
watch(amountMirrorText, measureInputWidth);

async function saveRecord() {
  if (saving.value) return;
  if (!draft.amount || draft.amount === "." || Number(draft.amount || 0) <= 0) {
    uni.showToast({ title: "请输入金额", icon: "none" });
    return;
  }
  let fen;
  try {
    fen = yuanToFen(draft.amount);
  } catch (err) {
    uni.showToast({ title: "金额格式有误", icon: "none" });
    return;
  }
  if (draft.type === "refund" && !draft.relatedId) {
    uni.showToast({ title: "请选择关联的原支出", icon: "none" });
    return;
  }
  if (!draft.categoryId) {
    uni.showToast({ title: "请选择分类", icon: "none" });
    return;
  }
  if (!draft.ledgerId) {
    uni.showToast({ title: "请选择账本", icon: "none" });
    return;
  }

  saving.value = true;
  try {
    const [y, m, d] = draft.dateKey.split("-").map(Number);
    const now = new Date();
    const txAt = new Date(
      y,
      m - 1,
      d,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    ).getTime();

    // 选了囤货贴纸则保存时扣库存（编辑且未更换则不重复扣）
    const selSticker = (userStore.state.stickers || []).find(
      (x) => x._id === draft.stickerId
    );
    const stickerIsStock = !!(selSticker && selSticker.type === "stock");
    await consumeSelectedStockSticker(editingStickerId.value);

    if (editingId.value) {
      // 编辑：保留原始 type（退款/转账等），仅更新可编辑字段
      await updateTransaction(editingId.value, {
        type: editingOriginalType.value || draft.type,
        amount: fen,
        category_id: draft.categoryId,
        ledger_id: draft.ledgerId,
        note: draft.note.trim(),
        date_key: draft.dateKey,
        transaction_at: txAt,
        image_urls: draft.imageUrls,
        sticker_id: draft.stickerId || null,
        sticker_image_url: draft.stickerImageUrl || null,
        sticker_qty: draft.stickerQty || 1,
        stock_consume_qty: stickerIsStock ? draft.stickerQty || 1 : null,
        related_transaction_id: draft.relatedId || null,
        account_id: draft.accountId || null,
        ocr_meta: draft.ocrMeta || null,
        member_ids: draft.memberIds,
        tags: draft.tags,
      });
    } else if (editingMealId.value) {
      // 阶段 11：编辑餐次（更新交易 + 餐次 + 食物项）
      await userStore.updateMealAction({
        meal_id: editingMealId.value,
        amount: fen,
        category_id: draft.categoryId,
        ledger_id: draft.ledgerId,
        account_id: draft.accountId || null,
        note: draft.note.trim(),
        date_key: draft.dateKey,
        transaction_at: txAt,
        image_urls: draft.imageUrls,
        sticker_id: draft.stickerId || null,
        sticker_image_url: draft.stickerImageUrl || null,
        sticker_qty: draft.stickerQty || 1,
        stock_consume_qty: stickerIsStock ? draft.stickerQty || 1 : null,
        member_ids: draft.memberIds,
        tags: draft.tags,
        meal_type: draft.mealType,
        calorie_mode: draft.calorieMode,
        whole_override: Math.round(Number(draft.wholeOverride) || 0),
        confirmed_calories: confirmedCalories.value,
        food_items: draft.foodItems.map((f) => ({
          name: f.name,
          qty: Math.max(1, Math.round(Number(f.qty) || 1)),
          calories:
            f.source === "combo" && f.calorieAuto
              ? comboTotal(f)
              : Math.round(Number(f.calories) || 0),
          calorie_auto: !!f.calorieAuto,
          source: f.source || "upload",
          sticker_id: f.sticker_id || null,
          sticker_image_url: f.sticker_image_url || null,
          combo_items: Array.isArray(f.comboItems) ? f.comboItems : null,
        })),
      });
    } else if (mealEntered.value || editingMealId.value) {
      // 阶段 11：餐次记录（同时创建餐饮交易 + 餐次 + 食物项）
      await userStore.createMealAction({
        amount: fen,
        category_id: draft.categoryId,
        ledger_id: draft.ledgerId,
        account_id: draft.accountId || null,
        note: draft.note.trim(),
        date_key: draft.dateKey,
        transaction_at: txAt,
        image_urls: draft.imageUrls,
        sticker_id: draft.stickerId || null,
        sticker_image_url: draft.stickerImageUrl || null,
        sticker_qty: draft.stickerQty || 1,
        stock_consume_qty: stickerIsStock ? draft.stickerQty || 1 : null,
        member_ids: draft.memberIds,
        tags: draft.tags,
        meal_type: draft.mealType,
        calorie_mode: draft.calorieMode,
        whole_override: Math.round(Number(draft.wholeOverride) || 0),
        confirmed_calories: confirmedCalories.value,
        food_items: draft.foodItems.map((f) => ({
          name: f.name,
          qty: Math.max(1, Math.round(Number(f.qty) || 1)),
          calories:
            f.source === "combo" && f.calorieAuto
              ? comboTotal(f)
              : Math.round(Number(f.calories) || 0),
          calorie_auto: !!f.calorieAuto,
          source: f.source || "upload",
          sticker_id: f.sticker_id || null,
          sticker_image_url: f.sticker_image_url || null,
          combo_items: Array.isArray(f.comboItems) ? f.comboItems : null,
        })),
      });
    } else {
      await createTransaction({
        ledger_id: draft.ledgerId,
        type: draft.type,
        amount: fen,
        category_id: draft.categoryId,
        note: draft.note.trim(),
        date_key: draft.dateKey,
        transaction_at: txAt,
        image_urls: draft.imageUrls,
        sticker_id: draft.stickerId || null,
        sticker_image_url: draft.stickerImageUrl || null,
        sticker_qty: draft.stickerQty || 1,
        stock_consume_qty: stickerIsStock ? draft.stickerQty || 1 : null,
        related_transaction_id: draft.relatedId || null,
        account_id: draft.accountId || null,
        ocr_meta: draft.ocrMeta || null,
        member_ids: draft.memberIds,
        tags: draft.tags,
      });
    }

    savedFlag.value = true; // 图片已落库，离场不再清理
    uni.showToast({ title: editingId.value ? "已更新" : "已记录", icon: "success" });
    // 刷新首页看板（createTransaction 已在服务端重算 settlement）
    try {
      await userStore.refreshTodayDashboard({ force: true });
    } catch (_e) {
      // 看板刷新失败不影响已保存结果
    }
    setTimeout(() => uni.switchTab({ url: "/pages/index/index" }), 500);
  } catch (err) {
    const msg = err && err.message ? err.message : "保存失败";
    uni.showToast({ title: msg, icon: "none" });
  } finally {
    saving.value = false;
  }
}

// 还款：用日常账户向负债账户转账，负债账户余额（欠款）减少
async function submitRepay() {
  if (saving.value) return;
  if (!repayFromId.value || !repayToId.value) {
    uni.showToast({ title: "请选择付款与收款账户", icon: "none" });
    return;
  }
  if (
    !repayAmount.value ||
    repayAmount.value === "." ||
    Number(repayAmount.value || 0) <= 0
  ) {
    uni.showToast({ title: "请输入还款金额", icon: "none" });
    return;
  }
  let fen;
  try {
    fen = yuanToFen(repayAmount.value);
  } catch (err) {
    uni.showToast({ title: "金额格式有误", icon: "none" });
    return;
  }
  if (!draft.ledgerId) {
    uni.showToast({ title: "请选择账本", icon: "none" });
    return;
  }
  saving.value = true;
  try {
    const [y, m, d] = draft.dateKey.split("-").map(Number);
    const now = new Date();
    const txAt = new Date(
      y,
      m - 1,
      d,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    ).getTime();
    await createTransaction({
      ledger_id: draft.ledgerId,
      type: "transfer",
      amount: fen,
      category_id: "",
      note: draft.note.trim() || "还款",
      date_key: draft.dateKey,
      transaction_at: txAt,
      account_id: repayFromId.value, // 付款：日常账户（余额减少）
      to_account_id: repayToId.value, // 收款：负债账户（欠款减少）
      member_ids: draft.memberIds,
      tags: draft.tags,
    });
    savedFlag.value = true; // 图片已落库，离场不再清理
    uni.showToast({ title: "还款已记录", icon: "success" });
    try {
      await userStore.refreshTodayDashboard({ force: true });
    } catch (_e) {}
    setTimeout(() => uni.switchTab({ url: "/pages/index/index" }), 500);
  } catch (err) {
    const msg = err && err.message ? err.message : "还款失败";
    uni.showToast({ title: msg, icon: "none" });
  } finally {
    saving.value = false;
  }
}

function goBack() {
  uni.navigateBack();
}

// 离场清理：若本次会话上传了图片却未保存（删除/失败/中途离开），从云存储删除残留，避免存储冗余
onUnload(() => {
  if (savedFlag.value) return;
  for (const id of uploadedThisSession) {
    if (draft.imageUrls.includes(id)) deleteCloudImage(id);
  }
  uploadedThisSession.clear();
});
</script>

<style scoped lang="scss">
.add-record-page {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(180deg, var(--g0) 0%, #ffffff 32%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  --g5: #25cc5d;
  --g4: #4fd974;
  --ink: #0f1c14;
  --ink2: #3a5244;
  --ink3: #6b8c7a;
  --ink4: #9bb8a8;
  --red: #ff6b6b;

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 88rpx 32rpx 8rpx;
  }

  .back-btn {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink3);
    font-size: 32rpx;
  }

  .topbar-title {
    font-size: 34rpx;
    font-weight: 800;
    color: var(--ink);
  }

  .topbar-spacer {
    width: 64rpx;
  }

  .fixed-top {
    position: relative;
    padding: 0 32rpx;
  }

  .type-switch {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 24rpx 0 8rpx;
    --type-index: 0;
  }

  .type-tab {
    position: relative;
    z-index: 2;
    flex: 1;
    text-align: center;
    font-size: 30rpx;
    font-weight: 500;
    color: var(--ink4);
    padding: 12rpx 0;
    transition: color 0.28s ease, font-weight 0.28s ease;
    cursor: pointer;

    &.active {
      color: var(--ink);
      font-weight: 700;
    }

    &.disabled {
      opacity: 0.55;
      cursor: default;
    }
  }

  .type-indicator {
    position: absolute;
    bottom: 4rpx;
    left: calc((var(--type-index) * 33.333%) + 16.666% - 28rpx);
    width: 56rpx;
    height: 24rpx;
    border-radius: 13rpx;
    background: var(--g3);
    z-index: 0;
    transition: left 0.32s cubic-bezier(0.34, 1.5, 0.64, 1), background 0.28s ease;
  }

  // 金额卡片：半边边框（下半部分保留，上半透明）
  .amount-card {
    position: relative;
    z-index: 1;
    margin: 8rpx 0 0;
    padding: 28rpx 36rpx 50rpx;
    color: var(--ink);
    background: linear-gradient(var(--g0, #f7faf7), var(--g0, #f7faf7)) padding-box,
      linear-gradient(
          to bottom,
          transparent 0 38%,
          rgba(123, 179, 130, 0.18) 44%,
          var(--g4, #7bb382) 60%,
          var(--g5, #5a9e68) 82%,
          var(--g5, #5a9e68) 100%
        )
        border-box;
    border: 6rpx solid transparent;
    border-radius: 28rpx;
    text-align: center;
    overflow: visible;
  }

  .amount-line1 {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 16rpx;
  }

  .amount-symbol {
    font-size: 44rpx;
    color: var(--ink4);
    font-weight: 600;
    flex-shrink: 0;
  }

  .amount-input {
    flex: 0 0 auto;
    min-width: 120rpx;
    max-width: 100%;
    height: 120rpx;
    line-height: 120rpx;
    font-size: 80rpx;
    font-weight: 900;
    color: var(--ink);
    letter-spacing: -2rpx;
    text-align: left;
    cursor: pointer;
  }

  .amount-input.is-placeholder {
    color: var(--ink4);
    font-weight: 700;
  }

  .amount-input-mirror {
    position: absolute;
    left: 0;
    top: 9999rpx;
    opacity: 0;
    pointer-events: none;
    font-size: 80rpx;
    font-weight: 900;
    letter-spacing: -2rpx;
    white-space: pre;
  }

  .amount-ph {
    color: var(--ink4);
    font-weight: 700;
    font-size: 80rpx;
    line-height: 120rpx;
  }

  .amount-upper {
    position: relative;
    z-index: 2;
    display: block;
    text-align: center;
    margin-top: 14rpx;
    font-size: 24rpx;
    letter-spacing: 1rpx;
    color: var(--ink3);

    &.placeholder {
      color: var(--ink4);
      opacity: 0.7;
    }
  }

  .amount-line3 {
    position: relative;
    z-index: 2;
    margin-top: 10rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 14rpx;
  }

  .amount-type {
    font-size: 22rpx;
    font-weight: 700;
    padding: 4rpx 18rpx;
    border-radius: 20rpx;
    background: rgba(255, 255, 255, 0.6);

    &.expense {
      color: var(--red);
    }

    &.income {
      color: var(--g5);
    }

    &.refund {
      color: #4a6cf0;
    }
  }

  .amount-tags {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12rpx;
  }

  .amount-tag {
    display: flex;
    align-items: center;
    gap: 6rpx;
    padding: 4rpx 16rpx;
    border-radius: 20rpx;
    background: rgba(37, 204, 93, 0.14);
    color: #1e8a44;
    font-size: 22rpx;
  }

  .amount-tag-name {
    font-size: 22rpx;
  }

  .amount-tag-x {
    font-size: 24rpx;
    color: #1e8a44;
  }

  .amount-tag-add {
    padding: 4rpx 16rpx;
    border-radius: 20rpx;
    background: var(--g0, #f7faf7);
    color: var(--ink3);
    font-size: 22rpx;
    border: 2rpx dashed rgba(0, 0, 0, 0.12);
  }

  .amount-tag-input {
    width: 140rpx;
    height: 48rpx;
    padding: 0 16rpx;
    border-radius: 20rpx;
    background: var(--g0, #f7faf7);
    font-size: 22rpx;
    color: var(--ink);
  }

  .amount-tag-ph {
    color: var(--ink4);
  }

  // 底部叠加信息卡
  .info-card {
    position: relative;
    margin: -44rpx auto 0;
    width: fit-content;
    max-width: 92vw;
    padding: 24rpx 32rpx 24rpx;
    background: #ffffff;
    border-radius: 28rpx;
    box-shadow: 0 8rpx 28rpx rgba(0, 0, 0, 0.06);
    z-index: 2;
  }

  // 横排药丸容器（一横排，不换行，居中显示在卡片内）
  .pill-row {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: center;
    gap: 16rpx;
    white-space: nowrap;
  }

  .pill {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 6rpx;
    padding: 8rpx 16rpx;
    border-radius: 36rpx;
    font-size: 22rpx;
    font-weight: 500;
    line-height: 1.2;
    min-height: 60rpx;
    max-width: 200rpx;
    // 统一背景与边框（取自第一个药丸）
    background: var(--g0, #f7faf7);
    border: 2rpx solid rgba(37, 204, 93, 0.18);
  }

  .pill-icon {
    width: 44rpx;
    height: 44rpx;
    line-height: 44rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30rpx;
  }

  .pill-text {
    font-size: 22rpx;
    max-width: 140rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pill-ledger-name {
    font-size: 22rpx;
    max-width: 160rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // 日期药丸（主题色描边）
  .pill-date {
    color: var(--g5);
  }

  // 账本药丸（中间药丸：移除背景，仅保留边框）
  .pill-ledger {
    background: transparent;
    // border: 2rpx solid rgba(79, 217, 116, 0.18);
    color: var(--g5);
  }

  // 成员药丸
  .pill-member {
    color: var(--ink3);

    &.active {
      background: rgba(74, 108, 240, 0.1);
      border-color: rgba(74, 108, 240, 0.35);
      color: #2a47b0;
      font-weight: 700;
    }

    &.disabled {
      opacity: 0.6;
    }
  }

  .pill-avatar {
    width: 44rpx;
    height: 44rpx;
    border-radius: 50%;
    object-fit: cover;
    background: #e8f3ea;
  }

  // 账本选择弹窗（底部 sheet）
  .sheet-mask {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 50;
    display: flex;
    align-items: flex-end;
  }

  .sheet {
    width: 100%;
    background: #fff;
    border-radius: 28rpx 28rpx 0 0;
    padding: 28rpx 32rpx calc(28rpx + env(safe-area-inset-bottom));
    max-height: 70vh;
  }

  .sheet-title {
    text-align: center;
    font-size: 30rpx;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 16rpx;
  }

  .repay-amount-row {
    display: flex;
    align-items: center;
    gap: 10rpx;
    padding: 18rpx 24rpx;
    margin-bottom: 16rpx;
    border-radius: 18rpx;
    background: rgba(240, 69, 95, 0.08);
  }

  .repay-amount-symbol {
    font-size: 36rpx;
    font-weight: 700;
    color: #f0455f;
  }

  .repay-amount-input {
    flex: 1;
    font-size: 40rpx;
    font-weight: 700;
    color: var(--ink);
  }

  .repay-amount-ph {
    color: var(--ink3);
    font-weight: 400;
  }

  .sheet-scroll {
    max-height: 48vh;
  }

  // 账本九宫格封面卡片
  .ledger-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28rpx 20rpx;
    padding: 8rpx 4rpx 4rpx;
  }

  .ledger-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10rpx;
  }

  .ledger-cover-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 3 / 4;
  }

  .ledger-cover {
    width: 100%;
    height: 100%;
    border-radius: 18rpx;
    background: var(--g0);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .ledger-card.active .ledger-cover {
    outline: 4rpx solid var(--g5);
    outline-offset: 2rpx;
  }

  .ledger-check {
    position: absolute;
    top: 8rpx;
    right: 8rpx;
    min-width: 36rpx;
    height: 36rpx;
    padding: 0 6rpx;
    box-sizing: border-box;
    border-radius: 18rpx;
    background: var(--g5);
    color: #fff;
    font-size: 22rpx;
    line-height: 36rpx;
    text-align: center;
  }

  .ledger-card-name {
    font-size: 22rpx;
    color: var(--ink2);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
  }

  .ledger-card.active .ledger-card-name {
    color: var(--g5);
    font-weight: 700;
  }

  .sheet-item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 24rpx 16rpx;
    border-bottom: 2rpx solid rgba(0, 0, 0, 0.04);

    &.active {
      color: var(--g5);
    }
  }

  .sheet-item-icon {
    width: 44rpx;
    height: 44rpx;
    flex-shrink: 0;
  }

  .sheet-item-name {
    flex: 1;
    font-size: 28rpx;
    color: var(--ink);
  }

  .sheet-item-check {
    font-size: 30rpx;
    color: var(--g5);
    font-weight: 700;
  }

  .sheet-item-sub {
    font-size: 22rpx;
    color: var(--red, #ff6b6b);
    font-weight: 600;
  }

  .sheet-item {
    &.liability {
      background: rgba(255, 107, 107, 0.06);
      border-radius: 16rpx;
      margin-bottom: 8rpx;
      border-bottom: none;
    }
  }

  .sheet-confirm {
    margin-top: 20rpx;
    text-align: center;
    font-size: 30rpx;
    font-weight: 700;
    color: #fff;
    padding: 24rpx 0;
    border-radius: 20rpx;
    background: linear-gradient(135deg, #f0455f, #ff7a8a);

    &.disabled {
      opacity: 0.45;
    }
  }

  .sheet-cancel {
    margin-top: 20rpx;
    text-align: center;
    font-size: 28rpx;
    color: var(--ink3);
    padding: 22rpx 0;
    border-radius: 20rpx;
    background: var(--g0, #f7faf7);
  }

  .info-note-row {
    margin: 20rpx 32rpx 0;
    box-sizing: border-box;
    padding: 12rpx 32rpx;
    border-radius: 24rpx;
    border: 4rpx solid var(--g2);
  }

  .info-note-inline {
    width: 100%;
    height: 60rpx;
    padding: 0;
    // border-radius: 20rpx;
    background: #ffffff;
    // box-shadow: 0 8rpx 28rpx rgba(0, 0, 0, 0.06);
    font-size: 26rpx;
    color: var(--ink);
  }

  // 快捷入口（一行四个），与金额卡片/备注框同宽对齐（左右各 32rpx 边距）
  .quick-entries {
    display: flex;
    gap: 16rpx;
    margin: 48rpx 32rpx 0;
    box-sizing: border-box;
  }

  // 凭证图片 & 拍照扫描 两卡片（自动循环展开）
  .scan-row {
    display: flex;
    gap: 16rpx;
    margin: 28rpx 32rpx 0;
    box-sizing: border-box;
  }

  // 蓝绿（Teal）对比主题变量，明度节奏与 g0~g5 对齐，仅供对比预览
  .scan-banner {
    --t0: #ccfbf1;
    --t1: #99f6e4;
    --t2: #5eead4;
    --t3: #2dd4bf;
    --t4: #14b8a6;
    --t5: #0d9488;
    position: relative;
    flex: 1;
    height: 210rpx;
    border-radius: 24rpx;
    // 背景直接用 g0 绿色
    background: var(--g0);
    display: flex;
    align-items: center;
    overflow: hidden;
    transition: all 0.5s ease-in-out;
    box-sizing: border-box;
  }

  // 蓝绿对比版（仅用于你左侧绿色、右侧蓝绿的并排预览）
  .scan-banner--teal {
    background: var(--t0);
  }
  .scan-banner--teal .scan-border {
    border-color: var(--t4);
  }
  .scan-banner--teal .scan-icon {
    background: rgba(20, 184, 166, 0.15);
  }
  .scan-banner--teal .scan-title {
    color: #0f766e;
  }
  .scan-banner--teal .scan-sub {
    color: rgba(15, 118, 110, 0.75);
  }
  .scan-banner--teal .scan-bottom-text {
    color: #0d9488;
    background: var(--t0);
  }

  .scan-border {
    position: absolute;
    inset: 0;
    border: 2rpx solid var(--g4);
    border-radius: 24rpx;
    opacity: 0;
    transform: rotate(10deg);
    transition: all 0.5s ease-in-out;
  }

  // 整体居中：图标+标题 一行居中，副标题在其下方居中
  .scan-content {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14rpx;
    padding: 0 28rpx;
    box-sizing: border-box;
    transition: all 0.5s ease-in-out;
  }

  // 图标 + 标题（一行，水平居中）
  .scan-main {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
  }

  .scan-icon {
    height: 64rpx;
    width: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(37, 204, 93, 0.15);
    flex-shrink: 0;
  }

  .scan-icon-emoji {
    font-size: 36rpx;
    line-height: 1;
  }

  // 标题：合上态收起为 0 宽（只显示图标）；展开态出现
  .scan-title {
    font-size: 30rpx;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: 1rpx;
    max-width: 0;
    overflow: hidden;
    white-space: nowrap;
    opacity: 0;
    transition: all 0.5s ease-in-out 0.2s;
  }

  // 副标题：图标+标题下方居中，合上态隐藏
  .scan-sub {
    font-size: 22rpx;
    color: var(--ink3);
    text-align: center;
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transition: all 0.5s ease-in-out 0.3s;
  }

  .scan-bottom-text {
    position: absolute;
    left: 50%;
    bottom: 14rpx;
    transform: translateX(-50%);
    font-size: 18rpx;
    text-transform: uppercase;
    letter-spacing: 3rpx;
    color: var(--ink4);
    background: var(--g0);
    padding: 0 8rpx;
    opacity: 0;
    transition: all 0.5s ease-in-out;
  }

  // ===== 展开态（由 JS 循环切换 .playing，等价于原 :hover） =====
  .scan-banner.playing {
    border-radius: 12rpx;
    transform: scale(1.02);
  }

  .scan-banner.playing .scan-border {
    inset: 22rpx;
    border-radius: 16rpx;
    opacity: 1;
    transform: rotate(0);
  }

  .scan-banner.playing .scan-title {
    max-width: 400rpx;
    opacity: 1;
  }

  .scan-banner.playing .scan-sub {
    max-height: 60rpx;
    opacity: 1;
  }

  .scan-banner.playing .scan-bottom-text {
    opacity: 1;
    letter-spacing: 6rpx;
    transform: translateX(-50%);
  }

  @keyframes scan-opacity {
    0% {
      border-right: 1rpx solid transparent;
    }
    10% {
      border-right: 1rpx solid #25cc5d;
    }
    80% {
      border-right: 1rpx solid #25cc5d;
    }
    100% {
      border-right: 1rpx solid transparent;
    }
  }

  .q-entry {
    position: relative;
    flex: 1;
    height: 100rpx;
    border-radius: 24rpx;
    background: #ffffff;
    box-shadow: 0 20rpx 30rpx -6rpx rgba(0, 0, 0, 0.1),
      0 12rpx 24rpx -4rpx rgba(0, 0, 0, 0.05);
    overflow: visible;
    // 给上方超出的图与竖矩形留空间
    margin-top: 38rpx;
  }

  // 占位大图：超出矩形上方
  .q-thumb {
    position: absolute;
    top: -60rpx;
    left: 70%;
    transform: translateX(-50%);
    width: 100rpx;
    height: 100rpx;
    border-radius: 20rpx;
    object-fit: contain;
  }

  // 右侧叠加：上方超出矩形的竖矩形
  .q-tag {
    position: absolute;
    top: -20rpx;
    right: -6rpx;
    width: 50rpx;
    height: 60rpx;
    border-radius: 20rpx;
  }

  // 居左大字
  .q-title {
    position: absolute;
    left: 20rpx;
    top: 12rpx;
    right: 20rpx;
    font-size: 26rpx;
    font-weight: 700;
    line-height: 1.2;
    color: var(--ink);
    text-align: left;
  }

  .info-note-ph {
    color: var(--ink4);
  }

  .page-scroll {
    flex: 1;
    min-height: 0;
  }

  .section-label {
    font-size: 22rpx;
    color: var(--ink4);
    font-weight: 700;
    padding: 16rpx 36rpx 8rpx;
  }

  .cat-swiper {
    height: 360rpx;
    margin: 8rpx 0 4rpx;
  }

  .cat-scroll {
    height: 100%;
  }

  .cat-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    padding: 8rpx 24rpx;
  }

  .cat-chip {
    padding: 16rpx 22rpx;
    border-radius: 28rpx;
    border: 3rpx solid transparent;
    background: rgba(255, 255, 255, 0.65);
    display: flex;
    align-items: center;
    gap: 10rpx;
    font-size: 24rpx;
    font-weight: 600;
    color: var(--ink3);
    cursor: pointer;

    &.active {
      border-color: var(--g5);
      background: rgba(37, 204, 93, 0.12);
      color: var(--ink);
    }
  }

  .cat-emoji {
    font-size: 32rpx;
  }

  .empty-hint {
    text-align: center;
    color: var(--ink4);
    font-size: 24rpx;
    padding: 40rpx;
  }

  .ledger-scroll {
    white-space: nowrap;
    padding: 0 32rpx;
  }

  .ledger-row {
    display: inline-flex;
    gap: 16rpx;
  }

  .ledger-chip {
    display: inline-block;
    padding: 14rpx 28rpx;
    border-radius: 40rpx;
    background: rgba(255, 255, 255, 0.7);
    font-size: 24rpx;
    color: var(--ink3);
    cursor: pointer;

    &.active {
      background: linear-gradient(135deg, #4fd974, #25cc5d);
      color: #fff;
    }
  }

  .date-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 32rpx;
    padding: 18rpx 28rpx;
    border-radius: 24rpx;
    background: rgba(255, 255, 255, 0.7);
  }

  .date-text {
    font-size: 26rpx;
    color: var(--ink2);
  }

  .date-arrow {
    color: var(--ink4);
    font-size: 32rpx;
  }

  .image-row {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    padding: 4rpx 24rpx;
  }

  .image-thumb {
    position: relative;
    width: 152rpx;
    height: 152rpx;
    border-radius: 20rpx;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.6);
  }

  .image-thumb-img {
    width: 100%;
    height: 100%;
  }

  .image-remove {
    position: absolute;
    top: 4rpx;
    right: 4rpx;
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: rgba(15, 28, 20, 0.6);
    color: #fff;
    font-size: 28rpx;
    line-height: 36rpx;
    text-align: center;
  }

  .image-add {
    width: 152rpx;
    height: 152rpx;
    border-radius: 20rpx;
    border: 3rpx dashed rgba(37, 204, 93, 0.5);
    background: rgba(255, 255, 255, 0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4rpx;
    color: var(--ink3);
    cursor: pointer;
  }

  .image-add-plus {
    font-size: 48rpx;
    line-height: 1;
  }

  .image-add-text {
    font-size: 22rpx;
  }

  .scroll-bottom-gap {
    height: calc(160rpx + env(safe-area-inset-bottom));
  }

  .sticker-row {
    display: flex;
    gap: 16rpx;
    padding: 4rpx 24rpx;
    flex-wrap: wrap;
  }

  .sticker-chosen {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 12rpx 20rpx;
    border-radius: 20rpx;
    background: rgba(37, 204, 93, 0.1);
    border: 2rpx solid rgba(37, 204, 93, 0.3);
    cursor: pointer;
  }

  .sticker-chosen-img {
    width: 72rpx;
    height: 72rpx;
    border-radius: 14rpx;
  }

  .sticker-chosen-info {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }

  .sticker-chosen-name {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--ink);
  }

  .sticker-chosen-tip {
    font-size: 20rpx;
    color: var(--ink4);
  }

  .sticker-chosen-clear {
    margin-left: auto;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.06);
    color: var(--ink3);
    font-size: 30rpx;
    line-height: 40rpx;
    text-align: center;
    flex-shrink: 0;
  }

  .sticker-qty {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-left: 8rpx;
    flex-shrink: 0;
  }

  .qty-btn {
    width: 44rpx;
    height: 44rpx;
    border-radius: 50%;
    background: rgba(37, 204, 93, 0.12);
    color: var(--ink2);
    font-size: 34rpx;
    line-height: 44rpx;
    text-align: center;
    cursor: pointer;
  }

  .qty-num {
    min-width: 28rpx;
    text-align: center;
    font-size: 26rpx;
    font-weight: 700;
    color: var(--ink);
  }

  .sticker-add {
    width: 200rpx;
    height: 104rpx;
    border-radius: 20rpx;
    border: 3rpx dashed rgba(37, 204, 93, 0.5);
    background: rgba(255, 255, 255, 0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4rpx;
    color: var(--ink3);
    cursor: pointer;
  }

  .sticker-add-plus {
    font-size: 36rpx;
  }

  .sticker-add-text {
    font-size: 22rpx;
  }

  .sticker-add--single {
    width: 100%;
    height: 96rpx;
    flex-direction: row;
    gap: 12rpx;
  }

  /* 顶部常驻餐次快捷栏 */
  .meal-quick-bar {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin: 14rpx 18rpx 0;
    padding: 14rpx 16rpx;
    background: linear-gradient(
      135deg,
      rgba(255, 143, 174, 0.12),
      rgba(255, 93, 143, 0.08)
    );
    border: 2rpx solid rgba(255, 93, 143, 0.18);
    border-radius: 20rpx;
  }

  .meal-quick-title {
    flex-shrink: 0;
    font-size: 26rpx;
    font-weight: 700;
    color: #ff5d8f;
  }

  .meal-quick-scroll {
    flex: 1;
    white-space: nowrap;
    width: 100%;
  }

  .meal-quick-row {
    display: inline-flex;
    gap: 12rpx;
    padding: 2rpx 0;
  }

  .meal-quick-chip {
    flex-shrink: 0;
    padding: 10rpx 22rpx;
    border-radius: 999rpx;
    background: #fff;
    border: 2rpx solid rgba(255, 93, 143, 0.25);
    font-size: 24rpx;
    color: #ff5d8f;
    font-weight: 600;
    transition: all 0.18s ease;

    &.active {
      background: linear-gradient(135deg, #ff8fae, #ff5d8f);
      border-color: transparent;
      color: #fff;
      box-shadow: 0 6rpx 16rpx rgba(255, 93, 143, 0.32);
    }
  }

  /* 阶段 11：餐次与热量 */
  .meal-section {
    margin-top: 8rpx;
  }

  .meal-type-row {
    display: flex;
    gap: 16rpx;
    flex-wrap: wrap;
  }

  .meal-type-chip {
    padding: 16rpx 28rpx;
    border-radius: 22rpx;
    background: #eef6f0;
    border: 2rpx solid #d6ebda;
    font-size: 24rpx;
    font-weight: 600;
    color: var(--ink3);
    cursor: pointer;
    transition: all 0.2s;

    &.active {
      background: linear-gradient(135deg, #7ed390, #25cc5d);
      color: #fff;
      border-color: transparent;
    }
  }

  .seg-group {
    display: flex;
    gap: 16rpx;
  }

  .seg-btn {
    flex: 1;
    padding: 16rpx 0;
    text-align: center;
    border-radius: 20rpx;
    background: #eef6f0;
    border: 2rpx solid #d6ebda;
    font-size: 24rpx;
    font-weight: 600;
    color: var(--ink3);
    cursor: pointer;

    &.active {
      background: linear-gradient(135deg, #7ed390, #25cc5d);
      color: #fff;
      border-color: transparent;
    }
  }

  .field-row {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-top: 16rpx;
  }

  .field-label {
    font-size: 24rpx;
    color: var(--ink3);
    font-weight: 600;
    width: 150rpx;
    flex-shrink: 0;
  }

  .field-input {
    flex: 1;
    height: 72rpx;
    border-radius: 20rpx;
    background: #f3faf4;
    border: 2rpx solid #d6ebda;
    padding: 0 24rpx;
    font-size: 26rpx;
    color: var(--ink);
    text-align: center;
  }

  .field-unit {
    font-size: 22rpx;
    color: var(--ink4);
    width: 64rpx;
    flex-shrink: 0;
  }

  .food-items {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
    margin-top: 16rpx;
  }

  .food-item {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  .food-name {
    flex: 1;
    height: 72rpx;
    border-radius: 18rpx;
    background: #f3faf4;
    border: 2rpx solid #d6ebda;
    padding: 0 20rpx;
    font-size: 26rpx;
    color: var(--ink);
  }

  .food-kcal {
    width: 140rpx;
    height: 72rpx;
    border-radius: 18rpx;
    background: #f3faf4;
    border: 2rpx solid #d6ebda;
    padding: 0 16rpx;
    font-size: 24rpx;
    color: var(--ink);
    text-align: center;
  }

  .food-kcal-unit {
    font-size: 20rpx;
    color: var(--ink4);
  }

  .food-sticker {
    width: 64rpx;
    height: 64rpx;
    border-radius: 16rpx;
    background: #eef6f0;
    border: 2rpx solid #d6ebda;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    cursor: pointer;
  }

  .food-sticker-img {
    width: 100%;
    height: 100%;
  }

  .food-sticker-plus {
    font-size: 28rpx;
  }

  .food-del {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    cursor: pointer;
  }

  .add-food-btn {
    margin-top: 14rpx;
    padding: 18rpx;
    border-radius: 20rpx;
    background: rgba(var(--g2-rgb), 0.5);
    border: 2rpx dashed #b7e3bf;
    text-align: center;
    font-size: 24rpx;
    font-weight: 600;
    color: var(--g5);
    cursor: pointer;
  }

  .food-sum {
    display: block;
    margin-top: 12rpx;
    font-size: 22rpx;
    color: var(--ink4);
  }

  .food-item--combo {
    background: #fbf6ff;
    border: 2rpx solid #e4d4f5;
    border-radius: 20rpx;
    padding: 12rpx;
  }

  .food-check {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    border: 2rpx solid #cfe3d4;
    background: #fff;
    color: #fff;
    font-size: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .food-check.on {
    background: var(--g5);
    border-color: var(--g5);
  }

  .food-main {
    flex: 1;
    min-width: 0;
  }
  .food-line1,
  .food-line2 {
    display: flex;
    align-items: center;
    gap: 10rpx;
  }
  .food-line2 {
    margin-top: 8rpx;
  }
  .food-name {
    flex: 1;
    min-width: 0;
  }
  .food-qty {
    display: flex;
    align-items: center;
    gap: 2rpx;
    color: var(--ink3);
    font-size: 22rpx;
  }
  .qty-input {
    width: 70rpx;
    height: 56rpx;
  }
  .food-source {
    font-size: 20rpx;
    padding: 2rpx 10rpx;
    border-radius: 10rpx;
    color: #fff;
    flex-shrink: 0;
  }
  .src-stock {
    background: #f0a23b;
  }
  .src-upload {
    background: #8a9bb0;
  }
  .src-material {
    background: #4f9be0;
  }
  .src-combo {
    background: #a368e0;
  }
  .food-cal {
    display: flex;
    align-items: center;
    gap: 8rpx;
    flex: 1;
  }
  .cal-auto {
    font-size: 20rpx;
    padding: 4rpx 10rpx;
    border-radius: 10rpx;
    background: #eef6f0;
    color: var(--ink3);
    border: 2rpx solid #d6ebda;
  }
  .cal-auto.on {
    background: var(--g5);
    color: #fff;
    border-color: var(--g5);
  }
  .combo-detail {
    margin-top: 10rpx;
    padding: 10rpx;
    background: #f6f0ff;
    border-radius: 14rpx;
  }
  .combo-sub {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-bottom: 6rpx;
  }
  .combo-sub-name {
    flex: 1;
    height: 52rpx;
    border-radius: 12rpx;
    background: #fff;
    border: 2rpx solid #e4d4f5;
    padding: 0 14rpx;
    font-size: 22rpx;
  }
  .combo-sub-cal {
    width: 110rpx;
    height: 52rpx;
  }
  .combo-sub-src {
    font-size: 18rpx;
    padding: 2rpx 8rpx;
    border-radius: 8rpx;
    color: #fff;
  }
  .combo-sub-del {
    width: 40rpx;
    height: 40rpx;
    text-align: center;
    color: var(--red);
    font-size: 28rpx;
  }
  .combo-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 4rpx;
  }
  .combo-resynth {
    font-size: 20rpx;
    color: #a368e0;
  }
  .combo-total {
    font-size: 20rpx;
    color: var(--ink3);
  }
  .combo-btn {
    margin-top: 14rpx;
    padding: 18rpx;
    border-radius: 20rpx;
    background: #f3e9ff;
    border: 2rpx solid #d8bff5;
    text-align: center;
    font-size: 24rpx;
    font-weight: 600;
    color: #8a3fd0;
    cursor: pointer;
  }

  .picker-grid {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    padding: 8rpx 24rpx 24rpx;
  }

  .picker-sticker {
    width: calc(25% - 12rpx);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6rpx;
    cursor: pointer;
  }

  .picker-sticker-img {
    width: 100%;
    height: 120rpx;
    border-radius: 16rpx;
    background: rgba(0, 0, 0, 0.04);
  }

  .picker-sticker-name {
    font-size: 20rpx;
    color: var(--ink2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .picker-upload {
    border: 3rpx dashed rgba(37, 204, 93, 0.5);
    background: rgba(37, 204, 93, 0.06);
    border-radius: 16rpx;
    justify-content: center;
  }

  .picker-upload-plus {
    font-size: 44rpx;
  }

  /* 商品贴纸面板：tab + 新增 + 库存角标 */
  .picker-sheet--tabs {
    max-height: 78vh;
    display: flex;
    flex-direction: column;
  }

  .lib-tabs {
    display: flex;
    gap: 12rpx;
    padding: 4rpx 24rpx 12rpx;
  }

  .lib-tab {
    flex: 1;
    text-align: center;
    padding: 16rpx 0;
    border-radius: 16rpx;
    background: rgba(255, 255, 255, 0.6);
    border: 2rpx solid rgba(0, 0, 0, 0.06);
    font-size: 26rpx;
    font-weight: 600;
    color: var(--ink3);
    cursor: pointer;

    &.active {
      background: linear-gradient(135deg, #25cc5d, #1ba94a);
      border-color: transparent;
      color: #fff;
    }
  }

  .picker-new {
    border: 3rpx dashed rgba(124, 92, 255, 0.5);
    background: rgba(124, 92, 255, 0.06);
    border-radius: 16rpx;
    justify-content: center;
  }

  .picker-sticker.is-low {
    opacity: 0.55;
  }

  .picker-sticker-badge {
    font-size: 18rpx;
    color: var(--ink4);
    background: rgba(0, 0, 0, 0.05);
    border-radius: 999rpx;
    padding: 2rpx 10rpx;
  }

  .picker-sticker.is-low .picker-sticker-badge {
    color: #fff;
    background: #ff5d5d;
  }

  .refund-card {
    padding: 0 24rpx;
  }

  .refund-pick {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    height: 120rpx;
    border-radius: 24rpx;
    border: 3rpx dashed rgba(74, 108, 240, 0.45);
    background: rgba(255, 255, 255, 0.5);
    color: var(--ink3);
    cursor: pointer;
  }

  .refund-pick-plus {
    font-size: 40rpx;
    line-height: 1;
  }

  .refund-pick-text {
    font-size: 26rpx;
    font-weight: 600;
  }

  .refund-linked {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 20rpx 24rpx;
    border-radius: 24rpx;
    background: rgba(255, 255, 255, 0.7);
    border: 2rpx solid rgba(74, 108, 240, 0.25);
    cursor: pointer;
  }

  .refund-linked-icon {
    font-size: 40rpx;
  }

  .refund-linked-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    min-width: 0;
  }

  .refund-linked-cat {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--ink);
  }

  .refund-linked-meta {
    font-size: 22rpx;
    color: var(--ink4);
  }

  .refund-clear {
    flex: none;
    padding: 8rpx 20rpx;
    border-radius: 24rpx;
    background: rgba(255, 107, 107, 0.12);
    color: var(--red);
    font-size: 22rpx;
    font-weight: 600;
  }

  .picker-mask {
    position: fixed;
    inset: 0;
    background: rgba(15, 28, 20, 0.45);
    z-index: 50;
    display: flex;
    align-items: flex-end;
  }

  .picker-sheet {
    width: 100%;
    max-height: 70vh;
    background: #fff;
    border-radius: 32rpx 32rpx 0 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .picker-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28rpx 32rpx 16rpx;
    border-bottom: 2rpx solid rgba(0, 0, 0, 0.04);
  }

  .picker-title {
    font-size: 30rpx;
    font-weight: 800;
    color: var(--ink);
  }

  .picker-close {
    font-size: 40rpx;
    color: var(--ink4);
    line-height: 1;
  }

  .picker-list {
    flex: 1;
    min-height: 0;
    padding: 8rpx 24rpx 24rpx;
  }

  .picker-item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 22rpx 12rpx;
    border-bottom: 2rpx solid rgba(0, 0, 0, 0.04);
    cursor: pointer;

    &:active {
      background: rgba(37, 204, 93, 0.08);
    }
  }

  .picker-item-icon {
    font-size: 38rpx;
  }

  .picker-item-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    min-width: 0;
  }

  .picker-item-cat {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--ink);
  }

  .picker-item-meta {
    font-size: 21rpx;
    color: var(--ink4);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .picker-item-amt {
    flex: none;
    font-size: 28rpx;
    font-weight: 700;
    color: var(--ink2);
  }

  .picker-empty {
    text-align: center;
    color: var(--ink4);
    font-size: 24rpx;
    padding: 60rpx 0;
  }

  .save-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    padding: 8rpx 32rpx;
    padding-bottom: calc(40rpx + constant(safe-area-inset-bottom));
    padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.92) 40%,
      rgba(255, 255, 255, 0.98) 100%
    );
    backdrop-filter: blur(6rpx);
  }

  .save-main-btn {
    width: 100%;
    padding: 28rpx;
    border-radius: 32rpx;
    background: linear-gradient(135deg, #4fd974, #25cc5d);
    text-align: center;
    color: #fff;
    font-size: 30rpx;
    font-weight: 800;
    box-shadow: 0 8rpx 40rpx rgba(37, 204, 93, 0.3);
    cursor: pointer;

    &.loading {
      opacity: 0.7;
    }
  }
}
</style>
