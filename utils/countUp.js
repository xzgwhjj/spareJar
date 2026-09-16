// 数值滚动动画工具（requestAnimationFrame + easeOutCubic）
// 小程序环境无 requestAnimationFrame，统一用 setTimeout 兜底。
import { ref } from "vue";

export const rafTick =
  typeof requestAnimationFrame === "function"
    ? (cb) => requestAnimationFrame(cb)
    : (cb) => setTimeout(cb, 16);
export const cancelRafTick =
  typeof cancelAnimationFrame === "function"
    ? (id) => cancelAnimationFrame(id)
    : (id) => clearTimeout(id);

// 单次滚动：把 [from, to] 在 dur 毫秒内以 easeOutCubic 缓动到目标值。
// setVal 用于把每帧值写回响应式变量；不传则无副作用（仅返回动画）。
export function animateValue(from, to, dur = 650, setVal) {
  const t0 = Date.now();
  const tick = () => {
    const p = Math.min(1, (Date.now() - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
    const v = from + (to - from) * e;
    if (setVal) setVal(v);
    if (p < 1) rafTick(tick);
    else if (setVal) setVal(to);
  };
  rafTick(tick);
}

// 可复用的滚动计数器：返回 { display, setTo }，display 为当前显示值（ref）。
export function createCountUp(dur = 650) {
  const display = ref(0);
  let raf = null;
  function setTo(to) {
    const from = display.value;
    const t0 = Date.now();
    if (raf) cancelRafTick(raf);
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      display.value = from + (to - from) * e;
      if (p < 1) raf = rafTick(tick);
      else display.value = to;
    };
    raf = rafTick(tick);
  }
  return { display, setTo };
}
