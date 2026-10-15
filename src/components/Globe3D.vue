<template>
  <div ref="containerRef" class="container"></div>
</template>
<script setup lang="ts">
import * as THREE from 'three'
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
// import satelliteTextureUrl from '../assets/sat-icon.png'
import earthTextureUrl from '../assets/earth_atmos_2048.jpg'
import cloudTextureUrl from '../assets/clouds.png'
import satelliteTextureUrl from '../assets/satellite2.png'
import IssTextureUrl from '../assets/Iss2.png'
import CeleTextureUrl from '../assets/tianti.png'
import {
  getSatellitePosition,
  getOrbitPath,
  latLngAltToVector3,
  type SatelliteTLEItem,
} from '@/api/satelliteMath'
import type { PropType } from 'vue'
import type { IssObject } from '@/api/spaceApi'

//全局相关变量
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
const containerRef = ref<HTMLDivElement | null>(null)
const clock = new THREE.Clock()
let animateId: number
let controls: OrbitControls = {} as OrbitControls

//地球球体
let earth: THREE.Mesh
let cloud: THREE.Mesh
let cloudsMesh: THREE.Mesh
let atmosphere: THREE.Mesh

//空间站
let Iss: THREE.Sprite
let issMat: THREE.SpriteMaterial

//天体
let cele: THREE.Mesh
let celeMesh: THREE.MeshPhongMaterial
let dangerCeleMesh: THREE.MeshPhongMaterial
let celeGeo: THREE.SphereGeometry
let celeMap = new Map<string, THREE.Mesh>()
let celeGlowMat: THREE.ShaderMaterial

//星空
let stars: THREE.Points

//// 存放卫星mesh，用于diff增量更新
const satelliteMeshMap = new Map<string, THREE.Sprite>()
const orbitLineMap = new Map<string, THREE.Line>()
let satelliteMaterial = new THREE.SpriteMaterial()
let selectedSatelliteMaterial = new THREE.SpriteMaterial()
let selectedOrbitLine: THREE.Line | null = null

const EARTH_RADIUS = 5
const ALT_SCALE = 0.01

const satelliteGroup = new THREE.Group()
const celeGroup = new THREE.Group()

// 射线拾取
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

const props = defineProps({
  issPosition: {
    type: Object as PropType<IssObject>,
    default: () => {},
  },
  neoFeed: {
    type: Array,
    default: () => [],
  },
  selectedNoradId: {
    type: String,
    default: '',
  },
  // 卫星 TLE 列表（由父组件传入：优先用本地缓存预填，异步接口到达后再替换）
  tleList: {
    type: Array as PropType<SatelliteTLEItem[]>,
    default: () => [],
  },
})

const emit = defineEmits(['tleView', 'issInfo', 'celeInfo'])

function initScene() {
  //场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000010)
  //相机
  // 1. **fov**：视场角 (单位 °)，垂直方向视野角度。
  // - 越小：物体放大；越大：视野变广，物体变小。常用 `45~75`
  // 2. **aspect**：画布宽高比 `width / height`
  // > 必须和渲染画布比例一致，否则画面拉伸变形
  // 3. **near**：近裁剪面。距离相机小于这个值的物体**不渲染**。
  // >
  // > 不要写 0，推荐 `0.1`
  // 4. **far**：远裁剪面。距离相机大于这个值的物体**不渲染**。
  // >
  // > 不要无限大，按需设置，比如 `1000`
  camera = new THREE.PerspectiveCamera(
    45,
    (containerRef.value?.clientWidth || 0) / (containerRef.value?.clientHeight || 0),
    0.1,
    2000,
  )
  camera.position.z = 20

  //渲染器
  renderer = new THREE.WebGLRenderer({
    antialias: true, // 抗锯齿，物体边缘更平滑，推荐开启
    alpha: false, // 画布是否支持透明背景
    // canvas: dom,  // 可以传入已存在的canvas元素
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(containerRef.value?.clientWidth || 0, containerRef.value?.clientHeight || 0)
  containerRef.value!.appendChild(renderer.domElement)

  //轨道控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  //环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 1)
  scene.add(ambientLight)
  //点光源
  const pointLight = new THREE.PointLight(0xffffff, 1, 10)
  pointLight.position.set(5, 3, 5)
  scene.add(pointLight)
}

// —— 回退贴图：Canvas 手绘经纬网格（13.5.5）——
// 网络贴图加载失败（断网/CORS）时地球不至于变成纯色球
function createFallbackTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512 // 2:1 等距圆柱比例（13.5.6）
  const ctx = canvas.getContext('2d')
  ctx!.fillStyle = '#0b2d6b' // 深蓝海洋
  ctx!.fillRect(0, 0, 1024, 512)
  ctx!.strokeStyle = 'rgba(140,190,255,0.28)' // 淡蓝经纬网格
  for (let i = 0; i <= 24; i++) {
    // 24 条经线（每 15°）
    ctx!.beginPath()
    ctx!.moveTo((i / 24) * 1024, 0)
    ctx!.lineTo((i / 24) * 1024, 512)
    ctx!.stroke()
  }
  for (let i = 0; i <= 12; i++) {
    // 12 条纬线
    ctx!.beginPath()
    ctx!.moveTo(0, (i / 12) * 512)
    ctx!.lineTo(1024, (i / 12) * 512)
    ctx!.stroke()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace // 颜色贴图必标 sRGB（13.5.4）
  return tex
}

//R2 地球贴图
function createEarth() {
  const maxAniso = renderer.capabilities.getMaxAnisotropy()
  const textureLoader = new THREE.TextureLoader()
  // const earthTex = textureLoader.load(
  //   'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
  // )
  // const cloudTex = textureLoader.load(
  //   'https://threejs.org/examples/textures/planets/cloudearth_atmos_2048.jpg',
  // )

  //地球球体
  const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 128, 128)
  const earthMat = new THREE.MeshPhongMaterial({
    map: createFallbackTexture(),
    specular: new THREE.Color(0x333333), // 海面高光颜色
    shininess: 14,
  })
  earth = new THREE.Mesh(earthGeo, earthMat)
  scene.add(earth)

  textureLoader.load(
    earthTextureUrl, //
    (tex) => {
      // onLoad：加载成功 → 替换占位贴图
      tex.colorSpace = THREE.SRGBColorSpace // 颜色贴图必须标记 sRGB，否则整体发灰
      tex.anisotropy = maxAniso // 斜视角清晰度拉满
      earthMat.map = tex
      earthMat.needsUpdate = true // 材质换图后必须手动通知重编译！
      console.log('地球贴图加载成功')
    },
    undefined, // onProgress 自 r84 起不再回调，官方要求传 undefined
    () => console.warn('网络贴图加载失败，保持 Canvas 兜底贴图（检查网络或改用本地路径）'),
  )

  //云层
  const cloudGeo = new THREE.SphereGeometry(5.1, 64, 64)
  const cloudMat = new THREE.MeshBasicMaterial({
    map: null,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  })
  cloud = new THREE.Mesh(cloudGeo, cloudMat)
  scene.add(cloud)
  textureLoader.load(
    cloudTextureUrl, // 云图
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      cloudMat.map = tex
      cloudMat.needsUpdate = true
    },
    undefined,
    () => {
      cloud.visible = false
      console.warn('[回退] 云图加载失败，隐藏云层')
    },
  )
  cloudsMesh = cloud
  // 云层网格引用存到组件级变量，供渲染循环差速自转使用（同样不走响应式）

  //大气层
  const atmosVertex = `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
  const atmosFragment = `varying vec3 vNormal; void main(){ float intensity = pow(0.7 - dot(vNormal, vec3(0,0,1)), 2.0); gl_FragColor = vec4(0.3,0.6,1.0,1.0)*intensity; }`
  const atmosphereGeo = new THREE.SphereGeometry(5.15, 64, 64)
  const atmosMat = new THREE.ShaderMaterial({
    vertexShader: atmosVertex,
    fragmentShader: atmosFragment,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
  })
  atmosphere = new THREE.Mesh(atmosphereGeo, atmosMat)
  scene.add(atmosphere)
}

//ISS空间站贴图
function createIssTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  // 清空画布（透明背景）
  ctx.clearRect(0, 0, 64, 64)
  // ---------- 中心舱体 ----------
  ctx.fillStyle = '#dddddd'
  ctx.fillRect(24, 28, 16, 8)
  // ---------- 太阳能板 左右 ----------
  ctx.fillStyle = '#4488bb'
  // 左帆板
  ctx.fillRect(4, 30, 18, 4)
  // 右帆板
  ctx.fillRect(42, 30, 18, 4)
  // 太阳能板线条细节
  ctx.strokeStyle = '#225588'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(4, 32)
  ctx.lineTo(22, 32)
  ctx.moveTo(42, 32)
  ctx.lineTo(60, 32)
  ctx.stroke()
  // ---------- 中心发光光晕 ----------
  const glow = ctx.createRadialGradient(32, 32, 2, 32, 32, 24)
  glow.addColorStop(0, 'rgba(255,230,180,0.7)')
  glow.addColorStop(1, 'rgba(255,210,120,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 64, 64)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
//创建空间站实例e
function createIss() {
  issMat = new THREE.SpriteMaterial({
    map: createIssTexture(),
    transparent: true, // 海面高光颜色
    opacity: 0.8,
  })
  new THREE.TextureLoader().load(
    IssTextureUrl, // ★ import 进来的指定空间站纹理 URL（Vite 处理后的可访问地址）
    (tex) => {
      // 成功：整体替换贴图，所有空间站实例同步换装
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
      issMat.map = tex
      issMat.needsUpdate = true // 材质换图必须手动通知
      console.log('指定空间站纹理加载成功')
    },
    undefined,
    () => console.warn('指定空间站纹理加载失败，保持 Canvas 光点兜底（检查 src/assets/ 路径）'),
  )
}
//更新空间站位置
function updataIssPosition() {
  if (!props.issPosition) return
  // 先删除旧空间站
  if (Iss) {
    scene.remove(Iss)
    Iss.material.dispose()
  }

  Iss = new THREE.Sprite(issMat.clone())
  const vec = latLngAltToVector3(
    props.issPosition.latitude,
    props.issPosition.longitude,
    props.issPosition.altitude,
    EARTH_RADIUS,
    ALT_SCALE,
  )

  const pos = new THREE.Vector3(vec.x, vec.y, vec.z)
  Iss.scale.set(1, 1, 1)
  Iss.position.copy(pos)
  Iss.userData = {
    id: props.issPosition.id,
    name: 'ISS',
    latitude: props.issPosition.latitude,
    longitude: props.issPosition.longitude,
    altitude: props.issPosition.altitude,
    timestamp: props.issPosition.timestamp,
  }
  scene.add(Iss)
}

//手绘天体贴图
function createCeleFallbackTexture(size = 64) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // 清空画布透明
  ctx.clearRect(0, 0, size, size)
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.32

  // 基础岩石底色径向渐变
  const baseGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
  baseGrad.addColorStop(0, '#8c7b70')
  baseGrad.addColorStop(0.7, '#594f49')
  baseGrad.addColorStop(1, '#302b28')

  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = baseGrad
  ctx.fill()

  // 随机陨石坑斑点
  const craterCount = 8
  for (let i = 0; i < craterCount; i++) {
    const r = Math.random() * radius * 0.7
    const angle = Math.random() * Math.PI * 2
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    const craterR = radius * (0.04 + Math.random() * 0.12)

    const craterGrad = ctx.createRadialGradient(x, y, 0, x, y, craterR)
    craterGrad.addColorStop(0, 'rgba(22,22,22,0.75)')
    craterGrad.addColorStop(1, 'rgba(22,22,22,0)')

    ctx.beginPath()
    ctx.arc(x, y, craterR, 0, Math.PI * 2)
    ctx.fillStyle = craterGrad
    ctx.fill()
  }

  // 微弱外层辉光
  const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.9, cx, cy, radius * 1.4)
  glowGrad.addColorStop(0, 'rgba(180,160,140,0.25)')
  glowGrad.addColorStop(1, 'rgba(180,160,140,0)')
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 1.4, 0, Math.PI * 2)
  ctx.fillStyle = glowGrad
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

//危险天体红色大气光圈贴图：中心透明，外围红色光晕环
function createNeoGlowTexture() {
  const S = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, S, S)

  // createRadialGradient(x,y,内半径, x,y,外半径)
  // 【0 ~ 0.4S：完全透明（留给小行星本体）】
  // 【0.4S ~ 0.8S：红色大气渐变】
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.4, S / 2, S / 2, S * 0.8)
  g.addColorStop(0, 'rgba(255, 40, 20, 0)') // 内圈：透明，天体本体位置
  g.addColorStop(0.3, 'rgba(255, 70, 40, 0.7)') // 大气内层，红
  g.addColorStop(0.7, 'rgba(255, 90, 50, 0.2)') // 大气外层，变淡
  g.addColorStop(1, 'rgba(255, 40, 20, 0)') // 最外边缘，透明消散

  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

//创建天体贴图
function createCele() {
  celeGeo = new THREE.SphereGeometry(1, 16, 16)
  celeMesh = new THREE.MeshPhongMaterial({
    map: createCeleFallbackTexture(),
    specular: new THREE.Color(0x333333), // 海面高光颜色
    shininess: 14,
  })
  dangerCeleMesh = new THREE.MeshPhongMaterial({
    map: createCeleFallbackTexture(),
    color: 0xff4444,
    specular: new THREE.Color(0xff2222),
    shininess: 14,
  })

  const celeGlowVertex = `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
  const celeGlowFragment = `
varying vec3 vNormal;
void main(){
  float intensity = pow(0.65 - dot(vNormal, vec3(0,0,1)), 2.2);
  gl_FragColor = vec4(1.0, 0.2, 0.1, 1.0) * intensity;
}
`

  // ✅ 红色辉光shader材质，只创建一次，不再使用Canvas贴图
  celeGlowMat = new THREE.ShaderMaterial({
    vertexShader: celeGlowVertex,
    fragmentShader: celeGlowFragment,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
  })

  new THREE.TextureLoader().load(
    CeleTextureUrl, // ★ import 进来的指定天体纹理 URL（Vite 处理后的可访问地址）
    (tex) => {
      // 成功：整体替换贴图，所有天体实例同步换装
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
      celeMesh.map = tex
      celeMesh.needsUpdate = true // 材质换图必须手动通知
      dangerCeleMesh.map = tex
      dangerCeleMesh.needsUpdate = true // 材质换图必须手动通知
      console.log('指定天体纹理加载成功')
    },
    undefined,
    () => console.warn('指定空间站纹理加载失败，保持 Canvas 光点兜底（检查 src/assets/ 路径）'),
  )
}
//随机生成天体位置
function getRandomLLH(minAlt: number, maxAlt: number) {
  // 纬度：-90 ~ 90
  let latitude = Math.random() * 180 - 90
  // 经度：-180 ~ 180
  let longitude = Math.random() * 360 - 180
  // 高度 km
  let height = minAlt + Math.random() * (maxAlt - minAlt)
  return { latitude, longitude, height }
}

function updateCelePosition() {
  if (!props.neoFeed || props.neoFeed.length === 0) {
    // 清空组
    celeGroup.clear()
    celeMap.clear()
    return
  }
  // ✅ 第一步：清理旧天体
  celeMap.forEach((mesh) => {
    // 从组里面移除
    celeGroup.remove(mesh)
    if (mesh.userData.atmosphereMesh) {
      celeGroup.remove(mesh.userData.atmosphereMesh)
    }
    mesh.geometry.dispose()
  })
  celeMap.clear()

  const celeList = props.neoFeed || []
  celeList.forEach((item: any) => {
    item.arrList.forEach((celeitem: any) => {
      let { latitude, longitude, height } = getRandomLLH(2000, 4000)
      const vec = latLngAltToVector3(latitude, longitude, height, EARTH_RADIUS, ALT_SCALE)
      const pos = new THREE.Vector3(vec.x, vec.y, vec.z)
      if (celeitem.isHazard) {
        cele = new THREE.Mesh(celeGeo, dangerCeleMesh)
        cele.scale.set(1, 1, 1)
        cele.position.copy(pos)
        cele.userData = {
          id: celeitem.id,
          name: celeitem.name,
          isHazard: true,
          diameterMin: celeitem.diameterMin,
          diameterMax: celeitem.diameterMax,
          approachDate: celeitem.approachDate,
          velocity: celeitem.velocity,
          missDistance: celeitem.missKm,
          ld: celeitem.ld,
        }
        celeMap.set(celeitem.id, cele)
        scene.add(cele)
        // ===== 新增：红色大气层外壳 =====
        // ===== 红色大气壳，使用Shader辉光，不再用Canvas贴图 =====
        const glowGeo = new THREE.SphereGeometry(1.25, 16, 16)
        const glowMesh = new THREE.Mesh(glowGeo, celeGlowMat.clone())

        glowMesh.position.copy(pos)
        cele.userData.atmosphereMesh = glowMesh // 把大气mesh挂本体userData，方便销毁
        scene.add(glowMesh)
      } else {
        cele = new THREE.Mesh(celeGeo, celeMesh)
        cele.scale.set(1, 1, 1)
        cele.position.copy(pos)
        cele.userData = {
          id: celeitem.id,
          name: celeitem.name,
          isHazard: false,
          diameterMin: celeitem.diameterMin,
          diameterMax: celeitem.diameterMax,
          approachDate: celeitem.closeDate,
          velocity: celeitem.velocity,
          missDistance: celeitem.missKm,
          ld: celeitem.ld,
        }
        celeMap.set(celeitem.id, cele)
        scene.add(cele)
      }
    })
  })
}

// —— 卫星贴图：同步 Canvas 占位 + 异步升级为指定纹理（13.6.2 模式）——
function createFallbackSatTexture() {
  // 加载失败时的兜底：暖金光点
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')
  const g = ctx!.createRadialGradient(32, 32, 2, 32, 32, 30)
  g.addColorStop(0, 'rgba(255,225,160,1)')
  g.addColorStop(1, 'rgba(255,200,110,0)')
  ctx!.fillStyle = g
  ctx!.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// 卫星 Sprite渲染
function createSatelliteAssets() {
  // 共享材质，所有卫星共用，减少draw call
  satelliteMaterial = new THREE.SpriteMaterial({
    map: createFallbackSatTexture(),
    transparent: true,
    opacity: 0.8,
  })
  // 异步升级为指定卫星纹理（先声明函数、再调用，代码顺序与执行顺序一致，便于阅读）

  selectedSatelliteMaterial = new THREE.SpriteMaterial({
    map: createFallbackSatTexture(),
    transparent: true,
    opacity: 1,
  })
  new THREE.TextureLoader().load(
    satelliteTextureUrl, // ★ import 进来的指定卫星纹理 URL（Vite 处理后的可访问地址）
    (tex) => {
      // 成功：整体替换贴图，所有卫星同步换装
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
      satelliteMaterial.map = tex
      selectedSatelliteMaterial.map = tex
      selectedSatelliteMaterial.needsUpdate = true // 材质换图必须手动通知
      satelliteMaterial.needsUpdate = true // 材质换图必须手动通知
      console.log('指定卫星纹理加载成功')
    },
    undefined,
    () => console.warn('指定卫星纹理加载失败，保持 Canvas 光点兜底（检查 src/assets/ 路径）'),
  )
}
//卫星位置同步
function updateSatellitePositions(satList: SatelliteTLEItem[]) {
  const incomingIds = new Set(satList.map((s) => s.noradId))

  // ========== 1. 移除已经不存在的卫星，释放资源 ==========
  satelliteMeshMap.forEach((sprite, noradId) => {
    if (!incomingIds.has(noradId)) {
      scene.remove(sprite)
      sprite.material.dispose()
      satelliteMeshMap.delete(noradId)

      const orbitLine = orbitLineMap.get(noradId)
      if (orbitLine) {
        scene.remove(orbitLine)
        orbitLine.geometry.dispose()
        ;(orbitLine.material as THREE.LineBasicMaterial).dispose()
        orbitLineMap.delete(noradId)
      }
    }
  })

  // ========== 2. 遍历当前卫星，新增/更新位置 ==========
  satList.forEach((satItem) => {
    const { noradId, name, satrec } = satItem
    // 获取卫星实时经纬度高度
    const llh = getSatellitePosition(satrec)
    if (!llh) return

    // 经纬度高度 → Three世界坐标
    const vec = latLngAltToVector3(llh.latitude, llh.longitude, llh.height, EARTH_RADIUS, ALT_SCALE)
    const pos = new THREE.Vector3(vec.x, vec.y, vec.z)

    let sprite = satelliteMeshMap.get(noradId)
    // 不存在 → 创建Sprite精灵 + 真实轨道线
    if (!sprite) {
      sprite = new THREE.Sprite(satelliteMaterial.clone())
      sprite.scale.set(0.5, 0.5, 1)
      sprite.userData = {
        noradId,
        name,
        latitude: llh.latitude,
        longitude: llh.longitude,
        height: llh.height,
        line1: satItem.line1,
        line2: satItem.line2,
      }
      satelliteMeshMap.set(noradId, sprite)
      scene.add(sprite)
    }

    // 更新卫星位置
    sprite.position.copy(pos)
  })
}

// 监听父组件传过来的卫星id，自动选中卫星，画出轨道
watch(
  () => props.selectedNoradId,
  (noradId) => {
    if (!noradId) {
      // 清空选中，删除轨道，卫星恢复默认
      satelliteMeshMap.forEach((s) => ((s.material = satelliteMaterial), s.scale.set(0.5, 0.5, 1)))
      if (selectedOrbitLine) {
        scene.remove(selectedOrbitLine)
        selectedOrbitLine.geometry.dispose()
        ;(selectedOrbitLine.material as THREE.LineBasicMaterial).dispose()
        selectedOrbitLine = null
      }
      return
    }
    const sprite = satelliteMeshMap.get(noradId)
    if (!sprite) return
    // 复用你原来点击拾取卫星的逻辑，高亮+画轨道
    satelliteMeshMap.forEach((s) => ((s.material = satelliteMaterial), s.scale.set(0.5, 0.5, 1)))
    if (selectedOrbitLine) {
      scene.remove(selectedOrbitLine)
      selectedOrbitLine.geometry.dispose()
      ;(selectedOrbitLine.material as THREE.LineBasicMaterial).dispose()
      selectedOrbitLine = null
    }
    sprite.material = selectedSatelliteMaterial
    sprite.scale.set(0.7, 0.7, 1)
    // =========修复这里============
    const satInfo = props.tleList.find((s) => s.noradId === noradId)
    if (!satInfo?.satrec) return
    const llhPoints = getOrbitPath(satInfo.satrec, 64)
    const threePoints: THREE.Vector3[] = llhPoints.map((p) => {
      const v = latLngAltToVector3(p.latitude, p.longitude, p.height, EARTH_RADIUS, ALT_SCALE)
      return new THREE.Vector3(v.x, v.y, v.z)
    })
    const geo = new THREE.BufferGeometry().setFromPoints(threePoints)
    const mat = new THREE.LineBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.6,
    })
    const line = new THREE.Line(geo, mat)
    scene.add(line)
    selectedOrbitLine = line
  },
  { immediate: false },
)

// 定时刷新卫星/空间站位置（在 onMounted 内场景就绪后再启动，避免 scene 未初始化时触发）
let timer: ReturnType<typeof setInterval> | undefined

// ---------------- T-R7 创建星空粒子 ----------------
function createStars() {
  const count = 2000
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const radius = 100 + Math.random() * 100
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i3 + 2] = radius * Math.cos(phi)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, sizeAttenuation: true })
  stars = new THREE.Points(geo, mat)
  scene.add(stars)
}

//点击拾取卫星
function pickSatellite(event: MouseEvent) {
  const react = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - react.left) / react.width) * 2 - 1
  mouse.y = (-(event.clientY - react.top) / react.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const sprites = Array.from(satelliteMeshMap.values())
  const intersects = raycaster.intersectObjects(sprites, true)
  //重置所有卫星材质
  satelliteMeshMap.forEach((s) => ((s.material = satelliteMaterial), s.scale.set(0.5, 0.5, 1)))

  if (selectedOrbitLine) {
    scene.remove(selectedOrbitLine)
    selectedOrbitLine.geometry.dispose()
    ;(selectedOrbitLine.material as THREE.LineBasicMaterial).dispose()
    selectedOrbitLine = null
  }

  if (intersects.length > 0) {
    const target = intersects[0]?.object as THREE.Sprite
    target.material = selectedSatelliteMaterial
    target.scale.set(0.7, 0.7, 1)
    const satID = target.userData.noradId as string
    // 采样轨道点，生成真实轨道线
    const satInfo = props.tleList.find((s) => s.noradId === satID)
    if (!satInfo?.satrec) return

    const llhPoints = getOrbitPath(satInfo.satrec, 64)
    const threePoints: THREE.Vector3[] = llhPoints.map((p) => {
      const v = latLngAltToVector3(p.latitude, p.longitude, p.height, EARTH_RADIUS, ALT_SCALE)
      return new THREE.Vector3(v.x, v.y, v.z)
    })
    const geo = new THREE.BufferGeometry().setFromPoints(threePoints)
    const mat = new THREE.LineBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.6,
    })
    const line = new THREE.Line(geo, mat)
    scene.add(line)
    selectedOrbitLine = line

    //这里可以上刨emit
    emit('tleView', target.userData)
  }
}

//点击拾取空间站
function pickIss(event: MouseEvent) {
  if (!Iss) return
  const react = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - react.left) / react.width) * 2 - 1
  mouse.y = (-(event.clientY - react.top) / react.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)

  const intersects = raycaster.intersectObject(Iss)

  if (intersects.length > 0) {
    // 打开弹窗，传入空间站信息
    const target = intersects[0]?.object as THREE.Sprite
    target.scale.set(1.2, 1.2, 1.2)
    emit('issInfo', Iss.userData)
  }
}

function pickCeleBody(event: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = (-(event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const celes = Array.from(celeMap.values())
  const intersects = raycaster.intersectObjects(celes, true)

  // 重置所有天体样式
  celeMap.forEach((mesh) => {
    if (mesh.userData.isHazard) {
      mesh.material = dangerCeleMesh
    } else {
      mesh.material = celeMesh
    }
    mesh.scale.set(1, 1, 1)
  })

  if (intersects.length > 0) {
    const target = intersects[0]?.object as THREE.Mesh
    // 选中高亮
    target.scale.set(1.2, 1.2, 1.2)
    // 直接抛出事件，传递天体信息，不需要轨道逻辑
    emit('celeInfo', target.userData)
  }
}

let isDestroy = false
function animate() {
  animateId = requestAnimationFrame(animate)
  const dt = clock.getDelta()
  earth.rotation.y += 0.05 * dt

  if (cloudsMesh) cloudsMesh.rotation.y += 0.065 * dt
  if (celeGroup) {
    celeGroup.rotation.y += 0.05 * dt
  }
  controls.update()
  renderer.render(scene, camera)
}

function Resize() {
  if (!containerRef.value) return
  camera.aspect = containerRef.value.clientWidth / containerRef.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
}

watch(
  () => props.neoFeed,
  () => {
    updateCelePosition()
  },
  { deep: true },
)

onMounted(() => {
  initScene()
  createEarth()
  createSatelliteAssets()
  createIss()
  updataIssPosition()
  createStars()
  createCele()
  updateCelePosition()
  // 缓存预填的第一帧卫星：立即渲染，避免首屏空白
  if (props.tleList.length > 0) {
    updateSatellitePositions(props.tleList)
  }
  // TLE 数据到达（缓存预填或异步接口返回）后立即更新，无需等 5s 轮询
  watch(
    () => props.tleList,
    (list) => {
      if (list.length > 0) updateSatellitePositions(list)
    },
  )
  // 场景就绪后再启动轮询，保证定时刷新一定在 scene 初始化之后
  timer = setInterval(() => {
    updateSatellitePositions(props.tleList)
    if (props.issPosition) updataIssPosition()
  }, 5000)
  window.addEventListener('resize', Resize)
  renderer.domElement.addEventListener('click', pickSatellite)
  renderer.domElement.addEventListener('click', pickIss)
  renderer.domElement.addEventListener('click', pickCeleBody)

  // 天体
  for (const mesh of celeMap.values()) {
    celeGroup.add(mesh)
  }
  scene.add(satelliteGroup)
  scene.add(celeGroup)
  animate()
})

onBeforeUnmount(() => {
  isDestroy = true
  cancelAnimationFrame(animateId)

  window.removeEventListener('resize', Resize)
  renderer.domElement.removeEventListener('click', pickSatellite)
  renderer.domElement.removeEventListener('click', pickIss)
  renderer.domElement.removeEventListener('click', pickCeleBody)

  // ===== 重点：全部mesh从场景移除 =====
  scene.remove(earth)
  scene.remove(cloudsMesh)
  scene.remove(atmosphere) // ✅ 新增移除大气层！！
  scene.remove(stars)

  // 天体：把所有大气壳+本体全部清出场景
  celeMap.forEach((mesh) => {
    scene.remove(mesh)
    if (mesh.userData.atmosphereMesh) {
      scene.remove(mesh.userData.atmosphereMesh)
    }
  })

  // 卫星
  satelliteMeshMap.forEach((sprite) => scene.remove(sprite))
  orbitLineMap.forEach((line) => scene.remove(line))
  if (Iss) scene.remove(Iss)

  scene.dispose()
  renderer.dispose()
  renderer.domElement.remove()
  controls.dispose()

  // 地球资源释放
  earth?.geometry.dispose()
  ;(earth?.material as THREE.Material)?.dispose()
  cloud?.geometry.dispose()
  ;(cloud?.material as THREE.Material)?.dispose()
  atmosphere?.geometry.dispose()
  ;(atmosphere?.material as THREE.ShaderMaterial)?.dispose()
  // 星空
  stars?.geometry.dispose()
  ;(stars?.material as THREE.Material)?.dispose()
  // 天体资源释放
  celeMap.forEach((mesh) => {
    mesh.geometry.dispose()
    if (mesh.userData.atmosphereMesh) {
      mesh.userData.atmosphereMesh.geometry.dispose()
      mesh.userData.atmosphereMesh.material.dispose()
      mesh.userData.atmosphereMesh.map?.dispose()
    }
  })
  // 卫星map
  satelliteMeshMap.forEach((sprite) => {
    sprite.material.dispose()
  })
  orbitLineMap.forEach((line) => {
    line.geometry.dispose()
    ;(line.material as THREE.Material).dispose()
  })
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
.container {
  position: relative;
  margin: 0 auto;
  width: 100%;
  min-height: 91vh;
  overflow: hidden;
  border: 1px solid var(--sp-border);
  border-radius: 14px;
  background: radial-gradient(circle at 50% 40%, var(--sp-scene-radial) 0%, var(--sp-scene-bg) 72%);
  box-shadow:
    0 0 0 1px var(--sp-scene-ring),
    0 18px 60px var(--sp-scene-shadow),
    inset 0 0 80px var(--sp-scene-inset);
}
</style>
