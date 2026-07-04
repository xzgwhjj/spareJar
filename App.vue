<script>
export default {
  onLaunch: function () {
    console.log('[余钱罐] App Launch');
  },
  onShow: function () {
    console.log('[余钱罐] App Show');
  },
  onHide: function () {
    console.log('[余钱罐] App Hide');
  },
};
</script>

<style lang="scss">
/* 每个页面公共css */
@import '@/uni.scss';

/* 全局基础 */
* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

page {
  font-family: 'Inter', -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif;
  background-color: #f2fcf2;
}

/* 页面滚动容器 */
.page-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}
.page-scroll::-webkit-scrollbar {
  display: none;
}

/* CSS 变量 - 品牌色彩 */
page {
  --g0: #f2fcf2;
  --g1: #e1fae3;
  --g2: #c2f2c8;
  --g3: #89e59c;
  --g4: #4fd974;
  --g5: #25cc5d;
  --ink: #0f1c14;
  --ink2: #3a5244;
  --ink3: #6b8c7a;
  --ink4: #9bb8a8;
  --red-soft: #ff6b6b;
  --red-bg: rgba(255, 107, 107, 0.1);
  --amber: #f59e0b;
  --amber-bg: rgba(245, 158, 11, 0.1);
}

/* 极光背景 - 共享样式 */
.aurora-bg-wrap {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.aurora-bg-base {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    #c8f4d0 0%,
    #d8f8e0 6%,
    #eafbec 14%,
    #f7fef8 24%,
    #ffffff 38%,
    #fdfffd 60%,
    #f8fef9 80%,
    #edfbf0 100%
  );
}

.aurora-top-halo {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 380px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(ellipse at 50% 30%, #a8efc0 0%, #c2f2c8 28%, #e1fae3 55%, transparent 75%);
  opacity: 0.72;
  filter: blur(38px);
}

.aurora-band-1 {
  position: absolute;
  top: -30px;
  left: -60px;
  width: 300px;
  height: 110px;
  background: linear-gradient(90deg, transparent, #c2f2c8 40%, #89e59c 65%, transparent);
  border-radius: 70px;
  opacity: 0.55;
  filter: blur(22px);
  animation: aurora-drift-1 9s ease-in-out infinite alternate;
}

.aurora-band-2 {
  position: absolute;
  top: 60px;
  right: -60px;
  width: 250px;
  height: 80px;
  background: linear-gradient(90deg, transparent, #a6eec0 40%, #c2f2c8 65%, transparent);
  border-radius: 60px;
  opacity: 0.42;
  filter: blur(26px);
  animation: aurora-drift-2 12s ease-in-out infinite alternate;
}

.blob-top-l {
  position: absolute;
  top: -20px;
  left: -15px;
  width: 210px;
  height: 210px;
  border-radius: 60% 40% 70% 30% / 42% 58% 42% 58%;
  background: radial-gradient(circle, #c2f2c8, transparent 68%);
  opacity: 0.28;
  filter: blur(42px);
  animation: blob-float-a 14s ease-in-out infinite alternate;
}

.blob-top-r {
  position: absolute;
  top: 50px;
  right: -20px;
  width: 180px;
  height: 180px;
  border-radius: 42% 58% 30% 70% / 60% 40% 60% 40%;
  background: radial-gradient(circle, #b8f0c2, transparent 66%);
  opacity: 0.22;
  filter: blur(40px);
  animation: blob-float-b 11s ease-in-out infinite alternate;
}

.blob-mid {
  position: absolute;
  top: 42%;
  left: -40px;
  width: 200px;
  height: 200px;
  border-radius: 55% 45% 40% 60% / 55% 45% 55% 45%;
  background: radial-gradient(circle, rgba(194, 242, 200, 0.2), transparent 65%);
  opacity: 0.4;
  filter: blur(50px);
  animation: blob-float-a 18s ease-in-out infinite alternate-reverse;
}

.blob-bot {
  position: absolute;
  bottom: 60px;
  right: -20px;
  width: 200px;
  height: 200px;
  border-radius: 45% 55% 60% 40% / 58% 42% 58% 42%;
  background: radial-gradient(circle, rgba(137, 229, 156, 0.15), transparent 65%);
  opacity: 0.35;
  filter: blur(45px);
  animation: blob-float-b 16s ease-in-out infinite alternate;
}

/* 玻璃卡片通用 */
.glass-hero {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(28px) saturate(1.6);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
  border: 1.5px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 14px 42px rgba(37, 204, 93, 0.09), 0 3px 12px rgba(0, 0, 0, 0.05), inset 0 1.5px 0 rgba(255, 255, 255, 0.98);
}

.glass-mid {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow: 0 6px 24px rgba(37, 204, 93, 0.08), 0 1px 6px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.96);
}

.glass-thin {
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(14px) saturate(1.3);
  -webkit-backdrop-filter: blur(14px) saturate(1.3);
  border: 1px solid rgba(255, 255, 255, 0.88);
  box-shadow: 0 3px 14px rgba(37, 204, 93, 0.06), 0 1px 4px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.94);
}

/* 极光动画 */
@keyframes aurora-drift-1 {
  0% {
    transform: translateX(0) translateY(0);
  }
  100% {
    transform: translateX(20px) translateY(-10px);
  }
}

@keyframes aurora-drift-2 {
  0% {
    transform: translateX(0) translateY(0);
  }
  100% {
    transform: translateX(-25px) translateY(8px);
  }
}

@keyframes blob-float-a {
  0% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(15px, -18px) scale(1.08);
  }
  100% {
    transform: translate(-10px, 10px) scale(0.94);
  }
}

@keyframes blob-float-b {
  0% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-20px, 12px) scale(0.92);
  }
  100% {
    transform: translate(12px, -15px) scale(1.06);
  }
}

/* 入场动画 */
.card-in-1 {
  animation: cardFadeIn 0.55s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.banner-in {
  animation: cardFadeIn 0.65s cubic-bezier(0.22, 0.61, 0.36, 1);
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 徽章脉冲 */
.badge-pulse {
  animation: badgePulse 2.5s ease-in-out infinite;
}

@keyframes badgePulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}

/* 进度条生长 */
.bar-grow {
  animation: barGrow 0.8s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
  width: 0;
}

@keyframes barGrow {
  to {
    width: var(--bar-w);
  }
}

/* 硬币消失动画 */
.coin-vanish-a {
  animation: coinPop 2.4s ease-in-out infinite 0s;
}
.coin-vanish-b {
  animation: coinPop 2.4s ease-in-out infinite 0.6s;
}
.coin-vanish-c {
  animation: coinPop 2.4s ease-in-out infinite 1.2s;
}

@keyframes coinPop {
  0%,
  85% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.2);
  }
}

/* 玻璃面板悬浮 */
.panel-float {
  animation: panelFloatIn 0.5s 0.3s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}

@keyframes panelFloatIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 堆栈收缩 */
.stack-shrink {
  transition: transform 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
}

/* 弹跳 */
@keyframes bounce-in {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.08);
  }
  70% {
    transform: scale(0.94);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Sheet 滑入 */
@keyframes slideUpIn {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* 淡入 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 旋转动画 */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spin-anim {
  animation: spin 1s linear infinite;
}

/* 火焰脉动 */
@keyframes flamePulse {
  0%,
  100% {
    transform: scaleY(1) scaleX(1);
    opacity: 0.9;
  }
  50% {
    transform: scaleY(1.12) scaleX(0.92);
    opacity: 1;
  }
}
</style>
