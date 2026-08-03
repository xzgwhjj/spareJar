<template>
  <view class="num-input-wrap">
    <input
      class="num-input"
      :class="{
        'has-error': error,
        'is-disabled': disabled,
        'is-focused': focused,
      }"
      :value="displayValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="-1"
      :cursor-spacing="24"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    />
    <view v-if="error" class="num-input-error">{{ error }}</view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  /** 受控值 */
  value: { type: [String, Number], default: "" },
  /**
   * 小数位数：
   * - 0   → 仅整数，不允许输入小数点
   * - >=1 → 限制小数点后 N 位
   */
  decimalPlaces: { type: Number, default: 2 },
  /** 是否允许输入小数点（decimalPlaces=0 时强制 false） */
  allowDecimal: { type: Boolean, default: true },
  /** 是否禁用 */
  disabled: { type: Boolean, default: false },
  /** 占位符 */
  placeholder: { type: String, default: "请输入数字" },
  /** 是否必填（仅影响样式/校验，不自动拦截） */
  required: { type: Boolean, default: false },
});

const emit = defineEmits(["update:value", "change", "focus", "blur"]);

// ---- 内部状态 ----
const innerValue = ref(normalize(props.value));
const focused = ref(false);
const error = ref("");

// ---- 推导 ----
const maxDecimal = computed(() => {
  if (!props.allowDecimal) return 0;
  return props.decimalPlaces;
});

// ---- 显示值：受控 / 非受控 ----
const displayValue = computed(() => {
  const raw = props.value !== undefined && props.value !== null ? String(props.value) : innerValue.value;
  return raw;
});

// 外部值变化同步内部值
watch(
  () => props.value,
  (val) => {
    if (val !== undefined && val !== null) {
      innerValue.value = normalize(val);
    }
  },
);

// ---- 工具函数 ----
/** 把值规范为纯数字字符串 */
function normalize(val) {
  if (val === null || val === undefined) return "";
  const s = String(val).trim();
  // 允许空字符串
  if (s === "") return "";
  return s;
}

/** 核心过滤逻辑：只保留合法字符并限制小数位数 */
function filter(value, prev) {
  let filtered = "";

  // 1) 逐字符过滤：仅保留 0-9 和 .
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch >= "0" && ch <= "9") {
      filtered += ch;
    } else if (ch === ".") {
      // 只要第一个小数点
      if (!filtered.includes(".")) {
        // 若不允许小数或 decimalPlaces=0 且 allowDecimal=false → 跳过
        if (maxDecimal.value === 0) continue;
        filtered += ".";
      }
    }
    // 其它字符全部丢弃
  }

  // 2) 截断小数位
  const dotIdx = filtered.indexOf(".");
  if (dotIdx >= 0) {
    const intPart = filtered.slice(0, dotIdx);
    let decPart = filtered.slice(dotIdx + 1);
    if (decPart.length > maxDecimal.value) {
      decPart = decPart.slice(0, maxDecimal.value);
    }
    filtered = intPart + "." + decPart;
  }

  // 3) 去掉前导零（但保留 "0" 和 "0."）
  if (filtered.length > 1 && filtered[0] === "0" && filtered[1] !== ".") {
    filtered = filterLeadingZeros(filtered);
  }

  return filtered;
}

/** 去掉整数部分的前导零 */
function filterLeadingZeros(s) {
  const dotIdx = s.indexOf(".");
  if (dotIdx >= 0) {
    const intPart = s.slice(0, dotIdx);
    const decPart = s.slice(dotIdx);
    return (parseInt(intPart, 10) || 0).toString() + decPart;
  }
  return (parseInt(s, 10) || 0).toString();
}

/** 向外部派发值 */
function emitValue(val) {
  innerValue.value = val;
  // 统一以字符串输出，调用方自行 parseFloat
  emit("update:value", val);
  emit("change", val);
}

/** 校验并设置错误 */
function validate(val) {
  error.value = "";
  if (props.required && val === "") {
    error.value = "此项为必填";
    return false;
  }
  return true;
}

// ---- 事件处理 ----
function onInput(e) {
  const raw = e.detail?.value ?? "";
  const filtered = filter(raw, innerValue.value);
  validate(filtered);
  emitValue(filtered);
}

function onFocus(e) {
  focused.value = true;
  emit("focus", e);
}

function onBlur(e) {
  focused.value = false;
  // 失焦时格式化：去掉末尾多余的小数点
  let val = innerValue.value;
  if (val.endsWith(".")) {
    val = val.slice(0, -1);
    emitValue(val);
  }
  emit("blur", e);
}

// ---- 公开方法 ----
defineExpose({
  /** 手动获取当前值（字符串） */
  getValue: () => innerValue.value,
  /** 获取数值形式 */
  getNumber: () => {
    const v = innerValue.value;
    if (v === "" || v === ".") return null;
    return parseFloat(v);
  },
  /** 手动设置错误 */
  setError: (msg) => {
    error.value = msg;
  },
  /** 清除错误 */
  clearError: () => {
    error.value = "";
  },
  /** 重置 */
  reset: (val = "") => {
    innerValue.value = normalize(val);
    error.value = "";
  },
  /** 聚焦 */
  focus: () => {
    // uni-app 不支持 programmatic focus，通过 ref 调用
  },
});
</script>

<style scoped lang="scss">
.num-input-wrap {
  width: 100%;
}

.num-input {
  width: 100%;
  height: 88rpx;
  padding: 0 28rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--ink);
  background: var(--g0, #f7faf7);
  border: 2rpx solid var(--g2, #d9e9d9);
  border-radius: 18rpx;
  box-sizing: border-box;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;

  /* 占位符 */
  &::placeholder {
    color: var(--ink4);
    font-weight: 400;
  }

  /* 聚焦态 */
  &.is-focused {
    border-color: var(--g5);
    box-shadow: 0 0 0 6rpx rgba(37, 204, 93, 0.12);
  }

  /* 禁用态 */
  &.is-disabled {
    opacity: 0.5;
    background: var(--g1, #ecf5ec);
  }

  /* 错误态 */
  &.has-error {
    border-color: #ff6b6b;
    box-shadow: 0 0 0 6rpx rgba(255, 107, 107, 0.1);
  }
}

.num-input-error {
  margin-top: 8rpx;
  padding-left: 28rpx;
  font-size: 22rpx;
  color: #ff6b6b;
  line-height: 1.4;
}
</style>
