<script setup lang="ts">
import { useThemeStore } from '@/stores/themeStore'

// 提前实例化主题 store：应用挂载时就把当前主题类名写到 <html> 上，避免首屏主题闪烁
useThemeStore()
</script>

<template>
  <RouterView />
</template>

<style>
/* ============================================================
   全局主题（Pinia 驱动）
   <html class="dark|light"> → 切换两套 CSS 变量 → 组件全部用 var(--sp-*)
   注：:root.dark / :root.light 特异性 (0,2,0)，稳定压过 Element Plus 默认 :root
   ============================================================ */

/* ---------- 深色主题（默认） ---------- */
:root.dark {
  /* 语义色板 */
  --sp-accent: #4aa8ff;
  --sp-accent-2: #7dd3fc;
  --sp-accent-soft: #7cb3ff;
  --sp-accent-strong: #cfe2ff;
  --sp-accent-muted: #9fc4ee;
  --sp-accent-tint: rgba(74, 168, 255, 0.12);

  --sp-text: #e6f0ff;
  --sp-text-body: #c4d5ee;
  --sp-text-dim: #93a9c9;
  --sp-text-faint: #6d86a8;

  --sp-panel: linear-gradient(165deg, rgba(20, 34, 60, 0.96), rgba(9, 16, 32, 0.97));
  --sp-panel-flat: rgba(20, 34, 60, 0.9);
  --sp-card-bg: rgba(13, 21, 38, 0.5);
  --sp-glass: rgba(10, 18, 36, 0.75);
  --sp-header-bg: linear-gradient(180deg, rgba(16, 28, 52, 0.92), rgba(10, 18, 36, 0.7));
  --sp-inset-hi: rgba(255, 255, 255, 0.06);

  --sp-item-hover: rgba(74, 168, 255, 0.1);
  --sp-item-hover-strong: rgba(74, 168, 255, 0.16);

  --sp-border: rgba(90, 160, 255, 0.22);
  --sp-border-strong: rgba(90, 160, 255, 0.3);
  --sp-border-soft: rgba(90, 160, 255, 0.16);
  --sp-border-faint: rgba(90, 160, 255, 0.1);

  --sp-danger: #ff8f8f;
  --sp-danger-text: #ffc0c0;
  --sp-danger-glow: rgba(255, 60, 60, 0.28);
  --sp-danger-bg: rgba(255, 92, 92, 0.12);
  --sp-danger-bg-strong: rgba(255, 92, 92, 0.2);
  --sp-danger-border: rgba(255, 92, 92, 0.42);

  --sp-glow: rgba(74, 168, 255, 0.4);
  --sp-shadow-soft: 0 10px 26px rgba(0, 0, 0, 0.35);
  --sp-dialog-shadow:
    0 24px 70px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);

  /* 渐变装饰 */
  --sp-title-gradient: linear-gradient(100deg, #e6f0ff 0%, #7dd3fc 45%, #4aa8ff 100%);
  --sp-title-glow: 0 0 34px rgba(74, 168, 255, 0.42);
  --sp-neon-line: linear-gradient(90deg, transparent, #4aa8ff, #7dd3fc, transparent);
  --sp-bar-gradient: linear-gradient(180deg, #7dd3fc, #4aa8ff);

  /* 页面与 3D 场景 */
  --sp-page-bg:
    radial-gradient(1100px 760px at 12% -8%, rgba(46, 104, 180, 0.28), transparent 60%),
    radial-gradient(900px 680px at 96% 112%, rgba(112, 58, 190, 0.2), transparent 58%),
    linear-gradient(160deg, #05070f 0%, #03060d 55%, #02040a 100%);
  --sp-scene-bg: #05070f;
  --sp-scene-radial: #0a1830;
  --sp-scene-ring: rgba(0, 0, 0, 0.4);
  --sp-scene-shadow: rgba(0, 0, 0, 0.55);
  --sp-scene-inset: rgba(20, 60, 120, 0.25);

  /* Element Plus 变量覆盖 */
  --el-color-primary: #4aa8ff;
  --el-color-primary-light-3: #74bdff;
  --el-color-primary-light-5: #94cdff;
  --el-color-primary-light-7: #b6dcff;
  --el-color-primary-light-8: #cde8ff;
  --el-color-primary-light-9: #e6f3ff;
  --el-color-primary-dark-2: #2f8de0;
  --el-color-danger: #ff5d5d;
  --el-color-warning: #ffb84d;
  --el-color-success: #4ade80;
  --el-color-info: #93a9c9;

  --el-bg-color: #0d1526;
  --el-bg-color-page: #05070f;
  --el-bg-color-overlay: #101a30;
  --el-text-color-primary: #e6f0ff;
  --el-text-color-regular: #c4d5ee;
  --el-text-color-secondary: #93a9c9;
  --el-text-color-placeholder: #5f7796;
  --el-text-color-disabled: #4a5b78;

  --el-border-color: rgba(90, 160, 255, 0.22);
  --el-border-color-light: rgba(90, 160, 255, 0.16);
  --el-border-color-lighter: rgba(90, 160, 255, 0.1);
  --el-border-color-extra-light: rgba(90, 160, 255, 0.06);
  --el-border-color-dark: rgba(90, 160, 255, 0.32);
  --el-border-color-darker: rgba(90, 160, 255, 0.4);
  --el-fill-color: rgba(90, 160, 255, 0.1);
  --el-fill-color-light: rgba(90, 160, 255, 0.07);
  --el-fill-color-lighter: rgba(90, 160, 255, 0.05);
  --el-fill-color-extra-light: rgba(90, 160, 255, 0.03);
  --el-fill-color-dark: rgba(90, 160, 255, 0.14);
  --el-fill-color-darker: rgba(90, 160, 255, 0.18);
  --el-fill-color-blank: #0d1526;

  --el-mask-color: rgba(3, 6, 14, 0.72);
  --el-box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
  --el-box-shadow-light: 0 8px 28px rgba(0, 0, 0, 0.45);
  --el-box-shadow-lighter: 0 4px 16px rgba(0, 0, 0, 0.35);

  --el-table-border-color: rgba(90, 160, 255, 0.12);
  --el-table-text-color: #c4d5ee;
  --el-table-header-text-color: #9fc4ee;
  --el-table-row-hover-bg-color: rgba(74, 168, 255, 0.12);
  --el-table-current-row-bg-color: rgba(74, 168, 255, 0.16);
  --el-table-header-bg-color: rgba(20, 34, 60, 0.85);
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-fixed-box-shadow: 0 0 14px rgba(0, 0, 0, 0.5);

  --el-collapse-border-color: rgba(90, 160, 255, 0.16);
  --el-collapse-header-bg-color: rgba(20, 34, 60, 0.4);
  --el-collapse-content-bg-color: rgba(13, 21, 38, 0.3);
  --el-collapse-header-text-color: #cfe2ff;
  --el-collapse-content-text-color: #a9c0e0;

  --el-scrollbar-bg-color: rgba(90, 160, 255, 0.2);
  --el-scrollbar-hover-bg-color: rgba(90, 160, 255, 0.34);

  --el-dialog-bg-color: #0d1526;
  --el-dialog-border-radius: 14px;
}

/* ---------- 浅色主题 ---------- */
:root.light {
  /* 语义色板 */
  --sp-accent: #1f7ae0;
  --sp-accent-2: #0ea5e9;
  --sp-accent-soft: #2b6cbf;
  --sp-accent-strong: #17324f;
  --sp-accent-muted: #3b6291;
  --sp-accent-tint: rgba(31, 122, 224, 0.08);

  --sp-text: #1c2733;
  --sp-text-body: #34435a;
  --sp-text-dim: #5b6b80;
  --sp-text-faint: #8a99ad;

  --sp-panel: linear-gradient(165deg, rgba(255, 255, 255, 0.99), rgba(240, 245, 253, 0.99));
  --sp-panel-flat: rgba(255, 255, 255, 0.95);
  --sp-card-bg: rgba(240, 245, 253, 0.75);
  --sp-glass: rgba(255, 255, 255, 0.9);
  --sp-header-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(244, 248, 253, 0.86));
  --sp-inset-hi: rgba(31, 122, 224, 0.05);

  --sp-item-hover: rgba(31, 122, 224, 0.07);
  --sp-item-hover-strong: rgba(31, 122, 224, 0.13);

  --sp-border: rgba(31, 122, 224, 0.24);
  --sp-border-strong: rgba(31, 122, 224, 0.36);
  --sp-border-soft: rgba(31, 122, 224, 0.16);
  --sp-border-faint: rgba(31, 122, 224, 0.1);

  --sp-danger: #dc2626;
  --sp-danger-text: #b91c1c;
  --sp-danger-glow: rgba(220, 38, 38, 0.18);
  --sp-danger-bg: rgba(220, 38, 38, 0.08);
  --sp-danger-bg-strong: rgba(220, 38, 38, 0.14);
  --sp-danger-border: rgba(220, 38, 38, 0.36);

  --sp-glow: rgba(31, 122, 224, 0.28);
  --sp-shadow-soft: 0 10px 26px rgba(31, 60, 110, 0.12);
  --sp-dialog-shadow:
    0 24px 60px rgba(31, 60, 110, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);

  /* 渐变装饰 */
  --sp-title-gradient: linear-gradient(100deg, #17324f 0%, #1f7ae0 55%, #0ea5e9 100%);
  --sp-title-glow: 0 0 30px rgba(31, 122, 224, 0.22);
  --sp-neon-line: linear-gradient(90deg, transparent, #1f7ae0, #0ea5e9, transparent);
  --sp-bar-gradient: linear-gradient(180deg, #0ea5e9, #1f7ae0);

  /* 页面与 3D 场景 */
  --sp-page-bg:
    radial-gradient(1000px 700px at 10% -10%, rgba(31, 122, 224, 0.12), transparent 60%),
    radial-gradient(900px 680px at 96% 112%, rgba(112, 58, 190, 0.08), transparent 58%),
    linear-gradient(160deg, #f7fafd 0%, #eef3fb 55%, #e7eef8 100%);
  --sp-scene-bg: #eef3fb;
  --sp-scene-radial: #dbe6f7;
  --sp-scene-ring: rgba(31, 60, 110, 0.08);
  --sp-scene-shadow: rgba(31, 60, 110, 0.16);
  --sp-scene-inset: rgba(31, 122, 224, 0.08);

  /* Element Plus 变量覆盖 */
  --el-color-primary: #1f7ae0;
  --el-color-primary-light-3: #4f97e8;
  --el-color-primary-light-5: #77b0ee;
  --el-color-primary-light-7: #a9cbf4;
  --el-color-primary-light-8: #c4d9f7;
  --el-color-primary-light-9: #e4eefb;
  --el-color-primary-dark-2: #1962b3;
  --el-color-danger: #e53935;
  --el-color-warning: #f59e0b;
  --el-color-success: #16a34a;
  --el-color-info: #5b6b80;

  --el-bg-color: #ffffff;
  --el-bg-color-page: #eef3fb;
  --el-bg-color-overlay: #ffffff;
  --el-text-color-primary: #1c2733;
  --el-text-color-regular: #34435a;
  --el-text-color-secondary: #5b6b80;
  --el-text-color-placeholder: #93a1b5;
  --el-text-color-disabled: #b3bfcf;

  --el-border-color: rgba(31, 122, 224, 0.24);
  --el-border-color-light: rgba(31, 122, 224, 0.16);
  --el-border-color-lighter: rgba(31, 122, 224, 0.1);
  --el-border-color-extra-light: rgba(31, 122, 224, 0.06);
  --el-border-color-dark: rgba(31, 122, 224, 0.32);
  --el-border-color-darker: rgba(31, 122, 224, 0.4);
  --el-fill-color: rgba(31, 122, 224, 0.1);
  --el-fill-color-light: rgba(31, 122, 224, 0.07);
  --el-fill-color-lighter: rgba(31, 122, 224, 0.05);
  --el-fill-color-extra-light: rgba(31, 122, 224, 0.03);
  --el-fill-color-dark: rgba(31, 122, 224, 0.14);
  --el-fill-color-darker: rgba(31, 122, 224, 0.18);
  --el-fill-color-blank: #ffffff;

  --el-mask-color: rgba(240, 245, 253, 0.8);
  --el-box-shadow: 0 16px 48px rgba(31, 60, 110, 0.18);
  --el-box-shadow-light: 0 8px 28px rgba(31, 60, 110, 0.14);
  --el-box-shadow-lighter: 0 4px 16px rgba(31, 60, 110, 0.1);

  --el-table-border-color: rgba(31, 122, 224, 0.12);
  --el-table-text-color: #34435a;
  --el-table-header-text-color: #3b6291;
  --el-table-row-hover-bg-color: rgba(31, 122, 224, 0.08);
  --el-table-current-row-bg-color: rgba(31, 122, 224, 0.12);
  --el-table-header-bg-color: rgba(31, 122, 224, 0.08);
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-fixed-box-shadow: 0 0 14px rgba(31, 60, 110, 0.12);

  --el-collapse-border-color: rgba(31, 122, 224, 0.16);
  --el-collapse-header-bg-color: rgba(31, 122, 224, 0.06);
  --el-collapse-content-bg-color: rgba(31, 122, 224, 0.03);
  --el-collapse-header-text-color: #1c2733;
  --el-collapse-content-text-color: #34435a;

  --el-scrollbar-bg-color: rgba(31, 122, 224, 0.2);
  --el-scrollbar-hover-bg-color: rgba(31, 122, 224, 0.34);

  --el-dialog-bg-color: #ffffff;
  --el-dialog-border-radius: 14px;
}

/* ---------- 基础排版 ---------- */
html,
body {
  margin: 0;
  padding: 0;
}
body {
  min-height: 100vh;
  color: var(--sp-text);
  background: var(--sp-page-bg);
  background-attachment: fixed;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition:
    background 0.35s ease,
    color 0.35s ease;
}
#app {
  min-height: 100vh;
}

* {
  scrollbar-width: thin;
  scrollbar-color: rgba(90, 160, 255, 0.32) transparent;
}
*::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
*::-webkit-scrollbar-thumb {
  background: rgba(90, 160, 255, 0.28);
  border-radius: 8px;
}
*::-webkit-scrollbar-thumb:hover {
  background: rgba(90, 160, 255, 0.45);
}
*::-webkit-scrollbar-track {
  background: transparent;
}

/* ---------- 右侧天体信息弹窗（ISS / TLE / 天体）：透明外壳 + 浮动关闭按钮 ---------- */
.el-dialog.astro-dialog {
  --el-dialog-bg-color: transparent;
  padding: 0;
  background: transparent;
  box-shadow: none;
}
.el-dialog.astro-dialog .el-dialog__header {
  position: absolute;
  top: 8px;
  right: 10px;
  width: auto;
  margin: 0;
  padding: 0;
  z-index: 5;
}
.el-dialog.astro-dialog .el-dialog__title {
  display: none;
}
.el-dialog.astro-dialog .el-dialog__headerbtn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  transition: background 0.2s ease;
}
.el-dialog.astro-dialog .el-dialog__headerbtn:hover {
  background: var(--sp-danger-bg-strong);
}
.el-dialog.astro-dialog .el-dialog__headerbtn .el-dialog__close {
  color: var(--sp-accent-muted);
  font-size: 16px;
}
.el-dialog.astro-dialog .el-dialog__headerbtn:hover .el-dialog__close {
  color: var(--sp-danger);
}
.el-dialog.astro-dialog .el-dialog__body {
  padding: 0;
}

/* ---------- 通用弹窗（科普 / 近地天体）：玻璃卡片 ---------- */
.el-dialog.space-dialog {
  border: 1px solid var(--sp-border);
  border-radius: 16px;
  background: var(--sp-panel);
  box-shadow: var(--sp-dialog-shadow);
  overflow: hidden;
  transition:
    background 0.35s ease,
    border-color 0.35s ease;
}
.el-dialog.space-dialog .el-dialog__header {
  margin: 0;
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--sp-border-soft);
  background: linear-gradient(90deg, var(--sp-accent-tint), transparent 70%);
}
.el-dialog.space-dialog .el-dialog__title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--sp-text);
}
.el-dialog.space-dialog .el-dialog__headerbtn .el-dialog__close {
  color: var(--sp-accent-muted);
}
.el-dialog.space-dialog .el-dialog__headerbtn:hover .el-dialog__close {
  color: var(--sp-danger);
}
.el-dialog.space-dialog .el-dialog__body {
  padding: 18px 22px;
  color: var(--sp-text-body);
}
.el-dialog.space-dialog .el-dialog__footer {
  padding: 12px 22px 18px;
  border-top: 1px solid var(--sp-border-soft);
}
</style>
