'use strict'

const uniID = require('uni-id-common')
const createConfig = require('uni-config-center')({ pluginId: 'uni-id' })

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
    return doc
  }

  await users.doc(openid).set({
    wx_openid: openid,
    wx_unionid: unionid || null,
    nickname: '',
    avatar: '',
    register_date: now,
    last_login_date: now,
    token: [],
    status: 0
  })

  return { _id: openid, wx_openid: openid }
}

exports.main = async (event, context) => {
  const { action, code } = event || {}

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
    await upsertUniIdUser(openid, wxSession.unionid)

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
