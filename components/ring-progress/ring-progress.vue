<template>
  <view class="ring-progress" :style="{ width: size + 'px', height: size + 'px' }">
    <!-- 底层：Canvas 羽化描边弧（渐变 + 圆角端点 + 呼吸：透明↔不透明、粗↔更粗） -->
    <canvas
      type="2d"
      id="ringProgressCanvas"
      canvas-id="ringProgressCanvas"
      :style="{ width: size + 'px', height: size + 'px' }"
    />
    <!-- 中层：真毛玻璃罩（backdrop-filter 模糊），整块盖在环形上方，环从磨砂下透出 -->
    <view class="ring-glass" :style="{ width: size + 'px', height: size + 'px' }" />
    <!-- 顶层：文字 -->
    <view class="ring-center">
      <slot />
    </view>
  </view>
</template>

<script setup>
import { computed, watch, getCurrentInstance, nextTick } from 'vue'
import { onReady } from '@dcloudio/uni-app'

const props = defineProps({
  pct: { type: Number, default: 0 },
  size: { type: Number, default: 100 },
  strokeW: { type: Number, default: 8 },
  colorFrom: { type: String, default: '#8ae99b' },
  colorTo: { type: String, default: '#25cc5d' },
  trackColor: { type: String, default: 'rgba(15,28,20,0.07)' },
  glow: { type: Boolean, default: true },
})

const instance = getCurrentInstance()
let canvasCtx = null
let dpr = 2
let drawnPct = 0          // 进度过渡当前值
let phase = 0             // 呼吸相位（0~1 循环）

// 呼吸：透明度 0.55↔1，线宽 sw↔sw*1.18（easeInOut）
function breath() {
  const t = (Math.sin(phase * Math.PI * 2) + 1) / 2  // 0~1 平滑
  const opacity = 0.55 + t * 0.45
  const lineScale = 1 + t * 0.18
  return { opacity, lineScale }
}

function drawFrame() {
  if (!canvasCtx) return
  const { size, strokeW, colorFrom, colorTo, trackColor, glow } = props
  const p = Math.min(drawnPct, 1)
  const cx = size / 2
  const cy = size / 2
  const { opacity, lineScale } = breath()
  const sw = strokeW * lineScale
  const r = (size - sw * 2) / 2
  const start = -Math.PI / 2
  const end = start + Math.PI * 2 * p

  canvasCtx.clearRect(0, 0, size, size)

  // 轨道环：淡色整圈（保持细、稳定）
  canvasCtx.beginPath()
  canvasCtx.arc(cx, cy, (size - strokeW * 2) / 2, 0, Math.PI * 2)
  canvasCtx.lineWidth = strokeW
  canvasCtx.strokeStyle = trackColor
  canvasCtx.lineCap = 'round'
  canvasCtx.globalAlpha = 0.9
  canvasCtx.stroke()
  canvasCtx.globalAlpha = 1

  // 进度弧：渐变 + 圆角端点 + 重羽化 + 呼吸（透明度 + 粗细脉动）
  if (p > 0) {
    const grad = canvasCtx.createLinearGradient(0, 0, size, size)
    grad.addColorStop(0, colorFrom)
    grad.addColorStop(1, colorTo)
    canvasCtx.save()
    if (glow) {
      canvasCtx.shadowBlur = sw * 2.2
      canvasCtx.shadowColor = colorTo
    }
    canvasCtx.globalAlpha = opacity
    canvasCtx.beginPath()
    canvasCtx.arc(cx, cy, r, start, end)
    canvasCtx.lineWidth = sw
    canvasCtx.strokeStyle = grad
    canvasCtx.lineCap = 'round'
    canvasCtx.stroke()
    canvasCtx.restore()
    canvasCtx.globalAlpha = 1
  }
}

let rafTimer = null
// 呼吸主循环：2.4s 一周期
function loop() {
  phase += 1 / (2.4 * 60)
  if (phase > 1) phase -= 1
  drawFrame()
  rafTimer = setTimeout(loop, 1000 / 60)
}

// 进度过渡：1.2s easeOutCubic
let animTimer = null
function animateTo(target) {
  if (animTimer) { clearInterval(animTimer); animTimer = null }
  const from = drawnPct
  const to = Math.min(Math.max(target, 0), 1)
  if (from === to) { drawnPct = to; drawFrame(); return }
  const steps = Math.round(1.2 * 60)
  let i = 0
  animTimer = setInterval(() => {
    i++
    const t = Math.min(i / steps, 1)
    const ease = 1 - Math.pow(1 - t, 3)
    drawnPct = from + (to - from) * ease
    if (t >= 1) { clearInterval(animTimer); animTimer = null }
  }, 1000 / 60)
}

function initCanvas() {
  try {
    const query = uni.createSelectorQuery().in(instance ? instance.proxy : undefined)
    query
      .select('#ringProgressCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const item = res && res[0]
        if (!item || !item.node) return
        const canvas = item.node
        dpr = (uni.getSystemInfoSync && uni.getSystemInfoSync().pixelRatio) || 2
        canvas.width = props.size * dpr
        canvas.height = props.size * dpr
        canvasCtx = canvas.getContext('2d')
        canvasCtx.scale(dpr, dpr)
        drawnPct = 0
        animateTo(props.pct)
        if (rafTimer) clearTimeout(rafTimer)
        loop()
      })
  } catch (e) {
    console.error('[RingProgress] init failed', e)
  }
}

onReady(() => {
  nextTick(() => initCanvas())
})
watch(() => props.pct, (v) => animateTo(v))
</script>

<style scoped>
.ring-progress {
  position: relative;
  flex-shrink: 0;
}
.ring-progress canvas {
  position: absolute;
  left: 0;
  top: 0;
}
/* 真毛玻璃罩：backdrop-filter 模糊 + 半透明白，整块盖在环上，环从磨砂下透出 */
.ring-glass {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 50%;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(6px) saturate(1.3);
  -webkit-backdrop-filter: blur(6px) saturate(1.3);
  border: 1px solid rgba(255, 255, 255, 0.35);
}
.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
</style>
