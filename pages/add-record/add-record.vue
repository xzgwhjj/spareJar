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
      <view class="type-switch">
        <view class="type-btn expense" :class="{ active: draft.type === 'expense', disabled: editingId }" @click="setType('expense')">支出</view>
        <view class="type-btn income" :class="{ active: draft.type === 'income', disabled: editingId }" @click="setType('income')">收入</view>
        <view class="type-btn refund" :class="{ active: draft.type === 'refund', disabled: editingId }" @click="setType('refund')">退款</view>
      </view>

      <view class="amount-display">
        <text class="amount-symbol">¥</text>
        <text class="amount-value" :class="{ empty: !draft.amount }">{{ displayAmount }}</text>
        <text class="amount-type" :class="draft.type">{{ typeLabel }}</text>
        <text class="amount-upper" :class="{ placeholder: !amountInChinese }">{{ amountInChinese || '大写金额' }}</text>
      </view>

      <view class="note-row">
        <input class="note-input" v-model="draft.note" placeholder="添加备注…" maxlength="200" />
      </view>
    </view>

    <!-- 可滚动：分类（按 group 折叠）/ 账本 / 日期 -->
    <scroll-view scroll-y enhanced :show-scrollbar="false" class="page-scroll">
      <template v-if="draft.type !== 'refund'">
        <view class="section-label">选择分类</view>
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
        <swiper class="cat-swiper" :current="activeGroup" @change="onGroupChange" :duration="250">
          <swiper-item v-for="g in groupedCats" :key="g.code">
            <scroll-view scroll-y enhanced :show-scrollbar="false" class="cat-scroll">
              <view class="cat-grid">
                <view
                  v-for="c in g.cats"
                  :key="c._id"
                  class="cat-chip"
                  :class="{ active: draft.categoryId === c._id }"
                  @click="draft.categoryId = c._id"
                >
                  <text class="cat-emoji">{{ c.icon }}</text>
                  <text class="cat-name">{{ c.name }}</text>
                </view>
              </view>
            </scroll-view>
          </swiper-item>
        </swiper>
        <view v-if="!groupedCats.length" class="empty-hint">暂无分类</view>
      </template>

      <view v-else class="refund-card">
        <view class="section-label">关联原支出（冲减原分类）</view>
        <view v-if="!draft.relatedId" class="refund-pick" @click="openOriginalPicker">
          <text class="refund-pick-plus">＋</text>
          <text class="refund-pick-text">选择要退款的原支出</text>
        </view>
        <view v-else class="refund-linked" @click="openOriginalPicker">
          <text class="refund-linked-icon">{{ originalCat.icon }}</text>
          <view class="refund-linked-info">
            <text class="refund-linked-cat">{{ originalCat.name }}</text>
            <text class="refund-linked-meta">原支出 ¥{{ originalAmountYuan }} · {{ originalTx.date_key }}</text>
          </view>
          <view class="refund-clear" @click.stop="clearRelated">清除</view>
        </view>
      </view>

      <view class="section-label">选择账本</view>
      <scroll-view scroll-x enhanced :show-scrollbar="false" class="ledger-scroll">
        <view class="ledger-row">
          <view
            v-for="l in ledgers"
            :key="l._id"
            class="ledger-chip"
            :class="{ active: draft.ledgerId === l._id }"
            @click="draft.ledgerId = l._id"
          >
            <text>{{ l.icon || '📒' }} {{ l.name }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="section-label">付款账户（可选）</view>
      <scroll-view scroll-x enhanced :show-scrollbar="false" class="ledger-scroll">
        <view class="ledger-row">
          <view class="ledger-chip" :class="{ active: !draft.accountId }" @click="draft.accountId = ''">不关联</view>
          <view
            v-for="acc in dailyAccounts"
            :key="acc._id"
            class="ledger-chip"
            :class="{ active: draft.accountId === acc._id }"
            @click="draft.accountId = acc._id"
          >
            <text>{{ acc.icon }} {{ acc.name }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 阶段 11：餐次与热量（仅餐饮分类 + 已开启轻记录） -->
      <view v-if="isFoodMeal" class="meal-section">
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
          <view class="seg-btn" :class="{ active: draft.calorieMode === 'whole' }" @click="draft.calorieMode = 'whole'">整餐</view>
          <view class="seg-btn" :class="{ active: draft.calorieMode === 'itemized' }" @click="draft.calorieMode = 'itemized'">分项</view>
          <view class="seg-btn" :class="{ active: draft.calorieMode === 'partial' }" @click="draft.calorieMode = 'partial'">部分分项</view>
        </view>

        <view v-if="draft.calorieMode === 'whole'" class="field-row">
          <text class="field-label">本餐总热量</text>
          <input class="field-input" type="digit" placeholder="如 600" v-model="draft.wholeOverride" />
          <text class="field-unit">kcal</text>
        </view>

        <block v-if="draft.calorieMode !== 'whole'">
          <view class="food-items">
            <view v-for="(f, i) in draft.foodItems" :key="i" class="food-item">
              <input class="food-name" placeholder="食物名" v-model="f.name" />
              <input class="food-kcal" type="digit" placeholder="热量" v-model="f.calories" />
              <text class="food-kcal-unit">kcal</text>
              <view class="food-sticker" @click="pickFoodSticker(i)">
                <image v-if="f.sticker_image_url" :src="f.sticker_image_url" mode="aspectFill" class="food-sticker-img" />
                <text v-else class="food-sticker-plus">🏷️</text>
              </view>
              <view class="food-del" @click="removeFoodItem(i)"><text>🗑️</text></view>
            </view>
          </view>
          <view class="add-food-btn" @click="addFoodItem"><text>＋ 添加食物</text></view>
          <view v-if="draft.calorieMode === 'partial'" class="field-row" style="margin-top:12rpx;">
            <text class="field-label">确认总热量</text>
            <input class="field-input" type="digit" :placeholder="String(itemizedSum)" v-model="draft.wholeOverride" />
            <text class="field-unit">kcal</text>
          </view>
          <text class="food-sum" v-else>分项合计：{{ itemizedSum }} kcal</text>
        </block>
      </view>

      <view class="section-label">日期</view>
      <picker mode="date" :value="draft.dateKey" @change="onDateChange">
        <view class="date-row">
          <text class="date-text">{{ draft.dateKey }}</text>
          <text class="date-arrow">›</text>
        </view>
      </picker>

      <view class="section-label">凭证图片</view>
      <view class="image-row">
        <view v-for="(img, idx) in draft.imageUrls" :key="idx" class="image-thumb">
          <image :src="img" mode="aspectFill" class="image-thumb-img" />
          <view class="image-remove" @click="removeImage(idx)">×</view>
        </view>
        <view v-if="draft.imageUrls.length < 9" class="image-add" @click="chooseImages">
          <text class="image-add-plus">＋</text>
          <text class="image-add-text">{{ uploading ? '上传中' : '添加' }}</text>
        </view>
      </view>

      <view class="section-label">商品贴纸</view>
      <view class="sticker-row">
        <view v-if="draft.stickerId || draft.stickerImageUrl" class="sticker-chosen" @click="clearSticker">
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
          <view v-if="materialStickers.length === 0" class="picker-empty">暂无素材贴纸，去贴纸库新建</view>
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

    <!-- 数字键盘 -->
    <view class="keypad-area">
      <view v-for="(row, ri) in keyRows" :key="ri" class="key-row">
        <view
          v-for="k in row"
          :key="k"
          class="key-btn"
          :class="{ function: k === '⌫' || k === '.' }"
          @click="handleKey(k)"
        >
          <text>{{ k }}</text>
        </view>
      </view>
    </view>

    <!-- 保存 -->
    <view class="save-bar">
      <view class="save-main-btn" :class="{ loading: saving }" @click="saveRecord">
        <text>{{ saving ? '保存中…' : '保存记录' }}</text>
      </view>
    </view>

    <!-- 关联原支出选择器 -->
    <view v-if="showOriginalPicker" class="picker-mask" @click="showOriginalPicker = false">
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
              <text class="picker-item-meta">{{ o.date_key }} · {{ o.note || '无备注' }}</text>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useUserStore, loadStickers } from '@/stores/user.js'
import { consumeOcrPrefill } from '@/stores/ocrPrefill.js'
import { createTransaction, updateTransaction, getTransaction, listTransactions, listLedgers, listCategories } from '@/api/sparejar.js'
import { getGroupsByType } from '@/constants/categoryGroups.js'
import { yuanToFen, fenToYuanString } from '@/utils/money.js'
import { yuanToChinese } from '@/utils/chineseAmount.js'
import { todayDateKey } from '@/utils/date.js'

const userStore = useUserStore()

const draft = reactive({
  type: 'expense',
  amount: '',
  categoryId: '',
  note: '',
  dateKey: todayDateKey(),
  ledgerId: '',
  accountId: '', // 关联付款账户（资产账户，可选）
  imageUrls: [],
  relatedId: '', // 关联的原支出交易 _id（退款冲减原分类）
  stickerId: '', // 绑定的普通素材贴纸（stickers._id）
  stickerImageUrl: '', // 一次性拍照贴纸图（不入库 stickers）
  ocrMeta: null, // OCR 识别元数据（来自拍照识别记账，失败兜底手动时带入）
  // 阶段 11：餐次与热量（仅餐饮分类 + 已开启轻记录时生效）
  mealType: 'lunch',
  calorieMode: 'itemized', // whole / itemized / partial
  wholeOverride: '', // 整餐模式总热量
  foodItems: [] // [{ name, calories, sticker_id, sticker_image_url }]
})

const allCats = ref([])
const ledgers = ref([])
const saving = ref(false)
const uploading = ref(false)
// 当前选中的分类分组（swiper 页索引）
const activeGroup = ref(0)
// 关联原支出：原交易对象 + 选择器弹层 + 候选列表
const originalTx = ref(null)
const showOriginalPicker = ref(false)
const originalList = ref([])

// 普通商品贴纸：一次性拍照图 / 素材库选择
const showStickerLib = ref(false)
const materialStickers = computed(() => (userStore.state.stickers || []).filter((s) => s.type === 'material'))
// 阶段 10：可选付款账户（仅日常账户可作为消费来源）
const ASSET_SUBTYPE_ICON = {
  wechat: '💚', alipay: '💙', bank: '🏦', cash: '💵',
  provident_fund: '🏠', insurance: '🛡️',
  fund: '📈', stock: '📊', bond: '📜', gold: '🪙', wealth: '💼', other: '📦'
}
// 阶段 11：餐次与热量
const mealEnabled = computed(() => !!(userStore.state.settings && userStore.state.settings.meal_tracking_enabled))
const foodCatId = computed(() => {
  const c = (userStore.state.categories || []).find((x) => x.name === '餐饮' && x.type === 'expense')
  return c ? c._id : null
})
const isFoodMeal = computed(() =>
  mealEnabled.value && draft.type === 'expense' && draft.categoryId === foodCatId.value && !editingId.value
)
const MEAL_TYPES = [
  { id: 'breakfast', label: '🌅 早餐' },
  { id: 'lunch', label: '☀️ 午餐' },
  { id: 'dinner', label: '🌙 晚餐' },
  { id: 'snack', label: '🍎 加餐' }
]
const itemizedSum = computed(() => draft.foodItems.reduce((s, f) => s + (Math.round(Number(f.calories) || 0)), 0))
// 确认总热量：整餐模式取 override；分项/部分分项取分项之和（部分分项用户可改 wholeOverride 作为最终值）
const confirmedCalories = computed(() => {
  if (draft.calorieMode === 'whole') return Math.round(Number(draft.wholeOverride) || 0)
  if (draft.calorieMode === 'partial' && draft.wholeOverride !== '') return Math.round(Number(draft.wholeOverride) || 0)
  return itemizedSum.value
})

function addFoodItem() {
  draft.foodItems.push({ name: '', calories: '', sticker_id: '', sticker_image_url: '' })
}
function removeFoodItem(i) {
  draft.foodItems.splice(i, 1)
}
function pickFoodSticker(i) {
  if (!materialStickers.value.length) {
    uni.showToast({ title: '暂无素材贴纸', icon: 'none' })
    return
  }
  const items = materialStickers.value.map((s) => s.name || '贴纸')
  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      const s = materialStickers.value[res.tapIndex]
      if (s) {
        draft.foodItems[i].sticker_id = s._id
        draft.foodItems[i].sticker_image_url = s.image_url || ''
      }
    }
  })
}
const dailyAccounts = computed(() =>
  (userStore.state.assets || [])
    .filter((a) => a.account_class === 'daily')
    .map((a) => ({ _id: a._id, name: a.name, icon: ASSET_SUBTYPE_ICON[a.account_subtype] || '💳' }))
)
const stickerPreview = computed(() => {
  if (draft.stickerImageUrl) return draft.stickerImageUrl
  const s = materialStickers.value.find((x) => x._id === draft.stickerId)
  return s ? s.image_url : ''
})
const stickerChosenName = computed(() => {
  if (draft.stickerImageUrl && !draft.stickerId) return '拍照贴纸'
  const s = materialStickers.value.find((x) => x._id === draft.stickerId)
  return s ? s.name : '已选贴纸'
})

function chooseStickerPhoto() {
  if (uploading.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const p = (res.tempFilePaths || [])[0]
      if (!p) return
      uploading.value = true
      try {
        const ext = (p.split('.').pop() || 'png').split('?')[0].toLowerCase()
        const cloudPath = `transactions/${userStore.state.uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const up = await uniCloud.uploadFile({ filePath: p, cloudPath })
        const url = (up && (up.url || up.fileID)) || ''
        if (url) {
          draft.stickerImageUrl = url
          draft.stickerId = '' // 拍照与素材库二选一
        }
      } catch (err) {
        console.error('[add-record] upload sticker failed', err)
        uni.showToast({ title: '贴纸图片上传失败', icon: 'none' })
      } finally {
        uploading.value = false
      }
    }
  })
}

function openStickerLib() {
  showStickerLib.value = true
}

function selectSticker(s) {
  draft.stickerId = s._id
  draft.stickerImageUrl = '' // 素材库与拍照二选一
  showStickerLib.value = false
}

function clearSticker() {
  draft.stickerId = ''
  draft.stickerImageUrl = ''
}

// 编辑模式：从首页账单点击进入时携带 ?id=，加载原交易预填
const editingId = ref('')
const editingOriginalType = ref('')
// 阶段 11：餐次编辑（从餐次详情进入，携带 ?mealId=）
const editingMealId = ref('')

const pageTitle = computed(() => (editingId.value || editingMealId.value) ? '编辑餐次' : '记一笔')

const keyRows = [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], ['.', '0', '⌫']]

const displayAmount = computed(() => draft.amount || '0.00')

// 实时人民币大写（随金额输入变化）
const amountInChinese = computed(() => yuanToChinese(draft.amount))

// 金额类型标签（支出/收入/退款）
const typeLabel = computed(() => {
  if (draft.type === 'expense') return '支出'
  if (draft.type === 'refund') return '退款'
  return '收入'
})

// 关联原支出后，原分类信息（用于展示与冲减原分类）
const originalCat = computed(() => {
  const id = originalTx.value && originalTx.value.category_id
  if (!id) return { icon: '📦', name: '原分类' }
  const c = allCats.value.find((x) => x._id === id)
  return c ? { icon: c.icon, name: c.name } : { icon: '📦', name: '原分类' }
})
const originalAmountYuan = computed(() => {
  const amt = originalTx.value && originalTx.value.amount
  return amt ? fenToYuanString(amt) : '0.00'
})

// 按二级分组折叠：顺序遵循 constants/categoryGroups.js 的展示顺序
const groupedCats = computed(() => {
  const groups = getGroupsByType(draft.type)
  return groups
    .map((g) => ({
      code: g.code,
      name: g.name,
      icon: g.icon,
      cats: allCats.value.filter((c) => c.type === draft.type && c.group === g.code)
    }))
    .filter((g) => g.cats.length)
})

function setType(t) {
  if (editingId.value) return // 编辑模式不允许切换类型
  if (draft.type === t) return
  draft.type = t
  draft.categoryId = '' // 切换类型清空已选分类（分类按 type 隔离）
  activeGroup.value = 0 // 回到第一个分组
  if (t !== 'refund') {
    // 离开退款类型时清除关联（分类由普通分组重新选择）
    draft.relatedId = ''
    originalTx.value = null
  }
}

function onGroupChange(e) {
  activeGroup.value = e.detail.current
}

/** 找到包含指定分类的分组索引（用于编辑预填时定位 swiper） */
function findGroupIndexByCategory(catId) {
  if (!catId) return 0
  const idx = groupedCats.value.findIndex((g) => g.cats.some((c) => c._id === catId))
  return idx >= 0 ? idx : 0
}

async function loadTransactionForEdit(id) {
  const uid = userStore.state.uid
  if (!uid) return
  try {
    // 走云函数读取，禁止前端直连数据库
    const tx = await getTransaction(id)
    if (!tx || tx.user_id !== uid) {
      uni.showToast({ title: '账目不存在', icon: 'none' })
      return
    }
    editingId.value = id
    editingOriginalType.value = tx.type
    draft.type = (tx.type === 'income' || tx.type === 'transfer') ? 'income'
      : (tx.type === 'refund' ? 'refund' : 'expense')
    draft.amount = fenToYuanString(tx.amount)
    draft.categoryId = tx.category_id || ''
    draft.ledgerId = tx.ledger_id || ''
    draft.note = tx.note || ''
    draft.dateKey = tx.date_key || todayDateKey()
    draft.imageUrls = Array.isArray(tx.image_urls) ? tx.image_urls.slice() : []
    draft.stickerId = tx.sticker_id || ''
    draft.stickerImageUrl = tx.sticker_image_url || ''
    if (tx.type === 'refund' && tx.related_transaction_id) {
      // 退款：加载原支出用于展示与冲减原分类
      draft.relatedId = tx.related_transaction_id
      await loadRelatedOriginal(tx.related_transaction_id)
    } else {
      activeGroup.value = findGroupIndexByCategory(draft.categoryId)
    }
  } catch (err) {
    console.error('[add-record] load transaction for edit failed', err)
  }
}

// 阶段 11：餐次编辑预填
async function loadMealForEdit(id) {
  try {
    const m = await userStore.getMealAction(id)
    if (!m) {
      uni.showToast({ title: '餐次不存在', icon: 'none' })
      return
    }
    const tx = m.transaction || {}
    editingMealId.value = id
    draft.type = 'expense'
    draft.amount = fenToYuanString(tx.amount || 0)
    draft.categoryId = tx.category_id || foodCatId.value
    draft.ledgerId = tx.ledger_id || draft.ledgerId
    draft.note = tx.note || ''
    draft.dateKey = tx.date_key || todayDateKey()
    draft.accountId = tx.account_id || ''
    draft.imageUrls = Array.isArray(tx.image_urls) ? tx.image_urls.slice() : []
    draft.mealType = m.meal_type || 'lunch'
    draft.calorieMode = m.calorie_mode || 'itemized'
    draft.wholeOverride = (m.calorie_mode === 'whole' || m.calorie_mode === 'partial')
      ? String(m.confirmed_calories || 0)
      : ''
    draft.foodItems = (m.food_items || []).map((f) => ({
      name: f.name || '',
      calories: String(f.calories || 0),
      sticker_id: f.sticker_id || '',
      sticker_image_url: f.sticker_image_url || ''
    }))
    activeGroup.value = findGroupIndexByCategory(draft.categoryId)
  } catch (err) {
    console.error('[add-record] load meal for edit failed', err)
  }
}

function handleKey(k) {
  if (k === '⌫') {
    draft.amount = draft.amount.slice(0, -1)
  } else if (k === '.') {
    if (!draft.amount.includes('.')) draft.amount += k
  } else {
    const intPart = draft.amount.split('.')[0]
    if (!draft.amount.includes('.') && intPart.length >= 8) return // 整数位上限 8 位
    if (draft.amount.includes('.') && draft.amount.split('.')[1]?.length >= 2) return // 小数位上限 2 位
    draft.amount += k
  }
}

function onDateChange(e) {
  draft.dateKey = e.detail.value
}

const MAX_IMAGES = 9

/** 选择图片（最多 9 张） */
function chooseImages() {
  if (uploading.value) return
  const remain = MAX_IMAGES - draft.imageUrls.length
  if (remain <= 0) return
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    success: async (res) => {
      const paths = (res.tempFilePaths || []).filter(Boolean)
      if (paths.length) await uploadImages(paths)
    }
  })
}

/** 上传选中的图片到 uniCloud 存储，URL 写入 draft.imageUrls */
async function uploadImages(paths) {
  const uid = userStore.state.uid
  if (!uid) return
  uploading.value = true
  try {
    for (const p of paths) {
      if (draft.imageUrls.length >= MAX_IMAGES) break
      const ext = (p.split('.').pop() || 'png').split('?')[0].toLowerCase()
      const cloudPath = `transactions/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const up = await uniCloud.uploadFile({ filePath: p, cloudPath })
      const url = (up && (up.url || up.fileID)) || ''
      if (url) draft.imageUrls.push(url)
    }
  } catch (err) {
    console.error('[add-record] upload image failed', err)
    uni.showToast({ title: '图片上传失败', icon: 'none' })
  } finally {
    uploading.value = false
  }
}

/** 移除已选图片 */
function removeImage(idx) {
  draft.imageUrls.splice(idx, 1)
}

/** 加载近期支出记录，供退款关联选择 */
async function loadOriginalExpenses() {
  const uid = userStore.state.uid
  if (!uid) return
  try {
    // 走云函数读取，禁止前端直连数据库
    const list = await listTransactions({ type: 'expense', limit: 40, orderBy: 'transaction_at', orderDir: 'desc' })
    originalList.value = (list || []).map((t) => ({
      _id: t._id,
      category_id: t.category_id,
      amount: t.amount,
      date_key: t.date_key,
      note: t.note || ''
    }))
  } catch (err) {
    console.error('[add-record] load original expenses failed', err)
  }
}

/** 分类图标/名称查表（基于已加载的 allCats） */
function categoryIconOf(catId) {
  const c = allCats.value.find((x) => x._id === catId)
  return c ? c.icon : '📦'
}
function categoryNameOf(catId) {
  const c = allCats.value.find((x) => x._id === catId)
  return c ? c.name : '未分类'
}

/** 打开关联原支出选择器 */
function openOriginalPicker() {
  if (editingId.value) return // 编辑模式不允许更换关联
  showOriginalPicker.value = true
}

/** 选中原支出：自动带出分类（冲减原分类）并预填全额退款金额 */
function selectOriginal(o) {
  draft.relatedId = o._id
  originalTx.value = o
  draft.categoryId = o.category_id || '' // 退款沿用原分类，冲减原分类统计
  draft.amount = fenToYuanString(o.amount) // 默认全额退款，可改部分
  showOriginalPicker.value = false
}

/** 清除关联 */
function clearRelated() {
  if (editingId.value) return
  draft.relatedId = ''
  originalTx.value = null
  draft.categoryId = ''
  draft.amount = ''
}

/** 编辑退款时按 related_transaction_id 加载原支出展示 */
async function loadRelatedOriginal(id) {
  const uid = userStore.state.uid
  if (!uid) return
  try {
    // 走云函数读取，禁止前端直连数据库
    const o = await getTransaction(id)
    if (o && o.user_id === uid) {
      originalTx.value = o
      draft.categoryId = o.category_id || draft.categoryId
    }
  } catch (err) {
    console.error('[add-record] load related original failed', err)
  }
}

async function loadCategories() {
  const uid = userStore.state.uid
  if (!uid) return
  try {
    // 走云函数读取，禁止前端直连数据库
    const list = await listCategories()
    allCats.value = (list || []).map((c) => ({
      _id: c._id,
      type: c.type,
      group: c.group,
      name: c.name,
      icon: c.icon
    }))
  } catch (err) {
    console.error('[add-record] load categories failed', err)
  }
}

async function loadLedgers() {
  const uid = userStore.state.uid
  if (!uid) return
  try {
    // 走云函数读取，禁止前端直连数据库
    const list = await listLedgers()
    ledgers.value = (list || [])
      .filter((l) => !l.deleted_at)
      .map((l) => ({ _id: l._id, name: l.name, icon: l.icon }))
    const def = ledgers.value.find((l) => l._id === userStore.state.defaultLedgerId)
    draft.ledgerId = (def || ledgers.value[0] || {})._id || ''
  } catch (err) {
    console.error('[add-record] load ledgers failed', err)
  }
}

onMounted(async () => {
  if (!userStore.state.uid) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  const pages = getCurrentPages()
  const cur = pages[pages.length - 1]
  const editId = cur && cur.options ? cur.options.id : ''
  const mealIdOpt = cur && cur.options ? cur.options.mealId : ''
  const ledgerIdOpt = cur && cur.options ? cur.options.ledger_id : ''
  await Promise.all([loadCategories(), loadLedgers(), loadOriginalExpenses(), loadStickers(), userStore.loadAssetAccounts()])
  // 从账本详情“记一笔”进入：预选当前账本
  if (ledgerIdOpt && !editId && !mealIdOpt) draft.ledgerId = ledgerIdOpt
  if (editId) {
    await loadTransactionForEdit(editId)
  } else if (mealIdOpt) {
    await loadMealForEdit(mealIdOpt)
  } else {
    // 阶段 9：OCR 识别失败兜底手动记账，带入已上传图片与识别字段
    const prefill = consumeOcrPrefill()
    if (prefill.imageUrl) {
      if (!draft.imageUrls.includes(prefill.imageUrl)) draft.imageUrls.push(prefill.imageUrl)
      if (prefill.amount) draft.amount = prefill.amount
      if (prefill.note) draft.note = prefill.note
      if (prefill.dateKey) draft.dateKey = prefill.dateKey
      if (prefill.categoryId) draft.categoryId = prefill.categoryId
      draft.ocrMeta = prefill.ocrMeta || null
    }
  }
})

async function saveRecord() {
  if (saving.value) return
  if (!draft.amount || draft.amount === '.' || Number(draft.amount || 0) <= 0) {
    uni.showToast({ title: '请输入金额', icon: 'none' })
    return
  }
  let fen
  try {
    fen = yuanToFen(draft.amount)
  } catch (err) {
    uni.showToast({ title: '金额格式有误', icon: 'none' })
    return
  }
  if (draft.type === 'refund' && !draft.relatedId) {
    uni.showToast({ title: '请选择关联的原支出', icon: 'none' })
    return
  }
  if (!draft.categoryId) {
    uni.showToast({ title: '请选择分类', icon: 'none' })
    return
  }
  if (!draft.ledgerId) {
    uni.showToast({ title: '请选择账本', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const [y, m, d] = draft.dateKey.split('-').map(Number)
    const now = new Date()
    const txAt = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).getTime()

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
        ocr_meta: draft.ocrMeta || null
      })
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
        meal_type: draft.mealType,
        calorie_mode: draft.calorieMode,
        whole_override: Math.round(Number(draft.wholeOverride) || 0),
        confirmed_calories: confirmedCalories.value,
        food_items: draft.foodItems.map((f) => ({
          name: f.name,
          calories: Math.round(Number(f.calories) || 0),
          sticker_id: f.sticker_id || null,
          sticker_image_url: f.sticker_image_url || null
        }))
      })
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
        meal_type: draft.mealType,
        calorie_mode: draft.calorieMode,
        whole_override: Math.round(Number(draft.wholeOverride) || 0),
        confirmed_calories: confirmedCalories.value,
        food_items: draft.foodItems.map((f) => ({
          name: f.name,
          calories: Math.round(Number(f.calories) || 0),
          sticker_id: f.sticker_id || null,
          sticker_image_url: f.sticker_image_url || null
        }))
      })
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
        ocr_meta: draft.ocrMeta || null
      })
    }

    uni.showToast({ title: editingId.value ? '已更新' : '已记录', icon: 'success' })
    // 刷新首页看板（createTransaction 已在服务端重算 settlement）
    try {
      await userStore.refreshTodayDashboard({ force: true })
    } catch (_e) {
      // 看板刷新失败不影响已保存结果
    }
    setTimeout(() => uni.switchTab({ url: '/pages/index/index' }), 500)
  } catch (err) {
    const msg = err && err.message ? err.message : '保存失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    saving.value = false
  }
}

function goBack() {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style scoped lang="scss">
.add-record-page {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(180deg, #eafaf0 0%, #f2fcf2 32%);
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
    padding: 0 32rpx;
  }

  .type-switch {
    display: flex;
    justify-content: center;
    gap: 16rpx;
    margin: 16rpx 0 8rpx;
  }
  .type-btn {
    padding: 14rpx 56rpx;
    border-radius: 40rpx;
    font-size: 28rpx;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.7);
    color: var(--ink3);
    cursor: pointer;
    &.expense.active {
      background: linear-gradient(135deg, #ffb3b3, #ff6b6b);
      color: #fff;
    }
    &.income.active {
      background: linear-gradient(135deg, #89e59c, #25cc5d);
      color: #fff;
    }
    &.refund.active {
      background: linear-gradient(135deg, #7aa7ff, #4a6cf0);
      color: #fff;
    }
    &.disabled {
      opacity: 0.55;
      cursor: default;
    }
  }

  .amount-display {
    text-align: center;
    padding: 24rpx 0 12rpx;
  }
  .amount-symbol {
    font-size: 40rpx;
    color: var(--ink4);
    font-weight: 600;
  }
  .amount-value {
    font-size: 84rpx;
    font-weight: 900;
    color: var(--ink);
    letter-spacing: -3rpx;
    &.empty {
      color: #c2f2c8;
    }
  }
  .amount-type {
    display: block;
    font-size: 22rpx;
    margin-top: 4rpx;
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
  .amount-upper {
    display: block;
    margin-top: 6rpx;
    font-size: 24rpx;
    letter-spacing: 1rpx;
    color: var(--ink3);
    &.placeholder {
      color: var(--ink4);
      opacity: 0.7;
    }
  }

  .note-row {
    padding: 0 0 12rpx;
  }
  .note-input {
    width: 100%;
    height: 76rpx;
    border-radius: 28rpx;
    background: rgba(255, 255, 255, 0.7);
    border: 2rpx solid rgba(194, 242, 200, 0.5);
    padding: 0 28rpx;
    font-size: 26rpx;
    text-align: center;
    color: var(--ink);
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
    height: 24rpx;
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
  .sticker-add-plus { font-size: 36rpx; }
  .sticker-add-text { font-size: 22rpx; }

  /* 阶段 11：餐次与热量 */
  .meal-section { margin-top: 8rpx; }
  .meal-type-row { display: flex; gap: 16rpx; flex-wrap: wrap; }
  .meal-type-chip {
    padding: 16rpx 28rpx; border-radius: 22rpx; background: #eef6f0; border: 2rpx solid #d6ebda;
    font-size: 24rpx; font-weight: 600; color: var(--ink3); cursor: pointer; transition: all 0.2s;
    &.active { background: linear-gradient(135deg, #7ed390, #25cc5d); color: #fff; border-color: transparent; }
  }
  .seg-group { display: flex; gap: 16rpx; }
  .seg-btn {
    flex: 1; padding: 16rpx 0; text-align: center; border-radius: 20rpx; background: #eef6f0;
    border: 2rpx solid #d6ebda; font-size: 24rpx; font-weight: 600; color: var(--ink3); cursor: pointer;
    &.active { background: linear-gradient(135deg, #7ed390, #25cc5d); color: #fff; border-color: transparent; }
  }
  .field-row { display: flex; align-items: center; gap: 16rpx; margin-top: 16rpx; }
  .field-label { font-size: 24rpx; color: var(--ink3); font-weight: 600; width: 150rpx; flex-shrink: 0; }
  .field-input {
    flex: 1; height: 72rpx; border-radius: 20rpx; background: #f3faf4; border: 2rpx solid #d6ebda;
    padding: 0 24rpx; font-size: 26rpx; color: var(--ink); text-align: center;
  }
  .field-unit { font-size: 22rpx; color: var(--ink4); width: 64rpx; flex-shrink: 0; }
  .food-items { display: flex; flex-direction: column; gap: 12rpx; margin-top: 16rpx; }
  .food-item { display: flex; align-items: center; gap: 12rpx; }
  .food-name {
    flex: 1; height: 72rpx; border-radius: 18rpx; background: #f3faf4; border: 2rpx solid #d6ebda;
    padding: 0 20rpx; font-size: 26rpx; color: var(--ink);
  }
  .food-kcal { width: 140rpx; height: 72rpx; border-radius: 18rpx; background: #f3faf4; border: 2rpx solid #d6ebda; padding: 0 16rpx; font-size: 24rpx; color: var(--ink); text-align: center; }
  .food-kcal-unit { font-size: 20rpx; color: var(--ink4); }
  .food-sticker { width: 64rpx; height: 64rpx; border-radius: 16rpx; background: #eef6f0; border: 2rpx solid #d6ebda; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; }
  .food-sticker-img { width: 100%; height: 100%; }
  .food-sticker-plus { font-size: 28rpx; }
  .food-del { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; cursor: pointer; }
  .add-food-btn { margin-top: 14rpx; padding: 18rpx; border-radius: 20rpx; background: rgba(var(--g2-rgb),0.5); border: 2rpx dashed #b7e3bf; text-align: center; font-size: 24rpx; font-weight: 600; color: var(--g5); cursor: pointer; }
  .food-sum { display: block; margin-top: 12rpx; font-size: 22rpx; color: var(--ink4); }

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

  .keypad-area {
    padding: 16rpx 24rpx 8rpx;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }
  .key-row {
    display: flex;
    gap: 16rpx;
  }
  .key-btn {
    flex: 1;
    height: 104rpx;
    border-radius: 28rpx;
    background: rgba(255, 255, 255, 0.78);
    border: 2rpx solid rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 44rpx;
    font-weight: 700;
    color: var(--ink);
    cursor: pointer;
    &:active {
      background: rgba(37, 204, 93, 0.15);
    }
    &.function {
      font-size: 36rpx;
      color: var(--ink3);
    }
  }

  .save-bar {
    padding: 8rpx 32rpx 40rpx;
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
