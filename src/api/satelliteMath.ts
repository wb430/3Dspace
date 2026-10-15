/**
 * 卫星轨道计算工具模块
 *
 * 本模块负责：
 * 1. 解析 Celestrak 返回的 TLE 纯文本，提取每颗卫星的名称与两行根数
 * 2. 使用 satellite.js 的 SGP4 模型推算卫星在任意时刻的位置
 * 3. 将地心惯性系(ECI)坐标转换为地理坐标(经纬度 + 高度)
 * 4. 计算卫星的轨道周期、速度等衍生参数
 *
 * 核心概念说明：
 * - TLE (Two-Line Element set)：两行轨道根数，描述卫星轨道的标准格式
 * - SGP4 (Simplified General Perturbations 4)：简化通用摄动模型，
 *   用于根据 TLE 推算近地轨道卫星的实时位置
 * - ECI (Earth-Centered Inertial)：地心惯性坐标系，坐标原点在地心，
 *   坐标轴指向固定恒星，不随地球自转
 * - ECEF (Earth-Centered Earth-Fixed)：地心地固坐标系，随地球自转
 * - 经度/纬度/高度：我们日常使用的地理坐标
 */
import * as satellite from 'satellite.js'

// ---------------------- 类型定义 ----------------------
export type SatRec = ReturnType<typeof satellite.twoline2satrec>

export interface SatelliteTLEItem {
  name: string
  noradId: string
  line1: string
  line2: string
  satrec: SatRec
}

export interface SatLLHResult {
  latitude: number
  longitude: number
  height: number
  velocity: number
}

export interface OrbitalElements {
  inclination: number
  raan: number
  eccentricity: number
  argPerigee: number
  meanAnomaly: number
  period: number
}

export interface LatLngPoint {
  latitude: number
  longitude: number
  height: number
}

/**
 * 解析 TLE 纯文本，返回卫星对象数组
 *
 * TLE 文本格式（每颗卫星 3 行）：
 *   卫星名称
 *   1 NNNNNU YYDDDA   ...  （第1行）
 *   2 NNNNN  III.iiii ...  （第2行）
 *
 * @param tleText Celestrak 返回的 TLE 纯文本
 * @returns 卫星数组
 */
export function parseTLE(tleText: string) {
  console.log('开始解析卫星TLE')
  const lines = tleText.trim().split(/\r?\n/)
  const satellites: SatelliteTLEItem[] = []

  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i]!.trim()
    const line1 = lines[i + 1]!
    const line2 = lines[i + 2]!

    // 校验：第1行以 '1 ' 开头，第2行以 '2 ' 开头
    if (!line1 || !line2) continue
    if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) continue

    try {
      // twoline2satrec 将两行根数解析为 satrec 对象，供后续 propagate 使用
      const satrec = satellite.twoline2satrec(line1, line2)
      // NORAD ID 在第1行的第3-7列
      const noradId = line1.substring(2, 7).trim()
      satellites.push({ name, noradId, line1, line2, satrec })
    } catch (err) {
      console.warn(`[parseTLE] 解析失败: ${name}`, err)
    }
  }
  return satellites
}

/**
 * 计算指定时刻卫星的地理坐标（经度、纬度、高度）
 *
 * 计算流程：
 * 1. propagate(satrec, date) -> 得到 ECI 系下的位置与速度 (km, km/s)
 * 2. gmst(date) -> 得到格林尼治恒星时，用于 ECI->ECEF 转换
 * 3. eciToGeodetic(positionEci, gmst) -> 得到 {longitude, latitude, height}
 *
 * @param satrec satellite.js 解析后的 satrec 对象
 * @param date 计算时刻，默认当前时间
 * @returns 经纬度高度速度，失败返回null
 */
export function getSatellitePosition(satrec: SatRec, date: Date = new Date()): SatLLHResult | null {
  try {
    // SGP4 推算：返回 { position, velocity }，单位 km / km/s
    const positionAndVelocity = satellite.propagate(satrec, date)
    if (!positionAndVelocity!.position) return null
    const positionEci = positionAndVelocity!.position
    const velocityEci = positionAndVelocity!.velocity

    // 计算格林尼治恒星时（GMST），用于 ECI 转 ECEF
    const gmst = satellite.gstime(date)
    // ECI -> 大地坐标（经度、纬度、高度）
    const positionGd = satellite.eciToGeodetic(positionEci, gmst)

    // 速度大小（标量），单位 km/s
    const velocity = Math.sqrt(velocityEci.x ** 2 + velocityEci.y ** 2 + velocityEci.z ** 2)

    return {
      // radians -> degrees
      latitude: satellite.degreesLat(positionGd.latitude),
      longitude: satellite.degreesLong(positionGd.longitude),
      height: positionGd.height, // km
      velocity, // km/s
    }
  } catch (err) {
    console.warn('[getSatellitePosition] 计算失败:', err)
    return null
  }
}

/**
 * 计算卫星的轨道周期（分钟）
 *
 * 从 TLE 第2行的平均运动（mean motion，单位：圈/天）推导：
 *   周期 = 1440 / 平均运动（分钟）
 *
 * @param satrec
 * @returns 轨道周期（分钟）
 */
export function getOrbitalPeriod(satrec: SatRec): number {
  // no 为平均运动（弧度/分钟），转成圈/天再算周期
  const meanMotionRadPerMin = satrec.no
  const revsPerDay = (meanMotionRadPerMin * 60 * 24) / (2 * Math.PI)
  return 1440 / revsPerDay
}

/**
 * 获取卫星的轨道基本参数（从 satrec 中提取）
 *
 * @param satrec
 * @returns 轨道六要素
 */
export function getOrbitalElements(satrec: SatRec): OrbitalElements {
  // satrec 中倾角、升交点赤经等以弧度存储，需转换为度
  const rad2deg = (r: number) => (r * 180) / Math.PI
  return {
    inclination: rad2deg(satrec.inclo),
    raan: rad2deg(satrec.nodeo),
    eccentricity: satrec.ecco,
    argPerigee: rad2deg(satrec.argpo),
    meanAnomaly: rad2deg(satrec.mo),
    period: getOrbitalPeriod(satrec),
  }
}

/**
 * 生成卫星未来一段时间内的轨道路径点
 * 用于在 3D 地球上绘制轨道线
 *
 * @param satrec
 * @param steps 采样点数
 * @param durationHours 预测时长（小时），默认一个轨道周期
 * @returns 经纬度高度点数组
 */
export function getOrbitPath(
  satrec: SatRec,
  steps = 128,
  durationHours: number | null = null,
): LatLngPoint[] {
  const path: LatLngPoint[] = []
  const now = new Date()
  const periodMin = durationHours ? durationHours * 60 : getOrbitalPeriod(satrec)
  // 至少覆盖一个完整轨道周期
  const totalMinutes = Math.max(periodMin, 90)
  const stepMs = (totalMinutes * 60 * 1000) / steps

  for (let i = 0; i <= steps; i++) {
    const date = new Date(now.getTime() + i * stepMs)
    const pos = getSatellitePosition(satrec, date)
    if (pos) path.push(pos)
  }
  return path
}

/**
 * 将经纬度 + 高度转换为 Three.js 场景中的 3D 坐标
 *
 * 原理：把地球看作半径为 R 的球体，将球坐标(纬度φ, 经度λ, 半径r)
 * 转换为直角坐标(x, y, z)。
 *
 * 经度方向必须与 three.js SphereGeometry 的贴图 UV 对齐，
 * 否则卫星会整体绕地轴偏移、与大陆位置对不上：
 * - equirectangular 地球贴图的经度 0°（格林威治）对应 +X 方向
 * - 东经沿 -Z 方向增大、西经沿 +Z 方向（从北极上空俯视逆时针）
 *
 * 推导自 SphereGeometry 顶点公式（phiStart=0, phiLength=2π）：
 *   x = -R·cos(u·2π)·sin(极角)，z = R·sin(u·2π)·sin(极角)
 *   其中 u = (经度+180)/360，化简后即：
 *   x = r·cos(纬度)·cos(经度)，z = -r·cos(纬度)·sin(经度)
 *
 * @param lat 纬度（度）
 * @param lng 经度（度）
 * @param alt 高度（km）
 * @param earthRadius 地球在场景中的半径
 * @param altitudeScale 高度缩放系数（避免低轨卫星贴地）
 * @returns three坐标对象 {x,y,z}
 */
export function latLngAltToVector3(
  lat: number,
  lng: number,
  alt: number,
  earthRadius: number,
  altitudeScale = 0.01,
): { x: number; y: number; z: number } {
  const phi = (lat * Math.PI) / 180
  const theta = (lng * Math.PI) / 180
  // 场景中的卫星距地心距离 = 地球半径 + 高度(缩放后)
  const r = earthRadius + alt * altitudeScale
  // 与地球贴图对齐：经度 0° 在 +X，东经向 -Z 递增
  const x = r * Math.cos(phi) * Math.cos(theta)
  const y = r * Math.sin(phi)
  const z = -r * Math.cos(phi) * Math.sin(theta)
  return { x, y, z }
}
