<template>
  <view class="wish-page" data-cmp="WishPage">
    <!-- 极光背景 -->
    <view class="aurora-bg-wrap">
      <view class="aurora-bg-base" />
      <view class="aurora-band-1" />
      <view class="blob-top-l" />
      <view class="blob-top-r" />
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="height:calc(100% - 74px);z-index:2;">
      <!-- 顶部 -->
      <view class="topbar">
        <view>
          <text class="topbar-sub">心愿清单</text>
          <text class="topbar-title">⭐ 我的心愿</text>
        </view>
        <view class="topbar-right">
          <view class="pool-chip glass-thin" style="padding:6px 14px;" @click="showSavings = true">
            <text>🐷 存款池 ¥{{ savingsBalance }}</text>
          </view>
        </view>
      </view>

      <!-- 存款池能量环 -->
      <view class="pool-ring glass-mid" style="margin:12px 16px;padding:18px;display:flex;align-items:center;gap:16px;">
        <view class="pool-ring-visual">
          <text class="pool-ring-emoji">🐷</text>
        </view>
        <view style="flex:1;">
          <text class="pool-ring-label">通用存款池（虚拟）</text>
          <text class="pool-ring-amount">¥{{ savingsBalance }}</text>
          <text class="pool-ring-sub">累计结余池 ¥{{ surplusBalance }}</text>
        </view>
        <view class="pool-action-btn glass-thin" style="padding:8px 14px;" @click="openSavings('deposit')">
          <text>+ 存入</text>
        </view>
      </view>

      <!-- 心愿瀑布流 -->
      <view class="wish-grid" style="padding:0 16px;">
        <view
          v-for="(w, i) in wishes"
          :key="w._id"
          class="wish-card glass-mid card-in-1"
          @click="openDetail(w)"
        >
          <view class="wish-cover" :style="{ background: grad(i) }">
            <text class="wish-cover-emoji">⭐</text>
          </view>
          <view class="wish-body">
            <text class="wish-name">{{ w.name }}</text>
            <view class="wish-bar">
              <view class="wish-bar-fill" :style="{ width: Math.min((w.saved_amount || 0) / (w.target_amount || 1) * 100, 100) + '%' }" />
            </view>
            <view class="wish-meta">
              <text class="wish-amount">¥{{ formatFen(w.saved_amount || 0) }} / ¥{{ formatFen(w.target_amount || 0) }}</text>
              <text class="wish-deadline">{{ w.deadline ? '截止 ' + w.deadline : '无截止' }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="!wishes.length" class="wish-empty glass-thin" style="margin:8px 16px;padding:24px;text-align:center;">
        <text class="wish-empty-text">还没有心愿</text>
        <text class="wish-empty-sub">点击下方按钮，建一个攒钱目标吧</text>
      </view>

      <view class="compliance-banner glass-thin" style="margin:8px 16px;padding:12px 14px;">
        <text class="compliance-icon">⚠️</text>
        <text class="compliance-text">心愿与存款池均为虚拟记账额度，非真实资金账户，仅用于攒钱激励与管控。</text>
      </view>

      <view style="height:24px;" />
    </scroll-view>

    <!-- 新建心愿按钮 -->
    <view class="fab-new" @click="showNewWish = true"><text>＋</text></view>

    <!-- 心愿详情弹窗 -->
    <view v-if="detailWish" class="sheet-overlay" @click="detailWish = null">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <view class="detail-header" :style="{ background: grad(detailIndex) }">
          <text class="detail-emoji">⭐</text>
          <text class="detail-name">{{ detailWish.name }}</text>
        </view>
        <view class="detail-body">
          <view class="detail-amount-row">
            <text class="detail-amount">¥{{ formatFen(detailWish.saved_amount || 0) }}</text>
            <text class="detail-target">/ ¥{{ formatFen(detailWish.target_amount || 0) }}</text>
          </view>
          <view class="detail-bar">
            <view class="detail-bar-fill" :style="{ width: Math.min((detailWish.saved_amount || 0) / (detailWish.target_amount || 1) * 100, 100) + '%' }" />
          </view>
          <text class="detail-left-text">还差 ¥{{ formatFen(Math.max(0, (detailWish.target_amount || 0) - (detailWish.saved_amount || 0))) }}</text>

          <!-- 存入 -->
          <view class="op-block">
            <text class="op-title">存入来源</text>
            <view class="op-sources">
              <view class="op-source" :class="{ active: depositSource === 'manual' }" @click="depositSource = 'manual'">手动虚拟</view>
              <view class="op-source" :class="{ active: depositSource === 'surplus' }" @click="depositSource = 'surplus'">从结余池</view>
              <view class="op-source" :class="{ active: depositSource === 'savings' }" @click="depositSource = 'savings'">从存款池</view>
            </view>
            <view class="op-input-row">
              <input class="op-input" v-model="depositAmount" type="digit" placeholder="金额(元)" />
              <view class="op-confirm" @click="doDeposit"><text>存入 +</text></view>
            </view>
          </view>

          <!-- 取出 -->
          <view class="op-block">
            <text class="op-title">取出（退回累计结余池）</text>
            <view class="op-input-row">
              <input class="op-input" v-model="withdrawAmount" type="digit" placeholder="金额(元)" />
              <view class="op-confirm withdraw" @click="doWithdraw"><text>取回</text></view>
            </view>
          </view>

          <view class="detail-actions" style="margin-top:8px;display:flex;gap:10px;">
            <view class="archive-btn" @click="doArchive"><text>达成归档</text></view>
          </view>

          <text class="detail-records-title">存取记录</text>
          <view v-for="r in fundLogs" :key="r._id || r.created_at" class="record-row">
            <view class="record-left">
              <text class="record-type">{{ r.direction === 'in' ? '💚 存入' : '💔 取出' }}</text>
              <text class="record-source">{{ sourceLabel(r.source) }}</text>
            </view>
            <view class="record-right">
              <text class="record-amount" :class="r.direction">{{ r.direction === 'in' ? '+' : '-' }}¥{{ formatFen(r.amount || 0) }}</text>
              <text class="record-date">{{ fmtDate(r.created_at) }}</text>
            </view>
          </view>
          <view v-if="!fundLogs.length" class="record-empty"><text>暂无记录</text></view>
        </view>
      </view>
    </view>

    <!-- 新建心愿弹窗 -->
    <view v-if="showNewWish" class="sheet-overlay" @click="showNewWish = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">创建新心愿</text>
        <input class="sheet-input" v-model="newWishName" placeholder="心愿名称" />
        <input class="sheet-input" v-model="newWishAmount" type="digit" placeholder="目标金额(元)" />
        <input class="sheet-input" v-model="newWishDeadline" placeholder="截止日期（如 2025-12-31，可空）" />
        <view class="save-btn" @click="createWish"><text>创建心愿</text></view>
      </view>
    </view>

    <!-- 存款池存取弹窗 -->
    <view v-if="showSavings" class="sheet-overlay" @click="showSavings = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">通用存款池（虚拟记账）</text>
        <view class="savings-balance-row">
          <text>当前余额</text>
          <text class="savings-balance">¥{{ savingsBalance }}</text>
        </view>
        <view class="op-sources" style="margin:8px 20px 4px;">
          <view class="op-source" :class="{ active: savingsMode === 'deposit' }" @click="savingsMode = 'deposit'">存入</view>
          <view class="op-source" :class="{ active: savingsMode === 'withdraw' }" @click="savingsMode = 'withdraw'">取出</view>
        </view>
        <view class="op-input-row" style="margin:8px 20px;">
          <input class="op-input" v-model="savingsAmount" type="digit" placeholder="金额(元)" />
          <view class="op-confirm" :class="{ withdraw: savingsMode === 'withdraw' }" @click="doSavings">
            <text>{{ savingsMode === 'deposit' ? '存入' : '取出' }}</text>
          </view>
        </view>
        <text class="compliance-note">存款池为虚拟记账额度，非真实资金账户，取出仅回退至累计结余池。</text>
      </view>
    </view>

    <!-- TabBar -->
    <TabBar :current="4" />
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import TabBar from '@/components/tabbar/tabbar.vue';
import { useUserStore } from '@/stores/user.js';
import { formatFen, safeYuanToFen } from '@/utils/money.js';

const {
  state,
  savingsPoolBalanceFen,
  surplusPoolBalanceFen,
  loadWishes,
  loadSavingsPool,
  createWishAction,
  archiveWishAction,
  loadWishFundLogsAction,
  depositWishManualAction,
  depositWishFromSurplusAction,
  depositWishFromSavingsAction,
  withdrawWishToSurplusAction,
  depositSavingsPoolAction,
  withdrawSavingsPoolAction
} = useUserStore();

const wishes = computed(() => (Array.isArray(state.wishes) ? state.wishes : []));
const savingsBalance = computed(() => formatFen(savingsPoolBalanceFen.value));
const surplusBalance = computed(() => formatFen(surplusPoolBalanceFen.value));

const gradients = [
  'linear-gradient(135deg,#e1fae3 0%,#c2f2c8 60%,#89e59c 100%)',
  'linear-gradient(135deg,#e8f4ff 0%,#c8e6ff 60%,#a8d4ff 100%)',
  'linear-gradient(135deg,#f3e8ff 0%,#e0c8ff 60%,#d0a8ff 100%)',
  'linear-gradient(135deg,#fff1e0 0%,#ffd9a8 60%,#ffb866 100%)'
];
const grad = (i) => gradients[((i % gradients.length) + gradients.length) % gradients.length];

const toast = (title, icon = 'none') => uni.showToast({ title, icon });
const fmtDate = (ts) => {
  if (!ts) return '';
  const d = new Date(String(ts).replace(' ', 'T'));
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const sourceLabel = (s) => {
  const map = {
    manual: '手动虚拟',
    surplus_pool: '结余池转入',
    savings_pool: '存款池转入',
    withdraw: '取出退回',
    to_wish: '转入心愿',
    from_wish: '心愿退回'
  };
  return map[s] || s || '';
};

onMounted(async () => {
  try {
    await Promise.all([loadWishes(), loadSavingsPool()]);
  } catch (err) {
    console.error('[wish] 加载失败', err);
  }
});

/* 详情 */
const detailWish = ref(null);
const detailIndex = ref(0);
const fundLogs = ref([]);
const openDetail = (w) => {
  detailIndex.value = wishes.value.findIndex((x) => x._id === w._id);
  detailWish.value = w;
  loadLogs(w._id);
};
const loadLogs = async (wishId) => {
  fundLogs.value = await loadWishFundLogsAction(wishId);
};
// loadWishes 会整体替换数组，需把详情对象重新指向最新引用，避免展示陈旧数据
const syncDetail = () => {
  if (!detailWish.value) return;
  const fresh = wishes.value.find((w) => w._id === detailWish.value._id);
  if (fresh) detailWish.value = fresh;
};

/* 存款 */
const depositSource = ref('manual');
const depositAmount = ref('');
const doDeposit = async () => {
  const w = detailWish.value;
  if (!w) return;
  const res = safeYuanToFen(depositAmount.value);
  if (!res.ok) return toast('金额无效');
  if (res.value > (w.target_amount || 0) - (w.saved_amount || 0)) return toast('超过目标剩余');
  try {
    if (depositSource.value === 'manual') await depositWishManualAction(w._id, res.value);
    else if (depositSource.value === 'surplus') await depositWishFromSurplusAction(w._id, res.value);
    else await depositWishFromSavingsAction(w._id, res.value);
    depositAmount.value = '';
    await loadLogs(w._id);
    syncDetail();
    toast('存入成功', 'success');
  } catch (err) {
    toast(err.message || '存入失败');
  }
};

/* 取出 */
const withdrawAmount = ref('');
const doWithdraw = async () => {
  const w = detailWish.value;
  if (!w) return;
  const res = safeYuanToFen(withdrawAmount.value);
  if (!res.ok) return toast('金额无效');
  if (res.value > (w.saved_amount || 0)) return toast('超过已存金额');
  try {
    await withdrawWishToSurplusAction(w._id, res.value);
    withdrawAmount.value = '';
    await loadLogs(w._id);
    syncDetail();
    toast('已取回到结余池');
  } catch (err) {
    toast(err.message || '取出失败');
  }
};

/* 归档 */
const doArchive = async () => {
  const w = detailWish.value;
  if (!w) return;
  try {
    await archiveWishAction(w._id);
    detailWish.value = null;
    toast('已归档', 'success');
  } catch (err) {
    toast(err.message || '归档失败');
  }
};

/* 新建 */
const showNewWish = ref(false);
const newWishName = ref('');
const newWishAmount = ref('');
const newWishDeadline = ref('');
const createWish = async () => {
  if (!newWishName.value.trim()) return toast('请输入心愿名称');
  const res = safeYuanToFen(newWishAmount.value);
  if (!res.ok) return toast('目标金额无效');
  try {
    await createWishAction({
      name: newWishName.value.trim(),
      target_amount: res.value,
      deadline: newWishDeadline.value.trim()
    });
    showNewWish.value = false;
    newWishName.value = '';
    newWishAmount.value = '';
    newWishDeadline.value = '';
    toast('心愿已创建', 'success');
  } catch (err) {
    toast(err.message || '创建失败');
  }
};

/* 存款池存取 */
const showSavings = ref(false);
const savingsMode = ref('deposit');
const savingsAmount = ref('');
const openSavings = (mode) => {
  savingsMode.value = mode;
  showSavings.value = true;
};
const doSavings = async () => {
  const res = safeYuanToFen(savingsAmount.value);
  if (!res.ok) return toast('金额无效');
  try {
    if (savingsMode.value === 'deposit') await depositSavingsPoolAction(res.value, 'manual');
    else await withdrawSavingsPoolAction(res.value, 'manual');
    savingsAmount.value = '';
    toast('操作成功', 'success');
  } catch (err) {
    toast(err.message || '操作失败');
  }
};
</script>

<style scoped>
.wish-page { width: 375px; height: 812px; overflow: hidden; position: relative; margin: 0 auto; background: #f2fcf2; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 52px 18px 0; }
.topbar-sub { font-size: 11px; color: #9bb8a8; display: block; margin-bottom: 2px; }
.topbar-title { font-size: 20px; font-weight: 900; color: #0f1c14; }
.pool-chip { font-size: 11px; color: #3a5244; font-weight: 600; cursor: pointer; }

.pool-ring-visual { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg,rgba(194,242,200,0.6),rgba(37,204,93,0.3)); display: flex; align-items: center; justify-content: center; }
.pool-ring-emoji { font-size: 28px; }
.pool-ring-label { font-size: 10px; color: #9bb8a8; display: block; }
.pool-ring-amount { font-size: 22px; font-weight: 900; color: #0f1c14; display: block; }
.pool-ring-sub { font-size: 10px; color: #25cc5d; font-weight: 500; }
.pool-action-btn { cursor: pointer; font-size: 12px; font-weight: 600; color: #25cc5d; text-align: center; }

.wish-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.wish-card { width: calc(50% - 6px); border-radius: 16px; overflow: hidden; cursor: pointer; }
.wish-cover { height: 80px; display: flex; align-items: center; justify-content: center; }
.wish-cover-emoji { font-size: 36px; }
.wish-body { padding: 10px 12px 12px; }
.wish-name { font-size: 13px; font-weight: 700; color: #0f1c14; display: block; margin-bottom: 8px; }
.wish-bar { height: 5px; border-radius: 3px; background: rgba(194,242,200,0.3); overflow: hidden; margin-bottom: 6px; }
.wish-bar-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg,#89e59c,#25cc5d); }
.wish-meta { display: flex; justify-content: space-between; }
.wish-amount { font-size: 10px; color: #6b8c7a; font-weight: 600; }
.wish-deadline { font-size: 9px; color: #9bb8a8; }

.wish-empty { border-radius: 16px; }
.wish-empty-text { font-size: 14px; font-weight: 700; color: #0f1c14; display: block; margin-bottom: 4px; }
.wish-empty-sub { font-size: 11px; color: #9bb8a8; }

.compliance-banner { border-radius: 14px; display: flex; align-items: flex-start; gap: 8px; }
.compliance-icon { font-size: 14px; }
.compliance-text { flex: 1; font-size: 11px; color: #9bb8a8; line-height: 1.5; }

.fab-new { position: fixed; right: 20px; bottom: 86px; width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg,#4fd974,#25cc5d); display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 20px rgba(37,204,93,0.4); z-index: 50; cursor: pointer; }
.fab-new text { font-size: 28px; color: #fff; font-weight: 300; }

.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 300; display: flex; align-items: flex-end; justify-content: center; }
.sheet-panel { width: 375px; max-height: 85vh; overflow-y: auto; background: linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,252,242,0.96)); border-radius: 24px 24px 0 0; }
.sheet-handle { display: flex; justify-content: center; padding: 12px 0 8px; }
.handle-bar { width: 38px; height: 4px; border-radius: 3px; background: rgba(194,242,200,0.8); }
.sheet-title { font-size: 16px; font-weight: 800; color: #0f1c14; display: block; padding: 0 20px 14px; }
.sheet-input { width: calc(100% - 40px); margin: 0 20px 10px; height: 44px; border-radius: 14px; background: rgba(242,252,242,0.8); border: 1px solid rgba(194,242,200,0.4); padding: 0 14px; font-size: 14px; }
.save-btn { margin: 14px 20px 30px; padding: 14px; border-radius: 16px; background: linear-gradient(135deg,#4fd974,#25cc5d); text-align: center; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; }

.detail-header { padding: 30px 20px; text-align: center; }
.detail-emoji { font-size: 48px; display: block; }
.detail-name { font-size: 18px; font-weight: 800; color: #0f1c14; margin-top: 8px; display: block; }
.detail-body { padding: 0 20px 30px; }
.detail-amount-row { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; }
.detail-amount { font-size: 28px; font-weight: 900; color: #0f1c14; }
.detail-target { font-size: 14px; color: #9bb8a8; }
.detail-bar { height: 8px; border-radius: 5px; background: rgba(194,242,200,0.3); overflow: hidden; }
.detail-bar-fill { height: 100%; border-radius: 5px; background: linear-gradient(90deg,#89e59c,#25cc5d); }
.detail-left-text { font-size: 12px; color: #6b8c7a; font-weight: 600; display: block; margin-top: 6px; }

.op-block { margin-top: 16px; }
.op-title { font-size: 12px; font-weight: 700; color: #3a5244; display: block; margin-bottom: 8px; }
.op-sources { display: flex; gap: 8px; }
.op-source { flex: 1; text-align: center; padding: 8px 0; border-radius: 12px; background: rgba(242,252,242,0.8); border: 1px solid rgba(194,242,200,0.4); font-size: 12px; font-weight: 600; color: #6b8c7a; cursor: pointer; }
.op-source.active { background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; border-color: transparent; }
.op-input-row { display: flex; gap: 10px; margin-top: 10px; align-items: center; }
.op-input { flex: 1; height: 42px; border-radius: 12px; background: rgba(242,252,242,0.8); border: 1px solid rgba(194,242,200,0.4); padding: 0 14px; font-size: 14px; }
.op-confirm { padding: 0 18px; height: 42px; border-radius: 12px; background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; font-size: 13px; font-weight: 700; display: flex; align-items: center; cursor: pointer; }
.op-confirm.withdraw { background: rgba(255,255,255,0.7); border: 1px solid #c2f2c8; color: #6b8c7a; }

.archive-btn { flex: 1; padding: 12px; border-radius: 14px; background: rgba(255,255,255,0.7); border: 1px solid #c2f2c8; text-align: center; color: #6b8c7a; font-size: 14px; font-weight: 700; cursor: pointer; }

.detail-records-title { font-size: 12px; font-weight: 700; color: #0f1c14; display: block; margin: 20px 0 10px; }
.record-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(15,28,20,0.04); }
.record-type { font-size: 12px; color: #3a5244; display: block; }
.record-source { font-size: 10px; color: #9bb8a8; }
.record-right { text-align: right; }
.record-amount { font-size: 14px; font-weight: 700; display: block; }
.record-amount.in { color: #25cc5d; }
.record-amount.out { color: #ff6b6b; }
.record-date { font-size: 10px; color: #9bb8a8; }
.record-empty { font-size: 12px; color: #9bb8a8; text-align: center; padding: 16px 0; }

.savings-balance-row { display: flex; justify-content: space-between; align-items: center; padding: 0 20px 4px; }
.savings-balance-row text:first-child { font-size: 13px; color: #6b8c7a; }
.savings-balance { font-size: 20px; font-weight: 900; color: #0f1c14; }
.compliance-note { display: block; padding: 14px 20px 28px; font-size: 11px; color: #9bb8a8; line-height: 1.5; }
</style>
