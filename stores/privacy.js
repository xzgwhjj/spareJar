/**
 * 微信隐私协议授权状态管理
 * 对接 wx.getPrivacySetting / wx.onNeedPrivacyAuthorization
 */
import { reactive, readonly } from 'vue';

const state = reactive({
  /** 是否需要弹出隐私授权弹窗 */
  show: false,
  /** 隐私协议名称 */
  contractName: '《余钱罐隐私保护指引》'
})

let registered = false

/**
 * 启动时调用，检查是否需要授权 + 注册后续监听
 */
export function initPrivacy() {
  // #ifdef MP-WEIXIN
  if (registered) return
  registered = true

  // 启动时主动查询
  if (typeof wx !== 'undefined' && wx.getPrivacySetting) {
    wx.getPrivacySetting({
      success: (res) => {
        console.log('[privacy] getPrivacySetting success:', res)
        console.log('[privacy] getPrivacySetting needAuth:', res.needAuthorization)
        state.contractName = res.privacyContractName || state.contractName
        if (res.needAuthorization) {
          state.show = true
        }
      },
      fail: (err) => {
        console.error('[privacy] getPrivacySetting fail:', err)
      }
    })
  }

  // 注册监听：当隐私接口被调用但未授权时触发
  if (typeof wx !== 'undefined' && wx.onNeedPrivacyAuthorization) {
    wx.onNeedPrivacyAuthorization(() => {
      console.log('[privacy] onNeedPrivacyAuthorization triggered')
      state.show = true
    })
  }
  // #endif
}

/** 用户点击同意（由 open-type="agreePrivacyAuthorization" 按钮自动完成授权） */
export function agreePrivacy() {
  state.show = false
}

/** 用户点击暂不同意 */
export function disagreePrivacy() {
  state.show = false
  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined') {
    wx.showToast({ title: '需同意隐私协议才能使用完整功能', icon: 'none', duration: 2000 })
  }
  // #endif
}

export function usePrivacy() {
  return {
    state: readonly(state),
    initPrivacy,
    agreePrivacy,
    disagreePrivacy
  }
}
