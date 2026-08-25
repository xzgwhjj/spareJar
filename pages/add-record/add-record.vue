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
          <!-- 日期药丸（点击弹日期选择器） -->
          <picker mode="date" :value="draft.dateKey" @change="onDateChange">
            <!-- 待：图标 -->
            <view class="pill pill-date">
              <text class="pill-icon">📅</text>
              <text class="pill-text">{{ draft.dateKey }}</text>
            </view>
          </picker>

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
              
    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
</view>

          <!-- 成员药丸（含默认自己，点击可切换其他成员） -->
          <view
            v-for="m in members"
            :key="m._id"
            class="pill pill-date"
            :class="{ active: draft.memberIds.includes(m._id) }"
            @click="toggleMember(m._id)"
          >
            <template v-if="m.is_self">
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
            </template>
            <text class="pill-text">{{ m.name }}</text>
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

    <!-- 快捷入口：账本分类 / 付款账户 / 消耗囤货 / 餐次与热量 -->
    <view class="quick-entries">
      <view
        class="q-entry"
        v-for="(e, i) in quickEntries"
        :key="i"
        @click="openQuickEntry(e.key)"
      >
        <!-- 待：占位大图（超出矩形上方），后续替换为真实图片 -->
        <view class="q-thumb" :style="{ background: e.thumbBg }"></view>
        <!-- 右侧叠加：上方超出矩形的竖矩形 -->
        <view class="q-tag" :style="{ background: e.tagBg }"></view>
        <!-- 居左大字 -->
        <text class="q-title">{{ e.title }}</text>
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

    <!-- 账本选择弹窗 -->
    <view v-if="ledgerPickerShow" class="sheet-mask" @click="ledgerPickerShow = false">
      <view class="sheet" @click.stop>
        <view class="sheet-title">选择账本</view>
        <scroll-view scroll-y enhanced :show-scrollbar="false" class="sheet-scroll">
          <view
            v-for="l in ledgers"
            :key="l._id"
            class="sheet-item"
            :class="{ active: draft.ledgerId === l._id }"
            @click="onPickLedger(l._id)"
          >
            <text class="sheet-item-icon">{{ l.icon || "📒" }}</text>
            <text class="sheet-item-name">{{ l.name }}</text>
            <text v-if="draft.ledgerId === l._id" class="sheet-item-check">✓</text>
          </view>
        </scroll-view>
        <view class="sheet-cancel" @click="ledgerPickerShow = false">取消</view>
      </view>
    </view>

    <!-- 快捷入口弹框：选择账本分类 -->
    <view v-if="quickPopup === 'category'" class="sheet-mask" @click="closeQuickPopup">
      <view class="sheet" @click.stop>
        <view class="sheet-title">选择账本分类</view>
        <scroll-view scroll-x enhanced :show-scrollbar="false" class="group-tabs-scroll">
          <view class="group-tabs">
            <view
              v-for="(g, gi) in groupedCats"
              :key="g.code"
              class="group-tab"
              :class="{ active: activeGroup === gi }"
              @click="activeGroup = gi"
            >
              <text class="group-tab-icon">{{ g.icon }}</text>
              <text class="group-tab-name">{{ g.name }}</text>
            </view>
          </view>
        </scroll-view>
        <swiper
          class="cat-swiper"
          :current="activeGroup"
          @change="onGroupChange"
          :duration="250"
        >
          <swiper-item v-for="g in groupedCats" :key="g.code">
            <scroll-view scroll-y enhanced :show-scrollbar="false" class="cat-scroll">
              <view class="cat-grid">
                <view
                  v-for="c in g.cats"
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
        <view v-if="!groupedCats.length" class="empty-hint">暂无分类</view>
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
          :class="{ disabled: !repayFromId || !repayToId || !draft.amount }"
          @click="submitRepay"
          >确认还款 ¥{{ draft.amount || '0.00' }}</view
        >
        <view class="sheet-cancel" @click="closeQuickPopup">取消</view>
      </view>
    </view>

    <!-- 快捷入口弹框：消耗囤货（新功能，待实现） -->
    <view v-if="quickPopup === 'stock'" class="sheet-mask" @click="closeQuickPopup">
      <view class="sheet" @click.stop>
        <view class="sheet-title">消耗囤货</view>
        <view class="empty-hint">功能建设中…</view>
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
              @click="draft.mealType = mt.id"
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
            <view class="food-items">
              <view v-for="(f, i) in draft.foodItems" :key="i" class="food-item">
                <input class="food-name" placeholder="食物名" v-model="f.name" />
                <number-field
                  class="food-kcal"
                  :model-value="f.calories"
                  placeholder="热量"
                  title="食物热量"
                  :decimal-places="0"
                  :max-integer="6"
                  @update:model-value="(v) => (f.calories = v)"
                />
                <text class="food-kcal-unit">kcal</text>
                <view class="food-sticker" @click="pickFoodSticker(i)">
                  <image
                    v-if="f.sticker_image_url"
                    :src="f.sticker_image_url"
                    mode="aspectFill"
                    class="food-sticker-img"
                  />
                  <text v-else class="food-sticker-plus">🏷️</text>
                </view>
                <view class="food-del" @click="removeFoodItem(i)"><text>🗑️</text></view>
              </view>
            </view>
            <view class="add-food-btn" @click="addFoodItem"
              ><text>＋ 添加食物</text></view
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

      <view class="section-label">凭证图片</view>
      <view class="image-row">
        <view v-for="(img, idx) in draft.imageUrls" :key="idx" class="image-thumb">
          <image :src="img" mode="aspectFill" class="image-thumb-img" />
          <view class="image-remove" @click="removeImage(idx)">×</view>
        </view>
        <view v-if="draft.imageUrls.length < 9" class="image-add" @click="chooseImages">
          <text class="image-add-plus">＋</text>
          <text class="image-add-text">{{ uploading ? "上传中" : "添加" }}</text>
        </view>
      </view>

      <view class="section-label">商品贴纸</view>
      <view class="sticker-row">
        <view
          v-if="draft.stickerId || draft.stickerImageUrl"
          class="sticker-chosen"
          @click="clearSticker"
        >
          <image :src="stickerPreview" mode="aspectFill" class="sticker-chosen-img" />
          <view class="sticker-chosen-info">
            <text class="sticker-chosen-name">{{ stickerChosenName }}</text>
            <text class="sticker-chosen-tip">点击清除</text>
          </view>
        </view>
        <template v-else>
          <view class="sticker-add" @click="chooseStickerPhoto">
            <text class="sticker-add-plus">📷</text>
            <text class="sticker-add-text">拍照添加</text>
          </view>
          <view class="sticker-add" @click="openStickerLib">
            <text class="sticker-add-plus">🖼️</text>
            <text class="sticker-add-text">素材库</text>
          </view>
        </template>
      </view>

      <view class="scroll-bottom-gap" />
    </scroll-view>

    <!-- 素材库选择面板 -->
    <view v-if="showStickerLib" class="picker-mask" @click="showStickerLib = false">
      <view class="picker-sheet" @click.stop>
        <view class="picker-head">
          <text class="picker-title">从素材库选择</text>
          <text class="picker-close" @click="showStickerLib = false">×</text>
        </view>
        <scroll-view scroll-y enhanced :show-scrollbar="false" class="picker-grid">
          <view v-if="materialStickers.length === 0" class="picker-empty"
            >暂无素材贴纸，去贴纸库新建</view
          >
          <view
            v-for="s in materialStickers"
            :key="s._id"
            class="picker-sticker"
            @click="selectSticker(s)"
          >
            <image :src="s.image_url" mode="aspectFill" class="picker-sticker-img" />
            <text class="picker-sticker-name">{{ s.name }}</text>
          </view>
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
import { useUserStore, loadStickers } from "@/stores/user.js";
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
import { getGroupsByType } from "@/constants/categoryGroups.js";
import { yuanToFen, fenToYuanString } from "@/utils/money.js";
import { yuanToChinese } from "@/utils/chineseAmount.js";
import { cdn, resolveCover, getCloudTempUrl, getCloudTempUrls } from "@/utils/cdn.js";
import { todayDateKey } from "@/utils/date.js";

const userStore = useUserStore();

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
  ocrMeta: null, // OCR 识别元数据（来自拍照识别记账，失败兜底手动时带入）
  toAccountId: "", // 还款场景：收款负债账户
  // 阶段 11：餐次与热量（仅餐饮分类 + 已开启轻记录时生效）
  mealType: "lunch",
  calorieMode: "itemized", // whole / itemized / partial
  wholeOverride: "", // 整餐模式总热量
  foodItems: [], // [{ name, calories, sticker_id, sticker_image_url }]
});

const allCats = ref([]);
const ledgers = ref([]);
const members = ref([]); // 当前账本成员列表

// 快捷入口（占位大图，后续替换为真实图片）
const quickEntries = ref([
  {
    key: "category",
    title: "选择账本分类",
    thumbBg: "linear-gradient(135deg,#4fd974,#25cc5d)",
    tagBg: "rgba(37,204,93,0.18)",
  },
  {
    key: "account",
    title: "付款账户",
    thumbBg: "linear-gradient(135deg,#6aa9ff,#3d7bf0)",
    tagBg: "rgba(61,123,240,0.18)",
  },
  {
    key: "stock",
    title: "消耗囤货",
    thumbBg: "linear-gradient(135deg,#ffb86a,#ff8a3d)",
    tagBg: "rgba(255,138,61,0.18)",
  },
  {
    key: "meal",
    title: "餐次与热量",
    thumbBg: "linear-gradient(135deg,#ff8fae,#ff5d8f)",
    tagBg: "rgba(255,93,143,0.18)",
  },
  {
    key: "repay",
    title: "还款",
    thumbBg: "linear-gradient(135deg,#ff7a8a,#f0455f)",
    tagBg: "rgba(240,69,95,0.18)",
  },
]);

// 快捷入口点击 -> 弹出对应选择框（分类/付款账户/消耗囤货/餐次与热量/还款）
const quickPopup = ref(""); // '' | 'category' | 'account' | 'stock' | 'meal' | 'repay'
function openQuickEntry(type) {
  if (type === "category" && !groupedCats.value.length) {
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
  // 真实功能占位：后续接相册/拍照
  if (mode === "image") {
    uni.showToast({ title: "凭证图片（待接入）", icon: "none" });
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
const amountMirrorText = computed(() => draft.amount || "0.00");
const inputWidth = ref("180px");
// 金额输入统一走 App.vue 全局数字键盘（AmountKeyboard 单例 + NumberField）
function onAmountKeyInput(val) {
  draft.amount = val;
}
const saving = ref(false);
const uploading = ref(false);
// 当前选中的分类分组（swiper 页索引）
const activeGroup = ref(0);
// 关联原支出：原交易对象 + 选择器弹层 + 候选列表
const originalTx = ref(null);
const showOriginalPicker = ref(false);
const originalList = ref([]);

// 普通商品贴纸：一次性拍照图 / 素材库选择
const showStickerLib = ref(false);
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
const foodCatId = computed(() => {
  const c = (userStore.state.categories || []).find(
    (x) => x.name === "餐饮" && x.type === "expense"
  );
  return c ? c._id : null;
});
const isFoodMeal = computed(
  () =>
    mealEnabled.value &&
    draft.type === "expense" &&
    draft.categoryId === foodCatId.value &&
    !editingId.value
);
const MEAL_TYPES = [
  { id: "breakfast", label: "🌅 早餐" },
  { id: "lunch", label: "☀️ 午餐" },
  { id: "dinner", label: "🌙 晚餐" },
  { id: "snack", label: "🍎 加餐" },
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
  draft.foodItems.push({ name: "", calories: "", sticker_id: "", sticker_image_url: "" });
}
function removeFoodItem(i) {
  draft.foodItems.splice(i, 1);
}
function pickFoodSticker(i) {
  if (!materialStickers.value.length) {
    uni.showToast({ title: "暂无素材贴纸", icon: "none" });
    return;
  }
  const items = materialStickers.value.map((s) => s.name || "贴纸");
  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      const s = materialStickers.value[res.tapIndex];
      if (s) {
        draft.foodItems[i].sticker_id = s._id;
        draft.foodItems[i].sticker_image_url = s.image_url || "";
      }
    },
  });
}
const dailyAccounts = computed(() =>
  (userStore.state.assets || [])
    .filter((a) => a.account_class === "daily")
    .map((a) => ({
      _id: a._id,
      name: a.name,
      icon: ASSET_SUBTYPE_ICON[a.account_subtype] || cdn("/app_static/images/icon_other.png"),
    }))
);
// 负债账户列表（还款/刷卡消费联动用）
const liabilityAccounts = computed(() =>
  (userStore.state.assets || [])
    .filter((a) => a.account_class === "liability")
    .map((a) => ({
      _id: a._id,
      name: a.name,
      icon: ASSET_SUBTYPE_ICON[a.account_subtype] || cdn("/app_static/images/icon_other.png"),
      balance: a.current_balance || 0,
    }))
);
// 还款弹框：付款日常账户 + 收款负债账户
const repayFromId = ref("");
const repayToId = ref("");
const stickerPreview = computed(() => {
  if (draft.stickerImageUrl) return draft.stickerImageUrl;
  const s = materialStickers.value.find((x) => x._id === draft.stickerId);
  return s ? s.image_url : "";
});
const stickerChosenName = computed(() => {
  if (draft.stickerImageUrl && !draft.stickerId) return "拍照贴纸";
  const s = materialStickers.value.find((x) => x._id === draft.stickerId);
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
        const url = (up && (up.url || up.fileID)) || "";
        if (url) {
          draft.stickerImageUrl = url;
          draft.stickerId = ""; // 拍照与素材库二选一
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

function selectSticker(s) {
  draft.stickerId = s._id;
  draft.stickerImageUrl = ""; // 素材库与拍照二选一
  showStickerLib.value = false;
}

function clearSticker() {
  draft.stickerId = "";
  draft.stickerImageUrl = "";
}

// 编辑模式：从首页账单点击进入时携带 ?id=，加载原交易预填
const editingId = ref("");
const editingOriginalType = ref("");
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

// 按二级分组折叠：顺序遵循 constants/categoryGroups.js 的展示顺序
const groupedCats = computed(() => {
  const groups = getGroupsByType(draft.type);
  return groups
    .map((g) => ({
      code: g.code,
      name: g.name,
      icon: g.icon,
      cats: allCats.value.filter((c) => c.type === draft.type && c.group === g.code),
    }))
    .filter((g) => g.cats.length);
});

function setType(t) {
  if (editingId.value) return; // 编辑模式不允许切换类型
  if (draft.type === t) return;
  draft.type = t;
  draft.categoryId = ""; // 切换类型清空已选分类（分类按 type 隔离）
  activeGroup.value = 0; // 回到第一个分组
  if (t !== "refund") {
    // 离开退款类型时清除关联（分类由普通分组重新选择）
    draft.relatedId = "";
    originalTx.value = null;
  }
}

function onGroupChange(e) {
  activeGroup.value = e.detail.current;
}

/** 找到包含指定分类的分组索引（用于编辑预填时定位 swiper） */
function findGroupIndexByCategory(catId) {
  if (!catId) return 0;
  const idx = groupedCats.value.findIndex((g) => g.cats.some((c) => c._id === catId));
  return idx >= 0 ? idx : 0;
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
    draft.stickerImageUrl = tx.sticker_image_url || "";
    if (tx.type === "refund" && tx.related_transaction_id) {
      // 退款：加载原支出用于展示与冲减原分类
      draft.relatedId = tx.related_transaction_id;
      await loadRelatedOriginal(tx.related_transaction_id);
    } else {
      activeGroup.value = findGroupIndexByCategory(draft.categoryId);
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
    draft.foodItems = (m.food_items || []).map((f) => ({
      name: f.name || "",
      calories: String(f.calories || 0),
      sticker_id: f.sticker_id || "",
      sticker_image_url: f.sticker_image_url || "",
    }));
    activeGroup.value = findGroupIndexByCategory(draft.categoryId);
  } catch (err) {
    console.error("[add-record] load meal for edit failed", err);
  }
}

function onDateChange(e) {
  draft.dateKey = e.detail.value;
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
      const url = (up && (up.url || up.fileID)) || "";
      if (url) draft.imageUrls.push(url);
    }
  } catch (err) {
    console.error("[add-record] upload image failed", err);
    uni.showToast({ title: "图片上传失败", icon: "none" });
  } finally {
    uploading.value = false;
  }
}

/** 移除已选图片 */
function removeImage(idx) {
  draft.imageUrls.splice(idx, 1);
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
      group: c.group,
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
        member_ids: draft.memberIds,
        tags: draft.tags,
        meal_type: draft.mealType,
        calorie_mode: draft.calorieMode,
        whole_override: Math.round(Number(draft.wholeOverride) || 0),
        confirmed_calories: confirmedCalories.value,
        food_items: draft.foodItems.map((f) => ({
          name: f.name,
          calories: Math.round(Number(f.calories) || 0),
          sticker_id: f.sticker_id || null,
          sticker_image_url: f.sticker_image_url || null,
        })),
      });
    } else if (isFoodMeal.value) {
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
        member_ids: draft.memberIds,
        tags: draft.tags,
        meal_type: draft.mealType,
        calorie_mode: draft.calorieMode,
        whole_override: Math.round(Number(draft.wholeOverride) || 0),
        confirmed_calories: confirmedCalories.value,
        food_items: draft.foodItems.map((f) => ({
          name: f.name,
          calories: Math.round(Number(f.calories) || 0),
          sticker_id: f.sticker_id || null,
          sticker_image_url: f.sticker_image_url || null,
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
        related_transaction_id: draft.relatedId || null,
        account_id: draft.accountId || null,
        ocr_meta: draft.ocrMeta || null,
        member_ids: draft.memberIds,
        tags: draft.tags,
      });
    }

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
  if (!draft.amount || draft.amount === "." || Number(draft.amount || 0) <= 0) {
    uni.showToast({ title: "请输入还款金额", icon: "none" });
    return;
  }
  let fen;
  try {
    fen = yuanToFen(draft.amount);
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
    max-width: 560rpx;
    padding: 24rpx 32rpx 24rpx;
    background: #ffffff;
    border-radius: 28rpx;
    box-shadow: 0 8rpx 28rpx rgba(0, 0, 0, 0.06);
    z-index: 2;
  }

  // 横排药丸容器（一横排，不换行，可横向滚动）
  .pill-row {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: center;
    gap: 16rpx;
    overflow-x: auto;
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

  .sheet-scroll {
    max-height: 48vh;
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
    margin-top: 20rpx;
    padding-top: 20rpx;
    border-top: 2rpx solid rgba(0, 0, 0, 0.04);
    padding-left: 24rpx;
    padding-right: 24rpx;
    box-sizing: border-box;
  }

  .info-note-inline {
    width: 100%;
    height: 60rpx;
    padding: 0 24rpx;
    border-radius: 20rpx;
    background: #ffffff;
    box-shadow: 0 8rpx 28rpx rgba(0, 0, 0, 0.06);
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
    margin-top: 28rpx;
  }

  // 占位大图：超出矩形上方
  .q-thumb {
    position: absolute;
    top: -36rpx;
    left: 70%;
    transform: translateX(-50%);
    width: 96rpx;
    height: 96rpx;
    border-radius: 20rpx;
    box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.12);
  }

  // 右侧叠加：上方超出矩形的竖矩形
  .q-tag {
    position: absolute;
    top: -20rpx;
    right: -6rpx;
    width: 28rpx;
    height: 60rpx;
    border-radius: 10rpx;
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

  .group-tabs-scroll {
    white-space: nowrap;
    padding: 4rpx 24rpx 0;
  }

  .group-tabs {
    display: inline-flex;
    gap: 12rpx;
  }

  .group-tab {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 6rpx;
    padding: 10rpx 22rpx;
    border-radius: 32rpx;
    background: rgba(255, 255, 255, 0.6);
    font-size: 22rpx;
    font-weight: 600;
    color: var(--ink3);
    cursor: pointer;

    &.active {
      background: linear-gradient(135deg, #4fd974, #25cc5d);
      color: #fff;
    }
  }

  .group-tab-icon {
    font-size: 24rpx;
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
