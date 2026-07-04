<template>
  <view class="bill-list card-in-1" style="margin:10px 16px 0;" data-cmp="BillList">
    <view class="glass-mid" style="padding:14px 16px;">
      <view class="bill-header">
        <text class="bill-header-icon">📋</text>
        <text class="bill-header-title">最近账单</text>
        <text class="bill-add-btn" @click="addRecord">+ 记一笔</text>
      </view>

      <view v-for="(bill, i) in BILLS" :key="bill.id" class="bill-row" :class="{ last: i === BILLS.length - 1 }">
        <view class="bill-icon-box" :style="{ background: bill.bg }">
          <text class="bill-icon">{{ bill.icon }}</text>
        </view>
        <view class="bill-info">
          <text class="bill-name">{{ bill.name }}</text>
          <text class="bill-meta">{{ bill.cat }} · {{ bill.time }}</text>
        </view>
        <text class="bill-amount">-¥{{ Math.abs(bill.amount) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
const BILLS = [
  { id: 'b1', icon: '🍜', bg: '#FFF3E0', name: '午饭拉面', cat: '餐饮', time: '12:30', amount: -28 },
  { id: 'b2', icon: '🚇', bg: '#E3F2FD', name: '地铁通勤', cat: '交通', time: '08:15', amount: -6 },
  { id: 'b3', icon: '☕', bg: '#FBE9E7', name: '拿铁咖啡', cat: '饮品', time: '09:40', amount: -32 },
  { id: 'b4', icon: '🛒', bg: '#F3E5F5', name: '便利店', cat: '日用', time: '19:00', amount: -15 },
];

const addRecord = () => uni.navigateTo({ url: '/pages/add-record/add-record' });
</script>

<style scoped>
.bill-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}
.bill-header-icon { font-size: 12px; color: #25cc5d; }
.bill-header-title { font-size: 13px; font-weight: 700; color: #0f1c14; }
.bill-add-btn {
  margin-left: auto;
  font-size: 11px;
  color: #25cc5d;
  font-weight: 600;
  cursor: pointer;
  background: rgba(37, 204, 93, 0.08);
  border-radius: 8px;
  padding: 3px 10px;
}

.bill-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(15, 28, 20, 0.05);
}
.bill-row.last { border-bottom: none; }
.bill-icon-box {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.bill-icon { font-size: 16px; }
.bill-info { flex: 1; }
.bill-name { font-size: 13px; font-weight: 600; color: #0f1c14; display: block; }
.bill-meta { font-size: 10px; color: #9bb8a8; margin-top: 2px; display: block; }
.bill-amount { font-size: 14px; font-weight: 700; color: #ff6b6b; }
</style>
