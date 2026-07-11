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
          <view class="pool-chip glass-thin" style="padding:6px 14px;">
            <text>🐷 存款池 ¥{{ poolBalance.toLocaleString() }}</text>
          </view>
        </view>
      </view>

      <!-- 存款池能量环 -->
      <view class="pool-ring glass-mid" style="margin:12px 16px;padding:18px;display:flex;align-items:center;gap:16px;">
        <view class="pool-ring-visual">
          <text class="pool-ring-emoji">🐷</text>
        </view>
        <view style="flex:1;">
          <text class="pool-ring-label">心愿存款池</text>
          <text class="pool-ring-amount">¥{{ poolBalance.toLocaleString() }}</text>
          <text class="pool-ring-sub">本月转入 +¥640</text>
        </view>
        <view class="pool-action-btn glass-thin" style="padding:8px 14px;" @click="showNewWish = true">
          <text>+ 新心愿</text>
        </view>
      </view>

      <!-- 心愿瀑布流 -->
      <view class="wish-grid" style="padding:0 16px;">
        <view
          v-for="w in wishes"
          :key="w.id"
          class="wish-card glass-mid card-in-1"
          @click="openWishDetail(w)"
        >
          <view class="wish-cover" :style="{ background: w.coverGradient }">
            <text class="wish-cover-emoji">{{ w.emoji }}</text>
          </view>
          <view class="wish-body">
            <text class="wish-name">{{ w.name }}</text>
            <view class="wish-bar">
              <view class="wish-bar-fill" :style="{ width: Math.min(w.savedAmount / w.targetAmount * 100, 100) + '%' }" />
            </view>
            <view class="wish-meta">
              <text class="wish-amount">¥{{ w.savedAmount.toLocaleString() }} / ¥{{ w.targetAmount.toLocaleString() }}</text>
              <text class="wish-deadline">截止 {{ w.deadline }}</text>
            </view>
          </view>
        </view>
      </view>

      <view style="height:24px;" />
    </scroll-view>

    <!-- 心愿详情弹窗 -->
    <view v-if="detailWish" class="sheet-overlay" @click="detailWish = null">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <view class="detail-header" :style="{ background: detailWish.coverGradient }">
          <text class="detail-emoji">{{ detailWish.emoji }}</text>
          <text class="detail-name">{{ detailWish.name }}</text>
        </view>
        <view class="detail-body">
          <view class="detail-amount-row">
            <text class="detail-amount">¥{{ detailWish.savedAmount.toLocaleString() }}</text>
            <text class="detail-target">/ ¥{{ detailWish.targetAmount.toLocaleString() }}</text>
          </view>
          <view class="detail-bar">
            <view class="detail-bar-fill" :style="{ width: Math.min(detailWish.savedAmount / detailWish.targetAmount * 100, 100) + '%' }" />
          </view>

          <view class="detail-actions" style="margin-top:20px;display:flex;gap:10px;">
            <view class="deposit-btn" @click="depositToWish"><text>存钱 +</text></view>
            <view class="withdraw-btn" @click="withdrawFromWish"><text>取回</text></view>
          </view>

          <text class="detail-records-title">存取记录</text>
          <view v-for="r in detailWish.records" :key="r.id" class="record-row">
            <view class="record-left">
              <text class="record-type">{{ r.type === 'deposit' ? '💚 存入' : '💔 取出' }}</text>
              <text class="record-source">{{ r.source }}</text>
            </view>
            <view class="record-right">
              <text class="record-amount" :class="r.type">{{ r.type === 'deposit' ? '+' : '-' }}¥{{ r.amount }}</text>
              <text class="record-date">{{ r.date }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 新建心愿弹窗 -->
    <view v-if="showNewWish" class="sheet-overlay" @click="showNewWish = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">创建新心愿</text>
        <input class="sheet-input" v-model="newWishName" placeholder="心愿名称" />
        <input class="sheet-input" v-model="newWishAmount" type="number" placeholder="目标金额" />
        <input class="sheet-input" v-model="newWishDeadline" placeholder="截止日期（如 2024-12-31）" />
        <view class="save-btn" @click="createWish"><text>创建心愿</text></view>
      </view>
    </view>

    <!-- TabBar -->
    <TabBar :current="4" />
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import TabBar from '@/components/tabbar/tabbar.vue';

const poolBalance = 3240;

const wishes = reactive([
  {
    id: 'w1', name: '索尼降噪耳机', emoji: '🎧', targetAmount: 2299, savedAmount: 1840,
    deadline: '2024-07-31', coverGradient: 'linear-gradient(135deg,#e1fae3 0%,#c2f2c8 60%,#89e59c 100%)',
    archived: false, createdAt: '2024-05-01',
    records: [
      { id: 'r1', amount: 500, type: 'deposit', source: '每日结余', date: '2024-06-10', note: '' },
      { id: 'r2', amount: 800, type: 'deposit', source: '存款池', date: '2024-06-15', note: '' },
      { id: 'r3', amount: 540, type: 'deposit', source: '手动存入', date: '2024-06-20', note: '' },
    ],
  },
  {
    id: 'w2', name: '日本东京旅行', emoji: '✈️', targetAmount: 12000, savedAmount: 5600,
    deadline: '2024-12-31', coverGradient: 'linear-gradient(135deg,#e8f4ff 0%,#c8e6ff 60%,#a8d4ff 100%)',
    archived: false, createdAt: '2024-04-01',
    records: [
      { id: 'r4', amount: 2000, type: 'deposit', source: '每月固定', date: '2024-05-01', note: '' },
      { id: 'r5', amount: 3600, type: 'deposit', source: '存款池', date: '2024-06-01', note: '' },
    ],
  },
  {
    id: 'w3', name: 'Switch 游戏机', emoji: '🎮', targetAmount: 2100, savedAmount: 1800,
    deadline: '2024-08-15', coverGradient: 'linear-gradient(135deg,#f3e8ff 0%,#e0c8ff 60%,#d0a8ff 100%)',
    archived: false, createdAt: '2024-05-10',
    records: [
      { id: 'r6', amount: 1200, type: 'deposit', source: '每日结余', date: '2024-06-05', note: '' },
      { id: 'r7', amount: 600, type: 'deposit', source: '手动存入', date: '2024-06-18', note: '' },
    ],
  },
]);

const detailWish = ref(null);
const showNewWish = ref(false);
const newWishName = ref('');
const newWishAmount = ref('');
const newWishDeadline = ref('');

const openWishDetail = (w) => {
  detailWish.value = w;
};

const depositToWish = () => {
  uni.showToast({ title: '存入成功', icon: 'success' });
};
const withdrawFromWish = () => {
  uni.showToast({ title: '已取回到存款池', icon: 'none' });
};

const createWish = () => {
  if (newWishName.value) {
    uni.showToast({ title: '心愿已创建', icon: 'success' });
    showNewWish.value = false;
    newWishName.value = '';
    newWishAmount.value = '';
    newWishDeadline.value = '';
  }
};
</script>

<style scoped>
.wish-page { width: 375px; height: 812px; overflow: hidden; position: relative; margin: 0 auto; background: #f2fcf2; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 52px 18px 0; }
.topbar-sub { font-size: 11px; color: #9bb8a8; display: block; margin-bottom: 2px; }
.topbar-title { font-size: 20px; font-weight: 900; color: #0f1c14; }
.pool-chip { font-size: 11px; color: #3a5244; font-weight: 600; }

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
.deposit-btn { flex: 1; padding: 12px; border-radius: 14px; background: linear-gradient(135deg,#4fd974,#25cc5d); text-align: center; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }
.withdraw-btn { flex: 1; padding: 12px; border-radius: 14px; background: rgba(255,255,255,0.7); border: 1px solid #c2f2c8; text-align: center; color: #6b8c7a; font-size: 14px; font-weight: 700; cursor: pointer; }
.detail-records-title { font-size: 12px; font-weight: 700; color: #0f1c14; display: block; margin: 20px 0 10px; }
.record-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(15,28,20,0.04); }
.record-type { font-size: 12px; color: #3a5244; display: block; }
.record-source { font-size: 10px; color: #9bb8a8; }
.record-right { text-align: right; }
.record-amount { font-size: 14px; font-weight: 700; display: block; }
.record-amount.deposit { color: #25cc5d; }
.record-amount.withdraw { color: #ff6b6b; }
.record-date { font-size: 10px; color: #9bb8a8; }
</style>
