<template>
  <el-dialog
    title="天文科普知识"
    v-model="props.visible"
    width="600px"
    class="space-dialog"
    :close-on-click-modal="false"
  >
    <div class="content">
      <el-collapse v-model="activeName" accordion>
        <el-collapse-item title="近地天体 NEO" name="neo">
          <p>近地天体（Near-Earth Object，NEO）指轨道可以进入地球附近空间的小行星或彗星。</p>
          <p>✅ 判定标准：距离地球轨道小于1.3天文单位（AU）</p>
          <p>
            ⚠️
            <b>潜在危险天体(PHA)</b
            >：满足两个条件：直径≥140米，距离地球最小轨道距离小于0.05AU（约19.5倍地月距离）。<br />
            注意：标记为危险 ≠ 马上撞击，只是长期轨道需要持续监测。
          </p>
        </el-collapse-item>
        <el-collapse-item title="地月距离单位(Lunar)" name="lunar">
          <p>地月距离单位 LD（Lunar Distance）：1LD = 平均地月距离 ≈ 384400 公里。</p>
          <p>例子：68LD = 68倍地月距离，距离地球很远，没有撞击风险。</p>
          <p>一般：小于1LD才是非常靠近地球的天体。</p>
        </el-collapse-item>
        <el-collapse-item title="天文单位 AU" name="au">
          <p>1 AU = 地球到太阳平均距离，约1.496亿公里，是太阳系内距离计量单位。</p>
        </el-collapse-item>
        <el-collapse-item title="卫星TLE两行轨道数据" name="tle">
          <p>TLE（Two-Line Elements）两行轨道根数，是NORAD发布的卫星轨道参数。</p>
          <p>可以用来实时计算卫星任意时刻位置，用于轨道模拟、追踪。</p>
          <p>NORAD ID：北美防空司令部分配给每一个人造卫星的唯一编号。</p>
        </el-collapse-item>
        <el-collapse-item title="视星等 absolute_magnitude_h" name="mag">
          <p>绝对星等H：小行星在距离1AU、相位角0度时的亮度。数值越小，天体越亮。</p>
          <p>可以用来估算小行星尺寸，H值越大 → 小行星通常越小。</p>
        </el-collapse-item>
      </el-collapse>
    </div>
    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, defineEmits } from 'vue'
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(['closeModal'])
const activeName = ref('neo')

const handleClose = () => {
  emit('closeModal')
}
</script>

<style scoped>
.content {
  font-size: 14px;
  line-height: 1.75;
  color: var(--sp-text-body);
}
.content p {
  margin: 8px 0;
}
.content b {
  font-weight: 600;
  color: var(--sp-danger-text);
}
.content :deep(.el-collapse) {
  border: none;
}
.content :deep(.el-collapse-item__header) {
  padding: 0 14px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--sp-accent-strong);
  background: var(--sp-card-bg);
  border: 1px solid var(--sp-border-faint);
  border-radius: 10px;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}
.content :deep(.el-collapse-item__header:hover) {
  background: var(--sp-item-hover-strong);
  color: var(--sp-text);
}
.content :deep(.el-collapse-item__header.is-active) {
  color: var(--sp-accent-2);
  border-color: var(--sp-border-strong);
}
.content :deep(.el-collapse-item__arrow) {
  color: var(--sp-accent-2);
}
.content :deep(.el-collapse-item__wrap) {
  margin-bottom: 10px;
  background: var(--sp-card-bg);
  border: 1px solid var(--sp-border-faint);
  border-radius: 10px;
}
.content :deep(.el-collapse-item__content) {
  padding: 12px 16px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--sp-text-body);
}
</style>
