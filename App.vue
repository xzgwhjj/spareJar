<script>
import { initAppSession } from '@/stores/user.js';
import { initPrivacy } from '@/stores/privacy.js';

export default {
  onLaunch: async function () {
    console.log('[余钱罐] App Launch');
    // 初始化隐私协议检查（需在 session 之前，避免隐私接口调用被拦截）
    initPrivacy();
    const session = await initAppSession();
    console.log('[余钱罐] 会话就绪', session.mode, session.isLoggedIn ? '已登录' : '游客');
    uni.$emit('sparejar-session-ready', session);
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
/* 相对路径：HBuilderX/Vite 下 scss 的 @/ 别名常解析失败 */
@import './styles/app-global.scss';
</style>
