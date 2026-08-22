<template>
  <view class="wish-detail-page">
    <!-- 顶部栏（参考 asset-detail 的 topbar：paddingTop 对齐胶囊底部，内部垂直居中） -->
    <view class="detail-topbar" :style="{ paddingTop: pagePaddingTop }">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">心愿详情</text>
      <view class="topbar-placeholder" />
    </view>

    <!-- 顶部封面 -->
    <view
      class="detail-cover"
      :style="{ background: cardStyleOf(detailWish).grad, paddingTop: coverPaddingTop }"
    >
      <!-- <view class="detail-cover-actions">
        <view class="detail-cover-action" @click="goOperate('archive')">
          <text>{{ isArchived ? "已归档" : "归档" }}</text>
        </view>
        <view class="detail-cover-action danger" @click="goOperate('delete')">
          <text>删除</text>
        </view>
      </view> -->
      <view class="detail-cover-main">
        <view class="detail-icon-box" :style="{ background: iconBgOf(detailWish) }">
          <image
            v-if="isLogoWishOf(detailWish) && logoUrlMap[logoFileIdOf(detailWish)]"
            class="detail-icon-img"
            :src="logoUrlMap[logoFileIdOf(detailWish)]"
            mode="aspectFit"
          />
          <text v-else-if="isSysLogoWishOf(detailWish)" class="detail-icon-sys">{{
            sysLogoLabelOf(detailWish)
          }}</text>
          <text v-else class="detail-icon-emoji">{{ emojiOf(detailWish) }}</text>
        </view>
        <view class="detail-name-wrap">
          <text class="detail-name">{{ detailWish.name }}</text>
          <text class="detail-sub">{{ dateRangeTextOf(detailWish) }}</text>
        </view>
      </view>

      <view class="detail-cover-bottom">
        <view class="detail-progress">
          <view
            class="detail-progress-fill"
            :style="{
              width: progressPctOf(detailWish) + '%',
              background: progressFillStyleOf(detailWish).background,
            }"
          />
        </view>
        <view class="detail-cover-row">
          <text class="detail-cover-pct" :style="{ color: accentOf(detailWish) }"
            >{{ progressPctOf(detailWish) }}%</text
          >
          <text class="detail-cover-amt"
            >已攒 ¥{{ formatFen(detailWish.saved_amount || 0) }} / ¥{{
              formatFen(detailWish.target_amount || 0)
            }}</text
          >
        </view>
      </view>
    </view>

    <!-- 统计 -->
    <view class="detail-stats">
      <view class="detail-stat">
        <text class="detail-stat-label">已攒金额</text>
        <text class="detail-stat-value" :style="{ color: accentOf(detailWish) }"
          >¥{{ formatFen(detailWish.saved_amount || 0) }}</text
        >
      </view>
      <view class="detail-stat">
        <text class="detail-stat-label">剩余金额</text>
        <text class="detail-stat-value" :style="{ color: accentOf(detailWish) }"
          >¥{{
            formatFen(
              Math.max(
                0,
                (detailWish.target_amount || 0) - (detailWish.saved_amount || 0)
              )
            )
          }}</text
        >
      </view>
      <view class="detail-stat">
        <text class="detail-stat-label">完成阶段</text>
        <text class="detail-stat-value" :style="{ color: accentOf(detailWish) }"
          >{{ detailWish.done_phases || 0 }} / {{ wishPhasesCum.length || 0 }}</text
        >
      </view>
    </view>

    <!-- 分阶段进度时间线 -->
    <view class="phase-timeline">
      <view class="phase-tl-title" :style="{ color: accentOf(detailWish) }"
        >阶段进度</view
      >
      <view
        v-for="ph in wishPhasesCum"
        :key="ph.index"
        class="phase-tl-item"
        :class="ph.effStatus"
      >
        <view
          class="phase-tl-node"
          :style="{
            background:
              ph.effStatus === 'done' ? accentOf(detailWish) : accentTintOf(detailWish),
            color: ph.effStatus === 'done' ? '#fff' : accentOf(detailWish),
          }"
        >
          <text>{{ ph.index }}</text>
        </view>
        <view class="phase-tl-body">
          <view class="phase-tl-head">
            <text class="phase-tl-name">第{{ ph.index }}阶段</text>
            <text
              class="phase-tl-state"
              :class="ph.effStatus"
              :style="{
                color: ph.effStatus === 'expired' ? 'var(--ink4)' : accentOf(detailWish),
              }"
              >{{
                ph.effStatus === "done"
                  ? "已完成"
                  : ph.effStatus === "expired"
                  ? "已过期"
                  : "进行中"
              }}</text
            >
          </view>
          <view class="phase-tl-bar">
            <view
              class="phase-tl-fill"
              :style="{
                width:
                  Math.min(100, Math.round(((ph.saved || 0) / (ph.target || 1)) * 100)) +
                  '%',
                background: progressFillStyleOf(detailWish).background,
              }"
            />
          </view>
          <view class="phase-tl-num">
            <text>¥{{ formatFen(ph.saved || 0) }}</text>
            <text class="phase-tl-target">/ ¥{{ formatFen(ph.target || 0) }}</text>
            <text class="phase-tl-cum"
              >总 ¥{{ formatFen(ph.cumSaved) }} / ¥{{ formatFen(ph.cumTarget) }}</text
            >
            <text v-if="ph.done_at" class="phase-tl-date">{{ fmtDate(ph.done_at) }}</text>
          </view>
          <view v-if="ph.start_date || ph.end_date" class="phase-tl-range">
            <text v-if="ph.start_date" class="phase-tl-range-item"
              >📅 {{ ph.start_date
              }}<text v-if="ph.start_time"> {{ ph.start_time }}</text></text
            >
            <text v-if="ph.end_date" class="phase-tl-range-item"
              >→ {{ ph.end_date }}<text v-if="ph.end_time"> {{ ph.end_time }}</text></text
            >
            <text v-else class="phase-tl-range-item phase-tl-range-open">→ 无限期</text>
          </view>
        </view>
      </view>

      <view
        v-if="!isArchived && !hasNextPhase"
        class="phase-tl-advance"
        :style="{ borderColor: accentBorderOf(detailWish), color: accentOf(detailWish) }"
        @click="goOperate('advance')"
      >
        <text>➕ 开启下一阶段</text>
      </view>
    </view>

    <!-- tabs：存入明细 -->
    <view class="wish-tabs">
      <view
        class="wish-tab"
        :class="{ active: tab === 'records' }"
        :style="tab === 'records' ? tabActiveStyleOf(detailWish) : {}"
        @click="tab = 'records'"
      >
        <text>存入明细</text>
      </view>
    </view>

    <view class="records-panel">
      <view v-if="logsLoading" class="records-empty">加载中…</view>
      <view v-else-if="!logs.length" class="records-empty">暂无存入记录</view>
      <block v-else>
        <view v-for="log in logs" :key="log._id" class="record-item">
          <view class="record-dot" :style="{ background: accentOf(detailWish) }" />
          <view class="record-info">
            <view class="record-line">
              <text class="record-amount">+¥{{ formatFen(log.amount) }}</text>
              <text class="record-source">{{ sourceLabel(log.source) }}</text>
            </view>
            <text class="record-time">{{ fmtDate(log.created_at) }}</text>
          </view>
        </view>
      </block>
    </view>

    <!-- 底部操作 -->
    <view class="detail-footer">
      <view
        class="wish-btn-primary"
        :style="{ background: primaryBgOf(detailWish), color: btnTextOf(detailWish) }"
        @click="goOperate('deposit')"
      >
        <text>⬇ 存入</text>
      </view>
      <view
        class="wish-btn-ghost"
        :style="{
          borderColor: accentBorderOf(detailWish),
          color: accentOf(detailWish),
        }"
        @click="goOperate('withdraw')"
      >
        <text>⬆ 取出</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from "vue";
import { onLoad, onShow, onUnload } from "@dcloudio/uni-app";
import { useUserStore } from "@/stores/user.js";
import { advanceWishPhaseAction } from "@/stores/wish.js";
import { getCloudTempUrls } from "@/utils/cdn.js";
import { formatFen } from "@/utils/money.js";

/* ===== 通用配色工具（与 wish.vue 保持一致） ===== */
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
function hexToHsl(hex) {
  let h = String(hex).replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let sat = 0;
  const lum = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = lum > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) hue = ((b - r) / d + 2) / 6;
    else hue = ((r - g) / d + 4) / 6;
  }
  return { h: hue * 360, s: sat * 100, l: lum * 100 };
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
  const to = (v) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
function buildThreeTone(baseHex) {
  const { h, s, l } = hexToHsl(baseHex);
  const light = hslToHex(h, Math.max(0, s - 6), Math.min(100, l + 14));
  const base = hslToHex(h, s, l);
  const deep = hslToHex(h, Math.min(100, s + 4), Math.max(0, l - 16));
  return [light, base, deep];
}
function extractGradientColors(str) {
  const m = String(str).match(/#([0-9a-fA-F]{3,8})/g) || [];
  const colors = m.map((c) => c);
  if (colors.length === 0) return ["#acf5b7", "#8ae99b", "#25cc5d"];
  if (colors.length === 1) return [colors[0], colors[0], colors[0]];
  return [colors[0], colors[colors.length - 1], colors[colors.length - 1]];
}

const SYS_LOGO_PRESETS = [
  { id: 0, label: "系统图标 1" },
  { id: 1, label: "系统图标 2" },
  { id: 2, label: "系统图标 3" },
  { id: 3, label: "系统图标 4" },
  { id: 4, label: "系统图标 5" },
  { id: 5, label: "系统图标 6" },
];
const WISH_GRADIENT = {
  red: "linear-gradient(135deg, #ff5e62 0%, #ff3d3d 100%)",
  orange: "linear-gradient(135deg, #ffa751 0%, #ff7e3d 100%)",
  pink: "linear-gradient(135deg, #ff7eb3 0%, #ff5e9c 100%)",
  purple: "linear-gradient(135deg, #7a5cff 0%, #5a3dff 100%)",
  blue: "linear-gradient(135deg, #4facfe 0%, #2a7bff 100%)",
  teal: "linear-gradient(135deg, #2fd8c8 0%, #1ab5a8 100%)",
  green: "linear-gradient(135deg, #43e97b 0%, #25cc5d 100%)",
};

const userStore = useUserStore();
const { state, loadWishes, loadArchivedWishesAction } = userStore;

const wishId = ref("");
const detailWish = ref({});
const logoUrlMap = ref({});
const tab = ref("records");
const logs = ref([]);
const logsLoading = ref(false);

const pageBg =
  "linear-gradient(180deg, var(--bg-grad-1, #f3f7f4) 0%, var(--bg-grad-2, #eef2f7) 100%)";

// 顶部安全区：避开状态栏/胶囊（参考 asset-detail 的 resolveTopPadding）
// 胶囊底部 + 间距，作为「顶部栏高度」与「封面内容起始安全区」，返回按钮在栏内垂直居中即与胶囊对齐
function resolveTop() {
  try {
    const rect = uni.getMenuButtonBoundingClientRect();
    if (rect && rect.top > 0 && rect.height > 0) {
      return {
        padTop: `${rect.top}px`,
        barH: `${rect.height}px`,
        coverTop: `${rect.top + 50}px`,
      };
    }
  } catch (e) {}
  const { statusBarHeight = 20 } = uni.getSystemInfoSync();
  return {
    padTop: `${statusBarHeight + 50}px`,
    barH: "32px",
    coverTop: `${statusBarHeight + 50 + 50}px`,
  };
}
const top = resolveTop();
const pagePaddingTop = ref(top.padTop);
const coverPaddingTop = ref(top.coverTop);

const isArchived = computed(() => detailWish.value.archived === true);

function gradOf(w) {
  const g = w && w.cover_gradient;
  if (typeof g === "string" && g.trim()) return g.trim();
  const key = w && w.cover_gradient_key;
  if (key && WISH_GRADIENT[key]) return WISH_GRADIENT[key];
  return WISH_GRADIENT.red;
}
// 取封面基色（与 wish.vue 一致：取渐变尾色作为基色）
function baseHexOf(w) {
  const [, , tail] = extractGradientColors(gradOf(w));
  return tail || "#8ae99b";
}
function cardStyleOf(w) {
  const g = gradOf(w);
  const [c0, c1, c2] = extractGradientColors(g);
  // return { grad: `linear-gradient(135deg, ${c0} 0%, ${c1} 55%, ${c2} 100%)` };
  return {
    grad: `linear-gradient(180deg, ${c2} 0%, ${c1} 25%, ${c0} 90% , #ffffff 100%)`,
  };
}
function accentOf(w) {
  const [, base] = buildThreeTone(baseHexOf(w));
  return base;
}
function accentTintOf(w) {
  const { r, g, b } = hexToRgb(baseHexOf(w));
  const mix = (c) => Math.round(c + (255 - c) * 0.84);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}
function accentBorderOf(w) {
  const { r, g, b } = hexToRgb(baseHexOf(w));
  const mix = (c) => Math.round(c + (255 - c) * 0.6);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}
function primaryBgOf(w) {
  return gradOf(w);
}
function btnTextOf(w) {
  const { l } = hexToHsl(baseHexOf(w));
  return l > 62 ? "var(--ink2, #3a4456)" : "#fff";
}
function tabActiveStyleOf(w) {
  const [, , deep] = buildThreeTone(baseHexOf(w));
  return { color: deep, borderBottomColor: deep };
}

/* ---------------- 图标 ---------------- */
function isLogoWishOf(w) {
  return (
    typeof (w && w.cover_image_url) === "string" &&
    w.cover_image_url.startsWith("cloud://")
  );
}
function logoFileIdOf(w) {
  return isLogoWishOf(w) ? w.cover_image_url : "";
}
function isSysLogoWishOf(w) {
  return (
    typeof (w && w.cover_image_url) === "string" && w.cover_image_url.startsWith("sys::")
  );
}
function sysLogoLabelOf(w) {
  const m = isSysLogoWishOf(w) ? w.cover_image_url.slice(5) : "";
  const idx = parseInt(m, 10);
  if (!isNaN(idx) && SYS_LOGO_PRESETS[idx]) return SYS_LOGO_PRESETS[idx].label;
  return m;
}
function emojiOf(w) {
  const n = (w && w.name) || "";
  return n ? Array.from(n)[0] : "🎯";
}
function iconBgOf(w) {
  const g = gradOf(w);
  const [c0, c1, c2] = extractGradientColors(g);
  return `linear-gradient(135deg, ${c0}33 0%, ${c1}55 100%)`;
}
function progressFillStyleOf(w) {
  const [light, base, deep] = buildThreeTone(baseHexOf(w));
  return { background: `linear-gradient(90deg, ${light} 0%, ${base} 50%, ${deep} 100%)` };
}
function progressPctOf(w) {
  const t = w.target_amount || 0;
  const s = w.saved_amount || 0;
  if (!t) return 0;
  return Math.max(0, Math.min(100, Math.round((s / t) * 100)));
}
function dateRangeTextOf(w) {
  if (!w) return "";
  const s = (w.start_date || "").trim();
  const e = (w.end_date || w.deadline || "").trim();
  if (s && e) return `${s} 至 ${e}`;
  if (s) return `始于 ${s}`;
  if (e) return `截止 ${e}`;
  return "我的心愿";
}

/* ---------------- 阶段 ---------------- */
function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function fmtDate(v) {
  if (!v) return "";
  const d = typeof v === "object" && v.$date ? new Date(v.$date) : new Date(v);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day} ${hh}:${mm}`;
}
function sourceLabel(src) {
  if (src === "surplus") return "余钱罐转入";
  if (src === "manual") return "手动存入";
  if (src === "refund") return "退款回收";
  if (src === "init") return "初始本金";
  return "存入";
}

const wishPhases = computed(() => {
  const w = detailWish.value;
  if (!w || !Array.isArray(w.phases) || !w.phases.length) return [];
  return w.phases
    .filter((p) => p && (p.target_amount || 0) > 0)
    .map((p, i) => ({ ...p, index: i + 1, saved: p.saved_amount || 0 }));
});
const currentPhaseIdx = computed(() => {
  const w = detailWish.value;
  if (!w) return 0;
  if (w.done_phases && w.done_phases > 0)
    return Math.min(w.done_phases, wishPhases.value.length);
  return 0;
});
const hasPhaseTasks = computed(() => wishPhases.value.length > 0);
const wishPhasesCum = computed(() => {
  const phases = wishPhases.value;
  const cur = currentPhaseIdx.value;
  let cumSaved = 0;
  let cumTarget = 0;
  return phases.map((p, i) => {
    cumSaved += p.saved;
    cumTarget += p.target_amount;
    let effStatus = "active";
    if (i < cur) effStatus = "done";
    else if (i === cur) {
      effStatus = "active";
      if (isArchived.value) effStatus = "expired";
    } else {
      const end = p.end_date || "";
      if (end && end < todayKey()) effStatus = "expired";
      else effStatus = "pending";
    }
    return { ...p, effStatus, cumSaved, cumTarget };
  });
});
const hasNextPhase = computed(() => {
  const w = detailWish.value;
  if (!w || !Array.isArray(w.phases)) return false;
  return w.phases.length > (w.done_phases || 0);
});

/* ---------------- 数据与日志 ---------------- */
function findWish(id) {
  const all = [...(state.wishes || []), ...(state.archivedWishes || [])];
  return all.find((w) => w._id === id) || {};
}
async function refreshLogo() {
  const w = detailWish.value;
  if (!isLogoWishOf(w)) return;
  const fid = logoFileIdOf(w);
  try {
    const res = await getCloudTempUrls([fid]);
    logoUrlMap.value = { ...logoUrlMap.value, [fid]: res[fid] || "" };
  } catch (e) {
    console.error("[WishDetail] 获取 logo 临时地址失败", e);
  }
}
async function loadLogs() {
  const w = detailWish.value;
  if (!w._id) return;
  logsLoading.value = true;
  try {
    const res = await userStore.loadWishFundLogsAction(w._id);
    logs.value = res || [];
  } catch (e) {
    console.error("[WishDetail] 读取存入明细失败", e);
    logs.value = [];
  } finally {
    logsLoading.value = false;
  }
}
async function init(id) {
  wishId.value = id;
  if (!state.wishes || !state.wishes.length) {
    await loadWishes();
  }
  if (!state.archivedWishes || !state.archivedWishes.length) {
    await loadArchivedWishesAction();
  }
  detailWish.value = findWish(id);
  await refreshLogo();
  await loadLogs();
}

/* ---------------- 交互：直接在详情页完成操作（wish 为 tabBar 页，不能 navigateTo） ---------------- */
function goBack() {
  uni.navigateBack({ delta: 1 });
}

// 让用户输入金额（元），返回数字或 null（取消）
function promptAmount(title) {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      editable: true,
      placeholderText: "请输入金额（元）",
      success: (r) => {
        if (!r.confirm) return resolve(null);
        const v = parseFloat(r.content);
        if (isNaN(v) || v <= 0) {
          uni.showToast({ title: "金额无效", icon: "none" });
          return resolve(null);
        }
        resolve(v);
      },
      fail: () => resolve(null),
    });
  });
}

async function goOperate(action) {
  const w = detailWish.value;
  if (!w || !w._id) return;
  try {
    if (action === "deposit") {
      const yuan = await promptAmount("存入心愿");
      if (yuan == null) return;
      await userStore.depositWishFromSurplusAction(w._id, yuan, "详情页存入");
      uni.showToast({ title: "已存入", icon: "success" });
    } else if (action === "withdraw") {
      const yuan = await promptAmount("取出心愿");
      if (yuan == null) return;
      const maxYuan = (w.saved_amount || 0) / 100;
      if (yuan > maxYuan + 1e-6) {
        uni.showToast({ title: "超出已攒金额", icon: "none" });
        return;
      }
      await userStore.withdrawWishToSurplusAction(w._id, yuan, "详情页取出");
      uni.showToast({ title: "已取出", icon: "success" });
    } else if (action === "advance") {
      await advanceWishPhaseAction(w._id);
      uni.showToast({ title: "已开启下一阶段", icon: "success" });
    } else if (action === "archive") {
      uni.showModal({
        title: "归档心愿",
        content: "归档后该心愿将移入历史，确认归档？",
        success: async (r) => {
          if (!r.confirm) return;
          await userStore.archiveWishAction(w._id);
          uni.showToast({ title: "已归档", icon: "success" });
          setTimeout(() => goBack(), 600);
        },
      });
      return;
    } else if (action === "delete") {
      uni.showModal({
        title: "删除心愿",
        content: "删除后将进入历史心愿，确认删除？",
        success: async (r) => {
          if (!r.confirm) return;
          await userStore.deleteWishAction(w._id);
          uni.showToast({ title: "已删除", icon: "success" });
          setTimeout(() => goBack(), 600);
        },
      });
      return;
    }
    // 操作后刷新
    detailWish.value = findWish(wishId.value) || detailWish.value;
    await refreshLogo();
    await loadLogs();
  } catch (e) {
    console.error("[WishDetail] 操作失败", e);
    uni.showToast({
      title: "操作失败：" + (e && e.errMsg ? e.errMsg : "请重试"),
      icon: "none",
    });
  }
}

onLoad((options) => {
  const id = (options && options.id) || "";
  if (id) init(id);
});
onShow(() => {
  // 从心愿页返回后刷新数据
  if (wishId.value) {
    detailWish.value = findWish(wishId.value);
    refreshLogo();
    loadLogs();
  }
});
onUnload(() => {
  logoUrlMap.value = {};
  logs.value = [];
});
</script>

<style scoped lang="scss">
.wish-detail-page {
  min-height: 100vh;
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: #ffffff;
}
.detail-topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx 10rpx;
  box-sizing: border-box;
}
.back-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5b6b7a;
  font-size: 38rpx;
  cursor: pointer;
}
.topbar-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
  flex: 1;
  text-align: center;
}
.topbar-placeholder {
  width: 72rpx;
  height: 72rpx;
}
.detail-cover-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-bottom: 18rpx;
}
.detail-cover-action {
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.32);
  color: #fff;
  font-size: 24rpx;
  &.danger {
    background: rgba(229, 72, 77, 0.85);
  }
}
.detail-cover {
  position: relative;
  padding: 0 32rpx 63rpx;
  border-bottom-left-radius: 36rpx;
  border-bottom-right-radius: 36rpx;
  // box-shadow: 0 12rpx 32rpx rgba(31, 41, 55, 0.16);
}
.detail-cover-main {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 20rpx;
}
.detail-icon-box {
  width: 120rpx;
  height: 120rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex: 0 0 auto;
}
.detail-icon-img {
  width: 100%;
  height: 100%;
}
.detail-icon-sys {
  font-size: 48rpx;
}
.detail-icon-emoji {
  font-size: 52rpx;
}
.detail-name-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.detail-name {
  color: var(--ink);
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.detail-sub {
  color: var(--ink2);
  font-size: 24rpx;
  margin-top: 8rpx;
}
.detail-cover-bottom {
  margin-top: 28rpx;
}
.detail-progress {
  height: 24rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.55);
  overflow: hidden;
}
.detail-progress-fill {
  height: 100%;
  border-radius: 999rpx;
  transition: width 0.4s ease;
}
.detail-cover-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 14rpx;
}
.detail-cover-pct {
  color: #fff;
  font-size: 34rpx;
  font-weight: 700;
}
.detail-cover-amt {
  color: rgba(255, 255, 255, 0.9);
  font-size: 24rpx;
}

.detail-stats {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 32rpx 8rpx;
}
.detail-stat {
  flex: 1;
  background: #fff;
  border-radius: 24rpx;
  padding: 22rpx 18rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 6rpx 18rpx rgba(31, 41, 55, 0.06);
}
.detail-stat-label {
  font-size: 22rpx;
  color: var(--ink3, #7c8aa0);
}
.detail-stat-value {
  font-size: 30rpx;
  font-weight: 700;
  margin-top: 8rpx;
}

.phase-timeline {
  margin: 24rpx 32rpx 0;
  background: #fff;
  border-radius: 28rpx;
  padding: 28rpx 26rpx;
  box-shadow: 0 6rpx 18rpx rgba(31, 41, 55, 0.06);
}
.phase-tl-title {
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 18rpx;
}
.phase-tl-item {
  display: flex;
  gap: 20rpx;
  padding-bottom: 26rpx;
  position: relative;
  &.pending {
    opacity: 0.62;
  }
  &.expired {
    opacity: 0.85;
  }
}
.phase-tl-node {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
}
.phase-tl-body {
  flex: 1;
  min-width: 0;
}
.phase-tl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.phase-tl-name {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--ink1, #1f2937);
}
.phase-tl-state {
  font-size: 22rpx;
  &.done {
    font-weight: 600;
  }
}
.phase-tl-bar {
  height: 12rpx;
  border-radius: 999rpx;
  background: var(--line, #eef1f6);
  overflow: hidden;
  margin: 12rpx 0 10rpx;
}
.phase-tl-fill {
  height: 100%;
  border-radius: 999rpx;
  transition: width 0.4s ease;
}
.phase-tl-num {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4rpx 14rpx;
  font-size: 24rpx;
  color: var(--ink2, #3a4456);
}
.phase-tl-target {
  color: var(--ink3, #7c8aa0);
}
.phase-tl-cum {
  width: 100%;
  color: var(--ink3, #7c8aa0);
  font-size: 22rpx;
}
.phase-tl-date {
  color: var(--ink3, #7c8aa0);
  font-size: 22rpx;
}
.phase-tl-range {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx 16rpx;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: var(--ink3, #7c8aa0);
}
.phase-tl-range-open {
  color: var(--ink4, #9aa6b8);
}
.phase-tl-advance {
  margin-top: 6rpx;
  border: 1px dashed var(--line, #e3e8f0);
  border-radius: 16rpx;
  padding: 18rpx;
  text-align: center;
  font-size: 26rpx;
}

.wish-tabs {
  display: flex;
  gap: 36rpx;
  padding: 28rpx 32rpx 0;
}
.wish-tab {
  font-size: 28rpx;
  color: var(--ink3, #7c8aa0);
  padding-bottom: 14rpx;
  border-bottom: 3rpx solid transparent;
  &.active {
    font-weight: 700;
  }
}
.records-panel {
  margin: 16rpx 32rpx 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 12rpx 24rpx;
  min-height: 120rpx;
  box-shadow: 0 6rpx 18rpx rgba(31, 41, 55, 0.06);
}
.records-empty {
  text-align: center;
  color: var(--ink3, #7c8aa0);
  font-size: 26rpx;
  padding: 36rpx 0;
}
.record-item {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 22rpx 0;
  border-bottom: 1rpx solid var(--line, #eef1f6);
  &:last-child {
    border-bottom: none;
  }
}
.record-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  flex: 0 0 auto;
}
.record-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.record-line {
  display: flex;
  align-items: baseline;
  gap: 14rpx;
}
.record-amount {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink1, #1f2937);
}
.record-source {
  font-size: 24rpx;
  color: var(--ink3, #7c8aa0);
}
.record-time {
  font-size: 22rpx;
  color: var(--ink4, #9aa6b8);
  margin-top: 4rpx;
}

.detail-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 20rpx;
  padding: 18rpx 32rpx calc(18rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid var(--line, #eef1f6);
  backdrop-filter: blur(8rpx);
}
.wish-btn-primary {
  flex: 2;
  border-radius: 999rpx;
  padding: 26rpx 0;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
}
.wish-btn-ghost {
  flex: 1;
  border-radius: 999rpx;
  border: 2rpx solid;
  padding: 26rpx 0;
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
}
</style>
