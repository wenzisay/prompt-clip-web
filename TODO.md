# TODO

## 性能优化

- [ ] 文件加载并行化：将 `loadPrompts` 中的串行 `for...await` 改为分批并发（如每批 20 个），减少大量文件时的启动等待
- [ ] FlexSearch 索引持久化到 IndexedDB：利用 FlexSearch 内置 `export`/`import` API 序列化索引，配合文件 `lastModified` 快照判断增量更新，避免每次全量重建

## 文件监听

- [ ] 手动在文件夹中新建/编辑 `.md` 文件后索引不会自动更新，需刷新页面才能生效。可选方案：
  - 页面可见性变化时刷新（`visibilitychange`，成本最低）
  - 定时轮询文件 `lastModified`（有性能开销）
  - `FileSystemObserver` API（Chrome 129+ 实验性支持，尚未普及）

## 同步机制
- docs/promptclip-sync-design.md

## 遗留问题
- [ ] web端与桌面端同时打开一个文件夹时，会导致文件锁定，无法同时编辑。