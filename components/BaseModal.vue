<template>
  <view
    v-if="show"
    class="modal-overlay"
    :class="{ 'is-closing': closing }"
    @click="onOverlayClick"
  >
    <view
      class="modal-card"
      :class="{ 'is-closing': closing }"
      @click.stop
      @animationend="onCardAnimationEnd"
    >
      <!-- 关闭按钮：右上角圆形，点击时旋转 + 缩放动效 -->
      <view
        v-if="showClose"
        class="modal-close"
        :class="{ pressed: btnPressed, closing }"
        @touchstart="btnPressed = true"
        @touchend="btnPressed = false"
        @click="close"
      >
        <view class="modal-close-x" />
      </view>

      <text v-if="title" class="modal-title">{{ title }}</text>

      <!-- 内容：默认插槽优先；否则渲染 content 文本 -->
      <view class="modal-body">
        <slot v-if="!empty">
          <text class="modal-content">{{ content }}</text>
        </slot>

        <!-- 空态：占位图 + 提示文案 -->
        <view v-else class="modal-empty">
          <image class="modal-empty-img" :src="resolvedEmptyImage" mode="aspectFit" />
          <text class="modal-empty-text">{{ emptyText }}</text>
        </view>
      </view>

      <!-- 动作按钮：confirmText / cancelText 控制显隐。
           两个按钮时：取消=淡色，确认=深色；单按钮时：占满整行、深色主按钮 -->
      <view v-if="cancelText || confirmText" class="modal-actions">
        <view v-if="cancelText" class="modal-btn modal-btn-cancel" @click="onCancel">
          <text>{{ cancelText }}</text>
        </view>
        <view
          v-if="confirmText"
          class="modal-btn modal-btn-confirm"
          :class="{ 'modal-btn-danger': danger }"
          @click="onConfirm"
        >
          <text>{{ confirmText }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  /** 是否显示 */
  show: { type: Boolean, default: false },
  /** 标题 */
  title: { type: String, default: "" },
  /** 内容文本（无默认插槽时使用） */
  content: { type: String, default: "" },
  /** 取消按钮文案（为空则不显示） */
  cancelText: { type: String, default: "" },
  /** 确认按钮文案（为空则不显示） */
  confirmText: { type: String, default: "" },
  /** 是否显示右上角关闭按钮 */
  showClose: { type: Boolean, default: true },
  /** 点击遮罩是否关闭 */
  closeOnOverlay: { type: Boolean, default: true },
  /** 是否为空态（内容无值时展示占位图 + 提示） */
  empty: { type: Boolean, default: false },
  /** 危险操作：确认按钮显示为红色警示样式（如注销账号） */
  danger: { type: Boolean, default: false },
  /** 空态占位图（不传则随机取一张本地占位图） */
  emptyImage: { type: String, default: "" },
  /** 空态提示文案 */
  emptyText: { type: String, default: "这人什么也没留下" },
});

const emit = defineEmits(["close", "confirm", "cancel", "update:show"]);

// 本地占位图池：正式图片未准备时随机取一张，适配多种弹框场景
const EMPTY_IMAGE_POOL = [
  "/static/logo.png",
  "/static/images/icon_coin_none.png",
  "/static/images/icon_coin.png",
  "/static/images/icon_book.png",
  "/static/images/icon_wish.png",
];
const randomDefaultImage =
  EMPTY_IMAGE_POOL[Math.floor(Math.random() * EMPTY_IMAGE_POOL.length)];
const resolvedEmptyImage = computed(() => props.emptyImage || randomDefaultImage);

const closing = ref(false);
const btnPressed = ref(false);
// 退出动画时长（需与 CSS .is-closing animation 时长保持一致）
const CLOSE_ANIM_MS = 280;
let pendingType = null;
let finished = false;

function finishClose(type) {
  // 幂等：避免 animationend 与兜底定时器重复触发
  if (finished) return;
  finished = true;
  if (type) emit(type);
  emit("close");
  emit("update:show", false);
  closing.value = false;
  btnPressed.value = false;
}
function playClose(type) {
  if (closing.value) return;
  closing.value = true;
  finished = false; // 重置幂等标志：组件实例常驻，不随 show 销毁，必须每次关闭重新允许
  pendingType = type || null;
  // 兜底：万一某些环境 animationend 不触发也要卸载；
  // 关键：必须明显晚于动画结束，否则动画未播完就被 v-if 销毁 → “一闪”残影
  setTimeout(() => finishClose(pendingType), CLOSE_ANIM_MS + 140);
}
// 卡片退出动画结束后精确卸载（主路径），保证关闭过程完整顺滑
function onCardAnimationEnd() {
  if (closing.value) finishClose(pendingType);
}
function close() {
  btnPressed.value = true; // 保持关闭按钮旋转至关闭完成
  playClose();
}
function onOverlayClick() {
  if (props.closeOnOverlay) playClose();
}
function onCancel() {
  playClose("cancel");
}
function onConfirm() {
  playClose("confirm");
}
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(8rpx);
  -webkit-backdrop-filter: blur(8rpx);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 卡片：参考 Uiverse OTP-Form 的居中白卡 + 圆角 + 投影 */
.modal-card {
  position: relative;
  width: 560rpx;
  max-width: 88vw;
  padding: 56rpx 44rpx 44rpx;
  background: #fff;
  border-radius: 32rpx;
  box-shadow: 0 16rpx 64rpx rgba(0, 0, 0, 0.14), 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  animation: modalPop 0.28s cubic-bezier(0.34, 1.2, 0.64, 1);
}

@keyframes modalPop {
  from {
    opacity: 0;
    transform: scale(0.86);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 关闭按钮：右上角圆形，参考 Uiverse card.save 的悬浮/激活旋转动效 */
.modal-close {
  position: absolute;
  top: 18rpx;
  right: 18rpx;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.25s ease;
}

/* 用 CSS 绘制“×”，规避小程序内联 svg 不支持的问题 */
.modal-close-x {
  position: relative;
  width: 28rpx;
  height: 28rpx;
}
.modal-close-x::before,
.modal-close-x::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  width: 28rpx;
  height: 3rpx;
  border-radius: 2rpx;
  background: var(--ink4);
  transition: background 0.2s ease;
}
.modal-close-x::before {
  transform: translateY(-50%) rotate(45deg);
}
.modal-close-x::after {
  transform: translateY(-50%) rotate(-45deg);
}

/* 激活（触屏点击）：旋转 + 放大，呼应 Uiverse 的 save:hover 动效 */
.modal-close:active {
  transform: scale(1.12) rotate(90deg);
}
.modal-close:active .modal-close-x::before,
.modal-close:active .modal-close-x::after {
  background: var(--ink2);
}

/* 按下期间：保持旋转 + 放大，让动效真正可见（兼容小程序，不依赖 :active） */
.modal-close.pressed {
  transform: scale(1.12) rotate(90deg);
}
.modal-close.pressed .modal-close-x::before,
.modal-close.pressed .modal-close-x::after {
  background: var(--ink2);
}

/* 退出动画：卡片缩小 + 轻微下沉淡出 + 遮罩淡出，关闭过程平滑顺滑 */
.modal-overlay.is-closing {
  animation: overlayClose 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
.modal-card.is-closing {
  animation: modalClose 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
@keyframes modalClose {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.94) translateY(16rpx);
  }
}
@keyframes overlayClose {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* 标题：对应 Uiverse mainHeading */
.modal-title {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--ink);
  text-align: center;
  line-height: 1.3;
}

/* 内容区：对应 Uiverse otpSubheading */
.modal-body {
  width: 100%;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-content {
  display: block;
  font-size: 26rpx;
  color: var(--ink2);
  line-height: 1.75;
  text-align: center;
}

/* 空态：占位头像 + 提示文案 */
.modal-empty {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 0 8rpx;
}

.modal-empty-img {
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  background: var(--g0, #f1f7f2);
  box-shadow: 0 8rpx 28rpx rgba(0, 0, 0, 0.08);
  padding: 24rpx;
}

.modal-empty-text {
  font-size: 24rpx;
  color: var(--ink3);
  line-height: 1.5;
  text-align: center;
}

/* 动作按钮区 */
.modal-actions {
  width: 100%;
  display: flex;
  gap: 20rpx;
  margin-top: 8rpx;
}

.modal-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.2s ease;
}

.modal-btn:active {
  transform: scale(0.96);
}

/* 确认：深色主按钮（品牌渐变） */
.modal-btn-confirm {
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
  box-shadow: 0 8rpx 24rpx rgba(var(--brand-rgb), 0.28);
}

/* 危险操作：确认按钮红色警示（注销账号等） */
.modal-btn-danger {
  background: linear-gradient(135deg, #ff7a7a, #ff5252);
  box-shadow: 0 8rpx 24rpx rgba(255, 82, 82, 0.28);
}

/* 取消：淡色按钮 */
.modal-btn-cancel {
  background: rgba(245, 255, 247, 0.8);
  color: var(--ink3, #555);
}
</style>
