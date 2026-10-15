<template>
  <el-dialog
    v-model="props.visible"
    width="800px"
    :close-on-click-modal="false"
    @close="emit('closeModal')"
    class="cele-info-dialog space-dialog"
  >
    <div class="container">
      <p>{{ '无版权信息' }}</p>
      <div class="body">
        <p class="stat">总天体数：{{ neoCount || 0 }}</p>
        <p class="stat">危险天体数：{{ danger_total }}</p>
      </div>
      <div v-for="dayItem in neoFeed" :key="dayItem.date" class="footer">
        <h3>📅 {{ dayItem.date }}</h3>
        <table class="aster-table">
          <thead>
            <tr>
              <th>小行星名称</th>
              <th>直径范围(km)</th>
              <th>飞掠日期</th>
              <th>地月距离倍数</th>
              <th>速度(km/s)</th>
              <th>距地球(km)</th>
              <th>是否危险</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="aster in dayItem.arrList"
              :key="aster.name"
              :class="{ 'is-hazard': aster.isHazard }"
            >
              <td>{{ aster.name }}</td>
              <td>
                {{ aster.diameterMin.toFixed(3) }} ~
                {{ aster.diameterMax.toFixed(3) }}
              </td>
              <td>{{ aster.closeDate }}</td>
              <td>{{ aster.ld }}</td>
              <td>{{ Number(aster.velocity).toFixed(2) }}</td>
              <td>{{ Number(aster.missKm).toLocaleString() }}</td>
              <td>{{ aster.isHazard ? '⚠️危险' : '✅安全' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </el-dialog>
</template>
<script setup lang="ts">
import type { PropType } from 'vue'
const props = defineProps({
  neoFeed: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
  danger_total: {
    type: Number,
    default: 0,
  },
  neoCount: {
    type: Number,
    default: 0,
  },
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['closeModal'])
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  border: none;
}
.container > p {
  margin: 0;
  font-size: 12px;
  letter-spacing: 2px;
  text-align: center;
  color: var(--sp-text-faint);
}
.body {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: stretch;
  gap: 14px;
}
.body .stat {
  flex: 1;
  margin: 0;
  padding: 12px 16px;
  font-size: 14px;
  text-align: center;
  color: var(--sp-text-body);
  border: 1px solid var(--sp-border-soft);
  border-radius: 12px;
  background: linear-gradient(150deg, var(--sp-accent-tint), var(--sp-card-bg));
}
.body .stat:nth-child(2) {
  color: var(--sp-danger-text);
  border-color: var(--sp-danger-border);
  background: linear-gradient(150deg, var(--sp-danger-bg-strong), var(--sp-card-bg));
}
.footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.footer h3 {
  margin: 4px 0 6px;
  padding-left: 12px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--sp-accent-strong);
  border-left: 3px solid var(--sp-accent);
}
.aster-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  border: 1px solid var(--sp-border-faint);
}
.aster-table th,
.aster-table td {
  padding: 10px;
  text-align: center;
  border: 1px solid var(--sp-border-faint);
}
.aster-table th {
  font-weight: 600;
  letter-spacing: 1px;
  white-space: nowrap;
  color: var(--sp-accent-muted);
  background: var(--sp-panel-flat);
}
.aster-table td {
  color: var(--sp-text-body);
}
.aster-table tbody tr {
  transition: background 0.2s ease;
}
.aster-table tbody tr:hover td {
  background: var(--sp-item-hover);
}
.aster-table tbody tr.is-hazard td {
  color: var(--sp-danger-text);
  background: var(--sp-danger-bg);
}
.aster-table tbody tr.is-hazard:hover td {
  background: var(--sp-danger-bg-strong);
}
</style>
