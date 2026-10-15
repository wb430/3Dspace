import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type Theme = 'dark' | 'light'

export const useThemeStore = defineStore(
  'theme',
  () => {
    // 当前主题，默认深色
    const theme = ref<Theme>('dark')

    // 把主题写到 <html> 上，供 CSS 的 :root.dark / :root.light 选择器消费
    function applyTheme(val: Theme) {
      const root = document.documentElement
      const isDark = val === 'dark'
      root.classList.toggle('dark', isDark)
      root.classList.toggle('light', !isDark)
    }

    // immediate：store 创建（含持久化恢复）后立即写入，避免首屏主题闪烁
    watch(theme, applyTheme, { immediate: true })

    function toggleTheme() {
      theme.value = theme.value === 'dark' ? 'light' : 'dark'
    }

    return { theme, toggleTheme }
  },
  {
    // 刷新后记住用户选择（localStorage）
    persist: true,
  },
)
