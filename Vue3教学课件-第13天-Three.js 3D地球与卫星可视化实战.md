# 第十三天：Three.js 3D 地球与卫星可视化实战

## 13.1 本日涉及技术点

本日在 12 天 Vue 3 课程基础上，进入 3D 可视化领域，以"卫星追踪系统"项目（my-app）为载体学习 Three.js：

- Three.js 核心：Scene（场景）、PerspectiveCamera（透视相机）、WebGLRenderer（渲染器）
- 渲染循环：requestAnimationFrame、60fps 帧率节流、dt 时间增量解耦
- 光照系统：AmbientLight（环境光）、DirectionalLight（平行光）
- 场景图管理：Group 分层（地球组 / 卫星组 / 轨道组）、OrbitControls 轨道控制器
- 几何体与材质：SphereGeometry、MeshPhongMaterial（map / normalMap / specularMap）
- 纹理系统：TextureLoader 贴图加载与失败回退、CanvasTexture 程序化贴图、SRGBColorSpace 色彩空间、anisotropy 各向异性过滤
- 坐标转换：经纬度 + 高度 → 三维直角坐标（latLngAltToVector3）、贴图 UV 与经纬度对齐原理
- 卫星渲染：Sprite 公告板、SpriteMaterial、共享材质、面积守恒缩放
- 轨道线：BufferGeometry.setFromPoints + LineBasicMaterial
- 交互拾取：Raycaster 射线检测、NDC 归一化设备坐标
- 视觉增强：ShaderMaterial 自定义 GLSL 着色器（大气辉光）、Points 粒子星空、AdditiveBlending 加色混合
- 性能优化：动态分辨率阶梯（降级 / 恢复 / 冷却）、SSAA 超采样替代 MSAA、按需更新、资源释放
- Vue 3 集成：3D 场景的组件化封装、props 驱动场景更新、onBeforeUnmount 资源清理
- 示例工程化：Vue 3 SFC 组件形式的示例交付（本课件每节配一个可直接挂载运行的 .vue 示例，见 13.3.2.1 运行环境配置）、Vite 对静态资源与 three 包的处理机制、importmap 零构建方式（知识拓展）
- 纹理资源管理：地球纹理的官方来源与获取方式（three.js 官方仓库 planets 贴图，见 13.9.1）、指定卫星纹理（`E:\课件\my-app\src\assets\satellite-texture.png`）的接入与回退策略

## 13.2 学习目标

通过本节学习，学生能够：

- 独立搭建 Three.js 三大基石（场景 / 相机 / 渲染器）并跑通渲染循环
- 掌握几何体、材质、纹理三者的关系，做出带贴图、凹凸感与云层的真实地球
- 理解经纬度坐标与三维坐标的转换推导，能把任意"经度、纬度、高度"数据放到球面正确位置
- 使用 Sprite 渲染卫星并实现共享材质优化、点击拾取与选中高亮
- 编写自定义着色器实现大气辉光，使用粒子系统生成星空
- 掌握 60fps 节流、动态分辨率等 3D 性能优化手段
- 综合运用以上知识，从零独立完成"3D 地球 + 实时卫星追踪"完整功能
- 会在 my-app（Vite）中挂载运行 Vue 3 形式的 Three.js 示例组件，并能解释"为什么必须通过开发服务器而不能双击文件"（ES Module 与 CORS 限制）
- 能说明本课件地球贴图与卫星贴图的来源、存放路径与加载失败回退策略，并按 13.9.1 的步骤完成纹理资源准备

## 13.3 Three.js 入门：从零搭建 3D 场景

### 13.3.1 什么是 Three.js 与 WebGL

Three.js 是目前最流行的 JavaScript 3D 渲染库（GitHub 100k+ star），它封装了 WebGL 的底层细节，让我们用几行代码就能完成过去需要数百行着色器代码才能实现的效果。

第一次出现的概念，先逐一解释清楚：

- WebGL（Web Graphics Library）：浏览器提供的 3D 绘图接口，基于 OpenGL ES。它本身是"显卡指令集"级别的低层 API——直接用 WebGL 画一个三角形需要手写顶点数据缓冲、编译着色器、管理显卡状态，代码量巨大且容易出错。
- Three.js 的定位：WebGL 的"高级封装"。它把"物体、材质、灯光、相机"抽象成一个个 JS 对象，内部再翻译成 WebGL 指令。类比：WebGL 之于 Three.js，就如同原生 DOM 之于 Vue——我们操作的是声明式的对象，脏活由框架干。
- 渲染（Render）：把 3D 场景中的物体，根据相机视角计算成一张 2D 图片，画到 `<canvas>` 画布上的过程。Three.js 的渲染器每执行一次 `render()`，就产出一张"照片"，连续快速渲染就形成了动画。
- GPU：显卡处理器。3D 渲染中每个像素的颜色计算互相独立，天然适合 GPU 的数千个小核心并行计算——这正是 3D 渲染流畅、而复杂 CSS 动画反而容易卡顿的根本差异。

【注意】Three.js 是"渲染库"而不是"游戏引擎"：它只负责"画"，不包含物理引擎、音频、资源管理等游戏引擎功能。做网页 3D 可视化（数据大屏、地球、模型展示）恰好只需要"画"，所以它是此类场景的首选。

Three.js 版本说明：本项目使用 r186（0.186.1），从 r150+ 开始所有示例代码均通过 ES Module（import）方式引入，旧的 `<script src="three.min.js">` 全局脚本方式已淘汰，网上老教程的 `THREE.xxx` 全局用法请统一改写为 import 方式。

### 13.3.2 安装与 Vue 3 集成

Three.js 就是一个普通 npm 包，安装与 Element Plus 无任何区别：

```bash
# 在 my-app 项目根目录执行
npm install three
```

安装后 package.json 的 dependencies 会多出 `three`。Three.js 自 r150 起用"子路径导出"组织代码，控制器等附加模块需从 `three/examples/jsm/...` 深层路径引入：

```js
// 核心库：命名空间导入（THREE 是约定俗成的命名空间名）
import * as THREE from 'three'
// 轨道控制器（附加模块，位于 examples/jsm 目录）
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
```

【注意】必须用 `import * as THREE` 命名空间导入而不是按需导入 `{ Scene }`。Three.js 的类内部存在大量相互引用，按需导入在部分构建工具下会丢失内部关联导致运行时报错；官方文档所有示例均为命名空间导入，请保持一致。

与 Vue 3 的集成原则只有一条：**3D 场景是"命令式世界"，Vue 是"声明式世界"，二者通过组件边界隔离**。具体做法：

- 3D 场景的全部对象（scene、camera、renderer……）声明为组件内的普通模块级变量（不放进 ref/reactive）
- Vue 只负责：在 onMounted 里初始化 3D 场景（此时 DOM 已生成）、通过 watch 监听 props 变化来更新 3D 对象、在 onBeforeUnmount 里销毁释放
- 数据流向：父组件（SatelliteView）把卫星数组通过 props 传入 → Globe3D 组件 watch 到变化 → 更新 3D 场景中的 Sprite 位置

为什么 3D 对象不能放进 ref/reactive？第 3 天讲过，Vue 3 响应式基于 Proxy 代理，会递归拦截对象所有属性的读写。Three.js 的对象（例如渲染器、几何体）内部有大量循环引用与私有状态，被代理后轻则性能暴跌（每次渲染循环触发成千上万次依赖收集），重则栈溢出报错。项目中卫星数据对象 satrec 就因为含"有状态"推算器，必须用 shallowRef 规避深度代理（见 useSatellite.js 注释），这是同一类问题。

### 13.3.2.1 示例工程化运行环境配置（本课件全部代码示例的统一运行说明）

本课件的全部代码示例（示例 01~06 与 13.9 的 MiniGlobe.vue）均以 **Vue 3 SFC 单文件组件**交付，统一在 my-app 工程内通过 Vite 运行。每个示例都是独立完整的组件——`<template>`（容器 DOM）+ `<script setup>`（全部 Three.js 逻辑）+ `<style scoped>`（组件样式），相互不依赖，可单独挂载运行。

**① 为什么必须通过开发服务器运行，而不能双击文件？** 两个硬性限制，理解它们才算理解 Web 3D 的运行环境：

1. **ES Module 的跨源限制**：Three.js r150+ 全部以 ES Module（`import` 语法）发布。浏览器规定 `file://` 协议下打开的页面不允许加载其他 `file://` 的模块文件（同源策略把每个本地文件视为独立"源"），因此双击打开会报 CORS 错误，`import` 直接失败
2. **纹理图片的跨域限制**：WebGL 规定用作贴图的图片必须与页面同源、或服务器返回 `Access-Control-Allow-Origin` 响应头（13.5.3 详解）。`file://` 下加载本地图片作为纹理同样触发安全拦截

Vite 开发服务器（`npm run dev`）天然满足这两个条件：模块经 dev server 以 `http://localhost` 同源下发；从 threejs.org 加载的网络贴图，官方服务器返回了 CORS 头，TextureLoader 也能正常取用。

**② 运行三步**（假设 my-app 已就绪，依赖见 13.3.2）：

```bash
# 第 1 步：确认依赖（my-app 的 package.json 已含 three@0.186.1，可跳过；缺失时在 my-app 根目录执行）
npm install three

# 第 2 步：把示例组件文件放入 my-app\src\components\ch13\ 目录（文件名见各示例标题）

# 第 3 步：启动开发服务器（在 my-app 根目录执行）
npm run dev
# 浏览器访问输出的地址（默认 http://localhost:5173）
```

挂载方式任选其一：

- **方式 A（快速验收，推荐初学）**：临时改写 `src/App.vue`，让页面只渲染目标组件：

```vue
<!-- src/App.vue —— 临时挂载示例（验收完换回原内容即可） -->
<script setup>
// import TheWelcome from './components/TheWelcome.vue'  // 项目原内容可临时注释
import FinalGlobe from './components/ch13/06-FinalGlobe.vue'   // 换成任意示例组件
</script>

<template>
  <FinalGlobe />
</template>
```

- **方式 B（工程化，推荐后续）**：在路由配置（如 `src/router/index.js`）中为每个示例注册一条路由，通过地址栏切换：

```js
// src/router/index.js —— 追加 ch13 示例路由（节选）
{ path: '/ch13/final-globe', name: 'ch13FinalGlobe', component: () => import('@/components/ch13/06-FinalGlobe.vue') }
```

**③ 各示例共用的关键约定**（六个示例结构完全一致，此处统一说明，正文不再重复）：

- Three.js 对象（Scene/Mesh/Material 等）一律存**普通变量**，不用 `reactive`/`ref` 深度代理——Proxy 递归代理海量顶点数据会严重拖慢渲染，且 Vue 响应式对 Three.js 渲染管线毫无必要
- 初始化放在 `onMounted`（DOM 就绪才能拿到容器、创建 WebGL 上下文），释放放在 `onBeforeUnmount`（完整清单见 13.8.6），事件监听用**命名函数**以便卸载时解绑
- 画布尺寸取 `container.clientWidth / clientHeight`（容器尺寸）而非 `window.innerWidth`——组件可能只占页面一部分，用窗口尺寸会导致画面拉伸
- 相机 aspect 变化后必须手动调用 `camera.updateProjectionMatrix()`，否则画面按旧比例渲染（13.3.5）

**④ 示例目录结构**（工作根目录 `E:\课件\`）：

```
E:\课件\
└── my-app\
    ├── src\
    │   ├── assets\satellite-texture.png        # ★ 指定卫星纹理（已提供，示例 04/06 通过 import 引用）
    │   ├── components\ch13\                    # 本课全部示例组件（随课件逐节创建）
    │   │   ├── 01-HelloScene.vue               # 示例 01：三大基石 + 渲染循环（13.3）
    │   │   ├── 02-LightControls.vue            # 示例 02：光照 + Group + OrbitControls（13.4）
    │   │   ├── 03-EarthTexture.vue             # 示例 03：网络地球贴图 + 自转（13.5）
    │   │   ├── 04-SatelliteOrbit.vue           # 示例 04：卫星 Sprite + 轨道运动（13.6）
    │   │   ├── 05-InteractionFx.vue            # 示例 05：拾取 + 星空 + 大气辉光（13.7）
    │   │   └── 06-FinalGlobe.vue               # 示例 06：综合最终版（13.9）
    │   └── router\index.js                     # 方式 B 时在此注册示例路由
    └── public\textures\                        # ★ 地球贴图（已从网络下载本地化，见 13.9.1）
        ├── earth_atmos_2048.jpg
        ├── earth_normal_2048.jpg
        ├── earth_specular_2048.jpg
        └── earth_clouds_1024.png
```

> 指定卫星纹理的唯一来源是 `E:\课件\my-app\src\assets\satellite-texture.png`：Vue 示例中通过 `import satelliteTextureUrl from '@/assets/satellite-texture.png'` 直接引用原文件（Vite 会打包处理；若工程未配置 `@` 别名，改用相对路径 `'../assets/satellite-texture.png'`）。地球纹理的网络来源与下载步骤见 13.9.1。

**⑤ 知识拓展：零构建的纯 HTML 运行方式（可选）**。脱离 Vue 也能跑 Three.js——浏览器原生支持 importmap，把模块名映射到 CDN 的 ES Module 文件即可，Three.js 官网所有示例正是这种方式（这也是读懂官方示例源码的必备知识）：

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"
  }
}
</script>
<script type="module">
  import * as THREE from 'three'
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
  // ……场景代码……（此时仍需通过 HTTP 服务打开，规则同①）
</script>
```

三个要点：

- 版本号 `@0.186.1` 与 my-app 安装的 `three@0.186.1`（r186）一致，学完可直接迁移
- CDN 用 jsDelivr 国内访问稳定，也可换 npmmirror 镜像（`https://registry.npmmirror.com/three/0.186.1/files/build/three.module.js`）
- npm + Vite 环境中附加模块既可写 `three/addons/…` 也可写 `three/examples/jsm/…`（npm 包 exports 字段把两个路径映射到同一文件），本课件统一用 `three/addons/…`

### 13.3.3 三大基石：Scene、Camera、Renderer

任何 Three.js 应用都由三件套组成，缺一不可。它们的关系可以类比为"拍电影"：

- Scene（场景）：剧组的一切——演员（物体）、灯光、道具（相机）都放在这个"摄影棚"里
- Camera（相机）：摄影师的机位与镜头，决定"从哪个角度、多大视野"去拍
- Renderer（渲染器）：后期放映机，把摄影棚里被相机拍到的画面"冲洗"到网页 canvas 上

三个构造函数的参数必须逐个吃透（示例 01 与 13.3.6 的项目真实代码均会用到）：

**new THREE.Scene()** —— 无参数。常用属性：

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| background | Color / Texture / null | null | 场景背景。null 为透明；设 Color 纯色；设 Texture（全景图）即"天空盒" |
| fog | Fog / null | null | 雾效，远处物体自动变淡，营造纵深 |
| children | 数组 | [] | 场景内的所有子对象（物体、灯光、Group），通过 add/remove 管理 |

**new THREE.PerspectiveCamera(fov, aspect, near, far)** —— 官方文档给出的默认值是 fov=50、aspect=1、near=0.1、far=2000（参数可省略），但实际开发**必须显式传入**：默认 aspect=1 与真实画布宽高比不符，画面会被拉伸变形：

| 参数 | 类型 | 项目取值 | 说明 |
|---|---|---|---|
| fov | number（度） | 45 | 视场角（Field of View）：镜头"张角"大小。人眼约 50°；游戏常用 60-75°；45° 接近"长焦镜头"，太空观察感更强 |
| aspect | number | width/height | 宽高比，必须与画布一致否则画面被拉伸。窗口变化时要更新（见 13.3.5） |
| near | number | 0.1 | 近裁剪面：距相机小于该距离的物体不渲染 |
| far | number | 2000 | 远裁剪面：距相机大于该距离的物体不渲染。near~far 之间称为"视锥体"（Frustum），只有视锥内的物体会被渲染 |

            远裁剪面 (far)
           ╱  ·  ╲       ← far 以外的物体 → 看不见
          ╱       ╲
         ╱  视锥体  ╲     ← near 和 far 之间 → 能看见 ✅
        ╱  (可见区)  ╲
       ╱              ╲
      📷               │
    相机  近裁剪面 (near)   │
          ↗ near 以内的物体 → 太近了，看不见


near 和 far 的取值有讲究：near 不能无限小（0.001 会导致深度精度劣化，远近距离判断出错，出现面片闪烁的 z-fighting 现象）；far 不能小于"最远物体距离"（本项目星空粒子最远 400，卫星轨道最远约 7.5，取 2000 留足余量）。

**new THREE.WebGLRenderer(options)** —— 对象参数，常用键：

| 参数键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| antialias | boolean | true | MSAA 抗锯齿开关。本项目刻意设 false，用超采样 SSAA 替代（13.8.3 详解） |
| alpha | boolean | false | 画布是否透明。true 时 CSS 背景可透出 |
| powerPreference | string | 'default' | 'high-performance' 提示浏览器用独显；对双显卡笔记本很关键 |

渲染器两个尺寸方法必须区分：

- setSize(width, height)：设置画布的 CSS 尺寸，同时更新画布缓冲区分辨率
- setPixelRatio(ratio)：设置"物理像素 / CSS 像素"倍率。1080p 屏幕 DPR=1 时 ratio=2 意味着按 2160p 渲染再压缩显示——这就是"超采样"，画质提升的核心手段

【解题思路】看到"地球在高清屏上发虚"应该怎么排查？三步定位：1) 检查 setPixelRatio 是否只传了 1（等于放弃高清屏物理像素）；2) 检查贴图分辨率是否过低（贴图 512 贴到 2048 缓冲上必然模糊）；3) 检查 anisotropy 各向异性过滤是否设置（斜视角模糊的元凶，见 13.5.4）。

**实战应用场景**：三大基石是所有 Web 3D 产品的共同骨架——电商 3D 商品展示（京东商品 3D 预览）、在线看房（贝壳如视 VR）、汽车 3D 配色器（保时捷/特斯拉官网选色）背后都是"场景装内容、相机定视角、渲染器出画面"这同一套管线，差别只在内容与交互的复杂度。

### 13.3.4 渲染循环：requestAnimationFrame 与 60fps 节流

静态场景只需 renderer.render() 一次；但云层要飘、卫星要动、相机要拖拽——画面必须持续刷新。承担"每帧重绘"的就是渲染循环（示例 01 是教学简化版，真实工程实现见 13.3.6 ②）。

渲染循环的四个关键设计必须逐个吃透：

**requestAnimationFrame（rAF）**：浏览器原生 API，请求"下一次浏览器重绘之前"执行回调。它有三个定时器（setTimeout/setInterval）不具备的优点：与屏幕刷新同步（不撕裂）、页面切后台自动暂停（省电）、回调发生在浏览器渲染管线最佳时机。rAF 递归调用自己，就是所有 3D 动画的标准"心跳"。

**为什么要节流到 60fps？** 144Hz 电竞屏上 rAF 每秒回调 144 次，WebGL 重绘 144 次，但多数显示器内容消费端根本用不到这么高的 3D 帧率，GPU 却满负荷运转。节流后：`now - lastRender < 1/60` 就 return，跳过的帧几乎零成本（只做一次时间比较），GPU 负载近似减半。

**dt 时间增量解耦**：如果写死 `rotation.y += 0.00035`（每帧固定增量），那么 144fps 屏上云层转速是 60fps 屏的 2.4 倍——动画速度取决于硬件，这是新手最常见的 bug。正确做法是记录两帧间的真实时间差 dt，速度统一写成"每秒多少"再乘 dt：`0.00035 * 60 * dt` 表示"每秒转 0.021 弧度"。

**performance.now()**：返回页面加载至今的高精度毫秒数（浮点，微秒级精度），比 Date.now() 的毫秒精度更适合帧计时。注意单位换算：这里除以 1000 转为秒。

**THREE.Clock 与 THREE.Timer（r186 新知）**：Three.js 还内置了 `THREE.Clock` 计时器（`getDelta()` 取帧增量、`elapsedTime` 取累计时间），本课件的独立示例 01~06 就用它简化计时。注意：在 r186 的控制台你会看到一条警告 `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.`——Clock 已被标记为**弃用（deprecated）**，官方推荐改用新的 `THREE.Timer`（`timer.update()` 后用 `timer.getDelta()` / `timer.getElapsed()`，API 用法基本对应）。弃用不等于移除，Clock 在当前版本完全可用，警告不影响运行；生产项目建议直接采用 Timer，读懂 Clock 写法则依然是阅读官方旧示例的必备能力。

【注意】渲染循环必须配合清理：组件卸载时要 cancelAnimationFrame(animationId)，否则路由切走后循环仍在跑，scene 引用无法回收，造成内存泄漏与后台 GPU 空转。完整清理代码见 13.8.6。

**实战应用场景**：dt 增量动画是所有游戏引擎的标准心法——Unity 与 Unreal 的 Time.deltaTime、浏览器游戏框架 Phaser 的 delta 参数，本质与本节完全相同；网页动画库 GSAP 的 ticker、物理模拟（重力/碰撞必须按真实时间步进）也全部依赖它。"帧率无关性"保证同一套动画在 60Hz 与 144Hz 屏幕上速度一致，这也是它相对 setInterval 的根本优势。

### 13.3.5 窗口自适应：onResize 与补渲染防白屏

浏览器窗口缩放时，画布尺寸与相机宽高比都变了，必须同步更新，否则画面拉伸变形（示例 01 的 onResize 与 13.3.6 ③的项目真实代码都体现了这套流程）。

三个步骤一个都不能省：

- 只改 aspect 不调用 updateProjectionMatrix()：投影矩阵不会自动重算，画面仍然按旧比例渲染——这是"改了没反应"的经典坑
- updateProjectionMatrix()：把 fov/aspect/near/far 重新编译成 GPU 使用的 4×4 投影矩阵。Three.js 的原则是"属性变了必须手动通知矩阵更新"，这类方法还有 updateMatrix、updateMatrixWorld 等
- 最后的补渲染：setSize 会清空画布缓冲区，若此时渲染循环恰好被节流跳过若干帧，用户会看到一帧"白屏闪烁"。立即手动渲染一帧即可消除（同样的技巧也用在 setPixelRatio 之后，见 13.8.2）

事件绑定与解绑的时机：onMounted 中绑定、onBeforeUnmount 中解绑（示例 01 与 13.3.6 ④的项目真实代码都遵循这一时机）。

【注意】resize 监听挂在 window 上（而非容器上），因为浏览器原生 resize 事件只在 window 触发。若组件挂载区尺寸会因布局变化（侧栏展开等）而变化但窗口不变，需要改用 ResizeObserver 监听容器——本项目容器只随窗口变化，window 监听已足够。

**✦ 示例 01（Vue 3 版）：三大基石 + 渲染循环 + 窗口自适应**（保存为 `my-app/src/components/ch13/01-HelloScene.vue`，挂载运行方式见 13.3.2.1）。一个自转的绿色立方体——Three.js 官方手册的第一个示例同款，逐行注释对应本节知识点：

```vue
<!-- src/components/ch13/01-HelloScene.vue —— 示例 01：三大基石 + 渲染循环 + 窗口自适应 -->
<template>
  <!-- 画布容器：renderer.domElement（canvas 标签）会被挂载进这个 div。
       必须用 ref 拿到真实 DOM，不能用 document.getElementById——
       同一页面若出现两个该组件实例，id 会冲突而 ref 各自独立（Vue 工程化铁律） -->
  <div ref="containerRef" class="scene-container"></div>
</template>

<script setup>
// <script setup> 是 Vue 3 SFC 的编译期语法糖：顶层声明的变量/函数自动暴露给模板，
// 无需再写 export default 与 setup() 返回值（Vue 3 组合式 API 推荐写法）
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'   // three 已在 my-app 中 npm 安装（0.186.1），Vite 直接按包名导入

// 模板引用：模板里 ref="containerRef" 与此处同名变量自动绑定，onMounted 后拿到真实 DOM
const containerRef = ref(null)

// 【Vue + Three.js 集成第一铁律】Three.js 对象一律存普通变量，禁止用 reactive/ref 深度代理：
// 1) THREE 对象内部有海量顶点/矩阵数据，Proxy 递归代理会带来严重性能损耗
// 2) Three.js 自成渲染体系，根本不需要 Vue 追踪其内部变化
let scene, camera, renderer, cube
let animationId = null                          // rAF 句柄，卸载时用于取消渲染循环
const clock = new THREE.Clock()                 // Three.js 内置计时器（getElapsedTime/getDelta）

// ① ~ ④ 初始化（必须在 onMounted 中调用：那时 DOM 才真实存在）
function initScene() {
  const container = containerRef.value

  // ① 场景：3D 世界的容器（13.3.3）
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000010)   // 深空底色

  // ② 透视相机：fov=45 太空观察感，aspect 必须与画布一致，near/far 圈定视锥体
  //    【与原生 HTML 版的关键差异】宽高比取"容器尺寸"而非 window.innerWidth——
  //    组件可能只占页面一部分，用窗口尺寸会导致画面拉伸变形
  camera = new THREE.PerspectiveCamera(
    45,                                          // fov：垂直视野角（官方默认 50，此处取 45）
    container.clientWidth / container.clientHeight, // aspect：宽高比
    0.1, 2000                                    // near / far：近远裁剪面
  )
  camera.position.set(0, 0, 8)                   // 相机放在 z=8 处（默认朝向 -Z，正对原点）

  // ③ 渲染器：把相机拍到的场景画到 canvas 上（13.3.3）
  renderer = new THREE.WebGLRenderer({ antialias: true })       // antialias 开抗锯齿
  renderer.setSize(container.clientWidth, container.clientHeight) // 画布尺寸 = 容器尺寸
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))  // 高清屏适配（上限 2 防过度消耗）
  container.appendChild(renderer.domElement)     // canvas 挂进容器

  // ④ 几何体 + 材质 = 网格（Mesh）——下一节起系统讲解，此处先跑通管线
  cube = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),              // 边长 2 的立方体
    new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true }) // 自发光线框绿
  )
  scene.add(cube)

  // ⑥ 窗口自适应：绑定命名函数（不能用匿名箭头函数，否则卸载时无法 removeEventListener）
  window.addEventListener('resize', onResize)
}

// ⑤ 渲染循环：rAF 心跳 + dt 时间增量（13.3.4）
//    dt = 两帧真实时间差，动画速度与帧率解耦（60Hz 与 144Hz 屏转速一致）
function animate() {
  animationId = requestAnimationFrame(animate)   // 先排队下一帧（标准递归写法），句柄存起来供卸载取消
  const dt = clock.getDelta()                    // 距上一帧的秒数
  cube.rotation.x += 0.6 * dt                    // 每秒转 0.6 弧度（弧度不是角度！13.4.2）
  cube.rotation.y += 0.8 * dt
  renderer.render(scene, camera)                 // 渲染本帧
}

// ⑥ 窗口自适应：改 aspect 后必须手动重算投影矩阵（13.3.5）
function onResize() {
  const container = containerRef.value
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()                // 不调用则画面仍按旧比例渲染！
  renderer.setSize(container.clientWidth, container.clientHeight)
}

// onMounted：DOM 已挂载，安全初始化 Three.js 并启动渲染循环
onMounted(() => {
  initScene()
  animate()
})

// onBeforeUnmount：完整清理，防止内存泄漏与"幽灵渲染循环"（释放清单详见 13.8.6）
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize) // 解绑 resize 监听
  cancelAnimationFrame(animationId)              // 停掉 rAF，否则组件销毁后循环仍在跑
  cube.geometry.dispose()                        // 释放几何体 GPU 缓冲
  cube.material.dispose()                        // 释放材质/着色器程序
  renderer.dispose()                             // 释放渲染器与 WebGL 上下文资源
  renderer.domElement.remove()                   // 把 canvas 从 DOM 中移除
})
</script>

<style scoped>
/* scoped：样式只作用于本组件，不污染全局。
   容器占满视口，便于独立演示；嵌入布局页时改为 width/height: 100% 即可 */
.scene-container { width: 100%; height: 100vh; overflow: hidden; }
</style>
```

**示例 01 新写法速览：initScene() ④ 里的立方体是怎么搭出来的**

这是全课件第一次出现"几何体 + 材质"写法，三个新类逐个拆解（13.4 ~ 13.5 会系统展开，此处先建立最小概念）：

- **`new THREE.Mesh(geometry, material)` —— 网格（可渲染物体的最小组合）**。Mesh 直译"网格"，= 几何体（决定**形状**）+ 材质（决定**外观**）的组合体，是 Three.js 中最常用的可渲染物体。两个参数都传对象本身（本例用 new 直接内联创建，也可先存变量再传入）；创建后必须 `scene.add(cube)` 加入场景，否则不参与渲染。
- **`new THREE.BoxGeometry(2, 2, 2)` —— 盒子几何体**。三个参数依次是 x / y / z 三个方向的边长，单位是"世界单位"（可自定理解为米），全缺省时默认 1×1×1。它是 Geometry 几何体族的一员：同族还有 13.5.1 的 SphereGeometry（球体）、PlaneGeometry（平面）等，用法模式完全一致——"new 一个 → 传给 Mesh"。
- **`new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true })` —— 基础材质**。参数是一个**配置对象**（大括号里写属性名: 属性值，这也是 Three.js 各材质/控制器参数的通用格式），本例用了两个属性：
  - `color: 0x00ff88` —— 颜色，`0x` 前缀表示十六进制字面量，`0x00ff88` 即 rgb(0, 255, 136) 荧光绿；也可写成字符串 `'#00ff88'` 或 CSS 颜色名 `'green'`，效果等价。
  - `wireframe: true` —— 线框模式：只画三角形的边线、不填充面，默认 `false`。示例选线框有两个用意：① 此时还没讲光照，实体面只会呈现一整块死色、看不出立体结构，线框能直接看清立方体的几何骨架；② MeshBasicMaterial 是**不受光照影响**的"自发光"材质（永远全亮，见 13.4.1 注意事项），正好保证第一个示例在"零灯光"场景里可见——换成 MeshPhongMaterial 等受光材质，画面就是全黑。

运行验收：深空背景上一个绿色线框立方体持续自转；拖动窗口大小画面无变形。本例故意用 `THREE.Clock` 计时（课件项目用手写 `performance.now()`，两者等价，Clock 是官方封装；它在 r186 会触发一条弃用警告，原理与替代方案见 13.3.4 的"THREE.Clock 与 THREE.Timer"）。

### 13.3.6 真实代码对照：项目 Globe3D.vue 中的本节实现

知识点讲完、示例 01 敲完，最后看真实项目是怎么写这几块的。以下四段代码节选自本项目真实页面组件 `src/components/Globe3D.vue`（第 13 天实战项目的 3D 地球生产组件），注释完整保留，可逐行与示例 01 对照——教学版为可读性做了简化，真实版额外包含 60fps 节流、1.5 倍超采样与补渲染等工程手段（13.8 详解）：

**① 三大基石：initScene() 节选（对应 13.3.3）**

```js
<!-- src/components/Globe3D.vue —— initScene() 节选 -->
// Three.js 核心对象（模块级变量，绝不放入 ref/reactive）
let scene, camera, renderer, controls, earthGroup, atmosphereMesh, cloudsMesh, earthMesh

/** 初始化 Three.js 场景 */
function initScene() {
  const container = containerRef.value          // 挂载 3D 画布的 DOM 容器（template 中的 div ref）
  const width = container.clientWidth            // 容器宽（px）
  const height = container.clientHeight          // 容器高（px）

  // ① 场景：3D 世界的"容器"，所有物体、灯光都要 add 进来才会被渲染
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000010)   // 背景色：近黑的深空蓝（THREE.Color 颜色对象，接受 16 进制数或 '#rrggbb' 字符串）

  // ② 透视相机：模拟人眼的"近大远小"效果
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000)
  camera.position.set(0, 3, 15)                  // 相机位置：稍高、距地 15 个单位

  // ③ 渲染器：把场景"画"到 canvas 上
  renderer = new THREE.WebGLRenderer({
    antialias: false,        // 抗锯齿关闭（本项目用 1.5 倍超采样替代，见 13.8 性能优化）
    alpha: true,             // 画布允许透明（可透出 CSS 背景）
    powerPreference: 'high-performance', // 提示浏览器优先使用独立显卡
  })
  renderer.setSize(width, height)                // 画布尺寸 = 容器尺寸
  // 像素比 = 设备 DPR × 1.5 超采样（上限 3）：
  // 高清屏 DPR 为 2，则实际按 3 倍像素渲染再缩小显示，画面更细腻
  renderer.setPixelRatio(Math.min(window.devicePixelRatio * 1.5, 3))
  container.appendChild(renderer.domElement)     // 把 WebGL 生成的 <canvas> 挂进容器
}
```

**② 渲染循环：animate() 节选（对应 13.3.4）**

```js
<!-- src/components/Globe3D.vue —— animate() 真实代码 -->
// —— 60fps 渲染上限 ——
// 高刷新率屏幕（如 144Hz）上 rAF 满速回调会让 WebGL 每秒重绘约
// 144 次，是外部 Chrome 卡顿掉帧的主因；节流到 60fps 后 GPU 负载
// 近乎减半，也为 DPR 超采样腾出预算
const FPS_CAP = 60
let lastRender = 0                 // 上次实际渲染的时刻（秒）
let animationId = null             // rAF 回调 ID（模块级变量，卸载时用它取消循环）

/** 动画循环：每帧执行（rAF 回调） */
function animate() {
  animationId = requestAnimationFrame(animate)   // 先排队下一帧（rAF 递归是标准写法）
  // 帧率节流：距上次渲染不足一帧间隔时跳过本次（rAF 照常排队）
  const now = performance.now() / 1000
  if (now - lastRender < 1 / FPS_CAP - 0.002) return   // 0.002s 容差防 60Hz 屏跳帧
  const dt = now - lastRender                       // 真实时间增量（秒）
  // 云层自转：按真实时间增量推进，与帧率解耦——
  // 无论 60fps 还是 144fps 屏，云层周速都一致
  if (cloudsMesh) cloudsMesh.rotation.y += 0.00035 * 60 * dt
  lastRender = now
  controls.update()                                 // 轨道控制器刷新（阻尼惯性）
  renderer.render(scene, camera)                    // 渲染本帧
  adaptResolution(dt * 1000)                        // 动态分辨率统计本帧耗时（13.8.2）
}
```

**③ 窗口自适应：onResize() 节选（对应 13.3.5）**

```js
<!-- src/components/Globe3D.vue —— onResize() 真实代码 -->
/** 窗口大小变化 */
function onResize() {
  if (!containerRef.value) return
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  camera.aspect = width / height              // ① 更新相机宽高比
  camera.updateProjectionMatrix()             // ② 重新计算投影矩阵（必须调用！）
  renderer.setSize(width, height)             // ③ 更新画布尺寸
  // setSize 同样会清空画布：立即补渲染一帧，消除窗口缩放时的空白闪烁
  if (scene && camera) renderer.render(scene, camera)
}
```

**④ resize 监听的绑定与解绑（对应 13.3.5）**

```js
<!-- src/components/Globe3D.vue —— initScene() 与销毁代码节选 -->
// initScene() 末尾：
window.addEventListener('resize', onResize)

// onBeforeUnmount() 中：
window.removeEventListener('resize', onResize)
```

## 13.4 光照、场景图与轨道控制器

### 13.4.1 光照系统：AmbientLight 与 DirectionalLight

没有光照的 3D 世界是一片漆黑（MeshBasicMaterial 除外，它不受光照影响）。项目真实代码见 13.4.4 ①，先掌握两种最常用光线的分工：

两种光的分工（第一次接触光照概念，务必理解区别）：

| 光源类型 | 构造参数 | 光照效果 | 在本项目中的作用 |
|---|---|---|---|
| AmbientLight(color, intensity) | 颜色、强度 | 无方向，均匀照亮所有物体所有面 | 把地球整体"垫亮"，保证背光面不至于全黑 |
| DirectionalLight(color, intensity) | 颜色、强度 | 光线平行射来，物体朝光面亮、背光面暗 | 模拟太阳光，制造地球昼夜明暗分界线 |

- 环境光（Ambient Light）：可以想象成"阴天的散射光"——没有影子、没有方向，从四面八方均匀照射。它决定了 3D 场景的"基础亮度地板"
- 平行光（Directional Light）：光源在无限远处（如太阳），所有光线平行。官方文档特别提醒：**给它设置 rotation 没有效果**——光的方向由 `position` 指向 `target`（默认 target 是原点 (0,0,0) 的 Object3D）计算得出，即"从 position 照向 target"，与距离无关。物体表面法线与光线夹角越小（正对）越亮，垂直（侧面）则暗，由此产生立体感

强度（intensity）取值经验：环境光 + 平行光之和控制在 1.2~1.5 之间比较接近自然观感。本项目 0.4 + 1.0 = 1.4：背光面剩 0.4 的环境光（可见但偏暗，像月夜的地球），向光面最亮 1.4。

Three.js 还有 PointLight（点光源，灯泡）、SpotLight（聚光灯，手电筒）等，做室内场景常用，太空场景用不上，此处不展开。

【注意】光照只对"受光材质"有效：MeshPhongMaterial、MeshStandardMaterial、MeshLambertMaterial 会响应光照；MeshBasicMaterial 是"自发光"材质，永远全亮，适合贴图文字层（罗盘刻度贴层正是用它，见 13.9 拓展）。若发现物体怎么调光都是全亮/全黑，先检查材质类型。

**实战应用场景**："环境光打底 + 平行光造型"是最常用的低成本打光方案：电商产品展示用它突出立体轮廓；数字孪生/智慧城市大屏用它保证楼宇整体可见又带明暗层次；游戏室外白天场景中平行光还兼任"太阳"。需要更戏剧化的效果时，才进一步引入点光源（模拟灯泡）与聚光灯（舞台射灯）。

### 13.4.2 场景图与 Group 分层管理

场景图（Scene Graph）是 3D 引擎的核心数据结构：场景是一棵树，每个节点（Object3D）可以有父节点和子节点，子节点继承父节点的位移、旋转、缩放（统称"变换"）。

Group（组）是最纯粹的"父节点容器"——本身不渲染任何东西，作用是把一批物体打包管理。本项目的完整分层设计见 13.4.4 ②，先理解分层的三大实战价值：

1. **批量变换**：neoGroup.rotation.y += 0.00025 * 60 * dt 让全部小行星整体绕地球公转——一行代码动了整组，无需逐个移动
2. **批量管理**：清空轨道线只需遍历 orbitGroup.children，不必在 scene 里大海捞针
3. **拾取隔离**：点击拾取时 raycaster.intersectObjects(satelliteGroup.children) 只检测卫星组，避免射线撞到地球本体干扰卫星选中

继承性示例：卫星 Sprite 加入 satelliteGroup 后，其最终世界坐标 = satelliteGroup 的变换 × Sprite 自身 position。本例 satelliteGroup 位于原点无变换，所以 Sprite 的 position 就是世界坐标；若给组加了旋转，组内所有物体一起转。

顺带正式介绍全课件使用频率最高、却还没集中讲过的知识点——Object3D 变换三件套。场景中所有对象（相机、网格、Group、Sprite……）都继承自 Object3D 基类，各自带三个核心变换属性：

| 属性 | 类型 | 含义 | 本项目示例 |
|------|------|------|------------|
| position | Vector3 | 位移（沿 x/y/z 轴） | camera.position.set(0, 0, 18) |
| rotation | Euler 欧拉角 | 旋转（**单位是弧度不是角度**） | cloudsMesh.rotation.y += 0.02 * dt |
| scale | Vector3 | 各轴缩放倍数（1 = 原尺寸） | sprite.scale.set(base.w, base.h, 1) |

最容易踩的坑：rotation 用的是弧度，Math.PI / 2 才是 90°。本课件所有"每帧 += 一点"的自转/公转动画，加的都是弧度增量——dt 乘的那串系数，换算一下都在每秒零点几弧度的量级。

**实战应用场景**：场景图分层是 3D 工程化的通用结构：工业领域用它做装配体"爆炸图"（整机拆解成零件分层展示，在线 CAD 演示的标准交互）；地图类产品把地形层/建筑层/POI 标记层分开，既能整层显隐也能整体平移缩放；游戏里"角色 Group（身体+武器+特效）整体跟随移动"更是无处不在。分层思维的本质是"把管理成本从 O(物体数) 降到 O(层数)"。

### 13.4.3 OrbitControls：拖拽旋转、滚轮缩放

裸的 Three.js 没有任何交互——相机定死在初始位置。OrbitControls（轨道控制器）是最常用的相机交互扩展，让鼠标拖拽绕目标旋转、滚轮缩放、右键平移（项目真实配置见 13.4.4 ③）。

构造参数：new OrbitControls(camera, domElement)——控制器改的是 camera 的位置与朝向，domElement 是接收鼠标事件的画布。

常用属性速查：

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| enableDamping | boolean | false | 阻尼惯性，开启后交互质感明显提升 |
| dampingFactor | number | 0.05 | 阻尼强度 |
| rotateSpeed | number | 1 | 拖拽旋转速度倍率 |
| minDistance / maxDistance | number | 0 / Infinity | 缩放范围限制（透视相机） |
| autoRotate | boolean | false | 是否自动环绕目标旋转 |
| autoRotateSpeed | number | 2.0 | 自动旋转速度（2.0 约每 30 秒一圈） |
| target | Vector3 | (0,0,0) | 相机注视的目标点（环绕中心） |

两个必知要点：

- 开启 enableDamping 后必须在渲染循环里每帧调用 controls.update()，否则阻尼不生效（相机不会"滑行"）。这也是为什么 animate() 里有 controls.update()
- 相机初始 position.set(0, 3, 15) 与 controls.target 默认 (0,0,0) 共同决定初始视角：站在 (0,3,15) 望向地心，看到的是略微俯视的地球

【注意】OrbitControls 属于 three/addons 附加模块，不包含在核心包默认导出里，必须单独 `import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'`。它操作的是全局 camera 对象，与 Vue 的响应式无关，不要试图用 v-model 之类的思路去"绑定"它。

**实战应用场景**：OrbitControls 可能是 Three.js 生态中被引用最多的单个类——3D 看房（贝壳如视）、车型 360° 展示（汽车之家）、在线博物馆（故宫数字文物库）、数据大屏的 3D 城市漫游，几乎都直接或间接用它实现"拖拽 + 滚轮"交互；地图类产品则在其基础上魔改（限制俯仰角、加大阻尼），ECharts GL 的 globe 组件内部封装的也是同款交互逻辑。

**✦ 示例 02（Vue 3 版）：光照系统 + Group 分层 + OrbitControls 交互**（保存为 `my-app/src/components/ch13/02-LightControls.vue`）。一个自发光"太阳"照亮一颗行星，行星组整体公转；鼠标拖拽旋转视角、滚轮缩放：

```vue
<!-- src/components/ch13/02-LightControls.vue —— 示例 02：光照、Group 与轨道控制器 -->
<template>
  <div ref="containerRef" class="scene-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
// OrbitControls 属于 three/addons 附加模块，不在核心包默认导出里，必须单独导入。
// npm 安装的 three 包通过 exports 字段同时暴露 'three/addons/*' 与 'three/examples/jsm/*' 两种等价路径
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const containerRef = ref(null)

// Three.js 对象存普通变量（禁用 reactive 深度代理，原因见示例 01 注释）
let scene, camera, renderer, controls, shell, planetGroup
let animationId = null
const clock = new THREE.Clock()

function initScene() {
  const container = containerRef.value

  // —— 三大基石（示例 01 已详述，此处压缩）——
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000010)
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 2000)
  camera.position.set(0, 4, 14)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  // —— 光照系统（13.4.1）：环境光垫底 + 平行光造型 ——
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))          // 环境光：无方向均匀照亮，防止背光面全黑
  const sun = new THREE.DirectionalLight(0xffffff, 1.0)     // 平行光：模拟太阳
  sun.position.set(10, 5, 10)                               // 方向 = position → target(默认原点)，设 rotation 无效
  scene.add(sun)

  // —— "太阳"：MeshBasicMaterial 自发光，不受光照影响（13.4.1 注意事项）——
  const sunBall = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffcc33 })        // 自发光材质：永远全亮
  )
  sunBall.position.set(-7, 2, -4)
  scene.add(sunBall)

  // —— 行星组（13.4.2）：行星本体 + 线框外壳放进同一个 Group，整组统一变换 ——
  planetGroup = new THREE.Group()
  planetGroup.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 48, 48),
    new THREE.MeshPhongMaterial({ color: 0x5577bb, shininess: 18 }) // 受光材质：有昼夜明暗
  ))
  shell = new THREE.Mesh(
    new THREE.SphereGeometry(1.75, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0x88aaff, wireframe: true, transparent: true, opacity: 0.25 })
  )
  planetGroup.add(shell)          // 加入组后继承组的位移/旋转/缩放
  planetGroup.position.set(3, 0, 0)  // 整组平移：本体与外壳一起移动
  scene.add(planetGroup)

  // —— 轨道控制器（13.4.3）：左键拖拽旋转 / 滚轮缩放 / 右键平移 ——
  // 注意：传 renderer.domElement（canvas 本身）而非容器 div，事件才能精确落在画布上
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true   // 阻尼惯性：松手后缓缓滑停
  controls.dampingFactor = 0.05
  controls.minDistance = 4        // 缩放范围限制
  controls.maxDistance = 40
  controls.update()               // 初始化后立即调用一次，让相机与 target 对齐

  window.addEventListener('resize', onResize)
}

// —— 渲染循环：整组旋转 = 一行代码驱动组内所有物体 ——
function animate() {
  animationId = requestAnimationFrame(animate)
  const dt = clock.getDelta()
  shell.rotation.y += 1.2 * dt              // 外壳相对行星自转
  planetGroup.rotation.y += 0.3 * dt        // 整组旋转：本体+外壳一起转（Group 批量变换的价值）
  controls.update()                         // 开启阻尼后必须每帧调用，否则惯性不生效！
  renderer.render(scene, camera)
}

function onResize() {
  const container = containerRef.value
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}

onMounted(() => {
  initScene()
  animate()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(animationId)
  controls.dispose()              // 释放控制器（解绑它注册的全部指针/滚轮事件）
  scene.traverse(obj => {         // 遍历场景树，统一释放所有几何体与材质
    if (obj.geometry) obj.geometry.dispose()
    if (obj.material) obj.material.dispose()
  })
  renderer.dispose()
  renderer.domElement.remove()
})
</script>

<style scoped>
.scene-container { width: 100%; height: 100vh; overflow: hidden; }
</style>
```

**示例 02 新写法速览：本例首次出现的四个写法**

光照、Group 分层与 OrbitControls 本身 13.4.1 ~ 13.4.3 已逐行讲过，下面只解释"此前课件从未出现"的写法（系统讲解在后续章节，此处先建立最小概念）：

- **`new THREE.SphereGeometry(1.2, 32, 32)` —— 球体几何体（本例三次使用）**。与示例 01 的 BoxGeometry 同族，但参数含义不同：第一个参数是**半径**（太阳 1.2、行星 1.5、外壳 1.75——注意不是"边长"，球没有边长）；后两个参数是经度 / 纬度方向的**分段数**，分段越多球面越圆滑、顶点开销越大。本例三处取值各有考量：太阳和行星是主角取 32 / 48；线框外壳只画边线不填充面，24 段就够看，不必浪费顶点。系统讲解（含分段数取舍经验值）见 13.5.1。
- **`new THREE.MeshPhongMaterial({ color: 0x5577bb, shininess: 18 })` —— 受光材质**。与 MeshBasicMaterial 的本质区别：Phong 会**响应光照**，向光面亮、背光面暗，还能产生"海面反光"式的高光（对照验收标准里行星的昼夜明暗）。`shininess: 18` 是高光锐利度——越小高光越大越柔。本例先记结论：**要"真实感"用 Phong，要"自发光"用 Basic**，13.5.2 结合地球贴图系统展开。
- **`transparent: true, opacity: 0.25` —— 透明外壳（首次出现）**。`opacity` 是不透明度，取 0~1（1 全不透明、0 全透明，0.25 即 75% 透明）；但**必须同时把 `transparent` 设为 `true`** 才生效——只写 opacity 不开 transparent 是经典无效写法（Three.js 默认按不透明物体渲染，不做透明度混合）。后续云层（13.5.2）、卫星（13.6.2）全都依赖这对搭档。
- **`scene.traverse(obj => {...})` —— 遍历场景树统一释放**。示例 01 是逐个对象手动 `dispose()`，本例升级为 `traverse()`：它把场景树里**每个对象**依次传给回调函数，回调里检测到 `geometry` / `material` 就释放——对象一多就不会漏。另外注意 `controls.dispose()`：OrbitControls 自己在画布上注册了一堆指针/滚轮监听，销毁组件时必须调它的 dispose 统一解绑（与 13.3.5 解绑 resize 同理）。完整释放清单见 13.8.6。

运行验收：黄色"太阳"全亮无阴影层次；蓝色行星向光面亮、背光面暗（对比 MeshBasicMaterial 与 MeshPhongMaterial）；行星与线框外壳步调一致；拖拽有惯性滑行。试着注释掉 `controls.update()`，阻尼立即失效。

### 13.4.4 真实代码对照：项目 Globe3D.vue 中的本节实现

示例 02 敲完后，对照真实项目里同一套知识是怎么用的。以下三段节选自 `src/components/Globe3D.vue` 的 initScene()，注释完整保留——与示例 02 逐行对比，体会真实项目的参数取值（阻尼系数、缩放范围、光照强度）与教学版的差异：

**① 光照系统：initScene() 光照部分（对应 13.4.1）**

```js
<!-- src/components/Globe3D.vue —— initScene() 光照部分 -->
// 光照
const ambient = new THREE.AmbientLight(0xffffff, 0.4)      // 环境光：强度 0.4
scene.add(ambient)
const directional = new THREE.DirectionalLight(0xffffff, 1.0) // 平行光：强度 1.0
directional.position.set(10, 5, 10)                        // 光源方向：右上前方
scene.add(directional)
```

**② 场景图分层：initScene() 分组部分（对应 13.4.2）**

```js
<!-- src/components/Globe3D.vue —— initScene() 分组部分 -->
// 地球（内含：地球本体 + 云层 + 大气辉光，三者一起随 earthGroup 管理）
// createEarth()：创建地球组的工厂函数，内部实现见 13.5.1~13.5.2
earthGroup = createEarth()
scene.add(earthGroup)

// 卫星组：所有卫星 Sprite 都 add 进这个组
satelliteGroup = new THREE.Group()
scene.add(satelliteGroup)

// 近地天体组
neoGroup = new THREE.Group()
scene.add(neoGroup)

// 轨道线组：所有轨道线统一存放，清空重建只操作这一个组
orbitGroup = new THREE.Group()
scene.add(orbitGroup)
```

**③ 轨道控制器：initScene() 控制器部分（对应 13.4.3）**

```js
<!-- src/components/Globe3D.vue —— initScene() 控制器部分 -->
// 控制器
controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true        // 开启阻尼（惯性）：松手后缓缓停下，而不是急刹
controls.dampingFactor = 0.05        // 阻尼系数：越小惯性越"滑"
controls.rotateSpeed = 0.5           // 旋转灵敏度：0.5 = 半速，太空场景宜慢
controls.minDistance = 7             // 最近缩放距离：防止镜头怼进地球内部
controls.maxDistance = 40            // 最远缩放距离：防止缩放到看不见地球
controls.autoRotate = props.autoRotate      // 自动旋转（欢迎页展示用）
controls.autoRotateSpeed = 0.5       // 自动旋转速度
```

## 13.5 打造真实地球：几何体、材质与纹理

本节是 3D 学习的分水岭——前四节是"骨架"，本节开始决定"血肉"。先建立三个核心概念的关系链：

- 几何体（Geometry）：物体的"形状骨架"，由一堆三维顶点（Vertex）连成三角面构成。它只管形状，不管颜色
- 材质（Material）：物体的"表面质感"——什么颜色、多光滑、透不透明、贴什么图。同一种几何体配不同材质，观感完全不同
- 纹理（Texture）：材质可使用的"贴图"（一张图片），贴到几何体表面。地球的大陆海洋就是一张世界地图贴图贴在球上

一句话记忆：**几何体定形状，材质定质感，纹理定图案**。

### 13.5.1 SphereGeometry 球体

new THREE.SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength)——完整签名共 7 个参数，后 4 个是"部分球"控制项（做半球穹顶时会用到），全缺省时绘制完整球体。项目用它创建地球本体：半径 5、经纬各 128 段（真实代码见 13.5.7 ①），参数逐个拆解：

| 参数 | 类型 | 项目取值 | 官方默认值 | 说明 |
|---|---|---|---|---|
| radius | number | 5 | 1 | 球半径（世界单位） |
| widthSegments | number | 128 | 32（最小 3） | 经度方向分段数（类比地球的经线数） |
| heightSegments | number | 128 | 16（最小 2） | 纬度方向分段数（类比纬线数） |
| phiStart | number | 缺省 | 0 | 水平起始角（弧度），默认从 +X 轴开始 |
| phiLength | number | 缺省 | 2π | 水平扫过角度，2π 即完整一周 |
| thetaStart | number | 缺省 | 0 | 垂直起始角（弧度），0 = 北极 |
| thetaLength | number | 缺省 | π | 垂直扫过角度，π 即从北极到南极 |

分段数决定"圆不圆"：球体本质是多个三角形拼成的多面体，8 段的"球"是明显的低多边形块。但分段数翻倍 = 顶点数近似翻 4 倍，渲染开销随之上升。经验值：主角物体 96~128，背景小物体 16~32。项目地球取 128×128，取舍理由直接写成了代码注释（见 13.5.7 ②）。

Mesh（网格）= 几何体 + 材质的组合体，是最常用的可渲染物体：new THREE.Mesh(geometry, material)。项目中云层、大气层也都是 Mesh。

### 13.5.2 MeshPhongMaterial：让地球有"昼夜"和"海面反光"

Phong 是经典光照模型（1975 年裴祥风提出）的名字，它按"环境反射 + 漫反射 + 镜面反射"三层叠加计算表面颜色。项目地球的完整材质同时挂了 map / normalMap / specularMap 三张贴图通道（代码见 13.5.7 ③）——三张贴图各司其职（这是本节课最核心的纹理知识）：

- map（颜色贴图）：人眼看到的"世界地图"。决定物体每个位置的基础颜色
- normalMap（法线贴图）：一张记录"表面凹凸朝向"的图——紫蓝色调的那种。它欺骗光照计算，让平面上的山脉产生真实的光影起伏，而几何上仍是光滑球面（因此几乎不增加顶点开销）。凹凸幅度由 normalScale 控制
- specularMap（高光贴图）：灰度图，白色区域反光、黑色区域哑光。地球贴图上海洋是白的（反光）、陆地是黑的（哑光），于是只有海面出现"太阳耀斑"

材质代码（13.5.7 ③）里出现的两个 Three.js 工具类顺便认识一下：THREE.Color(0x555555) 创建颜色对象（接受 16 进制数或 '#rrggbb' 字符串，材质的 color / specular 属性都是这个类型）；THREE.Vector2(0.85, 0.85) 创建二维向量（构造参数即 x、y 分量），法线强度用它分别控制两个方向的凹凸程度。

常用属性全表（MeshPhongMaterial）：

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| color | Color | 0xffffff | 材质本色，与 map 相乘（白色 = 不干扰贴图颜色） |
| map | Texture | null | 颜色贴图 |
| normalMap | Texture | null | 法线贴图（凹凸细节） |
| normalScale | Vector2 | (1,1) | 法线凹凸强度，可分 x/y 两方向 |
| specularMap | Texture | null | 高光遮罩贴图 |
| specular | Color | 0x111111 | 镜面高光颜色 |
| shininess | number | 30 | 高光锐利度（越大高光斑越小越亮） |
| transparent | boolean | false | 是否开启透明 |
| opacity | number | 1 | 不透明度（transparent 为 true 才生效） |
| depthWrite | boolean | true | 是否写深度缓冲（半透明物体常关，见 13.7.3） |

needsUpdate 的意义：材质创建并首次渲染后，GPU 已按当时属性编译好着色器程序；之后动态增删 map/normalMap 等贴图通道，必须设 material.needsUpdate = true 通知重新编译，否则新贴图不生效。

云层是"套在地球外面的第二个球"：半径比地球大 0.8%（1.008 倍）、transparent 开透明、depthWrite 关深度写入，完整配置见 13.5.7 ④。

两个值得咀嚼的细节：云球半径 1.008 倍（太贴近地表云与山脉 z-fighting，太远像"壳"）；depthWrite: false 的原理在 13.7.3 Sprite 一节统一讲透。

**实战应用场景**：map + normalMap + specularMap 多通道组合是游戏与影视资产的主流做法（PBR 工作流普及前的行业标准）：游戏地形靠法线贴图让低面数山体呈现岩石凹凸、角色盔甲呈现金属划痕；影视虚拟制片（虚幻引擎场景资产）同理；文物数字化（敦煌/故宫的高精度扫描还原）靠多张贴图叠加重现材质细节。核心收益一致：**用低面数模型 + 多贴图模拟高细节**，性能与画质兼得。

### 13.5.3 TextureLoader：贴图加载与失败回退

TextureLoader 把图片文件变成 Three.js 纹理对象。TextureLoader.load(url, onLoad, onProgress, onError) 四个参数，后三个都是可选回调。返回的 Texture 对象**立即返回、图片异步加载**——先拿到纹理对象用于材质，图片到位后自动重绘，这是 Three.js 贴图的"占位先行"机制。

"加载失败回退"是生产级代码与 Demo 代码的分水岭。项目为每张贴图都设计了回退：地表图失败 → Canvas 程序化手绘地球；法线图失败 → 移除法线通道（球面变光滑但可用）；云图失败 → 隐藏云层。任何单点失败都不至于渲染黑球。这套"加载 + sRGB 标记 + 各向异性 + 失败回退"被封装成 loadEarthTexture(file, sRGB, onFail) 函数（完整实现见 13.5.7 ⑤），上面三张贴图的回退正是靠它的第三个参数实现的。

贴图文件为什么放 public/textures/ 而不是 src/assets/？public 目录的文件不参与构建处理，按原始路径原样拷贝到 dist，适合体积大、数量多、不需要 hash 指纹的静态资源；src/assets 则会被 Vite 打 hash 指纹（如 satellite-texture-a1b2c3.png），适合需要构建校验的模块化资源。项目两种方式都用了（地球贴图在 public，卫星/小行星贴图在 src/assets），就是这个考量。

【注意】贴图还有一道浏览器安全限制——跨域（CORS）：WebGL 规定用作纹理的图片必须与页面同源、或服务器返回 Access-Control-Allow-Origin 跨域响应头，否则纹理会被安全机制置空（地球变纯色球，控制台报 SecurityError）。

所以 3D 贴图不能随手热链外网图床——本项目把贴图全部本地化就是这个原因；调用 NASA EPIC 实拍影像时也专门选了带 CORS 头的 api.nasa.gov 数据源（GSFC 镜像无此头、不可用）。"本地图片能显示、跨域图片当纹理就是不行"是新手高频坑。

**实战应用场景**：异步加载 + 失败回退是弱网产品的必修课：面向全球用户的 3D 官网必须考虑海外访问 CDN 贴图超时；车载/机载等弱网环境的 3D 地图需要离线兜底；政务内网（无外网）部署时自动降级到本地资源。原则通用且与前端"骨架屏"同源：**任何单点资源失败都不能让画面空白**。

### 13.5.4 色彩空间 SRGBColorSpace 与各向异性过滤 anisotropy

这两个属性各占一行代码，却直接决定"画质"的观感，值得单独讲透：

**色彩空间（colorSpace）**：屏幕显示的颜色按 sRGB 标准（伽马 2.2）编码，而 WebGL 线性计算需要线性颜色。颜色类贴图（map/specularMap）必须声明 tex.colorSpace = THREE.SRGBColorSpace，让 Three.js 在采样时自动做"sRGB → 线性"转换，否则地球整体发灰发白（相当于颜色被线性化解释了一遍）。

数据类贴图（normalMap 的 RGB 存的是法线向量数值，不是给人看的颜色）则保持默认线性，**设了反而破坏凹凸效果**——这就是 loadEarthTexture 第二个参数 sRGB 存在的原因。

渲染器端还有配套的输出设置：r152 起 renderer.outputColorSpace 默认就是 SRGBColorSpace，与贴图上标的 SRGB 配对，才构成完整的"输入解码 → 线性计算 → 输出编码"颜色管线（默认值即正确，无需手动设置）。另一个常听到的词 toneMapping（色调映射，如 ACESFilmicToneMapping 能让高光过渡更柔和、有"电影感"）本项目未启用——太空场景高对比直出反而更真实，知道有这个开关即可。

**各向异性过滤（anisotropy）**：纹理的"斜视角清晰度"技术。正对球心看贴图很清晰，但看球边缘（视线与表面夹角很小）时，默认的三线性过滤会把一长串纹理像素压缩到一列屏幕像素里，海岸线糊成一片。各向异性过滤让 GPU 沿视线方向多采样几次。

取值一行代码搞定：`maxAniso = renderer.capabilities.getMaxAnisotropy()`（GPU 支持的最大级别，通常 8~16；项目中的实际调用见 13.5.7 ⑥）。必须先读上限再赋值：不同 GPU 支持级别不同，超上限的值会被静默钳制，直接用 capabilities 上限最稳。

【注意】这两个属性是"3D 新手画面廉价感"的两大元凶：贴图不设 SRGB → 颜色发灰；不设 anisotropy → 斜视角糊。各一行代码，收益极大，请形成肌肉记忆：**颜色贴图必设 colorSpace，主视贴图必设 anisotropy**。

**实战应用场景**：色彩空间管理直接决定"设计稿还原度"——3D 商品展示中贴图偏灰会被设计师一眼打回，colorSpace 标记是上线前 checklist 的必查项；anisotropy 则是地面/赛道类场景的刚需：赛车游戏的远处赛道、飞行模拟的跑道延伸、3D 展厅的地板纹理，视线与地面夹角越小、开启前后差距越明显。两个属性各一行代码，是"专业感"与"廉价感"的分界线。

### 13.5.5 CanvasTexture：用 Canvas 2D 烘焙 3D 贴图

贴图不一定来自图片文件——任何 Canvas 画布都可以直接变成纹理。这打通了"前端 2D 绘图能力 → 3D 世界"的通道，也是本项目最出彩的技巧之一。

三步流程：document.createElement('canvas') 画图 → new THREE.CanvasTexture(canvas) → 赋给材质的 map。

项目中有四处实战应用：程序化地球（贴图加载失败的兜底）、卫星手绘贴图、小行星手绘贴图、危险天体红色光晕贴图。

光晕贴图最短小精悍（完整实现见 13.5.7 ⑦），思路：256×256 透明画布 → createRadialGradient 画"中心亮红 → 边缘全透明"的径向渐变 → fillRect 铺满画布 → new THREE.CanvasTexture(canvas) 一步转成 3D 贴图。

代码里的 Canvas 2D 绘图接口逐个说明（HTML5 Canvas 标准 API，与 CanvasTexture 是固定搭档）：

- `getContext('2d')`：获取画布的 2D 绘图上下文
- `createRadialGradient(x0, y0, r0, x1, y1, r1)`：创建径向渐变——前三个参数是起始圆（圆心 + 内半径），后三个是结束圆（圆心 + 外半径），渐变从内圆向外圆过渡
- `addColorStop(偏移量, 颜色)`：在渐变上添加一个色标，偏移量取 0~1
- `fillStyle`：设置填充样式（纯色或渐变对象）
- `fillRect(x, y, w, h)`：用当前 fillStyle 填充矩形区域

手绘地球（createEarthTexture）原理相同但绘制层次更多：2048×1024 画布（2:1 正是等距圆柱贴图比例）→ 深蓝海洋渐变 → 大陆轮廓描边（数据是手工简化的经纬度坐标数组）→ 随机噪点模拟地形 → 极地冰盖。完整代码在 Globe3D.vue，核心收获是思路：**纹理只是"像素数组"，Canvas 是前端最顺手的像素生产线**。

罗盘组件（Seismoscope3D.vue）把这个技巧用到了极致——环形中文刻字直接用 ctx.fillText 沿圆周逐字旋转绘制（2048×2048 透明画布 → CanvasTexture → RingGeometry 顶面贴层），无需任何美术资源，感兴趣的同学课后阅读 createRingFaceTexture()。

**实战应用场景**：CanvasTexture 是"前端 2D 技能直接变现到 3D"的通道：数据可视化把热力图/等值线画到 Canvas 再贴上 3D 地球（气象台风路径、全球数据分布都在用）；产品配置器实时生成带文字的个性化贴图（3D 奖杯刻字、T 恤印花实时预览）；游戏 HUD 小地图、场景内动态公告牌同理。规律：**任何 Canvas 能画的，都能变成 3D 贴图**——这让不熟悉建模工具的前端工程师也能产出丰富的 3D 视觉。

### 13.5.6 贴图 UV 与经纬度对齐：为什么卫星能"踩"在正确的大陆上空

UV 坐标是纹理世界的"经纬度"：每个几何体顶点都带一组 (u, v) 值，范围 0~1，(0,0) 是贴图左下角、(1,1) 是右上角，告诉 GPU"这个顶点贴图上的哪个像素"。

SphereGeometry 的 UV 展开规则（等距圆柱投影，equirectangular）：球面沿经度 180° 处剪开、摊平成 2:1 长方形——正是世界地图的样子。

于是存在一个决定性问题：**贴图上的经度 0°（格林威治）对应球面上哪个方向？** Three.js 的 SphereGeometry 约定：经度 0° 在 +X 轴，东经沿 -Z 方向递增。把经纬度换算成三维坐标时必须遵守同一约定，否则卫星整体绕地轴偏移、和大陆对不上位。

项目把换算公式封装在 `src/utils/satelliteMath.js` 的 latLngAltToVector3() 函数中（推导过程与完整代码见 13.5.7 ⑧），最终公式：x = r·cos(纬度)·cos(经度)，y = r·sin(纬度)，z = -r·cos(纬度)·sin(经度)——球坐标转直角坐标的标准公式（y 轴为极轴），唯一需要注意的就是 z 取负号，对齐 SphereGeometry 的 UV 约定。

【解题思路】如果渲染后发现"卫星整体偏了半个地球"或"经度左右镜像"，如何自查？先验证 latLngAltToVector3(0, 0, 0) 应返回 (R, 0, 0)——经纬度 (0,0) 必须落在 +X 轴；再验证 (0, 90, 0) 应返回 (0, 0, -R)——东经 90° 在 -Z。若不满足，就是 z 分量符号或经度差 180° 的问题。

**实战应用场景**：经纬度 → 3D 坐标转换是"地理可视化"的核心公式：卫星跟踪（本项目的真实价值，n2yo、Heavens-Above 的可视化同类实现）、航班跟踪（Flightradar24 的 3D 视角）、船只 AIS 监控、气象云图叠加（Windy）、应急指挥的态势标绘——所有"把球面经纬数据放到球上"的产品都绕不开这一步。反方向（3D 拾取点反算经纬度）则用于"点击地球上任意位置查询信息"的交互。

**✦ 示例 03（Vue 3 版）：网络贴图的真实地球（颜色贴图 + 云层 + 自转 + 失败回退）**（保存为 `my-app/src/components/ch13/03-EarthTexture.vue`）。地球贴图直接从 three.js 官方网站在线加载（来源与获取方式详见 13.9.1），加载失败自动回退到 Canvas 程序化贴图——本节所有纹理知识点的浓缩实战：

```vue
<!-- src/components/ch13/03-EarthTexture.vue —— 示例 03：真实感地球（网络贴图 + 自转 + 回退） -->
<template>
  <div ref="containerRef" class="scene-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const containerRef = ref(null)

let scene, camera, renderer, controls, earth, earthMat, cloudsMat, cloudsMesh
let animationId = null
const clock = new THREE.Clock()

function initScene() {
  const container = containerRef.value

  // —— 三大基石 + 控制器（前两个示例已详述，此处压缩）——
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000010)
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 2000)
  camera.position.set(0, 3, 15)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  // —— 光照（13.4.1）——
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.0)
  sunLight.position.set(10, 5, 10)
  scene.add(sunLight)

  // 各向异性过滤：必须先读 GPU 上限再赋值（13.5.4）
  const maxAniso = renderer.capabilities.getMaxAnisotropy()
  const textureLoader = new THREE.TextureLoader()   // TextureLoader 底层用 Image + crossOrigin 匿名跨域

  // —— 回退贴图：Canvas 手绘经纬网格（13.5.5）——
  // 网络贴图加载失败（断网/CORS）时地球不至于变成纯色球
  function createFallbackTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 1024; canvas.height = 512   // 2:1 等距圆柱比例（13.5.6）
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#0b2d6b'                  // 深蓝海洋
    ctx.fillRect(0, 0, 1024, 512)
    ctx.strokeStyle = 'rgba(140,190,255,0.28)' // 淡蓝经纬网格
    for (let i = 0; i <= 24; i++) {            // 24 条经线（每 15°）
      ctx.beginPath(); ctx.moveTo((i / 24) * 1024, 0); ctx.lineTo((i / 24) * 1024, 512); ctx.stroke()
    }
    for (let i = 0; i <= 12; i++) {            // 12 条纬线
      ctx.beginPath(); ctx.moveTo(0, (i / 12) * 512); ctx.lineTo(1024, (i / 12) * 512); ctx.stroke()
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace      // 颜色贴图必标 sRGB（13.5.4）
    return tex
  }

  // —— 地球本体：SphereGeometry + MeshPhongMaterial（13.5.1/13.5.2）——
  earthMat = new THREE.MeshPhongMaterial({
    map: createFallbackTexture(),              // 同步占位：先有画面（13.5.3 "占位先行"机制）
    specular: new THREE.Color(0x333333),       // 海面高光颜色
    shininess: 14,                             // 高光锐利度
  })
  earth = new THREE.Mesh(new THREE.SphereGeometry(5, 96, 96), earthMat)   // 半径 5，经纬各 96 段
  scene.add(earth)

  // —— 异步升级：从 three.js 官网加载真实地球贴图（来源见 13.9.1）——
  textureLoader.load(
    'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg', // 官方示例贴图（NASA 蓝色大理石）
    (tex) => {                                 // onLoad：加载成功 → 替换占位贴图
      tex.colorSpace = THREE.SRGBColorSpace    // 颜色贴图必须标记 sRGB，否则整体发灰
      tex.anisotropy = maxAniso                // 斜视角清晰度拉满
      earthMat.map = tex
      earthMat.needsUpdate = true              // 材质换图后必须手动通知重编译！
      console.log('地球贴图加载成功')
    },
    undefined,                                 // onProgress 自 r84 起不再回调，官方要求传 undefined
    () => console.warn('网络贴图加载失败，保持 Canvas 兜底贴图（检查网络或改用本地路径）')
  )

  // —— 云层：套在地球外的第二个半透明球（13.5.2）——
  cloudsMat = new THREE.MeshPhongMaterial({
    map: null,
    transparent: true,                         // PNG 透明通道：无云处透出地表
    depthWrite: false,                         // 半透明不写深度，避免边缘闪烁
  })
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(5 * 1.008, 64, 64), cloudsMat)
  scene.add(clouds)
  textureLoader.load(
    'https://threejs.org/examples/textures/planets/earth_clouds_1024.png',
    (tex) => { tex.colorSpace = THREE.SRGBColorSpace; cloudsMat.map = tex; cloudsMat.needsUpdate = true },
    undefined,
    () => { clouds.visible = false; console.warn('云图加载失败，隐藏云层') }  // 单点失败不黑屏
  )

  // 云层网格引用存到组件级变量，供渲染循环差速自转使用（同样不走响应式）
  cloudsMesh = clouds
  window.addEventListener('resize', onResize)
}

// —— 渲染循环：地球自转 + 云层微差速（dt 增量解耦帧率）——
function animate() {
  animationId = requestAnimationFrame(animate)
  const dt = clock.getDelta()
  earth.rotation.y += 0.05 * dt               // 地球每秒转 0.05 弧度（约 2 分钟一圈）
  if (cloudsMesh) cloudsMesh.rotation.y += 0.065 * dt  // 云层稍快：产生流动感
  controls.update()
  renderer.render(scene, camera)
}

function onResize() {
  const container = containerRef.value
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}

onMounted(() => {
  initScene()
  animate()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(animationId)
  controls.dispose()
  // 纹理也要释放：map 里挂着 GPU 纹理资源，不释放会随组件反复挂载持续泄漏
  if (earthMat.map) earthMat.map.dispose()
  if (cloudsMat.map) cloudsMat.map.dispose()
  earthMat.dispose()
  cloudsMat.dispose()
  renderer.dispose()
  renderer.domElement.remove()
})
</script>

<style scoped>
.scene-container { width: 100%; height: 100vh; overflow: hidden; }
</style>
```

**示例 03 新写法速览：本例首次出现的四个写法**

球体、Phong 材质、TextureLoader、sRGB、各向异性、CanvasTexture 本身 13.5.1 ~ 13.5.6 已系统讲过，下面只解释"此前课件从未出现"的写法：

- **`earthMat.needsUpdate = true` —— 材质换图后的"重编译通知"**。材质第一次渲染时 Three.js 会把它的配置**编译成 GPU 着色器程序**；之后把 `map` 从旧贴图换成新贴图（或从 null 换成有图），Three.js 默认不会察觉——必须手动把 `needsUpdate` 置为 `true` 强制重编译，新贴图才真正生效。本例的"异步升级"流程全靠它：先挂 Canvas 兜底图（占位先行）→ 网络图加载成功 → 换 `map` + 置 `needsUpdate` → 画面从网格球无缝变成真实地球。**漏写这行是换图不生效的第一大坑**。
- **`ctx.beginPath() / moveTo() / lineTo() / stroke()` —— Canvas 路径画线四件套**。13.5.5 讲的是"填充类"API（fillRect 直接填色块），回退贴图里画经纬线用的是"路径类"API，四步一组：`beginPath()` 开启一条新路径（清空旧路径记录）→ `moveTo(x, y)` 把画笔**抬笔移动**到起点（不画线）→ `lineTo(x, y)` 从当前位置**画线**到目标点 → `stroke()` 用当前 `strokeStyle` **描边**输出（不调用 stroke 屏幕上什么都没有）。24 条经线就是把这个四步循环 24 次。
- **`clouds.visible = false` —— 物体隐藏开关**。`visible` 是所有 3D 对象（Object3D）共有的属性，置 `false` 后该对象**不参与渲染但仍在场景里**，随时可改回 `true` 复活。云图加载失败时用它整体隐藏云层，比销毁对象简单且可逆。
- **`earthMat.map.dispose()` —— 纹理也是要单独释放的 GPU 资源**。示例 02 释放了 geometry 和 material，但 material 只是个"配置单"，它引用的**贴图本体**（`map` 指向的 Texture）在 GPU 里另占一份显存，必须自己调 `dispose()`——先释放 map 再释放 material，顺序不能反（material 释放后引用还在，漏掉 map 就泄漏）。完整释放清单见 13.8.6。

运行验收：深空中一颗蓝色地球缓慢自转，大陆海洋清晰、海面有太阳高光、云层独立漂移；断网时（或把 URL 改错）回退为经纬网格球，控制台输出警告而非黑屏。

若想离线运行：my-app 的 `public/textures/` 目录已内置 `earth_atmos_2048.jpg` 与 `earth_clouds_1024.png`（下载方式见 13.9.1），把 URL 换成 `/textures/earth_atmos_2048.jpg`（Vite 把 public/ 目录映射到站点根路径）即可。

### 13.5.7 真实代码对照：项目 Globe3D.vue 中的本节实现

知识点讲完、示例 03 敲完，最后看真实项目是怎么写这几块的。以下八段代码节选自本项目真实文件——①~⑦ 节选自页面组件 `src/components/Globe3D.vue`（第 13 天实战项目的 3D 地球生产组件），⑧ 节选自工具模块 `src/utils/satelliteMath.js`，注释完整保留，可逐行与示例 03 对照。教学版为可读性做了简化，真实版额外包含法线/高光贴图多通道、逐贴图失败回退等工程手段：

**① 地球本体：createEarth() 球体部分（对应 13.5.1）**

```js
<!-- src/components/Globe3D.vue —— createEarth() 本体部分 -->
const EARTH_RADIUS = 5   // 地球半径（模块级常量，世界单位）
earthMesh = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS, 128, 128),  // 半径 5，经纬各 128 段
  material              // 地球材质（下一个代码块创建后传入）
)
```

**② 分段数取舍：注释原文（对应 13.5.1）**

```js
<!-- src/components/Globe3D.vue —— 注释原文 -->
// 球体分段 96 → 128（极限清晰度）：地球边缘更圆滑，超采样渲染下
// 特写也无缝隙感；配合 2048 本地贴图是本场景的合理精度上限
```

**③ 地球材质：三张贴图各就各位（对应 13.5.2）**

```js
<!-- src/components/Globe3D.vue —— createEarth() 材质部分 -->
const material = new THREE.MeshPhongMaterial({
  shininess: 14,                          // 高光锐利度：越小高光越大越柔（海洋的柔和高光）
  specular: new THREE.Color(0x555555),    // 镜面高光颜色：灰色 → 海面反白光
})
// 地表颜色贴图（loadEarthTexture 是贴图加载封装函数，实现见本节 ⑤；
// 加载失败时回退到程序化 Canvas 纹理）
material.map = loadEarthTexture('earth_atmos_2048.jpg', true, () => {
  material.map = createEarthTexture()     // 兜底：Canvas 手绘地球
  material.needsUpdate = true
})
// 法线贴图：呈现地形凹凸细节（高原/山脉的立体光影）
material.normalMap = loadEarthTexture('earth_normal_2048.jpg', false, () => {
  material.normalMap = null
  material.needsUpdate = true
})
material.normalScale = new THREE.Vector2(0.85, 0.85)  // 凹凸强度 85%
// 高光贴图：仅海洋区域产生镜面反光，陆地哑光
material.specularMap = loadEarthTexture('earth_specular_2048.jpg', true, () => {
  material.specularMap = null
  material.needsUpdate = true
})
```

**④ 云层：套在地球外的第二个半透明球（对应 13.5.2）**

```js
<!-- src/components/Globe3D.vue —— createEarth() 云层部分 -->
cloudsMesh = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS * 1.008, 96, 96),   // 半径比地球大 0.8%
  new THREE.MeshPhongMaterial({
    map: loadEarthTexture('earth_clouds_1024.png', true, () => {
      cloudsMesh.visible = false               // 云图加载失败直接隐藏云层
    }),
    transparent: true,                         // PNG 自带透明通道：无云处透出地表
    depthWrite: false,                         // 半透明云层不写深度，避免遮挡闪烁
  })
)
```

**⑤ 贴图加载器：加载 + 回退一体化封装（对应 13.5.3）**

```js
<!-- src/components/Globe3D.vue —— 贴图加载器 -->
const textureLoader = new THREE.TextureLoader()

/**
 * 加载地球贴图（带失败回退）
 * @param {string} file 文件名（位于 public/textures/ 下）
 * @param {boolean} sRGB 是否按 sRGB 色彩空间处理（颜色贴图 true，法线图 false）
 * @param {Function} onFail 单张贴图加载失败时的回退函数
 */
function loadEarthTexture(file, sRGB, onFail) {
  const tex = textureLoader.load(
    `/textures/${file}`,     // URL（public 目录下，开发/构建均可访问）
    undefined,               // onLoad：加载成功回调（本项目在别处统一处理）
    undefined,               // onProgress：进度回调（图片无进度信息，一般不用）
    () => { if (onFail) onFail() }   // onError：加载失败 → 执行回退
  )
  if (sRGB) tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = maxAniso  // 各向异性过滤取 GPU 最大级别（maxAniso 是模块级变量，来源见 13.5.4）
  return tex
}
```

**⑥ 读取 GPU 各向异性上限（对应 13.5.4）**

```js
<!-- src/components/Globe3D.vue —— 读取 GPU 能力上限 -->
maxAniso = renderer.capabilities.getMaxAnisotropy()  // GPU 支持的最大级别（通常 8~16）
```

**⑦ 危险天体红色光晕：createNeoGlowTexture()（对应 13.5.5）**

```js
<!-- src/components/Globe3D.vue —— createNeoGlowTexture() -->
/** 危险天体红色光晕贴图（256×256 透明底，径向渐变） */
function createNeoGlowTexture() {
  const S = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')
  // 径向渐变：中心亮红 → 边缘平滑衰减到全透明
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, 'rgba(255, 120, 100, 0.55)')   // 内核亮
  g.addColorStop(0.35, 'rgba(255, 70, 56, 0.30)')  // 中环明显
  g.addColorStop(0.7, 'rgba(255, 45, 40, 0.10)')   // 外圈淡
  g.addColorStop(1, 'rgba(255, 40, 40, 0)')        // 边缘无痕
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
```

**⑧ 经纬度 → 三维坐标：latLngAltToVector3()（对应 13.5.6，节选自 src/utils/satelliteMath.js）**

```js
<!-- src/utils/satelliteMath.js —— latLngAltToVector3() 完整推导注释 -->
// 经度方向必须与 three.js SphereGeometry 的贴图 UV 对齐，否则卫星会
// 整体绕地轴偏移、与大陆位置对不上：
// - equirectangular 地球贴图的经度 0°（格林威治）对应 +X 方向
// - 东经沿 -Z 方向增大、西经沿 +Z 方向（从北极上空俯视逆时针）
//
// 推导自 SphereGeometry 顶点公式（phiStart=0, phiLength=2π）：
//   x = -R·cos(u·2π)·sin(极角)，z = R·sin(u·2π)·sin(极角)
//   其中 u = (经度+180)/360，化简后即：
//   x = r·cos(纬度)·cos(经度)，z = -r·cos(纬度)·sin(经度)
export function latLngAltToVector3(lat, lng, alt, earthRadius, altitudeScale = 0.01) {
  const phi = (lat * Math.PI) / 180      // 纬度 → 弧度
  const theta = (lng * Math.PI) / 180    // 经度 → 弧度
  // 场景中的卫星距地心距离 = 地球半径 + 高度(缩放后)
  const r = earthRadius + alt * altitudeScale
  // 与地球贴图对齐：经度 0° 在 +X，东经向 -Z 递增
  const x = r * Math.cos(phi) * Math.cos(theta)
  const y = r * Math.sin(phi)
  const z = -r * Math.cos(phi) * Math.sin(theta)
  return { x, y, z }
}
```

这是球坐标转直角坐标的标准公式（y 轴为极轴），唯一需要注意的就是 z 取负号——对齐 SphereGeometry 的 UV 约定。验证方法很直观：北京（约 40°N, 116°E）代入应得到 y 正、z 负的向量（北纬 y 为正、东经落在 -Z 侧；116° 超过 90°，x 分量为负是正常现象），渲染后卫星恰好悬停在中国上空。

altitudeScale（高度缩放系数）是"教学取舍"参数：真实 ISS 轨道高 400km、地球半径 6371km，严格等比换算（5 × 400/6371）卫星距地表仅 0.31 个世界单位，几乎贴着地表看不清；适度放大缩放系数让轨道可视化更清晰。项目取 0.0012：400km → 地表上方 0.48 个世界单位（约为真实等比的 1.5 倍），既接近真实比例又清晰可辨。

## 13.6 卫星上球：数据流与 Sprite 渲染

### 13.6.1 卫星数据从哪来：TLE + SGP4 + satellite.js（衔接前序课程）

3D 场景只负责"画"，卫星的实时位置数据来自另一条链路（课程 05/06/07 已用 Python 讲过原理，此处只看 JS 落地）：

- TLE（Two-Line Element Set，两行轨道根数）：描述卫星轨道的标准文本格式，每颗卫星三行（名称 + 两行根数），由 Celestrak 等机构发布
- SGP4（Simplified General Perturbations 4，简化通用摄动模型）：根据 TLE 推算卫星任意时刻位置的数学模型
- satellite.js：浏览器端 SGP4 实现库（npm i satellite.js），项目用它把 TLE 解析为 satrec 对象并逐时刻推算

数据处理三件套：TLE 文本先经 satellite.twoline2satrec() 转成 satrec 轨道对象，再用 satellite.propagate() 做 SGP4 推算得到 ECI 惯性系位置（单位 km），最后经 gstime()（格林尼治恒星时）与 eciToGeodetic() 转成经纬高（弧度 + km，需 satellite.degreesLat 转度）。

项目把这条调用链封装在 `src/utils/satelliteMath.js` 中（代码见 13.6.6 ①）。

坐标转换链记忆：TLE →(SGP4)→ ECI 惯性系 →(gmst)→ 经纬高 →(13.5.6 公式)→ 三维场景坐标。前半段是航天领域知识，后半段才是 3D 知识——分界线就在 latLngAltToVector3。

数据管理层 useSatellite.js（组合式函数，第 4 天知识）负责定时刷新：每 2 秒对全部卫星执行一遍"转换三步"，整体替换 satellites 数组（shallowRef）。

数据从页面流到 3D 组件的路径：SatelliteView.vue 调用 useSatellite() 拿到卫星列表与选中状态 → computed 过滤并限量 300 颗（避免性能问题）→ template 里通过 props 传给 Globe3D，并监听其 select-satellite 事件接收"3D 场景点击卫星"的回传（完整代码见 13.6.6 ②③）。

Globe3D 作为子组件，数据全部由父组件经 props 传入。先交代 props 的来源——defineProps 是 `<script setup>` 的编译宏，无需 import，返回的 props 对象在 JS 与模板中都可用。

项目声明了 satellites / selectedNoradId / autoRotate / showOrbits / orbitPaths / neos 六个 props 与 select-satellite / select-neo 两个对外事件（声明代码见 13.6.6 ④）。

Globe3D 内部再用 watch 监听 props 变化驱动 3D 更新——这就是"Vue 声明式世界 → Three.js 命令式世界"的桥（监听代码见 13.6.6 ⑤）。

【注意】watch 卫星数组必须"传新引用、浅监听"：refreshPositions() 每 2 秒 map 生成新数组赋值给 shallowRef，引用变化自动触发 watch。若原地修改数组元素属性（不换引用），浅监听不触发；若加 deep 监听，几千颗卫星的位置写入会引发海量回调。**整体替换 + 浅监听**是大数据量 3D 同步的标准解。

**实战应用场景**：SGP4 是航天行业的通用标准（NORAD 制定、全球测控与商业航天沿用至今）：Starlink 追踪网站靠它渲染几千颗在轨卫星；空间态势感知公司（LEO Labs）用它做碰撞预警；业余无线电爱好者用它预报 ISS 过境时间完成通联；天文摄影 App 提醒"今晚 21:07 空间站过境可拍摄"背后也是同一模型。在浏览器端跑 SGP4（satellite.js）意味着**零后端成本**实现全球实时卫星视图，这正是本项目的架构亮点。

### 13.6.2 Sprite：永远面向相机的"广告牌"

卫星如果用 3D 盒子建模：156 颗卫星 × 若干面片，每帧还要算朝向；而且卫星实际尺寸相对地球极小，真按比例建模根本看不见。正确方案是 Sprite（精灵/公告板）：

- Sprite 是一张"永远正对相机"的平面贴图——无论怎么旋转地球，卫星图片始终以"正面照"朝向你
- 尺寸用 scale 直接控制（视觉大小），与真实几何比例解耦
- 一张透明 PNG 贴图 + 一个材质 = 可复制几百份的轻量对象

项目把这整套"贴图 + 双材质"的创建封装在 createSatelliteAssets() 中（完整代码见 13.6.6 ⑥）：全局唯一一张卫星贴图 satTexture + 两个共享材质（普通态 satMatNormal 用贴图原色、选中态 satMatSelected 加橙色染色）。

封装内还演示了三重设计——先用 Canvas 手绘贴图同步占位（卫星立即可见）；异步加载指定纹理 `src/assets/satellite-texture.png` 成功后整体替换、更新宽高比并补渲染一帧；回调里还防御了"组件已卸载才收到纹理"的迟到场景（直接释放）。

关于 `satelliteTextureUrl`（本课件的指定卫星纹理）再交代清楚路径问题：纹理源文件位于 **`E:\课件\my-app\src\assets\satellite-texture.png`**。Vue + Vite 项目中不能把绝对路径写进代码，而是通过 **静态资源 import** 让 Vite 处理：

```js
// Vue 组件中导入 src/assets 下的图片：import 语句返回"打包后的可访问 URL"
// 开发环境是 /src/assets/satellite-texture.png，构建后变成带 hash 指纹的 /assets/satellite-texture-a1b2c3.png
import satelliteTextureUrl from '@/assets/satellite-texture.png'
// '@/...' 是 Vite 项目的路径别名，等价于项目根下的 src/：
// import satelliteTextureUrl from '/src/assets/satellite-texture.png'
```

脱离 Vite 的纯 HTML 环境无法走 import 打包，改用 **importmap + 相对路径**：把该 PNG 复制到 HTML 同目录的 `textures/` 子文件夹，代码里写 `'./textures/satellite-texture.png'`（importmap 机制见 13.3.2.1 知识拓展）。

本课件示例均为 Vue 3 组件，统一走 `import satelliteTextureUrl from '@/assets/satellite-texture.png'`。

三个生产级设计模式值得背下来：

1. **共享材质**：156 颗卫星只有 1 张纹理、2 个材质实例（普通/选中）。若每颗卫星 new 一个材质，显存与切换开销放大 156 倍。所有卫星 Sprite 共用 satMatNormal，选中的那颗换成 satMatSelected——改材质引用即可，零拷贝
2. **同步占位 + 异步升级**：先用 Canvas 手绘贴图立即渲染（页面不空白），异步加载 NASA 真实渲染图，到位后替换。用户感知是"先有卫星，后变清晰"，永远不空白
3. **迟到回调防御**：异步加载完成时组件可能已卸载（路由切走），回调里检查 renderer 是否为 null，是则直接 dispose 迟到的纹理——防止显存泄漏与"向已销毁场景挂对象"

顺带认识 SpriteMaterial：Sprite 专用的材质类，属性（map / color / transparent / depthWrite）与前面学的材质一致，区别是它不响应光照、且始终让贴图正对相机——正是"公告板"行为的载体。

createSatelliteAssets() 里为真实纹理显式补写的两行 minFilter / generateMipmaps 涉及贴图的另一个核心概念——**mipmap（多级渐远纹理）**：GPU 为贴图自动预生成一套逐级减半的缩小版（256→128→64→…），物体在屏幕上越小（越远），就采样越小的版本，避免"远处的高频纹理闪烁成噪点"。

minFilter 决定缩小时怎么选版本：LinearMipmapLinearFilter（三线性过滤）在相邻 mipmap 级别之间再做线性插值，是最平滑的档位；magFilter（放大过滤）则管贴图被拉大时的采样，本项目未改动。

两个默认值为什么还要显式写？——这是防御式声明：显式写出既自文档化，也防止 CanvasTexture 等特殊来源的默认配置差异导致远处闪烁。

**depthWrite: false 详解**（前面埋的伏笔）：GPU 渲染半透明物体时，深度缓冲（记录"这个像素离相机多远"）决定遮挡关系。半透明贴图的透明边缘像素也会写深度，导致其后方物体的边缘像素被错误剔除，画面出现闪烁（z-fighting）。规则：**半透明物体（transparent: true）一律 depthWrite: false**，让混合（blending）而非深度测试决定叠加结果。项目云层、卫星、光晕全部遵循此规则。

**实战应用场景**：公告板是游戏史上的经典优化：GTA 系列的远景树木就是"面片贴图 + 永远朝向相机"；MMO 游戏的血条、伤害飘字是 UI 公告板；地图产品的 POI 兴趣点标记（高德/Google Earth 的图钉）本质也是"永远朝向用户的贴图精灵"。判断标准很实用：**凡是"3D 场景里的 2D 信息"，首选 Sprite**——一张贴图一个面片，比建模省几个数量级的资源。

### 13.6.3 面积守恒缩放：换贴图不变大小

Sprite 的 scale.set(w, h, 1) 决定它在屏幕上的大小。问题：手绘贴图宽高比 2.0，真实 Fermi 贴图 3.97（双翼全展），若 scale 定值不变，换图后卫星忽大忽小。项目的"面积守恒"换算封装为 satBaseSize() 函数（代码见 13.6.6 ⑦）：以 SAT_AREA = 0.42 为 Sprite 视觉面积基准（宽×高），satAspect 记录当前贴图宽高比（初始 2.0，换真实贴图后更新），函数按当前宽高比反解出基础高与宽。

数学原理：面积 = 宽 × 高 = (h × aspect) × h = h² × aspect。固定面积、已知新宽高比，解出 h = √(面积 / aspect)。任何宽高比的贴图换上来，卫星在屏幕上的"占据面积"不变，观感稳定。

选中态在此基础上放大 1.8 倍（模块级常量 SAT_SELECTED_K = 1.8）并切换橙色材质——scale 与 material 同时换。这段逻辑写在 updateSatellites() 的选中分支里，用 `?? 空值合并`（左侧为 null/undefined 时取右侧）兜住未选中状态（代码见 13.6.6 ⑧）。

### 13.6.4 Map 增量同步：updateSatellites 的"diff 更新"

每 2 秒卫星数组整体替换一次，如何高效同步到 3D 场景？最笨的做法：全删再全建（156 个对象反复创建销毁，GC 压力大）。

项目的解法是 Map 增量同步（前端"列表 diff"思想在 3D 的翻版，完整代码见 13.6.6 ⑨）：以 satelliteMeshes（Map<noradId, Sprite>）为反查表，四步走——

- ① 遍历新数组逐颗查 Map 找旧 Sprite
- ② Map 里没有的新建 Sprite 并入 satelliteGroup、登记进 Map
- ③ 在场的卫星只更新位置（latLngAltToVector3 换算 + position.copy 复用对象零分配）、材质与缩放
- ④ 遍历 Map，把本轮没出现的卫星从场景移除并删除登记

代码里的两个 ES6 集合先说清楚：**Map** 是键值对集合（键可以是任意类型，不像普通对象只认字符串键），get / set / delete / has 按键读写、size 是元素个数；for...of 直接迭代 Map 每次产出一组 [键, 值]，values() / keys() 则只迭代值 / 键。

**Set** 是值唯一的集合，add 添加、has 判断是否存在。本项目 satelliteMeshes 用 Map 建立"noradId → Sprite"反查表，seen 用 Set 记录本轮在场的卫星 ID。

四步：查 Map → 新建缺失 → 更新在场 → 删除消失。核心收益：**渲染循环内零卫星开销**——卫星位置只在数组替换瞬间（每 2 秒）更新一次，animate() 里没有任何逐卫星操作。低轨卫星 7.5km/s 的速度下 2 秒位移清晰可见，实时感足够，而 156 颗卫星 × 每帧重算的 CPU 成本被完全省掉。

**实战应用场景**："外部数据源驱动渲染、帧内只做 diff"是实时可视化的通用架构：股票行情 3D 大屏（几千支标的推流更新）、IoT 数字孪生（海量传感器状态同步）、多人在线游戏的状态同步（增量 diff 省带宽）全是同一模式。React 的 Virtual DOM diff、Vue 的响应式调度，思想同源——**把"检测变化"与"渲染"解耦，变化之外的帧零开销**。

### 13.6.5 轨道线：BufferGeometry + Line

选中卫星后显示其未来一个周期的轨道。Three.js 画线 = 顶点数组 + LineBasicMaterial，项目封装为 createOrbitLine(path, color) 函数（完整代码见 13.6.6 ⑩）：

轨道路径点逐个经 latLngAltToVector3 换算成普通坐标对象，再包成 THREE.Vector3 → BufferGeometry().setFromPoints(points) 收进顶点缓冲 → 配 LineBasicMaterial（transparent + opacity 0.5 半透明，不喧宾夺主）→ 返回 THREE.Line；路径点不足 2 个直接返回 null 不画线。

- Vector3：Three.js 的三维向量类，构造参数 (x, y, z)。它是坐标、位移、缩放的底层数据类型——相机 position、Sprite 的 scale 内部都是 Vector3
- BufferGeometry：Three.js 的几何体底层格式——顶点数据存在一维 TypedArray（如 Float32Array）缓冲区里，直接供 GPU 读取。setFromPoints(points) 是便捷方法：把 Vector3 数组转成 position 缓冲
- THREE.Line：把 position 缓冲中的点依次连线（不会闭合；想要闭合曲线需首尾同点）
- LineBasicMaterial：线的基础材质，宽度固定 1px（WebGL 限制，线宽设置无效是历史遗留问题，需要粗线得用 Line2 或面片模拟）

轨道路径点由 getOrbitPath(satrec, 180) 生成：未来一个轨道周期均匀采样 180 个时刻，逐时刻 SGP4 推算经纬高（satelliteMath.js）。选中态的轨道换成橙色且透明度提高到 0.9。

**实战应用场景**：历史轨迹与预测路径线是位置类可视化的标配：卫星过境弧线（n2yo 的轨道预测）、台风路径概率扇形（气象台标准产品）、航班航迹回放、外卖/网约车的实时路线展示；工业领域还有机器人行走路径、AGV 小车调度路线的 3D 呈现。BufferGeometry + Line 是其中最轻量的实现——一次提交、一次绘制。

**✦ 示例 04（Vue 3 版）：指定纹理的卫星绕轨飞行（Sprite + Group 轨道 + 轨道线）**（保存为 `my-app/src/components/ch13/04-SatelliteOrbit.vue`）。8 颗卫星沿不同倾角的轨道环绕地球，每条轨道带轨迹线；卫星直接使用指定纹理 `src/assets/satellite-texture.png`：

```vue
<!-- src/components/ch13/04-SatelliteOrbit.vue —— 示例 04：卫星 Sprite 与轨道运动 -->
<template>
  <div ref="containerRef" class="scene-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
// ★ 指定卫星纹理：Vite 下用 import 引入静态资源，构建时自动做指纹化打包（比手写 URL 更可靠）
//   若工程未配置 '@' 别名，把 '@/assets/...' 改成相对路径 '../assets/satellite-texture.png' 即可
import satelliteTextureUrl from '@/assets/satellite-texture.png'

const containerRef = ref(null)

let scene, camera, renderer, controls, satMat
let animationId = null
const clock = new THREE.Clock()
const sats = []                       // { sat, sprite } 列表：渲染循环按它推进位置

function initScene() {
  const container = containerRef.value

  // —— 三大基石 + 控制器 + 光照（前三个示例已详述，此处压缩）——
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000010)
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 2000)
  camera.position.set(0, 4, 16)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.0)
  sunLight.position.set(10, 5, 10)
  scene.add(sunLight)

  // —— 地球：纯色 Phong 球（本例聚焦卫星，贴图版地球见示例 03/06）——
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(5, 64, 64),
    new THREE.MeshPhongMaterial({ color: 0x1a4d8f, shininess: 10 })
  ))

  // —— 卫星贴图：同步 Canvas 占位 + 异步升级为指定纹理（13.6.2 模式）——
  function createFallbackSatTexture() {          // 加载失败时的兜底：暖金光点
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const ctx = canvas.getContext('2d')
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30)
    g.addColorStop(0, 'rgba(255,225,160,1)')
    g.addColorStop(1, 'rgba(255,200,110,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }

  satMat = new THREE.SpriteMaterial({            // 共享材质：8 颗卫星共用 1 个实例（省内存+统一换装）
    map: createFallbackSatTexture(),
    transparent: true,
    depthWrite: false,                           // 半透明贴图不写深度（13.6.2 详解）
  })
  // 异步升级为指定卫星纹理（先声明函数、再调用，代码顺序与执行顺序一致，便于阅读）
  function textureLoaderUpgrade() {
    new THREE.TextureLoader().load(
      satelliteTextureUrl,                       // ★ import 进来的指定卫星纹理 URL（Vite 处理后的可访问地址）
      (tex) => {                                 // 成功：整体替换贴图，所有卫星同步换装
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
        satMat.map = tex
        satMat.needsUpdate = true                // 材质换图必须手动通知
        console.log('指定卫星纹理加载成功')
      },
      undefined,
      () => console.warn('指定卫星纹理加载失败，保持 Canvas 光点兜底（检查 src/assets/ 路径）')
    )
  }
  textureLoaderUpgrade()

  // —— 轨道系统：每颗卫星一个"倾斜 Group"（13.4.2 分层 + 13.6.5 轨道线）——
  // 思路：Group 先绕 X 轴倾斜（轨道倾角），卫星在 Group 本地的 XZ 平面做圆周运动，
  // 轨道线也画在同一 Group 里 → 卫星、轨道、倾角三者天然对齐
  const SATELLITES = Array.from({ length: 8 }, (_, i) => ({
    name: `SAT-${String(i + 1).padStart(2, '0')}`,  // 卫星名（userData 里要挂载）
    incl: (i / 8) * Math.PI,                   // 轨道倾角：0 ~ π 均匀分布（含极轨）
    radius: 6.2 + i * 0.35,                    // 轨道半径：距地心 6.2~8.65
    phase: Math.random() * Math.PI * 2,        // 初始相位随机散布
    speed: 0.3 + Math.random() * 0.25,         // 角速度（弧度/秒）
  }))
  SATELLITES.forEach((sat) => {
    const orbitGroup = new THREE.Group()
    orbitGroup.rotation.x = sat.incl           // 倾斜轨道面
    scene.add(orbitGroup)

    // 卫星 Sprite：scale 直接决定视觉大小（13.6.2）
    const sprite = new THREE.Sprite(satMat)
    sprite.scale.set(0.55, 0.55, 1)
    sprite.userData.name = sat.name            // userData：自定义数据挂载点（示例 05 拾取时用）
    orbitGroup.add(sprite)

    // 轨道线：128 个圆周点 → BufferGeometry → LineLoop（13.6.5）
    const points = []
    for (let i = 0; i <= 128; i++) {
      const t = (i / 128) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(t) * sat.radius, 0, Math.sin(t) * sat.radius))
    }
    const line = new THREE.LineLoop(           // LineLoop = 首尾闭合的 Line
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.35 })
    )
    orbitGroup.add(line)
    sats.push({ sat, sprite })
  })

  window.addEventListener('resize', onResize)
}

// —— 渲染循环：卫星在各自轨道平面推进 ——
function animate() {
  animationId = requestAnimationFrame(animate)
  const dt = clock.getDelta()
  const elapsed = clock.elapsedTime            // 先 getDelta 再读 elapsedTime，避免滞后一帧
  sats.forEach(({ sat, sprite }) => {
    const theta = sat.phase + elapsed * sat.speed   // 当前相位 = 初相 + 时间×角速度
    sprite.position.set(                    // 在 Group 本地 XZ 平面做圆周运动
      Math.cos(theta) * sat.radius,
      0,
      Math.sin(theta) * sat.radius
    )
  })
  controls.update()
  renderer.render(scene, camera)
}

function onResize() {
  const container = containerRef.value
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}

onMounted(() => {
  initScene()
  animate()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(animationId)
  controls.dispose()
  // 释放共享卫星材质及两张贴图（Canvas 占位 + 可能已换上的指定纹理）
  if (satMat.map) satMat.map.dispose()
  satMat.dispose()
  scene.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose()
    if (obj.material && obj.material !== satMat) obj.material.dispose()
  })
  renderer.dispose()
  renderer.domElement.remove()
})
</script>

<style scoped>
.scene-container { width: 100%; height: 100vh; overflow: hidden; }
</style>
```

**示例 04 新写法速览：本例首次出现的五个写法**

Sprite、SpriteMaterial、共享材质、同步占位 + 异步升级、轨道线三件套 13.6.2 ~ 13.6.5 已系统讲过，下面只解释"此前课件从未出现"的写法：

- **倾斜 Group 轨道面：`orbitGroup.rotation.x = sat.incl`（本例核心几何思想）**。思路分两层：① 每颗卫星一个 Group，先把**整个 Group 绕 X 轴旋转**一个倾角（`incl` 从 0 到 π 均匀分布——0 是贴着赤道的轨道，π/2 是掠过南北极的"极轨"，π 是反向赤道轨）；② 卫星 Sprite 和轨道线都放进这个 Group，卫星只在 Group 的**本地 XZ 平面**上做圆周运动。好处是天然对齐：卫星永远在自己那条轨道线上飞，倾角只调 Group 一个属性。这是"父级变换 + 子级本地运动"组合的经典应用（13.4.2 场景图思想的进阶用法）。
- **圆周运动参数方程：`theta = sat.phase + elapsed * sat.speed`，`position.set(cos(theta) * radius, 0, sin(theta) * radius)`**。圆周运动的通用公式：**当前相位 = 初相 + 时间 × 角速度**（`phase` 让 8 颗卫星随机散布在轨道各处，`speed` 单位是弧度/秒），位置用 cos/sin 把角度换算成 XZ 平面坐标——θ 从 0 转到 2π，卫星正好绕一圈。`clock.elapsedTime` 是 Clock 的**累计运行秒数**（此前只用过 getDelta 取帧间隔）；注意注释里的顺序要求：**先 getDelta 再读 elapsedTime**——getDelta 内部会更新时间戳，顺序反了 elapsedTime 会滞后一帧。
- **`sprite.userData.name = sat.name` —— 自定义数据挂载点**。`userData` 是所有 3D 对象（Object3D）自带的空对象，专门用来挂业务数据（卫星名、编号、血条……），Three.js 不会碰它。本例给每颗卫星挂名字，示例 05 拾取时从命中的 Sprite 反查 `userData.name` 就能"报出名字"——这是 3D 拾取联动业务数据的标准手法。
- **`new THREE.LineLoop(geometry, material)` —— 首尾闭合的线**。13.6.5 说过 THREE.Line "不会闭合，想闭合需首尾同点"——LineLoop 就是官方给出的闭合版：首尾**自动相连**成环，不用手动补点，128 个点从 0 走到 2π 正好闭合成轨道圈。
- **`Array.from({ length: 8 }, (_, i) => ({ ... }))` —— 快速生成参数数组（JS 语法）**。`Array.from` 第一参数传 `{ length: 8 }` 造出 8 个空位，第二参数是映射函数（`_` 是"这个参数我用不到"的命名惯例，`i` 是索引），返回 8 个卫星配置对象。配套的 `String(i + 1).padStart(2, '0')` 把 1 补成 "01"（宽度不足时在**开头**填 '0'），得到 SAT-01 ~ SAT-08。另外注意 onBeforeUnmount 里 `obj.material !== satMat` 的排除判断：共享材质已单独释放，traverse 再遇到它时跳过，避免重复释放。

运行验收：蓝色地球周围 8 条不同倾角的绿色轨道线，8 颗卫星（正常显示为指定纹理图案，加载失败则为金色光点）沿轨道连续绕飞；倾角最大的轨道从南北极上空掠过。此例的"倾斜 Group"是把 13.9 教学版"经纬度摆动法"换成了几何上更直观的轨道面旋转法，两种写法等价，对比学习。

### 13.6.6 真实代码对照：项目中的数据流与 Sprite 实现

知识点讲完、示例 04 敲完，最后看真实项目是怎么写这几块的。

以下十段代码节选自本项目真实文件——① 节选自工具模块 `src/utils/satelliteMath.js`，②③ 节选自页面组件 `src/views/SatelliteView.vue`（卫星数据页），④~⑩ 节选自 `src/components/Globe3D.vue`，注释完整保留，可逐行与示例 04 对照。教学版用 8 颗假想卫星演示轨道几何，真实版由 satellite.js 实时数据驱动，工程手段更完整：

**① 卫星数据处理三件套：TLE → SGP4 → 经纬高（对应 13.6.1，节选自 src/utils/satelliteMath.js）**

```js
<!-- src/utils/satelliteMath.js —— 核心调用链 -->
import * as satellite from 'satellite.js'

// ① TLE 文本 → satrec 轨道对象（twoline2satrec = 两行根数转 satrec）
const satrec = satellite.twoline2satrec(line1, line2)

// ② SGP4 推算某一时刻的位置（ECI 地心惯性坐标，单位 km/km/s）
const positionAndVelocity = satellite.propagate(satrec, date)

// ③ ECI → 地理坐标（经度、纬度、高度）：需要格林尼治恒星时 gmst 做坐标转换
const positionEci = positionAndVelocity.position   // ECI 位置向量（单位 km）
const gmst = satellite.gstime(date)
const positionGd = satellite.eciToGeodetic(positionEci, gmst)
// positionGd: { longitude, latitude, height }（弧度 + km，需 satellite.degreesLat 转度）
```

**② 数据到 3D 的传递：SatelliteView.vue 的 JS 侧（对应 13.6.1）**

```js
<!-- src/views/SatelliteView.vue —— 数据到 3D 的传递 -->
// useSatellite()：数据层组合式函数（返回卫星列表与选中状态，第 4 天知识）
const { satellites, selectedSatellite, selectSatellite } = useSatellite()

// filteredSatellites：按搜索/筛选条件过滤后的卫星 computed 列表
// 传给 3D 地球的卫星（限制数量 300，避免性能问题）
const displayedSatellites = computed(() => filteredSatellites.value.slice(0, 300))
```

**③ 数据到 3D 的传递：SatelliteView.vue 的 template 侧（对应 13.6.1）**

```html
<!-- src/views/SatelliteView.vue —— template 中 -->
<Globe3D
  :satellites="displayedSatellites"      <!-- 卫星数组（每 2 秒整体替换） -->
  :selected-norad-id="selectedNoradId"   <!-- 选中卫星 ID -->
  :orbit-paths="selectedOrbitPath"       <!-- 选中卫星的轨道路径点 -->
  @select-satellite="handleSelectSatellite"  <!-- 3D 场景点击卫星回传 -->
/>
```

**④ Globe3D 的 props / emits 声明（对应 13.6.1）**

```js
<!-- src/components/Globe3D.vue —— props / emits 声明（源码节选） -->
const props = defineProps({
  satellites: { type: Array, default: () => [] },             // 卫星数组（父组件每 2 秒刷新）
  selectedNoradId: { type: [String, Number], default: null }, // 当前选中卫星
  autoRotate: { type: Boolean, default: false },              // 自动旋转开关
  showOrbits: { type: Boolean, default: true },               // 是否显示轨道线
  orbitPaths: { type: Object, default: () => ({}) },          // 轨道路径数据
  neos: { type: Array, default: () => [] },                   // 近地天体数组（13.7.4）
})
const emit = defineEmits(['select-satellite', 'select-neo'])  // 对外事件声明
```

**⑤ props 监听：声明式 → 命令式的桥（对应 13.6.1）**

```js
<!-- src/components/Globe3D.vue —— props 监听 -->
// 使用浅监听（不加 deep），父组件传入新数组引用时即可触发更新
watch(() => props.satellites, updateSatellites)
watch(() => props.selectedNoradId, () => {
  updateSatellites()
  updateOrbits()
})
```

**⑥ 卫星共享资源：createSatelliteAssets()（对应 13.6.2）**

```js
<!-- src/components/Globe3D.vue —— createSatelliteAssets() 共享资源部分 -->
let satTexture = null        // 卫星贴图（全局唯一）
let satMatNormal = null      // 普通态共享材质（贴图原色）
let satMatSelected = null    // 选中态共享材质（橙色染色）

function createSatelliteAssets() {
  // —— 同步占位：先用手绘 Canvas 贴图，卫星立即可见 ——
  // createSatelliteTexture()：Canvas 手绘卫星贴图（原理同 13.5.5，返回 CanvasTexture）
  satTexture = createSatelliteTexture()
  satMatNormal = new THREE.SpriteMaterial({
    map: satTexture,
    transparent: true,
    depthWrite: false,   // 半透明贴图不写深度，避免与地球大气边缘叠加闪烁
  })
  satMatSelected = new THREE.SpriteMaterial({
    map: satTexture,
    color: 0xffa030,     // 选中橙染（与轨道线高亮色一致）
    transparent: true,
    depthWrite: false,
  })

  // —— 异步升级：加载 NASA SVS 官方 Fermi 卫星渲染图，成功后整体替换 ——
  // satelliteTextureUrl：src/assets/satellite-texture.png 经 import 导入的打包 URL（Vite 静态资源导入）
  textureLoader.load(
    satelliteTextureUrl,
    (realTex) => {
      if (!renderer) { realTex.dispose(); return }   // 组件已卸载：直接释放
      realTex.colorSpace = THREE.SRGBColorSpace
      realTex.anisotropy = maxAniso
      realTex.minFilter = THREE.LinearMipmapLinearFilter  // 缩小过滤：mipmap 三线性（默认值）
      realTex.generateMipmaps = true                      // 生成 mipmap 金字塔（默认 true）
      const oldTex = satTexture         // 先记住旧手绘纹理（材质还引用着它）
      satMatNormal.map = realTex        // 两个材质同步换图
      satMatSelected.map = realTex
      satMatNormal.needsUpdate = true
      satMatSelected.needsUpdate = true
      oldTex.dispose()                  // 换图完成后再释放旧手绘纹理的显存
      satAspect = realTex.image.width / realTex.image.height  // 更新贴图宽高比（13.6.3）
      refreshSatelliteScales()          // 按新宽高比重算所有 Sprite 尺寸（面积守恒）
      renderer.render(scene, camera)    // 纹理更换后立即补渲染一帧
    },
    undefined,
    () => console.warn('[Globe3D] 真实卫星贴图加载失败，已保持手绘贴图')
  )
}
```

**⑦ 面积守恒缩放：satBaseSize()（对应 13.6.3）**

```js
<!-- src/components/Globe3D.vue —— 面积守恒缩放 -->
const SAT_AREA = 0.42          // Sprite 视觉面积基准（宽×高）
let satAspect = 2.0            // 当前贴图宽高比 w/h

/** 由当前 satAspect 计算基础高/宽（面积恒定 → 换贴图不突变大小） */
function satBaseSize() {
  const h = Math.sqrt(SAT_AREA / satAspect)   // h² × aspect = AREA → h = √(AREA/aspect)
  return { w: h * satAspect, h }
}
```

**⑧ 选中态缩放与材质切换（对应 13.6.3，位于 updateSatellites() 内）**

```js
<!-- src/components/Globe3D.vue —— updateSatellites() 中选中态 -->
// base：面积守恒基准尺寸（上文 satBaseSize() 的返回值）
const base = satBaseSize()
// ?? 空值合并：左侧为 null/undefined 时取右侧（props.selectedNoradId 可能为空）
const isSelected = id === String(props.selectedNoradId ?? '')
sprite.material = isSelected ? satMatSelected : satMatNormal
const k = isSelected ? SAT_SELECTED_K : 1     // SAT_SELECTED_K = 1.8
sprite.scale.set(base.w * k, base.h * k, 1)
```

**⑨ Map 增量同步：updateSatellites() 完整代码（对应 13.6.4）**

```js
<!-- src/components/Globe3D.vue —— updateSatellites() 完整代码 -->
function updateSatellites() {
  if (!satelliteGroup || !satMatNormal) return

  const base = satBaseSize()
  const seen = new Set()                       // 本轮出现过的卫星 ID
  props.satellites.forEach((sat) => {
    if (!sat.position) return
    const id = String(sat.noradId)
    seen.add(id)
    // 经纬高 → 3D 坐标（13.5.6 的公式）
    // EARTH_RADIUS=5、ALT_SCALE=0.0012：模块级常量（见 13.5.1、13.5.6）
    const v = latLngAltToVector3(
      sat.position.latitude, sat.position.longitude, sat.position.height,
      EARTH_RADIUS, ALT_SCALE
    )
    const isSelected = id === String(props.selectedNoradId ?? '')
    let sprite = satelliteMeshes.get(id)       // ① Map 里找旧 Sprite
    if (!sprite) {                             // ② 新卫星：创建并入组
      sprite = new THREE.Sprite(satMatNormal)
      satelliteGroup.add(sprite)
      satelliteMeshes.set(id, sprite)          // satelliteMeshes: Map<noradId, Sprite>
    }
    sprite.position.copy(v)                    // ③ 只更新位置/材质/缩放（copy：把 v 的 xyz 复制进 position，复用对象零分配）
    sprite.material = isSelected ? satMatSelected : satMatNormal
    const k = isSelected ? SAT_SELECTED_K : 1
    sprite.scale.set(base.w * k, base.h * k, 1)
  })

  // ④ 移除已消失的卫星（材质/贴图为共享资源，不在此释放）
  for (const [id, sprite] of satelliteMeshes) {
    if (!seen.has(id)) {
      satelliteGroup.remove(sprite)
      satelliteMeshes.delete(id)
    }
  }
}
```

**⑩ 轨道线：createOrbitLine()（对应 13.6.5）**

```js
<!-- src/components/Globe3D.vue —— createOrbitLine() -->
/** 根据轨道路径点绘制轨道线 */
function createOrbitLine(path, color = 0x00ff88) {
  if (!path || path.length < 2) return null
  const points = path.map((p) => {
    const v = latLngAltToVector3(p.latitude, p.longitude, p.height, EARTH_RADIUS, ALT_SCALE)
    return new THREE.Vector3(v.x, v.y, v.z)     // 普通对象 → THREE.Vector3
  })
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5,          // 半透明：不喧宾夺主
  })
  return new THREE.Line(geometry, material)
}
```

## 13.7 交互与视觉增强

### 13.7.1 Raycaster：点击拾取卫星

"点击卫星查看详情"的实现核心是 Raycaster（射线检测器）：从相机位置向鼠标点击方向发射一条射线，检测它与哪些 3D 物体相交。

项目把整套拾取逻辑封装在 onCanvasClick(event) 函数中（完整代码见 13.7.5 ①），四步流程：

- ① 把鼠标位置换算成 NDC（Normalized Device Coordinates，归一化设备坐标）——x/y 归一到 [-1, 1]，原点在画布中心、y 轴向上（与像素坐标相反）
- ② raycaster.setFromCamera(mouse, camera) 由"相机 + NDC 点"确定射线
- ③ 卫星优先拾取——只对 satelliteGroup.children 调 intersectObjects
- ④ 命中后遍历 satelliteMeshes 反查 noradId，emit('select-satellite', id) 上抛给父组件

raycaster 与 mouse 都是模块级变量（初始化时创建一次，避免每次点击 new；mouse 是复用的 THREE.Vector2 NDC 坐标容器）。

要点拆解：

- NDC 换算公式必须背：鼠标像素坐标 → 减去画布偏移 → 除以画布尺寸（得到 0~1）→ 乘 2 减 1（得到 -1~1）；y 轴因屏幕向下、NDC 向上，需取负。这个公式所有 3D 库通用
- intersectObjects(objects, recursive)：返回按距离排序的命中数组 [{ object, point, distance }, ...]，取 [0] 即最近命中。recursive 为 true 时递归检测子节点，Sprite 无子节点故 false
- Sprite 的射线热区就是它的"显示四边形"——选中态放大 1.8 倍后热区同步放大，点击手感一致
- 点击事件的绑定位置：renderer.domElement.addEventListener('click', onCanvasClick)（画布上），卸载时对称解绑

事件上抛后由 Vue 接管：SatelliteView 的 handleSelectSatellite 更新 selectedNoradId → props 变化 → watch 触发 updateSatellites 高亮选中卫星。**3D 世界把"点了谁"翻译成事件抛出，后续全部回到熟悉的 Vue 数据流**——这是 3D 组件设计的黄金边界。

**实战应用场景**：3D 拾取是"展示走向交互"的分水岭：智慧园区点击楼宇弹出楼栋信息卡、3D 商品点击部件查看详情（宜家家具的零件爆炸图）、游戏中点击地面寻路、捏脸系统点击身体部位编辑、医学 3D 解剖点击器官高亮——所有"3D 版 onClick"需求，答案都是射线拾取。WebGIS（Cesium）的"点选地形取坐标"同样是 Raycaster 思想。

### 13.7.2 星空粒子：BufferGeometry + Points

3000 颗星星如果用 3000 个 Sprite 就是 3000 次绘制调用；Points 粒子系统把所有粒子装进一个 BufferGeometry，一次调用画完全部——这是 3D 性能优化的经典范式。

项目的 createStars()（完整代码见 13.7.5 ②）三步走：先在 Float32Array 里准备 3000 颗星的位置与颜色缓冲（球面均匀分布：半径 200~400 的球壳上随机取点；颜色白色偏蓝或偏黄随机微调）→ setAttribute 挂上 position / color 两个通道 → 配 PointsMaterial（size 0.8、vertexColors: true、opacity 0.9、sizeAttenuation 近大远小）返回 THREE.Points。

关键知识点：

- Float32Array：32 位浮点 TypedArray，GPU 缓冲的标准载体。3000 颗星的位置 = 9000 个浮点数排成一维数组，每 3 个为一组
- setAttribute('position', BufferAttribute)：把 TypedArray 挂到几何体的 position 通道。第二个参数 3 表示"每 3 个数值描述一个顶点"
- 均匀球面分布的技巧：极角 phi 用 acos(2×random−1) 而非 random×π，否则星星向两极聚集（球面面积微分的数学问题，可课后推导）
- PointsMaterial 的 size 单位是世界单位（sizeAttenuation: true 时），随距离衰减

**实战应用场景**：Points 是"十万个点也要流畅"的答案：游戏粒子特效（雨雪/烟花/刀光）、激光雷达点云回放（自动驾驶研发的日常工具）、分子可视化（PyMOL 网页版 3Dmol.js）、数字孪生的城市级夜景灯光。核心优势：**所有点打包成一个对象、一次 draw call 画完**，十万级点位仍能保持 60fps——逐个 new Mesh 则会直接卡死。

### 13.7.3 ShaderMaterial：自定义着色器实现大气辉光

材质不够用时，Three.js 允许直接写 GLSL 着色器（Shader，运行在 GPU 上的小程序）。先明确两个着色器阶段：

- 顶点着色器（Vertex Shader）：对每个顶点执行一次，负责把 3D 坐标变换到屏幕坐标，可向片元阶段传值
- 片元着色器（Fragment Shader）：对每个像素执行一次，决定该像素的最终颜色

地球的大气辉光——边缘泛蓝光、中心透明——用内置材质做不出来，项目用 26 行 GLSL 实现（createAtmosphere() 完整代码见 13.7.5 ③）：半径 1.15 倍地球的球壳配 ShaderMaterial。

uniform 传入辉光颜色 0x4a90d9；顶点着色器用 normalMatrix 把法线变换到相机坐标系存入 varying 变量、做经典 MVP 变换；片元着色器按"法线与视线方向的点积"计算边缘强度 pow(0.7 - dot(vNormal, vec3(0,0,1)), 2.0)，配 AdditiveBlending 加色混合 + BackSide 渲染内壁 + transparent。

菲涅尔效应（Fresnel）是这段代码的灵魂：视线垂直于表面时反射弱、平行掠过表面时反射强——所以地球边缘（视线掠射）亮、中心暗。实现只需一个点积：法线与视线方向 dot，边缘处点积趋近 0，(0.7 − dot)² 放大差异。

两个必须理解的配置：

- side: THREE.BackSide：只渲染球面"背面"（内壁）。大气壳比地球大 15%，如果渲染外壁，正面看去辉光圈被地球本体挡住；渲染内壁时辉光从地球轮廓外圈"溢出"，形成薄薄的大气层光晕
- blending: THREE.AdditiveBlending：加色混合——像素颜色与背景颜色相加（而非覆盖），红+绿=黄、叠加处更亮，是"发光感"的标准混合模式。默认的 NormalBlending 是普通 alpha 覆盖

GLSL 语法与 JS 的差异速记：变量类型声明在前（vec3 表示三维向量、float 浮点、mat4 4×4 矩阵）；矩阵×向量直接用 *；每个着色器必须有 main() 函数；gl_Position 与 gl_FragColor 是内置输出变量。vec4(position, 1.0) 里的 1.0 是齐次坐标的 w 分量——4×4 矩阵乘法需要四维向量：w=1 表示"点"（受平移影响），w=0 表示"方向"（只受旋转/缩放影响），这是图形学的基本约定。

【注意】着色器代码是字符串，写错没有 JS 报错，只在控制台输出 GLSL 编译错误（容易看不懂）。调试技巧：先改一个很小的东西（比如把 0.6 改成 1.0）验证管线通，再逐步写复杂逻辑；uniform 名字拼错不会报 JS 错，只是着色器里拿到 0 值。

拓展视野：本项目用"菲涅尔壳"实现大气辉光，是零依赖的低成本方案；Three.js 官方还有一条通用发光路线——后期处理 Bloom（three/addons 的 EffectComposer + UnrealBloomPass：整个画面渲染到离屏缓冲，按亮度阈值提取高亮区域，模糊后叠加回主画面）。优点是任何物体都能发光（不用逐个写壳），代价是每帧多一遍全屏处理，移动端需谨慎。知道这条路线的存在，遇到"整场景泛光"需求时再深入即可。

**实战应用场景**：菲涅尔远不止做大气——它是游戏渲染的高频词：卡通渲染的描边/边缘光（《原神》《塞尔达》的 toon 风格 Rim light）、水面反射（视角越平反射越强，符合真实物理）、全息投影风格 UI（科幻电影 HUD 的发光边缘）；3D 编辑器"选中物体的高亮轮廓"也常用它。掌握顶点/片元两段式编程，就从"调参用户"进阶为"效果作者"——这是中高级 3D 岗位面试的常见考点。

### 13.7.4 AdditiveBlending 实战：危险天体红晕与呼吸警示

大气辉光的加色混合同样适用于"发光"类效果。近地天体中的潜在危险小行星（PHA）需要红色警示光晕——在危险天体位置再叠一层加色混合的 Sprite。

项目分"资源 + 动画"两部分（完整代码见 13.7.5 ④）：资源部分用 13.5.5 的径向渐变红晕 CanvasTexture 配共享材质 neoGlowMat（transparent + depthWrite: false + AdditiveBlending 加色混合，opacity 0.55 作呼吸基准）。

动画部分在 animate() 里累计 neoPulseT 时间（dt 时间增量），取正弦波 pulse = sin(neoPulseT × 2.7)（周期约 2.3 秒）同时驱动三处：危险本体材质透明度 0.74 ± 0.26 脉动、光晕透明度 0.55 ± 0.35 同相位呼吸、光晕尺寸 ±14% 微缩放（基础尺寸提前存在 glow.userData 的 baseW/baseH 上）。

设计精髓在于"共享"：改一个共享材质的 opacity，全部危险天体同步呼吸——无论 3 颗还是 30 颗，动画成本恒定。正弦呼吸公式 = 基准值 + 振幅 × sin(t × 频率)，所有"脉动/闪烁"类动画都是这个模板。

renderOrder 补充：光晕 Sprite 设 renderOrder = -1（先画光晕，后画本体），保证本体叠在光晕中心而不是被光晕盖住。Three.js 默认按深度排序透明物体，renderOrder 可强制干预绘制顺序。

**实战应用场景**：呼吸/脉冲动画是监控告警领域的通用视觉语言：ECharts GL 的涟漪打点、网管大屏的故障设备闪烁、地图 App"我的位置"的脉冲圆都是同一模板；游戏里技能冷却完成提示、可交互物体的"按 E 进入"发光也用它。正弦脉冲的优势：平滑、不刺眼、频率幅度皆可调——比生硬的 alert 闪烁专业得多，是"告警可视化"的默认选择。

**✦ 示例 05（Vue 3 版）：点击拾取 + 星空粒子 + 大气辉光**（保存为 `my-app/src/components/ch13/05-InteractionFx.vue`）。本例卫星用 Canvas 光点贴图（零外部资源、直接可跑），聚焦本节三大知识点——Raycaster 拾取、Points 星空、菲涅尔辉光着色器：

```vue
<!-- src/components/ch13/05-InteractionFx.vue —— 示例 05：拾取、星空与大气辉光 -->
<template>
  <div ref="containerRef" class="scene-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const containerRef = ref(null)

let scene, camera, renderer, controls
let earth, glowMat, starGeo, dotTex, satMatNormal, satMatSelected
let satelliteGroup, raycaster
let animationId = null
const clock = new THREE.Clock()
const mouse = new THREE.Vector2()                // NDC 归一化设备坐标容器（复用避免每帧 new）

// 点击处理命名函数：卸载时需要 removeEventListener，必须保留引用（不能用匿名函数）
function onClickSatellite(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  // 像素坐标 → NDC：减偏移 → 除尺寸（0~1）→ 乘 2 减 1（-1~1）；y 轴翻转（屏幕向下、NDC 向上）
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)         // 相机 + NDC → 射线（13.7.1）
  const hits = raycaster.intersectObjects(satelliteGroup.children, false)
  if (hits.length === 0) return                  // 点空：不处理
  // 互斥高亮：全部还原普通材质，命中的换选中材质并放大
  satelliteGroup.children.forEach((s) => { s.material = satMatNormal; s.scale.set(0.6, 0.6, 1) })
  const hit = hits[0].object                     // hits 按距离排序，[0] 即最近命中
  hit.material = satMatSelected
  hit.scale.set(1.1, 1.1, 1)
  console.log('选中卫星：', hit.userData.name)
}

function initScene() {
  const container = containerRef.value

  // —— 基础设施（前例已详述）——
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000005)
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 2000)
  camera.position.set(0, 3, 15)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))
  scene.add(new THREE.DirectionalLight(0xffffff, 1.0).translateX(10).translateY(5).translateZ(10))

  earth = new THREE.Mesh(
    new THREE.SphereGeometry(5, 64, 64),
    new THREE.MeshPhongMaterial({ color: 0x1a4d8f, shininess: 10 })
  )
  scene.add(earth)

  // —— ① 大气辉光：菲涅尔壳（13.7.3 原理：法线与视线点积 → 边缘发光）——
  glowMat = new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: new THREE.Color(0x4a90d9) } }, // JS → GLSL 的传参通道
    vertexShader: `
      varying vec3 vNormal;                        // varying：顶点 → 片元传值
      void main() {
        vNormal = normalize(normalMatrix * normal); // 法线变换到相机坐标系
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); // 经典 MVP 变换
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying vec3 vNormal;
      void main() {
        // 球面正对相机处 dot≈1（不发光），边缘 dot≈0（最亮）——菲涅尔效应
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(glowColor, intensity * 0.6);
      }
    `,
    blending: THREE.AdditiveBlending,            // 加色混合：叠加提亮产生"发光感"
    side: THREE.BackSide,                        // 渲染内壁：辉光从地球轮廓外圈溢出
    transparent: true,
  })
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(5 * 1.15, 64, 64), glowMat))

  // —— ② 星空：Points 粒子系统（13.7.2：一个几何体装 1500 颗星，一次绘制）——
  const starPos = new Float32Array(1500 * 3)     // 每颗星 3 个坐标，一维排布
  for (let i = 0; i < 1500; i++) {
    const r = 200 + Math.random() * 200          // 半径 200~400 的球壳
    const u = Math.random() * 2 - 1              // u=cosφ 均匀取值 → 球面均匀分布
    const a = Math.random() * Math.PI * 2        // 方位角
    const s = Math.sqrt(1 - u * u)
    starPos[i * 3] = r * s * Math.cos(a)
    starPos[i * 3 + 1] = r * u
    starPos[i * 3 + 2] = r * s * Math.sin(a)
  }
  starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3)) // 每 3 个数一个顶点
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.9, sizeAttenuation: true, // 近大远小
  })))

  // —— ③ 卫星：Canvas 光点贴图 + 12 颗倾斜轨道 Sprite（13.6 简化版）——
  const dotCanvas = document.createElement('canvas')
  dotCanvas.width = dotCanvas.height = 64
  const dctx = dotCanvas.getContext('2d')
  const grad = dctx.createRadialGradient(32, 32, 2, 32, 32, 30)
  grad.addColorStop(0, 'rgba(255,225,160,1)')
  grad.addColorStop(1, 'rgba(255,200,110,0)')
  dctx.fillStyle = grad
  dctx.fillRect(0, 0, 64, 64)
  dotTex = new THREE.CanvasTexture(dotCanvas)
  dotTex.colorSpace = THREE.SRGBColorSpace

  satMatNormal = new THREE.SpriteMaterial({ map: dotTex, transparent: true, depthWrite: false })
  satMatSelected = new THREE.SpriteMaterial({                  // 选中态共享材质：橙色染色
    map: dotTex, color: 0xffa030, transparent: true, depthWrite: false,
  })
  satelliteGroup = new THREE.Group()             // 卫星统一入组：拾取时只检测这个组
  scene.add(satelliteGroup)
  for (let i = 0; i < 12; i++) {
    const sprite = new THREE.Sprite(satMatNormal)
    sprite.scale.set(0.6, 0.6, 1)
    sprite.userData = {                          // userData 挂载业务数据 + 轨道参数
      name: `SAT-${String(i + 1).padStart(2, '0')}`,
      incl: (i / 12) * Math.PI, radius: 6.2 + i * 0.3, phase: Math.random() * Math.PI * 2,
    }
    sprite.position.set(                         // 初始摆位（细节不重要，能被点到即可）
      Math.cos(sprite.userData.phase) * sprite.userData.radius, 0,
      Math.sin(sprite.userData.phase) * sprite.userData.radius
    ).applyAxisAngle(new THREE.Vector3(1, 0, 0), sprite.userData.incl) // 按倾角绕 X 轴旋转
    satelliteGroup.add(sprite)
  }

  // —— ④ Raycaster 点击拾取（13.7.1）：监听 canvas 而非容器，
  //     避免点到 OrbitControls 的手势区误触发；命名函数便于卸载时解绑 ——
  raycaster = new THREE.Raycaster()
  renderer.domElement.addEventListener('click', onClickSatellite)

  window.addEventListener('resize', onResize)
}

// —— 渲染循环：卫星沿各自轨道匀速推进 ——
function animate() {
  animationId = requestAnimationFrame(animate)
  const dt = clock.getDelta()                    // getDelta 内部会同步更新 elapsedTime
  const t = clock.elapsedTime                    // 累计时间（秒）：驱动轨道相位
  earth.rotation.y += 0.05 * dt
  satelliteGroup.children.forEach((s) => {
    const d = s.userData
    const theta = d.phase + t * 0.35
    s.position.set(Math.cos(theta) * d.radius, 0, Math.sin(theta) * d.radius)
      .applyAxisAngle(new THREE.Vector3(1, 0, 0), d.incl)
  })
  controls.update()
  renderer.render(scene, camera)
}

function onResize() {
  const container = containerRef.value
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}

onMounted(() => {
  initScene()
  animate()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  // 自定义事件也要解绑：click 监听挂在 renderer.domElement 上，随 canvas 移除前先解除
  renderer.domElement.removeEventListener('click', onClickSatellite)
  cancelAnimationFrame(animationId)
  controls.dispose()
  glowMat.dispose()                              // ShaderMaterial 同样要释放 GPU 程序
  starGeo.dispose()                              // 粒子几何体（1500×3 顶点缓冲）
  dotTex.dispose()                               // 两份卫星材质共享同一张点纹理，释放一次即可
  satMatNormal.dispose()
  satMatSelected.dispose()
  scene.traverse(obj => {
    if (obj.geometry && obj.geometry !== starGeo) obj.geometry.dispose()
    if (obj.material && obj.material !== satMatNormal && obj.material !== satMatSelected) {
      obj.material.dispose()
    }
  })
  renderer.dispose()
  renderer.domElement.remove()
})
</script>

<style scoped>
.scene-container { width: 100%; height: 100vh; overflow: hidden; }
</style>
```

**示例 05 新写法速览：本例首次出现的六个写法**

Raycaster 拾取四步与 NDC 换算公式、intersectObjects、Points 星空与 BufferGeometry、ShaderMaterial 菲涅尔壳（BackSide + AdditiveBlending）、CanvasTexture 径向渐变光点、SpriteMaterial 共享材质——13.7.1 ~ 13.7.4 及示例 01~04 已建立的基础设施与卸载释放套路都已系统讲过，下面只解释"此前课件从未出现"的写法：

- **点击处理写成命名函数：匿名函数无法解绑**。`removeEventListener('click', onClickSatellite)` 只能移除与当初注册时**同一个函数引用**的监听——匿名箭头函数每次书写都是新引用，注册后永远解不掉。所以 onClickSatellite 定义在 setup 顶层（命名函数），注册与解绑用的是同一份引用；这是 addEventListener / removeEventListener 配对使用的硬规则，挂 window 上的 resize 监听同理（resize 处理函数本例也是命名函数）。
- **`renderer.domElement.getBoundingClientRect()` —— 获取画布在页面中的位置与尺寸（DOM API 首次出现）**。13.7.1 的 NDC 公式说"减去画布偏移、除以画布尺寸"，数据来源就是这一行：它返回一个 DOMRect 对象，`rect.left / rect.top` 是画布左上角相对**视口**的像素偏移，`rect.width / rect.height` 是画布的 CSS 像素尺寸。必须用画布自己的 rect 而不是 `window.innerWidth`——页面布局里画布不一定从 (0,0) 开始、也不一定占满窗口，用错容器换算出的 NDC 就会点歪。
- **互斥高亮：`s.material = satMatSelected` 换材质引用即"换装"**。给 Mesh / Sprite 重新赋值 material 属性就是即时换材质（下一帧生效），无需重建对象。本例给 12 颗卫星准备**两套共享材质**（普通态 / 选中态，13.6.6 真实代码已见过定义），点击命中后先 forEach 把全部卫星还原成普通材质，再给命中的换选中材质并 `scale.set(1.1, 1.1, 1)` 放大（13.7.1 说过 Sprite 热区就是显示四边形，放大后热区同步变大、手感一致）——这就是"互斥高亮"模式：同一时刻只有一颗是亮的，全程只有两份材质、零额外内存。项目真实版走 13.7.1 的"emit 上抛 → Vue 数据流"路线，教学版在组件内直接换材质，两种都合法。
- **`light.translateX(10).translateY(5).translateZ(10)` —— 链式位移方法（首次出现）**。所有 Object3D 都有 translateX / translateY / translateZ 三个方法：沿**自身本地坐标轴**平移指定距离。物体没有旋转时，效果等价于 `position.set(10, 5, 10)`；有旋转时才有差别——translate 沿本地轴走、position 是直接设世界坐标。每个方法都返回对象自身（`this`），所以能一路链下去，甚至直接塞进 `scene.add(...)` 的参数位。链式调用是 Three.js 的常见风格，见到"方法后面继续点方法"不必慌。
- **`u = Math.random() * 2 - 1` 与 `s = Math.sqrt(1 - u * u)` —— 球面均匀分布的等价写法**。13.7.2 讲的"极角 phi 用 acos(2×random−1)"与本例是同一数学的两种写法：u 直接取 cosφ（在 −1~1 均匀分布），则 sinφ = √(1−cos²φ) = √(1−u²)（代码里的 s）；坐标 x / z 乘 sinφ、y 乘 cosφ（即 u）——与 acos 版本逐项对应，同样避免星星向两极聚集。公式长得不一样时先对照 13.7.2 的推导，别当成新知识死记。
- **`position.set(...).applyAxisAngle(new THREE.Vector3(1, 0, 0), incl)` —— 绕任意轴旋转向量（首次出现）**。applyAxisAngle 把调用它的向量绕给定轴（这里是世界 X 轴 `(1, 0, 0)`）旋转 angle 弧度。示例 04 用"倾斜 Group"实现轨道倾斜，本例演示第二种等价方案：**先在 XZ 平面算好圆周位置，再把位置向量整体绕 X 轴转一个倾角**——不建 Group、一行搞定。两种写法各有适用场景：轨道线、卫星都要挂进同一倾斜面时用 Group 方便（示例 04），只算位置时 applyAxisAngle 更省（本例）。

运行验收：地球边缘泛蓝色辉光、背后 1500 颗星星铺满深空；点击任意光点它变橙色放大并在控制台报出名字，点其他光点时旧选中自动还原。试着把 `0.7` 改成 `0.5`、`intensity * 0.6` 改成 `intensity`，直观感受菲涅尔参数对辉光范围/亮度的影响。

### 13.7.5 真实代码对照：项目 Globe3D.vue 中的本节实现

知识点讲完、示例 05 敲完，最后看真实项目是怎么写这几块的。以下四段代码节选自本项目真实页面组件 `src/components/Globe3D.vue`（第 13 天实战项目的 3D 地球生产组件），注释完整保留，可逐行与示例 05 对照。教学版用 Canvas 光点卫星演示交互，真实版在拾取、星空、辉光之外还驱动着危险天体的呼吸警示：

**① 点击拾取：onCanvasClick()（对应 13.7.1）**

```js
<!-- src/components/Globe3D.vue —— onCanvasClick() -->
// raycaster / mouse 是模块级变量（初始化时创建一次，避免每次点击 new）：
//   raycaster = new THREE.Raycaster()   射线检测器
//   mouse = new THREE.Vector2()         复用的 NDC 坐标容器（二维向量）
// emit 是 defineEmits(['select-satellite']) 返回的事件触发函数（Vue 组件事件上抛）
function onCanvasClick(event) {
  if (!raycaster) return
  const rect = renderer.domElement.getBoundingClientRect()   // 画布在页面中的位置
  // NDC：x/y 归一到 [-1, 1]，原点在画布中心、y 轴向上（与像素坐标相反）
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1   // 注意负号：翻转 y

  raycaster.setFromCamera(mouse, camera)   // 相机 + NDC 点 → 射线

  // 卫星优先拾取：只检测卫星组的 children
  if (satelliteMeshes.size > 0) {
    const satHits = raycaster.intersectObjects(satelliteGroup.children, false)
    if (satHits.length > 0) {
      const hitSprite = satHits[0].object              // 第一个命中的（最近的）
      for (const [id, sprite] of satelliteMeshes) {    // 命中对象反查 noradId
        if (sprite === hitSprite) {
          emit('select-satellite', id)                 // 上抛给父组件
          return
        }
      }
    }
  }
}
```

**② 星空粒子：createStars() 完整代码（对应 13.7.2）**

```js
<!-- src/components/Globe3D.vue —— createStars() 完整代码 -->
/** 生成星空背景 */
function createStars() {
  const geometry = new THREE.BufferGeometry()
  const count = 3000
  const positions = new Float32Array(count * 3)   // 每颗星 3 个坐标 → 一维数组
  const colors = new Float32Array(count * 3)      // 每颗星 3 个颜色分量
  for (let i = 0; i < count; i++) {
    // 球面均匀分布：半径 200~400 的球壳上随机取点
    const r = 200 + Math.random() * 200
    const theta = Math.random() * Math.PI * 2             // 方位角
    const phi = Math.acos(2 * Math.random() - 1)          // 极角（acos 均匀球面）
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
    // 星星颜色：白色偏蓝或偏黄（顶点色随机微调）
    const tint = Math.random()
    colors[i * 3] = 0.8 + tint * 0.2
    colors[i * 3 + 1] = 0.8 + Math.random() * 0.2
    colors[i * 3 + 2] = 1.0
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({
    size: 0.8,               // 粒子大小
    vertexColors: true,      // 启用顶点色（每颗粒子用 color 缓冲的颜色）
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,   // 近大远小（false 则所有粒子等大）
  })
  return new THREE.Points(geometry, material)
}
```

**③ 大气辉光：createAtmosphere() 完整代码（对应 13.7.3）**

```js
<!-- src/components/Globe3D.vue —— createAtmosphere() 完整代码 -->
/** 创建大气层辉光（使用自定义 ShaderMaterial） */
function createAtmosphere() {
  const geometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.15, 96, 96)
  const material = new THREE.ShaderMaterial({
    uniforms: {
      // uniform：JS 传给着色器的全局参数（每次渲染可变）
      glowColor: { value: new THREE.Color(0x4a90d9) },
    },
    vertexShader: `
      varying vec3 vNormal;      // varying：顶点→片元的传值变量
      void main() {
        // normalMatrix * normal：把顶点法线变换到相机坐标系
        vNormal = normalize(normalMatrix * normal);
        // 经典 MVP 变换：模型矩阵 → 相机矩阵 → 投影矩阵
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying vec3 vNormal;
      void main() {
        // 边缘发光：法线与视线夹角越大越亮
        // vNormal·(0,0,1) = 法线与"看向屏幕"方向的点积：
        // 球正对相机处 ≈1（不发光），边缘处 ≈0（最亮）
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(glowColor, intensity * 0.6);   // RGBA，alpha 由强度决定
      }
    `,
    blending: THREE.AdditiveBlending,   // 加色混合（叠加提亮）
    side: THREE.BackSide,               // 渲染球体的"内壁"（从内部看）
    transparent: true,
  })
  return new THREE.Mesh(geometry, material)
}
```

**④ 危险天体红晕与呼吸警示（对应 13.7.4）**

```js
<!-- src/components/Globe3D.vue —— 光晕资源 + 呼吸动画 -->
// 涉及的模块级变量先交代：neoMatHazard 危险小行星本体的共享材质（红色）、
// neoPulseT 呼吸动画累计时间（初始 0）、neoGlowMeshes 光晕表
// （Map<noradId, 光晕 Sprite>，每个危险天体同位叠一层光晕）
// 光晕共享材质（径向渐变红光贴图 + 加色混合）
neoGlowMat = new THREE.SpriteMaterial({
  map: neoGlowTexture,                  // 13.5.5 的 CanvasTexture 径向渐变
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,     // 加色混合：红色光效叠加提亮而非遮挡
  opacity: 0.55,                        // 呼吸基准（动画中 0.2~0.9 脉动）
})

// animate() 中的呼吸警示（红色明暗脉动，周期约 2.3 秒）：
if (neoMatHazard) {
  neoPulseT += dt                            // dt：两帧真实时间差（13.3.4）
  const pulse = Math.sin(neoPulseT * 2.7)    // 正弦波：-1 ~ 1
  neoMatHazard.opacity = 0.74 + 0.26 * pulse // 危险本体材质透明度脉动
  if (neoGlowMat) {
    neoGlowMat.opacity = 0.55 + 0.35 * pulse // 光晕同相位呼吸
    const k = 1 + 0.14 * pulse               // 光晕尺寸微缩放（±14%）
    for (const glow of neoGlowMeshes.values()) {
      // userData：Object3D 的自定义数据挂载点（baseW/baseH 存光晕基础尺寸）
      glow.scale.set(glow.userData.baseW * k, glow.userData.baseH * k, 1)
    }
  }
}
```

## 13.8 3D 性能优化实战

到这里你已经能做出"地球 + 卫星 + 交互 + 特效"的完整场景。但 3D 应用真正的分水岭是性能：同样的场景，写法不同可能在别人的电脑上从 60fps 掉到 15fps。本节全部来自本项目踩过的真实坑，每一条都有背景、原理和完整代码。

### 13.8.1 性能问题的第一现场：为什么我的 3D 页面卡？

先建立"卡顿排查"的思维方式。浏览器 3D 卡顿只有三个来源，按排查优先级排列：

| 排查项 | 典型症状 | 定位方法 |
|--------|---------|---------|
| CPU 每帧做了太多事（JS 瓶颈） | 帧率低且 CPU 占用高，Performance 面板里 rAF 回调耗时长 | Chrome DevTools → Performance 录制，看每帧 Scripting 耗时 |
| GPU 渲染不动（填充率/显存瓶颈） | CPU 很闲但帧率低，分层看 GPU 任务满载 | 任务管理器查看 GPU 进程占用；简化场景（去掉纹理/降低分辨率）看帧率是否恢复 |
| 每帧分配内存（GC 瓶颈） | 帧率周期性骤降（每隔几秒卡一下） | Performance 面板看到锯齿状的 GC 长任务 |

【解题思路】本项目曾在外部 Chrome 中持续掉帧，最终定位到三个叠加原因：高刷新率屏幕（144Hz）上 rAF 满速回调导致 GPU 每秒重绘 144 次；MSAA 抗锯齿 + 高 DPR 双重开销；以及只降不升的动态分辨率导致画质永久劣化。下面四小节逐一给出解法——这是 3D 性能优化的一套完整方法论。

### 13.8.2 60fps 渲染上限：requestAnimationFrame 节流

第一个优化听起来反直觉：**限制渲染频率反而更流畅**。

背景：requestAnimationFrame（rAF）的回调频率跟随屏幕刷新率。60Hz 屏幕每秒约 60 次；但 144Hz 电竞屏会回调约 144 次——你的 WebGL 场景就被迫每秒重绘 144 次，GPU 负载接近翻倍。而人眼对 60fps 以上的差异几乎无感知，多出来的 84 次渲染纯属浪费。

解决方案：在 rAF 回调里加"时间闸门"，距上次渲染不足一帧间隔（1/60 秒）就直接 return（rAF 照常排队下一帧，不影响事件循环）：

```js
<!-- src/components/Globe3D.vue —— 60fps 渲染上限 -->
// —— 60fps 渲染上限 ——
// 高刷新率屏幕（如 144Hz）上 rAF 满速回调会让 WebGL 每秒重绘约
// 144 次，是外部 Chrome 卡顿掉帧的主因；节流到 60fps 后 GPU 负载
// 近乎减半，也为 DPR=2 的清晰度提升腾出预算
const FPS_CAP = 60
// 上次实际渲染的时刻（秒）；1/60 - 0.002s 容差防 60Hz 屏跳帧
let lastRender = 0

function animate() {
  animationId = requestAnimationFrame(animate)
  // 帧率节流：距上次渲染不足一帧间隔时跳过本次（rAF 照常排队）
  const now = performance.now() / 1000
  if (now - lastRender < 1 / FPS_CAP - 0.002) return   // 时间闸门
  const dt = now - lastRender                           // 真实时间增量
  // ……动画逻辑全部用 dt 推进（13.3.4 讲过：与帧率解耦）……
  lastRender = now
  controls.update()
  renderer.render(scene, camera)
}
```

三个细节决定成败：

- 容差 0.002 秒：rAF 回调时刻有微小抖动，60Hz 屏上如果闸门恰好卡在 1/60 边界，会周期性跳帧（表现为动画轻微顿挫）。减去 2ms 容差后边界判定稳定
- 节流必须配合 dt 增量动画（13.3.4）：如果动画写死"每帧转 0.01 弧度"，节流后 144Hz 屏和 60Hz 屏动画速度差 2.4 倍
- 性能统计也要用 dt：下一节的动态分辨率正是拿 dt × 1000（毫秒）作为帧耗时样本

【注意】不要用 setInterval 代替 rAF 做节流。setInterval 与浏览器渲染节奏不同步，会在某些帧"挤进来两次渲染"造成浪费，且页面切后台时 setInterval 仍空转（rAF 会自动暂停），白白耗电。

### 13.8.3 SSAA 超采样替代 MSAA：antialias: false 的真相

第二个优化更反直觉：**故意关闭 Three.js 的抗锯齿**。

先补两个术语：

- 锯齿（aliasing）：3D 图形的斜边/圆弧在屏幕像素网格上呈现的阶梯状毛刺
- MSAA（Multi-Sample Anti-Aliasing，多重采样抗锯齿）：GPU 硬件在每个像素内取多个采样点判断几何覆盖率，只平滑几何边缘。WebGLRenderer 的 antialias: true 开启的就是它（默认 4x）
- SSAA（Super-Sampling Anti-Aliasing，超采样抗锯齿）：用高于屏幕的分辨率渲染整帧，再缩小显示。相当于把每个屏幕像素"平均"了 2.25 倍（1.5 倍边长）的信息，几何边缘和纹理内部走样一起平滑

本项目的选择是 antialias: false + setPixelRatio(devicePixelRatio × 1.5)：

```js
<!-- src/components/Globe3D.vue —— 渲染器初始化（SSAA 方案） -->
// antialias:false：以 1.5 倍 DPR 超采样（SSAA）替代 MSAA——超采样
// 把整帧以 1.5×2.25=3.4MP（1080p 屏）渲染后缩小显示，抗锯齿质量
// 优于 4x MSAA（覆盖几何边缘 + 贴图内部走样，且无 MSAA 的显存
// 带宽开销）；两者叠加收益边际递减却显著增加 fillrate 消耗，
// 关闭 MSAA 直接换来帧率余量（弱 GPU 上约 15-30%）
renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' })
renderer.setSize(width, height)
// 像素比 = 设备 DPR × 1.5 超采样（上限 3）：低 DPR 屏（如 1.0/1.25）
// 上以 1.5~1.9 倍超采样渲染再缩小显示，等效 SSAA 全场景抗锯齿，
// 大陆海岸线与云层细节更锐利
renderer.setPixelRatio(Math.min(window.devicePixelRatio * 1.5, 3))
```

为什么"SSAA 更好还更省"？关键在于两者不能叠加：开了 MSAA 再超采样，GPU 每帧要做两次抗锯齿，帧率成本叠加而画质收益递减。二选一时：

| 对比项 | MSAA（antialias: true） | SSAA（DPR × 1.5） |
|--------|------------------------|-------------------|
| 平滑范围 | 仅几何边缘 | 整帧（含纹理内部走样） |
| 显存带宽 | 每像素 4 采样点的额外带宽 | 无额外采样结构，但整帧像素多 2.25 倍 |
| 附带收益 | 无 | 画面整体更锐利（相当于 1.5 倍分辨率截图） |
| 弱 GPU 表现 | fillrate 开销固定存在 | 可通过降 DPR 阶梯化牺牲（见下一节） |

最后一行是决定性优势：MSAA 开了就是开了，GPU 弱只能掉帧；而 SSAA 的"倍率"是一个可以动态调节的旋钮——这就引出了下一节的动态分辨率。

powerPreference: 'high-performance' 是渲染器构造参数，告诉浏览器优先使用独显渲染（双显卡笔记本上浏览器默认可能用核显省电，这是 3D 页面"莫名卡"的常见原因之一）。

**实战应用场景**：SSAA 的"渲染大、再缩小"是画质补救万金油，实时与离线两种用法：实时场景（本项目）在帧率预算内拉高像素比换画质；离线场景则可以拉满——3D 报告导出高清截图（大屏汇报打印）、电商 3D 素材批量出图时，把像素比临时设到 2~3 再 toDataURL 截图，等效 4~9 倍超采样，导出即印刷级。同一 API，两种打法。

### 13.8.4 动态分辨率阶梯：可自愈的画质调节

如果用户 GPU 较弱，1.5 倍超采样会持续掉帧。粗暴做法是直接降到 1.0——但强 GPU 用户也被拉低画质。正确答案是**运行时自适应**：监控实际帧耗时，吃紧就降档、恢复就升档。

先看档位设计的三个原则（全部踩过坑）：

- 档位阶梯 1.5 → 1.3 → 1.15 → 1.0，封底是 1.0 而非更低：0.75 倍 DPR 已低于设备原生分辨率，贴图被"拉伸上采样"，观感比掉帧更差。降档只取消超采样、绝不上采样
- 只降不升是错的（本项目 v1 的教训）：弱 GPU 环境一旦降档就永久停留低画质。必须提供回升路径
- 双向都要"防振荡"：降档要连续 2 个统计窗口确认（防止一次性尖峰误降）；升档要连续 8 个窗口健康 + 距上次调整超过 20 秒冷却（防止临界负载下每 8 秒升降一次来回抽搐）

完整实现（逐行注释）：

```js
<!-- src/components/Globe3D.vue —— 动态分辨率核心 -->
const QUALITY_STEPS = [1.5, 1.3, 1.15, 1.0]   // 档位阶梯（封底=原生 DPR）
let adaptQualityIdx = 0        // 当前档位下标（0 = 最高画质）
let adaptSamples = []          // 本统计窗口的帧耗时样本（毫秒）
let adaptBadStreak = 0         // 连续"吃紧"窗口计数
let adaptGoodStreak = 0        // 连续"健康"窗口计数
let adaptLastChange = 0        // 上次调整档位的时刻（冷却计时基准）

function applyQuality() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio * QUALITY_STEPS[adaptQualityIdx], 3))
  // 立即补渲染一帧：setPixelRatio 重建像素缓冲会清空画布内容，
  // 若等下一个渲染帧（节流可能跳过若干 rAF）就闪一帧空白
  renderer.render(scene, camera)
}

function adaptResolution(frameMs) {
  // 忽略异常长帧：切后台再回来 / GC 停顿等一次性尖峰不算持续掉帧
  if (frameMs > 200) return
  adaptSamples.push(frameMs)
  if (adaptSamples.length < 60) return          // 每窗口攒 60 帧样本
  // reduce：数组累加（(s, v) => s + v 从左往右求和，0 是初始值）→ 求和再除以样本数
  const avg = adaptSamples.reduce((s, v) => s + v, 0) / adaptSamples.length
  adaptSamples.length = 0                       // 清空进入下一窗口

  if (avg > 27) {
    // GPU 持续吃紧：连续 2 个窗口（双窗口确认）降一档
    adaptBadStreak++
    adaptGoodStreak = 0
    if (adaptBadStreak >= 2 && adaptQualityIdx < QUALITY_STEPS.length - 1) {
      adaptQualityIdx++
      adaptBadStreak = 0
      adaptLastChange = performance.now()
      applyQuality()
    }
  } else if (avg < 22 && adaptQualityIdx > 0) {
    // 帧率持续健康：冷却期满后升一档（画质自愈）
    adaptBadStreak = 0
    adaptGoodStreak++
    if (adaptGoodStreak >= 8 && performance.now() - adaptLastChange > 20000) {
      adaptQualityIdx--
      adaptGoodStreak = 0
      adaptLastChange = performance.now()
      applyQuality()
    }
  } else {
    // 中间区间（22~27ms）：帧率尚可，档位不动
    adaptBadStreak = 0
  }
}

// animate() 末尾调用（dt 是本帧真实间隔，秒 → 毫秒）：
adaptResolution(dt * 1000)
```

阈值数字的由来：60fps 意味着每帧预算 16.7ms。27ms（约 37fps）作为"吃紧"线留了余量——偶尔一两帧超 16.7ms 属正常抖动，连续窗口均值超 27ms 才是真吃紧；22ms 作为"健康"线，是兼容 144Hz 屏（节流后帧间隔对齐 rAF 网格，物理下限约 21ms）的经验值。

还有一个隐蔽的坑藏在 applyQuality 里：**setPixelRatio 会清空画布缓冲**。如果调完档位就等下一个渲染帧，而下一帧恰好被 60fps 节流跳过（最多可能跳过几十个 rAF），屏幕上就会闪过一帧空白。解法是改完立即 renderer.render(scene, camera) 补一帧。onResize 里同样要补（13.3.5 埋的伏笔在此收线）。

【注意】动态分辨率只调节 setPixelRatio（渲染分辨率），不调用 setSize（画布 CSS 尺寸）。CSS 尺寸变了页面布局会跟着抖动；只变像素比则画布大小不变、内容锐度变化，视觉上是"轻微变糊"而非"页面跳动"。

**实战应用场景**：DRS（动态分辨率缩放）是 3A 游戏的标配技术：GTA5、《原神》《塞尔达》都用"负载高时降低内部分辨率"保帧数；直播推流的自适应码率、视频平台的清晰度自动切换，思想完全同源——**质量换流畅、闲时再恢复**。Web 3D 大屏部署在低端 Android 一体机（政务/展厅的常见硬件）时，这套带恢复路径的阶梯几乎是必需品。

### 13.8.5 渲染帧内零逐卫星开销：把工作搬到数据更新时

性能优化最重要的一条原则：**animate 循环里每一行代码每秒执行 60 次，这里放任何"遍历全部卫星"的代码都是灾难**。

本项目的架构选择：卫星位置更新完全不在渲染帧内做，而是由数据驱动——父组件每 2 秒整体替换 satellites 数组，浅 watch 触发 updateSatellites，用 Map 做增量同步（已讲过 13.6.3）。渲染帧内与卫星相关的代码是零：

```js
<!-- src/components/Globe3D.vue —— animate 循环全貌 -->
function animate() {
  animationId = requestAnimationFrame(animate)
  const now = performance.now() / 1000
  if (now - lastRender < 1 / FPS_CAP - 0.002) return
  const dt = now - lastRender
  if (cloudsMesh) cloudsMesh.rotation.y += 0.00035 * 60 * dt   // 云层自转
  if (neoGroup) neoGroup.rotation.y += 0.00025 * 60 * dt       // NEO 星群公转（整组一次旋转）
  if (neoMatHazard) {                                          // 危险天体呼吸（只改共享材质）
    neoPulseT += dt
    const pulse = Math.sin(neoPulseT * 2.7)
    neoMatHazard.opacity = 0.74 + 0.26 * pulse
  }
  // 卫星 Sprite 仅在卫星数组替换时更新位置（见 updateSatellites），
  // 渲染帧内无逐帧 CPU 工作
  lastRender = now
  controls.update()
  renderer.render(scene, camera)
  adaptResolution(dt * 1000)
}
```

审视这个循环：云层自转 1 行、星群公转 1 行（整组旋转，无逐天体开销）、呼吸警示 2 行（改共享材质，无逐天体开销）。无论场景里是 3 颗卫星还是 300 颗，animate 的执行成本恒定——这就是"帧内零逐对象开销"的设计纪律。

反面教材：本项目早期版本曾用 InstancedMesh 渲染卫星，每帧重建 156 个实例矩阵再上传 GPU——为了"卫星看起来在动"付出每帧 156 次矩阵计算。实际上卫星 2 秒才刷新一次数据，帧内动它毫无意义。教训：**先问"这东西需要每帧动吗"，再决定放不放 animate**。

**实战应用场景**："脏标记"（dirty flag）是实时系统的经典设计模式：编译器只重编译改动的文件、React 只重渲染变化的组件、数据库写前日志的增量刷盘——都是"数据没变就不动"。对 7×24 小时运行的政企大屏，帧内任何一个 new / 遍历都会被 GC 放大成周期性卡顿，这正是"数据驱动"架构在工程上的价值。

### 13.8.6 onBeforeUnmount 完整资源释放

3D 资源是 GPU 显存里的原生对象，不归 JavaScript 垃圾回收器管。组件卸载时若不手动释放，SPA 路由反复进出 3D 页面会持续泄漏显存，最终浏览器崩溃。释放清单有固定套路：

```js
<!-- src/components/Globe3D.vue —— 组件卸载清理 -->
onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)                    // 1. 停掉渲染循环
  window.removeEventListener('resize', onResize)        // 2. 解绑全局事件
  // 3. 释放卫星共享 GPU 资源：贴图 + 两个共享材质
  //    （Sprite 本体无独立 GPU 资源，清空 Map 即可）
  satelliteMeshes.clear()
  satMatNormal?.dispose()
  satMatSelected?.dispose()
  satTexture?.dispose()
  // 4. 释放 NEO 共享 GPU 资源（与卫星同款清理策略）
  //    neoMeshes：Map<noradId, 小行星 Sprite>；neoMatNormal / neoTexture：
  //    普通小行星的共享材质 / 贴图；neoGlowMeshes / neoGlowMat / neoGlowTexture：
  //    危险天体的光晕 Sprite 表 / 共享材质 / 红光贴图
  neoMeshes.clear()
  neoMatNormal?.dispose()
  neoMatHazard?.dispose()
  neoTexture?.dispose()
  neoGlowMeshes.clear()
  neoGlowMat?.dispose()
  neoGlowTexture?.dispose()
  if (renderer) {
    renderer.domElement.removeEventListener('click', onCanvasClick)  // 5. 解绑画布事件
    renderer.dispose()                         // 6. 释放 WebGL 上下文（最关键一步）
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)  // 7. 移除画布 DOM
    }
    // 置空：真实贴图异步加载完成回调以此判断组件是否已卸载，
    // 卸载后到达的纹理直接 dispose 而非挂到已销毁的场景上
    renderer = null
  }
})
```

释放顺序的记忆口诀：**先停循环、再解事件、后释放资源、最后销毁渲染器**。代码里的 ?. 是可选链操作符：satMatNormal?.dispose() 表示"satMatNormal 非 null/undefined 才调用 dispose"，防止某项资源尚未初始化（如贴图还在加载中）就卸载组件时报错。

renderer.dispose() 会释放整个 WebGL 上下文，必须在它之前完成各类材质/纹理的单独 dispose 吗？不必——dispose 顺序不严格要求，但 renderer 置空这一步有独立价值：异步回调闭包里持有这些模块级变量，置空后回调能感知"组件已死"，避免把迟到的纹理挂到已销毁的场景。

必背清单（Vue3 + Three.js 组件卸载七件事）：

1. cancelAnimationFrame 停渲染循环
2. removeEventListener 解绑 window 上的 resize/键盘等全局事件
3. 遍历释放所有 Texture 的 dispose()
4. 遍历释放所有 Material 的 dispose()
5. 遍历释放所有非共享 Geometry 的 dispose()（本项目几何体数量少，renderer.dispose() 销毁 WebGL 上下文时会被统一回收，故未逐个列出）
6. renderer.dispose() 销毁 WebGL 上下文
7. 从父容器移除 canvas 元素

【注意】共享资源（本项目的 satTexture 被 156 个 Sprite 引用）只需 dispose 一次——dispose 释放的是 GPU 侧资源，与 JS 引用计数无关；反过来，忘了 dispose 的资源哪怕 JS 引用已置 null，显存里依然躺着。判断标准不是"JS 里还有没有引用"，而是"GPU 里还有没有"。

最后一个 Vue×3D 集成必知：**v-if 卸载组件（含路由切换）才会触发 onBeforeUnmount 走完七件事；v-show 只是 CSS 隐藏**——组件实例、渲染循环、WebGL 上下文全部继续存活，照常吃 CPU/GPU。需要"彻底隐藏并回收资源"的场景必须用 v-if。

**实战应用场景**：资源释放是 3D 项目的"工程下限"：7×24 运行的指挥大屏（不重启的政务/应急系统）若路由切换不释放显存，几十次切换后就会 OOM 白屏；一个系统内含几十个 3D 页面的中台产品更是如此。"Demo 能跑"与"产品能上线"之间，隔着的往往就是这套清理纪律——面试官问"你的 3D 项目怎么保证长时间运行不崩"，答案就在本节。

## 13.9 综合实战：从零搭建"3D 地球 + 卫星"

前面八节把所有零件讲完了，本节把它们组装成一台完整的机器。你将得到两个**可独立运行**的最终版本，功能完全一致：综合完整版 FinalGlobe.vue（13.9.1.1，推荐先跑它验收效果）与项目实战版 MiniGlobe.vue（13.9.2，对接卫星数据流）——旋转的纹理地球 + 大气辉光 + 星空 + 指定纹理卫星绕轨飞行 + 点击选中。写完这一节，你就具备了做出本项目 SatelliteView 页面的全部能力。

### 13.9.1 目标与准备

本节产出**两个可独立运行的最终版本**，功能完全一致（纹理地球自转 + 指定纹理卫星绕轨 + 交互控制），定位不同：

- **综合完整版 `06-FinalGlobe.vue`**：零外部依赖教学版——地球贴图走网络直链 + Canvas 兜底，组件自成一体，适合快速验收效果
- **项目实战版 `MiniGlobe.vue`**：对接卫星数据流（props 驱动），学习"3D 场景组件化封装"与生产写法（13.9.2）

**第一步：安装依赖**：

```bash
# 在 my-app 项目根目录执行（本项目 package.json 已含 three@0.186.1，可跳过）
npm install three
```

**第二步：准备纹理资源**（本课件的指定资源约定，一次配好全程通用）：

**★ 卫星纹理（指定资源，无需下载）**：源文件为 `E:\课件\my-app\src\assets\satellite-texture.png`。

- Vue 版：放在 src/assets 原位不动，代码中 `import satelliteTextureUrl from '@/assets/satellite-texture.png'`（Vite 自动打包）

**★ 地球纹理（网络获取，注明来源）**：本课件使用的地球贴图来自 **three.js 官方仓库的示例贴图库**（`mrdoob/three.js` 仓库 `examples/textures/planets/` 目录），其影像源自 **NASA 对地观测公开数据（蓝色大理石 Blue Marble 系列等）**，按 NASA 图片使用政策可免费使用与再分发（引用时注明 NASA 来源即可）。该系列贴图是等距圆柱投影（2:1 比例），与 `SphereGeometry` 的 UV 展开规则天然匹配（13.5.6），是 3D 球体贴图的标准选择。

三种获取渠道任选其一（内容完全相同）：

```bash
# 渠道一：threejs.org 官网直链（与官方示例同源）
#   https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg
# 渠道二：GitHub 仓库原始文件
#   https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg
# 渠道三：jsDelivr CDN 镜像（国内网络推荐）
#   https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_atmos_2048.jpg

# 浏览器打开上述任一地址 → 右键"图片另存为"；或用命令行下载（Windows PowerShell）：
Invoke-WebRequest -Uri "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg" -OutFile "earth_atmos_2048.jpg"
# macOS / Linux：
# curl -L -o earth_atmos_2048.jpg https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg
```

下载后放置位置（与示例运行方式配套）：

- Vue 版 → `my-app\public\textures\`（public 目录资源按原始路径访问：`/textures/earth_atmos_2048.jpg`；**本项目已提前下载好这 4 张**，可直接使用；示例 06 同时内置网络直链 + Canvas 兜底，不下载也能跑）

官方 planets 贴图清单（按需下载，本项目用到前四张）：

| 文件名 | 内容 | 材质通道 | 必要性 |
|---|---|---|---|
| earth_atmos_2048.jpg（约 500KB） | 地表颜色（含大气感） | map（颜色贴图，标 sRGB） | 必备 |
| earth_normal_2048.jpg | 地形凹凸法线 | normalMap（保持线性） | 推荐 |
| earth_specular_2048.jpg | 海洋高光遮罩 | specularMap | 推荐 |
| earth_clouds_1024.png | 云层（含透明通道） | 云球 map（标 sRGB） | 可选 |
| earth_lights_2048.png | 夜间城市灯光 | emissiveMap | 进阶 |
| earth_day_4096.jpg / earth_night_4096.jpg | 4K 昼/夜高清版 | 替换 map | 进阶 |

**最终效果验收标准（写完后逐条对照）**：

- 深空背景中一颗蓝色地球自转，大陆海洋清晰、边缘有淡蓝大气辉光
- 卫星显示为**指定纹理**（`satellite-texture.png`）图案，沿不同倾角的圆轨道绕地球飞行
- 鼠标拖拽旋转视角、滚轮缩放，松手后有阻尼惯性
- 点击某颗卫星：它变大变色，控制台输出它的名字
- 窗口缩放时画面自适应、无变形
- 任一纹理加载失败（断网/路径错）都有 Canvas 兜底，页面不黑屏

#### 13.9.1.1 最终交付效果（综合完整版）：FinalGlobe.vue

以下为**最终综合示例**（保存为 `my-app/src/components/ch13/06-FinalGlobe.vue`），融合全部知识点：网络地球贴图 + 云层 + 自转 + 菲涅尔大气辉光 + 星空 + 指定纹理卫星轨道运动 + 轨道线 + 点击拾取 + OrbitControls 交互 + 窗口自适应 + 失败回退 + 完整生命周期清理。每段注释标注对应章节：

```vue
<!-- src/components/ch13/06-FinalGlobe.vue —— 示例 06：3D 地球与卫星可视化（最终完整版） -->
<template>
  <div ref="containerRef" class="scene-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
// ★ 指定卫星纹理（13.9.1）：Vite import 方式引入，构建时自动指纹化打包
import satelliteTextureUrl from '@/assets/satellite-texture.png'

const containerRef = ref(null)

// Three.js 对象全部存普通变量（禁用响应式代理，原因见示例 01）
let scene, camera, renderer, controls
let earth, clouds, earthMat, cloudsMat, glowMat, starGeo
let satMatNormal, satMatSelected, satelliteTexture = null
let raycaster, animationId = null
const satSprites = []                            // 所有卫星 Sprite 汇总：拾取与动画统一遍历
const clock = new THREE.Clock()
const mouse = new THREE.Vector2()                // NDC 坐标容器（复用）

// ————————————————— 4. Canvas 兜底贴图（13.5.5）：任何贴图失败都不黑屏 ————————
function createFallbackEarth() {     // 经纬网格地球
  const canvas = document.createElement('canvas')
  canvas.width = 1024; canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0b2d6b'; ctx.fillRect(0, 0, 1024, 512)
  ctx.strokeStyle = 'rgba(140,190,255,0.28)'
  for (let i = 0; i <= 24; i++) { ctx.beginPath(); ctx.moveTo((i / 24) * 1024, 0); ctx.lineTo((i / 24) * 1024, 512); ctx.stroke() }
  for (let i = 0; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(0, (i / 12) * 512); ctx.lineTo(1024, (i / 12) * 512); ctx.stroke() }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
function createFallbackSat() {       // 暖金光点卫星
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30)
  g.addColorStop(0, 'rgba(255,225,160,1)')
  g.addColorStop(1, 'rgba(255,200,110,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ————————————————— 10. 点击拾取（13.7.1）：Raycaster + NDC ————————
// 命名函数：卸载时需从 canvas 上移除监听
function onPickSatellite(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1   // y 轴翻转
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(satSprites, false)  // 只检测卫星数组，避免撞上地球
  if (hits.length === 0) return
  satSprites.forEach((s) => { s.material = satMatNormal; s.scale.set(0.6, 0.6, 1) })  // 全部还原
  const hit = hits[0].object                                        // 最近命中
  hit.material = satMatSelected                                     // 选中：橙色 + 放大
  hit.scale.set(1.1, 1.1, 1)
  console.log('选中卫星：', hit.userData.name)
}

function initScene() {
  const container = containerRef.value

  // ————————————————— 1. 三大基石（13.3.3）————————————————
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000008)                     // 深空底色
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 2000)
  camera.position.set(0, 3, 15)                                    // 略俯视地球
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))     // 高清屏适配（13.8.3 超采样思路）
  container.appendChild(renderer.domElement)

  // ————————————————— 2. 交互控制（13.4.3）：拖拽旋转 + 滚轮缩放 + 阻尼 ————————
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true        // 阻尼惯性
  controls.dampingFactor = 0.05
  controls.rotateSpeed = 0.5           // 太空场景宜慢
  controls.minDistance = 7             // 防止镜头怼进地球（半径 5）
  controls.maxDistance = 40            // 防止缩放到看不见地球

  // ————————————————— 3. 光照（13.4.1）：环境光垫底 + 平行光造昼夜 ————————
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.0)
  sunLight.position.set(10, 5, 10)     // 方向 = position → target(默认原点)
  scene.add(sunLight)

  const EARTH_RADIUS = 5
  const maxAniso = renderer.capabilities.getMaxAnisotropy()        // GPU 各向异性上限（13.5.4）
  const textureLoader = new THREE.TextureLoader()

  // ————————————————— 5. 地球本体（13.5.1/13.5.2）+ 网络贴图异步升级（13.5.3）————
  earthMat = new THREE.MeshPhongMaterial({
    map: createFallbackEarth(),        // 同步占位：先有画面
    specular: new THREE.Color(0x333333),
    shininess: 14,
  })
  earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 96, 96), earthMat)
  scene.add(earth)
  textureLoader.load(
    // 地球颜色贴图：three.js 官方示例贴图（NASA 蓝色大理石，来源与下载见 13.9.1）
    // 离线运行可改为本地路径 '/textures/earth_atmos_2048.jpg'（my-app 的 public/ 已内置）
    'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace   // 颜色贴图必标 sRGB（13.5.4）
      tex.anisotropy = maxAniso               // 斜视角清晰度
      earthMat.map = tex
      earthMat.needsUpdate = true             // 换图后必须通知重编译
      console.log('[OK] 地球贴图加载成功')
    },
    undefined,
    () => console.warn('[回退] 地球贴图加载失败，保持 Canvas 兜底')
  )

  // ————————————————— 6. 云层（13.5.2）：半径 +0.8% 的半透明外壳 ————————
  cloudsMat = new THREE.MeshPhongMaterial({ transparent: true, depthWrite: false })
  clouds = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 1.008, 64, 64), cloudsMat)
  scene.add(clouds)
  textureLoader.load(
    'https://threejs.org/examples/textures/planets/earth_clouds_1024.png',
    (tex) => { tex.colorSpace = THREE.SRGBColorSpace; cloudsMat.map = tex; cloudsMat.needsUpdate = true },
    undefined,
    () => { clouds.visible = false; console.warn('[回退] 云图加载失败，隐藏云层') }
  )

  // ————————————————— 7. 大气辉光（13.7.3）：菲涅尔壳 + 加色混合 ————————
  glowMat = new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: new THREE.Color(0x4a90d9) } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(glowColor, intensity * 0.6);
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
  })
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 1.15, 64, 64), glowMat))

  // ————————————————— 8. 星空（13.7.2）：Points 粒子，一次绘制 2000 颗 ————————
  const starPos = new Float32Array(2000 * 3)
  for (let i = 0; i < 2000; i++) {
    const r = 200 + Math.random() * 200
    const u = Math.random() * 2 - 1              // u=cosφ 均匀 → 球面均匀分布
    const a = Math.random() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    starPos[i * 3] = r * s * Math.cos(a); starPos[i * 3 + 1] = r * u; starPos[i * 3 + 2] = r * s * Math.sin(a)
  }
  starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, sizeAttenuation: true })))

  // ————————————————— 9. 卫星（13.6）：共享材质 + 指定纹理异步升级 + 倾斜轨道 ————
  // 卫星贴图 = 指定资源 satellite-texture.png（import 引入，见本文件顶部）
  satMatNormal = new THREE.SpriteMaterial({ map: createFallbackSat(), transparent: true, depthWrite: false })
  satMatSelected = new THREE.SpriteMaterial({ map: createFallbackSat(), color: 0xffa030, transparent: true, depthWrite: false })
  // 两个共享材质复用同一张贴图：占位图先顶上，真图到位后整体替换
  textureLoader.load(
    satelliteTextureUrl,                         // ★ 指定卫星纹理（Vite 处理后的 URL）
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = maxAniso
      tex.generateMipmaps = true                 // mipmap 金字塔：远处卫星不闪烁（13.6.2）
      tex.minFilter = THREE.LinearMipmapLinearFilter
      satelliteTexture = tex                     // 记录引用，卸载时释放
      satMatNormal.map = tex                     // 两个材质同步换装
      satMatSelected.map = tex
      satMatNormal.needsUpdate = true
      satMatSelected.needsUpdate = true
      console.log('[OK] 指定卫星纹理加载成功')
    },
    undefined,
    () => console.warn('[回退] 卫星纹理加载失败，保持 Canvas 光点（检查 src/assets/satellite-texture.png）')
  )

  // 16 颗卫星 × 各自倾斜轨道 Group（13.4.2 分层）：卫星与轨道线同组，天然对齐
  // satSprites：所有卫星 Sprite 的汇总数组——拾取与动画统一遍历它（不必非得是 Group 才能检测）
  const SAT_COUNT = 16
  for (let i = 0; i < SAT_COUNT; i++) {
    const incl = (i / SAT_COUNT) * Math.PI       // 轨道倾角 0~π 均匀分布（含极轨）
    const radius = 6.2 + (i % 4) * 0.55          // 轨道半径分 4 层
    const orbitGroup = new THREE.Group()
    orbitGroup.rotation.x = incl                 // 倾斜轨道面
    scene.add(orbitGroup)
    // 轨道线（13.6.5）：LineLoop 首尾闭合
    const points = []
    for (let k = 0; k <= 128; k++) {
      const t = (k / 128) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius))
    }
    orbitGroup.add(new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.25 })
    ))
    // 卫星 Sprite（13.6.2）：加入轨道组 → 自动继承倾角；userData 挂业务数据
    const sprite = new THREE.Sprite(satMatNormal)
    sprite.scale.set(0.6, 0.6, 1)
    sprite.userData = {
      name: `SAT-${String(i + 1).padStart(2, '0')}`,
      radius, phase: Math.random() * Math.PI * 2, speed: 0.25 + Math.random() * 0.2,
    }
    orbitGroup.add(sprite)
    satSprites.push(sprite)
  }

  // 点击拾取监听挂在 canvas 上（命名函数，卸载时解绑）
  raycaster = new THREE.Raycaster()
  renderer.domElement.addEventListener('click', onPickSatellite)

  window.addEventListener('resize', onResize)
}

// ————————————————— 11. 渲染循环（13.3.4）：dt 增量，动画与帧率解耦 ————————
function animate() {
  animationId = requestAnimationFrame(animate)
  const dt = clock.getDelta()
  const t = clock.elapsedTime
  earth.rotation.y += 0.05 * dt               // 地球自转
  clouds.rotation.y += 0.065 * dt             // 云层差速流动
  satSprites.forEach((s) => {                 // 卫星轨道运动：本地 XZ 平面圆周 + 倾角变换
    const d = s.userData
    const theta = d.phase + t * d.speed
    s.position.set(Math.cos(theta) * d.radius, 0, Math.sin(theta) * d.radius)
      .applyAxisAngle(new THREE.Vector3(1, 0, 0), s.parent.rotation.x)  // parent 即倾斜的轨道组
  })
  controls.update()                           // 阻尼必须每帧刷新
  renderer.render(scene, camera)
}

// ————————————————— 12. 窗口自适应（13.3.5）————————————————
function onResize() {
  const container = containerRef.value
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()             // 必须手动重算投影矩阵
  renderer.setSize(container.clientWidth, container.clientHeight)
}

// onMounted：DOM 就绪后初始化并启动渲染循环
onMounted(() => {
  initScene()
  animate()
})

// ————————————————— 13. 卸载清理（13.8.6）：Vue 组件化的必修课 ————————
// 独立页面无需卸载，但 Vue 组件会随路由切换反复挂载/销毁——
// 不完整清理会导致 WebGL 上下文泄漏（浏览器上限约 16 个）与"幽灵渲染循环"
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  renderer.domElement.removeEventListener('click', onPickSatellite)
  cancelAnimationFrame(animationId)           // ① 停渲染循环
  controls.dispose()                          // ② 释放控制器事件
  // ③ 释放贴图（网络图 + 卫星图 + 两个兜底 Canvas 图）
  if (earthMat.map) earthMat.map.dispose()
  if (cloudsMat.map) cloudsMat.map.dispose()
  if (satelliteTexture) satelliteTexture.dispose()
  earthMat.dispose(); cloudsMat.dispose()     // ④ 释放材质
  satMatNormal.dispose(); satMatSelected.dispose()
  glowMat.dispose()                           // ⑤ 释放着色器程序
  starGeo.dispose()                           // ⑥ 释放粒子顶点缓冲
  scene.traverse(obj => {                     // ⑦ 遍历释放其余几何体/材质/轨道线
    if (obj.geometry && obj.geometry !== starGeo) obj.geometry.dispose()
    if (obj.material && obj.material !== satMatNormal && obj.material !== satMatSelected
        && obj.material !== glowMat && obj.material !== earthMat && obj.material !== cloudsMat) {
      obj.material.dispose()
    }
  })
  renderer.dispose()                          // ⑧ 释放渲染器与 WebGL 上下文
  renderer.domElement.remove()                // ⑨ 移除 canvas DOM 节点
})
</script>

<style scoped>
.scene-container { width: 100%; height: 100vh; overflow: hidden; }
</style>
```

> 实现细节说明：第 9 步每颗卫星 Sprite `add` 进自己的 `orbitGroup`，自动继承轨道面倾角（`s.parent.rotation.x` 即倾角）；同时把 Sprite 引用收进 `satSprites` 汇总数组，拾取与动画遍历它即可——`raycaster.intersectObjects` 接受**任意对象数组**，不要求是某个 Group 的 children。对比示例 05 的"单一卫星组"方案：两种组织方式等价，按"是否需要每颗卫星独立父变换"来选择。第 13 步的卸载清理是 Vue 版独有的必修内容：路由切换会销毁组件，若不执行"停循环 → 解绑事件 → 逐层 dispose → 销毁上下文"，反复进出页面会耗尽浏览器的 WebGL 上下文配额（约 16 个），页面直接黑屏。

**示例 06 新写法速览：零个新写法——这是对示例 01~05 的综合验收**

逐行检查后确认：本例**不含任何"此前课件从未出现"的写法**，16 段代码全部由前五例的零件拼装而成（每段注释已标注出处章节）。

与示例 05 写法不同的只有两处组织方式差异（不是新 API，已在上方实现细节说明中解释）：

- ① 拾取目标从 `satelliteGroup.children` 换成 `satSprites` 普通数组——`intersectObjects` 接受**任意对象数组**，不要求是 Group 的 children
- ② 轨道倾斜从示例 05 的"位置算好后 applyAxisAngle"换回示例 04 的"倾斜 Group + 本地圆周"，动画里 `applyAxisAngle` 的轴倾角直接读 `s.parent.rotation.x`（卫星的父级就是倾斜轨道组，省去重复存储）

课堂建议：先遮住代码自己按注释拼，哪一段卡住就回跳对应示例（如 ⑦ 大气辉光卡住 → 回看 13.7.3 与示例 05）；逐段的"代码 ↔ 章节"精读对照表见 13.9.3。

运行验收：对照 13.9.1 的验收标准逐条检查。控制台应依次输出"地球贴图加载成功""指定卫星纹理加载成功"；任一失败会输出对应回退警告且画面依旧完整。

### 13.9.2 完整代码：MiniGlobe.vue

以下代码约 250 行，每个函数都能在前面章节找到出处。先整体抄写运行起来，再回头逐段精读（注释里标注了对应章节）。

```vue
<!-- src/components/MiniGlobe.vue —— 教学完整版：地球 + 卫星 + 交互 -->
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const containerRef = ref(null)

// —— 模块级核心对象（非响应式：Three.js 对象进 reactive 会出问题，见 13.3.2）——
let scene, camera, renderer, controls, earthMesh, satelliteGroup, raycaster
let animationId
let earthMat, glowMat, starGeo                 // 地球材质/辉光材质/星空几何体（卸载时要释放）
let satTexture, satMatNormal, satMatSelected   // 卫星共享贴图与材质（13.6.2）
const satelliteMeshes = new Map()   // noradId → Sprite（增量同步，见 13.6.4）
const EARTH_RADIUS = 5              // 地球半径（世界单位）
const ALT_SCALE = EARTH_RADIUS / 6371  // 高度换算：公里 → 世界单位

// ————————————————————————————————
// 1. 经纬高 → 3D 坐标（13.5.6）
// ————————————————————————————————
function latLngAltToVector3(lat, lng, altKm, radius, scale) {
  const r = radius + altKm * scale     // 轨道半径 = 地球半径 + 高度换算
  const phi = (lat * Math.PI) / 180    // 纬度 → 弧度
  const theta = (lng * Math.PI) / 180  // 经度 → 弧度
  // 与 13.5.6 完全相同的公式：经度 0° 在 +X、东经沿 -Z（对齐贴图 UV）
  return new THREE.Vector3(
    r * Math.cos(phi) * Math.cos(theta),
    r * Math.sin(phi),
    -r * Math.cos(phi) * Math.sin(theta)
  )
}

// ————————————————————————————————
// 2. 兜底地球贴图：深蓝海洋 + 经纬网格（13.5.5 CanvasTexture）
// ————————————————————————————————
function createEarthTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0b2d6b'                       // 深蓝海洋
  ctx.fillRect(0, 0, 1024, 512)
  ctx.strokeStyle = 'rgba(140,190,255,0.28)'      // 淡蓝经纬网格
  ctx.lineWidth = 1
  for (let i = 0; i <= 24; i++) {                 // 24 条经线（每 15°）
    const x = (i / 24) * 1024
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke()
  }
  for (let i = 0; i <= 12; i++) {                 // 12 条纬线（每 15°）
    const y = (i / 12) * 512
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace           // 颜色贴图必须标记 sRGB（13.5.4）
  return tex
}

// ————————————————————————————————
// 3. 卫星光点贴图（径向渐变圆点，13.5.5 CanvasTexture + 13.6.2 共享材质）
// ————————————————————————————————
function createSatelliteTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30)
  g.addColorStop(0, 'rgba(255,225,160,1)')        // 中心暖金
  g.addColorStop(0.35, 'rgba(255,200,110,0.85)')
  g.addColorStop(1, 'rgba(255,200,110,0)')        // 边缘透明（Sprite 必须透明底）
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ————————————————————————————————
// 4. 模拟卫星数据：简化圆轨道模型
//    （生产版换成 SGP4 真实轨道，见 13.6.1；模型足够讲清渲染与交互）
// ————————————————————————————————
// Array.from({ length }, mapFn)：按长度生成数组，mapFn(值, 下标) 逐项映射；
// _ 是"这个参数用不到"的惯用占位符
const MOCK_SATS = Array.from({ length: 24 }, (_, i) => ({
  noradId: String(10000 + i),
  name: `MOCK-${String(i + 1).padStart(2, '0')}`,   // padStart(2, '0')：补前导零，1 → '01'
  inclination: 20 + Math.random() * 60,   // 轨道倾角（度）：决定纬度摆动范围
  phase: Math.random() * Math.PI * 2,     // 初始相位：让 24 颗散布轨道各处
  speed: 0.12 + Math.random() * 0.1,      // 角速度（弧度/秒）
  altitude: 600 + Math.random() * 2000,   // 轨道高度（公里）
}))

/** t 秒时刻第 sat 颗卫星的经纬高（简化圆轨道：纬度按倾角正弦摆动、经度匀速漂移） */
function mockPosition(sat, t) {
  const theta = sat.phase + t * sat.speed
  return {
    latitude: sat.inclination * Math.sin(theta),
    longitude: ((theta * 57.3) % 360) - 180,    // 57.3 ≈ 180/π：弧度转度
    height: sat.altitude,
  }
}

// ————————————————————————————————
// 5. 初始化场景（13.3 三大基石 + 13.4 光照与控制器）
// ————————————————————————————————
function initScene() {
  const container = containerRef.value
  const width = container.clientWidth
  const height = container.clientHeight

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000010)          // 深空底色

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000)
  camera.position.set(0, 3, 15)

  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio * 1.5, 2))  // SSAA 超采样（13.8.3）
  container.appendChild(renderer.domElement)

  // 轨道控制器：拖拽旋转 + 滚轮缩放 + 阻尼惯性（13.4.3）
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 7
  controls.maxDistance = 40

  // 光照：环境光打底 + 平行光造昼夜（13.4.1）
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))
  const sun = new THREE.DirectionalLight(0xffffff, 1.0)
  sun.position.set(10, 5, 10)
  scene.add(sun)

  // —— 地球：真实贴图异步升级 + 网格兜底（13.5.3 同款策略）——
  earthMat = new THREE.MeshPhongMaterial({
    map: createEarthTexture(),        // 同步占位：先有画面
    specular: new THREE.Color(0x333333),
    shininess: 12,
  })
  earthMesh = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 64, 64), earthMat)
  scene.add(earthMesh)
  new THREE.TextureLoader().load(
    '/textures/earth_atmos_2048.jpg',
    (tex) => {                        // 成功：换真图
      tex.colorSpace = THREE.SRGBColorSpace
      earthMat.map = tex
      earthMat.needsUpdate = true     // 材质参数变更后必须置 true！
    },
    undefined,
    () => console.warn('地球贴图加载失败，使用网格兜底贴图')
  )

  // —— 大气辉光：菲涅尔着色器（13.7.3 原样照搬）——
  glowMat = new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: new THREE.Color(0x4a90d9) } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(glowColor, intensity * 0.6);
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
  })
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 1.15, 64, 64), glowMat))

  // —— 星空：Points + Float32Array（13.7.2）——
  const starPos = new Float32Array(1500 * 3)
  for (let i = 0; i < 1500; i++) {
    const r = 200 + Math.random() * 600
    // 球面均匀采样（与 13.7.2 的 acos 法等价）：u = cosφ 均匀取值，a = 方位角
    const u = Math.random() * 2 - 1
    const a = Math.random() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    starPos[i * 3] = r * s * Math.cos(a)
    starPos[i * 3 + 1] = r * u
    starPos[i * 3 + 2] = r * s * Math.sin(a)
  }
  starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 1.2, sizeAttenuation: true,
  })))

  // —— 卫星：共享材质（全部 24 颗只用 1 张贴图 + 2 个材质，13.6.2）——
  satTexture = createSatelliteTexture()
  satMatNormal = new THREE.SpriteMaterial({ map: satTexture, transparent: true, depthWrite: false })
  satMatSelected = new THREE.SpriteMaterial({
    map: satTexture, transparent: true, depthWrite: false,
    color: 0xff8830,          // 选中态：橙色染色
  })
  satelliteGroup = new THREE.Group()
  scene.add(satelliteGroup)

  // —— 射线拾取（13.7.1）——
  raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  renderer.domElement.addEventListener('click', (event) => {
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(satelliteGroup.children, false)
    if (hits.length > 0) {
      const sprite = hits[0].object
      // userData：Object3D 的自定义数据挂载点（创建 Sprite 时存了卫星名）
      console.log('选中卫星：', sprite.userData.name)
      // 互斥高亮：全部先还原普通材质
      for (const s of satelliteMeshes.values()) {
        s.material = satMatNormal
        s.scale.set(0.5, 0.5, 1)
      }
      sprite.material = satMatSelected      // 选中态：换材质 + 放大
      sprite.scale.set(0.9, 0.9, 1)
    }
  })

  window.addEventListener('resize', onResize)
  animate()
}

// ————————————————————————————————
// 6. 渲染循环：dt 增量动画（13.3.4）
// ————————————————————————————————
let lastTime = performance.now() / 1000
let elapsed = 0          // 累计时间：喂给模拟轨道函数

function animate() {
  animationId = requestAnimationFrame(animate)
  const now = performance.now() / 1000
  const dt = now - lastTime
  lastTime = now
  elapsed += dt

  earthMesh.rotation.y += 0.03 * dt        // 地球自转（角速度与帧率解耦）

  // 卫星位置更新：教学版 24 颗模拟卫星需要连续飞行观感，
  // 逐帧更新 24 个位置的开销可忽略——生产版卫星多且位置 2 秒
  // 才变一次，改为"数据驱动更新"（13.8.5）：规则要理解，破例要有理由
  MOCK_SATS.forEach((sat) => {
    const pos = mockPosition(sat, elapsed)
    const v = latLngAltToVector3(pos.latitude, pos.longitude, pos.height, EARTH_RADIUS, ALT_SCALE)
    let sprite = satelliteMeshes.get(sat.noradId)
    if (!sprite) {
      sprite = new THREE.Sprite(satMatNormal)
      sprite.scale.set(0.5, 0.5, 1)
      sprite.userData.name = sat.name
      satelliteGroup.add(sprite)
      satelliteMeshes.set(sat.noradId, sprite)
    }
    sprite.position.copy(v)
  })

  controls.update()                        // 阻尼惯性（每帧必须调用）
  renderer.render(scene, camera)
}

/** 窗口自适应（13.3.5）：改完尺寸立即补渲染一帧防白屏 */
function onResize() {
  if (!containerRef.value) return
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
  renderer.render(scene, camera)
}

// ————————————————————————————————
// 7. 生命周期：挂载初始化、卸载释放（13.8.6 七件事）
// ————————————————————————————————
onMounted(initScene)

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)               // 1. 停渲染循环
  window.removeEventListener('resize', onResize)   // 2. 解绑全局事件
  satelliteMeshes.clear()                         // 3. 清空卫星表
  // 4. 释放共享 GPU 资源（?. 可选链：非 null 才调用，防未初始化报错）
  satTexture?.dispose()
  satMatNormal?.dispose()
  satMatSelected?.dispose()
  earthMat?.map?.dispose()     // 地球贴图（兜底网格或升级后的真图）
  earthMat?.dispose()
  glowMat?.dispose()           // 大气辉光材质
  starGeo?.dispose()           // 星空几何体
  if (renderer) {
    renderer.dispose()                            // 5. 销毁 WebGL 上下文
    renderer.domElement.parentNode?.removeChild(renderer.domElement)  // 6. 移除画布
    renderer = null
  }
})
</script>

<template>
  <div ref="containerRef" class="globe-container"></div>
</template>

<style scoped>
.globe-container {
  width: 100%;
  height: 100vh;   /* 全屏画布：容器必须有明确宽高，否则 clientHeight=0 画布不可见 */
  display: block;
}
</style>
```

在任意路由页面（或 App.vue）中挂载即可看到效果：

```vue
<script setup>
import MiniGlobe from '@/components/MiniGlobe.vue'
</script>

<template>
  <MiniGlobe />
</template>
```

【注意】最常见的"跑起来一片黑"原因排序：

- ① 容器没有高度（canvas 尺寸 0×0）——检查 .globe-container 是否有明确 height
- ② 组件被 Vue 的响应式系统包裹（不要把 Three.js 对象放进 ref/reactive）
- ③ 相机在地球内部（position.set(0, 3, 15) 距球心 15 > 半径 5，正常不会犯，但改参数时留意）
- ④ 贴图路径 404（public/textures/ 下文件名是否一致——不过本例有兜底贴图，404 只会警告不黑屏）

#### 13.9.2.1 接入指定卫星纹理（升级 MiniGlobe）

13.9.2 的 MiniGlobe 卫星用的是 Canvas 光点贴图。按 13.6.2 的"同步占位 + 异步升级"模式接入**指定卫星纹理**（源文件 `E:\课件\my-app\src\assets\satellite-texture.png`），两处改动：

① 文件顶部 import 区新增一行：

```js
import satelliteTextureUrl from '@/assets/satellite-texture.png'  // Vite 静态资源导入：返回打包后的可访问 URL
```

② initScene() 中"卫星：共享材质"小节改为（Canvas 光点先占位，真图到位后两个共享材质同步替换）：

```js
  // —— 卫星：共享材质（同步占位 + 异步升级指定纹理，13.6.2）——
  const maxAniso = renderer.capabilities.getMaxAnisotropy()   // 各向异性上限（须在创建 renderer 之后读取）
  satTexture = createSatelliteTexture()                       // Canvas 光点占位：先有画面
  satMatNormal = new THREE.SpriteMaterial({ map: satTexture, transparent: true, depthWrite: false })
  satMatSelected = new THREE.SpriteMaterial({
    map: satTexture, transparent: true, depthWrite: false,
    color: 0xff8830,          // 选中态：橙色染色
  })
  new THREE.TextureLoader().load(
    satelliteTextureUrl,      // ★ 指定卫星纹理（src/assets/satellite-texture.png）
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = maxAniso
      satMatNormal.map = tex        // 两个共享材质同步换装：24 颗卫星瞬间换新贴图
      satMatSelected.map = tex
      satMatNormal.needsUpdate = true
      satMatSelected.needsUpdate = true
      satTexture.dispose()          // 占位纹理已无人引用，释放其显存
    },
    undefined,
    () => console.warn('指定卫星纹理加载失败，保持 Canvas 光点')
  )
```

【注意】占位纹理在替换回调里已手动 dispose；onBeforeUnmount 清理清单中的 `satTexture?.dispose()` 会再次对它调用 dispose——重复 dispose 在 Three.js 内部是幂等安全的，无需特殊处理。升级后真实纹理由 satMatNormal.map / satMatSelected.map 引用，卸载时优先释放材质的 map（13.8.6 的清理原则）。

### 13.9.3 精读指南：这段代码如何对应八个章节

抄完跑通只是第一步。按下表逐段精读，每一行都能回答"为什么这么写"才算掌握：

| 代码位置 | 对应章节 | 必须能回答的问题 |
|---------|---------|----------------|
| initScene 前半（scene/camera/renderer） | 13.3.1~13.3.3 | 45°/0.1/2000 各控制什么？为什么要 appendChild？ |
| animate 的 dt 计算 | 13.3.4 | 为什么不直接写 rotation.y += 0.0005？ |
| onResize | 13.3.5 | 为什么末尾要立即 render 一次？ |
| 光照两行 + OrbitControls | 13.4 | 去掉环境光会怎样？去掉平行光呢？ |
| createEarthTexture + TextureLoader | 13.5.3~13.5.4 | colorSpace 什么时候设？needsUpdate 为什么必须？ |
| latLngAltToVector3 | 13.5.6 | z 为什么取负号？与 13.5.6 的推导如何对应？ |
| 共享材质 + satelliteMeshes Map | 13.6.2~13.6.4 | 24 颗卫星创建了几张贴图、几个材质？ |
| click 事件的 mouse.x/y 计算 | 13.7.1 | y 为什么要取负？ |
| ShaderMaterial 大气辉光 | 13.7.3 | BackSide 渲染的是球的哪一面？ |
| onBeforeUnmount | 13.8.6 | 少写 dispose 会怎样？什么时候发作？ |

### 13.9.4 升级路径：从教学版到生产版

教学版刻意简化了四件事。对照本项目生产代码逐项升级，就是你的课后进阶路线：

| 教学版（简化） | 生产版（本项目实现） | 去哪里学 |
|---------------|---------------------|---------|
| 模拟圆轨道（mockPosition） | TLE + SGP4 真实轨道（satellite.js：twoline2satrec/propagate/eciToGeodetic） | 13.6.1~13.6.2；源码 src/utils/satelliteMath.js |
| 每帧更新卫星位置 | 2 秒刷新数据 + 浅 watch + Map 增量同步（帧内零开销） | 13.6.4、13.8.5；src/composables/useSatellite.js |
| 网格兜底 + 单张贴图 | NASA 蓝色大理石三贴图（地表/法线/高光）+ 独立云层 + EPIC 实拍影像异步升级 | 13.5.2、13.5.3；src/components/Globe3D.vue 的 createEarth |
| 无节流无降档 | 60fps 节流 + 动态分辨率阶梯（1.5→1.3→1.15→1.0 可自愈） | 13.8.2、13.8.4 |
| 无轨道线 | 选中卫星绘制轨道线（BufferGeometry.setFromPoints + LineBasicMaterial） | 13.6.5 |

完成全部五项升级后，你得到的就是本项目的 Globe3D.vue——它正是这套课件的终点，也是你 3D 前端之路的起点。

## 13.10 课后作业

**作业一（基础）：会呼吸的太阳**

不加载任何贴图，用 SphereGeometry + MeshBasicMaterial（自发光材质，不需要光照）做一个橙红色太阳，再用 13.7.4 的正弦呼吸模板让它的发光外壳（半径 1.3 倍的 BackSide 辉光球）周期 3 秒明暗脉动。

- 考点：MeshBasicMaterial 与 MeshPhongMaterial 的区别（13.5.2）、呼吸动画模板（13.7.4）
- 提示：MeshBasicMaterial 的 color 不受光照影响，适合"自发光"天体

**作业二（基础）：轨道倾角可视化**

修改 13.9 的 MOCK_SATS：把 inclination 统一改为 0、30、60、90 四组（各 6 颗），观察卫星带形态变化；再给不同倾角组分配不同颜色（4 个共享材质）。

- 考点：轨道倾角与纬度摆动的关系（13.9.2 mockPosition）、共享材质按状态分组（13.6.2）
- 提示：90° 倾角组的卫星会飞越南北极

**作业三（进阶）：悬停高亮**

给 MiniGlobe 增加 mousemove 悬停效果：鼠标悬停在某颗卫星上时光标变 pointer、该卫星轻微放大 1.2 倍；移开后还原。悬停不应与点击选中冲突。

- 考点：Raycaster 复用（13.7.1）、事件监听解绑（onBeforeUnmount 里要 removeEventListener mousemove）
- 提示：mousemove 每秒触发几十次，raycaster.intersectObjects 的结果要缓存判断"悬停对象是否变化"再操作 DOM，避免每帧改 cursor

**作业四（进阶）：真实轨道接入**

从 Celestrak（celestrak.org）手动复制 5 颗卫星的 TLE 数据（ISS、北斗、星链各挑几颗），硬编码进项目。用 satellite.js 的 twoline2satrec + propagate 计算真实位置，替换 mockPosition。

- 考点：TLE 数据结构与 SGP4 调用链（13.6.1）、eciToGeodetic 单位换算（弧度→度）
- 提示：TLE 是"发布时刻"的快照，propagate 传入当前时刻即可得到"现在"的位置；注意 eciToGeodetic 返回的经纬度是弧度，要 × 180/π（或直接用 satellite.degreesLat / degreesLong 转度）

**作业五（挑战）：帧率监视器**

给 MiniGlobe 加一个左上角 HUD：用 requestAnimationFrame 统计最近 60 帧平均帧率（红色显示 <50、绿色显示 ≥50），并实现 13.8.4 的动态分辨率阶梯。然后打开 Chrome DevTools 的 Performance 面板录制 10 秒，对比降档前后的帧率曲线。

- 考点：帧耗时统计（13.8.2）、动态分辨率完整实现（13.8.4）、性能面板使用（13.8.1）
- 提示：故意把 SSAA 倍率改成 3.0 制造 GPU 压力，观察降档触发

## 13.11 推荐学习资源

**官方贴图资源（本课件地球纹理的来源，获取步骤见 13.9.1）**

- three.js 官方示例贴图库（planets 目录）：threejs.org/examples/textures/planets/——地球昼/夜/云/法线/高光等全套贴图，影像源自 NASA 对地观测公开数据（蓝色大理石 Blue Marble 系列），可免费使用（引用注明 NASA 来源）
- 同一资源的三个镜像地址：threejs.org 官网直链 / raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/ / cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/（国内推荐）

**官方文档（首选，遇到 API 疑问先查这里）**

- Three.js 官方文档：threejs.org/docs——所有类的参数表、所有示例源码；r150+ 版本文档与本项目 r186 API 一致
- Three.js 官方示例库：threejs.org/examples——按功能分类（webgl/controls/loader），每个示例都可在线运行并查看源码，是学习"某个效果怎么写"的最快途径

**深入 WebGL 与着色器**

- 《WebGL 编程指南》（Kouichi Matsuda）：理解 Three.js 背后的原始 WebGL——顶点缓冲、着色器编译、矩阵变换。读懂它，13.7 的 GLSL 就不再是"能抄但不会改"
- MDN WebGL 教程：developer.mozilla.org 的 WebGL 系列，免费且权威
- The Book of Shaders（thebookofshaders.com）：专门练片元着色器，交互式调节参数，做特效的必修课

**卫星与太空数据**

- satellite.js GitHub（github.com/shashwatak/satellite.js）：SGP4 的 JavaScript 实现，README 有完整的 TLE→位置计算示例
- Celestrak（celestrak.org）：免费 TLE 数据源，可按卫星组（活跃卫星/星链/北斗）下载；注意频繁请求会被限流，缓存 2 小时（本项目经验）
- NASA Open APIs（api.nasa.gov）：APOD 每日天文图、NeoWs 近地天体、EPIC 地球实拍——申请免费 API Key 即可使用

**本项目源码导读顺序（配合本课件复习）**

1. src/components/MiniGlobe.vue（13.9 的教学版，自己写的）
2. src/utils/satelliteMath.js——坐标转换与 SGP4 封装（对应 13.5.6、13.6）
3. src/composables/useSatellite.js——响应式数据层设计（对应 13.6.4）
4. src/components/Globe3D.vue——生产版全量实现（对应全部章节，1819 行，逐段对照课件精读）
5. src/components/Seismoscope3D.vue——CanvasTexture 高阶应用：环形文字贴图、ExtrudeGeometry 挤出几何（对应 13.5.5 的拓展）

**学习路线建议**

第 1~2 周：把本课件 13.9 的 MiniGlobe 写到脱稿能复现，完成作业一~三。第 3~4 周：接入真实 TLE 数据（作业四），精读 Globe3D.vue。之后：挑一个自己感兴趣的方向深入——特效着色器（The Book of Shaders）、加载外部模型（GLTFLoader + Blender 建模）、或物理引擎（cannon-es）。3D 前端的知识半径很大，但入口你已经走完了。

---

## 本日总结

今天我们从 WebGL 的概念层一路打到生产级优化，核心脉络四条：

1. **骨架**：Scene + Camera + Renderer 三大基石，requestAnimationFrame 驱动，dt 增量解耦帧率，resize 补渲染防白屏
2. **内容**：Geometry + Material + Texture 三件套造万物；经纬高→3D 坐标的球面数学是"地图上球"的桥梁
3. **动效与交互**：OrbitControls 相机、Raycaster 拾取、ShaderMaterial 菲涅尔辉光、AdditiveBlending 呼吸警示——所有"发光/脉动"效果都是这两板斧
4. **性能纪律**：帧内零逐对象开销、共享资源、SSAA 替代 MSAA、动态分辨率可自愈、卸载七件事释放显存
5. **工程交付**：全部示例以 Vue 3 SFC 组件交付并在 my-app（Vite）中运行（13.3.2.1）；六个示例组件（01~06）逐层递进，06 FinalGlobe.vue 是"纹理地球自转 + 指定纹理卫星绕轨 + 交互控制"的最终验收版；纹理资源全部有来源、路径与回退方案（13.9.1）

明天不见不散——接下来的课程将进入 TypeScript 类型体操与工程化实战。


