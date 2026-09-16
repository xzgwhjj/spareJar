import { cdn } from '@/utils/cdn.js'

// WMO weathercode → 天气图标（对应 /weather 目录下的图标文件，部署到 /app_static/images/）
const WMO_ICON_MAP = {
  0: 'icon_sunny',
  1: 'icon_sunny',
  2: 'icon_cloudy',
  3: 'icon_overcast',
  45: 'icon_fog',
  48: 'icon_fog',
  51: 'icon_rain',
  53: 'icon_rain',
  55: 'icon_rain',
  56: 'icon_rain',
  57: 'icon_rain',
  61: 'icon_rain',
  63: 'icon_rain',
  65: 'icon_rain',
  66: 'icon_rain',
  67: 'icon_rain',
  71: 'icon_snow',
  73: 'icon_snow',
  75: 'icon_snow',
  77: 'icon_snow',
  80: 'icon_rain',
  81: 'icon_rain',
  82: 'icon_rain',
  85: 'icon_snow',
  86: 'icon_snow',
  95: 'icon_thunder',
  96: 'icon_hail',
  99: 'icon_hail',
}

// 全部天气图标（拒绝授权 / 获取失败时随机使用）
export const ALL_WEATHER_ICONS = [
  'icon_sunny',
  'icon_cloudy',
  'icon_overcast',
  'icon_fog',
  'icon_rain',
  'icon_snow',
  'icon_thunder',
  'icon_hail',
  'icon_wind',
  'icon_typhoon',
  'icon_tornado',
  'icon_sandstorm',
]

function wmoToIcon(code, windspeed) {
  // 大风（≥40km/h）映射为 wind 图标；其余极端天气（台风/龙卷/沙尘）仅随机时出现
  if (typeof windspeed === 'number' && windspeed >= 40) return 'icon_wind'
  return WMO_ICON_MAP[code] || 'icon_sunny'
}

function request(url) {
  return new Promise((resolve, reject) => {
    uni.request({ url, success: resolve, fail: reject })
  })
}

/**
 * 根据经纬度获取天气图标名（使用 Open-Meteo 免费接口，无需 API key）。
 * 注意：
 *  - 开发期 manifest 已设 urlCheck:false，可直接请求；
 *  - 生产环境建议改为 uniCloud 云函数中转或自有 key，避免域名白名单/限流问题。
 * @returns {Promise<string>} 图标名，如 'icon_sunny'
 */
export async function fetchWeatherIcon(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
  const res = await request(url)
  const cw = res && res.data && res.data.current_weather
  if (!cw || cw.weathercode == null) throw new Error('天气数据缺失')
  return wmoToIcon(cw.weathercode, cw.windspeed)
}

export function randomWeatherIcon() {
  return ALL_WEATHER_ICONS[Math.floor(Math.random() * ALL_WEATHER_ICONS.length)]
}

export function weatherIconUrl(name) {
  return cdn(`/app_static/images/${name}.png`)
}
