import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // 将稳定的第三方依赖拆为独立 vendor chunk：
        // 1. 让主 chunk（应用代码）明显变小，消除 500KB 警告；
        // 2. vendor chunk 内容稳定，发版时不易变动，利于浏览器长期缓存。
        // 注意：只显式归类首屏需要的稳定大库；其余（含动态 import 的
        // html2canvas / html-to-image / jszip、以及 @tauri-apps/*）返回 undefined，
        // 交由 Rollup 按 import 关系自动拆分，避免把动态加载的库强行并入静态 chunk。
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          // react 运行时：体积最大且变更频率低，单独缓存
          if (id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
            return 'vendor-react-dom';
          }
          if (id.includes('node_modules/react/')) {
            return 'vendor-react';
          }

          // 首屏需要的稳定依赖，独立于 react 之外
          if (id.includes('node_modules/marked/')) {
            return 'vendor-marked';
          }
          if (id.includes('node_modules/flexsearch/')) {
            return 'vendor-flexsearch';
          }
          if (
            id.includes('node_modules/@tanstack/') ||
            id.includes('node_modules/zustand/')
          ) {
            return 'vendor-ui';
          }

          return undefined;
        },
      },
    },
  },
});
