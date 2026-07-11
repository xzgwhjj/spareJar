<template>
  <view class="savings-jar" :class="{ 'is-over': isOver }" data-cmp="SavingsJar">
    <view class="jar-stage">
      <!-- 存钱罐直接由 Lottie 动画呈现 -->
      <canvas type="2d" id="lottieCanvas" class="lottie-canvas" />
    </view>
  </view>
</template>

<script setup>
import { loadAnimation, setup } from 'lottie-miniprogram';
import { getCurrentInstance, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  /** 剩余可花比例 0~1（保留以兼容父组件调用，视觉由 Lottie 呈现） */
  pct: { type: Number, default: 1 },
  isOver: { type: Boolean, default: false },
  /** 剩余可花比例 0~1，用于驱动 Lottie 帧段 */
  leftPct: { type: Number, default: 1 },
});

const STORAGE_KEY = 'sj_drops_level';
const instance = getCurrentInstance();
let anim = null;
let loadPromise = null;
let started = false;
let _completeHandler = null;

/* ====== 帧段计算 ====== */

/**
 * 根据剩余可花比例计算 Lottie 帧段
 * @param {number} lp 剩余可花比例 0~1
 * @returns {{ transition: [number,number], loop: [number,number], drops: number }}
 */
function getFrameSegments(lp) {
  if (lp <= 0) {
    // 0% 特例
    return { transition: [336, 342], loop: [342, 348], drops: 26 };
  }
  const drops = Math.ceil((1 - lp) * 100 / 4);
  if (drops === 0) {
    // 100% 首次进入
    return { transition: [0, 30], loop: [30, 36], drops: 0 };
  }
  const base = 30 + drops * 12;
  return { transition: [base - 6, base], loop: [base, base + 6], drops };
}

/* ====== 播放控制 ====== */

/** 播放过渡 + 循环 */
function playTransitionThenLoop(seg, isFirstVisit) {
  if (!anim) return;
  anim.loop = false;
  anim.setSpeed(0.5);

  const transFrames = isFirstVisit ? [0, 30] : seg.transition;
  anim.playSegments(transFrames, true);

  _completeHandler = () => {
    if (!anim) return;
    anim.removeEventListener('complete', _completeHandler);
    _completeHandler = null;
    anim.loop = true;
    anim.setSpeed(0.1);
    anim.playSegments(seg.loop, true);
  };
  anim.addEventListener('complete', _completeHandler);
}

/** 直接循环 */
function playLoop(seg) {
  if (!anim) return;
  anim.loop = true;
  anim.setSpeed(0.1);
  anim.playSegments(seg.loop, true);
}

/** 启动播放（仅触发一次） */
function startPlayback() {
  if (started || !anim) return;
  started = true;

  const seg = getFrameSegments(props.leftPct ?? 1);
  const lastDrops = uni.getStorageSync(STORAGE_KEY);
  const isFirstVisit = lastDrops === '' || lastDrops === undefined || lastDrops === null;

  if (isFirstVisit) {
    playTransitionThenLoop(seg, true);
  } else if (seg.drops > lastDrops) {
    playTransitionThenLoop(seg, false);
  } else {
    playLoop(seg);
  }

  uni.setStorageSync(STORAGE_KEY, seg.drops);
}

async function initLottie() {
  if (anim || loadPromise) return;

  loadPromise = new Promise((resolve) => {
    const query = uni.createSelectorQuery().in(instance.proxy || instance);
    query
      .select('#lottieCanvas')
      .fields({ node: true, size: true })
      .exec(async (res) => {
        if (!res || !res[0] || !res[0].node) {
          resolve(false);
          return;
        }
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const info = (uni.getWindowInfo && uni.getWindowInfo()) || uni.getSystemInfoSync();
        const dpr = info.pixelRatio || 1;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;

        // ★ 关键：必须先调用 setup 注入小程序 canvas 适配环境
        setup(canvas);

        // 动态加载 Lottie 资源（避免常态打包 754KB）
        let animationData = null;
        try {
          const mod = await import('@/static/lotties/star_piggy_bank.json');
          animationData = mod.default || mod;
        } catch (e) {
          console.error('[SavingsJar] 加载 Lottie 资源失败:', e);
          resolve(false);
          return;
        }

        anim = loadAnimation({
          loop: false,
          autoplay: false,
          animationData,
          rendererSettings: {
            context: ctx,
          },
        });

        anim.addEventListener('DOMLoaded', () => {
          startPlayback();
          resolve(true);
        });
        // 兜底：部分版本不触发 DOMLoaded
        setTimeout(() => {
          if (anim && anim.isLoaded) {
            startPlayback();
            resolve(true);
          }
        }, 60);
      });
  });

  return loadPromise;
}

function destroyLottie() {
  if (anim) {
    if (_completeHandler) {
      anim.removeEventListener('complete', _completeHandler);
      _completeHandler = null;
    }
    anim.destroy();
    anim = null;
  }
  loadPromise = null;
  started = false;
}

onMounted(() => {
  initLottie();
});

onUnmounted(() => {
  destroyLottie();
});
</script>

<style scoped>
.savings-jar {
  width: 480rpx;
  filter: drop-shadow(0 36rpx 80rpx rgba(37, 204, 93, 0.2))
    drop-shadow(0 8rpx 20rpx rgba(0, 0, 0, 0.07));
}

.savings-jar.is-over {
  filter: drop-shadow(0 36rpx 80rpx rgba(255, 100, 100, 0.18))
    drop-shadow(0 8rpx 20rpx rgba(0, 0, 0, 0.07));
}

.jar-stage {
  position: relative;
  width: 480rpx;
  height: 420rpx;
}

.lottie-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
