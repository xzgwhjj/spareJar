<template>
  <view class="limit-page" data-cmp="LimitSetting">
    <!-- 顶部栏 -->
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">限额设置</text>
      <view class="history-entry" @click="goHistory"><text>历史</text></view>
    </view>

    <scroll-view
      class="page-scroll"
      scroll-y
      enhanced
      :show-scrollbar="false"
      style="flex: 1"
    >
      <!-- 维度选择 -->
      <view class="glass-mid card-in-1" style="margin: 32rpx; padding: 36rpx">
        <!-- 待：替换图标 -->
        <text class="section-title">🎯 限额维度</text>
        <view class="seg-row">
          <view
            v-for="d in dims"
            :key="d.value"
            class="seg-item"
            :class="{ active: dim === d.value }"
            @click="selectDim(d.value)"
          >
            <text>{{ d.label }}</text>
          </view>
        </view>
        <text class="seg-tip">仅可配置一种维度，系统自动向下拆分为每日额度</text>
      </view>

      <!-- 拆分策略 -->
      <view
        v-if="dim !== 'day'"
        class="glass-mid card-in-1"
        style="margin: 0 32rpx 32rpx; padding: 36rpx"
      >
        <!-- 待：替换图标 -->
        <text class="section-title">⚙️ 分配策略</text>
        <block v-if="dim === 'year'">
          <view class="strategy-label">年 → 月</view>
          <view class="seg-row sm">
            <view
              v-for="s in strategies"
              :key="'y' + s.value"
              class="seg-item"
              :class="{ active: yearStrategy === s.value }"
              @click="yearStrategy = s.value"
            >
              <text>{{ s.label }}</text>
            </view>
          </view>
        </block>
        <view class="strategy-label">月 → 日</view>
        <view class="seg-row sm">
          <view
            v-for="s in strategies"
            :key="'m' + s.value"
            class="seg-item"
            :class="{ active: monthStrategy === s.value }"
            @click="monthStrategy = s.value"
          >
            <text>{{ s.label }}</text>
          </view>
        </view>
        <text class="strategy-tip"
          >均分：每天固定基线；剩余滚动：每日按「剩余池 ÷ 剩余天数」动态重算</text
        >
      </view>

      <!-- 总池配置 -->
      <view class="glass-mid card-in-1" style="margin: 0 32rpx 32rpx; padding: 36rpx">
        <text class="section-title">{{ poolTitle }}</text>
        <view class="slider-value-row">
          <text class="slider-value">¥{{ poolYuan }}</text>
          <text class="slider-hint">每{{ poolUnit }}最高可分配金额</text>
        </view>
        <slider
          class="custom-slider"
          :value="poolYuan"
          :min="poolMin"
          :max="poolMax"
          step="1"
          activeColor="#25cc5d"
          backgroundColor="rgba(194,242,200,0.3)"
          blockColor="#25cc5d"
          blockSize="22"
          @change="onSlide"
          @changing="onSlide"
        />
        <view class="input-row">
          <text class="input-prefix">¥</text>
          <number-field
            class="limit-input"
            :model-value="poolYuan"
            placeholder="输入整数金额"
            title="总池"
            :decimal-places="0"
            :max-integer="15"
            @update:model-value="onInputValue"
          />
          <text class="input-unit">/{{ poolUnit }}</text>
        </view>
        <view class="slider-labels">
          <text>¥{{ poolMin }}</text>
          <text>¥{{ poolMax }}</text>
        </view>

        <!-- 实时预估 -->
        <view class="preview-box" v-if="dim !== 'day'">
          <text class="preview-label">预估每日额度</text>
          <text class="preview-value">¥{{ estDailyYuan }}</text>
          <text class="preview-sub"
            >{{ strategyLabel }} · 本月约 ¥{{ estMonthYuan }}/月</text
          >
        </view>
      </view>

      <!-- 局部微调（年维度不支持临时调整） -->
      <view
        v-if="dim !== 'year'"
        class="glass-mid card-in-1"
        style="margin: 0 32rpx 32rpx; padding: 36rpx"
      >
        <view class="collapse-head" @click="showOverride = !showOverride">
          <text class="section-title" style="margin-bottom: 0">🔧 临时调整</text>
          <!-- 待：替换图标 -->
          <text class="collapse-arrow">{{ showOverride ? "∧" : "∨" }}</text>
        </view>
        <view v-if="showOverride">
          <text class="override-tip"
            >可临时覆盖最近
            {{ dim === "day" ? "7 天" : "1~3 个月" }}
            的额度，次日生效，过期自动失效。</text
          >

          <!-- 批量覆盖未来 7 天（仅日维度） -->
          <view v-if="dim === 'day'" class="batch-entry" @click="openBatch">
            <text class="batch-entry-text">📅 批量覆盖未来 7 天</text>
            <text class="batch-entry-arrow">›</text>
          </view>

          <!-- 批量覆盖未来 1~3 个月（仅月/年维度） -->
          <view v-if="dim !== 'day'" class="batch-entry" @click="openMonthBatch">
            <text class="batch-entry-text">🗓️ 批量覆盖未来 1~3 个月</text>
            <text class="batch-entry-arrow">›</text>
          </view>

          <!-- 日覆盖（仅日维度） -->
          <view v-if="dim === 'day'" class="override-add">
            <view class="ov-input-group">
              <text class="ov-prefix">日期</text>
              <picker
                mode="date"
                :value="ovDayKey"
                :start="ovDayStart"
                :end="ovDayEnd"
                @change="onOvDayChange"
              >
                <view class="ov-picker"
                  ><text>{{ ovDayKey }}</text></view
                >
              </picker>
            </view>
            <view class="ov-input-group grow">
              <text class="ov-prefix">¥</text>
              <number-field
                class="ov-field"
                :model-value="ovDayAmount"
                placeholder="当日额度"
                title="当日额度"
                :decimal-places="0"
                :max-integer="7"
                @update:model-value="(v) => (ovDayAmount = Number(v))"
              />
            </view>
            <view class="ov-add-btn" @click="addDayOverride"><text>＋</text></view>
          </view>

          <!-- 月覆盖（仅 month/year 维度） -->
          <view v-if="dim !== 'day'" class="override-add" style="margin-top: 20rpx">
            <view class="ov-input-group">
              <text class="ov-prefix">月份</text>
              <picker
                mode="date"
                fields="month"
                :value="ovMonthKey"
                :start="ovMonthStart"
                :end="ovMonthEnd"
                @change="onOvMonthChange"
              >
                <view class="ov-picker"
                  ><text>{{ ovMonthKey }}</text></view
                >
              </picker>
            </view>
            <view class="ov-input-group grow">
              <text class="ov-prefix">¥</text>
              <number-field
                class="ov-field"
                :model-value="ovMonthAmount"
                placeholder="当月总池"
                title="当月总池"
                :decimal-places="0"
                :max-integer="7"
                @update:model-value="(v) => (ovMonthAmount = Number(v))"
              />
            </view>
            <view class="ov-add-btn" @click="addMonthOverride"><text>＋</text></view>
          </view>

          <!-- 已添加列表 -->
          <view v-if="overrideList.length" class="ov-list">
            <view v-for="(o, i) in overrideList" :key="i" class="ov-item">
              <text class="ov-item-key"
                >{{ o.type === "day" ? "日" : "月" }} · {{ o.key }}</text
              >
              <text class="ov-item-amt">¥{{ Math.round(o.amount_fen / 100) }}</text>
              <text class="ov-item-del" @click="removeOverride(i)">✕</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 保存 -->
      <view style="padding: 0 32rpx 60rpx">
        <view class="save-btn" @click="saveSettings">
          <text>💾 保存设置</text>
        </view>
        <view class="dual-btn">
          <view class="reset-btn" @click="resetSettings">
            <text>恢复默认（日 ¥100）</text>
          </view>
          <view class="cancel-btn" @click="cancelLimit">
            <text>取消限额（明日生效）</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 批量覆盖未来 7 天弹框 -->
    <view v-if="batchVisible" class="batch-mask" @click="closeBatch">
      <view class="batch-sheet" @click.stop>
        <view class="batch-head">
          <text class="batch-title">批量覆盖未来 7 天</text>
          <text class="batch-close" @click="closeBatch">✕</text>
        </view>
        <text class="batch-sub">留空 = 不改；填 0 = 取消当天限额。次日生效。</text>
        <view class="batch-list">
          <view v-for="(row, i) in batchRows" :key="row.dateKey" class="batch-row">
            <view class="batch-date">
              <text class="batch-dow">{{ row.dow }}</text>
              <text class="batch-dk">{{ row.dateKey.slice(5) }}</text>
            </view>
            <view class="batch-input-wrap">
              <text class="batch-yen">¥</text>
              <input
                class="batch-input"
                type="digit"
                :value="row.value"
                :placeholder="row.placeholder"
                placeholder-class="batch-ph"
                maxlength="7"
                @input="(e) => onBatchInput(i, e.detail.value)"
              />
            </view>
            <view v-if="i < batchRows.length - 1" class="batch-copy" @click="copyDown(i)">
              <text>↓</text>
            </view>
            <view v-else class="batch-copy batch-copy--disabled">
              <text>↓</text>
            </view>
          </view>
        </view>
        <view class="batch-actions">
          <view class="batch-cancel" @click="closeBatch">
            <text>取消</text>
          </view>
          <view class="batch-confirm" @click="confirmBatch">
            <text>应用到 7 天</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 批量覆盖未来 1~3 个月弹框 -->
    <view v-if="monthBatchVisible" class="batch-mask" @click="closeMonthBatch">
      <view class="batch-sheet" @click.stop>
        <view class="batch-head">
          <text class="batch-title">批量设置月度限额</text>
          <text class="batch-close" @click="closeMonthBatch">✕</text>
        </view>
        <text class="batch-sub"
          >为接下来 3 个月分别设置月度限额。留空保持原样，填 0 即取消该月限额，保存后次月生效。</text
        >
        <view class="batch-list">
          <view
            v-for="(row, i) in monthBatchRows"
            :key="row.monthKey"
            class="batch-row"
          >
            <view class="batch-date" style="width: 140rpx">
              <text class="batch-dow">{{ row.label }}</text>
              <text class="batch-dk">{{ row.monthKey }}</text>
            </view>
            <view class="batch-input-wrap">
              <text class="batch-yen">¥</text>
              <input
                class="batch-input"
                type="digit"
                :value="row.value"
                placeholder="不改"
                placeholder-class="batch-ph"
                maxlength="8"
                @input="(e) => onMonthBatchInput(i, e.detail.value)"
              />
            </view>
            <view
              v-if="i < monthBatchRows.length - 1"
              class="batch-copy"
              @click="copyMonthDown(i)"
            >
              <text>↓</text>
            </view>
            <view v-else class="batch-copy batch-copy--disabled">
              <text>↓</text>
            </view>
          </view>
        </view>
        <view class="batch-actions">
          <view class="batch-cancel" @click="closeMonthBatch">
            <text>取消</text>
          </view>
          <view class="batch-confirm" @click="confirmMonthBatch">
            <text>应用到月份</text>
          </view>
        </view>
      </view>
    </view>

    <amount-keyboard />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useUserStore } from "@/stores/user.js";
import { updateSettings } from "@/api/sparejar.js";
import { todayDateKey, addDaysToDateKey } from "@/utils/date.js";
import {
  computeDayBaseLimit,
  validateOverride,
  addOverride,
  pruneOverrides,
} from "@/utils/limitEngine.js";

const { state, loadSettings, refreshTodayDashboard } = useUserStore();

const DEFAULT_YUAN = 100; // 日维度默认（与 onboarding 一致）
const DIM_DEFAULT_YUAN = { day: 100, month: 3000, year: 36000 };
const dimDefaultYuan = (d = dim.value) => DIM_DEFAULT_YUAN[d] || DEFAULT_YUAN;
const dims = [
  { value: "day", label: "日", unit: "天" },
  { value: "month", label: "月", unit: "月" },
  { value: "year", label: "年", unit: "年" },
];
const strategies = [
  { value: "equal", label: "均分" },
  { value: "rollover", label: "剩余滚动" },
];

/* ---- 响应式表单状态 ---- */
const dim = ref("day");
const yearStrategy = ref("equal");
const monthStrategy = ref("equal");
const poolYuan = ref(dimDefaultYuan());
const overrides = ref([]);

const showOverride = ref(false);
const ovDayKey = ref(todayDateKey());
const ovDayAmount = ref(dimDefaultYuan("day"));
const ovMonthKey = ref(todayDateKey().slice(0, 7));
const ovMonthAmount = ref(dimDefaultYuan("month"));

/* ---- 派生 ---- */
const dimMeta = computed(() => dims.find((d) => d.value === dim.value) || dims[0]);
const dimLabel = computed(() => dimMeta.value.label);
const poolUnit = computed(() => dimMeta.value.unit);
const poolTitle = computed(
  () =>
    ({
      day: "每日限额",
      month: "每月总限额",
      year: "每年总限额",
    }[dim.value] || "总限额")
);
const poolMin = computed(() => 1);
const poolMax = computed(() => (dim.value === "day" ? 2000 : 1000000));

const overrideList = computed(() => overrides.value);

const estSettings = computed(() => ({
  limit_dim: dim.value,
  limit_amount_fen: dim.value === "day" ? null : poolYuan.value * 100,
  daily_base_limit: dim.value === "day" ? poolYuan.value * 100 : null,
  year_strategy: yearStrategy.value,
  month_strategy: monthStrategy.value,
  overrides: overrides.value,
}));

const estDailyFen = computed(() =>
  computeDayBaseLimit(estSettings.value, todayDateKey())
);
const estDailyYuan = computed(() => Math.round(estDailyFen.value / 100));
const estMonthYuan = computed(() =>
  Math.round((estDailyFen.value / 100) * new Date().getDate() || poolYuan.value / 30)
);
const strategyLabel = computed(() => {
  if (dim.value === "day") return "按日固定";
  return monthStrategy.value === "equal" ? "日均分" : "月剩余滚动";
});

/* ---- 局部覆盖日期范围 ---- */
const ovDayStart = computed(() => todayDateKey());
const ovDayEnd = computed(() => addDaysToDateKey(todayDateKey(), 6));
const ovMonthStart = computed(() => todayDateKey().slice(0, 7));
const ovMonthEnd = computed(() => {
  const d = new Date(todayDateKey());
  d.setMonth(d.getMonth() + 2);
  return d.toISOString().slice(0, 7);
});

/* ---- 同步 ---- */
function syncFromSettings() {
  const s = state.settings;
  if (!s) return;
  dim.value = s.limit_dim || "day";
  yearStrategy.value = s.year_strategy || "equal";
  monthStrategy.value = s.month_strategy || "equal";
  overrides.value = pruneOverrides(s, todayDateKey());
  if (dim.value === "day") {
    const eff =
      s.pending_base_limit != null &&
      s.limit_effective_date &&
      s.limit_effective_date <= todayDateKey()
        ? s.pending_base_limit
        : s.daily_base_limit || 10000;
    poolYuan.value = Math.round(eff / 100);
  } else {
    poolYuan.value = Math.round((s.limit_amount_fen || 0) / 100) || dimDefaultYuan();
  }
}

onMounted(async () => {
  if (!state.settings) await loadSettings();
  syncFromSettings();
});

/* ---- 交互 ---- */
function selectDim(v) {
  dim.value = v;
  poolYuan.value = dimDefaultYuan(v);
}

const onSlide = (e) => {
  poolYuan.value = Number(e.detail.value);
};
const onInputValue = (val) => {
  const v = Number(val);
  if (Number.isFinite(v)) {
    // 输入框不设上限（滑块仅作可视化，停在最大端即可）
    poolYuan.value = Math.max(poolMin.value, Math.floor(v));
  }
};

function onOvDayChange(e) {
  ovDayKey.value = e.detail.value;
}
function onOvMonthChange(e) {
  ovMonthKey.value = e.detail.value;
}

function addDayOverride() {
  const rec = {
    type: "day",
    key: ovDayKey.value,
    amount_fen: Math.round(Number(ovDayAmount.value) * 100),
  };
  const v = validateOverride(estSettings.value, rec, todayDateKey());
  if (!v.ok) return uni.showToast({ title: v.error, icon: "none" });
  overrides.value = addOverride({ overrides: overrides.value }, rec, todayDateKey());
}
function addMonthOverride() {
  const rec = {
    type: "month",
    key: ovMonthKey.value,
    amount_fen: Math.round(Number(ovMonthAmount.value) * 100),
  };
  const v = validateOverride(estSettings.value, rec, todayDateKey());
  if (!v.ok) return uni.showToast({ title: v.error, icon: "none" });
  overrides.value = addOverride({ overrides: overrides.value }, rec, todayDateKey());
}
function removeOverride(i) {
  overrides.value = overrides.value.filter((_, idx) => idx !== i);
}

/* ---- 批量覆盖未来 7 天 ---- */
const batchVisible = ref(false);
const DOW = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const batchRows = ref([]);

function buildBatchRows() {
  const today = todayDateKey();
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const dateKey = addDaysToDateKey(today, i);
    const d = new Date(dateKey);
    const exist = overrides.value.find((o) => o.type === "day" && o.key === dateKey);
    rows.push({
      dateKey,
      dow: DOW[d.getDay()],
      value: exist ? String(Math.round(exist.amount_fen / 100)) : "",
      placeholder: i === 0 ? "今日(明日生效)" : "不改",
    });
  }
  return rows;
}

function openBatch() {
  batchRows.value = buildBatchRows();
  batchVisible.value = true;
}
function closeBatch() {
  batchVisible.value = false;
}
function onBatchInput(i, val) {
  // 仅保留数字
  const cleaned = val.replace(/[^\d]/g, "");
  batchRows.value[i].value = cleaned;
}
function copyDown(i) {
  const src = batchRows.value[i].value;
  if (src === "") return;
  for (let j = i + 1; j < batchRows.value.length; j++) {
    if (batchRows.value[j].value === "") batchRows.value[j].value = src;
    else break; // 遇到已填值停止，避免覆盖用户手动输入
  }
}
function confirmBatch() {
  let changed = 0;
  batchRows.value.forEach((row) => {
    const raw = row.value.trim();
    if (raw === "") return; // 不改
    const yuan = Number(raw);
    if (!Number.isFinite(yuan)) return;
    const rec = {
      type: "day",
      key: row.dateKey,
      amount_fen: Math.round(yuan * 100),
    };
    const v = validateOverride(estSettings.value, rec, todayDateKey());
    if (!v.ok) {
      uni.showToast({ title: `${row.dateKey}：${v.error}`, icon: "none" });
      return;
    }
    overrides.value = addOverride({ overrides: overrides.value }, rec, todayDateKey());
    changed++;
  });
  batchVisible.value = false;
  if (changed > 0) uni.showToast({ title: `已应用 ${changed} 天`, icon: "success" });
  else uni.showToast({ title: "未做修改", icon: "none" });
}

/* ---- 批量覆盖未来 1~3 个月 ---- */
const monthBatchVisible = ref(false);
const MONTH_LABELS = ["本月", "下月", "再下月"];
const monthBatchRows = ref([]);

function addMonthsToMonthKey(monthKey, n) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthBatchRows() {
  const base = todayDateKey().slice(0, 7);
  const rows = [];
  for (let i = 0; i < 3; i++) {
    const monthKey = addMonthsToMonthKey(base, i);
    const exist = overrides.value.find(
      (o) => o.type === "month" && o.key === monthKey
    );
    rows.push({
      monthKey,
      label: MONTH_LABELS[i],
      value: exist ? String(Math.round(exist.amount_fen / 100)) : "",
    });
  }
  return rows;
}

function openMonthBatch() {
  monthBatchRows.value = buildMonthBatchRows();
  monthBatchVisible.value = true;
}
function closeMonthBatch() {
  monthBatchVisible.value = false;
}
function onMonthBatchInput(i, val) {
  const cleaned = val.replace(/[^\d]/g, "");
  monthBatchRows.value[i].value = cleaned;
}
function copyMonthDown(i) {
  const src = monthBatchRows.value[i].value;
  if (src === "") return;
  for (let j = i + 1; j < monthBatchRows.value.length; j++) {
    if (monthBatchRows.value[j].value === "") monthBatchRows.value[j].value = src;
    else break;
  }
}
function confirmMonthBatch() {
  let changed = 0;
  monthBatchRows.value.forEach((row) => {
    const raw = row.value.trim();
    if (raw === "") return;
    const yuan = Number(raw);
    if (!Number.isFinite(yuan)) return;
    const rec = {
      type: "month",
      key: row.monthKey,
      amount_fen: Math.round(yuan * 100),
    };
    const v = validateOverride(estSettings.value, rec, todayDateKey());
    if (!v.ok) {
      uni.showToast({ title: `${row.monthKey}：${v.error}`, icon: "none" });
      return;
    }
    overrides.value = addOverride({ overrides: overrides.value }, rec, todayDateKey());
    changed++;
  });
  monthBatchVisible.value = false;
  if (changed > 0) uni.showToast({ title: `已应用 ${changed} 个月`, icon: "success" });
  else uni.showToast({ title: "未做修改", icon: "none" });
}

/* ---- 保存（次日生效） ---- */
async function saveSettings() {
  const val = Math.floor(Number(poolYuan.value));
  if (!Number.isFinite(val) || val < 1 || !Number.isInteger(val)) {
    return uni.showToast({ title: "总池需为整数且 ≥ 1 元", icon: "none" });
  }
  const tomorrow = addDaysToDateKey(todayDateKey(), 1);
  const payload = {
    limit_dim: dim.value,
    pending_limit_dim: dim.value,
    limit_effective_date: tomorrow,
    overrides: overrides.value,
  };
  if (dim.value === "day") {
    payload.pending_base_limit = val * 100;
    payload.pending_amount_fen = null;
  } else {
    payload.pending_amount_fen = val * 100;
    payload.pending_year_strategy = yearStrategy.value;
    payload.pending_month_strategy = monthStrategy.value;
    payload.pending_base_limit = null;
  }
  try {
    await updateSettings(payload);
    await loadSettings();
    syncFromSettings();
    await refreshTodayDashboard({ force: true });
    uni.showToast({ title: "将于明日生效", icon: "success" });
  } catch (err) {
    uni.showToast({ title: (err && err.message) || "保存失败", icon: "none" });
  }
}

async function resetSettings() {
  try {
    await updateSettings({
      limit_dim: "day",
      pending_limit_dim: "day",
      pending_base_limit: DEFAULT_YUAN * 100,
      pending_amount_fen: null,
      limit_effective_date: addDaysToDateKey(todayDateKey(), 1),
      overrides: [],
    });
    await loadSettings();
    syncFromSettings();
    await refreshTodayDashboard({ force: true });
    uni.showToast({ title: "已恢复默认（明日生效）", icon: "success" });
  } catch (err) {
    uni.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
  }
}

/* ---- 取消限额（次日生效，归零后 hasLimit 变为 false） ---- */
async function cancelLimit() {
  const confirmed = await new Promise((resolve) => {
    uni.showModal({
      title: "取消限额",
      content: "取消后将不再限制你的每日/每月/每年花费，明日生效。确定吗？",
      confirmText: "取消限额",
      confirmColor: "#e07a7a",
      success: (r) => resolve(!!r.confirm),
      fail: () => resolve(false),
    });
  });
  if (!confirmed) return;
  try {
    const tomorrow = addDaysToDateKey(todayDateKey(), 1);
    await updateSettings({
      // 保留原维度声明，但把金额全部归零，使 hasLimit=false（无限制）
      limit_dim: dim.value === "month" || dim.value === "year" ? dim.value : "day",
      pending_limit_dim:
        dim.value === "month" || dim.value === "year" ? dim.value : "day",
      pending_base_limit: 0,
      pending_amount_fen: 0,
      pending_year_strategy: yearStrategy.value,
      pending_month_strategy: monthStrategy.value,
      limit_effective_date: tomorrow,
      overrides: [],
    });
    await loadSettings();
    syncFromSettings();
    await refreshTodayDashboard({ force: true });
    uni.showToast({ title: "已取消限额（明日生效）", icon: "success" });
  } catch (err) {
    uni.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
  }
}

const goBack = () => uni.navigateBack();
const goHistory = () => uni.navigateTo({ url: "/pages/limit-history/limit-history" });
</script>

<style scoped lang="scss">
.limit-page {
  @include sj-theme-css-vars;
  width: 750rpx;
  height: 100vh;
  margin: 0 auto;
  background: linear-gradient(180deg, var(--g0), var(--g1), #ffffff);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 88rpx 32rpx 20rpx;
}
.back-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: var(--white-75);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--ink3);
  font-size: 32rpx;
}
.topbar-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--ink);
}
.history-entry {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--g5);
  cursor: pointer;
}

.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink);
  display: block;
  margin-bottom: 24rpx;
}

.seg-row {
  display: flex;
  gap: 16rpx;
}
.seg-row.sm {
  margin-bottom: 20rpx;
}
.seg-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 24rpx;
  background: var(--g0);
  border: 1px solid var(--g2-1);
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink3);
  cursor: pointer;
}
.seg-item.active {
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
  border-color: transparent;
  box-shadow: 0 6rpx 24rpx rgba(37, 204, 93, 0.3);
}
.seg-tip {
  font-size: 22rpx;
  color: var(--ink4);
  margin-top: 20rpx;
  display: block;
}

.strategy-label {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--ink3);
  margin: 8rpx 0 16rpx;
}
.strategy-tip {
  font-size: 22rpx;
  color: var(--ink4);
  margin-top: 20rpx;
  display: block;
}

.slider-value-row {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.slider-value {
  font-size: 64rpx;
  font-weight: 900;
  color: var(--g5);
}
.slider-hint {
  font-size: 24rpx;
  color: var(--ink4);
}
.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 20rpx;
  color: var(--ink4);
  margin-top: 8rpx;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 28rpx;
  background: var(--g1);
  border: 1px solid var(--g2-1);
  border-radius: 28rpx;
  padding: 0 28rpx;
  height: 92rpx;
}
.input-prefix {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--g5);
}
.limit-input {
  flex: 1;
  font-size: 32rpx;
  font-weight: 700;
  color: var(--ink);
}
.input-unit {
  font-size: 24rpx;
  color: var(--ink4);
}

.preview-box {
  margin-top: 32rpx;
  padding: 24rpx 28rpx;
  border-radius: 24rpx;
  background: rgba(37, 204, 93, 0.08);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.preview-label {
  font-size: 22rpx;
  color: var(--ink4);
}
.preview-value {
  font-size: 44rpx;
  font-weight: 900;
  color: var(--g5);
}
.preview-sub {
  font-size: 22rpx;
  color: var(--ink3);
}

.collapse-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.collapse-arrow {
  font-size: 28rpx;
  color: var(--ink4);
}
.override-tip {
  font-size: 22rpx;
  color: var(--ink4);
  margin: 20rpx 0;
  display: block;
}

.override-add {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.ov-input-group {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: var(--g1);
  border: 1px solid var(--g2-1);
  border-radius: 24rpx;
  padding: 0 20rpx;
  height: 84rpx;
}
.ov-input-group.grow {
  flex: 1;
}
.ov-prefix {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--g5);
}
.ov-picker {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ink);
}
.ov-field {
  flex: 1;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink);
}
.ov-add-btn {
  width: 84rpx;
  height: 84rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
  font-size: 40rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.ov-list {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.ov-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--g1);
  border-radius: 20rpx;
  padding: 16rpx 24rpx;
}
.ov-item-key {
  font-size: 24rpx;
  color: var(--ink3);
  font-weight: 600;
}
.ov-item-amt {
  font-size: 26rpx;
  font-weight: 800;
  color: var(--ink);
}
.ov-item-del {
  font-size: 26rpx;
  color: var(--red-soft);
  cursor: pointer;
  padding: 0 8rpx;
}

.save-btn {
  width: 100%;
  padding: 28rpx;
  border-radius: 32rpx;
  background: linear-gradient(135deg, var(--g4), var(--g5));
  text-align: center;
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8rpx 40rpx rgba(37, 204, 93, 0.3);
}
.reset-btn {
  flex: 1;
  padding: 24rpx;
  border-radius: 28rpx;
  text-align: center;
  color: var(--ink4);
  font-size: 24rpx;
  font-weight: 600;
  cursor: pointer;
}
.cancel-btn {
  flex: 1;
  padding: 24rpx;
  border-radius: 28rpx;
  text-align: center;
  color: var(--r6);
  font-size: 24rpx;
  font-weight: 600;
  cursor: pointer;
}
.dual-btn {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}

/* ---- 批量覆盖入口 ---- */
.batch-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--g1);
  border: 1px solid var(--g2-1);
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  margin: 24rpx 0;
  cursor: pointer;
}
.batch-entry-text {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ink3);
}
.batch-entry-arrow {
  font-size: 36rpx;
  color: var(--ink4);
}

/* ---- 批量覆盖弹框 ---- */
.batch-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}
.batch-sheet {
  width: 750rpx;
  max-height: 86vh;
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
  padding: 36rpx 32rpx calc(36rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}
.batch-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.batch-title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--ink);
}
.batch-close {
  font-size: 32rpx;
  color: var(--ink4);
  padding: 8rpx 16rpx;
  cursor: pointer;
}
.batch-sub {
  font-size: 22rpx;
  color: var(--ink4);
  margin: 12rpx 0 24rpx;
  display: block;
}
.batch-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  overflow-y: auto;
}
.batch-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.batch-date {
  width: 112rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.batch-dow {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--ink3);
}
.batch-dk {
  font-size: 20rpx;
  color: var(--ink4);
}
.batch-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: var(--g1);
  border: 1px solid var(--g2-1);
  border-radius: 20rpx;
  padding: 0 24rpx;
  height: 80rpx;
}
.batch-yen {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--g5);
}
.batch-input {
  flex: 1;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink);
}
.batch-ph {
  color: var(--ink4);
  font-weight: 500;
}
.batch-copy {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: var(--g0);
  border: 1px solid var(--g2-1);
  color: var(--g5);
  font-size: 30rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.batch-copy--disabled {
  opacity: 0.35;
  pointer-events: none;
}
.batch-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 32rpx;
}
.batch-cancel {
  flex: 1;
  padding: 26rpx;
  border-radius: 28rpx;
  text-align: center;
  background: var(--g1);
  color: var(--ink3);
  font-size: 28rpx;
  font-weight: 700;
  cursor: pointer;
}
.batch-confirm {
  flex: 2;
  padding: 26rpx;
  border-radius: 28rpx;
  text-align: center;
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8rpx 40rpx rgba(37, 204, 93, 0.3);
}
</style>
