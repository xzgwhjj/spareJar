<template>
  <view v-if="visible" class="drp-overlay" @click="onCancel">
    <view class="drp-sheet" :style="safeAreaStyle" @click.stop>
      <view class="drp-head">
        <text class="drp-title">选择日期区间</text>
        <view class="drp-close" @click="onCancel">✕</view>
      </view>

      <!-- 快捷选项 -->
      <scroll-view class="drp-quick" scroll-x>
        <view
          v-for="q in quickOptions"
          :key="q.key"
          class="drp-quick-item"
          :class="{ active: activeQuick === q.key }"
          @click="applyQuick(q)"
          >{{ q.label }}</view
        >
        <view
          class="drp-quick-item"
          :class="{ active: activeQuick === 'custom' }"
          @click="setCustom"
          >自定义</view
        >
      </scroll-view>

      <!-- 年月导航 -->
      <view class="drp-nav">
        <view class="drp-nav-btn" @click="prevMonth">‹</view>
        <text class="drp-nav-title">{{ viewYear }}年{{ viewMonth + 1 }}月</text>
        <view class="drp-nav-btn" @click="nextMonth">›</view>
      </view>

      <!-- 星期表头 -->
      <view class="drp-week">
        <text v-for="w in weekLabels" :key="w" class="drp-week-cell">{{ w }}</text>
      </view>

      <!-- 日期网格 -->
      <view class="drp-grid">
        <view
          v-for="cell in gridCells"
          :key="cell.key"
          class="drp-cell"
          :class="cellClass(cell)"
          @click="cell.date ? pickDate(cell.date) : null"
        >
          <text v-if="cell.date" class="drp-cell-num">{{ cell.day }}</text>
        </view>
      </view>

      <!-- 时分秒 -->
      <view class="drp-time">
        <view class="drp-time-row">
          <text class="drp-time-label">起始时间</text>
          <picker
            mode="multiSelector"
            :range="timeColumns"
            :value="startTimeParts"
            @change="(e) => (startTime = joinTime(e.detail.value))"
          >
            <view class="drp-time-val">{{ startTime }}</view>
          </picker>
        </view>
        <view class="drp-time-row">
          <text class="drp-time-label">截止时间</text>
          <picker
            mode="multiSelector"
            :range="timeColumns"
            :value="endTimeParts"
            @change="(e) => (endTime = joinTime(e.detail.value))"
          >
            <view class="drp-time-val">{{ endTime }}</view>
          </picker>
        </view>
      </view>

      <!-- 已选展示 -->
      <view class="drp-selected">
        <text class="drp-selected-text">已选：{{ displayRange }}</text>
      </view>

      <view class="drp-actions">
        <view class="drp-btn drp-btn-clear" @click="onClear">清空</view>
        <view class="drp-btn drp-btn-confirm" @click="onConfirm">确认</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { formatDateKey } from "@/utils/date.js";

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 初始值 { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
  modelValue: { type: Object, default: () => ({ start: "", end: "" }) },
  // 快捷区间方向：'past' 从今天往前（默认，用于历史筛选）；'future' 从今天往后（用于新建心愿起始区间）
  quickRangeDirection: { type: String, default: "past" },
});
const emit = defineEmits(["update:visible", "update:modelValue", "confirm"]);

const weekLabels = ["日", "一", "二", "三", "四", "五", "六"];
const quickOptions = [
  { key: "week", label: "近一周", days: 7 },
  { key: "month", label: "近一月", days: 30 },
  { key: "quarter", label: "近三月", days: 90 },
];

const now = new Date();
const viewYear = ref(now.getFullYear());
const viewMonth = ref(now.getMonth());

// 选择中的起止（Date 对象，仅日期）
const startSel = ref(null);
const endSel = ref(null);
const activeQuick = ref("");
const startTime = ref("00:00:00");
const endTime = ref("23:59:59");

// 时/分/秒三列数据，供 multiSelector 使用
const pad2 = (n) => String(n).padStart(2, "0");
const timeColumns = (() => {
  const col = (max) => Array.from({ length: max + 1 }, (_, i) => pad2(i));
  return [col(23), col(59), col(59)];
})();
// 把 "HH:mm:ss" 拆成 [时,分,秒] 索引数组
function splitTime(str) {
  return String(str || "")
    .split(":")
    .map((n) => Number(n) || 0);
}
// 把 [时,分,秒] 索引数组拼回 "HH:mm:ss"
function joinTime(parts) {
  const [h, m, s] = parts || [0, 0, 0];
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}
const startTimeParts = computed(() => splitTime(startTime.value));
const endTimeParts = computed(() => splitTime(endTime.value));

// 底部安全区域适配：动态读取设备安全区高度（兼容旋转/多窗口），
// 同时以 env(safe-area-inset-bottom) 作为 CSS 兜底，覆盖 iOS/Android 全面屏。
const safeAreaBottom = ref(0); // px
function readSafeArea() {
  try {
    const info =
      typeof uni.getWindowInfo === "function"
        ? uni.getWindowInfo()
        : uni.getSystemInfoSync();
    const insets = (info && info.safeAreaInsets) || {};
    const bottom = Number(insets.bottom) || 0;
    // 某些环境 safeAreaInsets 缺失，用 safeArea 与窗口高度差兜底估算
    if (!bottom && info && info.safeArea && info.screenHeight) {
      safeAreaBottom.value = Math.max(0, info.screenHeight - info.safeArea.bottom);
    } else {
      safeAreaBottom.value = bottom;
    }
  } catch (e) {
    safeAreaBottom.value = 0;
  }
}
const safeAreaStyle = computed(() => ({
  // safeAreaBottom 为逻辑 px；40rpx 为基础间距，混用 px+rpx 由小程序运行时处理
  paddingBottom: `calc(${safeAreaBottom.value}px + 40rpx)`,
}));
readSafeArea();
// 旋转 / 多窗口 / 分屏等场景尺寸变化
function onWindowResize() {
  readSafeArea();
}
onMounted(() => {
  if (typeof uni.onWindowResize === "function") {
    uni.onWindowResize(onWindowResize);
  }
});
onUnmounted(() => {
  if (typeof uni.offWindowResize === "function") {
    uni.offWindowResize(onWindowResize);
  }
});

// 打开时同步外部值到内部
watch(
  () => props.visible,
  (v) => {
    if (!v) return;
    readSafeArea();
    const { start, end, startTime: st, endTime: et } = props.modelValue || {};
    startSel.value = start ? parseDate(start) : null;
    endSel.value = end ? parseDate(end) : null;
    if (startSel.value) {
      viewYear.value = startSel.value.getFullYear();
      viewMonth.value = startSel.value.getMonth();
    } else {
      viewYear.value = now.getFullYear();
      viewMonth.value = now.getMonth();
    }
    startTime.value = st || "00:00:00";
    endTime.value = et || "23:59:59";
    activeQuick.value = "";
  },
  { immediate: true }
);

function parseDate(key) {
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11;
    viewYear.value -= 1;
  } else {
    viewMonth.value -= 1;
  }
}
function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0;
    viewYear.value += 1;
  } else {
    viewMonth.value += 1;
  }
}

const gridCells = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate();
  const cells = [];
  let key = 0;
  // 前置空白
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ key: `blank-${key++}`, date: null, day: "" });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      key: `d-${key++}`,
      date: new Date(viewYear.value, viewMonth.value, d),
      day: d,
    });
  }
  // 补齐最后一行
  while (cells.length % 7 !== 0) {
    cells.push({ key: `blank-${key++}`, date: null, day: "" });
  }
  return cells;
});

function fmt(d) {
  return formatDateKey(d);
}

function pickDate(d) {
  // 未选起点 或 已选起止 => 重新开始
  if (!startSel.value || (startSel.value && endSel.value)) {
    startSel.value = d;
    endSel.value = null;
    activeQuick.value = "custom";
    return;
  }
  // 已有起点，未选终点
  if (d < startSel.value) {
    endSel.value = startSel.value;
    startSel.value = d;
  } else {
    endSel.value = d;
  }
  activeQuick.value = "custom";
}

function cellClass(cell) {
  if (!cell.date) return "is-blank";
  const c = [];
  const t = fmt(cell.date);
  const s = startSel.value ? fmt(startSel.value) : "";
  const e = endSel.value ? fmt(endSel.value) : "";
  if (t === s) c.push("is-start");
  if (t === e) c.push("is-end");
  if (s && e && cell.date > startSel.value && cell.date < endSel.value)
    c.push("is-range");
  return c;
}

function applyQuick(q) {
  const today = new Date();
  let start, end;
  if (props.quickRangeDirection === "future") {
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    end.setDate(end.getDate() + (q.days - 1));
  } else {
    end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() - (q.days - 1));
  }
  startSel.value = start;
  endSel.value = end;
  activeQuick.value = q.key;
  viewYear.value = startSel.value.getFullYear();
  viewMonth.value = startSel.value.getMonth();
}

function setCustom() {
  activeQuick.value = "custom";
}

const displayRange = computed(() => {
  const s = startSel.value ? fmt(startSel.value) : "—";
  const e = endSel.value ? fmt(endSel.value) : "—";
  return `${s}  ~  ${e}`;
});

function onClear() {
  startSel.value = null;
  endSel.value = null;
  activeQuick.value = "";
  emit("update:modelValue", { start: "", end: "" });
}

function onCancel() {
  emit("update:visible", false);
}

function onConfirm() {
  const payload = {
    start: startSel.value ? fmt(startSel.value) : "",
    end: endSel.value ? fmt(endSel.value) : "",
    startTime: startTime.value,
    endTime: endTime.value,
  };
  emit("update:modelValue", {
    start: payload.start,
    end: payload.end,
  });
  emit("confirm", payload);
  emit("update:visible", false);
}
</script>

<style scoped lang="scss">
.drp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 400;
  display: flex;
  align-items: flex-end;

  .drp-sheet {
    width: 100%;
    background: #fff;
    border-radius: 28rpx 28rpx 0 0;
    padding: 24rpx 24rpx 0;
    box-sizing: border-box;
  }

  .drp-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16rpx;

    .drp-title {
      font-size: 30rpx;
      font-weight: 700;
      color: #1f2d3d;
    }

    .drp-close {
      font-size: 32rpx;
      color: #9aa5b1;
      padding: 8rpx 16rpx;
    }
  }

  .drp-quick {
    white-space: nowrap;
    margin-bottom: 16rpx;

    .drp-quick-item {
      display: inline-block;
      padding: 12rpx 28rpx;
      margin-right: 16rpx;
      font-size: 24rpx;
      color: #5a6b7b;
      background: #f2f5f8;
      border-radius: 999rpx;

      &.active {
        color: #fff;
        background: var(--g5);
      }
    }
  }

  .drp-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 8rpx 0 16rpx;

    .drp-nav-btn {
      font-size: 40rpx;
      color: var(--g5);
      padding: 0 24rpx;
    }

    .drp-nav-title {
      font-size: 28rpx;
      font-weight: 600;
      color: #1f2d3d;
    }
  }

  .drp-week {
    display: flex;
    margin-bottom: 8rpx;

    .drp-week-cell {
      flex: 1;
      text-align: center;
      font-size: 24rpx;
      color: #9aa5b1;
    }
  }

  .drp-grid {
    display: flex;
    flex-wrap: wrap;

    .drp-cell {
      width: 14.285%;
      height: 76rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      &.is-blank {
        visibility: hidden;
      }

      .drp-cell-num {
        width: 56rpx;
        height: 56rpx;
        line-height: 56rpx;
        text-align: center;
        font-size: 26rpx;
        color: #1f2d3d;
        border-radius: 50%;
      }

      &.is-range .drp-cell-num {
        background: var(--g2-0);
        border-radius: 0;
        width: 100%;
      }

      &.is-start .drp-cell-num,
      &.is-end .drp-cell-num {
        background: var(--g5);
        color: #fff;
      }
    }
  }

  .drp-time {
    margin-top: 16rpx;
    border-top: 2rpx solid #eef1f4;
    padding-top: 16rpx;

    .drp-time-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8rpx 0;

      .drp-time-label {
        font-size: 26rpx;
        color: #5a6b7b;
      }

      .drp-time-val {
        font-size: 26rpx;
        color: #1f2d3d;
        background: #f2f5f8;
        padding: 8rpx 24rpx;
        border-radius: 12rpx;
      }
    }
  }

  .drp-selected {
    margin: 36rpx 0 24rpx;
    text-align: center;

    .drp-selected-text {
      font-size: 26rpx;
      color: var(--ink3);
      font-weight: 600;
    }
  }

  .drp-actions {
    display: flex;
    gap: 20rpx;

    .drp-btn {
      flex: 1;
      text-align: center;
      padding: 22rpx 0;
      border-radius: 16rpx;
      font-size: 28rpx;
      font-weight: 600;
    }

    .drp-btn-clear {
      background: #f2f5f8;
      color: #5a6b7b;
    }

    .drp-btn-confirm {
      background: var(--g5);
      color: #fff;
    }
  }
}
</style>
