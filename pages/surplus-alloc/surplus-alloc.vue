<template>
  <view class="alloc-page" data-cmp="SurplusAlloc">
    <view class="topbar">
      <view class="back-btn" @tap="goBack"><text>←</text></view>
      <text class="topbar-title">盈余分配</text>
      <view style="width:36px;" />
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="flex:1;">
      <!-- 待分配结余 -->
      <view class="glass-hero card-in-1" style="margin:16px;padding:18px;text-align:center;">
        <text class="surplus-label">{{ surplusLabelText }}</text>
        <text class="surplus-amount" v-if="pending">¥{{ surplusText }}</text>
        <text class="surplus-amount muted" v-else>¥0</text>
        <text v-if="pending" class="surplus-date">结算日 {{ pending.date_key }}</text>
      </view>

      <view v-if="pending" class="glass-mid" style="margin:0 16px 16px;padding:18px;">
        <text class="section-title">🎯 存入目标</text>
        <!-- 目标选择：心愿 / 存款池（日维度额外提供滚存次日） -->
        <view class="target-row">
          <view
            v-for="t in targets"
            :key="t.key"
            class="target-item"
            :class="{ active: selectedTarget === t.key }"
            @tap="selectedTarget = t.key"
          >
            <text class="target-emoji">{{ t.emoji }}</text>
            <text class="target-name">{{ t.name }}</text>
          </view>
        </view>

        <!-- 动态详情：按所选目标展示对应资产列表/信息 -->
        <view v-if="selectedTarget === 'wish'" class="target-detail">
          <view class="picker-field" @tap="openPicker('wish')">
            <text class="picker-emoji">⭐</text>
            <view class="picker-text">
              <text class="picker-name">{{ currentWishName }}</text>
              <text class="picker-sub">{{ currentWishSub }}</text>
            </view>
            <text class="picker-arrow">›</text>
          </view>
        </view>

        <view v-else-if="selectedTarget === 'savings_pool'" class="target-detail">
          <text class="detail-title">通用存款池</text>
          <text class="detail-sub">当前余额 ¥{{ savingsPoolText }}，存入后可存入心愿或取出</text>
        </view>

        <view v-else-if="selectedTarget === 'account'" class="target-detail">
          <view class="picker-field" @tap="openPicker('account')">
            <text class="picker-emoji">🏦</text>
            <view class="picker-text">
              <text class="picker-name">{{ currentAccountName }}</text>
              <text class="picker-sub">{{ currentAccountSub }}</text>
            </view>
            <text class="picker-arrow">›</text>
          </view>
        </view>

        <view v-else-if="selectedTarget === 'roll_over'" class="target-detail">
          <text class="detail-sub">将昨日结余保留为次日可用额度（整笔，不输入金额）</text>
        </view>

        <!-- 金额：心愿/存款池支持部分金额（输入或滑条）；滚存次日为整笔 -->
        <view v-if="selectedTarget !== 'roll_over'" class="amount-block">
          <view class="amount-head">
            <text class="detail-title">存入金额</text>
            <view class="amount-quick">
              <text class="quick-btn" @tap="setAmountMax()">全部</text>
              <text class="quick-btn" @tap="setAmountHalf()">一半</text>
            </view>
          </view>
          <view class="amount-input-row">
            <text class="amount-cny">¥</text>
            <input
              class="amount-input"
              type="digit"
              :value="amountInput"
              @input="onAmountInput"
              placeholder="0.00"
            />
            <text class="amount-max">/ 可用 ¥{{ maxYuanText }}</text>
          </view>
          <slider
            class="amount-slider"
            :value="amountYuan"
            :min="0"
            :max="maxYuan"
            :step="1"
            activeColor="#25cc5d"
            backgroundColor="rgba(194,242,200,0.3)"
            blockColor="#25cc5d"
            @change="onSliderChange"
          />
          <text class="amount-remain">本次存入后，结余池仍剩 ¥{{ remainText }}</text>
        </view>
      </view>

      <view v-else class="glass-thin" style="margin:0 16px 16px;padding:24px;text-align:center;">
        <text class="empty-text">今日暂无结余待分配</text>
        <text class="empty-sub">省下的钱已自动滚存至累计结余池</text>
      </view>

      <!-- 分配历史入口 -->
      <view class="glass-thin" style="margin:0 16px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;" @tap="goHistory">
        <text class="history-label">📋 查看分配历史</text>
        <text class="history-arrow">›</text>
      </view>

      <!-- 确认按钮 -->
      <view v-if="pending" style="padding:20px 16px 30px;">
        <view class="confirm-btn" :class="{ loading: allocating }" @tap="confirmAlloc">
          <text>{{ allocating ? '处理中…' : '✅ 确认分配' }}</text>
        </view>
      </view>

      <!-- 取回预算（月/年）：把转出去的钱取回期间池 -->
      <view v-if="!isDayDim && periodMovedOutFen > 0" style="padding:0 16px 30px;">
        <view class="retrieve-entry" @tap="showRetrieve = !showRetrieve">
          <text class="retrieve-entry-label">↩ 取回预算</text>
          <text class="retrieve-entry-sub">本期已转出 ¥{{ movedOutText }}</text>
          <text class="picker-arrow">{{ showRetrieve ? '▾' : '›' }}</text>
        </view>

        <view v-if="showRetrieve" class="glass-mid retrieve-panel">
          <text class="detail-title">从来源取回，增加本期池剩余</text>
          <view class="target-row">
            <view
              v-for="s in retrieveSources"
              :key="s.key"
              class="target-item"
              :class="{ active: retrieveSource === s.key }"
              @tap="retrieveSource = s.key"
            >
              <text class="target-emoji">{{ s.emoji }}</text>
              <text class="target-name">{{ s.name }}</text>
            </view>
          </view>

          <view v-if="retrieveSource === 'wish'" class="target-detail">
            <view class="picker-field" @tap="openPicker('wish', 'retrieve')">
              <text class="picker-emoji">⭐</text>
              <view class="picker-text">
                <text class="picker-name">{{ currentRetrieveWishName }}</text>
                <text class="picker-sub">已存 ¥{{ currentRetrieveWish ? formatFen(currentRetrieveWish.saved_amount || 0) : '0' }}</text>
              </view>
              <text class="picker-arrow">›</text>
            </view>
          </view>
          <view v-else-if="retrieveSource === 'account'" class="target-detail">
            <view class="picker-field" @tap="openPicker('account', 'retrieve')">
              <text class="picker-emoji">🏦</text>
              <view class="picker-text">
                <text class="picker-name">{{ currentRetrieveAccountName }}</text>
                <text class="picker-sub">余额 ¥{{ currentRetrieveAccount ? formatFen(currentRetrieveAccount.current_balance || 0) : '0' }}</text>
              </view>
              <text class="picker-arrow">›</text>
            </view>
          </view>

          <view class="amount-block">
            <view class="amount-head">
              <text class="detail-title">取回金额</text>
              <view class="amount-quick">
                <text class="quick-btn" @tap="setRetrieveMax()">全部</text>
              </view>
            </view>
            <view class="amount-input-row">
              <text class="amount-cny">¥</text>
              <input class="amount-input" type="digit" :value="retrieveAmountInput" @input="onRetrieveInput" placeholder="0.00" />
              <text class="amount-max">/ 可取回 ¥{{ retrieveMaxText }}</text>
            </view>
            <slider
              class="amount-slider"
              :value="retrieveAmountYuan"
              :min="0"
              :max="retrieveMaxYuan"
              :step="1"
              activeColor="#25cc5d"
              backgroundColor="rgba(194,242,200,0.3)"
              blockColor="#25cc5d"
              @change="onRetrieveSlider"
            />
          </view>

          <view class="confirm-btn retrieve-confirm" :class="{ loading: retrieving }" @tap="doRetrieve">
            <text>{{ retrieving ? '处理中…' : '↩ 确认取回' }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
      
    <!-- 心愿/账户选择弹窗 -->
    <view v-if="activePicker" class="picker-mask" @tap="closePicker">
      <view class="picker-sheet" @tap.stop>
        <view class="picker-sheet-head">
          <text class="picker-sheet-title">{{ activePicker === 'wish' ? '选择存入的心愿' : '选择存入的账户' }}</text>
          <text class="picker-sheet-close" @tap="closePicker">✕</text>
        </view>
        <scroll-view class="picker-sheet-list" scroll-y>
          <template v-if="activePicker === 'wish'">
            <view
              v-for="w in wishes"
              :key="w._id"
              class="picker-opt"
              :class="{ active: pickerWishId === w._id }"
              @tap="pickWish(w)"
            >
              <text class="picker-opt-name">{{ w.name }}</text>
              <text class="picker-opt-sub">已存 ¥{{ formatFen(w.saved_amount || 0) }}</text>
              <text v-if="pickerWishId === w._id" class="picker-opt-check">✓</text>
            </view>
            <view v-if="!wishes.length" class="picker-empty">暂无心愿，请先到心愿页创建</view>
          </template>
          <template v-else>
            <view
              v-for="a in accounts"
              :key="a._id"
              class="picker-opt"
              :class="{ active: pickerAccountId === a._id }"
              @tap="pickAccount(a)"
            >
              <text class="picker-opt-name">{{ a.name }}</text>
              <text class="picker-opt-sub">余额 ¥{{ formatFen(a.current_balance || 0) }}</text>
              <text v-if="pickerAccountId === a._id" class="picker-opt-check">✓</text>
            </view>
            <view v-if="!accounts.length" class="picker-empty">暂无资产账户，请先到资产页创建</view>
          </template>
        </scroll-view>
      </view>
    </view>

    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
</view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useUserStore } from '@/stores/user.js';
import { formatFen } from '@/utils/money.js';
import { todayDateKey } from '@/utils/date.js';

const { state, loadWishes, loadSurplusPool, loadAssetAccounts, loadPendingAllocationAction, refreshTodayDashboard, confirmSurplusRolloverAction, depositWishFromSurplusAction, depositSavingsFromSurplusAction, depositAccountFromSurplusAction, transferBudgetOutAction, transferBudgetInAction, monthPoolFen, monthConsumedFen, yearPoolFen, yearConsumedFen, pendingRolloverFen, checkLoggedIn } = useUserStore();

const pending = computed(() => state.pendingAllocation);
const wishes = computed(() => (Array.isArray(state.wishes) ? state.wishes : []));
const surplusText = computed(() => (pending.value ? formatFen(pending.value.surplus) : '0'));

// 维度感知：日维度可"滚存次日额度"；月/年维度无次日滚入，结余归入月池/年池，仅可转出至存款池/心愿
const dim = computed(() => (state.settings && state.settings.limit_dim) || 'day');
const isDayDim = computed(() => dim.value === 'day');
const poolLabel = computed(() => (dim.value === 'year' ? '年池' : dim.value === 'month' ? '月池' : '次日限额'));
const surplusLabelText = computed(() =>
  isDayDim.value
    ? '昨日结余待确认（24h内选择）'
    : `昨日结余已归入${poolLabel.value}，可转出至存款池/心愿`
);

// 可选目标：心愿 / 存款池；日维度额外提供"滚存次日"
const targets = computed(() => {
  const list = [
    { key: 'wish', emoji: '⭐', name: '存入心愿' },
    { key: 'savings_pool', emoji: '💧', name: '存入存款池' },
    { key: 'account', emoji: '🏦', name: '存入账户' },
  ];
  if (isDayDim.value) list.push({ key: 'roll_over', emoji: '🔄', name: '滚存次日' });
  return list;
});
const selectedTarget = ref(isDayDim.value ? 'roll_over' : 'savings_pool');
const selectedWishId = ref('');
const selectedAccountId = ref('');
const accounts = computed(() => (Array.isArray(state.assets) ? state.assets : []));

// 心愿/账户选择弹窗（transfer=转出区，retrieve=取回区，选中态互相独立）
const activePicker = ref('');
const pickerMode = ref('transfer');
const openPicker = (type, mode = 'transfer') => { activePicker.value = type; pickerMode.value = mode; };
const closePicker = () => { activePicker.value = ''; };
const retrieveWishId = ref('');
const retrieveAccountId = ref('');
const pickerWishId = computed(() => (pickerMode.value === 'retrieve' ? retrieveWishId.value : selectedWishId.value));
const pickerAccountId = computed(() => (pickerMode.value === 'retrieve' ? retrieveAccountId.value : selectedAccountId.value));
const currentWish = computed(() => wishes.value.find((w) => w._id === selectedWishId.value) || null);
const currentWishName = computed(() => (currentWish.value ? currentWish.value.name : '请选择心愿'));
const currentWishSub = computed(() => (currentWish.value ? '已存 ¥' + formatFen(currentWish.value.saved_amount || 0) : '点击选择要存入的心愿'));
const pickWish = (w) => { if (pickerMode.value === 'retrieve') retrieveWishId.value = w._id; else selectedWishId.value = w._id; closePicker(); };
const currentAccount = computed(() => accounts.value.find((a) => a._id === selectedAccountId.value) || null);
const currentAccountName = computed(() => (currentAccount.value ? currentAccount.value.name : '请选择账户'));
const currentAccountSub = computed(() => (currentAccount.value ? '余额 ¥' + formatFen(currentAccount.value.current_balance || 0) : '点击选择要存入的账户'));
const pickAccount = (a) => { if (pickerMode.value === 'retrieve') retrieveAccountId.value = a._id; else selectedAccountId.value = a._id; closePicker(); };
// 取回区当前选中
const currentRetrieveWish = computed(() => wishes.value.find((w) => w._id === retrieveWishId.value) || null);
const currentRetrieveWishName = computed(() => (currentRetrieveWish.value ? currentRetrieveWish.value.name : '请选择心愿'));
const currentRetrieveAccount = computed(() => accounts.value.find((a) => a._id === retrieveAccountId.value) || null);
const currentRetrieveAccountName = computed(() => (currentRetrieveAccount.value ? currentRetrieveAccount.value.name : '请选择账户'));
// 维度后到纠正：若非日维度却停留在"滚存次日"，改回存款池
watch(isDayDim, (day) => {
  if (!day && selectedTarget.value === 'roll_over') selectedTarget.value = 'savings_pool';
});

// 期间（月/年转出用）
const periodType = computed(() => (dim.value === 'year' ? 'year' : dim.value === 'month' ? 'month' : null));
const periodKey = computed(() => {
  const dk = todayDateKey();
  return dim.value === 'year' ? dk.slice(0, 4) : dim.value === 'month' ? dk.slice(0, 7) : null;
});
// 期间池剩余（=转出上限）：月/年取池剩余(优先结算字段)，日取滚存P
const poolRemainingFen = computed(() => {
  const s = state.dashboard && state.dashboard.settlement;
  if (dim.value === 'month') {
    return (s && s.month_pool_remaining_fen != null) ? s.month_pool_remaining_fen : Math.max(0, (monthPoolFen.value || 0) - (monthConsumedFen.value || 0));
  }
  if (dim.value === 'year') {
    return (s && s.year_pool_remaining_fen != null) ? s.year_pool_remaining_fen : Math.max(0, (yearPoolFen.value || 0) - (yearConsumedFen.value || 0));
  }
  return pendingRolloverFen.value || 0;
});

// 可用金额：以本次会话剩余为准（初始=期间池剩余），逐笔扣减
const remainingFen = ref(0);
const maxFen = computed(() => Math.max(0, remainingFen.value));
const maxYuan = computed(() => Math.floor(maxFen.value / 100));
const maxYuanText = computed(() => formatFen(maxFen.value));
const savingsPoolText = computed(() => formatFen((state.savingsPool && state.savingsPool.balance) || 0));

const amountYuan = ref(0);
const amountInput = ref('');
const amountFen = computed(() => Math.round((Number(amountInput.value) || 0) * 100));
const remainText = computed(() => formatFen(Math.max(0, remainingFen.value - amountFen.value)));

const clampAmount = (yuan) => {
  let v = Math.floor(Number(yuan) || 0);
  if (v < 0) v = 0;
  if (v > maxYuan.value) v = maxYuan.value;
  return v;
};
const setAmountYuan = (yuan) => {
  const v = clampAmount(yuan);
  amountYuan.value = v;
  amountInput.value = v ? String(v) : '';
};
const onSliderChange = (e) => setAmountYuan(e.detail.value);
const onAmountInput = (e) => setAmountYuan(e.detail.value);
const setAmountMax = () => setAmountYuan(maxYuan.value);
const setAmountHalf = () => setAmountYuan(Math.floor(maxYuan.value / 2));

// 切换目标时重置金额
watch(selectedTarget, () => setAmountYuan(0));

// —— 取回预算（月/年）：把转出去的钱从来源取回期间池，恢复池剩余/日节奏 ——
const showRetrieve = ref(false);
const retrieveSource = ref('savings_pool');
const retrieveSources = [
  { key: 'savings_pool', emoji: '💧', name: '存款池' },
  { key: 'wish', emoji: '⭐', name: '心愿' },
  { key: 'account', emoji: '🏦', name: '账户' },
];
const periodMovedOutFen = computed(() => {
  const s = state.dashboard && state.dashboard.settlement;
  if (!s) return 0;
  return dim.value === 'year' ? (s.year_moved_out_fen || 0) : (s.month_moved_out_fen || 0);
});
const movedOutText = computed(() => formatFen(periodMovedOutFen.value));
const retrieveSourceBalanceFen = computed(() => {
  if (retrieveSource.value === 'savings_pool') return (state.savingsPool && state.savingsPool.balance) || 0;
  if (retrieveSource.value === 'wish') { const w = wishes.value.find((x) => x._id === retrieveWishId.value); return w ? (w.saved_amount || 0) : 0; }
  if (retrieveSource.value === 'account') { const a = accounts.value.find((x) => x._id === retrieveAccountId.value); return a ? (a.current_balance || 0) : 0; }
  return 0;
});
// 可取回上限 = min(来源余额, 本期已转出)
const retrieveMaxFen = computed(() => Math.max(0, Math.min(retrieveSourceBalanceFen.value, periodMovedOutFen.value)));
const retrieveMaxYuan = computed(() => Math.floor(retrieveMaxFen.value / 100));
const retrieveMaxText = computed(() => formatFen(retrieveMaxFen.value));
const retrieveAmountYuan = ref(0);
const retrieveAmountInput = ref('');
const retrieving = ref(false);
const setRetrieveAmount = (yuan) => {
  let v = Math.floor(Number(yuan) || 0);
  if (v < 0) v = 0;
  if (v > retrieveMaxYuan.value) v = retrieveMaxYuan.value;
  retrieveAmountYuan.value = v;
  retrieveAmountInput.value = v ? String(v) : '';
};
const onRetrieveSlider = (e) => setRetrieveAmount(e.detail.value);
const onRetrieveInput = (e) => setRetrieveAmount(e.detail.value);
const setRetrieveMax = () => setRetrieveAmount(retrieveMaxYuan.value);

const doRetrieve = async () => {
  if (retrieving.value) return;
  const amtFen = Math.round((Number(retrieveAmountInput.value) || 0) * 100);
  if (amtFen <= 0) { uni.showToast({ title: '请输入取回金额', icon: 'none' }); return; }
  if (amtFen > retrieveMaxFen.value) { uni.showToast({ title: '超过可取回额度', icon: 'none' }); return; }
  const sourceId = retrieveSource.value === 'wish' ? retrieveWishId.value : retrieveSource.value === 'account' ? retrieveAccountId.value : null;
  if (retrieveSource.value === 'wish' && !sourceId) { uni.showToast({ title: '请选择心愿', icon: 'none' }); return; }
  if (retrieveSource.value === 'account' && !sourceId) { uni.showToast({ title: '请选择账户', icon: 'none' }); return; }
  try {
    retrieving.value = true;
    await transferBudgetInAction(periodType.value, periodKey.value, retrieveSource.value, sourceId, amtFen / 100, '预算取回');
    await refreshTodayDashboard(true);
    uni.showToast({ title: '取回成功', icon: 'success' });
    setRetrieveAmount(0);
  } catch (e) {
    uni.showToast({ title: (e && e.message) || '取回失败', icon: 'none' });
  } finally {
    retrieving.value = false;
  }
};

const allocating = ref(false);

const confirmAlloc = async () => {
  if (!pending.value || allocating.value) return;
  try {
    allocating.value = true;
    if (selectedTarget.value === 'roll_over') {
      // 滚存次日：整笔确认
      await confirmSurplusRolloverAction('confirm');
    } else {
      const amtFen = amountFen.value;
      if (amtFen <= 0) throw new Error('请输入存入金额');
      if (amtFen > maxFen.value) throw new Error('存入金额不能超过可用结余');
      const yuan = amtFen / 100;
      const note = `盈余分配 ${pending.value ? pending.value.date_key : ''}`;
      if (!isDayDim.value) {
        // 月/年：转出期间池预算（离开预算，重算日节奏/结转）
        const tid = selectedTarget.value === 'wish' ? selectedWishId.value : selectedTarget.value === 'account' ? selectedAccountId.value : null;
        if (selectedTarget.value === 'wish' && !tid) throw new Error('请选择要存入的心愿');
        if (selectedTarget.value === 'account' && !tid) throw new Error('请选择要存入的账户');
        await transferBudgetOutAction(periodType.value, periodKey.value, selectedTarget.value, tid, yuan, note);
        await refreshTodayDashboard(true);
      } else if (selectedTarget.value === 'wish') {
        if (!selectedWishId.value) throw new Error('请选择要存入的心愿');
        await depositWishFromSurplusAction(selectedWishId.value, yuan, note);
      } else if (selectedTarget.value === 'account') {
        if (!selectedAccountId.value) throw new Error('请选择要存入的账户');
        await depositAccountFromSurplusAction(selectedAccountId.value, yuan, note);
      } else {
        await depositSavingsFromSurplusAction(yuan, note);
      }
      // 会话内扣减可用额度，可继续分配
      remainingFen.value = Math.max(0, remainingFen.value - amtFen);
    }
    await Promise.all([loadPendingAllocationAction(), loadWishes(), loadSurplusPool()]);
    if (selectedTarget.value === 'roll_over' || remainingFen.value <= 0) {
      uni.showToast({ title: '分配成功', icon: 'success' });
      setTimeout(() => uni.navigateBack(), 500);
    } else {
      setAmountYuan(0);
      uni.showToast({ title: '已存入，可继续分配剩余', icon: 'success' });
    }
  } catch (err) {
    uni.showToast({ title: err.message || '分配失败', icon: 'none' });
  } finally {
    allocating.value = false;
  }
};

const goHistory = () => uni.navigateTo({ url: '/pages/surplus-history/surplus-history' });
const goBack = () => uni.navigateBack();

onMounted(async () => {
  if (!checkLoggedIn()) {
    uni.showToast({ title: "请先登录", icon: "none" });
    uni.navigateTo({
      url:
        "/pages/login/login?redirect=" +
        encodeURIComponent("/pages/surplus-alloc/surplus-alloc"),
    });
    return;
  }
  try {
    await Promise.all([loadPendingAllocationAction(), loadWishes(), loadSurplusPool(), loadAssetAccounts(), refreshTodayDashboard(true)]);
    remainingFen.value = poolRemainingFen.value;
    setAmountYuan(0);
    if (wishes.value.length) selectedWishId.value = wishes.value[0]._id;
    if (accounts.value.length) selectedAccountId.value = accounts.value[0]._id;
    if (wishes.value.length) retrieveWishId.value = wishes.value[0]._id;
    if (accounts.value.length) retrieveAccountId.value = accounts.value[0]._id;
  } catch (err) {
    console.error('[surplus-alloc] 加载失败', err);
  }
});
</script>

<style scoped>
.alloc-page { width: 375px; height: 100vh; margin: 0 auto; background: #f2fcf2; display: flex; flex-direction: column; overflow: hidden; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 44px 16px 10px; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b8c7a; font-size: 16px; }
.topbar-title { font-size: 17px; font-weight: 700; color: #0f1c14; }

.surplus-label { font-size: 12px; color: #9bb8a8; display: block; }
.surplus-amount { font-size: 48px; font-weight: 900; color: #0f1c14; display: block; margin-top: 8px; letter-spacing: -2; }
.surplus-amount.muted { color: #c2d6c8; }
.surplus-date { font-size: 11px; color: #9bb8a8; display: block; margin-top: 4px; }

.section-title { font-size: 14px; font-weight: 700; color: #0f1c14; display: block; margin-bottom: 16px; }
.alloc-row { margin-bottom: 18px; }
.alloc-row:last-child { margin-bottom: 0; }
.alloc-info { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.alloc-emoji { font-size: 20px; }
.alloc-name { font-size: 13px; font-weight: 600; color: #3a5244; display: block; }
.alloc-amount { font-size: 11px; color: #25cc5d; font-weight: 600; }
.alloc-slider { margin: 4px 0; }
.alloc-percent { font-size: 12px; color: #25cc5d; font-weight: 700; text-align: right; display: block; }

.wish-pick { margin-top: 8px; border-top: 1px solid rgba(15,28,20,0.06); padding-top: 14px; }
.wish-pick-title { font-size: 12px; font-weight: 700; color: #3a5244; display: block; margin-bottom: 10px; }
.wish-pick-list { display: flex; flex-wrap: wrap; gap: 8px; }
.wish-pick-item { padding: 8px 12px; border-radius: 12px; background: rgba(242,252,242,0.8); border: 1px solid rgba(194,242,200,0.4); display: flex; flex-direction: column; cursor: pointer; }
.wish-pick-item.active { background: linear-gradient(135deg,#4fd974,#25cc5d); border-color: transparent; }
.wish-pick-item.active text { color: #fff; }
.wish-pick-item text:first-child { font-size: 12px; font-weight: 600; color: #3a5244; }
.wish-pick-sub { font-size: 9px; color: #9bb8a8; }
.wish-pick-item.active .wish-pick-sub { color: rgba(255,255,255,0.85); }

/* 目标选择 */
.target-row { display: flex; gap: 10px; margin-bottom: 16px; }
.target-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 8px; border-radius: 14px; background: rgba(242,252,242,0.8); border: 1.5px solid rgba(194,242,200,0.4); cursor: pointer; transition: all 0.18s; }
.target-item.active { background: linear-gradient(135deg,#4fd974,#25cc5d); border-color: transparent; }
.target-item.active .target-name { color: #fff; }
.target-emoji { font-size: 22px; }
.target-name { font-size: 12px; font-weight: 700; color: #3a5244; }

/* 目标详情 */
.target-detail { margin-bottom: 16px; }
.detail-title { font-size: 12px; font-weight: 700; color: #3a5244; display: block; margin-bottom: 10px; }
.detail-sub { font-size: 12px; color: #6b8c7a; display: block; line-height: 1.5; }
.detail-empty { font-size: 12px; color: #9bb8a8; display: block; }

/* 金额 */
.amount-block { border-top: 1px solid rgba(15,28,20,0.06); padding-top: 14px; }
.amount-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.amount-head .detail-title { margin-bottom: 0; }
.amount-quick { display: flex; gap: 8px; }
.quick-btn { font-size: 11px; font-weight: 700; color: #25cc5d; padding: 4px 12px; border-radius: 999px; background: rgba(37,204,93,0.1); cursor: pointer; }
.amount-input-row { display: flex; align-items: baseline; gap: 6px; }
.amount-cny { font-size: 22px; font-weight: 800; color: #0f1c14; }
.amount-input { flex: 1; font-size: 30px; font-weight: 900; color: #0f1c14; border: none; background: transparent; }
.amount-max { font-size: 12px; color: #9bb8a8; }
.amount-slider { margin: 10px 0 6px; }
.amount-remain { font-size: 11px; color: #9bb8a8; display: block; }

/* 选择字段（点击弹窗） */
.picker-field { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 14px; background: rgba(242,252,242,0.8); border: 1.5px solid rgba(194,242,200,0.4); cursor: pointer; }
.picker-emoji { font-size: 22px; }
.picker-text { flex: 1; display: flex; flex-direction: column; }
.picker-name { font-size: 14px; font-weight: 700; color: #0f1c14; }
.picker-sub { font-size: 11px; color: #9bb8a8; margin-top: 2px; }
.picker-arrow { font-size: 20px; color: #c2f2c8; }

/* 底部选择弹窗 */
.picker-mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; background: rgba(15,28,20,0.4); z-index: 999; display: flex; align-items: flex-end; justify-content: center; }
.picker-sheet { width: 375px; max-height: 72vh; background: #fff; border-radius: 24px 24px 0 0; display: flex; flex-direction: column; overflow: hidden; }
.picker-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; border-bottom: 1px solid rgba(15,28,20,0.06); }
.picker-sheet-title { font-size: 15px; font-weight: 800; color: #0f1c14; }
.picker-sheet-close { font-size: 16px; color: #9bb8a8; padding: 4px 8px; cursor: pointer; }
.picker-sheet-list { max-height: 56vh; padding: 8px 12px 16px; }
.picker-opt { display: flex; align-items: center; gap: 10px; padding: 14px 12px; border-radius: 12px; cursor: pointer; }
.picker-opt.active { background: rgba(37,204,93,0.1); }
.picker-opt-name { flex: 1; font-size: 14px; font-weight: 600; color: #3a5244; }
.picker-opt.active .picker-opt-name { color: #25cc5d; font-weight: 800; }
.picker-opt-sub { font-size: 11px; color: #9bb8a8; }
.picker-opt-check { font-size: 15px; color: #25cc5d; font-weight: 800; }
.picker-empty { text-align: center; padding: 30px 0; font-size: 13px; color: #9bb8a8; }

.history-label { font-size: 13px; color: #6b8c7a; font-weight: 600; }
.history-arrow { font-size: 18px; color: #c2f2c8; }
.confirm-btn { width: 100%; padding: 14px; border-radius: 16px; background: linear-gradient(135deg,#4fd974,#25cc5d); text-align: center; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 20px rgba(37,204,93,0.3); }
.retrieve-entry { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 16px; background: rgba(255,255,255,0.72); border: 1.5px solid rgba(194,242,200,0.4); cursor: pointer; }
.retrieve-entry-label { flex: 1; font-size: 14px; font-weight: 700; color: #3a5244; }
.retrieve-entry-sub { font-size: 12px; color: #9bb8a8; }
.retrieve-panel { margin-top: 12px; }
.retrieve-confirm { margin-top: 16px; background: linear-gradient(135deg,#7cc4fa,#3b9de8); box-shadow: 0 4px 20px rgba(59,157,232,0.3); }

.empty-text { font-size: 14px; font-weight: 700; color: #3a5244; display: block; margin-bottom: 6px; }
.empty-sub { font-size: 11px; color: #9bb8a8; display: block; }
</style>
