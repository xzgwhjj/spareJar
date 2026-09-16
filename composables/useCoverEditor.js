/**
 * useCoverEditor —— 账本封面 / 取色 / 裁剪 编辑器逻辑收口
 *
 * 把 ledger.vue 中"封面选择、系统图、自定义上传、自动取色、比例裁剪、双比例上传"
 * 这一大团共享状态与编排逻辑抽到这里；取色手势(ColorPicker)、裁剪手势+Canvas(CoverCropper)
 * 已分别是独立组件，本 composable 只负责状态与编排，对外暴露 refs / 方法供页面与组件接入。
 *
 * 注意：coverUploading / activeUploads 是闭包变量（非响应式 ref），页面无法直接读写，
 * 故通过 flushUpload / resetUploadState / resetNewLedgerCover / resetEditLedgerCover 间接操作。
 */
import { ref, computed } from "vue";
import { resolveCover } from "@/utils/cdn";
import { deleteLedgerCover, uploadLedgerCover } from "@/utils/cloudFile";
import { extractCoverColor, extractCoverPalette } from "@/utils/coverColor";

// 系统默认图库（新建/编辑弹窗共用）：每个图标含 4:3 与 3:4 资源；网格与落库统一用 4:3（img43）
export const LEDGER_ICONS = [
  { id: "cover", img43: "/app_static/images/icon_cover.png", img34: "/app_static/images/icon_cover.png" },
  { id: "sunny", img43: "/app_static/images/icon_sunny.png", img34: "/app_static/images/icon_sunny.png" },
  { id: "surplus", img43: "/app_static/images/icon_surplus.png", img34: "/app_static/images/icon_surplus.png" },
];
// 封面占位图（3:4），封面为空时优先展示
const COVER_PLACEHOLDER = "/app_static/images/icon_cover.png";
// 未选择封面时，从系统默认图库均匀随机分配一张（排除占位项）
export function pickRandomCover() {
  const pool = LEDGER_ICONS.filter((ic) => ic !== COVER_PLACEHOLDER);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function useCoverEditor() {
  // ===== 新建账本封面相关字段 =====
  const newLedgerIcon = ref("");
  const newLedgerCover = ref(""); // 预览地址（显示/取色用）
  const newLedgerCoverRel = ref(""); // 落库值：系统图为 /app_static/...，用户上传为 cloud:// fileID
  const newLedgerCover34 = ref(""); // 3:4 副比例预览地址
  const newLedgerCoverRel34 = ref(""); // 3:4 副比例落库值（cloud:// fileID）
  const newLedgerColor = ref("#25cc5d"); // 自定义选中的 hex

  // ===== 上传令牌 / 在途状态（闭包，非响应式）=====
  let coverUploading = null; // 自定义封面上传中的 promise
  let activeUploads = []; // 进行中的封面上传 promise 集合（双比例可能并行）
  const pendingCover = ref(null); // 已上传未提交的临时文件 { target, rel, fileID }
  // 上传令牌：每次 applyCover 自增并记入闭包。上传完成回调比对当前令牌，
  // 若已被替换/移除/取消（令牌失效），立即删除孤儿文件，不再写入 pendingCover。
  const currentUploadToken = ref({ new: 0, edit: 0 });

  // ===== 编辑账本封面相关字段 =====
  const editIcon = ref("");
  const editLedgerCover = ref(""); // 预览地址
  const editLedgerCover34 = ref(""); // 3:4 副比例预览地址
  const editLedgerCoverRel34 = ref(""); // 3:4 副比例落库值
  const editLedgerCoverRel = ref(""); // 落库值：系统图为 /app_static/...，用户上传为 cloud:// fileID
  const editOldCoverFileID = ref(""); // 编辑前已有的用户封面 fileID，替换成功后清理旧文件
  const editColor = ref("#25cc5d"); // 自定义选中的 hex

  // ===== 取色弹窗状态 =====
  const showColorPicker = ref(false);
  // 自定义颜色选择器：区分「新建 / 编辑」两个上下文，确认时写回对应状态
  const colorContext = ref("new");

  // ===== 裁剪编排状态 =====
  const cropTarget = ref("new"); // 裁剪结果写入目标，'new'=新建 / 'edit'=编辑
  // 两种比例的裁剪结果：{ temp: 预览地址, fileID: 云存储ID, rel: 落库值 }；null 表示未裁剪
  const crop34 = ref(null);
  const crop43 = ref(null);
  const showRatioPicker = ref(false); // 选图后先选择裁剪比例
  const pendingCropSrc = ref(""); // 待裁剪原图路径
  const pendingCropTarget = ref("new"); // 裁剪结果写入目标
  const cropRatio = ref(0.75); // 目标宽高比 宽/高（0.75=3:4，4/3=4:3）

  const showCropper = ref(false);
  const cropSrc = ref(""); // 传给 CropCropper 组件的待裁剪原图

  // 封面自动取色色板（选封面后静默提取主色 + 调色盘）
  const autoPaletteNew = ref([]);
  const autoPaletteEdit = ref([]);

  // ===== 封面选择：从本地相册选取；选图后先提供 3:4 / 4:3 两种形态预览，用户选择比例后再进入对应裁剪 =====
  // target: 'new' | 'edit'
  function chooseCover(target = "new") {
    uni.chooseImage({
      count: 1,
      sourceType: ["album", "camera"],
      success: (res) => {
        const path = res.tempFilePaths[0];
        uni.getImageInfo({
          src: path,
          success: () => {
            // 重新选图：清空上一轮两个比例的裁剪结果
            crop34.value = null;
            crop43.value = null;
            activeUploads = [];
            pendingCropTarget.value = target;
            pendingCropSrc.value = path;
            showRatioPicker.value = true;
          },
          fail: () => {
            applyCover(target, path);
          },
        });
      },
    });
  }
  // 清理某个 target 下"已上传但未提交"的临时封面（取消/替换/关闭时调用）
  async function clearPending(target) {
    const p = pendingCover.value;
    if (!p) return;
    if (target && p.target !== target) return;
    pendingCover.value = null;
    await deleteLedgerCover(p.fileID);
  }
  function removeCover(target = "new") {
    // 作废进行中的上传（令牌失效），上传完成回调会删除孤儿文件
    currentUploadToken.value[target]++;
    activeUploads = [];
    if (target === "edit") {
      editLedgerCover.value = "";
      editLedgerCoverRel.value = "";
      autoPaletteEdit.value = [];
    } else {
      newLedgerCover.value = "";
      newLedgerCoverRel.value = "";
      autoPaletteNew.value = [];
    }
    clearPending(target);
  }
  // 用户自定义上传：本地临时图先用于预览/取色，同时异步上传到云端 ledger_img 目录
  function applyCover(target, path) {
    if (!path) {
      removeCover(target);
      return;
    }
    if (target === "edit") editLedgerCover.value = path;
    else newLedgerCover.value = path;
    // 选封面后自动提取色板（展示在主题色区底部）
    autoExtract(target);
    // 本次上传令牌：后续若被替换/移除/取消，令牌会自增失效，上传完成即删孤儿文件
    const myToken = ++currentUploadToken.value[target];
    // 替换场景：先清理上一张待提交的上传
    clearPending(target).then(() => {
      const run = uploadLedgerCover(path)
        .then(({ rel, fileID }) => {
          // 令牌失效（已被替换/移除/取消）→ 本次上传不再需要，立即删除孤儿文件
          if (currentUploadToken.value[target] !== myToken) {
            return deleteLedgerCover(fileID);
          }
          // 落库用云存储 fileID（cloud://...），回显时经 getTempFileURL 解析，不再拼 CDN 域名
          if (target === "edit") editLedgerCoverRel.value = fileID;
          else newLedgerCoverRel.value = fileID;
          pendingCover.value = { target, rel, fileID };
        })
        .catch((e) => {
          console.error("[ledger] 封面上传失败:", e);
          uni.showToast({ title: "封面上传失败", icon: "none" });
        });
      coverUploading = run;
    });
  }
  // 选择系统默认图：存图标 id 与 4:3 资源路径（网格/落库统一用 4:3）。
  // target: 'new' | 'edit'
  function pickSystemIcon(ic, target) {
    // 选系统图 → 放弃自定义上传：作废进行中的上传，清理临时文件
    currentUploadToken.value[target]++;
    if (target === "edit") {
      editIcon.value = ic.id;
      editLedgerCover.value = resolveCover(ic.img43);
      editLedgerCoverRel.value = ic.img43;
    } else {
      newLedgerIcon.value = ic.id;
      newLedgerCover.value = resolveCover(ic.img43);
      newLedgerCoverRel.value = ic.img43;
    }
    clearPending(target); // 选了系统图 → 清理之前可能上传的自定义临时图
    autoExtract(target); // 选封面后自动提取色板（展示在主题色区底部）
  }

  // 打开自定义取色：仅设定上下文并打开弹窗；组件内部以 initialHex 自初始化
  function openCustomColor() {
    colorContext.value = "new";
    showColorPicker.value = true;
  }
  function openEditCustomColor() {
    colorContext.value = "edit";
    showColorPicker.value = true;
  }
  // 取色组件确认：写回对应主题色并关闭
  function applyPickedColor(hex) {
    if (colorContext.value === "edit") editColor.value = hex;
    else newLedgerColor.value = hex;
    showColorPicker.value = false;
  }

  // 封面自动取色：选封面后静默提取主色 + 调色盘（见 utils/coverColor.js）。
  // 主色仅在新建态直接落色；编辑态保留已存/已选主题色，仅把色板展示在主题色区底部供点选微调。
  async function autoExtract(context) {
    const cover = context === "edit" ? editLedgerCover.value : newLedgerCover.value;
    if (!cover) return;
    const palRef = context === "edit" ? autoPaletteEdit : autoPaletteNew;
    try {
      const [main, pal] = await Promise.all([
        extractCoverColor(cover),
        extractCoverPalette(cover, 20),
      ]);
      if (context === "new" && main) newLedgerColor.value = main;
      palRef.value = pal && pal.length ? pal : main ? [main] : [];
    } catch (e) {
      console.error("[ledger] 封面自动取色失败:", e);
      palRef.value = [];
    }
  }
  // 点击自动取色得到的色板色卡：写回主题色（用于精细挑选）
  function pickAutoSwatch(context, hex) {
    if (context === "edit") editColor.value = hex;
    else newLedgerColor.value = hex;
  }

  // 模板辅助：该比例是否已裁剪完成
  function cropDone(key) {
    return key === "34" ? !!crop34.value : !!crop43.value;
  }
  // 比例选择：选图后从 3:4 / 4:3 预览进入对应裁剪（裁剪组件内部自管手势与 Canvas 导出）
  function enterCrop(ratio) {
    showRatioPicker.value = false;
    cropRatio.value = ratio;
    cropTarget.value = pendingCropTarget.value;
    cropSrc.value = pendingCropSrc.value;
    showCropper.value = true;
  }
  // 单比例裁剪结果上传（复用云存储，带令牌防孤儿），并合并进 coverUploading 供保存 await
  function uploadCrop(storeRef, target) {
    const myToken = ++currentUploadToken.value[target];
    const path = storeRef.value.temp;
    const p = uploadLedgerCover(path)
      .then(({ rel, fileID }) => {
        if (currentUploadToken.value[target] !== myToken) {
          return deleteLedgerCover(fileID); // 令牌失效 → 删孤儿
        }
        storeRef.value = { ...storeRef.value, fileID, rel };
        syncCoverPreview();
      })
      .catch((e) => {
        console.error("[ledger] 封面上传失败:", e);
        uni.showToast({ title: "封面上传失败", icon: "none" });
      });
    activeUploads.push(p);
    coverUploading = Promise.all(activeUploads.slice());
  }
  // 把已裁剪的比例同步到表单封面字段：主封面优先 4:3（与系统图/网格一致），3:4 作为副比例落库
  function syncCoverPreview() {
    const t = cropTarget.value;
    const main = crop43.value || crop34.value; // 主封面（优先 4:3）
    const sec = crop34.value; // 副比例固定 3:4
    if (t === "edit") {
      editLedgerCover.value = main ? main.temp : "";
      editLedgerCoverRel.value = main ? main.fileID || main.rel : "";
      editLedgerCover34.value = sec ? sec.temp : "";
      editLedgerCoverRel34.value = sec ? sec.fileID || sec.rel : "";
    } else {
      newLedgerCover.value = main ? main.temp : "";
      newLedgerCoverRel.value = main ? main.fileID || main.rel : "";
      newLedgerCover34.value = sec ? sec.temp : "";
      newLedgerCoverRel34.value = sec ? sec.fileID || sec.rel : "";
    }
    autoExtract(t);
  }
  // 比例选择"完成"：把已裁剪比例写入封面字段并关闭
  function finishCrop() {
    syncCoverPreview();
    showRatioPicker.value = false;
    pendingCropSrc.value = "";
  }
  // 取消：已裁剪任一比例则保留结果（等同完成），否则作废
  function cancelRatio() {
    if (crop34.value || crop43.value) {
      finishCrop();
      return;
    }
    currentUploadToken.value[pendingCropTarget.value]++;
    showRatioPicker.value = false;
    pendingCropSrc.value = "";
  }
  function cancelCrop() {
    showCropper.value = false;
    cropSrc.value = "";
  }
  // 裁剪组件导出结果后的处理：写入对应比例结果、上传、回写封面字段
  function onCropConfirm(tempPath) {
    const is34 = Math.abs(cropRatio.value - 0.75) < 0.001;
    const storeRef = is34 ? crop34 : crop43;
    storeRef.value = { temp: tempPath, fileID: null, rel: "" };
    uploadCrop(storeRef, cropTarget.value);
    syncCoverPreview();
    showCropper.value = false;
    cropSrc.value = "";
    showRatioPicker.value = true;
  }

  // ===== 闭包状态辅助（页面无法直接读写 coverUploading / activeUploads）=====
  // 等待在途上传完成（取消/保存前调用，防止孤儿文件）
  async function flushUpload() {
    if (coverUploading) {
      try {
        await coverUploading;
      } catch (e) {
        /* 失败已在 applyCover 内提示 */
      }
    }
  }
  // 复位在途上传与待提交临时文件
  function resetUploadState() {
    activeUploads = [];
    coverUploading = null;
    pendingCover.value = null;
  }
  // 复位新建账本相关封面字段 + 裁剪/上传状态
  function resetNewLedgerCover() {
    newLedgerIcon.value = "";
    newLedgerCover.value = "";
    newLedgerCoverRel.value = "";
    newLedgerCover34.value = "";
    newLedgerCoverRel34.value = "";
    newLedgerColor.value = "#25cc5d";
    autoPaletteNew.value = [];
    crop34.value = null;
    crop43.value = null;
    resetUploadState();
    pendingCropSrc.value = "";
    pendingCropTarget.value = "new";
    cropSrc.value = "";
    showCropper.value = false;
    showRatioPicker.value = false;
  }
  // 复位编辑账本相关封面字段 + 裁剪/上传状态
  function resetEditLedgerCover() {
    editIcon.value = "";
    editLedgerCover.value = "";
    editLedgerCoverRel.value = "";
    editLedgerCover34.value = "";
    editLedgerCoverRel34.value = "";
    editColor.value = "#25cc5d";
    autoPaletteEdit.value = [];
    crop34.value = null;
    crop43.value = null;
    resetUploadState();
  }

  return {
    // 状态
    newLedgerIcon,
    newLedgerCover,
    newLedgerCoverRel,
    newLedgerCover34,
    newLedgerCoverRel34,
    newLedgerColor,
    pendingCover,
    currentUploadToken,
    editIcon,
    editLedgerCover,
    editLedgerCoverRel,
    editLedgerCover34,
    editLedgerCoverRel34,
    editColor,
    editOldCoverFileID,
    showColorPicker,
    colorContext,
    cropTarget,
    crop34,
    crop43,
    COVER_PLACEHOLDER,
    showRatioPicker,
    pendingCropSrc,
    pendingCropTarget,
    cropRatio,
    showCropper,
    cropSrc,
    autoPaletteNew,
    autoPaletteEdit,
    // 方法
    chooseCover,
    clearPending,
    removeCover,
    applyCover,
    pickSystemIcon,
    autoExtract,
    pickAutoSwatch,
    openCustomColor,
    openEditCustomColor,
    applyPickedColor,
    cropDone,
    enterCrop,
    uploadCrop,
    syncCoverPreview,
    finishCrop,
    cancelRatio,
    cancelCrop,
    onCropConfirm,
    // 闭包辅助
    flushUpload,
    resetUploadState,
    resetNewLedgerCover,
    resetEditLedgerCover,
  };
}
