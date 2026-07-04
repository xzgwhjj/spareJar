<template>
  <view class="surplus-banner banner-in" data-cmp="SurplusBanner">
    <view class="surplus-card">
      <!-- 背景光 -->
      <view class="surplus-glow top-glow" />
      <view class="surplus-glow bottom-glow" />

      <!-- 主区 -->
      <view class="surplus-main">
        <view class="surplus-left">
          <view class="surplus-tag">
            <view class="surplus-dot" />
            <text class="surplus-tag-text">昨日结余待分配</text>
          </view>
          <view class="surplus-amount-row">
            <text class="surplus-plus">＋¥</text>
            <text class="surplus-num">{{ YESTERDAY_SURPLUS }}</text>
          </view>
          <view v-if="appliedChip" class="surplus-applied" :style="{ background: appliedChip.color + '18', borderColor: appliedChip.color + '40', color: appliedChip.color }">
            {{ appliedChip.emoji }} 已设为{{ appliedChip.label }} ✓
          </view>
        </view>
        <view class="surplus-actions">
          <view class="alloc-btn" @click="goAlloc">
            <text class="alloc-btn-text">立即分配</text>
            <text class="alloc-btn-arrow">→</text>
          </view>
          <view class="manage-btn" @click="goAlloc">
            <text class="manage-btn-text">分配管理</text>
            <text class="manage-btn-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 分隔线 -->
      <view class="surplus-divider" />

      <!-- 快速分配 -->
      <view class="quick-alloc">
        <view class="quick-label">
          <text class="quick-label-line">一键</text>
          <text class="quick-label-line">设置</text>
        </view>
        <view
          v-for="c in QUICK_ALLOC"
          :key="c.id"
          class="quick-chip"
          :class="{ active: applied === c.id }"
          :style="quickChipStyle(c)"
          @click="handleChip(c.id)"
        >
          <text class="quick-chip-icon">{{ c.emoji }}</text>
          <text class="quick-chip-label" :style="{ color: applied === c.id ? c.color : '#92400e' }">{{ c.label }}</text>
          <text class="quick-chip-hint" :style="{ color: applied === c.id ? c.color : '#c9882a' }">{{ applied === c.id ? '✓ 已应用' : c.hint }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';

const YESTERDAY_SURPLUS = 32;

const QUICK_ALLOC = [
  { id: 'pool', emoji: '💧', label: '存款池', hint: '存入长期', color: '#3b82f6', glow: 'rgba(59,130,246,0.28)', bg: 'rgba(59,130,246,0.08)' },
  { id: 'carry', emoji: '🔄', label: '次日额度', hint: '滚入明日', color: '#25cc5d', glow: 'rgba(37,204,93,0.28)', bg: 'rgba(37,204,93,0.08)' },
  { id: 'wish', emoji: '⭐', label: '心愿罐', hint: '慢慢攒', color: '#f59e0b', glow: 'rgba(245,158,11,0.28)', bg: 'rgba(245,158,11,0.08)' },
];

const applied = ref(null);
const ripple = ref(null);
const appliedChip = computed(() => QUICK_ALLOC.find(c => c.id === applied.value));

const handleChip = (id) => {
  applied.value = id;
  ripple.value = id;
  setTimeout(() => (ripple.value = null), 600);
};

const quickChipStyle = (c) => {
  const isOn = applied.value === c.id;
  return {
    borderColor: isOn ? c.color + '70' : c.color + '28',
    background: isOn ? `linear-gradient(145deg,${c.bg},${c.color}20)` : 'rgba(255,255,255,0.70)',
    boxShadow: isOn ? `0 4px 16px ${c.glow},inset 0 1px 0 rgba(255,255,255,0.6)` : '0 2px 8px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,0.85)',
    transform: isOn ? 'scale(1.04) translateY(-1px)' : 'scale(1)',
  };
};

const goAlloc = () => uni.navigateTo({ url: '/pages/surplus-alloc/surplus-alloc' });
</script>

<style scoped>
.surplus-banner { margin: 10px 16px 0; position: relative; }
.surplus-card {
  border-radius: 22px 22px 22px 14px;
  background: linear-gradient(135deg, rgba(255, 253, 245, 0.97) 0%, rgba(255, 248, 220, 0.92) 55%, rgba(255, 237, 170, 0.8) 100%);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1.5px solid rgba(245, 158, 11, 0.26);
  box-shadow: 0 8px 32px rgba(245, 158, 11, 0.13), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1.5px 0 rgba(255, 255, 255, 0.95);
  overflow: hidden;
  position: relative;
}
.surplus-glow { position: absolute; pointer-events: none; }
.top-glow { top: -30px; right: -20px; width: 120px; height: 120px; border-radius: 50%; background: radial-gradient(circle, rgba(251, 191, 36, 0.18), transparent 70%); }
.bottom-glow { bottom: -8px; left: -10px; width: 80px; height: 40px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.07), transparent); border-radius: 0 20px 0 0; }

.surplus-main {
  display: flex;
  align-items: flex-start;
  padding: 14px 14px 12px 16px;
  gap: 10px;
}
.surplus-left { flex: 1; }
.surplus-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(245, 158, 11, 0.12);
  border-radius: 8px;
  padding: 2px 8px;
  margin-bottom: 6px;
}
.surplus-dot { width: 5px; height: 5px; border-radius: 50%; background: #f59e0b; }
.surplus-tag-text { font-size: 9.5px; color: #92400e; font-weight: 600; }
.surplus-amount-row { display: flex; align-items: baseline; gap: 3px; }
.surplus-plus { font-size: 11px; color: #b45309; font-weight: 600; }
.surplus-num { font-size: 38px; font-weight: 900; color: #92400e; letter-spacing: -2; line-height: 1; }
.surplus-applied {
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 8px;
  padding: 2px 8px;
  font-size: 9.5px;
  font-weight: 700;
}

.surplus-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; padding-top: 2px; }
.alloc-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 12px;
  border-radius: 12px 12px 12px 6px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  cursor: pointer;
}
.alloc-btn-text { font-size: 10.5px; font-weight: 800; color: #fff; }
.alloc-btn-arrow { font-size: 11px; color: #fff; }
.manage-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 5px 10px;
  border-radius: 8px 8px 8px 4px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(245, 158, 11, 0.22);
  cursor: pointer;
}
.manage-btn-text { font-size: 9.5px; color: #b45309; font-weight: 500; }
.manage-btn-arrow { font-size: 14px; color: #b45309; }

.surplus-divider {
  height: 1px;
  margin: 0 16px;
  background: linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.3) 30%, rgba(245, 158, 11, 0.3) 70%, transparent);
}

.quick-alloc { padding: 10px 14px 14px; display: flex; gap: 8px; }
.quick-label {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex-shrink: 0;
  gap: 2px;
}
.quick-label-line { font-size: 8.5px; color: #d97706; font-weight: 600; line-height: 1.2; }

.quick-chip {
  flex: 1;
  position: relative;
  padding: 8px 6px;
  border-radius: 12px;
  border: 1.5px solid;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.22s cubic-bezier(0.34, 1.4, 0.64, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.quick-chip-icon { font-size: 18px; line-height: 1; }
.quick-chip-label { font-size: 9.5px; font-weight: 600; letter-spacing: -0.1; line-height: 1; }
.quick-chip-hint { font-size: 8px; opacity: 0.8; line-height: 1; font-weight: 400; }
</style>
