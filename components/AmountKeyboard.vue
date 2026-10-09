<template>
  <view class="ak-mask" v-if="state.show" @click="onMaskClick">
    <view class="ak-panel" @click.stop>
      <!-- 顶部条：标题 + 当前输入预览 + 收起箭头 -->
      <!-- 待：横线上放一个小狗在敲键盘 -->
      <view class="ak-head">
        <text class="ak-title" v-if="state.title">{{ state.title }}</text>
        <text class="ak-preview" :class="{ 'is-empty': !state.value }">{{
          displayPreview
        }}</text>
        <view class="ak-head-actions">
          <view
            class="ak-clear"
            :class="{ 'is-disabled': !state.value }"
            @click="onClear"
          >
            <text class="ak-clear-text">清空</text>
          </view>
          <view class="ak-collapse" @click="onDone">
            <text class="ak-collapse-icon">∨</text>
          </view>
        </view>
      </view>

      <!-- 数字键盘（3 列：1-9 / . 0 ⌫） -->
      <view class="ak-keys">
        <view
          class="ak-key"
          v-for="k in keys"
          :key="k.val"
          :class="[
            k.cls,
            { 'ak-key--disabled': k.val === 'dot' && hasDot },
            { 'ak-key--press': pressed === k.val },
          ]"
          :hover-class="k.cls === 'ak-key--func' ? 'ak-key--func-press' : 'ak-key--press'"
          hover-stay-time="70"
          @click="onPress(k.val)"
        >
          <!-- 待：小狗拿着大删除的牌子 -->
          <text v-if="k.val === 'delete'" class="ak-key-icon">⌫</text>
          <text v-else class="ak-key-text">{{ k.label }}</text>
        </view>
      </view>

      <!-- 完成按钮（带打勾图标） -->
      <view
        class="ak-done"
        :hover-class="'ak-done--press'"
        hover-stay-time="70"
        @click="onDone"
      >
        <text class="ak-done-text">完成</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from "vue";
import { useNumberKeyboard } from "@/stores/numberKeyboard.js";

const { state, emitInput, close } = useNumberKeyboard();

const pressed = ref("");

// 键盘布局：3 列 → 1 2 3 / 4 5 6 / 7 8 9 / . 0 ⌫
const keys = [
  { val: "1", label: "1" },
  { val: "2", label: "2" },
  { val: "3", label: "3" },
  { val: "4", label: "4" },
  { val: "5", label: "5" },
  { val: "6", label: "6" },
  { val: "7", label: "7" },
  { val: "8", label: "8" },
  { val: "9", label: "9" },
  { val: "dot", label: ".", cls: "ak-key--func" },
  { val: "0", label: "0" },
  { val: "delete", label: "", cls: "ak-key--func" },
];

const hasDot = computed(() => (state.value || "").includes("."));

const displayPreview = computed(() => {
  const v = state.value || "";
  return v === "" ? "0.00" : v;
});

function onPress(val) {
  if (val === "dot" && hasDot.value) return; // 只能有一个小数点

  let v = state.value || "";

  if (val === "delete") {
    v = v.slice(0, -1);
  } else if (val === "dot") {
    v = v === "" ? "0." : v + ".";
  } else {
    // 数字
    if (v === "0") {
      v = val; // 去掉前导零
    } else {
      // 整数位长度限制
      const dotIdx = v.indexOf(".");
      const intPart = dotIdx >= 0 ? v.slice(0, dotIdx) : v;
      if (dotIdx < 0 && intPart.length >= state.maxInteger) return;
      // 小数位限制
      if (dotIdx >= 0 && v.length - dotIdx - 1 >= state.decimalPlaces) return;
      v = v + val;
    }
  }
  state.value = v;
  emitInput(v);
}

function onDone() {
  close();
}
function onClear() {
  if (!state.value) return;
  state.value = "";
  emitInput("");
}
function onMaskClick() {
  close();
}
</script>

<style scoped lang="scss">
.ak-mask {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  background: rgba(0, 0, 0, 0.18);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}

.ak-panel {
  width: 100%;
  background: #ffffff;
  border-top-left-radius: 24rpx;
  border-top-right-radius: 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -8rpx 30rpx rgba(0, 0, 0, 0.12);
}

.ak-head {
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  border-bottom: 2rpx solid #e3e5e8;
  gap: 16rpx;
}

.ak-title {
  font-size: 26rpx;
  color: #8a8f99;
  flex: 0 0 auto;
  max-width: 240rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ak-preview {
  flex: 0 1 auto;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--ink, #1f2329);
  letter-spacing: 1rpx;
}
.ak-preview.is-empty {
  color: #b0b4bb;
}

.ak-head-actions {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex: 0 0 auto;
}

.ak-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60rpx;
  padding: 0 14rpx;
  border-radius: 10rpx;
}
.ak-clear-text {
  font-size: 26rpx;
  color: #8a8f99;
  line-height: 1;
}
.ak-clear.is-disabled {
  opacity: 0.35;
}

.ak-collapse {
  width: 60rpx;
  height: 60rpx;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ak-collapse-icon {
  font-size: 40rpx;
  color: #8a8f99;
  line-height: 1;
}

.ak-keys {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 24rpx 24rpx 8rpx;
  margin-top: 2rpx;
}

.ak-key {
  flex: 1 1 calc((100% - 32rpx) / 3);
  min-width: calc((100% - 32rpx) / 3);
  height: 110rpx;
  background: #ffffff;
  // border: 2rpx solid var(--ink4);
  border-radius: 12rpx;
  box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.12s ease, transform 0.08s ease;
}

.ak-key--press {
  background: #d9dbe0 !important;
  transform: scale(0.97);
}

.ak-key--func .ak-key-icon {
  color: #5a6068;
}
.ak-key--func-press {
  background: #d9dbe0 !important;
  transform: scale(0.97);
}

.ak-key-text {
  font-size: 48rpx;
  font-weight: 600;
  color: #1f2329;
}

.ak-key-icon {
  font-size: 46rpx;
  color: #1f2329;
}

.ak-key--disabled {
  opacity: 0.4;
}

/* 完成按钮 */
.ak-done {
  margin: 24rpx 24rpx 0;
  height: 96rpx;
  border: 1px solid var(--g6);
  border-radius: 16rpx;
  background: var(--g5);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  transition: background-color 0.12s ease, transform 0.08s ease;
}
.ak-done--press {
  background: var(--g6) !important;
  transform: scale(0.98);
}
.ak-done-check {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffffff;
}
.ak-done-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2rpx;
}
</style>
