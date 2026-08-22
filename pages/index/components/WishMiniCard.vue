<template>
  <view v-if="hasAnyWish" class="wish-mini card-in-1" data-cmp="WishMiniCard">
    <!-- 手动上下轮播（view + transform，避免原生 swiper 的兼容坑） -->
    <view class="wish-carousel">
      <view
        class="wish-track"
        :class="{ 'no-anim': noAnim }"
        :style="{ transform: 'translateY(-' + current * 340 + 'rpx)' }"
      >
        <view
          v-for="w in wishes"
          :key="w._id"
          class="wish-track-item"
        >
          <view class="wish-card" :style="cardStyleOf(w)" @click="onTap(w)">
            <!-- 顶部行：icon + 名称 + 距目标还差 -->
            <view class="wish-top">
              <view class="wish-icon-box" :style="{ background: iconBgOf(w) }">
                <image
                  v-if="isLogoWishOf(w) && logoUrlMap[logoFileIdOf(w)]"
                  class="wish-icon-img"
                  :src="logoUrlMap[logoFileIdOf(w)]"
                  mode="aspectFit"
                />
                <text v-else-if="isSysLogoWishOf(w)" class="wish-icon-sys">{{ sysLogoLabelOf(w) }}</text>
                <text v-else class="wish-icon-emoji">{{ emojiOf(w) }}</text>
              </view>
              <view class="wish-title-box">
                <text class="wish-name">{{ w.name }}</text>
                <text class="wish-sub">{{ dateRangeTextOf(w) }}</text>
              </view>
              <view class="wish-diff-box">
                <text class="wish-diff-label">距目标还差</text>
                <text class="wish-diff-val">¥{{ diffTextOf(w) }}</text>
              </view>
            </view>

            <!-- 异形波浪进度 -->
            <view class="wish-wave-track" :style="{ background: trackColorOf(w) }">
              <view class="wish-wave-fill" :style="waveFillStyleOf(w)">
                <view class="wish-wave-inner">
                  <image class="wish-wave-svg" :src="WAVE_SVG" mode="scaleToFill" />
                  <image class="wish-wave-svg" :src="WAVE_SVG" mode="scaleToFill" />
                </view>
              </view>
              <view class="wish-wave-gleam" />
              <view class="wish-wave-pct">{{ pctOf(w) }}%</view>
            </view>

            <!-- 底部行：金额 + 加油冲鸭 -->
            <view class="wish-bottom">
              <view class="wish-amount">
                <text class="wish-saved" :style="{ color: accentOf(w) }">¥{{ savedTextOf(w) }}</text>
                <text class="wish-target">/ ¥{{ targetTextOf(w) }}</text>
              </view>
              <view class="wish-cta" :style="{ background: trackColorOf(w), color: accentOf(w) }">
                <text class="wish-cta-dot">✦</text>
                <text>加油冲鸭！</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 指示点（多心愿时显示） -->
      <view v-if="wishes.length > 1" class="wish-dots">
        <view
          v-for="(w, i) in wishes"
          :key="w._id"
          class="wish-dot"
          :class="{ active: i === current }"
          @click="jumpTo(i)"
        />
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { onShow, onHide, onUnload } from "@dcloudio/uni-app";
import { useUserStore } from "@/stores/user.js";
import { loadWishes } from "@/stores/wish.js";
import { formatFen } from "@/utils/money.js";
import { getCloudTempUrls } from "@/utils/cdn.js";

const WAVE_SVG = "/static/images/wish-wave.svg";
const WISH_GRADIENT = "linear-gradient(135deg, #5936b4 0%, #362a84 100%)";

const userStore = useUserStore();
const wishes = ref([]);
const logoUrlMap = ref({});
const current = ref(0);
const noAnim = ref(false);
let autoplayTimer = null;

// 没有进行中心愿（不管历史）就整个不显示
const hasAnyWish = computed(() => wishes.value.length > 0);

async function fetchWishes() {
  if (!userStore.state.uid) {
    wishes.value = [];
    return;
  }
  try {
    const list = await loadWishes();
    wishes.value = Array.isArray(list) ? list : [];
  } catch (e) {
    console.error("[WishMiniCard] 加载心愿失败", e);
    wishes.value = [];
  }
  await refreshLogoTempUrls();
  startAutoplay();
}

// 自动轮播：每 3.8s 切到下一张；最后一张无动画跳回第一张，实现循环
function startAutoplay() {
  stopAutoplay();
  if (wishes.value.length <= 1) return;
  autoplayTimer = setInterval(() => {
    const next = current.value + 1;
    if (next >= wishes.value.length) {
      noAnim.value = true;
      current.value = 0;
      setTimeout(() => {
        noAnim.value = false;
      }, 80);
    } else {
      current.value = next;
    }
  }, 3800);
}
function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
}
function jumpTo(i) {
  if (i === current.value) return;
  current.value = i;
}

// 批量解析所有 cloud:// logo 的临时访问地址
async function refreshLogoTempUrls() {
  const ids = wishes.value
    .map((w) => w && w.cover_image_url)
    .filter((u) => typeof u === "string" && u.startsWith("cloud://"));
  if (ids.length === 0) {
    logoUrlMap.value = {};
    return;
  }
  try {
    const map = await getCloudTempUrls(ids);
    logoUrlMap.value = map || {};
  } catch (e) {
    console.error("[WishMiniCard] 获取心愿 logo 临时地址失败", e);
    logoUrlMap.value = {};
  }
}

onMounted(fetchWishes);
// 每次回到首页（从心愿页新加/删除后）刷新列表，立即反映变化
onShow(fetchWishes);
// 离开首页时停止定时器，避免后台空转
onHide(stopAutoplay);
onUnload(() => {
  stopAutoplay();
});

// 点击卡片跳转心愿详情页（带 id）
function onTap(w) {
  if (!w || !w._id) return;
  uni.navigateTo({ url: "/pages/wish/detail?id=" + encodeURIComponent(w._id) });
}

/* ===== 每个心愿的动态值（多卡轮播，按心愿计算） ===== */

function gradientOf(w) {
  const g = w && w.cover_gradient;
  if (typeof g === "string" && g.trim()) return g.trim();
  return WISH_GRADIENT;
}

function pctOf(w) {
  if (!w) return 0;
  if (typeof w.progress_pct === "number")
    return Math.max(0, Math.min(Math.round(w.progress_pct), 100));
  const t = w.target_amount || 0;
  if (!t) return 0;
  return Math.max(0, Math.min(Math.round(((w.saved_amount || 0) / t) * 100), 100));
}

function savedTextOf(w) {
  return formatFen(w ? w.saved_amount || 0 : 0);
}
function targetTextOf(w) {
  return formatFen(w ? w.target_amount || 0 : 0);
}
function diffTextOf(w) {
  const d = (w ? w.target_amount || 0 : 0) - (w ? w.saved_amount || 0 : 0);
  return formatFen(Math.max(0, d));
}

/* ===== 图标解析（与心愿页一致）：cloud:// 上传图 / sys:: 系统图标 / 空取名称首字 ===== */

function isLogoWishOf(w) {
  return typeof (w && w.cover_image_url) === "string" && w.cover_image_url.startsWith("cloud://");
}
/* 返回云存储 fileID（cover_image_url 以 cloud:// 开头），否则返回 ""；用于查 logoUrlMap 的临时地址 */
function logoFileIdOf(w) {
  return isLogoWishOf(w) ? w.cover_image_url : "";
}
function isSysLogoWishOf(w) {
  return typeof (w && w.cover_image_url) === "string" && w.cover_image_url.startsWith("sys::");
}
function sysLogoLabelOf(w) {
  const parts = String(w && w.cover_image_url).split("::");
  return parts[0] === "sys" ? `系统${Number(parts[1]) + 1 || 1}` : "";
}
/* 展示心愿起止时间（仅年月日）：start_date ~ end_date */
function dateRangeTextOf(w) {
  if (!w) return "";
  const s = (w.start_date || "").slice(0, 10);
  const e = (w.end_date || w.deadline || "").slice(0, 10);
  if (s && e) return `${s} 至 ${e}`;
  if (s) return `始于 ${s}`;
  if (e) return `截止 ${e}`;
  return "我的心愿";
}

function emojiOf(w) {
  if (!w) return "⭐";
  if (isLogoWishOf(w) || isSysLogoWishOf(w)) return "";
  return w.name ? w.name.trim().charAt(0) || "⭐" : "⭐";
}

/* ===== 从 cover_gradient 派生颜色（思路与 wish-card.vue 一致） ===== */

function hexToRgb(hex) {
  let h = String(hex).replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
    return { h, s: s * 100, l: l * 100 };
  }
  return { h, s: 0, l: l * 100 };
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
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const to = (n) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
function extractGradientColors(str) {
  const m = String(str).match(/#([0-9a-fA-F]{3,8})/g) || [];
  if (m.length === 0) return ["#acf5b7", "#8ae99b", "#25cc5d"];
  if (m.length === 1) return [m[0], m[0], m[0]];
  return [m[0], m[1], m[m.length - 1]];
}
// 基于基色派生「浅/基准/深」三色（保持色相与饱和度，仅调亮度）
function buildThreeTone(baseHex) {
  const { r, g, b } = hexToRgb(baseHex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const light = hslToHex(h, Math.max(0, s - 6), Math.min(100, l + 14));
  const base = hslToHex(h, s, l);
  const deep = hslToHex(h, Math.min(100, s + 4), Math.max(0, l - 16));
  return [light, base, deep];
}
function rgbaOf(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// 每张卡：尾色派生三档
function tonesOf(w) {
  const [, , tail] = extractGradientColors(gradientOf(w));
  const [light, base, deep] = buildThreeTone(tail || "#8ae99b");
  return { light, base, deep };
}

function accentOf(w) {
  return tonesOf(w).deep;
}
function iconBgOf(w) {
  const { light, base } = tonesOf(w);
  return `linear-gradient(135deg, ${light} 0%, ${base} 100%)`;
}
function trackColorOf(w) {
  return rgbaOf(tonesOf(w).base, 0.18);
}
function waveFillStyleOf(w) {
  const { base, deep } = tonesOf(w);
  return {
    width: `${pctOf(w)}%`,
    background: `linear-gradient(90deg, ${base} 0%, ${deep} 100%)`,
  };
}
function cardStyleOf(w) {
  return {
    "--wish-grad": gradientOf(w),
    "--wish-accent": accentOf(w),
  };
}
</script>

<style scoped lang="scss">
.wish-mini {
  display: block;
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
}

/* 手动垂直轮播：容器 + 轨道 + 指示点 */
.wish-carousel {
  position: relative;
  width: 100%;
  height: 340rpx;
  overflow: hidden;
  border-radius: 24rpx;
}
.wish-track {
  display: flex;
  flex-direction: column;
  width: 100%;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.wish-track.no-anim {
  transition: none;
}
.wish-track-item {
  width: 100%;
  height: 340rpx;
  flex-shrink: 0;
  box-sizing: border-box;
}
.wish-dots {
  position: absolute;
  right: 20rpx;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  z-index: 3;
}
.wish-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: rgba(13, 14, 19, 0.25);
  transition: 0.3s;
}
.wish-dot.active {
  height: 26rpx;
  border-radius: 8rpx;
  background: rgba(13, 14, 19, 0.6);
}

.wish-card {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 26rpx 28rpx 22rpx;
  border-radius: 24rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.88);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  border: 2rpx solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 8rpx 28rpx rgba(16, 30, 20, 0.08);
}

/* ---------- 顶部行 ---------- */
.wish-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.wish-icon-box {
  width: 88rpx;
  height: 88rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.wish-icon-img {
  width: 100%;
  height: 100%;
}
.wish-icon-emoji {
  font-size: 40rpx;
  line-height: 1;
}
.wish-icon-sys {
  font-size: 20rpx;
  font-weight: 700;
  color: #0d0e13;
  text-align: center;
  line-height: 1.2;
  padding: 0 6rpx;
}

.wish-title-box {
  flex: 1;
  min-width: 0;
  padding-top: 2rpx;
}
.wish-name {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #0d0e13;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wish-sub {
  display: block;
  font-size: 22rpx;
  color: #828a99;
  margin-top: 6rpx;
}

.wish-diff-box {
  text-align: right;
  flex-shrink: 0;
  padding-top: 2rpx;
}
.wish-diff-label {
  display: block;
  font-size: 20rpx;
  color: #828a99;
}
.wish-diff-val {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #0d0e13;
  margin-top: 4rpx;
}

/* ---------- 波浪进度 ---------- */
.wish-wave-track {
  position: relative;
  height: 68rpx;
  border-radius: 34rpx;
  overflow: hidden;
}
.wish-wave-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 34rpx;
  overflow: hidden;
  transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.wish-wave-inner {
  display: flex;
  width: 200%;
  height: 100%;
  animation: wishWave 4s linear infinite;
}
.wish-wave-svg {
  flex: 0 0 50%;
  width: 50%;
  height: 100%;
}
.wish-wave-gleam {
  position: absolute;
  top: 8rpx;
  left: 20rpx;
  right: 20rpx;
  height: 10rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.4);
  pointer-events: none;
}
.wish-wave-pct {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.18);
}

/* ---------- 底部行 ---------- */
.wish-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.wish-amount {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.wish-saved {
  font-size: 36rpx;
  font-weight: 800;
  letter-spacing: -1rpx;
}
.wish-target {
  font-size: 24rpx;
  color: #828a99;
}
.wish-cta {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 22rpx;
  font-weight: 600;
  padding: 6rpx 20rpx;
  border-radius: 24rpx;
}
.wish-cta-dot {
  font-size: 18rpx;
}

@keyframes wishWave {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}
</style>
