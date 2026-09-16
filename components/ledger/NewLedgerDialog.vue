<template>
  <view v-if="show" class="sheet-overlay" @click="closeNewLedger(false)">
    <view class="sheet-panel" @click.stop>
      <view class="sheet-handle">
        <view class="handle-bar" />
      </view>
      <text class="sheet-title">新建账本</text>

      <!-- 名称 -->
      <view class="form-label">名称</view>
      <input
        class="sheet-input"
        :class="{ focused: nameFocused }"
        v-model="newLedgerName"
        placeholder="输入账本名称"
        maxlength="32"
        @focus="nameFocused = true"
        @blur="nameFocused = false"
      />

      <!-- 封面 + 系统默认图：左右横向布局（左 3:4 封面 / 右 图标网格） -->
      <view class="cover-icon-row">
        <view class="cover-col">
          <view class="form-label">封面</view>
          <view
            class="cover-upload"
            :class="{ pressed: coverPressed }"
            @click="chooseCover('new')"
            @touchstart="coverPressed = true"
            @touchend="coverPressed = false"
            @touchcancel="coverPressed = false"
          >
            <image
              v-if="newLedgerCover"
              class="cover-img"
              :src="newLedgerCover"
              mode="aspectFill"
            />
            <view v-else class="cover-placeholder">
              <text class="cover-tip">点击从相册选择</text>
            </view>
            <view
              v-if="newLedgerCover"
              class="cover-remove"
              @click.stop="removeCover('new')"
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
              :class="{ active: newLedgerIcon === ic.id }"
              @click="pickSystemIcon(ic, 'new')"
            >
              <image class="icon-img" :src="resolveCover(ic.img43)" mode="aspectFill" />
            </view>
          </view>
        </view>
      </view>

      <!-- 主题色 -->
      <view class="form-label">主题色</view>
      <view class="color-opts">
        <view class="color-opt" :class="{ active: true }" @click="openCustomColor">
          <view class="color-opt-ico" :style="{ background: newLedgerColor }"> </view>
          <text class="color-opt-label">自定义</text>
        </view>
      </view>
      <!-- 自动取色色板（点选可微调） -->
      <view v-if="autoPaletteNew.length" class="auto-palette">
        <view
          v-for="(c, i) in autoPaletteNew"
          :key="'n' + i"
          class="auto-swatch"
          :class="{ active: c === newLedgerColor }"
          :style="{ background: c }"
          @click="pickAutoSwatch('new', c)"
        ></view>
      </view>

      <!-- 简介 -->
      <view class="form-label">简介</view>
      <textarea
        class="sheet-textarea"
        :class="{ focused: descFocused }"
        v-model="newLedgerDesc"
        placeholder="添加一段描述，方便日后回忆"
        maxlength="200"
        @focus="descFocused = true"
        @blur="descFocused = false"
      />

      <view
        class="sheet-btn"
        :class="{ 'is-full': fillComplete }"
        :style="{ '--fill': fillRatio }"
        @click="onSubmit"
      >
        <text class="sheet-btn__base">创建账本</text>
        <view class="sheet-btn__fill">
          <view class="sheet-btn__fill-txt">创建账本</view>
        </view>
      </view>
    </view>

    <!-- 自定义颜色选择器（HSV 拖动取色，独立组件） -->
    <ColorPicker
      v-if="showColorPicker"
      :initial-hex="newLedgerColor"
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
import {
  useCoverEditor,
  LEDGER_ICONS,
  pickRandomCover,
} from "@/composables/useCoverEditor.js";
import { resolveCover } from "@/utils/cdn.js";
import { createLedger as apiCreateLedger } from "@/api/sparejar.js";
import { deleteLedgerCover } from "@/utils/cloudFile.js";

const props = defineProps({
  show: { type: Boolean, default: false },
  ledgers: { type: Array, default: () => [] },
  maxCustomLedgers: { type: Number, default: 5 },
});
const emit = defineEmits(["update:show", "created"]);

const cover = useCoverEditor();
const {
  newLedgerIcon,
  newLedgerCover,
  newLedgerCoverRel,
  newLedgerCover34,
  newLedgerCoverRel34,
  newLedgerColor,
  pendingCover,
  currentUploadToken,
  showColorPicker,
  autoPaletteNew,
  chooseCover,
  removeCover,
  openCustomColor,
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
  resetNewLedgerCover,
} = cover;

const newLedgerName = ref("");
const nameFocused = ref(false);
const descFocused = ref(false);
const coverPressed = ref(false);
const newLedgerDesc = ref("");
const fillComplete = ref(false);
const createProgress = computed(() => {
  let n = 0;
  if (newLedgerName.value.trim()) n++; // 名称（必填）
  if (newLedgerCover.value) n++; // 封面
  if (newLedgerDesc.value.trim()) n++; // 简介
  return n / 3;
});
// 当前填充比例：点击提交时强制 3/3，否则跟随实际进度
const fillRatio = computed(() => (fillComplete.value ? 1 : createProgress.value));

// 打开时复位表单与封面状态
watch(
  () => props.show,
  (v) => {
    if (v) resetNewLedger();
  }
);

function resetNewLedger() {
  fillComplete.value = false;
  newLedgerName.value = "";
  newLedgerDesc.value = "";
  resetNewLedgerCover();
}

// 关闭新建弹窗：committed=true 表示创建成功（封面已落库，保留文件）；
// 其余（蒙版取消/未创建）作废进行中的上传并清理临时文件，防止孤儿残留
async function closeNewLedger(committed = false) {
  if (!committed) currentUploadToken.value.new++; // 取消 → 作废进行中的上传
  await flushUpload();
  if (!committed) await clearPending("new");
  resetNewLedger();
  emit("update:show", false);
}

// 点击创建：先校验必填，未通过则直接提示并停留在当前进度（不播放填满动画）
async function onSubmit() {
  if (fillComplete.value) return; // 防止连点重复触发
  if (!newLedgerName.value.trim()) {
    uni.showToast({ title: "请输入账本名称", icon: "none" });
    return;
  }
  fillComplete.value = true;
  await new Promise((r) => setTimeout(r, 500)); // 让填充动画可见
  await createLedger();
  fillComplete.value = false; // 复位（失败/关闭后）
}

async function createLedger() {
  const name = newLedgerName.value.trim();
  if (!name) {
    uni.showToast({ title: "请输入账本名称", icon: "none" });
    return;
  }
  const customCount = (props.ledgers || []).filter((l) => !l.is_system).length;
  const max = props.maxCustomLedgers || 5;
  if (customCount >= max) {
    uni.showToast({ title: `最多创建 ${max} 个账本`, icon: "none" });
    return;
  }
  // 封面：未选择时从系统默认图库均匀随机分配一张；已手动选择则保留相对路径
  let finalCover = newLedgerCoverRel.value;
  let finalIcon = newLedgerIcon.value;
  // 用户刚上传自定义图但还在上传中 → 等上传完成以拿到落库相对路径
  await flushUpload();
  finalCover = newLedgerCoverRel.value || finalCover;
  if (!finalCover) {
    finalCover = pickRandomCover();
    if (!finalIcon) finalIcon = finalCover; // 未选图标则同步用随机封面，保持视觉统一
  }
  // 主题色：仅自定义取色（封面自动取色已移除），直接落库所选 hex
  const themeColor = newLedgerColor.value;
  try {
    // 走云函数：created_at/updated_at 由服务端自动填充（字符串），前端不传时间字段
    await apiCreateLedger({
      name,
      icon: finalIcon || LEDGER_ICONS[0],
      cover: finalCover,
      cover34: newLedgerCoverRel34.value,
      desc: newLedgerDesc.value,
      monthly_budget: 0,
      sort_order: (props.ledgers || []).length,
      theme_color: themeColor,
    });
    // 创建成功：封面已正式引用，解除"待清理"标记，避免被误删
    pendingCover.value = null;
    closeNewLedger(true);
    uni.showToast({ title: "已创建", icon: "success" });
    emit("created");
  } catch (err) {
    console.error("[ledger][createLedger] 创建账本失败:", err);
    // 创建失败：新上传的封面未落库，清理云存储临时文件，避免孤儿残留
    if (pendingCover.value) deleteLedgerCover(pendingCover.value.fileID);
    const msg = (err && (err.message || err.errMsg)) || "创建失败";
    uni.showToast({
      title: /already exists/i.test(msg) ? "创建冲突，请重试" : "创建失败",
      icon: "none",
    });
  }
}
</script>

<style scoped lang="scss">
@import "../../styles/ledger-dialog.scss";
</style>
