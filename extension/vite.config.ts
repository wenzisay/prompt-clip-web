/**
 * PromptClip 浏览器扩展专用构建配置（MV3）
 *
 * - 单 HTML 入口：sidepanel.html（React）
 * - background.js / manifest.json / 字体 作为静态资源复制到 dist（零依赖自写插件）
 * - `@/` 别名指向仓库根 src/，复用共享核心层
 *
 * 决策见 IMPLEMENTATION_PLAN.md D1/D3、第 3 节。
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

interface StaticFile {
  src: string;
  dest: string;
}

/**
 * 极简静态资源复制插件：在 generateBundle 阶段把指定文件原样写入产物。
 * 用于 manifest.json、background.js、字体（不经过 Vite 模块处理，避免 hash 与 CSP 问题）。
 */
function copyStaticAssets(files: StaticFile[]) {
  return {
    name: 'copy-static-assets',
    generateBundle() {
      for (const { src, dest } of files) {
        this.emitFile({
          type: 'asset',
          fileName: dest,
          source: readFileSync(src),
        });
      }
    },
  };
}

export default defineConfig({
  root: __dirname,
  plugins: [
    react(),
    copyStaticAssets([
      { src: path.resolve(__dirname, 'manifest.json'), dest: 'manifest.json' },
      { src: path.resolve(__dirname, 'src/background.js'), dest: 'background.js' },
      {
        src: path.resolve(rootDir, 'public/fonts/material-symbols-outlined.woff2'),
        dest: 'fonts/material-symbols-outlined.woff2',
      },
    ]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        sidepanel: path.resolve(__dirname, 'sidepanel.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
