<template>
  <view class="alloc-page" data-cmp="SurplusAlloc">
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">盈余分配</text>
      <view style="width:36px;" />
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="flex:1;">
      <!-- 待分配结余 -->
      <view class="glass-hero card-in-1" style="margin:16px;padding:18px;text-align:center;">
        <text class="surplus-label">昨日结余待分配</text>
        <text class="surplus-amount" v-if="pending">¥{{ surplusText }}</text>
        <text class="surplus-amount muted" v-else>¥0</text>
        <text v-if="pending" class="surplus-date">结算日 {{ pending.date_key }}</text>
      </view>

      <view v-if="pending" class="glass-mid" style="margin:0 16px 16px;padding:18px;">
        <text class="section-title">📐 分配比例</text>
        <view class="alloc-row" v-for="(item, i) in allocItems" :key="item.key">
          <view class="alloc-info">
            <text class="alloc-emoji">{{ item.emoji }}</text>
            <view>
              <text class="alloc-name">{{ item.name }}</text>
              <text class="alloc-amount">¥{{ Math.round(pending.surplus * item.percent / 100) }}</text>
            </view>
          </view>
          <slider
            class="alloc-slider"
            :value="item.percent"
            min="0"
            max="100"
            step="5"
            activeColor="#25cc5d"
            backgroundColor="rgba(194,242,200,0.3)"
            blockColor="#25cc5d"
            @change="(e) => { item.percent = e.detail.value; normalizeAlloc(i); }"
          />
          <text class="alloc-percent">{{ item.percent }}%</text>
        </view>

        <!-- 心愿选择 -->
        <view v-if="wishPercent > 0" class="wish-pick">
          <text class="wish-pick-title">选择存入的心愿</text>
          <view class="wish-pick-list">
            <view
              v-for="w in wishes"
              :key="w._id"
              class="wish-pick-item"
              :class="{ active: selectedWishId === w._id }"
              @click="selectedWishId = w._id"
            >
              <text>{{ w.name }}</text>
              <text class="wish-pick-sub">已存 ¥{{ formatFen(w.saved_amount || 0) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="glass-thin" style="margin:0 16px 16px;padding:24px;text-align:center;">
        <text class="empty-text">今日暂无结余待分配</text>
        <text class="empty-sub">省下的钱已自动滚存至累计结余池</text>
      </view>

      <!-- 分配历史入口 -->
      <view class="glass-thin" style="margin:0 16px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;" @click="goHistory">
        <text class="history-label">📋 查看分配历史</text>
        <text class="history-arrow">›</text>
      </view>

      <!-- 确认按钮 -->
      <view v-if="pending" style="padding:20px 16px 30px;">
        <view class="confirm-btn" @click="confirmAlloc">
          <text>✅ 确认分配</text>
        </view>
      </view>
    </scroll-view>
      
    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
</view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user.js';
import { allocateSurplus } from '@/api/sparejar.js';
import { formatFen } from '@/utils/money.js';

const { state, loadWishes, loadSurplusPool, loadPendingAllocationAction } = useUserStore();

const pending = ref(null);
const wishes = computed(() => (Array.isArray(state.wishes) ? state.wishes : []));
const surplusText = computed(() => (pending.value ? formatFen(pending.value.surplus) : '0'));

const allocItems = reactive([
  { key: 'roll_over', emoji: '🔄', name: '滚存次日额度', percent: 100 },
  { key: 'wish', emoji: '⭐', name: '存入心愿', percent: 0 },
  { key: 'savings_pool', emoji: '💧', name: '存入存款池', percent: 0 }
]);
const wishPercent = computed(() => allocItems.find((i) => i.key === 'wish').percent);
const selectedWishId = ref('');

const normalizeAlloc = (changedIdx) => {
  const others = allocItems.filter((_, i) => i !== changedIdx);
  const remaining = 100 - allocItems[changedIdx].percent;
  if (others.length > 0) {
    const totalOther = others.reduce((s, o) => s + o.percent, 0);
    if (totalOther > 0) {
      others.forEach((o) => {
        o.percent = Math.round(o.percent / totalOther * remaining);
      });
    } else {
      const each = Math.round(remaining / others.length);
      others.forEach((o, i) => {
        o.percent = i === others.length - 1 ? remaining - each * (others.length - 1) : each;
      });
    }
  }
};

const buildItems = () => {
  const total = pending.value.surplus;
  const raw = allocItems.map((it) => ({ key: it.key, pct: it.percent }));
  // 先按百分比取整，再校正使总和精确等于 total（分）
  const amounts = raw.map((r) => Math.round(total * r.pct / 100));
  let diff = total - amounts.reduce((s, a) => s + a, 0);
  // 把差值补到占比最大的非滚存项（或滚存项）上
  let idx = amounts.findIndex((a, i) => raw[i].key === 'roll_over');
  if (idx < 0) idx = 0;
  amounts[idx] += diff;
  const items = [];
  allocItems.forEach((it, i) => {
    const amt = amounts[i];
    if (amt <= 0) return;
    if (it.key === 'wish') {
      if (!selectedWishId.value) throw new Error('请选择要存入的心愿');
      items.push({ target_type: 'wish', wish_id: selectedWishId.value, amount: amt });
    } else {
      items.push({ target_type: it.key, amount: amt });
    }
  });
  return items;
};

const confirmAlloc = async () => {
  if (!pending.value) return;
  try {
    const items = buildItems();
    await allocateSurplus(pending.value.date_key, items, false);
    await Promise.all([loadSurplusPool(), loadWishes()]);
    uni.showToast({ title: '分配成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 500);
  } catch (err) {
    uni.showToast({ title: err.message || '分配失败', icon: 'none' });
  }
};

const goHistory = () => uni.navigateTo({ url: '/pages/surplus-history/surplus-history' });
const goBack = () => uni.navigateBack();

onMounted(async () => {
  try {
    const [p] = await Promise.all([loadPendingAllocationAction(), loadWishes()]);
    pending.value = p;
    if (p && wishes.value.length) selectedWishId.value = wishes.value[0]._id;
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

.history-label { font-size: 13px; color: #6b8c7a; font-weight: 600; }
.history-arrow { font-size: 18px; color: #c2f2c8; }
.confirm-btn { width: 100%; padding: 14px; border-radius: 16px; background: linear-gradient(135deg,#4fd974,#25cc5d); text-align: center; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 20px rgba(37,204,93,0.3); }

.empty-text { font-size: 14px; font-weight: 700; color: #3a5244; display: block; margin-bottom: 6px; }
.empty-sub { font-size: 11px; color: #9bb8a8; display: block; }
</style>
