<template>
  <view v-if="show" class="sheet-overlay" @click="closeConsume">
    <view class="sheet-panel" @click.stop>
      <view class="sheet-handle"><view class="handle-bar" /></view>
      <text class="sheet-title" style="color: var(--ink); margin-bottom: 20rpx"
        >消耗记账 · {{ sticker && sticker.name }}</text
      >
      <view v-if="sticker" class="consume-preview">
        <image
          v-if="stickerImg(sticker)"
          class="cp-img"
          :src="stickerImg(sticker)"
          mode="aspectFill"
        />
        <view v-else class="cp-img cp-img-ph">🏷️</view>
        <view class="cp-info">
          <text class="cp-name">{{ sticker.name }}</text>
          <text class="cp-stock">当前库存 {{ sticker.stock_qty }} 件</text>
          <text class="cp-price">单价 ¥{{ fmt(sticker.unit_price) }}</text>
        </view>
      </view>
      <view class="qty-row">
        <text class="qty-label">消耗数量</text>
        <view class="stepper">
          <view class="step-btn" @click="decConsumeQty">−</view>
          <text class="qty-val">{{ consumeQty }}</text>
          <view class="step-btn" @click="incConsumeQty">＋</view>
        </view>
      </view>
      <view class="amount-line">
        <text>将记一笔支出</text>
        <text class="amount-val" style="color: var(--red-soft)"
          >¥{{ fmt((sticker ? sticker.unit_price : 0) * consumeQty) }}</text
        >
      </view>
      <view
        class="consume-submit"
        :class="{ loading: consuming }"
        @click="confirmConsume"
      >
        <text>{{ consuming ? "记账中…" : "确认消耗并记账" }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from "vue";
import { useUserStore } from "@/stores/user.js";

const userStore = useUserStore();
const { consumeStickerAction } = userStore;

const props = defineProps({
  show: { type: Boolean, default: false },
  sticker: { type: Object, default: null },
});
const emit = defineEmits(["update:show", "consumed"]);

const consumeQty = ref(1);
const consuming = ref(false);

// 打开时复位数量与加载态
watch(
  () => props.show,
  (v) => {
    if (v) {
      consumeQty.value = 1;
      consuming.value = false;
    }
  }
);

// 与父页贴纸列表共用同一预览逻辑（父页 stickerImg 仍被列表使用，此处保留等价副本）
function stickerImg(s) {
  return (s && s.image_url) || "";
}
// 与父页 fmt 一致的「分 → 元」格式化
const fmt = (fen) =>
  (fen / 100).toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

function closeConsume() {
  emit("update:show", false);
}
function decConsumeQty() {
  if (consumeQty.value > 1) consumeQty.value--;
}
function incConsumeQty() {
  const max = (props.sticker && props.sticker.stock_qty) || 1;
  if (consumeQty.value < max) consumeQty.value++;
}
async function confirmConsume() {
  if (consuming.value || !props.sticker) return;
  consuming.value = true;
  try {
    const r = await consumeStickerAction(props.sticker._id, consumeQty.value);
    uni.showToast({ title: "已记一笔支出", icon: "success" });
    emit("update:show", false);
    emit("consumed"); // 父页面刷新交易 / 余额 / 统计联动
    if (r && r.new_stock_qty <= 0) {
      setTimeout(
        () => uni.showToast({ title: "库存已清空，记得补货", icon: "none" }),
        600
      );
    }
  } catch (err) {
    uni.showToast({ title: (err && err.message) || "消耗失败", icon: "none" });
  } finally {
    consuming.value = false;
  }
}
</script>

<style scoped lang="scss">
@import "../../styles/ledger-dialog.scss";

/* 消耗记账弹窗（复用 ledger-dialog.scss 的 sheet-* 骨架） */
.consume-preview {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: rgba(37, 204, 93, 0.06);
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
  .cp-img {
    width: 96rpx;
    height: 96rpx;
    border-radius: 20rpx;
  }
  .cp-img-ph {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 44rpx;
    background: rgba(37, 204, 93, 0.1);
  }
  .cp-info {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }
  .cp-name {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--ink);
  }
  .cp-stock {
    font-size: 20rpx;
    color: var(--ink4);
  }
  .cp-price {
    font-size: 22rpx;
    color: $sj-g5;
    font-weight: 700;
  }
}
.qty-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
  .qty-label {
    font-size: 26rpx;
    color: var(--ink2);
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: 24rpx;
    background: rgba(15, 61, 38, 0.06);
    border-radius: 999rpx;
    padding: 8rpx 20rpx;
    .step-btn {
      width: 48rpx;
      height: 48rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 2rpx 8rpx rgba(15, 61, 38, 0.1);
      font-size: 32rpx;
      color: var(--ink2);
      font-weight: 700;
    }
    .qty-val {
      min-width: 40rpx;
      text-align: center;
      font-size: 30rpx;
      font-weight: 800;
      color: var(--ink);
    }
  }
}
.amount-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(15, 61, 38, 0.05);
  border-radius: 16rpx;
  padding: 18rpx 20rpx;
  font-size: 24rpx;
  color: var(--ink3);
  margin-bottom: 28rpx;
  .amount-val {
    font-size: 32rpx;
    font-weight: 800;
  }
}
.consume-submit {
  height: 88rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, $sj-g5, $sj-g7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  &.loading {
    opacity: 0.6;
  }
}
</style>
