// 封面主色提取：将图片绘制到 16x16 小画布，取像素均值（跳过近白/近黑），返回 hex。
// 兼顾 H5（Image+canvas）与小程序/APP（Canvas 2D node + 网络图 downloadFile）。
// 结果按 src 缓存，避免重复计算。

const _cache = Object.create(null);

export function rgbToHex(r, g, b) {
  const h = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

// 把 hex 转 rgba 字符串，便于做浅底徽标背景
export function hexToRgba(hex, alpha = 1) {
  if (!hex) return '';
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// HSV → RGB → hex（自定义颜色选择器用）。h∈[0,360] s,v∈[0,100]
export function hsvToHex(h, s, v) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  v = Math.max(0, Math.min(100, v)) / 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return rgbToHex(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255));
}

// hex → HSV（打开自定义选择器时，用已选色初始化滑块位置）
export function hexToHsv(hex) {
  if (!hex) return { h: 0, s: 0, v: 0 };
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return { h: 0, s: 0, v: 0 };
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let hh = 0;
  if (d > 0) {
    if (max === r) hh = ((g - b) / d) % 6;
    else if (max === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh *= 60;
    if (hh < 0) hh += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h: Math.round(hh), s: Math.round(s * 100), v: Math.round(max * 100) };
}

// RGB → HSV（提取主导色时按饱和权重聚类用）。r,g,b∈[0,255]，返回 h∈[0,360] s,v∈[0,1]
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

/**
 * 提取主题色（加权中位切分 Median Cut）：
 * 1) 采集像素时按“亮度权重”过滤/降低深暗像素权重，让深色调不再主导主题色；
 * 2) 按“饱和度权重”略微提升鲜艳主体、压低中性背景，使结果贴近真实视觉基调；
 * 3) 对像素做中位切分得到若干代表色（色彩量化），取权重最高且非灰的作为主色。
 * 相比随机均值，中位切分能保留图片真实的色彩分布，而不是被浅背景稀释成淡色。
 */
// 采集像素并赋权：w = 亮度权重(降深暗) × 饱和权重(提主体)
function collectWeightedPixels(data) {
  const out = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 125) continue;
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b; // 感知亮度
    if (L < 22) continue;                            // 过滤近黑：深暗色调权重降为 0
    // 亮度权重：偏暗像素(22~70)线性降权 0.35→1，更亮则满权，降低深色调影响力
    const bw = L < 70 ? 0.35 + ((L - 22) / (70 - 22)) * 0.65 : 1;
    const { s } = rgbToHsv(r, g, b);
    const sw = 1 + Math.min(s, 1) * 0.6;             // 饱和像素略提权(1~1.6)，突出真实主体
    out.push({ r, g, b, w: bw * sw });
  }
  return out;
}

// 中位切分：反复沿最长通道在“权重中位数”处切分，得到 maxColors 个代表色块
function medianCut(pixels, maxColors) {
  if (!pixels.length) return [];
  let boxes = [pixels];
  while (boxes.length < maxColors) {
    // 选权重总和最大且可再分的色块
    let idx = -1, bestW = -1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length <= 1) continue;
      const tw = boxes[i].reduce((s, p) => s + p.w, 0);
      if (tw > bestW) { bestW = tw; idx = i; }
    }
    if (idx < 0) break;
    const box = boxes[idx];
    // 选范围最大的通道（R/G/B）
    let ch = 'r', mn = 255, mx = 0;
    for (const c of ['r', 'g', 'b']) {
      let cmin = 255, cmax = 0;
      for (const p of box) { if (p[c] < cmin) cmin = p[c]; if (p[c] > cmax) cmax = p[c]; }
      if (cmax - cmin > mx - mn) { mn = cmin; mx = cmax; ch = c; }
    }
    box.sort((a, b) => a[ch] - b[ch]);
    // 按累计权重在中位数处切开
    let cum = 0, mid = 1;
    for (let i = 0; i < box.length; i++) {
      cum += box[i].w;
      if (cum >= bestW / 2) { mid = i + 1; break; }
    }
    if (mid >= box.length) mid = box.length - 1;
    boxes.splice(idx, 1, box.slice(0, mid), box.slice(mid));
  }
  // 各色块按权重求代表色
  return boxes.map((box) => {
    let r = 0, g = 0, b = 0, w = 0;
    for (const p of box) { r += p.r * p.w; g += p.g * p.w; b += p.b * p.w; w += p.w; }
    return { r: r / w, g: g / w, b: b / w, w };
  });
}

// 选主色：权重最高的色块优先；但跳过中性灰(饱和度过低)，避免背景灰淹没真实主体色
function pickMainColor(boxes) {
  boxes.sort((a, b) => b.w - a.w);
  for (const bx of boxes) {
    const { s } = rgbToHsv(bx.r, bx.g, bx.b);
    if (s >= 0.16) return bx;
  }
  return boxes[0] || null;
}

// 加权中位切分主流程：返回图片真实视觉基调的代表主色 hex
function extractDominant(data) {
  const pixels = collectWeightedPixels(data);
  if (!pixels.length) return null;
  const boxes = medianCut(pixels, 8);
  const main = pickMainColor(boxes);
  if (!main) return null;
  return rgbToHex(Math.round(main.r), Math.round(main.g), Math.round(main.b));
}

/**
 * 主题锚点：与项目既定主题（品牌绿 + 紫/青/粉/红/橙/琥珀/蓝等点缀）同色系，
 * 仅作为“轻微校准”目标——保留图片真实亮度/色相，只纠正过灰或过暗，保证风格大体统一。
 */
const THEME_ANCHORS = [
  { h: 142, hex: '#16a34a' }, // 品牌绿
  { h: 80,  hex: '#5aa812' }, // 黄绿
  { h: 42,  hex: '#d99a00' }, // 琥珀
  { h: 28,  hex: '#e8740c' }, // 橙
  { h: 0,   hex: '#cf2b2b' }, // 红
  { h: 327, hex: '#cf1f82' }, // 粉
  { h: 263, hex: '#5b3fc4' }, // 紫
  { h: 222, hex: '#2f6fd6' }, // 蓝
  { h: 190, hex: '#0a86a0' }  // 青
];

// 取环形距离最近的锚点色相
function nearestAnchorHue(h) {
  let best = THEME_ANCHORS[0], bestD = 360;
  for (const a of THEME_ANCHORS) {
    const d = Math.abs(((h - a.h + 540) % 360) - 180); // 0..180
    if (d < bestD) { bestD = d; best = a; }
  }
  return best;
}

/**
 * 轻量主题校准（不再强行压暗/提饱和）：
 * - 仅当饱和度过低(<45%)时轻微提升到锚点饱和（避免灰蒙蒙），否则保留原饱和度；
 * - 仅当明度过暗(<45%)时抬升到 45%，绝不挤压明亮图片的真实亮度——解决“偏深”；
 * - 色相仅 15% 向最近主题锚点靠拢，主要保留图片真实色相。
 * 近灰(s<8)返回 null，交由调用方回退到品牌绿。
 */
function toThemeAlignedColor(hex) {
  if (!hex) return null;
  const { h, s, v } = hexToHsv(hex);
  if (s < 8) return null;
  const anchor = nearestAnchorHue(h);
  const base = hexToHsv(anchor.hex);
  const finalS = s < 45 ? Math.min(base.s, 45) : s; // 仅补灰，不强行增饱和
  const finalV = Math.max(v, 45);                   // 仅抬升过暗，保真亮度
  let finalH = (anchor.h + (h - anchor.h) * 0.15 + 360) % 360;
  if (finalH < 0) finalH += 360;
  return hsvToHex(finalH, finalS, finalV);
}

// 像素缓存：避免重复加载/绘制同一封面
const _pxCache = Object.create(null);

// 把封面绘制到 16×16 画布并取回原始 RGBA 像素（H5 / 小程序·APP 双端）
function loadCoverPixels(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    if (_pxCache[src]) return resolve(_pxCache[src]);

    // #ifdef H5
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const s = 16;
        const c = document.createElement('canvas');
        c.width = s; c.height = s;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, s, s);
        const d = ctx.getImageData(0, 0, s, s).data;
        _pxCache[src] = d;
        resolve(d);
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
    // #endif

    // #ifndef H5
    uni.createSelectorQuery()
      .select('#coverColorCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return resolve(null);
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        canvas.width = 16; canvas.height = 16;
        const draw = (path) => {
          const img = canvas.createImage();
          img.onload = () => {
            ctx.clearRect(0, 0, 16, 16);
            ctx.drawImage(img, 0, 0, 16, 16);
            const d = ctx.getImageData(0, 0, 16, 16).data;
            _pxCache[src] = d;
            resolve(d);
          };
          img.onerror = () => resolve(null);
          img.src = path;
        };
        if (/^https?:\/\//.test(src)) {
          uni.downloadFile({ url: src, success: (r) => draw(r.tempFilePath), fail: () => resolve(null) });
        } else {
          draw(src);
        }
      });
    // #endif
  });
}

// 去除视觉上近似的重复色（按色相/饱和/明度距离），保留 count 个差异明显的代表色
function dedupePalette(colors, count) {
  const out = [];
  for (const c of colors) {
    const hsv = hexToHsv(c);
    const dup = out.some((o) => {
      const o2 = hexToHsv(o);
      return Math.abs(((hsv.h - o2.h + 540) % 360) - 180) < 18
        && Math.abs(hsv.s - o2.s) < 12
        && Math.abs(hsv.v - o2.v) < 12;
    });
    if (!dup) out.push(c);
    if (out.length >= count) break;
  }
  return out;
}

// 单色主题色：加权中位切分取主色 + 轻量主题校准
export function extractCoverColor(src) {
  return loadCoverPixels(src).then((d) => {
    if (!d) return null;
    if (_cache[src]) return _cache[src];
    const hex = toThemeAlignedColor(extractDominant(d));
    if (hex) _cache[src] = hex;
    return hex;
  });
}

/**
 * 提取封面真实配色色板（可视化色卡用）：
 * 用中位切分得到若干代表色，按权重降序排列、去重后返回最多 count 个，
 * 直接采用图片真实色彩（不做主题色相偏移），精准反映参考图的真实配色。
 */
export function extractCoverPalette(src, count = 6) {
  return loadCoverPixels(src).then((d) => {
    if (!d) return [];
    const pixels = collectWeightedPixels(d);
    if (!pixels.length) return [];
    const boxes = medianCut(pixels, Math.max(count, 8));
    boxes.sort((a, b) => b.w - a.w);
    const raw = boxes.map((b) => rgbToHex(Math.round(b.r), Math.round(b.g), Math.round(b.b)));
    return dedupePalette(raw, count);
  });
}

