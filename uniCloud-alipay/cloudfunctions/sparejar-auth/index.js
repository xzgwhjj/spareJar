'use strict'

const uniID = require('uni-id-common')
const createConfig = require('uni-config-center')({ pluginId: 'uni-id' })
// 复用 sparejar-db 公共模块的幂等总账本初始化逻辑（ensureMasterLedger）
const dbApi = require('sparejar-db')

function ok(data) {
  return { code: 0, message: 'ok', data }
}

function fail(message, code = 400) {
  return { code, message }
}

function resolveAppConfig(context) {
  const raw = createConfig.config()
  if (Array.isArray(raw)) {
    const appId = context.APPID || (context.CLIENTINFO && context.CLIENTINFO.appId)
    return raw.find((item) => item.dcloudAppid === appId)
      || raw.find((item) => item.isDefaultConfig)
      || raw[0]
      || {}
  }
  return raw || {}
}

function getWeixinOAuthConfig(context) {
  const appConfig = resolveAppConfig(context)
  const mpConfig = appConfig['mp-weixin'] || {}
  const oauth = (mpConfig.oauth && mpConfig.oauth.weixin) || {}
  return {
    appid: oauth.appid || '',
    appsecret: oauth.appsecret || ''
  }
}

async function jscode2session(code, appid, appsecret) {
  const url = 'https://api.weixin.qq.com/sns/jscode2session'
  const res = await uniCloud.httpclient.request(url, {
    method: 'GET',
    data: {
      appid,
      secret: appsecret,
      js_code: code,
      grant_type: 'authorization_code'
    },
    dataType: 'json'
  })

  const data = res.data || {}
  if (data.errcode) {
    throw new Error(data.errmsg || `weixin error ${data.errcode}`)
  }
  if (!data.openid) {
    throw new Error('weixin response missing openid')
  }
  return data
}

async function upsertUniIdUser(openid, unionid) {
  const db = uniCloud.database()
  const users = db.collection('uni-id-users')
  const now = Date.now()
  const existing = await users.doc(openid).get()
  const doc = existing.data && existing.data[0]

  if (doc) {
    await users.doc(openid).update({
      wx_openid: openid,
      wx_unionid: unionid || doc.wx_unionid || null,
      last_login_date: now
    })
    // 仅更新登录态，未新建账户
    return { user: doc, isNew: false }
  }

  const newDoc = {
    wx_openid: openid,
    wx_unionid: unionid || null,
    nickname: '',
    avatar: '',
    register_date: now,
    last_login_date: now,
    token: [],
    status: 0
  }
  await users.doc(openid).set(newDoc)

  return { user: { _id: openid, ...newDoc }, isNew: true }
}

exports.main = async (event, context) => {
  const { action, code, uid } = event || {}

  if (action === 'refreshToken') {
    // 无感续期：凭本地持久化的 uid 重新签发 token，无需微信 code / 重新授权
    if (!uid) {
      return fail('uid is required for refreshToken', 400)
    }
    try {
      const uniIdIns = uniID.createInstance({ context })
      // 校验用户是否仍有效（status=0），无效则拒绝续期
      const userRes = await uniCloud.database().collection('uni-id-users').doc(uid).get()
      const user = userRes.data && userRes.data[0]
      if (!user || (typeof user.status === 'number' && user.status !== 0)) {
        return fail('用户不存在或已被禁用', 403)
      }
      const tokenRes = await uniIdIns.createToken({ uid })
      if (tokenRes.errCode !== 0) {
        return fail(tokenRes.errMsg || 'create token failed', 500)
      }
      return ok({
        uid,
        token: tokenRes.token,
        tokenExpired: tokenRes.tokenExpired
      })
    } catch (err) {
      console.error('[sparejar-auth] refreshToken failed', uid, err)
      return fail(err.message || 'refresh token failed', 500)
    }
  }

  if (action !== 'loginByWeixin') {
    return fail(`unknown action: ${action}`, 404)
  }
  if (!code) {
    return fail('code is required')
  }

  const { appid, appsecret } = getWeixinOAuthConfig(context)
  if (!appid || !appsecret) {
    return fail('请在 uni_modules/uni-config-center/.../uni-id/config.json 配置 mp-weixin.oauth.weixin.appsecret', 500)
  }

  try {
    const wxSession = await jscode2session(code, appid, appsecret)
    const openid = wxSession.openid
    const { isNew } = await upsertUniIdUser(openid, wxSession.unionid)

    // 注册（首次创建用户）即初始化专属默认总账本，并与用户 openid 关联；
    // 后续登录/进入应用时该账本已存在，直接按 user_id 读取，避免重复创建。
    if (isNew) {
      try {
        await dbApi.ensureMasterLedger(openid)
      } catch (e) {
        console.error('[sparejar-auth] 新用户创建默认总账本失败', openid, e)
      }
    }

    const uniIdIns = uniID.createInstance({ context })
    const tokenRes = await uniIdIns.createToken({ uid: openid })

    if (tokenRes.errCode !== 0) {
      return fail(tokenRes.errMsg || 'create token failed', 500)
    }

    return ok({
      uid: openid,
      openid,
      token: tokenRes.token,
      tokenExpired: tokenRes.tokenExpired
    })
  } catch (err) {
    console.error('[sparejar-auth]', err)
    return fail(err.message || 'login failed', 500)
  }
}
