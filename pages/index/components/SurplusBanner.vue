<template>
  <!-- 待：如果结余未分配，小狗手撑在卡片上露出一个头，然后小狗右边有三个快捷按钮，或者卡片弄成有卡片头的那种，下面是一个圆角长方形，头部是有颜色或者花纹图案的，然后和小狗有重叠的卡片换成白色，然后黄色改成绿色；如果结余已经分配完成了，左上角一个小狗图趴着，然后小狗右边去掉三个快捷按钮。 -->
  <view class="surplus-banner banner-in" data-cmp="SurplusBanner">
    <view class="surplus-card">
      <view class="surplus-content-glow" />

      <!-- 左上：a 图片 + b 标签 -->
      <image class="surplus-avatar" src="/static/images/icon_surplus.png" mode="aspectFit" />

      <!-- c / d / f + e：小圆角矩形 + 大圆角矩形 -->
      <view class="surplus-folder">
        <view class="alloc-tab-row">
          <view class="alloc-tab-spacer">
          </view>
          <view class="alloc-tabs">
            <view v-for="(c, i) in QUICK_ALLOC" :key="c.id" class="alloc-tab" :class="{ chosen: applied === c.id }"
              @click="handleChip(c.id)"
              :style="{ borderRadius: i === 0 ? '20rpx 8rpx 0 20rpx' : i === QUICK_ALLOC.length - 1 ? '8rpx 20rpx 0 8rpx' : '8rpx 8rpx 0 8rpx' }">
              <text class="alloc-tab-label">{{ c.label }}</text>
              <view class="surplus-tab-indicator"></view>
            </view>
          </view>
        </view>

        <!-- e：底部内容区 -->
        <view class="surplus-body">
          <view class="surplus-body-content">
            <view class="surplus-main">
              <view class="surplus-title-row">
                <view class="surplus-dot" />
                <text class="surplus-title-text">昨日结余待分配</text>
              </view>
              <view class="surplus-amount-row">
                <text class="surplus-plus">＋¥</text>
                <text class="surplus-num">{{ YESTERDAY_SURPLUS }}</text>
              </view>
            </view>
            <view class="surplus-actions">
              <view class="alloc-btn" @click="goAlloc">
                <text class="alloc-btn-text">分配管理</text>
                <!-- 待：微玻璃效果的右箭头 -->
                <text class="alloc-btn-arrow">›</text>
              </view>
            </view>
          </view>
          <view v-if="appliedChip" class="surplus-applied"
            :style="{ background: appliedChip.color + '18', borderColor: appliedChip.color + '40', color: appliedChip.color }">
            {{ appliedChip.emoji }} 已设为{{ appliedChip.label }} ✓
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';

const YESTERDAY_SURPLUS = 32;

/** 单个 tab 动画占全周期的 1/3，12s 一轮 */
const TAB_CYCLE_S = 12;
const TAB_SLOT_S = TAB_CYCLE_S / 3;
// 待：emoji需要重新设计
const QUICK_ALLOC = [
  { id: 'pool', emoji: '💧', label: '存款池', hint: '长期', color: '#93c5fd', glow: 'rgba(147, 197, 253, 0.35)' },
  { id: 'carry', emoji: '🔄', label: '次日', hint: '滚入', color: '#89e59c', glow: 'rgba(137, 229, 155, 0.35)' },
  { id: 'wish', emoji: '⭐', label: '心愿', hint: '攒', color: '#fcd34d', glow: 'rgba(252, 211, 77, 0.35)' },
];

const applied = ref('pool');
const appliedChip = computed(() => QUICK_ALLOC.find(c => c.id === applied.value));

const handleChip = (id) => {
  applied.value = id;
};

const allocTabStyle = (c, index) => ({
  '--tab-color': c.color,
  '--tab-glow': c.glow,
  animationDelay: `${index * TAB_SLOT_S}s`,
});

const goAlloc = () => uni.navigateTo({ url: '/pages/surplus-alloc/surplus-alloc' });
</script>

<style scoped lang="scss">
/* ===== SCSS 变量 ===== */
$radius-card: 48rpx;

.surplus-banner {
  margin: 30rpx 32rpx 0;
  position: relative;
}

.surplus-card {
  border-radius: $radius-card;
  background: linear-gradient(160deg, rgba(37, 204, 93, 0.09) 0%, rgba(79, 217, 116, 0.05) 35%, rgba(255, 255, 255, 0.95) 75%, #ffffff 100%);
  border: 1.5px solid rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(32px) saturate(1.5);
  -webkit-backdrop-filter: blur(32px) saturate(1.5);
  box-shadow:
    0 10rpx 40rpx rgba(var(--g5), 0.1),
    0 2rpx 10rpx rgba(0, 0, 0, 0.04),
    inset 0 1.5rpx 0 rgba(255, 255, 255, 0.96);
  overflow: visible;
  position: relative;
  padding: 30rpx 24rpx 0 24rpx;

  .surplus-content-glow {
    position: absolute;
    top: -30px;
    left: -20px;
    width: 320rpx;
    height: 200rpx;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(137, 229, 155, 0.12), transparent 70%);
    pointer-events: none;
  }
}

/* ── 左上 a + b ── */

.surplus-avatar {
  width: 150rpx;
  height: 81rpx;
  position: absolute;
  top: 30rpx;
  left: 20rpx;
}

/* ── c / d / f + e ── */
.surplus-folder {
  position: relative;
}

.alloc-tab-row {
  display: flex;
  align-items: flex-end;
  padding: 0 4rpx;
  margin-bottom: -2rpx;
  position: relative;
  z-index: 2;

  .alloc-tab-spacer {
    flex: 1;
    min-width: 0;
  }

  .alloc-tabs {
    display: flex;
    align-items: flex-end;
    // gap: 12rpx;
    flex-shrink: 0;
  }
}

/* 小圆角矩形：初始贴在大矩形顶部，循环上浮 + 亮边框 */
.alloc-tab {
  width: 144rpx;
  height: 72rpx;
  border-radius: 20rpx;
  @include flex-center(column);
  gap: 2rpx;
  padding: 8rpx 12rpx;
  @include glass(32rpx, rgba(255, 255, 255, 0.72));
  border: 3rpx solid rgba(37, 204, 93, 0.15);
  border-bottom: none;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04), inset 0 2rpx 0 rgba(255, 255, 255, 0.88);
  transform: translateY(0);
  // animation: alloc-tab-pulse 12s ease-in-out infinite;
  transition: background 0.18s, border-color 0.18s;
  will-change: transform, border-color, box-shadow;

  &.chosen {
    // background: rgba(255, 255, 255, 0.88);
    background: rgba(255, 255, 255, 0.92);
    border-color: rgba(37, 204, 93, 0.30);
    border-bottom: 3rpx solid rgba(255, 255, 255, 0.92);
    z-index: 3;

    .alloc-tab-label {
      font-weight: 700;
      color: var(--ink-deep);
    }
  }

  &-label {
    font-size: 24rpx;
    font-weight: 600;
    color: var(--ink3);
    white-space: nowrap;
    position: relative;
    z-index: 1;
    transition: color 0.18s;
  }
}

/*
 * 12s 一轮，每个 tab delay 错开 4s
 * 在各自 4s 窗口内：上升(0-10%) → 停住(10-18%) → 下降(18-28%) → 静止(28-33.33%)
 */
@keyframes alloc-tab-pulse {

  0%,
  33.33%,
  100% {
    transform: translateY(0);
    border-color: rgba(255, 255, 255, 0.75);
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04), inset 0 2rpx 0 rgba(255, 255, 255, 0.88);
  }

  6% {
    transform: translateY(-8rpx);
    border-color: rgba(255, 255, 255, 0.88);
    box-shadow: 0 0 20rpx var(--tab-glow), inset 0 2rpx 0 rgba(255, 255, 255, 0.9);
  }

  10%,
  16% {
    transform: translateY(-16rpx);
    border-color: var(--tab-color);
    box-shadow: 0 0 32rpx var(--tab-glow), 0 8rpx 24rpx rgba(0, 0, 0, 0.06), inset 0 2rpx 0 rgba(255, 255, 255, 0.95);
  }

  24% {
    transform: translateY(-8rpx);
    border-color: rgba(255, 255, 255, 0.88);
    box-shadow: 0 0 20rpx var(--tab-glow), inset 0 2rpx 0 rgba(255, 255, 255, 0.9);
  }

  28% {
    transform: translateY(0);
    border-color: rgba(255, 255, 255, 0.75);
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04), inset 0 2rpx 0 rgba(255, 255, 255, 0.88);
  }
}

/* e：大圆角矩形 */
.surplus-body {
  position: relative;
  border-radius: 32rpx;
  padding: 28rpx;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16rpx 20rpx;
  @include glass(44rpx, rgba(255, 255, 255, 0.46));
  border: 2rpx solid rgba(255, 255, 255, 0.68);
  box-shadow:
    0 8rpx 48rpx rgba(var(--g5), 0.1),
    inset 0 3rpx 0 rgba(255, 255, 255, 0.88),
    inset 0 -2rpx 0 rgba(var(--g5), 0.06);

  .surplus-body-content {
    width: 100%;
    display: flex;
    align-items: flex-end;
    padding: 32rpx 20rpx 24rpx 20rpx;
    gap: 20rpx;
    position: relative;
    background: rgba(255, 255, 255, 0.30);

    /* 左侧主体：占据最大宽度，且允许收缩以便右侧按钮不被挤压 */
    .surplus-main {
      flex: 1 1 auto;
      min-width: 0;
    }
  }

  .surplus-title-row {
    display: flex;
    align-items: center;
    gap: 10rpx;
    margin-bottom: 8rpx;

    .surplus-dot {
      width: 12rpx;
      height: 12rpx;
      border-radius: 50%;
      background: var(--g5);
      flex-shrink: 0;
      margin-top: 2rpx;
      box-shadow: 0 0 12rpx rgba(37, 204, 93, 0.55);
    }

    .surplus-title-text {
      font-size: 22rpx;
      font-weight: 700;
      color: var(--ink2);
      letter-spacing: 0.3px;
    }
  }

  .surplus-amount-row {
    display: flex;
    align-items: baseline;
    gap: 6rpx;
    flex: 1;
    min-width: 0;
    flex-wrap: wrap;

    .surplus-plus {
      font-size: 26rpx;
      color: var(--g5);
      font-weight: 700;
      flex-shrink: 0;
    }

    .surplus-num {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 80rpx;
      font-weight: 900;
      color: var(--ink-deep);
      letter-spacing: -4rpx;
      line-height: 1.05;
      word-break: break-all;
      overflow-wrap: anywhere;
    }
  }
}

.surplus-applied {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  border-radius: 20rpx;
  border: 2rpx solid;
  padding: 6rpx 18rpx;
  font-size: 19rpx;
  font-weight: 700;
  width: 100%;
}

.surplus-actions {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 16rpx;
  margin-left: auto;
  flex-shrink: 0;

  .alloc-btn {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10rpx;
    padding: 18rpx 36rpx;
    border-radius: 40rpx;
    border: none;
    outline: none;
    cursor: pointer;
    background: linear-gradient(135deg, var(--g5), var(--g4));
    box-shadow: 0 10rpx 36rpx rgba(37, 204, 93, 0.35), inset 0 2rpx 0 rgba(255, 255, 255, 0.22);
    transition: transform 0.15s, box-shadow 0.15s;

    &:active {
      transform: scale(0.96);
      box-shadow: 0 4rpx 16rpx rgba(37, 204, 93, 0.25);
    }

    &-text {
      font-size: 24rpx;
      font-weight: 800;
      color: #fff;
      letter-spacing: 0.2px;
    }

    &-arrow {
      font-size: 22rpx;
      color: #fff;
    }
  }
}
</style>
