<template>
  <div>
    <el-container>
      <el-header class="header">
        <div class="nav">
          <RouterLink to="/">
            <el-button type="primary">
              <span>
                <el-icon><HomeFilled /></el-icon>
              </span>
              返回首页</el-button
            >
          </RouterLink>
          <h1>卫星视图</h1>
        </div>
        <div class="nav">
          <el-button circle @click="themeStore.toggleTheme()">
            <el-icon><Moon v-if="themeStore.theme === 'dark'" /><Sunny v-else /></el-icon>
          </el-button>
          <el-button type="danger" @click="celeInfoVisible = true">
            近地天体
            <span
              ><span>
                <el-icon><WarnTriangleFilled /></el-icon> </span
              >{{ danger_total }}</span
            >
          </el-button>
          <el-button type="primary" @click="knowledgeVisible = true">
            <span>
              <el-icon><InfoFilled /></el-icon>
            </span>
            科普</el-button
          >
        </div>
      </el-header>
      <el-container>
        <el-aside width="200px" class="aside">
          <div class="aside-title">卫星列表</div>
          <el-input
            v-model="searchText"
            maxlength="20"
            placeholder="搜索卫星"
            show-word-limit
            type="text"
          />
          <el-scrollbar height="calc(100vh - 140px)">
            <el-table :data="filteredTleList" @row-click="selectSatellite" row-key="noradId">
              <el-table-column prop="name" label="名称" />
              <el-table-column prop="noradId" label="NORAD" width="80" />
            </el-table>
          </el-scrollbar>
        </el-aside>
        <el-main class="main-area">
          <Globe3D
            :issPosition="issPosition"
            :neoFeed="neoFeed"
            :tleList="tleList"
            @tleView="handleTleView"
            @issInfo="handleIssInfo"
            @celeInfo="handleCeleInfo"
            :selectedNoradId="selectedNoradId"
          />
          <TLEView
            v-if="TleInfo"
            :tleInfo="TleInfo"
            :visible="TleVisible"
            @closeModal="closeTLEView"
          />
          <ISSView
            v-if="issInfo"
            :issInfo="issInfo"
            :visible="issVisible"
            @closeModal="issVisible = false"
          />
          <CeleView
            v-if="celeInfo"
            :celeInfo="celeInfo"
            :visible="celeVisible"
            @closeModal="celeVisible = false"
          />
          <KnowledgeView
            :visible="knowledgeVisible"
            v-if="knowledgeVisible"
            @closeModal="knowledgeVisible = false"
          />

          <NeoInfoView
            :neoCount="neoCount"
            :neoFeed="neoFeed"
            :danger_total="danger_total"
            :visible="celeInfoVisible"
            v-if="celeInfoVisible"
            @closeModal="celeInfoVisible = false"
          />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>
<script setup lang="ts">
import Globe3D from '@/components/Globe3D.vue'
import { ref, onUnmounted, computed } from 'vue'
import {
  getSatelliteTleWithCache,
  getIssPosition,
  type IssObject,
  getNeoFeedWithCache,
  satelliteCache,
} from '@/api/spaceApi'
import { useThemeStore } from '@/stores/themeStore'

const themeStore = useThemeStore()
// 先用本地缓存同步预填，首屏立即可渲染卫星；接口返回后再覆盖
const tleList = ref<any[]>(satelliteCache.get() ?? [])
const issPosition = ref<IssObject>()
const neoFeed = ref<any[]>([])
const neoCount = ref(0)

getSatelliteTleWithCache().then((res) => {
  tleList.value = res || []
})

getIssPosition().then((res) => {
  issPosition.value = res.data
})

const timer = setInterval(() => {
  getIssPosition().then((res) => {
    issPosition.value = res.data
  })
}, 60000)

getNeoFeedWithCache().then((data) => {
  neoCount.value = data.element_count || 0
  const tempList = Object.entries(data.near_earth_objects).map(([dateStr, rawAsterArr]) => {
    // rawAsterArr 就是你截图里的数组，里面每一项是原始neo对象
    const formatAster = rawAsterArr.map((item: any) => {
      const ca = item.close_approach_data?.[0] ?? {}
      return {
        id: item.id,
        name: item.name,
        diameterMin: item.estimated_diameter.kilometers.estimated_diameter_min,
        diameterMax: item.estimated_diameter.kilometers.estimated_diameter_max,
        closeDate: ca.close_approach_date,
        velocity: ca.relative_velocity?.kilometers_per_second,
        missKm: ca.miss_distance?.kilometers,
        isHazard: item.is_potentially_hazardous_asteroid,
        ld: ca.miss_distance?.lunar,
      }
    })
    return {
      date: dateStr,
      arrList: formatAster,
    }
  })
  neoFeed.value = tempList
})

const danger_total = computed(() => {
  return neoFeed.value.reduce((acc: number, cur: any) => {
    return acc + cur.arrList.reduce((acc: number, cur: any) => acc + (cur.isHazard ? 1 : 0), 0)
  }, 0)
})

const TleInfo = ref(null)
const TleVisible = ref(false)
// 点击卫星弹窗
const handleTleView = (tle: any) => {
  if (TleVisible.value) {
    closeTLEView()
  }
  selectedNoradId.value = tle.noradId
  TleInfo.value = tle
  TleVisible.value = true
}
// 关闭卫星弹窗
const closeTLEView = () => {
  TleVisible.value = false
  selectedNoradId.value = ''
}

const issInfo = ref(null)
const issVisible = ref(false)
// 点击ISS弹窗
const handleIssInfo = (iss: any) => {
  issInfo.value = iss
  issVisible.value = true
}

const celeInfo = ref(null)
const celeVisible = ref(false)
// 点击天体弹窗
const handleCeleInfo = (cele: any) => {
  if (celeVisible.value) {
    celeVisible.value = false
  }
  celeInfo.value = cele
  celeVisible.value = true
}

const selectedNoradId = ref<string>('')

// aside点击卫星
function selectSatellite(item: any) {
  if (TleVisible.value) {
    closeTLEView()
  }
  selectedNoradId.value = item.noradId
  // 直接打开弹窗
  TleInfo.value = item
  TleVisible.value = true
}

// 搜索卫星
const searchText = ref('')
// 过滤卫星列表
const filteredTleList = computed(() => {
  return tleList.value.filter((item: any) => {
    return item.name.toLowerCase().includes(searchText.value.toLocaleLowerCase())
  })
})

const knowledgeVisible = ref(false)

const celeInfoVisible = ref(false)

onUnmounted(() => {
  clearInterval(timer)
})
</script>
<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* ---- 顶部导航栏 ---- */
.header {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: auto;
  padding: 14px 26px;
  background: var(--sp-header-bg);
  border-bottom: 1px solid var(--sp-border);
  box-shadow: var(--sp-shadow-soft);
  backdrop-filter: blur(10px);
}
.header::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 1px;
  background: var(--sp-neon-line);
  opacity: 0.75;
}
.header h1 {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 4px;
  background: var(--sp-title-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 18px var(--sp-glow);
}
.nav {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nav a {
  margin-right: 4px;
  text-decoration: none;
}
.header :deep(.el-button) {
  border-radius: 10px;
  letter-spacing: 1px;
}
.header :deep(.el-button--primary) {
  box-shadow: 0 6px 18px var(--sp-glow);
}
.header :deep(.el-button--danger) {
  box-shadow: 0 6px 18px var(--sp-danger-glow);
}

/* ---- 左侧卫星列表 ---- */
.aside {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 14px;
  overflow: hidden;
  background: var(--sp-panel);
  border-right: 1px solid var(--sp-border-soft);
}
.aside-title {
  position: relative;
  padding-left: 12px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--sp-accent-strong);
}
.aside-title::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  width: 4px;
  height: 16px;
  border-radius: 3px;
  background: var(--sp-bar-gradient);
  box-shadow: 0 0 10px var(--sp-glow);
  transform: translateY(-50%);
}
.aside :deep(.el-input__wrapper) {
  border-radius: 10px;
  background: var(--sp-glass);
  box-shadow: inset 0 0 0 1px var(--sp-border);
  transition: box-shadow 0.25s ease;
}
.aside :deep(.el-input__wrapper:hover) {
  box-shadow: inset 0 0 0 1px var(--sp-border-strong);
}
.aside :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    inset 0 0 0 1px var(--sp-accent),
    0 0 14px var(--sp-glow);
}
.aside :deep(.el-input__inner) {
  color: var(--sp-text);
}
.aside :deep(.el-input__count) {
  background: transparent;
  color: var(--sp-text-faint);
}
.aside :deep(.el-table) {
  background: transparent;
  --el-table-border-color: var(--sp-border-faint);
}
.aside :deep(.el-table tr) {
  background: transparent;
}
.aside :deep(.el-table th.el-table__cell) {
  background: var(--sp-panel-flat);
  font-weight: 600;
  letter-spacing: 1px;
}
.aside :deep(.el-table td.el-table__cell) {
  border-bottom: 1px solid var(--sp-border-faint);
}
.aside :deep(.el-table__row) {
  cursor: pointer;
}
.aside :deep(.el-table__body tr:hover > td.el-table__cell) {
  background: var(--sp-item-hover-strong) !important;
}
.aside :deep(.el-table__inner-wrapper::before) {
  display: none;
}

/* ---- 中间 3D 主区域 ---- */
.main-area {
  position: relative;
  padding: 18px;
  overflow: hidden;
  background: transparent;
}
</style>
