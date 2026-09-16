<template>
  <view class="cp-overlay" @click="$emit('cancel')">
    <view class="cp-panel" @click.stop>
      <text class="cp-title">自定义颜色</text>
      <!-- 饱和度/明度方块 -->
      <view class="cp-sv" @touchstart="onSvStart" @touchmove="onSvMove" :style="svStyle">
        <view class="cp-sv-cursor" :style="svCursorStyle"></view>
      </view>
      <!-- 色相滑块 -->
      <view class="cp-hue" @touchstart="onHueStart" @touchmove="onHueMove" :style="hueStyle">
        <view class="cp-hue-cursor" :style="hueCursorStyle"></view>
      </view>
      <!-- 预览 + hex -->
      <view class="cp-preview">
        <view class="cp-preview-dot" :style="{ background: cpHex }"></view>
        <text class="cp-hex">{{ cpHex }}</text>
      </view>
      <view class="cp-actions">
        <view class="cp-cancel" @click="$emit('cancel')">取消</view>
        <view class="cp-confirm" @click="$emit('confirm', cpHex)">确定</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from "vue";
import { hexToHsv, hsvToHex } from "@/utils/coverColor.js";

const props = defineProps({
  // 打开时用于初始化 HSV 的当前色
  initialHex: { type: String, default: "#25cc5d" },
});
const emit = defineEmits(["confirm", "cancel"]);

const init = hexToHsv(props.initialHex || "#25cc5d");
const pickerHue = ref(init.h);
const pickerSat = ref(init.s);
const pickerVal = ref(init.v);

// 当前取色结果（由 HSV 实时换算）
const cpHex = computed(() => hsvToHex(pickerHue.value, pickerSat.value, pickerVal.value));

// 选择器视觉样式（背景随时钟更新）
const svStyle = computed(() => ({
  background: `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgba(255,255,255,0)), hsl(${pickerHue.value}, 100%, 50%)`,
}));
const svCursorStyle = computed(() => ({
  left: pickerSat.value + "%",
  top: 100 - pickerVal.value + "%",
  background: cpHex.value,
}));
const hueStyle = computed(() => ({
  background:
    "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
}));
const hueCursorStyle = computed(() => ({
  left: (pickerHue.value / 360) * 100 + "%",
}));

// 拖动取坐标（小程序触摸事件在 touchstart 的元素上持续派发 touchmove）
let _svRect = null;
let _hueRect = null;
function getRect(sel) {
  return new Promise((resolve) => {
    uni
      .createSelectorQuery()
      .select(sel)
      .boundingClientRect((r) => resolve(r || null))
      .exec();
  });
}
async function onSvStart(e) {
  _svRect = await getRect(".cp-sv");
  onSvMove(e);
}
function onSvMove(e) {
  if (!_svRect) return;
  const t = e.touches[0];
  let x = (t.clientX - _svRect.left) / _svRect.width;
  let y = (t.clientY - _svRect.top) / _svRect.height;
  x = Math.max(0, Math.min(1, x));
  y = Math.max(0, Math.min(1, y));
  pickerSat.value = Math.round(x * 100);
  pickerVal.value = Math.round((1 - y) * 100);
}
async function onHueStart(e) {
  _hueRect = await getRect(".cp-hue");
  onHueMove(e);
}
function onHueMove(e) {
  if (!_hueRect) return;
  const t = e.touches[0];
  let x = (t.clientX - _hueRect.left) / _hueRect.width;
  x = Math.max(0, Math.min(1, x));
  pickerHue.value = Math.round(x * 360);
}
</script>

<style scoped lang="scss">
.cp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.cp-panel {
  width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-sizing: border-box;
}

.cp-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 24rpx;
  display: block;
}

.cp-sv {
  position: relative;
  width: 100%;
  height: 320rpx;
  border-radius: 16rpx;
  overflow: hidden;
  touch-action: none;
}

.cp-sv-cursor {
  position: absolute;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  box-shadow: 0 0 0 1rpx rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.cp-hue {
  position: relative;
  width: 100%;
  height: 28rpx;
  border-radius: 14rpx;
  margin: 28rpx 0;
  overflow: visible;
  touch-action: none;
}

.cp-hue-cursor {
  position: absolute;
  top: 50%;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  background: transparent;
  box-shadow: 0 0 0 1rpx rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.cp-preview {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.cp-preview-dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(0, 0, 0, 0.1);
}

.cp-hex {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink2);
  letter-spacing: 1rpx;
}

.cp-actions {
  display: flex;
  gap: 20rpx;
}

.cp-cancel,
.cp-confirm {
  flex: 1 1 0;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 700;
  cursor: pointer;
}

.cp-cancel {
  background: rgba(0, 0, 0, 0.05);
  color: var(--ink3);
}

.cp-confirm {
  background: var(--g5);
  color: #fff;
}
</style>
