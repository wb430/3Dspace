<template>
  <div>
    <el-dialog
      v-model="props.visible"
      width="420px"
      align-center
      :draggable="true"
      :overflow="false"
      :modal="false"
      append-to-body
      class="astro-dialog"
      @close="closeModal"
    >
      <transition>
        <div class="modal-wrap">
          <div class="modal-header">
            <h3>{{ props.issInfo.name + ' 信息' || 'ISS View' }}</h3>
          </div>
          <div class="modal-body">
            <div v-if="props.issInfo" class="info-item">
              <p><span>ID：</span>{{ props.issInfo.id }}</p>
              <p><span>名称：</span>{{ props.issInfo.name }}</p>
              <p v-if="props.issInfo.latitude"><span>纬度：</span>{{ props.issInfo.latitude }}</p>
              <p v-if="props.issInfo.longitude"><span>经度：</span>{{ props.issInfo.longitude }}</p>
              <p v-if="props.issInfo.altitude">
                <span>高度(km)：</span>{{ props.issInfo.altitude }}
              </p>
              <p v-if="props.issInfo.timestamp"><span>时间：</span>{{ props.issInfo.timestamp }}</p>
            </div>
            <p v-else>暂无数据</p>
          </div>
        </div>
      </transition>
    </el-dialog>
  </div>
</template>
<script setup lang="ts">
const props = defineProps({
  issInfo: {
    type: Object,
    default: () => {},
  },
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['closeModal'])

const closeModal = () => {
  emit('closeModal')
}
</script>

<style scoped>
.modal-wrap {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  padding: 18px 20px 20px;
  overflow: hidden;
  color: var(--sp-text);
  border: 1px solid var(--sp-border-strong);
  border-radius: 14px;
  background: var(--sp-panel);
  box-shadow:
    0 0 0 1px var(--sp-scene-ring),
    0 20px 50px var(--sp-scene-shadow),
    inset 0 1px 0 var(--sp-inset-hi);
  animation: pop 0.25s ease;
}
.modal-wrap::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 2px;
  background: var(--sp-neon-line);
  opacity: 0.9;
}
.modal-header {
  display: flex;
  align-items: center;
  padding-bottom: 12px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--sp-border-soft);
}
.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--sp-text);
}
.modal-header h3::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 14px;
  margin-right: 8px;
  vertical-align: -1px;
  border-radius: 2px;
  background: var(--sp-bar-gradient);
  box-shadow: 0 0 8px var(--sp-glow);
}
.info-item p {
  padding: 4px 10px;
  font-size: 13.5px;
  line-height: 1.95;
  color: var(--sp-text-body);
  border-radius: 8px;
  word-break: break-word;
  transition: background 0.2s ease;
}
.info-item p:hover {
  background: var(--sp-item-hover);
}
.info-item p > span:first-child {
  display: inline-block;
  min-width: 88px;
  letter-spacing: 1px;
  color: var(--sp-accent-soft);
}
.modal-body > p {
  padding: 24px 0;
  font-size: 13px;
  text-align: center;
  color: var(--sp-text-dim);
}

@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>

<style>
/* 弹窗固定在屏幕右侧垂直居中：fixed 脱离文档流，不会撑宽页面；
   用 translate 属性做垂直偏移，避免与拖拽写入的内联 transform 冲突 */
.el-overlay-dialog .el-dialog.astro-dialog {
  position: fixed;
  top: 50%;
  right: 30px;
  margin: 0;
  translate: 0 -50%;
}
</style>
