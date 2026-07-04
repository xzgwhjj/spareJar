<template>
  <view class="add-record-page" data-cmp="AddRecordPage">
    <!-- 顶部栏 -->
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">记一笔</text>
      <view class="topbar-spacer" />
    </view>

    <!-- 类型切换 -->
    <view class="type-switch">
      <view class="type-btn" :class="{ active: draft.type === 'expense' }" @click="draft.type = 'expense'; draft.categoryId = ''">支出</view>
      <view class="type-btn" :class="{ active: draft.type === 'income' }" @click="draft.type = 'income'; draft.categoryId = ''">收入</view>
    </view>

    <!-- 金额显示 -->
    <view class="amount-display">
      <text class="amount-symbol">¥</text>
      <text class="amount-value" :class="{ empty: !draft.amount }">{{ draft.amount || '0' }}</text>
      <text v-if="draft.type === 'expense'" class="amount-type expense">支出</text>
      <text v-else class="amount-type income">收入</text>
    </view>

    <!-- 备注 -->
    <view class="note-row">
      <input class="note-input" v-model="draft.note" placeholder="添加备注…" />
    </view>

    <!-- 分类选择 -->
    <view class="section-label">选择分类</view>
    <view class="cat-grid">
      <view
        v-for="c in currentCats"
        :key="c.id"
        class="cat-chip"
        :class="{ active: draft.categoryId === c.id }"
        :style="draft.categoryId === c.id ? { background: c.bg, borderColor: c.color } : {}"
        @click="draft.categoryId = c.id"
      >
        <text class="cat-emoji">{{ c.emoji }}</text>
        <text class="cat-name" :style="{ color: draft.categoryId === c.id ? c.color : '#6b8c7a' }">{{ c.name }}</text>
      </view>
    </view>

    <!-- 账本选择 -->
    <view class="section-label">选择账本</view>
    <view style="display:flex;gap:8px;flex-wrap:wrap;padding:0 16px;">
      <view
        v-for="l in LEDGERS"
        :key="l.id"
        class="ledger-chip"
        :class="{ active: draft.ledgerId === l.id }"
        @click="draft.ledgerId = l.id"
      >
        <text>{{ l.emoji }} {{ l.name }}</text>
      </view>
    </view>

    <!-- 日期 -->
    <view class="section-label">日期</view>
    <view class="date-row" style="margin:0 16px;">
      <text class="date-text">{{ draft.date }}</text>
    </view>

    <!-- 数字键盘 -->
    <view class="keypad-area">
      <view v-for="(row, ri) in keyRows" :key="ri" class="key-row">
        <view
          v-for="k in row"
          :key="k"
          class="key-btn"
          :class="{ function: k === '⌫' || k === '.' }"
          @click="handleKey(k)"
        >
          <text>{{ k }}</text>
        </view>
      </view>
    </view>

    <!-- 保存按钮 -->
    <view class="save-bar">
      <view class="save-main-btn" @click="saveRecord">
        <text>保存记录</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';

const draft = reactive({
  type: 'expense',
  amount: '',
  categoryId: '',
  note: '',
  date: '6月16日 周一',
  ledgerId: 'main',
});

const EXPENSE_CATS = [
  { id: 'food', emoji: '🍜', name: '餐饮', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { id: 'trans', emoji: '🚇', name: '交通', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { id: 'shop', emoji: '🛍️', name: '购物', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
  { id: 'drink', emoji: '☕', name: '饮品', color: '#92400e', bg: 'rgba(146,64,14,0.1)' },
  { id: 'sport', emoji: '🏃', name: '运动', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { id: 'ent', emoji: '🎬', name: '娱乐', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { id: 'daily', emoji: '🧴', name: '日用', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  { id: 'med', emoji: '💊', name: '医疗', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { id: 'edu', emoji: '📚', name: '教育', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  { id: 'pet', emoji: '🐾', name: '宠物', color: '#84cc16', bg: 'rgba(132,204,22,0.1)' },
  { id: 'home', emoji: '🏠', name: '住房', color: '#14b8a6', bg: 'rgba(20,184,166,0.1)' },
  { id: 'other_e', emoji: '⚙️', name: '其他', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
];

const INCOME_CATS = [
  { id: 'salary', emoji: '💼', name: '工资', color: '#25cc5d', bg: 'rgba(37,204,93,0.1)' },
  { id: 'bonus', emoji: '🎁', name: '奖金', color: '#4fd974', bg: 'rgba(79,217,116,0.1)' },
  { id: 'invest', emoji: '📈', name: '投资', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { id: 'part', emoji: '🤝', name: '兼职', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { id: 'transfer', emoji: '💸', name: '转账', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  { id: 'other_i', emoji: '✨', name: '其他', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
];

const LEDGERS = [
  { id: 'main', emoji: '📒', name: '主账本' },
  { id: 'life', emoji: '🏡', name: '生活账本' },
  { id: 'trip', emoji: '✈️', name: '旅行账本' },
];

const keyRows = [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], ['.', '0', '⌫']];

const currentCats = computed(() => (draft.type === 'expense' ? EXPENSE_CATS : INCOME_CATS));

const handleKey = (k) => {
  if (k === '⌫') {
    draft.amount = draft.amount.slice(0, -1);
  } else if (k === '.') {
    if (!draft.amount.includes('.')) draft.amount += k;
  } else {
    if (draft.amount.includes('.') && draft.amount.split('.')[1]?.length >= 2) return;
    draft.amount += k;
  }
};

const saveRecord = () => {
  uni.showToast({ title: '记录已保存', icon: 'success' });
  setTimeout(() => uni.navigateBack(), 600);
};

const goBack = () => uni.navigateBack();
</script>

<style scoped>
.add-record-page {
  width: 375px; height: 100vh; margin: 0 auto; background: #f2fcf2; display: flex; flex-direction: column;
  overflow: hidden;
}
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 44px 16px 10px; position: relative; z-index: 10;
}
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b8c7a; font-size: 16px; }
.topbar-title { font-size: 16px; font-weight: 700; color: #0f1c14; }
.topbar-spacer { width: 36px; }

.type-switch { display: flex; justify-content: center; gap: 8px; margin: 8px 0 16px; }
.type-btn { padding: 6px 24px; border-radius: 20px; font-size: 13px; font-weight: 600; background: rgba(255,255,255,0.7); color: #6b8c7a; cursor: pointer; }
.type-btn.active[data-type=expense] { background: linear-gradient(135deg,#ffb3b3,#ff6b6b); color: #fff; }
.type-btn.active[data-type=income] { background: linear-gradient(135deg,#89e59c,#25cc5d); color: #fff; }

.amount-display { text-align: center; padding: 12px 0 8px; }
.amount-symbol { font-size: 20px; color: #9bb8a8; font-weight: 600; }
.amount-value { font-size: 42px; font-weight: 900; color: #0f1c14; letter-spacing: -2; }
.amount-value.empty { color: #c2f2c8; }
.amount-type { display: block; font-size: 11px; margin-top: 2px; }
.amount-type.expense { color: #ff6b6b; }
.amount-type.income { color: #25cc5d; }

.note-row { padding: 0 16px 8px; }
.note-input { width: 100%; height: 38px; border-radius: 14px; background: rgba(255,255,255,0.65); border: 1px solid rgba(194,242,200,0.4); padding: 0 14px; font-size: 13px; text-align: center; }

.section-label { font-size: 11px; color: #9bb8a8; font-weight: 600; padding: 8px 18px 6px; }

.cat-grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 14px; }
.cat-chip { padding: 8px 12px; border-radius: 14px; border: 1.5px solid transparent; background: rgba(255,255,255,0.6); display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.cat-chip.active { transform: scale(1.05); }
.cat-emoji { font-size: 16px; }
.cat-name { font-size: 11px; }

.ledger-chip { padding: 6px 14px; border-radius: 20px; background: rgba(255,255,255,0.7); font-size: 12px; color: #6b8c7a; cursor: pointer; }
.ledger-chip.active { background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; }

.date-row { display: flex; align-items: center; gap: 6px; }
.date-text { font-size: 12px; color: #6b8c7a; background: rgba(255,255,255,0.6); padding: 6px 14px; border-radius: 10px; }

.keypad-area { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; padding: 8px 12px; gap: 8px; margin-bottom: 8px; }
.key-row { display: flex; gap: 8px; }
.key-btn {
  flex: 1; height: 52px; border-radius: 14px;
  background: rgba(255,255,255,0.75); backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.9);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 700; color: #0f1c14;
  cursor: pointer; transition: transform 0.1s;
}
.key-btn:active { transform: scale(0.94); background: rgba(37,204,93,0.15); }
.key-btn.function { font-size: 18px; color: #6b8c7a; }

.save-bar { padding: 0 16px 20px; }
.save-main-btn {
  width: 100%; padding: 14px; border-radius: 16px;
  background: linear-gradient(135deg,#4fd974,#25cc5d);
  text-align: center; color: #fff; font-size: 15px; font-weight: 800;
  cursor: pointer; box-shadow: 0 4px 20px rgba(37,204,93,0.3);
}
</style>
