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
import { getCurrentInstance, onMounted, onUnmounted, watch } from 'vue';
import { cdn } from '@/utils/cdn.js';

// Lottie 动画资源（远程 CDN，失败自动回退本地打包）
const CDN_LOTTIE_URL = cdn('/app_static/lotties/star_piggy_bank.json');

const props = defineProps({
  /** 剩余可花比例 0~1（保留以兼容父组件调用，视觉由 Lottie 呈现） */
  pct: { type: Number, default: 1 },
  isOver: { type: Boolean, default: false },
  /** 剩余可花比例 0~1，用于驱动 Lottie 帧段 */
  leftPct: { type: Number, default: 1 },
  /** 未设满额时启用：硬币逐帧消失并循环（满→空→满…） */
  autoCycle: { type: Boolean, default: false },
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

/* ====== 未设满额：硬币逐帧消失循环 ====== */
let cycleTimer = null;
let cycleHandler = null;
// 上限与"记一笔后"实际帧段保持一致：取满→空（leftPct=0）时 getFrameSegments 计算出的 drops
const CYCLE_TOTAL = getFrameSegments(0).drops;

/**
 * 播放"从第 i-1 个硬币高度下沉到第 i 个硬币高度"的过渡帧（i: 0~CYCLE_TOTAL）
 * 帧段完全复用 getFrameSegments 的逻辑，与正常记一笔后的动画帧数保持一致。
 * i=0 时从满罐(0%)起始过渡段播放，模拟"刚记一笔、罐还满"的状态。
 */
function playCycleSegment(i, onDone) {
  if (!anim) return;
  anim.loop = false;
  anim.setSpeed(0.5);
  // 复用记一笔后的真实帧段（transition 段即从上一高度下沉到当前高度）
  const seg = getFrameSegments(1 - i / CYCLE_TOTAL);
  anim.playSegments(seg.transition, true);
  cycleHandler = () => {
    if (!anim) return;
    anim.removeEventListener('complete', cycleHandler);
    cycleHandler = null;
    onDone && onDone();
  };
  anim.addEventListener('complete', cycleHandler);
}

/** 自动循环：满罐 → 逐帧消失 → 暂停 10-20s → 下一帧 → 空罐后回到第一帧无限循环 */
function startCycle() {
  if (started || !anim) return;
  started = true;
  let i = 0;
  const step = () => {
    if (!anim) return;
    playCycleSegment(i, () => {
      // 每次硬币消失后暂停 10~20s（随机），再推进下一帧
      const wait = 10000 + Math.random() * 10000;
      cycleTimer = setTimeout(() => {
        i += 1;
        if (i > CYCLE_TOTAL) i = 0; // 回到第一帧，无限循环
        step();
      }, wait);
    });
  };
  step();
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

        // 加载 Lottie 资源（仅远程 CDN，本地文件已移除）
        let animationData = null;
        try {
          const req = await new Promise((resolve, reject) => {
            uni.request({
              url: CDN_LOTTIE_URL,
              method: 'GET',
              success: resolve,
              fail: reject,
            });
          });
          animationData = req.data;
        } catch (e) {
          console.error('[SavingsJar] 远程 Lottie 加载失败:', e);
          resolve(false);
          return;
        }
        if (!animationData) {
          console.error('[SavingsJar] 远程 Lottie 返回为空');
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
          if (props.autoCycle) startCycle();
          else startPlayback();
          resolve(true);
        });
        // 兜底：部分版本不触发 DOMLoaded
        setTimeout(() => {
          if (anim && anim.isLoaded) {
            if (props.autoCycle) startCycle();
            else startPlayback();
            resolve(true);
          }
        }, 60);
      });
  });

  return loadPromise;
}

function destroyLottie() {
  if (cycleTimer) {
    clearTimeout(cycleTimer);
    cycleTimer = null;
  }
  if (anim) {
    if (_completeHandler) {
      anim.removeEventListener('complete', _completeHandler);
      _completeHandler = null;
    }
    if (cycleHandler) {
      anim.removeEventListener('complete', cycleHandler);
      cycleHandler = null;
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

// 修复时序 bug：首帧 store 未就绪时 autoCycle 误判为 true 并锁死循环，
// 数据到达后 autoCycle 翻转为 false（有限额）时，重建动画切回正常模式。
watch(
  () => props.autoCycle,
  (val, old) => {
    if (old === true && val === false && anim && anim.isLoaded) {
      destroyLottie();
      initLottie();
    }
  }
);

onUnmounted(() => {
  destroyLottie();
});
</script>

<style scoped>
.savings-jar {
  width: 540rpx;
  filter: drop-shadow(0 36rpx 80rpx rgba(37, 204, 93, 0.2))
    drop-shadow(0 8rpx 20rpx rgba(0, 0, 0, 0.07));
}

.savings-jar.is-over {
  filter: drop-shadow(0 36rpx 80rpx rgba(255, 100, 100, 0.18))
    drop-shadow(0 8rpx 20rpx rgba(0, 0, 0, 0.07));
}

.jar-stage {
  position: relative;
  width: 540rpx;
  height: 473rpx;
}

.lottie-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
