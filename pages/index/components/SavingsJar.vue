<template>
  <svg
    width="220"
    height="280"
    viewBox="0 0 220 280"
    :style="{ overflow: 'visible', filter: `drop-shadow(0 18px 40px ${shadowC}) drop-shadow(0 4px 10px rgba(0,0,0,0.07))` }"
  >
    <defs>
      <linearGradient :id="P+'bodyGrad'" x1="15%" y1="0%" x2="90%" y2="100%">
        <stop offset="0%" :stop-color="glassBodyFill" />
        <stop offset="50%" :stop-color="isOver ? 'rgba(255,236,236,0.76)' : 'rgba(236,252,242,0.76)'" />
        <stop offset="100%" :stop-color="glassBotFill" />
      </linearGradient>
      <linearGradient :id="P+'lidGrad'" x1="12%" y1="0%" x2="88%" y2="100%">
        <stop offset="0%" :stop-color="isOver ? 'rgba(255,252,252,0.92)' : 'rgba(248,255,250,0.92)'" />
        <stop offset="100%" :stop-color="isOver ? 'rgba(255,230,230,0.70)' : 'rgba(220,248,228,0.70)'" />
      </linearGradient>
      <linearGradient :id="P+'innerBg'" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" :stop-color="isOver ? 'rgba(255,215,215,0.10)' : 'rgba(190,242,210,0.10)'" />
        <stop offset="100%" :stop-color="isOver ? 'rgba(220,150,150,0.06)' : 'rgba(80,218,120,0.06)'" />
      </linearGradient>
      <radialGradient :id="P+'bodySheen'" cx="22%" cy="18%" r="46%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.90)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0)" />
      </radialGradient>
      <radialGradient :id="P+'lidSheen'" cx="24%" cy="22%" r="54%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.95)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0)" />
      </radialGradient>
      <clipPath :id="P+'outerClip'">
        <rect :x="JAR_X" :y="JAR_TOP" :width="JAR_W" :height="JAR_H" :rx="JAR_RX" :ry="JAR_RX" />
      </clipPath>
      <clipPath :id="P+'bodyClip'">
        <rect :x="INNER_X" :y="SEAM_Y+4" :width="INNER_W" :height="PILE_BOT-SEAM_Y" :rx="INNER_RX" :ry="INNER_RX" />
      </clipPath>
    </defs>

    <!-- 罐底阴影 -->
    <ellipse :cx="JAR_CX-4" :cy="JAR_BOT+10" rx="46" ry="6" :fill="isOver ? 'rgba(255,100,100,0.10)' : 'rgba(37,204,93,0.10)'" style="filter:blur(6px)" />

    <!-- 内层背景 -->
    <rect :x="JAR_X" :y="JAR_TOP" :width="JAR_W" :height="JAR_H" :rx="JAR_RX" :ry="JAR_RX" :fill="`url(#${P}innerBg)`" />

    <!-- 硬币堆 -->
    <g :clip-path="`url(#${P}bodyClip)`" class="stack-shrink">
      <template v-for="(c, i) in coinRenderData" :key="i">
        <g :class="c.vanishClass" :style="{ transformOrigin: `${c.cx}px ${c.cy}px` }">
          <circle :cx="c.cx" :cy="c.cy" :r="c.r" :fill="c.cc.fill" :stroke="c.cc.stroke" stroke-width="0.8" :opacity="c.opc" />
          <circle :cx="c.cx" :cy="c.cy" :r="c.r*0.38" fill="rgba(255,255,255,0.45)" :opacity="c.opc*0.80" />
          <circle :cx="c.cx-c.r*0.36" :cy="c.cy-c.r*0.34" :r="c.r*0.22" fill="rgba(255,255,255,0.82)" :opacity="c.opc*0.90" />
        </g>
      </template>
    </g>

    <!-- 罐体玻璃 -->
    <rect :x="JAR_X" :y="JAR_TOP" :width="JAR_W" :height="JAR_H" :rx="JAR_RX" :ry="JAR_RX" :fill="`url(#${P}bodyGrad)`" :stroke="rimCol" stroke-width="1.2" />

    <!-- 接缝 -->
    <path :d="`M ${JAR_X+JAR_RX},${SEAM_Y+2} Q ${JAR_CX},${SEAM_Y+5} ${JAR_X+JAR_W-JAR_RX},${SEAM_Y+2}`" fill="none" :stroke="isOver ? 'rgba(200,100,100,0.14)' : 'rgba(60,160,100,0.14)'" stroke-width="3" />
    <path :d="`M ${JAR_X+JAR_RX-2},${SEAM_Y} Q ${JAR_CX},${SEAM_Y-6} ${JAR_X+JAR_W-JAR_RX+2},${SEAM_Y}`" fill="none" :stroke="isOver ? 'rgba(255,140,140,0.50)' : 'rgba(80,200,120,0.50)'" stroke-width="1.2" stroke-linecap="round" />

    <!-- 投币口 -->
    <rect :x="JAR_CX-18" :y="SEAM_Y-28" width="36" height="8" rx="4" fill="rgba(0,0,0,0.15)" />
    <rect :x="JAR_CX-17" :y="SEAM_Y-27.5" width="34" height="6.5" rx="3.25" fill="rgba(20,20,20,0.42)" />
    <rect :x="JAR_CX-12" :y="SEAM_Y-26.5" width="22" height="2" rx="1" fill="rgba(255,255,255,0.28)" />

    <!-- 光泽效果 -->
    <g :clip-path="`url(#${P}outerClip)`">
      <rect :x="JAR_X+8" :y="JAR_TOP+18" width="7" :height="JAR_H-50" rx="3.5" fill="rgba(255,255,255,0.66)" class="jar-sheen" />
      <rect :x="JAR_X+20" :y="JAR_TOP+32" width="3.5" :height="JAR_H-82" rx="1.75" fill="rgba(255,255,255,0.32)" class="jar-sheen" />
      <rect :x="JAR_X+JAR_W-16" :y="JAR_TOP+40" width="2.6" :height="JAR_H-90" rx="1.3" fill="rgba(255,255,255,0.22)" class="jar-sheen body-halo" />

      <rect :x="JAR_X" :y="JAR_TOP" :width="JAR_W" :height="JAR_H" :rx="JAR_RX" :ry="JAR_RX" :fill="`url(#${P}bodySheen)`" />
      <rect :x="JAR_X+22" :y="JAR_TOP+7" :width="JAR_W-54" height="2.5" rx="1.25" fill="rgba(255,255,255,0.55)" class="lid-gleam" />
      <rect :x="JAR_X" :y="JAR_TOP" :width="JAR_W" :height="SEAM_Y-JAR_TOP" :rx="JAR_RX" :ry="JAR_RX" :fill="`url(#${P}lidSheen)`" opacity="0.5" />
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  pct: { type: Number, default: 0.595 },
  isOver: { type: Boolean, default: false },
});

const P = computed(() => (props.isOver ? 'jr' : 'jg'));
const JAR_X = 30;
const JAR_W = 160;
const JAR_RX = 46;
const JAR_TOP = 24;
const JAR_BOT = 262;
const JAR_H = JAR_BOT - JAR_TOP;
const JAR_CX = JAR_X + JAR_W / 2;
const SEAM_Y = 94;
const INNER_X = JAR_X + 7;
const INNER_W = JAR_W - 14;
const INNER_RX = JAR_RX - 6;
const PILE_BOT = JAR_BOT - 12;
const PILE_SPAN = PILE_BOT - SEAM_Y - 10;
const PILE_H = computed(() => PILE_SPAN * Math.min(props.pct, 1));

const COIN_COLORS = [
  { fill: '#A8E6C8', stroke: '#6DC89A' },
  { fill: '#FFB8C6', stroke: '#E87E96' },
  { fill: '#C4B4E8', stroke: '#9A7CCE' },
  { fill: '#FFD98A', stroke: '#E8B040' },
  { fill: '#9ED4F0', stroke: '#5AABDC' },
  { fill: '#B8E89A', stroke: '#7CC870' },
];

const BASE_R = 8.2;

const coinSources = [
  [-0.36, 0.03, 1.06, -10], [0.28, 0.05, 0.92, 16], [-0.08, 0.07, 1.12, 4], [0.14, 0.11, 0.88, -20],
  [-0.3, 0.15, 1.0, 24], [0.38, 0.13, 1.04, -5], [-0.04, 0.19, 0.96, 12], [0.24, 0.23, 1.02, -26],
  [-0.32, 0.25, 0.9, 7], [0.34, 0.29, 1.0, -14], [-0.18, 0.31, 1.08, 18], [0.08, 0.35, 0.86, -30],
  [-0.38, 0.37, 1.02, 4], [0.26, 0.41, 0.94, 28], [-0.1, 0.43, 1.04, -9], [0.4, 0.45, 0.88, 15],
  [-0.22, 0.49, 0.98, -22], [0.18, 0.53, 1.03, 6], [-0.36, 0.57, 0.92, -14], [0.04, 0.59, 1.0, 11],
];

const coinRenderData = computed(() =>
  coinSources.map(([xRatio, yRatio, scale], i) => {
    const cx = JAR_CX + xRatio * (INNER_W * 0.46);
    const cy = PILE_BOT - yRatio * PILE_H.value;
    const r = BASE_R * scale;
    const opc = 0.7 + yRatio * 0.3;
    let vanishClass = '';
    if (i === 19) vanishClass = 'coin-vanish-a';
    else if (i === 18) vanishClass = 'coin-vanish-b';
    else if (i === 17) vanishClass = 'coin-vanish-c';
    const cc = COIN_COLORS[i % 6];
    return { cx, cy, r, opc, vanishClass, cc };
  })
);

const rimCol = computed(() =>
  props.isOver ? 'rgba(255,160,160,0.55)' : 'rgba(100,210,140,0.55)'
);
const shadowC = computed(() =>
  props.isOver ? 'rgba(255,100,100,0.22)' : 'rgba(37,204,93,0.20)'
);
const glassBodyFill = computed(() =>
  props.isOver ? 'rgba(255,246,246,0.84)' : 'rgba(250,255,252,0.84)'
);
const glassBotFill = computed(() =>
  props.isOver ? 'rgba(255,228,228,0.60)' : 'rgba(225,248,232,0.60)'
);
</script>
