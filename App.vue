<script>
import { initAppSession, compensateDailySettlements, useUserStore } from '@/stores/user.js';
import { startTokenHeartbeat, stopTokenHeartbeat } from '@/stores/auth.js';
import { initPrivacy } from '@/stores/privacy.js';
import { todayDateKey } from '@/utils/date.js';

export default {
  onLaunch: async function () {
    console.log('[余钱罐] App Launch');
    // 初始化隐私协议检查（需在 session 之前，避免隐私接口调用被拦截）
    initPrivacy();
    const session = await initAppSession();
    console.log('[余钱罐] 会话就绪', session.mode, session.isLoggedIn ? '已登录' : '游客');
    uni.$emit('sparejar-session-ready', session);
    // 启动 token 心跳，运行期提前静默续期
    if (session.isLoggedIn) {
      startTokenHeartbeat();
    }
    // 首次引导：已登录且未完成引导则进入 Onboarding（§8.6）
    const store = useUserStore();
    if (session.isLoggedIn && store.state.user && store.state.user.onboarding_done === false) {
      uni.navigateTo({ url: '/pages/onboarding/onboarding' });
    }
    // 启动后补跑跨日结算（兜底定时任务）；仅登录态有效，游客态跳过
    if (session.isLoggedIn) {
      compensateDailySettlements(todayDateKey()).catch((e) =>
        console.warn('[App] 跨日补偿失败（已忽略）', e && e.message)
      );
    }
  },
  onShow: function () {
    console.log('[余钱罐] App Show');
    // 跨日补偿已在 onLaunch 完成；onShow 不再重复触发，避免与首页看板刷新抢跑
  },
  onHide: function () {
    console.log('[余钱罐] App Hide');
    // 切后台停止心跳，省电（下次 onLaunch/onShow 重新拉起）
    stopTokenHeartbeat();
  },
};
</script>

<template>
  <view id="app-root">
    <router-view />
  </view>
</template>

<style lang="scss">
/* 相对路径：HBuilderX/Vite 下 scss 的 @/ 别名常解析失败 */
@import './styles/app-global.scss';
</style>
