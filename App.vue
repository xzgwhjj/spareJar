<script>
import { initAppSession, compensateDailySettlements, useUserStore } from '@/stores/user.js';
import { initPrivacy } from '@/stores/privacy.js';

export default {
  onLaunch: async function () {
    console.log('[余钱罐] App Launch');
    // 初始化隐私协议检查（需在 session 之前，避免隐私接口调用被拦截）
    initPrivacy();
    const session = await initAppSession();
    console.log('[余钱罐] 会话就绪', session.mode, session.isLoggedIn ? '已登录' : '游客');
    uni.$emit('sparejar-session-ready', session);
    // 首次引导：已登录且未完成引导则进入 Onboarding（§8.6）
    const store = useUserStore();
    if (session.isLoggedIn && store.state.user && store.state.user.onboarding_done === false) {
      uni.navigateTo({ url: '/pages/onboarding/onboarding' });
    }
    // 启动后补跑跨日结算（兜底定时任务）
    compensateDailySettlements();
  },
  onShow: function () {
    console.log('[余钱罐] App Show');
    // 打开 App 跨日补偿：对今天之前的若干天补跑日切结算
    compensateDailySettlements();
  },
  onHide: function () {
    console.log('[余钱罐] App Hide');
  },
};
</script>

<style lang="scss">
/* 相对路径：HBuilderX/Vite 下 scss 的 @/ 别名常解析失败 */
@import './styles/app-global.scss';
</style>
