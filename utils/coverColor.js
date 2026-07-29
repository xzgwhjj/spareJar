// 封面主色提取：64x64 采样 + Color Thief 的 median-cut（MMCQ）聚类，
// 结合显著性/冷色加权挑选主色与色板。取像素兼顾 H5（Image+canvas）
// 与小程序/APP（离屏 Canvas 2D，优先 wx.createOffscreenCanvas）。结果按 src 缓存。
// MMCQ 改编自 Color Thief v3（MIT, Lokesh Dhakar），仅取纯算法部分（无 DOM 依赖）。

import { getCloudTempUrl } from '@/utils/cdn.js';

const _cache = Object.create(null);

export function rgbToHex(r, g, b) {
  const h = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

export function hexToRgba(hex, alpha = 1) {
  if (!hex) return '';
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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

function samplePixels(data) {
  const px = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 125) continue;
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (L < 6) continue;
    px.push([r, g, b]);
  }
  return px;
}

function computeMeanColor(pixels) {
  let r = 0, g = 0, b = 0;
  for (const p of pixels) { r += p[0]; g += p[1]; b += p[2]; }
  const n = pixels.length || 1;
  return { r: r / n, g: g / n, b: b / n };
}


// ===================== MMCQ (median-cut) —— Color Thief v3 (MIT) =====================
const SIGBITS = 5;
const RSHIFT = 8 - SIGBITS;
const MAX_ITERATIONS = 1e3;
const FRACT_BY_POPULATIONS = 0.75;
const HISTO_SIZE = 1 << (3 * SIGBITS);

function getColorIndex(r, g, b) {
  return (r << (2 * SIGBITS)) + (g << SIGBITS) + b;
}

class VBox {
  constructor(r1, r2, g1, g2, b1, b2, histo) {
    this.r1 = r1; this.r2 = r2; this.g1 = g1; this.g2 = g2;
    this.b1 = b1; this.b2 = b2; this.histo = histo;
  }
  volume(force = false) {
    if (this._volume === void 0 || force) {
      this._volume = (this.r2 - this.r1 + 1) * (this.g2 - this.g1 + 1) * (this.b2 - this.b1 + 1);
    }
    return this._volume;
  }
  count(force = false) {
    if (this._count === void 0 || force) {
      let npix = 0;
      for (let i = this.r1; i <= this.r2; i++)
        for (let j = this.g1; j <= this.g2; j++)
          for (let k = this.b1; k <= this.b2; k++)
            npix += this.histo[getColorIndex(i, j, k)] || 0;
      this._count = npix;
    }
    return this._count;
  }
  copy() {
    return new VBox(this.r1, this.r2, this.g1, this.g2, this.b1, this.b2, this.histo);
  }
  avg(force = false) {
    if (this._avg === void 0 || force) {
      const mult = 1 << RSHIFT;
      if (this.r1 === this.r2 && this.g1 === this.g2 && this.b1 === this.b2) {
        this._avg = [this.r1 << RSHIFT, this.g1 << RSHIFT, this.b1 << RSHIFT];
      } else {
        let ntot = 0, rsum = 0, gsum = 0, bsum = 0;
        for (let i = this.r1; i <= this.r2; i++)
          for (let j = this.g1; j <= this.g2; j++)
            for (let k = this.b1; k <= this.b2; k++) {
              const hval = this.histo[getColorIndex(i, j, k)] || 0;
              ntot += hval;
              rsum += hval * (i + 0.5) * mult;
              gsum += hval * (j + 0.5) * mult;
              bsum += hval * (k + 0.5) * mult;
            }
        this._avg = ntot
          ? [~~(rsum / ntot), ~~(gsum / ntot), ~~(bsum / ntot)]
          : [~~(mult * (this.r1 + this.r2 + 1) / 2), ~~(mult * (this.g1 + this.g2 + 1) / 2), ~~(mult * (this.b1 + this.b2 + 1) / 2)];
      }
    }
    return this._avg;
  }
}

class PQueue {
  constructor(comparator) { this.comparator = comparator; this.contents = []; this.sorted = false; }
  sort() { this.contents.sort(this.comparator); this.sorted = true; }
  push(item) { this.contents.push(item); this.sorted = false; }
  pop() { if (!this.sorted) this.sort(); return this.contents.pop(); }
  size() { return this.contents.length; }
}

function getHisto(pixels) {
  const histo = new Uint32Array(HISTO_SIZE);
  for (const pixel of pixels) {
    histo[getColorIndex(pixel[0] >> RSHIFT, pixel[1] >> RSHIFT, pixel[2] >> RSHIFT)]++;
  }
  return histo;
}

function vboxFromPixels(pixels, histo) {
  let rmin = 1e6, rmax = 0, gmin = 1e6, gmax = 0, bmin = 1e6, bmax = 0;
  for (const pixel of pixels) {
    const r = pixel[0] >> RSHIFT, g = pixel[1] >> RSHIFT, b = pixel[2] >> RSHIFT;
    if (r < rmin) rmin = r; else if (r > rmax) rmax = r;
    if (g < gmin) gmin = g; else if (g > gmax) gmax = g;
    if (b < bmin) bmin = b; else if (b > bmax) bmax = b;
  }
  return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, histo);
}

// 在某一颜色通道上找到中位切分点（与 Color Thief 算法一致）
function doCutAt(histo, vbox, color, total, partialsum, lookaheadsum) {
  const dim1 = color + '1';
  const dim2 = color + '2';
  for (let i = vbox[dim1]; i <= vbox[dim2]; i++) {
    if (partialsum[i] > total / 2) {
      const vbox1 = vbox.copy();
      const vbox2 = vbox.copy();
      const left = i - vbox[dim1];
      const right = vbox[dim2] - i;
      let d2 = left <= right
        ? Math.min(vbox[dim2] - 1, ~~(i + right / 2))
        : Math.max(vbox[dim1], ~~(i - 1 - left / 2));
      while (!partialsum[d2]) d2++;
      let count2 = lookaheadsum[d2];
      while (!count2 && partialsum[d2 - 1]) count2 = lookaheadsum[--d2];
      vbox1[dim2] = d2;
      vbox2[dim1] = vbox1[dim2] + 1;
      return [vbox1, vbox2];
    }
  }
  return void 0;
}

function medianCutApply(histo, vbox) {
  if (!vbox.count()) return void 0;
  if (vbox.count() === 1) return [vbox.copy(), null];
  const rw = vbox.r2 - vbox.r1 + 1;
  const gw = vbox.g2 - vbox.g1 + 1;
  const bw = vbox.b2 - vbox.b1 + 1;
  const maxw = Math.max(rw, gw, bw);
  let total = 0;
  const partialsum = [];
  const lookaheadsum = [];
  if (maxw === rw) {
    for (let i = vbox.r1; i <= vbox.r2; i++) {
      let sum = 0;
      for (let j = vbox.g1; j <= vbox.g2; j++)
        for (let k = vbox.b1; k <= vbox.b2; k++)
          sum += histo[getColorIndex(i, j, k)] || 0;
      total += sum; partialsum[i] = total;
    }
  } else if (maxw === gw) {
    for (let i = vbox.g1; i <= vbox.g2; i++) {
      let sum = 0;
      for (let j = vbox.r1; j <= vbox.r2; j++)
        for (let k = vbox.b1; k <= vbox.b2; k++)
          sum += histo[getColorIndex(j, i, k)] || 0;
      total += sum; partialsum[i] = total;
    }
  } else {
    for (let i = vbox.b1; i <= vbox.b2; i++) {
      let sum = 0;
      for (let j = vbox.r1; j <= vbox.r2; j++)
        for (let k = vbox.g1; k <= vbox.g2; k++)
          sum += histo[getColorIndex(j, k, i)] || 0;
      total += sum; partialsum[i] = total;
    }
  }
  partialsum.forEach((d, i) => { lookaheadsum[i] = total - d; });
  if (maxw === rw) return doCutAt(histo, vbox, 'r', total, partialsum, lookaheadsum);
  if (maxw === gw) return doCutAt(histo, vbox, 'g', total, partialsum, lookaheadsum);
  return doCutAt(histo, vbox, 'b', total, partialsum, lookaheadsum);
}

function iterate(pq, target, histo) {
  let ncolors = pq.size();
  let niters = 0;
  while (niters < MAX_ITERATIONS) {
    if (ncolors >= target) return;
    niters++;
    const vbox = pq.pop();
    if (!vbox.count()) { pq.push(vbox); continue; }
    const result = medianCutApply(histo, vbox);
    if (!result || !result[0]) return;
    pq.push(result[0]);
    if (result[1]) { pq.push(result[1]); ncolors++; }
  }
}

function medianCutQuantize(pixels, maxColors) {
  if (!pixels.length || maxColors < 2 || maxColors > 256) return [];
  const histo = getHisto(pixels);
  const vbox = vboxFromPixels(pixels, histo);
  const pq = new PQueue((a, b) => a.count() - b.count());
  pq.push(vbox);
  iterate(pq, FRACT_BY_POPULATIONS * maxColors, histo);
  const pq2 = new PQueue((a, b) => a.count() * a.volume() - b.count() * b.volume());
  while (pq.size()) pq2.push(pq.pop());
  iterate(pq2, maxColors, histo);
  const results = [];
  while (pq2.size()) {
    const box = pq2.pop();
    results.push({ color: box.avg(), population: box.count() });
  }
  return results;
}
// ===================== MMCQ 结束 =====================

function scoreCluster(cl, globalMean = null) {
  const { s, v } = rgbToHsv(cl.r, cl.g, cl.b);
  let bf = 1;
  if (v > 0.96) bf = 0.45;
  else if (v < 0.06) bf = 0.45;
  const sal = 0.8 + 0.4 * Math.min(s, 1);
  let distinct = 1;
  if (globalMean) {
    const dist = Math.sqrt((cl.r - globalMean.r) ** 2 + (cl.g - globalMean.g) ** 2 + (cl.b - globalMean.b) ** 2);
    distinct = 1 + Math.min(dist, 255) / 128;
  }
  return (cl.weight || cl.count) * bf * sal * distinct;
}

function pickDominantCluster(clusters, globalMean) {
  let best = null, bestScore = -1;
  for (const cl of clusters) {
    const sc = scoreCluster(cl, globalMean);
    if (sc > bestScore) { bestScore = sc; best = cl; }
  }
  return best;
}

function toClusters(boxes) {
  return boxes.map((b) => ({
    r: b.color[0], g: b.color[1], b: b.color[2],
    count: b.population, weight: b.population,
  }));
}

function extractDominant(data) {
  const pixels = samplePixels(data);
  if (!pixels.length) return null;
  const globalMean = computeMeanColor(pixels);
  const boxes = medianCutQuantize(pixels, 16).filter((b) => b.population > 0);
  if (!boxes.length) return null;
  const main = pickDominantCluster(toClusters(boxes), globalMean);
  if (!main) return null;
  return rgbToHex(Math.round(main.r), Math.round(main.g), Math.round(main.b));
}

const THEME_ANCHORS = [
  { h: 142, hex: '#16a34a' }, { h: 80,  hex: '#5aa812' }, { h: 42,  hex: '#d99a00' },
  { h: 28,  hex: '#e8740c' }, { h: 0,   hex: '#cf2b2b' }, { h: 327, hex: '#cf1f82' },
  { h: 263, hex: '#5b3fc4' }, { h: 222, hex: '#2f6fd6' }, { h: 190, hex: '#0a86a0' },
];

function nearestAnchorHue(h) {
  let best = THEME_ANCHORS[0], bestD = 360;
  for (const a of THEME_ANCHORS) {
    const d = Math.abs(((h - a.h + 540) % 360) - 180);
    if (d < bestD) { bestD = d; best = a; }
  }
  return best;
}

function toThemeAlignedColor(hex) {
  if (!hex) return null;
  const { h, s, v } = hexToHsv(hex);
  if (s < 8) return null;
  const anchor = nearestAnchorHue(h);
  const base = hexToHsv(anchor.hex);
  const finalS = s < 45 ? Math.min(base.s, 45) : s;
  const finalV = Math.max(v, 45);
  let finalH = (anchor.h + (h - anchor.h) * 0.15 + 360) % 360;
  if (finalH < 0) finalH += 360;
  return hsvToHex(finalH, finalS, finalV);
}

// 像素缓存：避免重复加载/绘制同一封面
const _pxCache = Object.create(null);

function drawCoverPixels(drawSrc, cacheKey, resolve) {
  // #ifdef H5
  const img = new Image();
  img.onload = () => {
    try {
      const s = 64;
      const c = document.createElement('canvas');
      c.width = s; c.height = s;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, s, s);
      const d = ctx.getImageData(0, 0, s, s).data;
      _pxCache[cacheKey] = d;
      resolve(d);
    } catch (e) {
      _pxCache[cacheKey] = null;
      resolve(null);
    }
  };
  img.onerror = () => resolve(null);
  img.src = drawSrc;
  // #endif

  // #ifndef H5
  drawToMiniCanvas(drawSrc, 64, (d) => {
    _pxCache[cacheKey] = d;
    resolve(d);
  });
  // #endif
}

// 小程序/APP：优先离屏 Canvas（wx.createOffscreenCanvas，无需页面元素）；
// 极少数基础库不支持时回退到页面 <canvas type="2d" id="coverColorCanvas">。
function drawToMiniCanvas(src, size, cb) {
  let canvas = null;
  const hasWx = typeof wx !== 'undefined' && wx.createOffscreenCanvas;
  if (hasWx) {
    try { canvas = wx.createOffscreenCanvas({ type: '2d', width: size, height: size }); } catch (e) { canvas = null; }
  }
  if (!canvas) {
    uni.createSelectorQuery()
      .select('#coverColorCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return cb(null);
        paintOnCanvas(res[0].node, src, size, cb);
      });
    return;
  }
  paintOnCanvas(canvas, src, size, cb);
}

function paintOnCanvas(canvas, src, size, cb) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = canvas.createImage();
  img.onload = () => {
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    let d = null;
    try { d = ctx.getImageData(0, 0, size, size).data; } catch (e) { d = null; }
    cb(d);
  };
  img.onerror = () => cb(null);
  img.src = src;
}

// 解析封面地址：cloud:// 先换临时链（小程序/APP 云存储资源不可直接绘制）
function resolveSrc(src) {
  if (src && String(src).startsWith('cloud://')) {
    return getCloudTempUrl(src).then((url) => url || src);
  }
  return Promise.resolve(src);
}

function loadCoverPixels(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    if (_pxCache[src]) return resolve(_pxCache[src]);
    resolveSrc(src).then((realSrc) => {
      if (!realSrc) { _pxCache[src] = null; return resolve(null); }
      // 远程地址先下载为本地临时文件再绘制：小程序/APP 原生下载不受 CORS 限制，
      // H5 下载为 blob:（同源）可正常 getImageData；规避跨域污染。
      if (/^https?:\/\//.test(realSrc)) {
        uni.downloadFile({
          url: realSrc,
          success: (r) => drawCoverPixels(r.tempFilePath || realSrc, src, resolve),
          fail: () => drawCoverPixels(realSrc, src, resolve),
        });
      } else {
        drawCoverPixels(realSrc, src, resolve);
      }
    }).catch(() => {
      _pxCache[src] = null;
      resolve(null);
    });
  });
}

function paletteBucket(r, g, b) {
  const { h, s, v } = rgbToHsv(r, g, b);
  if (s < 0.12) return 'n' + Math.round(v * 8);
  const hb = Math.round(h / 24);
  const vb = Math.min(3, Math.floor(v * 4));
  return 'h' + hb + 'v' + vb;
}

function colorDist(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function isCoolColor(r, g, b) {
  const { h, s } = rgbToHsv(r, g, b);
  return s >= 0.12 && h >= 180 && h <= 260;
}

function selectDiversePalette(boxes, count, clusters = null, globalMean = null) {
  boxes.sort((a, b) => b.w - a.w);
  const picked = [];
  const seen = new Set();
  for (const b of boxes) {
    const key = paletteBucket(b.r, b.g, b.b);
    if (!seen.has(key)) { seen.add(key); picked.push(b); }
    if (picked.length >= count * 2) break;
  }
  if (picked.length < count) {
    for (const b of boxes) {
      if (picked.includes(b)) continue;
      const dup = picked.some((p) => colorDist(p, b) < 28);
      if (!dup) picked.push(b);
      if (picked.length >= count) break;
    }
  }
  if (clusters && globalMean && !picked.some((b) => isCoolColor(b.r, b.g, b.b))) {
    const cool = clusters
      .filter((c) => isCoolColor(c.r, c.g, c.b))
      .sort((a, b) => scoreCluster(b, globalMean) - scoreCluster(a, globalMean))[0];
    if (cool) {
      const coolBox = { r: cool.r, g: cool.g, b: cool.b, w: cool.weight || cool.count };
      if (picked.length >= count) picked[picked.length - 1] = coolBox;
      else picked.push(coolBox);
    }
  }
  picked.sort((a, b) => b.w - a.w);
  const top = picked.slice(0, count);
  const out = [];
  for (const b of top) {
    if (!out.some((o) => colorDist(o, b) < 28)) out.push(b);
  }
  return out;
}

// 单色主题色：median-cut 取主色 + 轻量主题校准
export function extractCoverColor(src) {
  return loadCoverPixels(src).then((d) => {
    if (!d) return null;
    if (_cache[src]) return _cache[src];
    const hex = toThemeAlignedColor(extractDominant(d));
    if (hex) _cache[src] = hex;
    return hex;
  });
}

// 封面配色色板（可视化色卡用）：median-cut 聚出代表簇，按色相/明度分桶选代表色
// 并强制保证冷色系（蓝/青/紫）覆盖，避免人物衣服/海面被背景淹没。
export function extractCoverPalette(src, count = 8) {
  return loadCoverPixels(src).then((d) => {
    if (!d) return [];
    const pixels = samplePixels(d);
    if (!pixels.length) return [];
    const globalMean = computeMeanColor(pixels);
    const boxes = medianCutQuantize(pixels, Math.max(count * 3, 24)).filter((b) => b.population > 0);
    const clusters = toClusters(boxes);
    const sel = selectDiversePalette(
      clusters.map((c) => ({ r: c.r, g: c.g, b: c.b, w: c.weight || c.count })),
      count, clusters, globalMean
    );
    return sel.map((b) => rgbToHex(Math.round(b.r), Math.round(b.g), Math.round(b.b)));
  });
}
