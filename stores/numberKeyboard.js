import { reactive } from "vue";

/**
 * 全局数字键盘状态（单例）。
 * 整个程序的数字/金额输入统一走同一个自定义键盘，
 * 避免各页面各自使用系统键盘，保证交互一致。
 */
const state = reactive({
  show: false,
  value: "",
  decimalPlaces: 2,
  maxInteger: 9,
  title: "",
  // 每次打开时由调用方注入的回调（非响应式，避免泄漏）
  _onInput: null,
  _onDone: null,
});

function open(opts = {}) {
  state.value = opts.value != null ? String(opts.value) : "";
  state.decimalPlaces = opts.decimalPlaces != null ? opts.decimalPlaces : 2;
  state.maxInteger = opts.maxInteger != null ? opts.maxInteger : 9;
  state.title = opts.title || "";
  state._onInput = typeof opts.onInput === "function" ? opts.onInput : null;
  state._onDone = typeof opts.onDone === "function" ? opts.onDone : null;
  state.show = true;
}

function emitInput(val) {
  if (state._onInput) state._onInput(val);
}

function close() {
  state.show = false;
  if (state._onDone) state._onDone(state.value);
  // 清空回调，避免跨页面残留
  state._onInput = null;
  state._onDone = null;
}

export function useNumberKeyboard() {
  return { state, open, close, emitInput };
}
