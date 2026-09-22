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
      <view v-for="n in 2" :key="n" class="progress-dot" :class="{ active: step >= n }" />
    </view>

    <view class="ob-body">
      <!-- 步骤 1：欢迎 -->
      <view v-if="step === 1" class="step-wrap">
        <image class="ob-emoji" :src="cdn('/app_static/images/icon_logo2.png')" />
        <text class="ob-title">欢迎来到余钱罐</text>
        <text class="ob-sub"
          >用<text class="ob-keyword">日 / 月 / 年 限额 + 结余攒钱的方式</text
          >，<br />把省下的钱变成看得见的存款。</text
        >
        <!-- 待：图标修改 -->
        <view class="value-list">
          <view class="value-item">
            <image
              class="vi-icon"
              :src="cdn('/app_static/images/icon_budget_target.png')"
              mode="aspectFit"
            />
            <text class="vi-text">按日 / 月 / 年设一个消费上限</text>
          </view>
          <view class="value-item">
            <image
              class="vi-icon"
              :src="cdn('/app_static/images/icon_money.png')"
              mode="aspectFit"
            />
            <text class="vi-text">没花完的钱自动攒起来</text>
          </view>
          <view class="value-item">
            <image
              class="vi-icon"
              :src="cdn('/app_static/images/icon_checkin_streak.png')"
              mode="aspectFit"
            />
            <text class="vi-text">坚持打卡养成存钱习惯</text>
          </view>
        </view>
        <view class="disclaimer">
          <image
            class="dc-icon"
            :src="cdn('/app_static/images/icon_warning.png')"
            mode="aspectFit"
          />
          <text class="dc-text"
            >余钱罐为虚拟记账工具，所有金额均为模拟数据，不涉及真实资金交易。</text
          >
        </view>
      </view>

      <!-- 步骤 2：设日限额 -->
      <view v-else-if="step === 2" class="step-wrap">
        <text class="ob-title">设定你的每日限额</text>
        <text class="ob-sub"
          >不知道设多少？输入月薪，我们帮你算。日 / 月 / 年
          额度都能在「设置」里随时调整。</text
        >
        <view class="form-card">
          <text class="form-label">月薪（元）</text>
          <view class="input-row">
            <text class="input-prefix">¥</text>
            <number-field
              class="input-main"
              :model-value="monthlySalary"
              placeholder="如 5000"
              title="月薪"
              :decimal-places="0"
              :max-integer="9"
              @update:model-value="(v) => (monthlySalary = v)"
            />
          </view>
          <view class="calc-hint" v-if="suggestedDaily > 0">
            <text>按 月薪 ÷ {{ currentMonthDays }} 估算，建议每日约 </text>
            <text class="calc-num">¥{{ suggestedDaily }}</text>
          </view>
          <text class="form-label" style="margin-top: 36rpx">每日限额（元）</text>
          <view class="input-row">
            <text class="input-prefix">¥</text>
            <number-field
              class="input-main"
              :model-value="dailyLimit"
              placeholder="每日可花金额"
              title="每日限额"
              :decimal-places="0"
              :max-integer="9"
              @update:model-value="(v) => (dailyLimit = v)"
            />
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="ob-footer">
      <template v-if="step === 1">
        <view class="ghost-btn" @click="finish"><text>跳过引导</text></view>
        <view class="primary-btn" @click="next"><text>开始设置</text></view>
      </template>
      <template v-else-if="step === 2">
        <view class="ghost-btn" @click="finish"><text>稍后再说</text></view>
        <view class="primary-btn" @click="saveLimit"><text>保存并进入</text></view>
      </template>
    </view>
    <!-- 数字键盘（全局单例，由 number-field 的 @tap 触发弹出） -->
    <amount-keyboard />
  </view>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { cdn } from "@/utils/cdn.js";

import { requireLogin } from "@/utils/guard.js";
import { updateSettings } from "@/api/sparejar.js";
import { updateOnboardingAction, recordSubscribeAuthAction } from "@/stores/user.js";

const step = ref(1);

// 步骤 2
const monthlySalary = ref("");
const dailyLimit = ref("");
// 当前月份天数（28/29/30/31，含闰年 2 月），按当月实际天数估算每日限额
const currentMonthDays = computed(() => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
});
const suggestedDaily = computed(() => {
  const m = Math.floor(Number(monthlySalary.value));
  if (!Number.isFinite(m) || m < 1) return 0;
  return Math.round(m / currentMonthDays.value);
});
// 输入月薪后自动按当月天数估算，并填入「每日限额」
watch(monthlySalary, (v) => {
  const m = Math.floor(Number(v));
  dailyLimit.value = Number.isFinite(m) && m >= 1 ? String(suggestedDaily.value) : "";
});

// 微信订阅消息模板 ID（部署时在微信公众平台申请并填入；为空则跳过授权请求）
const SUBSCRIBE_TMPL_IDS = [];

function requestSubscriptions() {
  if (!SUBSCRIBE_TMPL_IDS.length) return;
  uni.requestSubscribeMessage({
    tmplIds: SUBSCRIBE_TMPL_IDS,
    success: () => {
      ["over_limit", "daily_surplus", "streak_risk"].forEach((t) =>
        recordSubscribeAuthAction(t)
      );
    },
    fail: () => {},
  });
}

function next() {
  if (step.value < 4) step.value += 1;
}

async function saveLimit() {
  let yuan = Math.floor(Number(dailyLimit.value));
  if (!Number.isFinite(yuan) || yuan < 1) yuan = suggestedDaily.value;
  if (!Number.isFinite(yuan) || yuan < 1) {
    uni.showToast({ title: "请先设定每日限额", icon: "none" });
    return;
  }
  try {
    await updateSettings({ daily_base_limit: yuan * 100 });
    // 第 2 步（设日限额）完成后请求订阅授权（§8.6）
    requestSubscriptions();
    await finish();
  } catch (err) {
    uni.showToast({ title: (err && err.message) || "保存失败", icon: "none" });
  }
}

async function finish() {
  try {
    await updateOnboardingAction(2, true);
  } catch (_e) {}
  uni.switchTab({ url: "/pages/index/index" });
}

// 进入页面先做登录门禁（未登录则跳转登录页，登录后自动回来）
if (!requireLogin("/pages/onboarding/onboarding")) {
  // 未登录：已跳转登录页
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
  .ob-keyword {
    font-size: 32rpx;
    font-weight: 700;
    color: var(--ink2);
    margin: 0 10rpx;
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
        width: 44rpx;
        height: 44rpx;
        flex-shrink: 0;
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
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;

    .dc-icon {
      width: 64rpx;
      height: 64rpx;
      flex-shrink: 0;
    }

    .dc-text {
      font-size: 22rpx;
      color: var(--warn-text);
      line-height: 1.5;
      text-align: left;
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
      align-items: baseline;
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
