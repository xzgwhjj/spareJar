import { useUserStore } from '@/stores/user.js'

// 游客态登录双保险：未登录时提示并跳转到登录页（带 redirect 回跳原页）。
// 返回 true 表示已登录可继续；false 表示已拦截并跳转登录页。
export function requireLogin(redirectUrl) {
  const { checkLoggedIn } = useUserStore()
  if (checkLoggedIn()) return true
  uni.showToast({ title: '请先登录', icon: 'none' })
  uni.navigateTo({
    url:
      '/pages/login/login' +
      (redirectUrl ? '?redirect=' + encodeURIComponent(redirectUrl) : ''),
  })
  return false
}
