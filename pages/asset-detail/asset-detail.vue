<template>
  <view class="detail-page">
    <view class="topbar" :style="{ paddingTop: pagePaddingTop }">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">账户详情</text>
      <view style="width:36px" />
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="flex:1;">
      <block v-if="account">
        <!-- 头部 -->
        <view class="glass-hero card-in-1">
          <view class="hero-row">
            <view class="hero-icon" :style="{ background: colorBgFor(account) }"><image :src="iconFor(account)" mode="aspectFit" class="hero-icon-img" /></view>
            <view class="hero-info">
              <text class="hero-name">{{ account.name }}</text>
              <text class="hero-sub">{{ classLabel(account) }} · {{ subtypeLabel(account) }}</text>
            </view>
          </view>
          <text class="hero-balance" :style="{ color: account.account_class === 'liability' ? 'var(--red-soft)' : (account.balance >= 0 ? 'var(--ink)' : 'var(--red-soft)') }">{{ account.account_class === 'liability' ? '欠款 ¥' : '¥' }}{{ fmt(account.balance) }}</text>
          <text v-if="account.account_class === 'investment'" class="hero-pl">
            持仓市值 ¥{{ fmt(account.market_value) }} · 盈亏
            <text :style="{ color: account.profit_loss >= 0 ? 'var(--g5)' : 'var(--red-soft)' }">{{ account.profit_loss >= 0 ? '+' : '' }}¥{{ fmt(account.profit_loss) }}</text>
          </text>
        </view>

        <!-- 计入规则（日常/专项；负债账户不计入资产，无开关） -->
        <view v-if="account.account_class === 'daily' || account.account_class === 'special'" class="glass-mid card-in-1 rule-card">
          <view class="toggle-row">
            <text class="toggle-lbl">计入可支配</text>
            <switch :checked="!!account.include_in_disposable" @change="e => toggleFlag('include_in_disposable', e.detail.value)" color="#25cc5d" />
          </view>
          <view class="toggle-row">
            <text class="toggle-lbl">计入日限额</text>
            <switch :checked="!!account.include_in_daily_limit" @change="e => toggleFlag('include_in_daily_limit', e.detail.value)" color="#25cc5d" />
          </view>
          <view class="toggle-row">
            <text class="toggle-lbl">计入总资产</text>
            <switch :checked="!!account.include_in_total_asset" @change="e => toggleFlag('include_in_total_asset', e.detail.value)" color="#25cc5d" />
          </view>
        </view>

        <!-- 操作 -->
        <view class="action-row">
          <view class="action-btn" @click="openAdjust"><text class="action-ic">✏️</text><text>改数</text></view>
          <view class="action-btn" @click="openTransfer"><text class="action-ic">🔁</text><text>转账</text></view>
          <view v-if="account.account_class === 'investment'" class="action-btn" @click="openHolding"><text class="action-ic">➕</text><text>加持仓</text></view>
          <view class="action-btn danger" @click="onDelete"><text class="action-ic">🗑️</text><text>删除</text></view>
        </view>

        <!-- 持仓（投资） -->
        <view v-if="account.account_class === 'investment'" class="section">
          <text class="section-header">📈 持仓</text>
          <view v-for="h in account.holdings" :key="h._id" class="holding-card glass-thin">
            <view class="holding-row">
              <view class="holding-info">
                <text class="holding-name">{{ h.name }}<text v-if="h.code" class="holding-code"> · {{ h.code }}</text></text>
                <text class="holding-sub">{{ assetTypeLabel(h.asset_type) }} · {{ fmt(h.shares) }} 份 · ¥{{ fmt(h.unit_price) }}/份</text>
              </view>
              <view class="holding-val">
                <text class="holding-mv">¥{{ fmt(h.market_value) }}</text>
                <text class="holding-pl" :style="{ color: h.profit_loss >= 0 ? 'var(--g5)' : 'var(--red-soft)' }">{{ h.profit_loss >= 0 ? '+' : '' }}¥{{ fmt(h.profit_loss) }}</text>
              </view>
            </view>
            <view class="holding-actions">
              <text class="ha-btn" @click="openInvestTx(h, 'buy')">买入</text>
              <text class="ha-btn" @click="openInvestTx(h, 'dca')">定投</text>
              <text class="ha-btn" @click="openInvestTx(h, 'sell')">卖出</text>
              <text class="ha-btn" @click="openInvestTx(h, 'dividend')">分红</text>
              <text class="ha-btn danger" @click="onDeleteHolding(h)">删</text>
            </view>
          </view>
          <view v-if="!account.holdings || !account.holdings.length" class="empty-tip">暂无持仓，点击「加持仓」添加</view>
        </view>

        <!-- 余额变动流水 -->
        <view class="section">
          <text class="section-header">💱 余额变动</text>
          <view v-for="(f, i) in flow" :key="i" class="flow-card glass-thin">
            <view class="flow-row">
              <text class="flow-type">{{ changeTypeLabel(f.change_type) }}</text>
              <text class="flow-delta" :style="{ color: f.amount_delta >= 0 ? 'var(--g5)' : 'var(--red-soft)' }">{{ f.amount_delta >= 0 ? '+' : '' }}¥{{ fmt(f.amount_delta) }}</text>
            </view>
            <view class="flow-sub">
              <text v-if="f.note">{{ f.note }}</text>
              <text v-if="f.counter_account_id"> ↔ {{ counterName(f.counter_account_id) }}</text>
              <text class="flow-time"> · {{ formatTime(f.created_at) }}</text>
            </view>
          </view>
          <view v-if="!flow.length" class="empty-tip">暂无变动记录</view>
        </view>

        <view class="disclaimer">虚拟记账额度，非真实资金账户，不对接银行/行情</view>
        <view style="height:24px" />
      </block>
      <view v-else class="empty-tip">账户不存在或已删除</view>
    </scroll-view>

    <!-- 改数弹窗 -->
    <view v-if="showAdjust" class="sheet-overlay" @click="showAdjust = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">调整余额（元）</text>
        <text class="form-label">目标余额</text>
        <number-field class="sheet-input" :model-value="adjustForm.balanceStr" placeholder="0" title="目标余额" :decimal-places="2" :max-integer="12" @update:model-value="(v) => (adjustForm.balanceStr = v)" />
        <text class="form-label">备注</text>
        <input class="sheet-input" v-model="adjustForm.note" placeholder="如：对账修正" />
        <view class="save-btn" @click="doAdjust"><text>确认调整</text></view>
      </view>
    </view>

    <!-- 转账弹窗 -->
    <view v-if="showTransfer" class="sheet-overlay" @click="showTransfer = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">转账</text>
        <text class="form-label">转入账户</text>
        <view class="type-grid">
          <view v-for="t in otherAccounts" :key="t._id" class="type-chip" :class="{ active: transferForm.toId === t._id }" @click="transferForm.toId = t._id">{{ t.name }}</view>
        </view>
        <text class="form-label">金额（元）</text>
        <number-field class="sheet-input" :model-value="transferForm.amountStr" placeholder="0" title="转账金额" :decimal-places="2" :max-integer="12" @update:model-value="(v) => (transferForm.amountStr = v)" />
        <text class="form-label">备注</text>
        <input class="sheet-input" v-model="transferForm.note" placeholder="转账" />
        <view class="save-btn" @click="doTransfer"><text>确认转账</text></view>
      </view>
    </view>

    <!-- 加持仓弹窗 -->
    <view v-if="showHolding" class="sheet-overlay" @click="showHolding = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">加持仓</text>
        <text class="form-label">名称</text>
        <input class="sheet-input" v-model="holdingForm.name" placeholder="如：沪深300ETF" />
        <text class="form-label">代码（可选）</text>
        <input class="sheet-input" v-model="holdingForm.code" placeholder="如：510300" />
        <text class="form-label">品种</text>
        <view class="type-grid">
          <view v-for="t in ASSET_TYPES" :key="t.v" class="type-chip" :class="{ active: holdingForm.asset_type === t.v }" @click="holdingForm.asset_type = t.v">{{ t.label }}</view>
        </view>
        <text class="form-label">份额</text>
        <number-field class="sheet-input" :model-value="holdingForm.sharesStr" placeholder="0" title="份额" :decimal-places="4" :max-integer="12" @update:model-value="(v) => (holdingForm.sharesStr = v)" />
        <text class="form-label">单价（元）</text>
        <number-field class="sheet-input" :model-value="holdingForm.priceStr" placeholder="0" title="单价" :decimal-places="4" :max-integer="12" @update:model-value="(v) => (holdingForm.priceStr = v)" />
        <view class="save-btn" @click="doAddHolding"><text>添加持仓</text></view>
      </view>
    </view>

    <!-- 投资交易弹窗 -->
    <view v-if="showInvestTx" class="sheet-overlay" @click="showInvestTx = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">{{ investTxTitle }}</text>
        <text class="form-label">资金账户</text>
        <view class="type-grid">
          <view v-for="s in dailyAccounts" :key="s._id" class="type-chip" :class="{ active: investTxForm.sourceId === s._id }" @click="investTxForm.sourceId = s._id">{{ s.name }}</view>
        </view>
        <text class="form-label">金额（元）</text>
        <number-field class="sheet-input" :model-value="investTxForm.amountStr" placeholder="0" title="金额" :decimal-places="2" :max-integer="12" @update:model-value="(v) => (investTxForm.amountStr = v)" />
        <text v-if="investTxForm.action !== 'dividend'" class="form-label">份额变动</text>
        <number-field v-if="investTxForm.action !== 'dividend'" class="sheet-input" :model-value="investTxForm.sharesStr" placeholder="0" title="份额变动" :decimal-places="4" :max-integer="12" @update:model-value="(v) => (investTxForm.sharesStr = v)" />
        <view class="save-btn" @click="doInvestTx"><text>确认</text></view>
      </view>
    </view>
      
    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
</view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user.js'
import { listAccountBalanceLogs } from '@/api/sparejar.js'
import { formatFen, safeYuanToFen } from '@/utils/money.js'
import { cdn } from '@/utils/cdn.js'

const userStore = useUserStore()
const state = userStore.state

const accountId = ref('')
const flow = ref([])

const account = computed(() => (state.assets || []).find((a) => a._id === accountId.value))

const SUBTYPES = {
  daily: [
    { v: 'wechat', label: '微信', icon: cdn('/app_static/images/icon_wechat.png') },
    { v: 'alipay', label: '支付宝', icon: cdn('/app_static/images/icon_alipay.png') },
    { v: 'bank_card', label: '银行卡', icon: cdn('/app_static/images/icon_bank_card.png') },
    { v: 'cash', label: '现金', icon: cdn('/app_static/images/icon_cash.png') }
  ],
  special: [
    { v: 'provident_fund', label: '公积金', icon: cdn('/app_static/images/icon_provident_fund.png') },
    { v: 'insurance', label: '医保', icon: cdn('/app_static/images/icon_insurance.png') }
  ],
  investment: [
    { v: 'fund', label: '基金', icon: cdn('/app_static/images/icon_fund.png') },
    { v: 'stock', label: '股票', icon: cdn('/app_static/images/icon_stock.png') },
    { v: 'bond', label: '债券', icon: cdn('/app_static/images/icon_bond.png') },
    { v: 'gold', label: '黄金', icon: cdn('/app_static/images/icon_gold.png') },
    { v: 'other', label: '其他', icon: cdn('/app_static/images/icon_other.png') }
  ]
}
const subtypeMap = {}
for (const k in SUBTYPES) for (const s of SUBTYPES[k]) subtypeMap[s.v] = s
const ASSET_TYPES = [
  { v: 'fund', label: '基金' }, { v: 'stock', label: '股票' }, { v: 'bond', label: '债券' },
  { v: 'gold', label: '黄金' }, { v: 'other', label: '其他' }
]
const SUBTYPE_BG = {
  wechat: '#e8f8ec', alipay: '#e8f1fb', bank_card: '#f3f0ff', bank: '#f3f0ff', cash: '#e1fae3',
  provident_fund: '#eaf3ff', insurance: '#fdeef0',
  fund: '#fffbeb', stock: '#eef5ff', bond: '#f3f0ff', gold: '#fbf3e0', other: '#eef1f4'
}
const CHANGE_TYPES = {
  transaction: '记账', adjust: '调账', transfer_in: '转入', transfer_out: '转出',
  buy: '买入', sell: '卖出', dividend: '分红', refund: '退款'
}

function fmt(fen) { return formatFen(fen || 0) }
function subtypeLabel(a) { const s = subtypeMap[a.account_subtype]; return s ? s.label : a.account_subtype }
function classLabel(a) { return { daily: '日常账户', special: '专项账户', investment: '投资理财', liability: '负债账户' }[a.account_class] || a.account_class }
function iconFor(a) { const s = subtypeMap[a.account_subtype]; return s ? s.icon : cdn('/app_static/images/icon_other.png') }
function colorBgFor(a) { return SUBTYPE_BG[a.account_subtype] || '#e1fae3' }
function assetTypeLabel(t) { const x = ASSET_TYPES.find((i) => i.v === t); return x ? x.label : t }
function changeTypeLabel(t) { return CHANGE_TYPES[t] || t }
function counterName(id) { const a = (state.assets || []).find((x) => x._id === id); return a ? a.name : '账户' }
function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(typeof ts === 'number' ? ts : (ts && ts.$date) || Date.parse(String(ts).replace(' ', 'T')))
  if (isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const otherAccounts = computed(() => (state.assets || []).filter((a) => a._id !== accountId.value))
const dailyAccounts = computed(() => (state.assets || []).filter((a) => a.account_class === 'daily'))

async function toggleFlag(flag, val) {
  if (!account.value) return
  try {
    await userStore.updateAssetAccountAction({ account_id: account.value._id, [flag]: val })
  } catch (e) {
    uni.showToast({ title: (e && e.message) || '更新失败', icon: 'none' })
  }
}

/* 流水 */
async function loadFlow() {
  if (!accountId.value) return
  try {
    // 走云函数读取，禁止前端直连数据库
    flow.value = await listAccountBalanceLogs(accountId.value, 40)
  } catch (e) {
    console.error('[asset-detail] load flow failed', e)
    flow.value = []
  }
}

/* 改数 */
const showAdjust = ref(false)
const adjustForm = reactive({ balanceStr: '', note: '' })
function openAdjust() { adjustForm.balanceStr = ''; adjustForm.note = ''; showAdjust.value = true }
async function doAdjust() {
  const parsed = safeYuanToFen(adjustForm.balanceStr || '0')
  if (!parsed.ok) { uni.showToast({ title: '金额无效', icon: 'none' }); return }
  try {
    await userStore.adjustAccountBalanceAction(accountId.value, parsed.value, adjustForm.note)
    showAdjust.value = false
    uni.showToast({ title: '已调整', icon: 'success' })
    loadFlow()
  } catch (e) { uni.showToast({ title: (e && e.message) || '失败', icon: 'none' }) }
}

/* 转账 */
const showTransfer = ref(false)
const transferForm = reactive({ toId: '', amountStr: '', note: '' })
function openTransfer() { transferForm.toId = ''; transferForm.amountStr = ''; transferForm.note = '转账'; showTransfer.value = true }
async function doTransfer() {
  if (!transferForm.toId) { uni.showToast({ title: '请选择转入账户', icon: 'none' }); return }
  const parsed = safeYuanToFen(transferForm.amountStr || '0')
  if (!parsed.ok || parsed.value <= 0) { uni.showToast({ title: '金额无效', icon: 'none' }); return }
  try {
    await userStore.transferBetweenAccountsAction(accountId.value, transferForm.toId, parsed.value, transferForm.note)
    showTransfer.value = false
    uni.showToast({ title: '已转账', icon: 'success' })
    loadFlow()
  } catch (e) { uni.showToast({ title: (e && e.message) || '失败', icon: 'none' }) }
}

/* 加持仓 */
const showHolding = ref(false)
const holdingForm = reactive({ name: '', code: '', asset_type: 'fund', sharesStr: '', priceStr: '' })
function openHolding() { Object.assign(holdingForm, { name: '', code: '', asset_type: 'fund', sharesStr: '', priceStr: '' }); showHolding.value = true }
async function doAddHolding() {
  if (!holdingForm.name) { uni.showToast({ title: '请输入名称', icon: 'none' }); return }
  const shares = parseFloat(holdingForm.sharesStr) || 0
  const price = safeYuanToFen(holdingForm.priceStr || '0')
  try {
    await userStore.createInvestmentHoldingAction({
      account_id: accountId.value,
      name: holdingForm.name,
      code: holdingForm.code,
      asset_type: holdingForm.asset_type,
      shares,
      unit_price: price.ok ? price.value : 0
    })
    showHolding.value = false
    uni.showToast({ title: '已添加', icon: 'success' })
  } catch (e) { uni.showToast({ title: (e && e.message) || '失败', icon: 'none' }) }
}

/* 投资交易 */
const showInvestTx = ref(false)
const investTxForm = reactive({ holdingId: '', action: 'buy', sourceId: '', amountStr: '', sharesStr: '' })
const investTxTitle = computed(() => ({ buy: '买入', dca: '定投买入', sell: '卖出', dividend: '分红' }[investTxForm.action] || '投资'))
function openInvestTx(h, action) {
  investTxForm.holdingId = h._id
  investTxForm.action = action
  investTxForm.sourceId = dailyAccounts.value[0] ? dailyAccounts.value[0]._id : ''
  investTxForm.amountStr = ''
  investTxForm.sharesStr = ''
  showInvestTx.value = true
}
async function doInvestTx() {
  const parsed = safeYuanToFen(investTxForm.amountStr || '0')
  if (!parsed.ok || parsed.value <= 0) { uni.showToast({ title: '金额无效', icon: 'none' }); return }
  if (!investTxForm.sourceId) { uni.showToast({ title: '请选择资金账户', icon: 'none' }); return }
  try {
    await userStore.investmentTransactionAction({
      holding_id: investTxForm.holdingId,
      action: investTxForm.action,
      amount: parsed.value,
      shares_delta: parseFloat(investTxForm.sharesStr) || 0,
      source_account_id: investTxForm.sourceId
    })
    showInvestTx.value = false
    uni.showToast({ title: '已记录', icon: 'success' })
    loadFlow()
  } catch (e) { uni.showToast({ title: (e && e.message) || '失败', icon: 'none' }) }
}

function onDeleteHolding(h) {
  uni.showModal({ title: '删除持仓', content: `确定删除「${h.name}」吗？`, success: async (res) => {
    if (res.confirm) { await userStore.deleteInvestmentHoldingAction(h._id); uni.showToast({ title: '已删除', icon: 'success' }) }
  } })
}
function onDelete() {
  uni.showModal({ title: '删除确认', content: `确定删除「${account.value ? account.value.name : ''}」吗？`, success: async (res) => {
    if (res.confirm) { await userStore.deleteAssetAccountAction(accountId.value); uni.navigateBack() }
  } })
}
function goBack() { uni.navigateBack() }

function resolveTopPadding() {
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton && menuButton.bottom > 0) return `${menuButton.bottom + uni.upx2px(16)}px`
  } catch (_) {}
  const { statusBarHeight = 0 } = uni.getSystemInfoSync()
  return `${statusBarHeight + uni.upx2px(88)}px`
}
const pagePaddingTop = ref(resolveTopPadding())

onMounted(async () => {
  pagePaddingTop.value = resolveTopPadding()
  const pages = getCurrentPages()
  const cur = pages[pages.length - 1]
  accountId.value = (cur && cur.options && cur.options.id) || ''
  await userStore.loadAssetAccounts().catch(() => {})
  loadFlow()
})
</script>

<style scoped>
.detail-page { min-height: 100vh; background: linear-gradient(180deg, #F2FCF2, #FFFFFF); display: flex; flex-direction: column; overflow: hidden; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 16px 10px; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b8c7a; font-size: 16px; }
.topbar-title { font-size: 17px; font-weight: 700; color: var(--ink); }

.glass-hero { margin: 16px; padding: 18px; }
.hero-row { display: flex; align-items: center; gap: 12px; }
.hero-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
.hero-icon-img { width: 30px; height: 30px; }
.hero-info { flex: 1; }
.hero-name { font-size: 17px; font-weight: 800; color: var(--ink); display: block; }
.hero-sub { font-size: 12px; color: var(--ink4); }
.hero-balance { font-size: 32px; font-weight: 900; display: block; margin-top: 12px; }
.hero-pl { font-size: 12px; color: var(--ink4); display: block; margin-top: 4px; }

.rule-card { margin: 12px 16px 0; padding: 6px 16px; }
.toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
.toggle-lbl { font-size: 13px; color: var(--ink); font-weight: 600; }

.action-row { display: flex; gap: 10px; margin: 12px 16px 0; }
.action-btn { flex: 1; background: rgba(255,255,255,0.7); border: 1px solid rgba(194,242,200,0.3); border-radius: 14px; padding: 12px 0; display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: #6b8c7a; cursor: pointer; }
.action-btn.danger { color: #f53f3f; }
.action-ic { font-size: 18px; }

.section { margin: 16px 16px 0; }
.section-header { font-size: 13px; color: var(--ink4); font-weight: 700; display: block; margin-bottom: 8px; }

.holding-card { padding: 14px 16px; margin-bottom: 10px; }
.holding-row { display: flex; align-items: center; justify-content: space-between; }
.holding-name { font-size: 14px; font-weight: 700; color: var(--ink); }
.holding-code { font-size: 11px; color: var(--ink4); font-weight: 400; }
.holding-sub { font-size: 11px; color: var(--ink4); display: block; margin-top: 2px; }
.holding-val { text-align: right; }
.holding-mv { font-size: 15px; font-weight: 800; color: var(--ink); display: block; }
.holding-pl { font-size: 11px; display: block; }
.holding-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.ha-btn { font-size: 12px; padding: 5px 12px; border-radius: 10px; background: rgba(37,204,93,0.1); color: #25cc5d; font-weight: 600; cursor: pointer; }
.ha-btn.danger { background: rgba(245,63,63,0.1); color: #f53f3f; }

.flow-card { padding: 12px 16px; margin-bottom: 8px; }
.flow-row { display: flex; align-items: center; justify-content: space-between; }
.flow-type { font-size: 13px; font-weight: 600; color: var(--ink); }
.flow-delta { font-size: 14px; font-weight: 800; }
.flow-sub { font-size: 11px; color: var(--ink4); margin-top: 2px; }
.flow-time { color: var(--ink4); }

.disclaimer { text-align: center; font-size: 11px; color: var(--ink4); margin: 16px 16px 0; opacity: 0.8; }
.empty-tip { text-align: center; color: var(--ink4); font-size: 13px; padding: 24px 0; }

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
.save-btn { margin-top: 18px; padding: 14px; border-radius: 16px; background: linear-gradient(135deg,#4fd974,#25cc5d); text-align: center; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; }
</style>
