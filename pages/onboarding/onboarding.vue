<template>
  <view class="onboard-page" data-cmp="Onboarding">
    <!-- 极光背景 -->
    <view class="aurora-bg-wrap">
      <view class="aurora-bg-base" />
      <view class="aurora-top-halo" />
      <view class="blob-top-l" />
      <view class="blob-top-r" />
    </view>

    <!-- 进度条 -->
    <view class="progress-row">
      <view v-for="n in 4" :key="n" class="progress-dot" :class="{ active: step >= n }" />
    </view>

    <view class="ob-body">
      <!-- 步骤 1：欢迎 -->
      <view v-if="step === 1" class="step-wrap">
        <image class="ob-emoji" :src="cdn('/app_static/images/icon_logo2.png')" />
        <text class="ob-title">欢迎来到余钱罐</text>
        <text class="ob-sub">用「日限额 + 结余攒钱」的方式，<br />把每一天的结余变成看得见的存款。</text>
        <!-- 待：图标修改 -->
        <view class="value-list">
          <view class="value-item"><text class="vi-icon">🎯</text><text class="vi-text">设一个合理的每日消费上限</text></view>
          <view class="value-item"><text class="vi-icon">💰</text><text class="vi-text">每天没花完的钱自动攒起来</text></view>
          <view class="value-item"><text class="vi-icon">🔥</text><text class="vi-text">连续打卡养成存钱习惯</text></view>
        </view>
        <view class="disclaimer">
          <!-- 待：图标修改 -->
          <text class="dc-text">⚠️ 余钱罐为虚拟记账工具，所有金额均为模拟数据，不涉及真实资金交易。</text>
        </view>
      </view>

      <!-- 步骤 2：设日限额 -->
      <view v-else-if="step === 2" class="step-wrap">
        <text class="ob-title">设定你的每日限额</text>
        <text class="ob-sub">不知道设多少？输入月薪，我们帮你算。</text>
        <view class="form-card">
          <text class="form-label">月薪（元）</text>
          <view class="input-row">
            <text class="input-prefix">¥</text>
            <input class="input-main" type="number" v-model="monthlySalary" placeholder="如 9000" />
          </view>
          <view class="calc-hint" v-if="suggestedDaily > 0">
            <text>按 月薪 ÷ 30 估算，建议每日约 </text>
            <text class="calc-num">¥{{ suggestedDaily }}</text>
          </view>
          <text class="form-label" style="margin-top:36rpx;">每日限额（元）</text>
          <view class="input-row">
            <text class="input-prefix">¥</text>
            <input class="input-main" type="number" v-model="dailyLimit" placeholder="每日可花金额" />
          </view>
        </view>
      </view>

      <!-- 步骤 3：记第一笔 -->
      <view v-else-if="step === 3" class="step-wrap">
        <text class="ob-title">记下你的第一笔支出</text>
        <text class="ob-sub">随便记一笔试试，感受一下流程（可跳过）。</text>
        <view class="form-card">
          <text class="form-label">金额（元）</text>
          <view class="input-row">
            <text class="input-prefix">¥</text>
            <input class="input-main" type="digit" v-model="txAmount" placeholder="0.00" />
          </view>
          <text class="form-label" style="margin-top:36rpx;">分类</text>
          <picker class="picker-row" :range="expenseCats" range-key="name" @change="onCatChange">
            <view class="picker-inner">
              <text>{{ selectedCat ? selectedCat.name : '请选择分类' }}</text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
          <text class="form-label" style="margin-top:36rpx;">备注（可选）</text>
          <input class="input-main full" v-model="txNote" placeholder="如 午餐" />
        </view>
      </view>

      <!-- 步骤 4：建心愿 -->
      <view v-else-if="step === 4" class="step-wrap">
        <text class="ob-title">建一个攒钱心愿</text>
        <text class="ob-sub">把结余存进心愿，让存钱更有动力（可选）。</text>
        <view class="form-card">
          <text class="form-label">心愿名称</text>
          <input class="input-main full" v-model="wishName" placeholder="如 旅行基金" />
          <text class="form-label" style="margin-top:36rpx;">目标金额（元）</text>
          <view class="input-row">
            <text class="input-prefix">¥</text>
            <input class="input-main" type="digit" v-model="wishAmount" placeholder="0.00" />
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="ob-footer">
      <view v-if="step === 1" class="primary-btn" @click="next"><text>开始设置</text></view>
      <template v-else-if="step === 2">
        <view class="ghost-btn" @click="skipAll"><text>跳过引导</text></view>
        <view class="primary-btn" @click="saveLimit"><text>保存并继续</text></view>
      </template>
      <template v-else-if="step === 3">
        <view class="ghost-btn" @click="next"><text>跳过</text></view>
        <view class="primary-btn" @click="saveTx"><text>保存并继续</text></view>
      </template>
      <template v-else-if="step === 4">
        <view class="ghost-btn" @click="finish"><text>稍后再说</text></view>
        <view class="primary-btn" @click="saveWish"><text>创建并完成</text></view>
      </template>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { cdn } from '@/utils/cdn.js';
import { useUserStore } from '@/stores/user.js';
import { createTransaction, createWish, updateSettings } from '@/api/sparejar.js';
import { updateOnboardingAction, recordSubscribeAuthAction } from '@/stores/user.js';
import { todayDateKey, formatDateTime } from '@/utils/date.js';
import { safeYuanToFen, formatFen } from '@/utils/money.js';

const { state, loadCategories } = useUserStore();

const step = ref(1);

// 步骤 2
const monthlySalary = ref('');
const dailyLimit = ref('');
const suggestedDaily = computed(() => {
  const m = Math.floor(Number(monthlySalary.value));
  if (!Number.isFinite(m) || m < 1) return 0;
  return Math.round(m / 30);
});

// 步骤 3
const txAmount = ref('');
const txNote = ref('');
const selectedCat = ref(null);
const expenseCats = computed(() =>
  (Array.isArray(state.categories) ? state.categories : [])
    .filter((c) => c && c.type === 'expense')
    .slice(0, 12)
);
function onCatChange(e) {
  selectedCat.value = expenseCats.value[Number(e.detail.value)] || null;
}

// 步骤 4
const wishName = ref('');
const wishAmount = ref('');

// 微信订阅消息模板 ID（部署时在微信公众平台申请并填入；为空则跳过授权请求）
const SUBSCRIBE_TMPL_IDS = [];

function requestSubscriptions() {
  if (!SUBSCRIBE_TMPL_IDS.length) return;
  uni.requestSubscribeMessage({
    tmplIds: SUBSCRIBE_TMPL_IDS,
    success: () => {
      ['over_limit', 'daily_surplus', 'streak_risk'].forEach((t) => recordSubscribeAuthAction(t));
    },
    fail: () => {}
  });
}

function next() {
  if (step.value < 4) step.value += 1;
}

async function saveLimit() {
  let yuan = Math.floor(Number(dailyLimit.value));
  if (!Number.isFinite(yuan) || yuan < 1) yuan = suggestedDaily.value;
  if (!Number.isFinite(yuan) || yuan < 1) {
    uni.showToast({ title: '请先设定每日限额', icon: 'none' });
    return;
  }
  try {
    await updateSettings({ daily_base_limit: yuan * 100 });
    await updateOnboardingAction(2, false);
    // 第 2 步完成后请求订阅授权（§8.6）
    requestSubscriptions();
    next();
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
  }
}

async function saveTx() {
  const res = safeYuanToFen(txAmount.value);
  if (!res.ok || res.value < 1) {
    uni.showToast({ title: '请输入有效金额', icon: 'none' });
    return;
  }
  if (!selectedCat.value) {
    uni.showToast({ title: '请选择分类', icon: 'none' });
    return;
  }
  try {
    await createTransaction({
      ledger_id: state.defaultLedgerId || '',
      type: 'expense',
      amount: res.value,
      category_id: selectedCat.value._id,
      note: txNote.value.trim(),
      date_key: todayDateKey(),
      transaction_at: formatDateTime()
    });
    await updateOnboardingAction(3, false);
    uni.showToast({ title: '已记录', icon: 'success' });
    next();
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
  }
}

async function saveWish() {
  if (!wishName.value.trim()) {
    uni.showToast({ title: '请输入心愿名称', icon: 'none' });
    return;
  }
  const res = safeYuanToFen(wishAmount.value);
  if (!res.ok || res.value < 1) {
    uni.showToast({ title: '请输入有效目标金额', icon: 'none' });
    return;
  }
  try {
    await createWish({ name: wishName.value.trim(), target_amount: res.value, deadline: '' });
    uni.showToast({ title: '心愿已创建', icon: 'success' });
    await finish();
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '创建失败', icon: 'none' });
  }
}

async function finish() {
  try {
    await updateOnboardingAction(4, true);
  } catch (_e) {}
  uni.switchTab({ url: '/pages/index/index' });
}

function skipAll() {
  uni.showModal({
    title: '跳过引导',
    content: '你可以稍后在「我的 → 通知设置」上方或首页提示条继续设置。',
    confirmText: '跳过',
    success: (r) => {
      if (r.confirm) finish();
    }
  });
}

// 进入页面确保分类已加载（步骤 3 需要）
if (!state.categories || !state.categories.length) {
  loadCategories().catch(() => {});
}
</script>

<style scoped lang="scss">
.onboard-page {
  // 复用全局主题变量（uni.scss -> sj-theme-css-vars）：--g0..--g5 / --ink / --ink3 ...
  @include sj-theme-css-vars;

  // 仅本页特有、全局调色板未提供的变量
  --card: rgba(255, 255, 255, 0.7);
  --card-soft: rgba(255, 255, 255, 0.6);
  --warn-bg: rgba(255, 243, 224, 0.7);
  --warn-border: #ffe0a3;
  --warn-text: #b07a1e;
  --radius-sm: 28rpx;
  --radius-md: 36rpx;

  width: 750rpx;
  height: 1624rpx;
  overflow: hidden;
  position: relative;
  margin: 0 auto;
  background: var(--g0);
  display: flex;
  flex-direction: column;

  .aurora-bg-wrap {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  .aurora-bg-base {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, var(--g1), var(--g0));
  }

  .aurora-top-halo {
    position: absolute;
    top: -240rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 720rpx;
    height: 480rpx;
    background: radial-gradient(circle, rgba(79, 217, 116, 0.35), transparent 70%);
    filter: blur(40rpx);
  }

  .blob-top-l {
    position: absolute;
    top: -80rpx;
    left: -120rpx;
    width: 360rpx;
    height: 360rpx;
    border-radius: 50%;
    background: rgba(143, 229, 156, 0.25);
    filter: blur(60rpx);
  }

  .blob-top-r {
    position: absolute;
    top: 60rpx;
    right: -140rpx;
    width: 400rpx;
    height: 400rpx;
    border-radius: 50%;
    background: rgba(59, 130, 246, 0.12);
    filter: blur(68rpx);
  }

  .progress-row {
    display: flex;
    gap: 16rpx;
    justify-content: center;
    padding: 108rpx 0 16rpx;
    position: relative;
    z-index: 2;

    .progress-dot {
      width: 72rpx;
      height: 10rpx;
      border-radius: 6rpx;
      background: rgba(194, 242, 200, 0.8);

      &.active {
        @include sj-brand-gradient;
      }
    }
  }

  .ob-body {
    flex: 1;
    padding: 32rpx 48rpx;
    position: relative;
    z-index: 2;
    overflow-y: auto;

    .step-wrap {
      display: flex;
      flex-direction: column;
    }
  }

  .ob-emoji {
    width: 400rpx;
    height: 400rpx;
    margin: 36rpx auto 10rpx;
  }
  .ob-title {
    font-size: 44rpx;
    font-weight: 800;
    color: var(--ink);
    text-align: center;
  }

  .ob-sub {
    font-size: 26rpx;
    color: var(--ink3);
    text-align: center;
    line-height: 1.6;
    margin-top: 20rpx;
  }

  .value-list {
    margin-top: 48rpx;
    display: flex;
    flex-direction: column;
    gap: 24rpx;

    .value-item {
      display: flex;
      align-items: center;
      gap: 24rpx;
      background: var(--card-soft);
      border: 2rpx solid var(--g2);
      border-radius: var(--radius-sm);
      padding: 28rpx;

      .vi-icon {
        font-size: 44rpx;
      }

      .vi-text {
        font-size: 28rpx;
        font-weight: 600;
        color: var(--ink);
      }
    }
  }

  .disclaimer {
    margin-top: 44rpx;
    background: var(--warn-bg);
    border: 2rpx solid var(--warn-border);
    border-radius: 24rpx;
    padding: 24rpx;

    .dc-text {
      font-size: 22rpx;
      color: var(--warn-text);
      line-height: 1.5;
    }
  }

  .form-card {
    margin-top: 44rpx;
    background: var(--card);
    border: 2rpx solid var(--g2);
    border-radius: var(--radius-md);
    padding: 36rpx;

    .form-label {
      font-size: 24rpx;
      color: var(--ink3);
      font-weight: 600;
      display: block;
      margin-bottom: 16rpx;
    }

    .input-main {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 40rpx;
      font-weight: 700;
      color: var(--ink);

      &.full {
        background: #fff;
        border: 2rpx solid var(--g2);
        border-radius: var(--radius-sm);
        padding: 24rpx 28rpx;
        font-size: 32rpx;
        font-weight: 600;
        width: 100%;
        box-sizing: border-box;
      }
    }

    .input-row {
      display: flex;
      align-items: center;
      gap: 12rpx;
      background: #fff;
      border: 2rpx solid var(--g2);
      border-radius: var(--radius-sm);
      padding: 24rpx 28rpx;

      .input-prefix {
        font-size: 36rpx;
        font-weight: 800;
        color: var(--g5);
      }
    }

    .calc-hint {
      font-size: 24rpx;
      color: var(--ink3);
      margin-top: 16rpx;

      .calc-num {
        font-weight: 800;
        color: var(--g5);
      }
    }

    .picker-row {
      margin-top: 8rpx;

      .picker-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #fff;
        border: 2rpx solid var(--g2);
        border-radius: var(--radius-sm);
        padding: 24rpx 28rpx;
        font-size: 32rpx;
        font-weight: 600;
        color: var(--ink);

        .picker-arrow {
          color: var(--g2);
        }
      }
    }
  }

  .ob-footer {
    display: flex;
    gap: 24rpx;
    padding: 32rpx 48rpx 72rpx;
    position: relative;
    z-index: 2;

    .primary-btn {
      flex: 1;
      padding: 30rpx;
      border-radius: 32rpx;
      @include sj-brand-gradient;
      text-align: center;
      color: #fff;
      font-size: 30rpx;
      font-weight: 800;
    }

    .ghost-btn {
      flex: 1;
      padding: 30rpx;
      border-radius: 32rpx;
      background: var(--card);
      border: 2rpx solid var(--g2);
      text-align: center;
      color: var(--ink3);
      font-size: 30rpx;
      font-weight: 700;
    }
  }
}
</style>
