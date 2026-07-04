<template>
  <view class="detail-page" data-cmp="LedgerDetail">
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">账本详情</text>
      <view class="edit-btn" @click="openEdit"><text>✏️</text></view>
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="flex:1;">
      <!-- 账本信息 -->
      <view class="glass-hero card-in-1" style="margin:16px;padding:20px;text-align:center;">
        <text class="detail-icon">{{ ledger.emoji }}</text>
        <text class="detail-name">{{ ledger.name }}</text>
        <text class="detail-type">{{ ledger.type === 'master' ? '主账本' : '子账本' }}</text>
        <text class="detail-balance">¥{{ ledger.balance.toLocaleString() }}</text>
        <view class="detail-meta">
          <text>{{ ledger.members }}人 · {{ ledger.records }}笔记录</text>
        </view>
      </view>

      <!-- 预算进度 -->
      <view class="glass-mid" style="margin:0 16px 16px;padding:18px;">
        <text class="section-title">📊 本月预算</text>
        <view class="budget-row">
          <text class="budget-spent">已花 ¥{{ ledger.spent }}</text>
          <text class="budget-total">预算 ¥{{ ledger.budget }}</text>
        </view>
        <view class="budget-bar">
          <view class="budget-bar-fill" :style="{ width: Math.min(ledger.spent / ledger.budget * 100, 100) + '%' }" />
        </view>
         <text class="budget-remain">剩余 ¥{{ ledger.budget - ledger.spent }}</text>
      </view>

      <!-- 近期记录 -->
      <view class="glass-mid card-in-1" style="margin:0 16px 24px;padding:18px;">
        <text class="section-title">📝 近期记录</text>
        <view v-for="(r, i) in recentRecords" :key="i" class="record-item" :class="{ last: i === recentRecords.length - 1 }">
          <view class="record-left">
            <text class="record-icon">{{ r.icon }}</text>
            <view>
              <text class="record-name">{{ r.name }}</text>
              <text class="record-time">{{ r.date }}</text>
            </view>
          </view>
          <text class="record-amount" :class="{ expense: r.amount < 0 }">{{ r.amount >= 0 ? '+' : '' }}¥{{ Math.abs(r.amount) }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 编辑弹窗 -->
    <view v-if="showEdit" class="sheet-overlay" @click="showEdit = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">编辑账本</text>
        <input class="sheet-input" v-model="editName" placeholder="账本名称" />
        <view class="save-btn" @click="showEdit = false"><text>保存</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';

const ledger = reactive({
  emoji: '🏠', name: '家庭总账本', type: 'master', balance: 23840, budget: 12000, spent: 7230, members: 3, records: 128,
});

const recentRecords = [
  { icon: '🍜', name: '超市购物', date: '6月21日', amount: -156 },
  { icon: '🚇', name: '地铁月卡', date: '6月20日', amount: -200 },
  { icon: '💼', name: '工资', date: '6月15日', amount: 8200 },
  { icon: '☕', name: '咖啡', date: '6月14日', amount: -28 },
  { icon: '🛒', name: '便利店', date: '6月13日', amount: -43 },
];

const showEdit = ref(false);
const editName = ref(ledger.name);

const openEdit = () => {
  editName.value = ledger.name;
  showEdit.value = true;
};

const goBack = () => uni.navigateBack();
</script>

<style scoped>
.detail-page { width: 375px; height: 100vh; margin: 0 auto; background: #f2fcf2; display: flex; flex-direction: column; overflow: hidden; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 44px 16px 10px; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b8c7a; font-size: 16px; }
.topbar-title { font-size: 17px; font-weight: 700; color: #0f1c14; }
.edit-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; }

.detail-icon { font-size: 48px; display: block; }
.detail-name { font-size: 20px; font-weight: 800; color: #0f1c14; display: block; margin-top: 8px; }
.detail-type { font-size: 11px; color: #9bb8a8; display: block; margin-top: 4px; }
.detail-balance { font-size: 36px; font-weight: 900; color: #25cc5d; display: block; margin-top: 8px; }
.detail-meta { margin-top: 8px; font-size: 11px; color: #9bb8a8; }

.section-title { font-size: 14px; font-weight: 700; color: #0f1c14; display: block; margin-bottom: 14px; }
.budget-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
.budget-spent { font-size: 13px; font-weight: 600; color: #0f1c14; }
.budget-total { font-size: 13px; color: #9bb8a8; }
.budget-bar { height: 8px; border-radius: 5px; background: rgba(194,242,200,0.3); overflow: hidden; margin-bottom: 4px; }
.budget-bar-fill { height: 100%; border-radius: 5px; background: linear-gradient(90deg,#89e59c,#25cc5d); transition: width 0.6s ease; }
.budget-remain { font-size: 10px; color: #25cc5d; font-weight: 600; display: block; }

.record-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(15,28,20,0.04); }
.record-item.last { border-bottom: none; }
.record-left { display: flex; align-items: center; gap: 10px; }
.record-icon { font-size: 18px; }
.record-name { font-size: 13px; font-weight: 600; color: #0f1c14; display: block; }
.record-time { font-size: 10px; color: #9bb8a8; }
.record-amount { font-size: 14px; font-weight: 700; color: #25cc5d; }
.record-amount.expense { color: #ff6b6b; }

.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 300; display: flex; align-items: flex-end; justify-content: center; }
.sheet-panel { width: 375px; background: linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,252,242,0.96)); border-radius: 24px 24px 0 0; padding: 0 20px 30px; }
.sheet-handle { display: flex; justify-content: center; padding: 12px 0 8px; }
.handle-bar { width: 38px; height: 4px; border-radius: 3px; background: rgba(194,242,200,0.8); }
.sheet-title { font-size: 16px; font-weight: 800; color: #0f1c14; display: block; margin-bottom: 14px; }
.sheet-input { width: 100%; height: 44px; border-radius: 14px; background: rgba(242,252,242,0.8); border: 1px solid rgba(194,242,200,0.4); padding: 0 14px; font-size: 14px; margin-bottom: 14px; }
.save-btn { padding: 14px; border-radius: 16px; background: linear-gradient(135deg,#4fd974,#25cc5d); text-align: center; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; }
</style>
