import service from '@/utils/req'
import { createCache, TWO_HOURS } from '@/utils/cache'
import { parseTLE, type SatelliteTLEItem } from '@/api/satelliteMath'

export interface IssObject {
  id: string
  latitude: number // 纬度（度）
  longitude: number // 经度（度）
  altitude: number // 高度（km）
  velocity: number // 速度（km/s）
  timestamp: number // Unix 时间戳
}

export interface ApodResult {
  copyright: string
  date: string
  explanation: string
  hdurl: string
  media_type: string
  service_version: string
  title: string
  url: string
}

export interface NeoObject {
  id: string
  name: string
  diameterMin: number // 最小直径（km）
  diameterMax: number // 最大直径（km）
  isHazardous: boolean // 是否为危险物体
  velocity: number // 速度（km/s）
  diameter: number // 直径（km）
  approachDate: string // 接近日期（YYYY-MM-DD）
  missDistance: number //  missDistance（km）
}

export interface NeoFeedResult {
  element_count: number
  near_earth_objects: Record<string, NeoObject[]> // key 为日期字符串
}

// ---------- 本地缓存实例（统一 2 小时过期） ----------

/** 卫星 TLE 本地缓存 */
export const satelliteCache = createCache<SatelliteTLEItem[]>({
  key: 'satellite_tle_cache',
  expireMs: TWO_HOURS,
})

/** 近地天体（NEO）本地缓存 */
export const neoCache = createCache<NeoFeedResult>({
  key: 'neo_feed_cache',
  expireMs: TWO_HOURS,
})

export function getAbodApi() {
  return service.get<ApodResult>(
    `https://api.nasa.gov/planetary/apod?api_key=kdNByiisU1SgmjkvJIZtrHd2izIh1DkPcgSfHk0E`,
    {
      params: {
        date: new Date().toISOString().substring(0, 10),
      },
    },
  )
}

export function getNeoFeedApi() {
  const le = service.get<NeoFeedResult>('https://api.nasa.gov/neo/rest/v1/feed', {
    params: {
      start_date: new Date().toISOString().substring(0, 10),
      api_key: 'kdNByiisU1SgmjkvJIZtrHd2izIh1DkPcgSfHk0E',
    },
  })
  return le
}

/** 近地天体数据（带 2 小时本地缓存） */
export function getNeoFeedWithCache() {
  return neoCache.getOrFetch(async () => {
    const res = await getNeoFeedApi()
    return res.data
  })
}

export interface TleItem {
  name: string
  line1: string
  line2: string
}

// // 解析celestrak tle文本为数组
// function parseTleText(rawText: string): TleItem[] {
//   const lines = rawText.split(/\r?\n/).filter((item) => item.trim())
//   // 每 3 行一组：卫星名 / L1 / L2，下标访问前先判空
//   const res: TleItem[] = []

//   for (let i = 0; i < lines.length; i += 3) {
//     //判断是否为空行
//     if (!lines[i + 1] || !lines[i + 2]) break
//     const name = lines[i]?.trim() || ''
//     const line1 = lines[i + 1]?.trim() || ''
//     const line2 = lines[i + 2]?.trim() || ''
//     res.push({ name, line1, line2 })
//   }
//   return res
// }

export function getCelestrakTleApi() {
  return service.get<string>(
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle',
    {
      responseType: 'text',
    },
  )
}

export async function getSatelliteTleWithCache() {
  // 未过期直接读本地缓存（不走接口）；过期才请求接口并写入缓存（逻辑封装在 getOrFetch 内）
  return satelliteCache.getOrFetch(async () => {
    const res = await getCelestrakTleApi()
    const satList = parseTLE(res.data)
    // 只保留需要的字段（satrec 也保留，供轨道推演使用）
    return satList.map((item) => ({
      name: item.name,
      noradId: item.noradId,
      line1: item.line1,
      line2: item.line2,
      satrec: item.satrec,
    }))
  })
}

export async function getIssPosition() {
  return service.get<IssObject>('https://api.wheretheiss.at/v1/satellites/25544')
}

// export interface SsaTleItem {
//   INTLDES: string
//   OBJECT_NAME: string
//   OBJECT_TYPE: string
//   TLE_LINE1: string
//   TLE_LINE2: string
// }

// export function getSsaTleApi() {
//   return service.get<SsaTleItem[]>('/ssa/TLE.json', {
//     baseURL: '', // 走 vite 代理路径
//   })
// }
