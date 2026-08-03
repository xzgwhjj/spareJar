import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
import AmountKeyboard from '@/components/AmountKeyboard.vue'
export function createApp() {
  const app = createSSRApp(App)
  // 全局注册数字键盘，供所有页面模板直接使用 <amount-keyboard />
  app.component('AmountKeyboard', AmountKeyboard)
  return {
    app
  }
}
// #endif