<template>
  <view class="ph" :style="{ paddingTop: pagePaddingTop }" data-cmp="PageHeader">
    <!-- 左侧：返回按钮（默认图片图标）或自定义插槽 -->
    <view v-if="back" class="ph-back" @click="onBack">
      <image
        :src="cdn('/app_static/images/icon_left.png')"
        class="ph-back-icon"
        mode="aspectFit"
      ></image>
    </view>
    <view v-else class="ph-left">
      <slot name="left" />
    </view>

    <!-- 标题区：支持主标题 + 可选副标题 -->
    <view class="ph-title-wrap">
      <text v-if="subtitle" class="ph-sub">{{ subtitle }}</text>
      <text class="ph-title">{{ title }}</text>
    </view>

    <!-- 右侧：默认 72rpx 占位以保持标题居中；可自定义 -->
    <view class="ph-right">
      <slot name="right">
        <view style="width: 72rpx" />
      </slot>
    </view>
  </view>
</template>

<script setup>
import { ref } from "vue";
import { cdn } from "@/utils/cdn.js";

const props = defineProps({
  // 主标题
  title: { type: String, default: "" },
  // 副标题（可选，显示在标题上方）
  subtitle: { type: String, default: "" },
  // 是否显示左侧返回按钮，默认 true
  back: { type: Boolean, default: true },
});

const emit = defineEmits(["back"]);

// 顶部安全区：按状态栏/胶囊动态计算上内边距（与资产页/限额设置页一致）
// 顶栏整体再上移约 16rpx（≈8px），避免返回键离顶部过远
function resolveTop() {
  try {
    const rect = uni.getMenuButtonBoundingClientRect();
    if (rect && rect.top > 0 && rect.height > 0) {
      return `${rect.top - 4}px`;
    }
  } catch (e) {}
  const { statusBarHeight = 20 } = uni.getSystemInfoSync();
  return `${statusBarHeight + 40}px`;
}

const pagePaddingTop = ref(resolveTop());

function onBack() {
  emit("back");
}
</script>

<style scoped>
.ph {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx 20rpx;
}
.ph-back {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
}
.ph-back-icon {
  width: 60rpx;
  height: 60rpx;
}
.ph-left {
  width: 72rpx;
  min-height: 60rpx;
  display: flex;
  align-items: center;
}
.ph-title-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
}
.ph-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--ink);
}
.ph-sub {
  font-size: 22rpx;
  color: var(--ink4);
  margin-bottom: 2rpx;
}
.ph-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 72rpx;
}
</style>
