<template>
  <view class="asset-page">
    <view class="topbar" :style="{ paddingTop: pagePaddingTop }">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">资产账户</text>
      <view class="add-btn" @click="openAdd"><text>+</text></view>
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="flex:1;">
      <!-- 总览 -->
      <view class="glass-hero card-in-1">
        <text class="ov-title">总资产净值</text>
        <text class="ov-amount" :style="{ color: totals.full >= 0 ? 'var(--g5)' : 'var(--red-soft)' }">¥{{ fmt(totals.full) }}</text>
        <view class="ov-sub">
          <view class="ov-sub-item">
            <text class="ov-sub-val">¥{{ fmt(totals.disposable) }}</text>
            <text class="ov-sub-lbl">可支配</text>
          </view>
          <view class="ov-divider" />
          <view class="ov-sub-item">
            <text class="ov-sub-val">¥{{ fmt(totals.investment) }}</text>
            <text class="ov-sub-lbl">投资市值</text>
          </view>
        </view>
      </view>

      <!-- 分类 Tab -->
      <view class="class-tabs">
        <view
          v-for="c in classTabs"
          :key="c.id"
          class="class-tab"
          :class="{ active: classTab === c.id }"
          @click="classTab = c.id"
        >{{ c.label }}</view>
      </view>

      <!-- 账户列表 -->
      <view
        v-for="a in filteredAccounts"
        :key="a._id"
        class="account-card glass-mid card-item"
        @click="openDetail(a)"
      >
        <view class="acc-row">
          <view class="acc-icon" :style="{ background: colorBgFor(a) }"><text>{{ iconFor(a) }}</text></view>
          <view class="acc-info">
            <view class="acc-name-row">
              <text class="acc-name">{{ a.name }}</text>
              <text class="acc-type">{{ subtypeLabel(a) }}</text>
            </view>
            <text v-if="a.account_class === 'investment'" class="acc-sub">
              市值 ¥{{ fmt(a.market_value) }} · 盈亏 <text :style="{ color: a.profit_loss >= 0 ? 'var(--g5)' : 'var(--red-soft)' }">{{ a.profit_loss >= 0 ? '+' : '' }}¥{{ fmt(a.profit_loss) }}</text>
            </text>
            <text v-else-if="!a.include_in_disposable" class="acc-sub">不计入可支配</text>
          </view>
          <view class="acc-balance-group">
            <text class="acc-balance" :style="{ color: a.balance >= 0 ? 'var(--ink)' : 'var(--red-soft)' }">¥{{ fmt(a.balance) }}</text>
            <view class="acc-actions">
              <text class="acc-edit" @click.stop="openEdit(a)">✏️</text>
              <text class="acc-del" @click.stop="onDelete(a)">🗑️</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="!filteredAccounts.length" class="empty-tip">暂无{{ classLabel }}账户，点击右上角 + 添加</view>

      <view style="height:24px" />
    </scroll-view>

    <!-- 新增/编辑弹窗 -->
    <view v-if="showSheet" class="sheet-overlay" @click="showSheet = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">{{ editingAccount ? '编辑账户' : '新增账户' }}</text>

        <text class="form-label">账户名称</text>
        <input class="sheet-input" v-model="form.name" placeholder="如：招商储蓄卡" />

        <text class="form-label">账户类型</text>
        <view class="type-grid">
          <view
            v-for="c in classTabs"
            :key="c.id"
            class="type-chip"
            :class="{ active: form.account_class === c.id }"
            @click="onClassChange(c.id)"
          >{{ c.label }}</view>
        </view>

        <text class="form-label">子类型</text>
        <view class="type-grid">
          <view
            v-for="s in SUBTYPES[form.account_class]"
            :key="s.v"
            class="type-chip"
            :class="{ active: form.account_subtype === s.v }"
            @click="form.account_subtype = s.v"
          >{{ s.icon }} {{ s.label }}</view>
        </view>

        <text v-if="!editingAccount" class="form-label">初始余额（元）</text>
        <number-field v-if="!editingAccount" class="sheet-input" :model-value="form.balanceStr" placeholder="0" title="初始余额" :decimal-places="2" :max-integer="12" @update:model-value="(v) => (form.balanceStr = v)" />

        <block v-if="form.account_class !== 'investment'">
          <view class="toggle-row">
            <text class="toggle-lbl">计入可支配</text>
            <switch :checked="form.include_in_disposable" @change="e => form.include_in_disposable = e.detail.value" color="#25cc5d" />
          </view>
          <view class="toggle-row">
            <text class="toggle-lbl">计入日限额</text>
            <switch :checked="form.include_in_daily_limit" @change="e => form.include_in_daily_limit = e.detail.value" color="#25cc5d" />
          </view>
          <view class="toggle-row">
            <text class="toggle-lbl">计入总资产</text>
            <switch :checked="form.include_in_total_asset" @change="e => form.include_in_total_asset = e.detail.value" color="#25cc5d" />
          </view>
        </block>

        <view class="save-btn" @click="saveAccount">
          <text>{{ editingAccount ? '保存修改' : '添加账户' }}</text>
        </view>
      </view>
    </view>
      
    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
</view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user.js'
import { formatFen, safeYuanToFen } from '@/utils/money.js'

const userStore = useUserStore()
const state = userStore.state

const classTabs = [
  { id: 'daily', label: '日常' },
  { id: 'special', label: '专项' },
  { id: 'investment', label: '投资' }
]
const classTab = ref('daily')
const classLabel = computed(() => classTabs.find((c) => c.id === classTab.value)?.label || '')

const SUBTYPES = {
  daily: [
    { v: 'wechat', label: '微信', icon: '💚' },
    { v: 'alipay', label: '支付宝', icon: '💙' },
    { v: 'bank', label: '银行卡', icon: '🏦' },
    { v: 'cash', label: '现金', icon: '💵' }
  ],
  special: [
    { v: 'provident_fund', label: '公积金', icon: '🏠' },
    { v: 'insurance', label: '医保', icon: '🛡️' }
  ],
  investment: [
    { v: 'fund', label: '基金', icon: '📈' },
    { v: 'stock', label: '股票', icon: '📊' },
    { v: 'bond', label: '债券', icon: '📜' },
    { v: 'gold', label: '黄金', icon: '🪙' },
    { v: 'wealth', label: '理财', icon: '💼' },
    { v: 'other', label: '其他', icon: '📦' }
  ]
}
const subtypeMap = {}
for (const k in SUBTYPES) for (const s of SUBTYPES[k]) subtypeMap[s.v] = s

const totals = computed(() => state.assetTotals || { disposable: 0, investment: 0, withInvest: 0, full: 0, specialExtra: 0 })
const filteredAccounts = computed(() => (state.assets || []).filter((a) => a.account_class === classTab.value))

function fmt(fen) { return formatFen(fen || 0) }
function subtypeLabel(a) { const s = subtypeMap[a.account_subtype]; return s ? s.label : a.account_subtype }
function iconFor(a) { const s = subtypeMap[a.account_subtype]; return s ? s.icon : '💳' }

/* 子类 → 卡片底色 */
const SUBTYPE_BG = {
  wechat: '#e8f8ec', alipay: '#e8f1fb', bank: '#f3f0ff', cash: '#e1fae3',
  provident_fund: '#eaf3ff', insurance: '#fdeef0',
  fund: '#fffbeb', stock: '#eef5ff', bond: '#f3f0ff', gold: '#fbf3e0', wealth: '#eafaf1', other: '#eef1f4'
}
function colorBgFor(a) { return SUBTYPE_BG[a.account_subtype] || '#e1fae3' }

const showSheet = ref(false)
const editingAccount = ref(null)
const form = reactive({
  name: '', account_class: 'daily', account_subtype: 'wechat', balanceStr: '',
  include_in_disposable: true, include_in_daily_limit: true, include_in_total_asset: true
})

function openAdd() {
  editingAccount.value = null
  Object.assign(form, {
    name: '', account_class: 'daily', account_subtype: 'wechat', balanceStr: '',
    include_in_disposable: true, include_in_daily_limit: true, include_in_total_asset: true
  })
  showSheet.value = true
}
function openEdit(a) {
  editingAccount.value = a
  Object.assign(form, {
    name: a.name, account_class: a.account_class, account_subtype: a.account_subtype, balanceStr: '',
    include_in_disposable: !!a.include_in_disposable, include_in_daily_limit: !!a.include_in_daily_limit, include_in_total_asset: !!a.include_in_total_asset
  })
  showSheet.value = true
}
function onClassChange(c) {
  form.account_class = c
  form.account_subtype = SUBTYPES[c][0].v
  const def = {
    daily: { d: true, l: true, t: true },
    special: { d: false, l: false, t: false },
    investment: { d: false, l: false, t: false }
  }[c]
  form.include_in_disposable = def.d
  form.include_in_daily_limit = def.l
  form.include_in_total_asset = def.t
}
async function saveAccount() {
  if (!form.name) { uni.showToast({ title: '请输入账户名称', icon: 'none' }); return }
  const payload = {
    name: form.name,
    account_class: form.account_class,
    account_subtype: form.account_subtype,
    include_in_disposable: form.include_in_disposable,
    include_in_daily_limit: form.include_in_daily_limit,
    include_in_total_asset: form.include_in_total_asset
  }
  try {
    if (editingAccount.value) {
      payload.account_id = editingAccount.value._id
      await userStore.updateAssetAccountAction(payload)
    } else {
      const parsed = safeYuanToFen(form.balanceStr || '0')
      payload.initial_balance = parsed.ok ? parsed.value : 0
      await userStore.createAssetAccountAction(payload)
    }
    showSheet.value = false
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e && e.message) || '保存失败', icon: 'none' })
  }
}
function onDelete(a) {
  uni.showModal({
    title: '删除确认',
    content: `确定删除「${a.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        await userStore.deleteAssetAccountAction(a._id)
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    }
  })
}
function openDetail(a) { uni.navigateTo({ url: `/pages/asset-detail/asset-detail?id=${a._id}` }) }
function goBack() { uni.navigateBack() }

/* 顶部安全区 */
function resolveTopPadding() {
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton && menuButton.bottom > 0) return `${menuButton.bottom + uni.upx2px(16)}px`
  } catch (_) {}
  const { statusBarHeight = 0 } = uni.getSystemInfoSync()
  return `${statusBarHeight + uni.upx2px(88)}px`
}
const pagePaddingTop = ref(resolveTopPadding())

onMounted(() => {
  pagePaddingTop.value = resolveTopPadding()
  userStore.loadAssetAccounts().catch(() => {})
})
</script>

<style scoped>
.asset-page { min-height: 100vh; background: linear-gradient(180deg, #F2FCF2, #FFFFFF); display: flex; flex-direction: column; overflow: hidden; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 16px 10px; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b8c7a; font-size: 16px; }
.topbar-title { font-size: 17px; font-weight: 700; color: var(--ink); }
.add-btn { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg,#4fd974,#25cc5d); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; font-size: 20px; font-weight: 300; }

.glass-hero { margin: 16px; padding: 18px; text-align: center; }
.ov-title { font-size: 12px; color: var(--ink4); display: block; }
.ov-amount { font-size: 34px; font-weight: 900; display: block; margin-top: 4px; letter-spacing: -1; }
.ov-sub { display: flex; align-items: center; justify-content: center; margin-top: 12px; gap: 20px; }
.ov-sub-item { text-align: center; }
.ov-sub-val { font-size: 15px; font-weight: 700; display: block; color: var(--ink); }
.ov-sub-lbl { font-size: 10px; color: var(--ink4); }
.ov-divider { width: 1px; height: 28px; background: rgba(194,242,200,0.4); }

.class-tabs { display: flex; gap: 8px; margin: 8px 16px 4px; }
.class-tab { flex: 1; text-align: center; padding: 10px 0; border-radius: 14px; background: rgba(255,255,255,0.6); font-size: 13px; font-weight: 600; color: var(--ink4); cursor: pointer; }
.class-tab.active { background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; }

.account-card { margin: 10px 16px 0; padding: 14px 16px; cursor: pointer; }
.acc-row { display: flex; align-items: center; gap: 10px; }
.acc-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 18px; }
.acc-info { flex: 1; min-width: 0; }
.acc-name-row { display: flex; align-items: center; gap: 6px; }
.acc-name { font-size: 14px; font-weight: 700; color: var(--ink); }
.acc-type { font-size: 10px; padding: 2px 6px; border-radius: 6px; background: rgba(194,242,200,0.3); color: #6b8c7a; }
.acc-sub { font-size: 11px; color: var(--ink4); display: block; margin-top: 2px; }
.acc-balance-group { text-align: right; }
.acc-balance { font-size: 16px; font-weight: 800; display: block; }
.acc-actions { display: flex; gap: 6px; margin-top: 4px; justify-content: flex-end; }
.acc-edit, .acc-del { font-size: 12px; cursor: pointer; padding: 2px 4px; }
.acc-edit:active, .acc-del:active { opacity: 0.6; }

.empty-tip { text-align: center; color: var(--ink4); font-size: 13px; padding: 40px 0; }

.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 300; display: flex; align-items: flex-end; justify-content: center; }
.sheet-panel { width: 100%; max-height: 86vh; overflow-y: auto; background: linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,252,242,0.96)); border-radius: 24px 24px 0 0; padding: 0 20px 30px; }
.sheet-handle { display: flex; justify-content: center; padding: 12px 0 8px; }
.handle-bar { width: 38px; height: 4px; border-radius: 3px; background: rgba(194,242,200,0.8); }
.sheet-title { font-size: 16px; font-weight: 800; color: var(--ink); display: block; margin-bottom: 14px; }

.form-label { font-size: 12px; color: #6b8c7a; font-weight: 600; display: block; margin-bottom: 6px; margin-top: 12px; }
.sheet-input { width: 100%; height: 44px; border-radius: 14px; background: rgba(242,252,242,0.8); border: 1px solid rgba(194,242,200,0.4); padding: 0 14px; font-size: 14px; margin-bottom: 8px; box-sizing: border-box; }

.type-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.type-chip { padding: 6px 14px; border-radius: 12px; background: rgba(255,255,255,0.7); border: 1px solid rgba(194,242,200,0.3); font-size: 12px; font-weight: 600; color: #6b8c7a; cursor: pointer; }
.type-chip.active { background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; border-color: transparent; }

.toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
.toggle-lbl { font-size: 13px; color: var(--ink); font-weight: 600; }

.save-btn { margin-top: 18px; padding: 14px; border-radius: 16px; background: linear-gradient(135deg,#4fd974,#25cc5d); text-align: center; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; }
</style>
