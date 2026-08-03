<template>
  <view class="bill-list card-in-1" style="margin:10px 16px 0;" data-cmp="BillList">
    <view class="glass-mid" style="padding:14px 16px;">
      <view class="bill-header">
        <text class="bill-header-icon">📋</text>
        <text class="bill-header-title">最近账单</text>
        <text class="bill-add-btn" @click="addRecord">+ 记一笔</text>
      </view>

      <view v-for="(bill, i) in bills" :key="bill.id" class="bill-row" :class="{ last: i === bills.length - 1 }" @click="editBill(bill)">
        <view class="bill-icon-box" :style="{ background: bill.bg }">
          <text class="bill-icon">{{ bill.icon }}</text>
        </view>
        <view class="bill-info">
          <text class="bill-name">{{ bill.name }}</text>
          <text class="bill-meta">{{ bill.cat }} · {{ bill.time }}</text>
        </view>
        <image v-if="bill.stickerImage" :src="bill.stickerImage" mode="aspectFill" class="bill-sticker" />
        <text class="bill-amount" :class="bill.income ? 'income' : 'expense'">{{ bill.amountText }}</text>
        <view class="bill-del" @click.stop="confirmDelete(bill)" hover-class="bill-del-hover">
          <text class="bill-del-icon">🗑️</text>
        </view>
      </view>
      <view v-if="bills.length === 0" class="bill-empty">
        <text class="bill-empty-icon">🗒️</text>
        <text class="bill-empty-text">今天还没有账单，去记一笔吧</text>
      </view>
    </view>
      
</view>
</template>

<script setup>
import { computed } from 'vue';
import { useUserStore } from '@/stores/user.js';
import { formatFen } from '@/utils/money.js';
import { deleteTransaction } from '@/api/sparejar.js';

const { state, categoryMap, refreshTodayDashboard } = useUserStore();

function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(String(ts).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

const bills = computed(() => {
  const map = categoryMap.value;
  const stickers = state.stickers || [];
  return (state.dashboard.transactions || []).map((tx) => {
    const cat = tx.category_id ? map[String(tx.category_id)] : null;
    const isIncome = tx.type === 'income' || tx.type === 'refund';
    const name = (typeof tx.note === 'string' && tx.note.trim()) ? tx.note : (cat ? cat.name : '记账');
    const amountFen = typeof tx.amount === 'number' ? tx.amount : 0;
    const st = tx.sticker_id ? stickers.find((s) => s._id === tx.sticker_id) : null;
    const stickerImage = (st && st.image_url) || tx.sticker_image_url || '';
    return {
      id: String(tx._id),
      icon: cat ? cat.icon : (isIncome ? '💰' : '📦'),
      bg: isIncome ? '#E6F7EC' : '#FFEAEA',
      name,
      cat: cat ? cat.name : (isIncome ? '收入' : '支出'),
      time: formatTime(tx.transaction_at),
      income: isIncome,
      stickerImage,
      amountText: (isIncome ? '+' : '-') + formatFen(Math.abs(amountFen))
    };
  });
});

const addRecord = () => uni.navigateTo({ url: '/pages/add-record/add-record' });

const editBill = (bill) => {
  uni.navigateTo({ url: `/pages/add-record/add-record?id=${bill.id}` });
};

const confirmDelete = (bill) => {
  uni.showModal({
    title: '删除账单',
    content: `确定删除「${bill.name} ${bill.amountText}」吗？`,
    confirmText: '删除',
    confirmColor: '#ff6b6b',
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await deleteTransaction(bill.id);
        uni.showToast({ title: '已删除', icon: 'success' });
        // 串联回滚：重算当日结算（限额/虚拟资金/挑战）并刷新看板
        await refreshTodayDashboard({ force: true });
      } catch (err) {
        const msg = err && err.message ? err.message : '删除失败';
        uni.showToast({ title: msg, icon: 'none' });
      }
    }
  });
};
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
.bill-sticker {
  width: 48rpx;
  height: 48rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.04);
}
.bill-name { font-size: 13px; font-weight: 600; color: #0f1c14; display: block; }
.bill-meta { font-size: 10px; color: #9bb8a8; margin-top: 2px; display: block; }
.bill-amount { font-size: 14px; font-weight: 700; color: #ff6b6b; }
.bill-amount.income { color: #25cc5d; }
.bill-amount.expense { color: #ff6b6b; }

.bill-del {
  width: 32px;
  height: 32px;
  margin-left: 6px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}
.bill-del-hover { background: rgba(255, 107, 107, 0.12); }
.bill-del-icon { font-size: 15px; opacity: 0.55; }

.bill-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 0 18px;
}
.bill-empty-icon { font-size: 32px; opacity: 0.7; }
.bill-empty-text { font-size: 12px; color: #9bb8a8; }
</style>
