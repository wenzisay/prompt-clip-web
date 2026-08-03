## 打包体积优化方案

**目标**：把主 chunk（index-*.js，613KB / gzip 184KB）中的重型库通过动态 import
拆分到按需加载的独立 chunk，并通过稳定 vendor chunk 改善长期缓存。构建验证后最大的主
chunk 为 394.70KB / gzip 112.17KB。

**根因**：分享/导出弹窗虽已用 `React.lazy` 懒加载，但底层 service 文件是静态 import 重型库，导致这些库仍被打进主 chunk。项目里已有正确写法样板（`src/services/exportTargetService.ts` 用运行时 `import()`）。

---

### 改动 1：`src/services/shareImageService.ts`（收益最大，约 -70KB gzip）

- 移除顶层静态 import：
  - `import { toBlob } from 'html-to-image'`
  - `import html2canvas from 'html2canvas'`
- 保留 `import type { Options } from 'html-to-image/lib/types'`（type-only，编译后擦除，不进 bundle，保证 `getShareImageRenderOptions()` 返回类型不变）
- 在 `renderShareNodeToBlob()` 内部改为 `const { toBlob } = await import('html-to-image')`
- 在 `renderShareNodeWithCanvas()` 内部改为 `const { default: html2canvas } = await import('html2canvas')`
- 其余纯函数（`buildShareImageFilename`、`selectShareAnnotations` 等）不依赖这两个库，保持不动

### 改动 2：`src/services/exportService.ts`（约 -30KB gzip）

- 移除顶层 `import JSZip from 'jszip'`
- 在 `exportMDArchive()` 内部改为 `const { default: JSZip } = await import('jszip')`
- `exportJSON` / `exportCSV` 路径完全不触碰 JSZip，更轻

### 改动 3：清理未使用的 tauri JS 依赖

`src/` 下经 grep 确认 0 处 JS import（剪贴板统一用 `navigator.clipboard.writeText`），从 `package.json` 的 `dependencies` 移除：
- `@tauri-apps/plugin-clipboard-manager`
- `@tauri-apps/plugin-global-shortcut`

注：这两个仅 Rust 端（`src-tauri/Cargo.toml`）在用，与 npm JS 包无关，移除 JS 包不影响 Tauri 桌面端构建。

---

### 测试影响（无需改动测试逻辑）

- `shareImageService.test.ts` / `exportService.test.ts` 顶部的静态 import 和 `vi.mock(...)` **保持不变**。`vi.mock` 是模块级拦截，对动态 `import()` 同样生效；测试文件自身的 import 不进入生产 bundle。
- 实施前我会再 grep 一次 `src/` 全局，二次确认那两个 tauri 插件无引用。

### 改动 4：拆分稳定 vendor chunk

- 在 `vite.config.ts` 中通过 `manualChunks` 拆分 React、Marked、FlexSearch 和 UI 依赖。
- 不手工归类动态加载的 `html2canvas` / `html-to-image` / `jszip` 及 Tauri 依赖，保留
  Rollup 的按引用关系拆分能力。

### 验证结果

1. `npm run type-check` —— 通过。
2. `npm run lint` —— 通过。
3. `npm run test -- --run` —— 81 个测试文件、475 个测试全部通过。
4. `npm run build` —— 通过，确认主 chunk 明显变小，并出现独立的
   `html2canvas` / `jszip` 及 vendor chunk。

### 不在本次范围

- `marked`：首屏 `DetailPanel` → `PromptContent` 需要它，且存在同步 `renderMarkdownSync`，无法简单懒加载，留待后续单独处理。
- `flexsearch` / `react-virtual`：首屏必需，不能懒加载。
