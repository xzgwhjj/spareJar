<template>
  <view class="edit-page" data-cmp="StickerEdit">
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">{{ isEdit ? '编辑贴纸' : '新建贴纸' }}</text>
      <view style="width:64rpx;" />
    </view>

    <scroll-view scroll-y enhanced :show-scrollbar="false" class="page-scroll">
      <!-- 类型选择 -->
      <view class="section-label">贴纸类型</view>
      <view class="type-row">
        <view class="type-opt" :class="{ active: form.type === 'stock', disabled: isEdit }" @click="setType('stock')">
          <text class="to-icon">📦</text>
          <text class="to-name">囤货贴纸</text>
          <text class="to-desc">消耗自动记账</text>
        </view>
        <view class="type-opt" :class="{ active: form.type === 'material', disabled: isEdit }" @click="setType('material')">
          <text class="to-icon">🖼️</text>
          <text class="to-name">普通素材</text>
          <text class="to-desc">仅作装饰</text>
        </view>
      </view>

      <!-- 图片 -->
      <view class="section-label">商品图片</view>
      <view class="img-row">
        <view v-if="form.image_url" class="img-preview">
          <image :src="form.image_url" mode="aspectFill" class="img-preview-img" />
          <view class="img-remove" @click="form.image_url = ''">×</view>
        </view>
        <view v-else class="img-add" @click="chooseImage">
          <text class="img-add-plus">＋</text>
          <text class="img-add-text">{{ uploading ? '上传中' : '拍照/选图' }}</text>
        </view>
      </view>

      <!-- 名称 -->
      <view class="section-label">名称</view>
      <input class="text-input" v-model="form.name" placeholder="如：抽纸、咖啡豆" maxlength="20" />

      <!-- 囤货专属 -->
      <template v-if="form.type === 'stock'">
        <view class="section-label">单价（元）</view>
        <number-field class="text-input" :model-value="form.priceYuan" placeholder="每件单价" title="单价" :decimal-places="2" :max-integer="9" @update:model-value="(v) => (form.priceYuan = v)" />

        <view class="section-label">{{ isEdit ? '当前库存' : '初始库存（件）' }}</view>
        <number-field class="text-input" :model-value="form.stockQty" placeholder="0" title="库存数量" :decimal-places="0" :max-integer="6" @update:model-value="(v) => (form.stockQty = v)" />

        <view class="section-label">低库存阈值（件）</view>
        <number-field class="text-input" :model-value="form.lowThreshold" placeholder="默认 1" title="低库存阈值" :decimal-places="0" :max-integer="6" @update:model-value="(v) => (form.lowThreshold = v)" />

        <!-- 同步记采购（仅新建） -->
        <view v-if="!isEdit" class="switch-row" @click="form.withPurchase = !form.withPurchase">
          <view class="switch-info">
            <text class="switch-title">同步记采购支出</text>
            <text class="switch-desc">创建时记一笔「单价×库存」支出</text>
          </view>
          <view class="switch" :class="{ on: form.withPurchase }"><view class="switch-dot" /></view>
            
    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
</view>
      </template>

      <!-- 绑定分类 -->
      <view class="section-label">{{ form.type === 'stock' ? '绑定支出分类（必填）' : '默认分类（可选）' }}</view>
      <scroll-view scroll-x enhanced :show-scrollbar="false" class="cat-scroll">
        <view class="cat-row">
          <view
            v-for="c in catOptions"
            :key="c._id"
            class="cat-chip"
            :class="{ active: form.categoryId === c._id }"
            @click="form.categoryId = c._id"
          >
            <text class="cat-emoji">{{ c.icon }}</text>
            <text class="cat-name">{{ c.name }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 绑定账本 -->
      <view class="section-label">归属账本{{ form.withPurchase ? '（同步采购必选）' : '（可选）' }}</view>
      <scroll-view scroll-x enhanced :show-scrollbar="false" class="ledger-scroll">
        <view class="ledger-row">
          <view
            v-for="l in ledgers"
            :key="l._id"
            class="ledger-chip"
            :class="{ active: form.ledgerId === l._id }"
            @click="form.ledgerId = l._id"
          >
            <text>{{ l.icon || '📒' }} {{ l.name }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="scroll-bottom-gap" />
    </scroll-view>

    <view class="save-bar">
      <view class="save-main-btn" :class="{ loading: saving }" @click="save">
        <text>{{ saving ? '保存中…' : (isEdit ? '保存修改' : '创建贴纸') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user.js'
import { listLedgers, listCategories } from '@/api/sparejar.js'
import { yuanToFen, fenToYuanString } from '@/utils/money.js'

const userStore = useUserStore()

const isEdit = ref(false)
const editId = ref('')
const saving = ref(false)
const uploading = ref(false)

const form = reactive({
  type: 'stock',
  name: '',
  image_url: '',
  priceYuan: '',
  stockQty: '',
  lowThreshold: '1',
  withPurchase: false,
  categoryId: '',
  ledgerId: ''
})

const allCats = ref([])
const ledgers = ref([])

const catOptions = computed(() => {
  const all = allCats.value
  return form.type === 'stock' ? all.filter((c) => c.type === 'expense') : all
})

function setType(t) {
  if (isEdit.value) return
  form.type = t
}

function goBack() {
  uni.navigateBack()
}

async function chooseImage() {
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
        const cloudPath = `stickers/${userStore.state.uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const up = await uniCloud.uploadFile({ filePath: p, cloudPath })
        const url = (up && (up.url || up.fileID)) || ''
        if (url) form.image_url = url
      } catch (err) {
        console.error('[sticker-edit] upload failed', err)
        uni.showToast({ title: '图片上传失败', icon: 'none' })
      } finally {
        uploading.value = false
      }
    }
  })
}

async function loadMeta() {
  const uid = userStore.state.uid
  if (!uid) return
  try {
    // 走云函数读取，禁止前端直连数据库
    const [cRes, lRes] = await Promise.all([ listCategories(), listLedgers() ])
    allCats.value = (cRes || []).map((c) => ({ _id: c._id, type: c.type, name: c.name, icon: c.icon }))
    ledgers.value = (lRes || []).map((l) => ({ _id: l._id, name: l.name, icon: l.icon }))
    if (!form.ledgerId && ledgers.value[0]) form.ledgerId = ledgers.value[0]._id
  } catch (err) {
    console.error('[sticker-edit] load meta failed', err)
  }
}

async function loadForEdit(id) {
  const s = (userStore.state.stickers || []).find((x) => x._id === id)
  if (!s) return
  form.type = s.type
  form.name = s.name
  form.image_url = s.image_url
  form.priceYuan = s.unit_price ? fenToYuanString(s.unit_price) : ''
  form.stockQty = s.stock_qty != null ? String(s.stock_qty) : ''
  form.lowThreshold = s.low_stock_threshold != null ? String(s.low_stock_threshold) : '1'
  form.categoryId = s.category_id || ''
  form.ledgerId = s.ledger_id || ''
}

onMounted(async () => {
  const pages = getCurrentPages()
  const cur = pages[pages.length - 1]
  editId.value = cur && cur.options ? cur.options.id : ''
  isEdit.value = !!editId.value
  if (!userStore.state.uid) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  await loadMeta()
  if (isEdit.value) await loadForEdit(editId.value)
})

async function save() {
  if (saving.value) return
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入名称', icon: 'none' })
    return
  }
  if (!form.image_url) {
    uni.showToast({ title: '请上传图片', icon: 'none' })
    return
  }
  const payload = {
    type: form.type,
    name: form.name.trim(),
    image_url: form.image_url,
    category_id: form.categoryId || null,
    ledger_id: form.ledgerId || null
  }

  if (form.type === 'stock') {
    let priceFen = 0
    if (form.priceYuan) {
      try { priceFen = yuanToFen(form.priceYuan) } catch (e) { uni.showToast({ title: '单价格式有误', icon: 'none' }); return }
    }
    if (!priceFen || priceFen < 1) {
      uni.showToast({ title: '请填写有效单价', icon: 'none' })
      return
    }
    const stockQty = form.stockQty === '' ? 0 : Math.max(0, parseInt(form.stockQty, 10) || 0)
    const low = form.lowThreshold === '' ? 1 : Math.max(0, parseInt(form.lowThreshold, 10) || 0)
    if (!isEdit.value) {
      payload.unit_price = priceFen
      payload.stock_qty = stockQty
      payload.low_stock_threshold = low
      if (form.withPurchase) {
        if (!payload.category_id) { uni.showToast({ title: '同步采购需绑定分类', icon: 'none' }); return }
        if (!payload.ledger_id) { uni.showToast({ title: '同步采购需选择账本', icon: 'none' }); return }
        payload.with_purchase = true
      }
    } else {
      payload.unit_price = priceFen
      payload.stock_qty = stockQty
      payload.low_stock_threshold = low
    }
  } else {
    // material：可选单价（仅作展示，不强制）
    if (form.priceYuan) {
      try { payload.unit_price = yuanToFen(form.priceYuan) } catch (e) { /* 忽略 */ }
    }
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await userStore.updateStickerAction({ sticker_id: editId.value, ...payload })
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      await userStore.createStickerAction(payload)
      uni.showToast({ title: '已创建', icon: 'success' })
    }
    await userStore.loadStickers()
    setTimeout(() => uni.navigateBack(), 500)
  } catch (err) {
    const msg = err && err.message ? err.message : '保存失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.edit-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #eafaf0 0%, #f2fcf2 32%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  --g5: #25cc5d;
  --ink: #0f1c14;
  --ink2: #3a5244;
  --ink3: #6b8c7a;
  --ink4: #9bb8a8;

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
  .topbar-title { font-size: 34rpx; font-weight: 800; color: var(--ink); }

  .page-scroll { flex: 1; min-height: 0; }

  .section-label {
    font-size: 22rpx;
    color: var(--ink4);
    font-weight: 700;
    padding: 20rpx 36rpx 8rpx;
  }

  .type-row { display: flex; gap: 16rpx; padding: 0 32rpx; }
  .type-opt {
    flex: 1;
    padding: 20rpx;
    border-radius: 24rpx;
    background: rgba(255, 255, 255, 0.6);
    border: 3rpx solid transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4rpx;
    cursor: pointer;
    &.active { border-color: var(--g5); background: rgba(37, 204, 93, 0.12); }
    &.disabled { opacity: 0.6; }
    .to-icon { font-size: 40rpx; }
    .to-name { font-size: 26rpx; font-weight: 700; color: var(--ink); }
    .to-desc { font-size: 18rpx; color: var(--ink4); }
  }

  .img-row { padding: 4rpx 32rpx; }
  .img-preview, .img-add {
    width: 160rpx;
    height: 160rpx;
    border-radius: 20rpx;
    position: relative;
  }
  .img-preview-img { width: 100%; height: 100%; border-radius: 20rpx; }
  .img-remove {
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
  .img-add {
    border: 3rpx dashed rgba(37, 204, 93, 0.5);
    background: rgba(255, 255, 255, 0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4rpx;
    color: var(--ink3);
    .img-add-plus { font-size: 48rpx; line-height: 1; }
    .img-add-text { font-size: 22rpx; }
  }

  .text-input {
    margin: 0 32rpx;
    height: 84rpx;
    border-radius: 24rpx;
    background: rgba(255, 255, 255, 0.7);
    border: 2rpx solid rgba(194, 242, 200, 0.5);
    padding: 0 28rpx;
    font-size: 28rpx;
    color: var(--ink);
  }

  .switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 24rpx 32rpx 0;
    padding: 20rpx 24rpx;
    border-radius: 24rpx;
    background: rgba(255, 255, 255, 0.7);
    cursor: pointer;
  }
  .switch-info { display: flex; flex-direction: column; gap: 4rpx; }
  .switch-title { font-size: 26rpx; font-weight: 700; color: var(--ink); }
  .switch-desc { font-size: 20rpx; color: var(--ink4); }
  .switch {
    width: 88rpx;
    height: 48rpx;
    border-radius: 24rpx;
    background: rgba(0, 0, 0, 0.12);
    position: relative;
    transition: background 0.2s;
    &.on { background: var(--g5); }
    .switch-dot {
      position: absolute;
      top: 4rpx;
      left: 4rpx;
      width: 40rpx;
      height: 40rpx;
      border-radius: 50%;
      background: #fff;
      transition: left 0.2s;
    }
    &.on .switch-dot { left: 44rpx; }
  }

  .cat-scroll, .ledger-scroll { white-space: nowrap; padding: 4rpx 32rpx; }
  .cat-row, .ledger-row { display: inline-flex; gap: 16rpx; }
  .cat-chip {
    display: inline-flex;
    align-items: center;
    gap: 8rpx;
    padding: 14rpx 22rpx;
    border-radius: 28rpx;
    background: rgba(255, 255, 255, 0.65);
    font-size: 24rpx;
    font-weight: 600;
    color: var(--ink3);
    cursor: pointer;
    &.active { background: rgba(37, 204, 93, 0.12); color: var(--ink); border: 2rpx solid var(--g5); }
  }
  .cat-emoji { font-size: 30rpx; }
  .ledger-chip {
    display: inline-block;
    padding: 14rpx 28rpx;
    border-radius: 40rpx;
    background: rgba(255, 255, 255, 0.7);
    font-size: 24rpx;
    color: var(--ink3);
    cursor: pointer;
    &.active { background: linear-gradient(135deg, #4fd974, #25cc5d); color: #fff; }
  }

  .scroll-bottom-gap { height: 24rpx; }

  .save-bar { padding: 8rpx 32rpx 40rpx; }
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
    &.loading { opacity: 0.7; }
  }
}
</style>
