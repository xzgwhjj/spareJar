<template>
  <view class="asset-page" data-cmp="AssetMgr">
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">资产管理</text>
      <view class="add-btn" @click="showAddSheet = true"><text>+</text></view>
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="flex:1;">
      <!-- 总览 -->
      <view class="glass-hero card-in-1" style="margin:16px;padding:18px;text-align:center;">
        <text class="overview-label">总资产净值</text>
        <text class="overview-amount" :style="{ color: totalBalance >= 0 ? '#25cc5d' : '#ff6b6b' }">
          ¥{{ Math.abs(totalBalance).toLocaleString() }}
        </text>
        <view class="overview-stats">
          <view class="ov-stat">
            <text class="ov-val" style="color:#25cc5d;">¥{{ positiveBalance.toLocaleString() }}</text>
            <text class="ov-lbl">资产</text>
          </view>
          <view class="ov-divider" />
          <view class="ov-stat">
            <text class="ov-val" style="color:#ff6b6b;">¥{{ negativeBalance.toLocaleString() }}</text>
            <text class="ov-lbl">负债</text>
          </view>
        </view>
      </view>

      <!-- 账户列表 -->
      <text class="section-header">💳 我的账户</text>
      <view v-for="(a, i) in accounts" :key="a.id" class="account-card glass-mid card-item" style="margin:0 16px 10px;padding:14px 16px;" :style="{ animationDelay: (i * 0.08) + 's' }">
        <view class="acc-row">
          <view class="acc-icon" :style="{ background: a.colorBg }">
            <text>{{ a.icon }}</text>
          </view>
          <view class="acc-info">
            <view class="acc-name-row">
              <text class="acc-name">{{ a.name }}</text>
              <text class="acc-type">{{ a.type }}</text>
            </view>
            <text v-if="a.cardNumber" class="acc-number">{{ a.cardNumber }}</text>
          </view>
          <view class="acc-balance-group">
            <text class="acc-balance" :style="{ color: a.balance >= 0 ? '#0f1c14' : '#ff6b6b' }">
              ¥{{ a.balance.toLocaleString() }}
            </text>
            <view class="acc-actions">
              <text class="acc-edit" @click.stop="editAccount(a)">✏️</text>
              <text class="acc-del" @click.stop="deleteAccount(a)">🗑️</text>
            </view>
          </view>
        </view>
      </view>

      <view style="height:24px;" />
    </scroll-view>

    <!-- 新增/编辑账户弹窗 -->
    <view v-if="showAddSheet" class="sheet-overlay" @click="showAddSheet = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">{{ editingAccount ? '编辑账户' : '新增账户' }}</text>

        <text class="form-label">账户名称</text>
        <input class="sheet-input" v-model="form.name" placeholder="如：招商储蓄卡" />

        <text class="form-label">账户类型</text>
        <view class="type-grid">
          <view v-for="t in accountTypes" :key="t" class="type-chip" :class="{ active: form.type === t }" @click="form.type = t">
            {{ t }}
          </view>
        </view>

        <text class="form-label">账户图标</text>
        <view class="icon-grid">
          <view v-for="ic in iconOptions" :key="ic" class="icon-chip" :class="{ active: form.icon === ic }" @click="form.icon = ic">
            {{ ic }}
          </view>
        </view>

        <text class="form-label">当前余额</text>
        <input class="sheet-input" v-model="form.balanceStr" type="digit" placeholder="0" />

        <text class="form-label">卡号后四位（可选）</text>
        <input class="sheet-input" v-model="form.cardNumber" placeholder="如：6688" maxlength="4" />

        <view class="save-btn" @click="saveAccount">
          <text>{{ editingAccount ? '保存修改' : '添加账户' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';

const accounts = ref([
  { id: 'a1', icon: '💵', name: '钱包现金', type: '现金', balance: 380, colorBg: '#e1fae3', cardNumber: '' },
  { id: 'a2', icon: '🏦', name: '招商储蓄卡', type: '储蓄', balance: 23460, colorBg: '#f3f0ff', cardNumber: '6688' },
  { id: 'a3', icon: '💳', name: '工行信用卡', type: '信用', balance: -3200, colorBg: '#fff0f0', cardNumber: '1234' },
  { id: 'a4', icon: '📈', name: '基金账户', type: '投资', balance: 8780, colorBg: '#fffbeb', cardNumber: '' },
  { id: 'a5', icon: '🏠', name: '房贷', type: '贷款', balance: -320000, colorBg: '#fff0f0', cardNumber: '' },
]);

const accountTypes = ['现金', '储蓄', '信用', '投资', '贷款'];
const iconOptions = ['💵', '🏦', '💳', '📈', '🏠', '🚗', '✈️', '🎓', '💼', '🐷'];

const showAddSheet = ref(false);
const editingAccount = ref(null);

const defaultForm = () => ({ name: '', type: '储蓄', icon: '🏦', balanceStr: '', cardNumber: '' });
const form = reactive(defaultForm());

const totalBalance = computed(() => accounts.value.reduce((s, a) => s + a.balance, 0));
const positiveBalance = computed(() => accounts.value.filter((a) => a.balance > 0).reduce((s, a) => s + a.balance, 0));
const negativeBalance = computed(() => Math.abs(accounts.value.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0)));

const typeColorMap = {
  '现金': '#e1fae3',
  '储蓄': '#f3f0ff',
  '信用': '#fff0f0',
  '投资': '#fffbeb',
  '贷款': '#fff0f0',
};

const editAccount = (a) => {
  editingAccount.value = a;
  Object.assign(form, {
    name: a.name,
    type: a.type,
    icon: a.icon,
    balanceStr: String(a.balance),
    cardNumber: a.cardNumber || '',
  });
  showAddSheet.value = true;
};

const deleteAccount = (a) => {
  uni.showModal({
    title: '删除确认',
    content: `确定删除「${a.name}」吗？`,
    success: (res) => {
      if (res.confirm) {
        accounts.value = accounts.value.filter((acc) => acc.id !== a.id);
        uni.showToast({ title: '已删除', icon: 'success' });
      }
    },
  });
};

const saveAccount = () => {
  if (!form.name) {
    uni.showToast({ title: '请输入账户名称', icon: 'none' });
    return;
  }
  const balance = parseFloat(form.balanceStr) || 0;

  if (editingAccount.value) {
    Object.assign(editingAccount.value, {
      name: form.name,
      type: form.type,
      icon: form.icon,
      balance,
      cardNumber: form.cardNumber,
      colorBg: typeColorMap[form.type] || '#e1fae3',
    });
  } else {
    accounts.value.push({
      id: 'a' + Date.now(),
      icon: form.icon,
      name: form.name,
      type: form.type,
      balance,
      colorBg: typeColorMap[form.type] || '#e1fae3',
      cardNumber: form.cardNumber,
    });
  }

  showAddSheet.value = false;
  editingAccount.value = null;
  Object.assign(form, defaultForm());
  uni.showToast({ title: '保存成功', icon: 'success' });
};

const goBack = () => uni.navigateBack();
</script>

<style scoped>
.asset-page { width: 375px; height: 100vh; margin: 0 auto; background: #f2fcf2; display: flex; flex-direction: column; overflow: hidden; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 44px 16px 10px; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b8c7a; font-size: 16px; }
.topbar-title { font-size: 17px; font-weight: 700; color: #0f1c14; }
.add-btn { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg,#4fd974,#25cc5d); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; font-size: 20px; font-weight: 300; }

.overview-label { font-size: 12px; color: #9bb8a8; display: block; }
.overview-amount { font-size: 36px; font-weight: 900; display: block; margin-top: 4px; letter-spacing: -1; }
.overview-stats { display: flex; align-items: center; justify-content: center; margin-top: 12px; gap: 20px; }
.ov-stat { text-align: center; }
.ov-val { font-size: 16px; font-weight: 700; display: block; }
.ov-lbl { font-size: 10px; color: #9bb8a8; }
.ov-divider { width: 1px; height: 30px; background: rgba(194,242,200,0.4); }

.section-header { font-size: 12px; color: #9bb8a8; font-weight: 600; padding: 8px 18px 6px; display: block; }
.card-item { animation: cardFadeIn 0.5s cubic-bezier(0.22,0.61,0.36,1) backwards; }

.acc-row { display: flex; align-items: center; gap: 10px; }
.acc-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 18px; }
.acc-info { flex: 1; min-width: 0; }
.acc-name-row { display: flex; align-items: center; gap: 6px; }
.acc-name { font-size: 14px; font-weight: 700; color: #0f1c14; }
.acc-type { font-size: 10px; padding: 2px 6px; border-radius: 6px; background: rgba(194,242,200,0.3); color: #6b8c7a; }
.acc-number { font-size: 10px; color: #9bb8a8; display: block; margin-top: 2px; }
.acc-balance-group { text-align: right; }
.acc-balance { font-size: 16px; font-weight: 800; display: block; }
.acc-actions { display: flex; gap: 6px; margin-top: 4px; justify-content: flex-end; }
.acc-edit, .acc-del { font-size: 12px; cursor: pointer; padding: 2px 4px; }
.acc-edit:active, .acc-del:active { opacity: 0.6; }

.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 300; display: flex; align-items: flex-end; justify-content: center; }
.sheet-panel { width: 375px; max-height: 85vh; overflow-y: auto; background: linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,252,242,0.96)); border-radius: 24px 24px 0 0; padding: 0 20px 30px; }
.sheet-handle { display: flex; justify-content: center; padding: 12px 0 8px; }
.handle-bar { width: 38px; height: 4px; border-radius: 3px; background: rgba(194,242,200,0.8); }
.sheet-title { font-size: 16px; font-weight: 800; color: #0f1c14; display: block; margin-bottom: 14px; }

.form-label { font-size: 12px; color: #6b8c7a; font-weight: 600; display: block; margin-bottom: 6px; margin-top: 10px; }
.sheet-input { width: 100%; height: 44px; border-radius: 14px; background: rgba(242,252,242,0.8); border: 1px solid rgba(194,242,200,0.4); padding: 0 14px; font-size: 14px; margin-bottom: 8px; }

.type-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.type-chip { padding: 6px 14px; border-radius: 12px; background: rgba(255,255,255,0.7); border: 1px solid rgba(194,242,200,0.3); font-size: 12px; font-weight: 600; color: #6b8c7a; cursor: pointer; }
.type-chip.active { background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; border-color: transparent; }

.icon-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.icon-chip { width: 44px; height: 44px; border-radius: 12px; background: rgba(255,255,255,0.7); border: 1px solid rgba(194,242,200,0.3); display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; }
.icon-chip.active { background: rgba(37,204,93,0.15); border-color: #25cc5d; }

.save-btn { margin-top: 16px; padding: 14px; border-radius: 16px; background: linear-gradient(135deg,#4fd974,#25cc5d); text-align: center; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; }
</style>
