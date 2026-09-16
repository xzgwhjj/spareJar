<template>
  <view v-if="show" class="sheet-overlay" @click="closeEditLedger(false)">
    <view class="sheet-panel" @click.stop>
      <view class="sheet-handle">
        <view class="handle-bar" />
      </view>
      <text class="sheet-title">编辑账本</text>

      <!-- 名称 -->
      <view class="form-label">名称</view>
      <input
        class="sheet-input"
        :class="{ focused: nameFocused }"
        v-model="editName"
        placeholder="账本名称"
        maxlength="32"
        @focus="nameFocused = true"
        @blur="nameFocused = false"
      />

      <!-- 封面 + 系统默认图：左右横向布局（复用新建弹窗样式） -->
      <view class="cover-icon-row">
        <view class="cover-col">
          <view class="form-label">封面（可选）</view>
          <view
            class="cover-upload"
            :class="{ pressed: coverPressed }"
            @click="chooseCover('edit')"
            @touchstart="coverPressed = true"
            @touchend="coverPressed = false"
            @touchcancel="coverPressed = false"
          >
            <image
              v-if="editLedgerCover"
              class="cover-img"
              :src="editLedgerCover"
              mode="aspectFill"
            />
            <view v-else class="cover-placeholder">
              <text class="cover-tip">点击从相册选择</text>
            </view>
            <view
              v-if="editLedgerCover"
              class="cover-remove"
              @click.stop="removeCover('edit')"
              >×</view
            >
          </view>
        </view>
        <view class="icon-col">
          <view class="form-label">选择图标</view>
          <view class="icon-grid">
            <view
              v-for="ic in LEDGER_ICONS"
              :key="ic.id"
              class="icon-cell"
              :class="{ active: editIcon === ic.id }"
              @click="pickSystemIcon(ic, 'edit')"
            >
              <image class="icon-img" :src="resolveCover(ic.img43)" mode="aspectFill" />
            </view>
          </view>
        </view>
      </view>

      <!-- 主题色 -->
      <view class="form-label">主题色</view>
      <view class="color-opts">
        <view class="color-opt" :class="{ active: true }" @click="openEditCustomColor">
          <view class="color-opt-ico" :style="{ background: editColor }"> </view>
          <text class="color-opt-label">自定义</text>
        </view>
      </view>
      <!-- 自动取色色板（点选可微调） -->
      <view v-if="autoPaletteEdit.length" class="auto-palette">
        <view
          v-for="(c, i) in autoPaletteEdit"
          :key="'e' + i"
          class="auto-swatch"
          :class="{ active: c === editColor }"
          :style="{ background: c }"
          @click="pickAutoSwatch('edit', c)"
        ></view>
      </view>

      <!-- 简介 -->
      <view class="form-label">简介</view>
      <textarea
        class="sheet-textarea"
        :class="{ focused: editDescFocused }"
        v-model="editLedgerDesc"
        placeholder="添加一段描述，方便日后回忆"
        maxlength="200"
        @focus="editDescFocused = true"
        @blur="editDescFocused = false"
      />

      <view
        class="sheet-btn sheet-btn--emboss"
        :style="{ '--fill': editFillRatio }"
        @click="saveEdit"
      >
        <!-- 浮雕基底：未填充时纹理清晰突出于表面；液体升起后被淹没 -->
        <view class="emboss-base"></view>
        <!-- 液体填充：从底部升起淹没浮雕，液面带高光 -->
        <view class="emboss-liquid"></view>
        <!-- 文字：深绿（未淹没区可见）+ 白字（淹没区可见），随 --fill 互补裁切 -->
        <text class="emboss-text emboss-text--base">保存</text>
        <text class="emboss-text emboss-text--top">保存</text>
      </view>
    </view>

    <!-- 自定义颜色选择器（HSV 拖动取色，独立组件） -->
    <ColorPicker
      v-if="showColorPicker"
      :initial-hex="editColor"
      @confirm="applyPickedColor"
      @cancel="showColorPicker = false"
    />

    <!-- 比例选择：选图后先提供 3:4 与 4:3 两种形态预览 -->
    <view v-if="showRatioPicker" class="ratio-overlay" @click.stop>
      <view class="ratio-panel" @click.stop>
        <view class="crop-head">选择裁剪比例</view>
        <view class="ratio-row">
          <view
            class="ratio-card"
            :class="{ done: cropDone('34') }"
            @click="enterCrop(0.75)"
          >
            <view class="ratio-thumb ratio-34">
              <image
                class="ratio-thumb-img"
                :src="crop34 && crop34.temp ? crop34.temp : pendingCropSrc"
                mode="aspectFill"
              />
              <view v-if="cropDone('34')" class="ratio-done">✓</view>
            </view>
            <text class="ratio-label">3 : 4</text>
          </view>
          <view
            class="ratio-card"
            :class="{ done: cropDone('43') }"
            @click="enterCrop(4 / 3)"
          >
            <view class="ratio-thumb ratio-43">
              <image
                class="ratio-thumb-img"
                :src="crop43 && crop43.temp ? crop43.temp : pendingCropSrc"
                mode="aspectFill"
              />
              <view v-if="cropDone('43')" class="ratio-done">✓</view>
            </view>
            <text class="ratio-label">4 : 3</text>
          </view>
        </view>
        <view class="ratio-tip" v-if="!(cropDone('34') || cropDone('43'))"
          >点击比例可裁剪对应形态</view
        >
        <view class="crop-actions">
          <view class="crop-btn crop-cancel" @click="cancelRatio"><text>取消</text></view>
          <view
            class="crop-btn crop-ok"
            :class="{ disabled: !(cropDone('34') || cropDone('43')) }"
            @click="finishCrop"
            ><text>完成</text></view
          >
        </view>
      </view>
    </view>

    <!-- 图片裁剪（支持 3:4 / 4:3，独立组件） -->
    <CoverCropper
      v-if="showCropper"
      :src="cropSrc"
      :ratio="cropRatio"
      @confirm="onCropConfirm"
      @cancel="cancelCrop"
    />
  </view>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import ColorPicker from "@/components/ledger/ColorPicker.vue";
import CoverCropper from "@/components/ledger/CoverCropper.vue";
import { useCoverEditor, LEDGER_ICONS } from "@/composables/useCoverEditor.js";
import { resolveCover, getCloudTempUrl } from "@/utils/cdn.js";
import { updateLedger as apiUpdateLedger } from "@/api/sparejar.js";
import { deleteLedgerCover } from "@/utils/cloudFile.js";

const props = defineProps({
  show: { type: Boolean, default: false },
  ledger: { type: Object, default: null },
});
const emit = defineEmits(["update:show", "saved"]);

const cover = useCoverEditor();
const {
  editIcon,
  editLedgerCover,
  editLedgerCoverRel,
  editLedgerCover34,
  editLedgerCoverRel34,
  editColor,
  editOldCoverFileID,
  showColorPicker,
  autoPaletteEdit,
  chooseCover,
  removeCover,
  openEditCustomColor,
  applyPickedColor,
  pickAutoSwatch,
  showRatioPicker,
  cropDone,
  enterCrop,
  cancelRatio,
  finishCrop,
  showCropper,
  cropSrc,
  cropRatio,
  crop34,
  crop43,
  pendingCropSrc,
  onCropConfirm,
  cancelCrop,
  flushUpload,
  clearPending,
  resetEditLedgerCover,
  autoExtract,
  currentUploadToken,
  pendingCover,
} = cover;

const editName = ref("");
const editLedgerDesc = ref("");
const nameFocused = ref(false);
const editDescFocused = ref(false);
// 编辑弹窗"保存"按钮的浮雕液态填充比例：随表单字段完成度 0→1（未填 0 / 部分 / 全填 1）
const editFillRatio = computed(() => {
  let r = 0;
  if (editName.value.trim()) r += 0.5;
  if (editIcon.value) r += 0.25;
  if (editLedgerCover.value) r += 0.25;
  return r;
});

// 打开时加载目标账本（封面含云存储 fileID 解析为临时链）
watch(
  () => props.show,
  (v) => {
    if (v) load(props.ledger);
  }
);

async function load(l) {
  if (!l) return;
  editName.value = l.name;
  // 仅当现有图标在图片库中才选中，否则不预选（避免强制选中首项）
  editIcon.value = l.icon && LEDGER_ICONS.some((x) => x.id === l.icon) ? l.icon : "";
  // 落库值兼容系统图(/app_static)与云存储(cloud://)
  editLedgerCoverRel.value =
    l.cover && (String(l.cover).startsWith("/") || String(l.cover).startsWith("cloud://"))
      ? l.cover
      : "";
  // 预览地址：系统图/emoji 用 resolveCover 直出；用户上传为 cloud:// fileID，需解析为临时 URL 才能显示
  if (l.cover && String(l.cover).startsWith("cloud://")) {
    editLedgerCover.value = await getCloudTempUrl(l.cover);
  } else {
    editLedgerCover.value = resolveCover(l.cover);
  }
  // 3:4 副比例：与主封面同理加载，保证编辑保存时不丢失已存的 cover34
  const cover34 = l.cover34 || "";
  editLedgerCoverRel34.value =
    cover34 && (String(cover34).startsWith("/") || String(cover34).startsWith("cloud://"))
      ? cover34
      : "";
  if (cover34 && String(cover34).startsWith("cloud://")) {
    editLedgerCover34.value = await getCloudTempUrl(cover34);
  } else {
    editLedgerCover34.value = resolveCover(cover34);
  }
  // 还原已裁剪比例，避免保存时 syncCoverPreview 误将 cover34 清空
  crop43.value = l.cover
    ? {
        temp: editLedgerCover.value,
        fileID: String(l.cover).startsWith("cloud://") ? l.cover : null,
        rel: l.cover,
      }
    : null;
  crop34.value = cover34
    ? {
        temp: editLedgerCover34.value,
        fileID: String(cover34).startsWith("cloud://") ? cover34 : null,
        rel: cover34,
      }
    : null;
  // 记录编辑前的用户封面 fileID，替换成功后删旧文件，避免云存储冗余
  editOldCoverFileID.value =
    l.cover && String(l.cover).startsWith("cloud://") ? l.cover : "";
  // 简介：与新建字段一致
  editLedgerDesc.value = l.desc || "";
  // 主题色：保留已持久化的颜色
  editColor.value = l.theme_color || "#25cc5d";
  // 已有封面则自动提取色板（编辑态仅作建议，不覆盖已存主题色）
  autoExtract("edit");
}

async function closeEditLedger(committed = false) {
  if (!committed) currentUploadToken.value.edit++; // 取消 → 作废进行中的上传
  await flushUpload();
  if (!committed) await clearPending("edit");
  editName.value = "";
  editLedgerDesc.value = "";
  resetEditLedgerCover();
  emit("update:show", false);
}

async function saveEdit() {
  const name = editName.value.trim();
  if (!name) {
    uni.showToast({ title: "请输入账本名称", icon: "none" });
    return;
  }
  // 若新封面还在上传中，等完成以拿到落库相对路径
  await flushUpload();
  try {
    // 走云函数：updated_at 由服务端自动刷新（字符串），前端不传时间字段
    // cover 落库值：系统图为 /app_static/...，用户上传为 cloud:// fileID
    const newCover = editLedgerCoverRel.value;
    // 主题色：仅自定义取色（封面自动取色已移除），直接落库所选 hex
    const themeColor = editColor.value;
    await apiUpdateLedger(props.ledger._id, {
      name,
      icon: editIcon.value || LEDGER_ICONS[0].id,
      cover: newCover,
      cover34: editLedgerCoverRel34.value,
      desc: editLedgerDesc.value,
      theme_color: themeColor,
    });
    // 保存成功：若封面被替换，清理编辑前的旧用户封面文件（cloud://），避免云存储冗余
    if (editOldCoverFileID.value && editOldCoverFileID.value !== newCover) {
      deleteLedgerCover(editOldCoverFileID.value);
    }
    editOldCoverFileID.value = "";
    // 保存成功：封面已正式引用，解除"待清理"标记
    pendingCover.value = null;
    closeEditLedger(true);
    uni.showToast({ title: "已保存", icon: "success" });
    emit("saved");
  } catch (err) {
    // 保存失败：新上传的封面未落库，清理云存储临时文件，避免孤儿残留
    if (pendingCover.value) deleteLedgerCover(pendingCover.value.fileID);
    uni.showToast({ title: "保存失败", icon: "none" });
  }
}
</script>

<style scoped lang="scss">
@import "../../styles/ledger-dialog.scss";
</style>
