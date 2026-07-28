/**
 * 自定义封面上传与清理（云端存储）
 *
 * 用户上传的账本封面统一放到云端独立目录 `ledger_img` 下，
 * 数据库只存相对路径（如 /ledger_img/<name>.<ext>），
 * 前端回显时用 CDN 域名拼接该相对路径生成完整 URL（见 utils/cdn.js -> resolveCover）。
 *
 * 命名规范：时间戳 + 随机串，避免并发重名。
 */

const COVER_DIR = 'ledger_img';

// 生成唯一文件名：时间戳_随机串.扩展名
function genName(localPath) {
  const ext = (localPath.split('.').pop() || 'png').split('?')[0].toLowerCase();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
}

/**
 * 上传本地图片到云端独立目录 ledger_img。
 * @param {string} localPath 本地临时文件路径（裁剪/相册产出）
 * @returns {Promise<{rel:string, fileID:string}>}
 *   rel    - 入库用的相对路径，如 /ledger_img/xxx.png
 *   fileID - 云端文件标识，用于后续删除（取消时清理冗余）
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
 * @param {string} fileID uniCloud.uploadFile 返回的文件标识
 */
export async function deleteLedgerCover(fileID) {
  if (!fileID) return;
  try {
    await uniCloud.deleteFile({ fileList: [fileID] });
  } catch (e) {
    // 清理失败不阻塞主流程，仅告警
    console.warn('[cloudFile] 删除临时封面失败（可忽略）:', e);
  }
}
