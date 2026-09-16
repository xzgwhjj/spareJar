/**
 * 前端网页托管（CDN）资源地址统一管理
 * 换域名时只需修改 CDN_BASE 一处即可全局生效。
 */
export const CDN_BASE = 'https://env-00jy6jupik80-static.normal.cloudstatic.cn';

/**
 * 拼接 CDN 资源完整地址。
 * @param {string} path 资源相对路径，例如 '/app_static/images/icon_avatar.png'
 * @returns {string} 完整 CDN 地址
 */
export const cdn = (path) => `${CDN_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

import { reactive } from 'vue';

/**
 * 云存储图片解析器：<image> 不能直接渲染 cloud:// fileID，必须先解析成临时 URL；
 * 临时链接有有效期，因此可在 onShow（切回前台）重新解析以撑过切后台后过期。
 * 用法（Options / Composition 通用）：
 *   const cloud = createCloudImageResolver();
 *   cloud.resolve([fileID]);              // 解析并写入 map（可重复调用刷新）
 *   const src = cloud.display(form.url); // cloud:// → 临时 URL；非 cloud:// 原样返回
 * @returns {{ map: object, resolve: Function, display: Function }}
 */
export function createCloudImageResolver() {
  const map = reactive({});
  async function resolve(ids) {
    const list = Array.isArray(ids) ? ids : [ids];
    const cloudIds = (list || []).filter((x) => x && String(x).startsWith('cloud://'));
    if (!cloudIds.length) return;
    try {
      const m = await getCloudTempUrls(cloudIds);
      for (const k in m) if (m[k]) map[k] = m[k];
    } catch (e) {
      console.warn('[cdn] 解析云存储图片失败:', e);
    }
  }
  function display(src) {
    if (!src) return '';
    src = String(src);
    if (src.startsWith('cloud://')) return map[src] || '';
    return src; // 本地路径 / 普通 URL 直接显示
  }
  return { map, resolve, display };
}

/**
 * 封面存储值 → 可显示 URL 的统一解析。
 * 数据库里封面可能存：
 *   - 相对路径 '/app_static/...'（系统默认图）或 '/ledger_img/...'（用户自定义，落云端存储）
 *     → 拼接 CDN 域名生成完整地址；
 *   - 完整 URL / data: URI（旧数据或临时图）→ 原样返回；
 *   - emoji 字符串（旧默认图标）→ 原样返回，由上层按 emoji 渲染。
 * @param {string} v 封面存储值
 * @returns {string} 可显示的图片地址
 */
export function resolveCover(v) {
  if (!v) return '';
  v = String(v);
  if (v.startsWith('/')) return cdn(v);
  return v;
}

/**
 * 云存储文件 ID（cloud://...）解析为临时可访问 URL。
 * 用户上传的封面落在 uniCloud 云存储（与网页托管是两套不互通的空间），
 * 不能直接用 CDN 域名拼接，必须经 getTempFileURL 换临时链。
 *
 * 关键：uniCloud.getTempFileURL 的返回 fileList 与请求 fileList **同序**，
 * 但响应里的 item.fileID 在阿里云环境下常被规范化成与上传时不一致的格式，
 * 因此回填必须用「请求索引」对齐，不能用响应里的 fileID 当 key，否则
 * map[l.cover]（l.cover 是入库时的原始 fileID）永远命中不了、封面回退默认图。
 *
 * 临时链有有效期，缓存带 TTL：过期后下次访问自动重新换取，避免刷新时用到已
 * 失效（404）的链接。
 */
const _tempUrlCache = new Map(); // fileID -> { url, t }
const TEMP_URL_TTL = 50 * 60 * 1000; // 50 分钟，留余量在默认 1h 有效期前刷新
function _cacheGet(fileID) {
  const hit = _tempUrlCache.get(fileID);
  if (!hit) return undefined;
  if (Date.now() - hit.t > TEMP_URL_TTL) {
    _tempUrlCache.delete(fileID);
    return undefined;
  }
  return hit.url;
}
function _cacheSet(fileID, url) {
  _tempUrlCache.set(fileID, { url, t: Date.now() });
}

export async function getCloudTempUrl(fileID) {
  if (!fileID || !String(fileID).startsWith('cloud://')) return '';
  const cached = _cacheGet(fileID);
  if (cached !== undefined) return cached;
  try {
    const res = await uniCloud.getTempFileURL({ fileList: [fileID] });
    const item = res.fileList && res.fileList[0];
    const url = (item && (item.tempFileURL || item.fileID)) || '';
    _cacheSet(fileID, url);
    return url;
  } catch (e) {
    console.warn('[cdn] getTempFileURL 失败:', fileID, e);
    return '';
  }
}

/**
 * 批量解析云存储文件 ID（列表场景一次性换取所有封面 URL，省请求）。
 * 按请求索引对齐回填，保证 out[原fileID] 一定可用。
 * @param {string[]} fileIDs 可能含非 cloud:// 的项，会自动忽略
 * @returns {Promise<Object<string,string>>} { 原fileID: tempUrl }
 */
export async function getCloudTempUrls(fileIDs) {
  const unique = [...new Set((fileIDs || []).filter((id) => id && String(id).startsWith('cloud://')))];
  const out = {};
  const need = [];
  for (const id of unique) {
    const cached = _cacheGet(id);
    if (cached !== undefined) out[id] = cached;
    else need.push(id);
  }
  if (!need.length) return out;
  try {
    const res = await uniCloud.getTempFileURL({ fileList: need });
    const items = res.fileList || [];
    // 按索引对齐：响应第 i 项对应请求第 i 个 fileID（响应 fileID 可能已被规范化，不可当 key）
    for (let i = 0; i < need.length; i++) {
      const item = items[i];
      const url = (item && (item.tempFileURL || item.fileID)) || '';
      _cacheSet(need[i], url);
      out[need[i]] = url;
    }
  } catch (e) {
    console.warn('[cdn] 批量 getTempFileURL 失败:', e);
  }
  return out;
}
