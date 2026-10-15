<template>
  <div class="container">
    <h1 class="hero-title">卫星可视化系统</h1>
    <p class="hero-sub">这是一个基于Vue3的卫星可视化系统</p>
    <div class="actions">
      <button class="btn btn-primary" @click="getimg">获取APOD</button>
      <router-link class="btn btn-ghost" to="/satellite">进入卫星可视化系统</router-link>
      <button class="btn btn-ghost" @click="themeStore.toggleTheme()">
        {{ themeStore.theme === 'dark' ? '☀ 浅色模式' : '🌙 深色模式' }}
      </button>
    </div>
  </div>

  <div>
    <dialog ref="dialogRef" class="apod-dialog">
      <button class="btn btn-close" @click="dialogRef?.close()">关闭</button>
      <img
        :src="imgurl"
        alt="apod图片"
        class="apod-img"
        style="max-width: 90vw; max-height: 80vh"
      />
    </dialog>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { getAbodApi } from '@/api/spaceApi'
import { useThemeStore } from '@/stores/themeStore'

const themeStore = useThemeStore()
const imgurl = ref('')
const dialogRef = ref<HTMLDialogElement | null>(null)

const getimg = async () => {
  const res = await getAbodApi()
  console.log(res)
  imgurl.value = res.data.hdurl
  dialogRef.value?.showModal()
}
</script>
<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* ---- 首页：星海主视觉 ---- */
.container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 48px 24px;
  text-align: center;
  background: radial-gradient(circle at 50% 38%, rgba(74, 168, 255, 0.16), transparent 58%);
}

.hero-title {
  font-size: clamp(30px, 5vw, 52px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 6px;
  background: var(--sp-title-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: var(--sp-title-glow);
}

.hero-sub {
  font-size: 15px;
  line-height: 1.6;
  letter-spacing: 2px;
  color: var(--sp-text-dim);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
}

/* ---- 胶囊按钮 ---- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 26px;
  font-family: inherit;
  font-size: 15px;
  letter-spacing: 2px;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.25s ease,
    background 0.25s ease,
    border-color 0.25s ease;
}
.btn-primary {
  font-weight: 600;
  color: #04101f;
  background: linear-gradient(120deg, var(--sp-accent-2), var(--sp-accent));
  box-shadow: 0 10px 26px var(--sp-glow);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px var(--sp-glow);
}
.btn-ghost {
  color: var(--sp-accent-strong);
  background: var(--sp-panel-flat);
  border-color: var(--sp-border-strong);
  box-shadow: var(--sp-shadow-soft);
}
.btn-ghost:hover {
  transform: translateY(-2px);
  background: var(--sp-item-hover-strong);
  border-color: var(--sp-accent-2);
  box-shadow: 0 14px 32px var(--sp-glow);
}

/* ---- APOD 图片弹窗 ---- */
.apod-dialog {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 96vw;
  padding: 16px;
  color: var(--sp-text);
  border: 1px solid var(--sp-border);
  border-radius: 16px;
  background: var(--sp-panel);
  box-shadow: var(--sp-dialog-shadow);
}
.apod-dialog::backdrop {
  background: var(--el-mask-color);
}
.apod-img {
  display: block;
  border-radius: 12px;
  box-shadow: 0 0 40px var(--sp-glow);
}
.btn-close {
  align-self: flex-end;
  padding: 6px 16px;
  font-size: 13px;
  color: var(--sp-text);
  background: var(--sp-item-hover);
  border-color: var(--sp-border-soft);
}
.btn-close:hover {
  background: var(--sp-danger-bg-strong);
  border-color: var(--sp-danger-border);
}
</style>
