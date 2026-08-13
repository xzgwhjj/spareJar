<template>
  <view class="wish-card-in" :style="cardStyle">
    <!-- 底部错位渐变衬底（叠在卡片下方，使用接口 gradient 色） -->
    <view
      class="ticket-inner-bg"
      :style="{ background: gradient }"
      @click="emit('click')"
    />
    <!-- 卡片本体 -->
    <view class="wish-item-card" @click="emit('click')">
      <!-- 第一层：图片 -->
      <view class="wish-cover">
        <view v-if="isLogo" class="wish-cover-logo-wrap">
          <image class="wish-cover-logo" :src="logoUrl" mode="aspectFit" />
        </view>
        <view v-else-if="isSysLogo" class="wish-cover-sys" :style="{ background: sysBg }">
          <text class="wish-cover-sys-text">{{ sysLabel }}</text>
        </view>
        <text v-else class="wish-cover-emoji">{{ emoji }}</text>
      </view>

      <!-- 第二层：姓名 -->
      <text class="wish-card-name">{{ wish.name }}</text>

      <!-- 第三层：日期 -->
      <view v-if="deadlineText" class="wish-card-deadline">
        <text>{{ deadlineText }}</text>
      </view>

      <!-- 第四层：进度条（点击触发毛玻璃覆盖层） -->
      <view
        class="wish-progress wish-progress--bar"
        :style="{ background: progressTrackBg }"
        @click.stop="toggleRingOverlay"
      >
        <view
          class="wish-progress-fill"
          :style="{ width: Math.min(pct, 100) + '%', background: progressFillBg }"
        >
          <view class="progress-shimmer" />
        </view>
      </view>
      <!-- 待：出个已过期徽章/各种历史状态的徽章样式 -->
      <!-- 底部：金额 + 状态徽章 -->
      <view class="wish-card-foot">
        <view class="wish-amount-block">
          <text class="wish-amount-saved" :style="{ color: amountTextColor }"
            >¥{{ savedText }}</text
          >
          <text class="wish-amount-target">/ ¥{{ targetText }}</text>
        </view>
        <!-- 右下角状态按钮（示例 card__arrow 风格：#7257fa 方块，hover 变 #111） -->
        <view
          class="wish-badges"
          :style="{ background: coverBaseColor }"
          @click.stop="emit('click')"
        >
          <text v-if="isNotStarted" class="wish-badge badge-wait">未开始⏳</text>
          <text v-else-if="isDone" class="wish-badge badge-done">已达成✨</text>
          <text v-else-if="isNearDone" class="wish-badge badge-near">快到了🎯</text>
          <text v-else class="wish-badge badge-left">还差 ¥{{ remainText }}</text>
        </view>
      </view>

      <!-- 毛玻璃覆盖层：从底部升起，中央展示大号环形进度 -->
      <view
        v-if="overlayMounted"
        class="ring-overlay"
        :class="{ 'ring-overlay--show': showRingOverlay }"
        @click.stop="toggleRingOverlay"
      >
        <view class="ring-overlay-glass" :style="{ background: ringOverlayBg }">
          <view
            class="wish-ring wish-ring--big"
            :style="{ width: ringBigSize + 'px', height: ringBigSize + 'px' }"
          >
            <canvas
              type="2d"
              class="wish-ring-canvas"
              :id="bigCanvasId"
              :style="{ width: '100%', height: '100%' }"
            />
            <text
              class="wish-ring-label"
              :style="{ color: ringLabelColor, fontSize: '40rpx' }"
              >{{ isDone ? "100%" : pct + "%" }}</text
            >
          </view>
          <text class="ring-overlay-tip">点击进度条关闭</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch, onMounted, nextTick } from "vue";
import { formatFen } from "@/utils/money.js";
import { getCloudTempUrl } from "@/utils/cdn.js";
import { getCurrentInstance } from "vue";

const props = defineProps({
  wish: { type: Object, required: true },
  index: { type: Number, default: 0 },
  logoUrl: { type: String, default: "" },
});
const emit = defineEmits(["click"]);
const instance = getCurrentInstance();

// ===== 进度 =====
const targetAmount = computed(() => Number(props.wish.target_amount) || 0);
const savedAmount = computed(() => Number(props.wish.saved_amount) || 0);
const pct = computed(() => {
  if (targetAmount.value <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, Math.round((savedAmount.value / targetAmount.value) * 100))
  );
});
const isDone = computed(() => pct.value >= 100);
const isNearDone = computed(() => pct.value >= 80 && pct.value < 100);
// ===== 封面 / 头像 =====
// 无 cover_gradient 时的统一兜底色（不再按 index 猜测，避免错位）
const FALLBACK_GRADIENT = "linear-gradient(135deg,#ebfded 0%,#c6fbce 60%,#8ae99b 100%)";
// 颜色独立字段 cover_gradient；无则用兜底色
function resolveGradient(arg) {
  if (arg && typeof arg === "object") {
    return arg.cover_gradient || FALLBACK_GRADIENT;
  }
  return FALLBACK_GRADIENT;
}
const gradient = computed(() => resolveGradient(props.wish));
// 按钮底色：接口返回基色加深一档（保持色相，降低亮度），避免用完整渐变太花
const coverBaseColor = computed(() => {
  const [, , tail] = extractGradientColors(gradient.value);
  const baseHex = tail || "#8ae99b";
  const [, , deep] = buildThreeTone(baseHex);
  return deep;
});
// 按钮文字色：基于实际按钮底色（已加深）判断亮度，淡则用 ink2，否则白色
const badgeTextColor = computed(() => {
  const { r, g, b } = hexToRgb(coverBaseColor.value);
  const { l } = rgbToHsl(r, g, b);
  return l > 62 ? "var(--ink2)" : "#fff";
});
// 金额文字色：沿用原绿 --g5(#25cc5d) 的明度/饱和度，仅取接口色的色相，保持同色阶协调
const amountTextColor = computed(() => {
  const base = hexToRgb("#25cc5d");
  const { s, l } = rgbToHsl(base.r, base.g, base.b);
  const theme = hexToRgb(coverBaseColor.value);
  const { h } = rgbToHsl(theme.r, theme.g, theme.b);
  return hslToHex(h, s, l);
});

// 从 cover_gradient（如 linear-gradient(135deg,#ebfded 0%,#c6fbce 60%,#8ae99b 100%)）
// 提取色标，并自动派生与原始色视觉一致的进度条配色：
//  - 进度填充：基于原始基色生成「浅/中/深」三段等色阶渐变（对应 linear-gradient(90deg,#acf5b7 0%,#8ae99b 50%,#25cc5d 100%) 风格）
//  - 轨道底色：取原始基色的半透明版，保证整体同色系
function extractGradientColors(str) {
  const m = String(str).match(/#([0-9a-fA-F]{3,8})/g) || [];
  const colors = m.map((c) => c);
  if (colors.length === 0) return ["#acf5b7", "#8ae99b", "#25cc5d"];
  if (colors.length === 1) return [colors[0], colors[0], colors[0]];
  // 取首尾两端色作为浅/深基准，中间用尾色（最常见的 3 段来源）
  return [colors[0], colors[colors.length - 1], colors[colors.length - 1]];
}
// ===== 颜色工具：hex ⇄ rgb ⇄ hsl =====
function hexToRgb(hex) {
  let h = String(hex).replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (h.length === 6) h += "ff";
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
function rgbToHex(r, g, b) {
  const to = (v) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
// 基于基色，按 HSL 亮度推导「浅一档 / 基准 / 深一档」三色（保持色相与饱和度，仅调亮度）
function buildThreeTone(baseHex) {
  const { r, g, b } = hexToRgb(baseHex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const light = hslToHex(h, Math.max(0, s - 6), Math.min(100, l + 14)); // 浅
  const base = hslToHex(h, s, l); // 基准
  const deep = hslToHex(h, Math.min(100, s + 4), Math.max(0, l - 16)); // 深
  return [light, base, deep];
}
// 进度填充渐变（原基色派生的 3 段等色阶，对应 linear-gradient(90deg,#acf5b7 0%,#8ae99b 50%,#25cc5d 100%) 风格）
const progressFillBg = computed(() => {
  const [head, , tail] = extractGradientColors(gradient.value);
  // 用尾色（基色）派生浅/中/深三段，保证与目标色阶一致
  const baseHex = tail || head || "#8ae99b";
  const [light, base, deep] = buildThreeTone(baseHex);
  return `linear-gradient(90deg, ${light} 0%, ${base} 50%, ${deep} 100%)`;
});
// 轨道底色（原始基色半透明，保持同色系视觉一致）
const progressTrackBg = computed(() => {
  const [, , tail] = extractGradientColors(gradient.value);
  const baseHex = tail || "#8ae99b";
  return hexToRgbaFromRgb(hexToRgb(baseHex), 0.32);
});
function hexToRgbaFromRgb(rgb, alpha) {
  const { r, g, b } = rgb;
  return `rgba(${r},${g},${b},${alpha})`;
}

// cover_image_url 现在为纯图片字段：logo=cloud://fileID，系统图标=sys::idx，空=无图
const rawCover = computed(() => props.wish.cover_image_url || "");
const isLogo = computed(() => rawCover.value.startsWith("cloud://"));
const isSysLogo = computed(() => rawCover.value.startsWith("sys::"));
// 组件自己解析 cloud:// → 临时访问链（优先用父组件已解析好的 logoUrl）
const resolvedLogoUrl = ref("");
async function resolveLogoUrl() {
  if (props.logoUrl) {
    resolvedLogoUrl.value = props.logoUrl;
    return;
  }
  if (isLogo.value) {
    resolvedLogoUrl.value = await getCloudTempUrl(rawCover.value);
  } else {
    resolvedLogoUrl.value = "";
  }
}
const logoUrl = computed(() => resolvedLogoUrl.value);
watch(() => [props.logoUrl, rawCover.value], resolveLogoUrl, { immediate: true });
onMounted(resolveLogoUrl);
const sysIdx = computed(() => {
  const parts = rawCover.value.split("::");
  return parts[0] === "sys" ? Number(parts[1]) || 0 : 0;
});
const SYS_PRESETS = ["绿", "蓝", "紫", "橙", "红"];
const sysLabel = computed(() => SYS_PRESETS[sysIdx.value] || "标");
const sysBg = computed(
  () =>
    [
      "linear-gradient(135deg,#25cc5d,#0e923f)",
      "linear-gradient(135deg,#2f6fd6,#1b3fa0)",
      "linear-gradient(135deg,#7c3aed,#5b21b6)",
      "linear-gradient(135deg,#fb923c,#ea580c)",
      "linear-gradient(135deg,#ef4444,#b91c1c)",
    ][sysIdx.value] || "linear-gradient(135deg,#25cc5d,#0e923f)"
);
const emoji = computed(() => {
  if (rawCover.value) return ""; // 有图则不显示 emoji
  return props.wish.name ? props.wish.name.trim().charAt(0) || "⭐" : "⭐";
});

// 截止文案
const deadlineText = computed(() => {
  const w = props.wish;
  // 只显示年月日，去掉时分秒
  const startDate = (w.start_date || "").slice(0, 10);
  const endDate = (w.end_date || "").slice(0, 10);
  if (startDate && endDate) {
    return startDate + " ~ " + endDate;
  }
  const deadline = (w.deadline || "").slice(0, 10);
  return deadline ? "截止 " + deadline : "";
});

// 未开始：设定了开始时间且当前还没到（用于区分「还没启动」与「进行中-还差¥」）
const isNotStarted = computed(() => {
  const w = props.wish;
  if (!w.start_date) return false;
  const now = new Date();
  const startStr = w.start_time
    ? `${w.start_date} ${w.start_time}`
    : `${w.start_date} 00:00:00`;
  const start = new Date(String(startStr).replace(/-/g, "/").replace(" ", " "));
  return start.getTime() > now.getTime();
});

// ===== 金额（分 → 元，千分位） =====
const savedText = computed(() => formatFen(savedAmount.value).replace(/\.00$/, ""));
const targetText = computed(() => formatFen(targetAmount.value).replace(/\.00$/, ""));
const remainText = computed(() => {
  const over = savedAmount.value - targetAmount.value;
  if (over > 0) return "超存 ¥" + formatFen(over).replace(/\.00$/, "");
  return (
    "还差 ¥" +
    formatFen(Math.max(targetAmount.value - savedAmount.value, 0)).replace(/\.00$/, "")
  );
});

// ===== 交错偏移 / 旋转 =====
const offsetY = computed(() => (props.index % 2 === 1 ? -12 : 0));
const rotate = computed(() => {
  const m = props.index % 3;
  if (m === 2) return -1.5;
  if (m === 1) return 0.8;
  return 0;
});

// ===== 环形进度（canvas 2D） =====
// 注意：canvas 尺寸必须用 px（uni.createSelectorQuery 拿到的节点尺寸是 px），
// 这里 ringSize 同时用于外层 view 的 rpx 显示尺寸与 canvas 的 px 绘制尺寸，
// 小程序下 rpx→px 由框架处理，canvas 内部坐标按 ringSize(px) 计算即可。
const ringSize = 56; // 环形外径（rpx 显示 / px 绘制，数值一致）
const ringSw = 7; // 环宽（px，canvas 坐标系）
// 环形轨道底色：与卡片进度条底色一致（封面基色淡色系），0% 时仍可见
const ringTrack = computed(() => {
  const [, , tail] = extractGradientColors(gradient.value);
  const baseHex = tail || "#8ae99b";
  return hexToRgbaFromRgb(hexToRgb(baseHex), 0.32);
});
// 环形进度描边色：取封面基色派生的三段同色系（浅→中→深），替代原固定绿色
const ringGrad = computed(() => {
  const [, , tail] = extractGradientColors(gradient.value);
  const baseHex = tail || "#8ae99b";
  const [light, base, deep] = buildThreeTone(baseHex);
  return { light, base, deep };
});
// 中心文字色：与封面同色系（达成用深档，进度中按深浅档切换，不再固定绿）
const ringLabelColor = computed(() => {
  const { deep, base } = ringGrad.value;
  if (isDone.value) return deep;
  return pct.value >= 50 ? base : deep;
});
// 每条卡片独立 canvas id（type=2d 用 id 选择节点）
const canvasId = `wish-ring-${props.index}-${props.wish._id || "x"}`;

let canvasCtx = null;
let canvasReady = false;

function drawRing() {
  if (!canvasReady || !canvasCtx) return;
  const ctx = canvasCtx;
  const size = ringSize; // px
  const sw = ringSw;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - sw) / 2;
  const start = -Math.PI / 2; // 从正上方开始
  const end = start + (Math.PI * 2 * Math.min(pct.value, 100)) / 100;

  ctx.clearRect(0, 0, size, size);

  // 轨道
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = sw;
  ctx.strokeStyle = ringTrack.value;
  ctx.lineCap = "round";
  ctx.stroke();

  // 进度（线性渐变描边 + 圆角端点，同封面色系）
  if (pct.value > 0) {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    const { light, deep } = ringGrad.value;
    grad.addColorStop(0, light);
    grad.addColorStop(1, deep);
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.lineWidth = sw;
    ctx.strokeStyle = grad;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

// 初始化 canvas 节点（小程序需异步 query；H5 可直接 getContext）
async function initCanvas() {
  try {
    // #ifdef H5
    const el = document.getElementById(canvasId);
    if (el) {
      // H5 下需显式设置位图尺寸，否则默认 300x150 导致绘制偏移/不居中
      el.width = ringSize;
      el.height = ringSize;
      canvasCtx = el.getContext("2d");
      canvasReady = true;
      drawRing();
      return;
    }
    // #endif
    const query = uni.createSelectorQuery().in(instance ? instance.proxy : undefined);
    query
      .select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        const item = res && res[0];
        if (!item || !item.node) return;
        const canvas = item.node;
        const dpr = uni.getSystemInfoSync().pixelRatio || 2;
        canvas.width = ringSize * dpr;
        canvas.height = ringSize * dpr;
        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);
        canvasCtx = ctx;
        canvasReady = true;
        drawRing();
      });
  } catch (e) {
    console.warn("[wish-ring] canvas 初始化失败", e);
  }
}

onMounted(() => {
  initCanvas();
});

// pct 变化重绘；同时监听 wish 数据变化（如列表刷新后 pct 可能变）
watch(
  () => pct.value,
  () => {
    drawRing();
    if (overlayMounted.value) drawBigRing();
  }
);

// ===== 毛玻璃覆盖层（点击进度条升起，再次点击平滑退出） =====
const overlayMounted = ref(false); // 是否渲染（退场动画结束后才卸载）
const showRingOverlay = ref(false); // 显隐动画开关
const ringBigSize = 128; // 覆盖层内大环外径（px），缩小并留出四周空隙
const bigCanvasId = `wish-ring-big-${props.index}-${props.wish._id || "x"}`;

let bigCtx = null;
let bigReady = false;

function drawBigRing() {
  if (!bigReady || !bigCtx) return;
  const ctx = bigCtx;
  const size = ringBigSize;
  const sw = 14;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - sw) / 2;
  const start = -Math.PI / 2;
  const end = start + (Math.PI * 2 * Math.min(pct.value, 100)) / 100;
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = sw;
  ctx.strokeStyle = ringTrack.value;
  ctx.lineCap = "round";
  ctx.stroke();
  if (pct.value > 0) {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    const { light, deep } = ringGrad.value;
    grad.addColorStop(0, light);
    grad.addColorStop(1, deep);
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.lineWidth = sw;
    ctx.strokeStyle = grad;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

async function initBigCanvas() {
  try {
    // #ifdef H5
    const el = document.getElementById(bigCanvasId);
    if (el) {
      // H5 下需显式设置位图尺寸，否则默认 300x150 导致绘制偏移/不居中
      el.width = ringBigSize;
      el.height = ringBigSize;
      bigCtx = el.getContext("2d");
      bigReady = true;
      drawBigRing();
      return;
    }
    // #endif
    const query = uni.createSelectorQuery().in(instance ? instance.proxy : undefined);
    query
      .select(`#${bigCanvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        const item = res && res[0];
        if (!item || !item.node) return;
        const canvas = item.node;
        const dpr = uni.getSystemInfoSync().pixelRatio || 2;
        canvas.width = ringBigSize * dpr;
        canvas.height = ringBigSize * dpr;
        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);
        bigCtx = ctx;
        bigReady = true;
        drawBigRing();
      });
  } catch (e) {
    console.warn("[wish-ring] big canvas 初始化失败", e);
  }
}

// 覆盖层背景（纯白毛玻璃，不随封面色变化）
const ringOverlayBg = "rgba(255, 255, 255, 0.82)";

function toggleRingOverlay() {
  if (!showRingOverlay.value) {
    overlayMounted.value = true;
    // 下一帧再开启动画，确保元素已挂载
    nextTick(() => {
      showRingOverlay.value = true;
      initBigCanvas();
    });
  } else {
    showRingOverlay.value = false;
    // 退场动画结束后卸载
    setTimeout(() => {
      overlayMounted.value = false;
    }, 320);
  }
}

// ===== 卡片样式 =====
// rotate 通过 CSS 变量传入，避免与浮动动画的 transform 冲突
const cardStyle = computed(() => ({
  marginTop: offsetY.value + "rpx",
  "--wish-rotate": `${rotate.value}deg`,
  "--cover-base": coverBaseColor.value,
  "--badge-text": badgeTextColor.value,
  animationDelay: `${props.index * 0.06}s, ${props.index * 0.5}s`,
}));
</script>

<style scoped lang="scss">
.wish-card-in {
  position: relative;
  transform: rotate(var(--wish-rotate, 0deg));
  animation: wishCardIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both,
    wishFloat 4s ease-in-out 0.5s infinite;
}

@keyframes wishCardIn {
  0% {
    opacity: 0;
    transform: rotate(var(--wish-rotate, 0deg)) translateY(20px) scale(0.96);
  }

  100% {
    opacity: 1;
    transform: rotate(var(--wish-rotate, 0deg)) translateY(0) scale(1);
  }
}

// 入场后持续轻微上下浮动 + 阴影呼吸（错峰由 animationDelay 第二项控制）
@keyframes wishFloat {
  0%,
  100% {
    transform: rotate(var(--wish-rotate, 0deg)) translateY(0);
  }

  50% {
    transform: rotate(var(--wish-rotate, 0deg)) translateY(-6rpx);
  }
}

.wish-item-card {
  position: relative;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 48rpx;
  padding: 32rpx 32rpx 48rpx;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(48rpx) saturate(1.8);
  -webkit-backdrop-filter: blur(48rpx) saturate(1.8);
  // box-shadow: 0 16rpx 56rpx rgba(37, 204, 93, 0.1), 0 4rpx 16rpx rgba(0, 0, 0, 0.04),
  //   inset 0 2rpx 0 rgba(255, 255, 255, 0.9);
  box-shadow: 0rpx 0rpx 10rpx -6rpx rgba(0, 0, 0, 0.54);
  border: 3rpx solid rgba(255, 255, 255, 0.85);
  transition: box-shadow 0.22s;

  // 顶部高光，强化玻璃质感
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 120rpx;
    border-radius: 48rpx 48rpx 0 0;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.45),
      rgba(255, 255, 255, 0)
    );
    pointer-events: none;
    z-index: 2;
  }

  // 悬浮时放大（旋转已由外层 .wish-card-in 负责，避免 transform 冲突）
  &:active {
    transform: scale(0.98);
    box-shadow: 0 10rpx 40rpx rgba(37, 204, 93, 0.18), 0 2rpx 10rpx rgba(0, 0, 0, 0.06),
      inset 0 2rpx 0 rgba(255, 255, 255, 0.88);
  }
}

// ===== 叠在卡片下方的错位渐变衬底（左右内缩 12rpx，向下探出 16rpx，背景用接口 gradient） =====
.ticket-inner-bg {
  position: absolute;
  left: 12rpx;
  right: 12rpx;
  top: 12rpx;
  bottom: 0rpx;
  border-radius: 24rpx;
  z-index: 0;
  pointer-events: auto;
  // 背景由内联 :style="{ background: gradient }" 提供
  box-shadow: inset 0 2rpx 0 rgba(255, 255, 255, 0.9),
    0 10rpx 28rpx rgba(37, 204, 93, 0.12);

  // 叠白色半透明，让 gradient 变淡
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: rgba(255, 255, 255, 0.75);
    pointer-events: none;
  }
}

// ===== 第一层：图片 =====
.wish-cover {
  position: relative;
  width: 100%;
  height: 240rpx;
  border-radius: 36rpx;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10rpx;

  .wish-cover-logo-wrap {
    width: 200rpx;
    height: 200rpx;
    border-radius: 32rpx;
    // overflow: hidden;
    // background: rgba(255, 255, 255, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .wish-cover-logo {
    width: 100%;
    height: 100%;
    border-radius: 32rpx;
    // box-shadow: 0 8rpx 28rpx rgba(0, 0, 0, 0.1);
  }
  .wish-cover-sys {
    width: 140rpx;
    height: 140rpx;
    border-radius: 32rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8rpx 28rpx rgba(0, 0, 0, 0.12);
  }
  .wish-cover-sys-text {
    font-size: 28rpx;
    color: #fff;
    font-weight: 700;
  }
  .wish-cover-emoji {
    font-size: 96rpx;
  }
}

// ===== 第二层：姓名 =====
.wish-card-name {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
  color: var(--ink);
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;

  // hover：标题变色 + 下划线（用接口返回基色，真机用 :active 兜底）
  .wish-card-in:hover &,
  .wish-card-in:active & {
    color: var(--cover-base, #25cc5d);
    text-decoration: underline;
  }
}

// ===== 第三层：日期 =====
.wish-card-deadline {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--ink4);

  .wish-card-cal {
    font-size: 18rpx;
  }
}

// ===== 环形进度（canvas 2D） =====
.wish-ring {
  position: relative;
  flex-shrink: 0;

  .wish-ring-canvas {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
  }

  .wish-ring-label {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
    font-weight: 800;
    line-height: 1;
    white-space: nowrap;
  }
}

.wish-progress {
  height: 20rpx;
  border-radius: 198rpx;
  overflow: hidden;

  &--bar {
    margin-top: 16rpx;
    cursor: pointer;
  }

  .wish-progress-fill {
    position: relative;
    height: 100%;
    border-radius: 198rpx;
    transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
    overflow: hidden;

    .progress-shimmer {
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.55) 40%,
        rgba(255, 255, 255, 0.85) 50%,
        rgba(255, 255, 255, 0.55) 60%,
        transparent 100%
      );
      background-size: 200% 100%;
      animation: progressShimmer 2.4s ease-in-out infinite;
    }
  }
}

@keyframes progressShimmer {
  0% {
    background-position: -200% center;
  }

  100% {
    background-position: 200% center;
  }
}

.wish-card-foot {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-top: 20rpx;
  min-width: 0;

  .wish-amount-block {
    display: flex;
    align-items: baseline;
    justify-content: flex-start;
    min-width: 0;
  }

  .wish-amount-saved {
    font-size: 36rpx;
    font-weight: 800;
    color: var(--g5);
    letter-spacing: -1rpx;
  }

  .wish-amount-target {
    font-size: 22rpx;
    color: var(--ink4);
    margin-left: 4rpx;
  }

  // 右下角状态按钮（示例 card__arrow 风格：底色用接口返回色，hover 叠深色）
  .wish-badges {
    position: absolute;
    right: -32rpx;
    bottom: -48rpx;
    display: flex;
    align-items: center;
    gap: 10rpx;
    padding: 6rpx 24rpx 6rpx 20rpx;
    min-width: 0;
    flex-shrink: 0;
    // 背景由内联 :style="{ background: coverBaseColor }" 提供（接口 cover_gradient 基色）
    border-top-left-radius: 24rpx;
    border-bottom-right-radius: 24rpx;
    cursor: pointer;
    overflow: hidden;
    transition: filter 0.2s;

    // hover/active 叠一层半透明黑，让任意基色都变深（不写死具体色）

    .wish-chev-icon {
      color: var(--badge-text, #fff);
      font-size: 36rpx;
      line-height: 1;
      transition: transform 0.2s;
    }

    // hover：按钮变深（黑遮罩），箭头右移，标题变色+下划线
    .wish-card-in:hover &,
    .wish-card-in:active & {
      filter: brightness(0.92);
    }
    .wish-card-in:hover &::after,
    .wish-card-in:active &::after {
      opacity: 1;
    }
    .wish-card-in:hover & .wish-chev-icon,
    .wish-card-in:active & .wish-chev-icon {
      transform: translateX(3rpx);
    }
  }

  .wish-badge {
    font-size: 22rpx;
    font-weight: 600;
    color: var(--badge-text, #fff);
    white-space: nowrap;
  }

  .badge-done,
  .badge-near,
  .badge-left,
  .badge-wait {
    color: #fff;
    background: transparent;
  }
}

// ===== 毛玻璃覆盖层（点击进度条从底部升起，中央展示大号环形） =====
.ring-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  border-radius: inherit;
  overflow: hidden;
  // 默认态（未展开）：整体下沉 + 透明，不可点
  opacity: 0;
  transform: translateY(100%);
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;

  &--show {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .ring-overlay-glass {
    position: absolute;
    inset: 0;
    text-align: center;
    padding: 48rpx;
    box-sizing: border-box;
    // 毛玻璃效果（更透、更强模糊）
    backdrop-filter: blur(56rpx) saturate(1.5);
    -webkit-backdrop-filter: blur(56rpx) saturate(1.5);
    border-radius: inherit;

    .wish-ring--big {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      margin: 0;
    }

    .ring-overlay-tip {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 48rpx;
      font-size: 22rpx;
      color: rgba(255, 255, 255, 0.85);
      font-weight: 600;
      text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.18);
    }
  }
}
</style>
