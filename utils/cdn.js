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
