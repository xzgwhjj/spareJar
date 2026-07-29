/**
 * 自定义封面上传与清理（uniCloud 云存储）
 *
 * 用户上传的账本封面统一上传到 uniCloud 云存储（独立目录 `ledger_img`），
 * 数据库存云存储 fileID（如 cloud://xxx/ledger_img/<name>.<ext>），
 * 前端回显时经 utils/cdn.js -> getTempFileURL 解析为临时可访问 URL。
 * 注意：云存储与前端网页托管（CDN）是两套不互通的空间，fileID 不能拼 CDN 域名。
 *
 * 命名规范：时间戳 + 随机串，避免并发重名。
 */

import { ACTIONS, callSparejarRaw } from '@/api/sparejar.js';

const COVER_DIR = 'ledger_img';

// 生成唯一文件名：时间戳_随机串.扩展名
function genName(localPath) {
  const ext = (localPath.split('.').pop() || 'png').split('?')[0].toLowerCase();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
}

/**
 * 上传本地图片到云存储 ledger_img 目录。
 * @param {string} localPath 本地临时文件路径（裁剪/相册产出）
 * @returns {Promise<{rel:string, fileID:string}>}
 *   rel    - 云存储相对路径（仅作记录，前端不使用 CDN 域名拼接）
 *   fileID - 云端文件标识，即落库值，用于后续删除（取消/替换时清理冗余）
 */
export function uploadLedgerCover(localPath) {
  return new Promise((resolve, reject) => {
    const cloudPath = `${COVER_DIR}/${genName(localPath)}`;
    const onOk = (res) => resolve({ rel: `/${cloudPath}`, fileID: res.fileID });
    const task = uniCloud.uploadFile({
      filePath: localPath,
      cloudPath,
      success: onOk,
      fail: reject,
    });
    // 兼容 Promise 化 adaptor：部分版本走 success，部分版本直接 resolve
    if (task && typeof task.then === 'function') {
      task.then(onOk).catch(reject);
    }
  });
}

/**
 * 删除云端临时封面（用户上传后最终未保存时清理，防止存储冗余）。
 * 先尝试客户端直删；若失败（权限/环境限制等）则调用云函数兜底。
 * @param {string} fileID uniCloud.uploadFile 返回的文件标识
 */
export async function deleteLedgerCover(fileID) {
  if (!fileID) return;

  // 1) 客户端直删（最快路径）
  try {
    console.log('[cloudFile] 客户端删除临时封面:', fileID);
    await new Promise((resolve, reject) => {
      uniCloud.deleteFile({
        fileList: [fileID],
        success: resolve,
        fail: reject,
      });
    });
    console.log('[cloudFile] 客户端删除临时封面成功:', fileID);
    return;
  } catch (e) {
    console.warn('[cloudFile] 客户端删除失败，转云函数兜底:', fileID, e);
  }

  // 2) 云函数兜底（服务端有权限删除云存储文件）
  try {
    await callSparejarRaw(ACTIONS.DELETE_COVER, { fileID });
    console.log('[cloudFile] 云函数兜底删除临时封面成功:', fileID);
  } catch (e) {
    // 清理失败不阻塞主流程，仅告警
    console.warn('[cloudFile] 删除临时封面失败（可忽略）:', fileID, e);
  }
}
