<template>
  <view class="crop-overlay" @click.stop>
    <view class="crop-panel" @click.stop>
      <view class="crop-head">裁剪为 {{ cropRatioLabel }}</view>

      <!-- 舞台：图片居中显示；单指拖动裁剪框移动，四角缩放尺寸，双指缩放图片 -->
      <view
        id="cropStage"
        class="crop-stage"
        :style="stageStyle"
        @touchstart="onCropTouchStart"
        @touchmove="onCropTouchMove"
        @touchend="onCropTouchEnd"
      >
        <image class="crop-img" :src="cropSrc" :style="imgStyle" />
        <view class="crop-box" :style="boxStyle">
          <view class="crop-grid" />
          <view class="crop-handle tl"></view>
          <view class="crop-handle tr"></view>
          <view class="crop-handle bl"></view>
          <view class="crop-handle br"></view>
        </view>
      </view>

      <!-- 预览 -->
      <view class="crop-row">
        <text class="crop-row-label">预览</text>
        <view class="crop-prev" :style="previewBoxStyle">
          <image class="crop-prev-img" :src="cropSrc" :style="previewStyle" />
        </view>
      </view>

      <view class="crop-actions">
        <view class="crop-btn crop-cancel" @click="cancel"><text>取消</text></view>
        <view class="crop-btn crop-ok" @click="confirmCrop"><text>确认裁剪</text></view>
      </view>
    </view>
    <canvas type="2d" id="cropExport" class="crop-export-canvas" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";

const props = defineProps({
  // 待裁剪原图路径
  src: { type: String, required: true },
  // 目标宽高比 宽/高（0.75=3:4，4/3=4:3）
  ratio: { type: Number, default: 0.75 },
});
const emit = defineEmits(["confirm", "cancel"]);

const OUT_W = 600; // 导出宽度固定，高度按 cropRatio 计算
const cropRatio = ref(props.ratio);
const stageW = ref(300);
const stageH = ref(300);
const imgW = ref(0);
const imgH = ref(0);
const baseScale = ref(1); // 自然尺寸 → 初始 fit 显示比例
const imgScale = ref(1); // 用户双指缩放因子
const dispScale = computed(() => baseScale.value * imgScale.value); // 综合显示比例
const imgX = ref(0); // 显示图中左上角在舞台中的坐标
const imgY = ref(0);
const boxW = ref(0); // 裁剪框（显示坐标）
const boxH = ref(0);
const boxX = ref(0);
const boxY = ref(0);
const stageRectVal = ref({ left: 0, top: 0 }); // 舞台在视口中的位置（v-if 打开后异步查询）
const cropSrc = ref(props.src);

const stageStyle = computed(() => ({
  width: stageW.value + "px",
  height: stageH.value + "px",
}));
const imgStyle = computed(() => ({
  width: imgW.value * dispScale.value + "px",
  height: imgH.value * dispScale.value + "px",
  left: imgX.value + "px",
  top: imgY.value + "px",
}));
const boxStyle = computed(() => ({
  width: boxW.value + "px",
  height: boxH.value + "px",
  left: boxX.value + "px",
  top: boxY.value + "px",
}));
// 预览：用 CSS 把当前裁剪区域映射到固定 96x128 的 3:4 预览框
const previewStyle = computed(() => {
  const PW = 96;
  const k = PW / boxW.value;
  return {
    width: imgW.value * dispScale.value * k + "px",
    height: imgH.value * dispScale.value * k + "px",
    left: -((boxX.value - imgX.value) * k) + "px",
    top: -((boxY.value - imgY.value) * k) + "px",
  };
});
// 预览容器：按当前裁剪比例设定宽高，保证预览不变形
const previewBoxStyle = computed(() => {
  const PW = 96;
  return { width: PW + "px", height: PW / cropRatio.value + "px" };
});
const cropRatioLabel = computed(() =>
  Math.abs(cropRatio.value - 0.75) < 0.001 ? "3 : 4" : "4 : 3"
);

// 将裁剪框约束在图片显示范围内
function clampBox(nx, ny) {
  const minX = imgX.value;
  const minY = imgY.value;
  const maxX = imgX.value + imgW.value * dispScale.value - boxW.value;
  const maxY = imgY.value + imgH.value * dispScale.value - boxH.value;
  boxX.value = Math.max(minX, Math.min(maxX, nx));
  boxY.value = Math.max(minY, Math.min(maxY, ny));
}

// ===== 裁剪手势：单指拖动裁剪框移动 / 四角拖动改尺寸（保持比例）/ 双指缩放图片 =====
let cropMode = null; // 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | 'pinch'
let moveOffset = { x: 0, y: 0 };
let pinchDist0 = 0;
let pinchScale0 = 1;
const HANDLE_HIT = 26; // 四角命中半径(px)
const MIN_BOX = 40; // 裁剪框最小边长(px)

function stageRect() {
  return stageRectVal.value;
}
function localPoint(e) {
  const rect = stageRectVal.value;
  const t = e.touches[0];
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}
function hitCorner(x, y) {
  const corners = {
    tl: [boxX.value, boxY.value],
    tr: [boxX.value + boxW.value, boxY.value],
    bl: [boxX.value, boxY.value + boxH.value],
    br: [boxX.value + boxW.value, boxY.value + boxH.value],
  };
  for (const k in corners) {
    if (Math.hypot(x - corners[k][0], y - corners[k][1]) <= HANDLE_HIT) return k;
  }
  return null;
}
function insideBox(x, y) {
  return (
    x >= boxX.value &&
    x <= boxX.value + boxW.value &&
    y >= boxY.value &&
    y <= boxY.value + boxH.value
  );
}
// 双指缩放：以图片中心为锚点缩放显示尺寸
function setImgScale(s) {
  imgScale.value = Math.max(1, Math.min(5, s));
  const f = baseScale.value * imgScale.value;
  const dw = imgW.value * f,
    dh = imgH.value * f;
  imgX.value = (stageW.value - dw) / 2;
  imgY.value = (stageH.value - dh) / 2;
  clampBox(boxX.value, boxY.value); // 框仍约束在图片内
}
// 四角拖动：固定对角，保持比例，约束在图片显示范围内
function doResize(corner, px, py) {
  const ratio = cropRatio.value;
  const left0 = boxX.value,
    top0 = boxY.value,
    right0 = boxX.value + boxW.value,
    bottom0 = boxY.value + boxH.value;
  const fx = corner.includes("l") ? right0 : left0; // 固定角 x
  const fy = corner.includes("t") ? bottom0 : top0; // 固定角 y
  let w = Math.abs(px - fx);
  let h = w / ratio;
  const maxW = corner.includes("l")
    ? fx - imgX.value
    : imgX.value + imgW.value * dispScale.value - fx;
  const maxH = corner.includes("t")
    ? fy - imgY.value
    : imgY.value + imgH.value * dispScale.value - fy;
  w = Math.max(MIN_BOX, Math.min(w, maxW, maxH * ratio));
  h = w / ratio;
  const left = corner.includes("l") ? fx - w : fx;
  const right = corner.includes("l") ? fx : fx + w;
  const top = corner.includes("t") ? fy - h : fy;
  const bottom = corner.includes("t") ? fy : fy + h;
  boxX.value = left;
  boxY.value = top;
  boxW.value = right - left;
  boxH.value = bottom - top;
}
function onCropTouchStart(e) {
  if (e.touches.length >= 2) {
    const [a, b] = e.touches;
    pinchDist0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
    pinchScale0 = imgScale.value;
    cropMode = "pinch";
    return;
  }
  const p = localPoint(e);
  const corner = hitCorner(p.x, p.y);
  if (corner) {
    cropMode = "resize-" + corner;
  } else if (insideBox(p.x, p.y)) {
    cropMode = "move";
    moveOffset = { x: boxX.value - p.x, y: boxY.value - p.y };
  } else {
    cropMode = null;
  }
}
function onCropTouchMove(e) {
  if (cropMode === "pinch" && e.touches.length >= 2) {
    const [a, b] = e.touches;
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
    setImgScale(pinchScale0 * (d / pinchDist0));
    return;
  }
  if (e.touches.length >= 2) return; // 多指期间忽略单指逻辑
  const p = localPoint(e);
  if (cropMode === "move") {
    clampBox(moveOffset.x + p.x, moveOffset.y + p.y);
  } else if (cropMode && cropMode.startsWith("resize-")) {
    doResize(cropMode.slice(7), p.x, p.y);
  }
}
function onCropTouchEnd() {
  cropMode = null; // 抬起后重置，避免跳变
}

function initCropper(path, info, ratio) {
  cropRatio.value = ratio;
  const sys = uni.getSystemInfoSync();
  // 舞台宽度严格受面板内容区约束（面板 width:100% / max-width:680rpx，左右 padding 32rpx），避免超出弹窗右侧
  const rpxPx = sys.windowWidth / 750;
  const panelMax = Math.min(sys.windowWidth, 680 * rpxPx);
  const w = Math.min(panelMax - 64 * rpxPx, 320);
  stageW.value = w;
  stageH.value = w;
  imgW.value = info.width;
  imgH.value = info.height;
  baseScale.value = Math.min(stageW.value / imgW.value, stageH.value / imgH.value);
  imgScale.value = 1;
  const dw = imgW.value * baseScale.value,
    dh = imgH.value * baseScale.value;
  imgX.value = (stageW.value - dw) / 2;
  imgY.value = (stageH.value - dh) / 2;
  const bw = Math.min(dw, dh * cropRatio.value); // 裁剪框最大可容纳尺寸（保持目标比例）
  boxW.value = bw;
  boxH.value = bw / cropRatio.value;
  boxX.value = imgX.value + (dw - bw) / 2;
  boxY.value = imgY.value + (dh - boxH.value) / 2;
  cropSrc.value = path;
  // 打开后查询舞台在视口中的位置，供触摸坐标换算为舞台局部坐标（小程序无 getBoundingClientRect）
  nextTick(() => {
    uni
      .createSelectorQuery()
      .select("#cropStage")
      .boundingClientRect((r) => {
        if (r) stageRectVal.value = { left: r.left, top: r.top };
      })
      .exec();
  });
}

// 确认裁剪：用 Canvas 2D 把裁剪区域绘制到 600x800 画布并导出
function confirmCrop() {
  const factor = dispScale.value;
  const sx = (boxX.value - imgX.value) / factor;
  const sy = (boxY.value - imgY.value) / factor;
  const sw = boxW.value / factor;
  const sh = boxH.value / factor;
  const outH = OUT_W / cropRatio.value;
  uni
    .createSelectorQuery()
    .select("#cropExport")
    .node()
    .exec((res) => {
      const canvas = res[0] && res[0].node;
      if (!canvas) {
        uni.showToast({ title: "裁剪失败", icon: "none" });
        return;
      }
      const ctx = canvas.getContext("2d");
      const img = canvas.createImage();
      img.onload = () => {
        canvas.width = OUT_W;
        canvas.height = outH;
        ctx.clearRect(0, 0, OUT_W, outH);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUT_W, outH);
        uni.canvasToTempFilePath({
          canvas,
          x: 0,
          y: 0,
          width: OUT_W,
          height: outH,
          destWidth: OUT_W,
          destHeight: outH,
          fileType: "png",
          success: (r) => emit("confirm", r.tempFilePath),
          fail: () => uni.showToast({ title: "裁剪失败", icon: "none" }),
        });
      };
      img.onerror = () => uni.showToast({ title: "裁剪失败", icon: "none" });
      img.src = cropSrc.value;
    });
}

function cancel() {
  emit("cancel");
}

onMounted(() => {
  uni.getImageInfo({
    src: props.src,
    success: (info) => initCropper(props.src, info, props.ratio),
    fail: () => {
      uni.showToast({ title: "读取图片失败", icon: "none" });
      emit("cancel");
    },
  });
});
</script>

<style scoped lang="scss">
.crop-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  box-sizing: border-box;
}

.crop-panel {
  width: 100%;
  max-width: 680rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 32rpx;
  box-sizing: border-box;
}

.crop-head {
  font-size: 30rpx;
  font-weight: 800;
  color: var(--ink);
  text-align: center;
  margin-bottom: 24rpx;
}

.crop-stage {
  position: relative;
  overflow: hidden;
  margin: 0 auto;
  border-radius: 12rpx;
  touch-action: none;
}

.crop-img {
  position: absolute;
}

.crop-box {
  position: absolute;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
  border: 2rpx solid #fff;
  box-sizing: border-box;
  pointer-events: none;
}

.crop-grid {
  width: calc(100% - 24rpx);
  height: calc(100% - 24rpx);
  background-image: linear-gradient(
      90deg,
      transparent 33.33%,
      rgba(255, 255, 255, 0.45) 33.33%,
      rgba(255, 255, 255, 0.45) 34%,
      transparent 34%
    ),
    linear-gradient(
      90deg,
      transparent 66.66%,
      rgba(255, 255, 255, 0.45) 66.66%,
      rgba(255, 255, 255, 0.45) 67.33%,
      transparent 67.33%
    ),
    linear-gradient(
      180deg,
      transparent 33.33%,
      rgba(255, 255, 255, 0.45) 33.33%,
      rgba(255, 255, 255, 0.45) 34%,
      transparent 34%
    ),
    linear-gradient(
      180deg,
      transparent 66.66%,
      rgba(255, 255, 255, 0.45) 66.66%,
      rgba(255, 255, 255, 0.45) 67.33%,
      transparent 67.33%
    );
  background-repeat: no-repeat;
  background-size: 100% 100%;
}

.crop-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.crop-row-label {
  font-size: 26rpx;
  color: var(--ink2);
  flex: 0 0 auto;
  width: 72rpx;
}

/* 裁剪框四角手柄（手势在 stage 层按落点 proximity 识别，此处仅视觉） */
.crop-handle {
  position: absolute;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: #fff;
  border: 3rpx solid var(--g5);
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.25);
}
.crop-handle.tl {
  left: -14rpx;
  top: -14rpx;
}
.crop-handle.tr {
  right: -14rpx;
  top: -14rpx;
}
.crop-handle.bl {
  left: -14rpx;
  bottom: -14rpx;
}
.crop-handle.br {
  right: -14rpx;
  bottom: -14rpx;
}

.crop-prev {
  width: 96px;
  height: 128px;
  border-radius: 8rpx;
  overflow: hidden;
  border: 2rpx solid var(--g2);
  position: relative;
  flex: 0 0 auto;
}

.crop-prev-img {
  position: absolute;
}

.crop-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 8rpx;
}

.crop-btn {
  flex: 1;
  text-align: center;
  padding: 24rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.crop-cancel {
  background: var(--g0);
  color: var(--ink3);
}

.crop-ok {
  background: linear-gradient(135deg, #2ed573, #1eae4f);
  color: #fff;
}

.crop-export-canvas {
  position: fixed;
  left: -9999px;
  top: 0;
  width: 600px;
  height: 800px;
}
</style>
