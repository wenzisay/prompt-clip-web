# PromptClip 多端数据同步方案

> 创建日期: 2026-05-21
> 状态: 初步方案 / 待讨论

---

## 1. 背景与目标

PromptClip 是纯前端 AI 提示词管理工具，数据以 `.md` 文件（YAML frontmatter + Markdown 正文）形式存储在本地文件系统。
当前架构：无后端、无数据库、纯本地文件 I/O（Web 端通过 File System Access API，Desktop 端通过 Tauri 文件 API）。

### 要解决的问题

- 支持 **Web / Desktop / Mobile** 三端数据同步
- 用户可能用 **外部编辑器**（Obsidian、VS Code 等）直接修改本地 `.md` 文件
- 各端离线场景下的可用性

---

## 2. 设计原则

1. **离线优先** — 本地先写入，网络恢复后最终一致
2. **文件系统是事实源头** — 应用不独占数据，始终直接读写 `.md` 文件
3. **可靠变更检测** — 文件变化不应依赖应用内操作来触发
4. **插入式同步层** — 不破坏现有架构，FileRepository 接口可自然扩展

---

## 3. 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│                      SyncEngine                               │
│                                                               │
│  ┌──────────────────────┐     ┌──────────────────────────┐   │
│  │  FileWatcher          │     │  RemoteChangePoller       │   │
│  │  (监听/扫描本地变化)  │     │  (轮询远端变更)           │   │
│  └──────┬───────────────┘     └──────┬───────────────────┘   │
│         │                            │                        │
│         └────────┬───────────────────┘                       │
│                  ▼                                            │
│  ┌──────────────────────────────┐                            │
│  │  ChangeDetector               │                            │
│  │  - 计算 content hash         │                            │
│  │  - 比较 version / mtime      │                            │
│  │  - 输出变更集                │                            │
│  └──────────┬───────────────────┘                            │
│             ▼                                                │
│  ┌──────────────────────┐    ┌──────────────────────────┐    │
│  │  ConflictResolver     │    │  SyncQueue (离线队列)     │    │
│  │  - LWW (默认策略)     │    │  - IndexedDB 持久化      │    │
│  │  - 历史版本兜底       │    │  - 网络恢复后重放        │    │
│  └──────────┬───────────┘    └──────────────────────────┘    │
│             ▼                                                │
│  ┌───────────────────────────────────────────────────┐      │
│  │  RemoteRepository (FileRepository 接口实现)        │      │
│  │  - push(localChanges)                             │      │
│  │  - pull(sinceVersion) → remoteChanges              │      │
│  └───────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

### 核心模块职责

| 模块 | 职责 |
|------|------|
| **FileWatcher** | 检测本地文件系统变化（Desktop 用 OS 事件，Web 用 polling） |
| **RemoteChangePoller** | 轮询远端是否有新变更 |
| **ChangeDetector** | 计算 content hash，比对 version，输出变更集 |
| **ConflictResolver** | 冲突检测与解决（默认 LWW，被覆盖者备份） |
| **SyncQueue** | 离线写操作队列，网络恢复后重放 |
| **RemoteRepository** | 封装远端 API 调用，实现 FileRepository 接口 |

### 同现有架构的关系

```
App → PromptService → SyncEngine ←→ FileRepository (接口)
                                        ├── WebFileRepository
                                        ├── TauriFileRepository
                                        └── RemoteRepository (新增)
```

- `RemoteRepository` 是 `FileRepository` 接口的新实现，对上层透明
- 现有 `PromptService` 不做改动，只在同步场景中增加一个 SyncEngine 协调层

---

## 4. 变更检测（核心问题）

### 问题陈述

仅有"应用内写操作→触发同步队列"是不够的，因为：

- 用户可能在 **Obsidian、VS Code、Typora** 等外部编辑器中修改 `.md` 文件
- 用户可能通过 **iCloud / Dropbox / Git** 同步整个目录
- 文件的增删改路径不经过应用的代码路径

### 解决方案：文件系统变化驱动

同步的最终触发器是**文件系统的实际变化**，而非应用的写操作。所有变更最终统一经过"文件变化→检测→同步"这一条路径。

### 各平台 FileWatcher 方案

| 平台 | 方案 | 可靠性 | 实现方式 |
|------|------|--------|---------|
| **Desktop (Tauri)** | `notify` crate / Tauri fs plugin | 高 | OS 原生事件（inotify/FSEvents/ReadDirectoryChanges） |
| **Web (浏览器)** | Polling 轮询扫描 | 中 | 每 2-5s 遍历目录，对比 mtime + hash |
| **Mobile** | 不需要 | — | 应用沙箱内，用户无法直接操作文件，正常走网络同步 |

### Fallback 策略

- 即使有 FileWatcher，应用启动时仍然做一次全量扫描，确保不遗漏启动期间的变更
- 对于 Web 端，页面不可见时暂停 polling，恢复可见时立即触发一次全量扫描

---

## 5. Frontmatter 扩展字段

为了实现可靠的变更检测与冲突解决，每个 `.md` 文件的 YAML frontmatter 需要增加两个字段：

```yaml
---
id: "uuid-xxx"
title: "示例 Prompt"
tags: ["技术/Linux"]
createdAt: 2026-05-20T10:00:00.000Z
updatedAt: 2026-05-21T14:30:00.000Z
version: 7                  # ← 新增：单调递增的版本号
contentHash: "abc123..."    # ← 新增：正文内容的 SHA-256 前缀
copyCount: 3
pinned: false
---
这里是 prompt 的正文内容...
```

| 字段 | 作用 |
|------|------|
| `version` | 冲突检测权威依据。每次写入递增，服务端以 version 大小判断新旧 |
| `contentHash` | 快速判断文件内容是否变化。适用于时区不一致等场景 |

**优点**：随文件一起移动/复制，不会丢失，不需要额外状态文件。

---

## 6. 同步流程

### 常规流程（无冲突）

```
[用户本地修改文件]
       │
       ▼
FileWatcher 检测到变化
       │
       ▼
ChangeDetector: 读取 frontmatter，计算新 contentHash
       │
       ▼
比对内存缓存:
  ├─ hash 没变 → 跳过（无需同步）
  └─ hash 变了 → 校验 version，加入变更集
       │
       ▼
SyncQueue 入队
       │
       ▼
SyncEngine 推送到 RemoteRepository:
  ├─ 服务端: version 比较 → 接受更新
  └─ 返回确认 + 最新 version
       │
       ▼
更新本地文件的 frontmatter (version + contentHash)
```

### 冲突场景

```
[手机端修改 prompt A]          [桌面端修改 prompt A]
       │                              │
       ▼                              ▼
   version: 7 → 8                 version: 7 → 8
       │                              │
       ▼                              ▼
   推送至服务端                     推送至服务端
       │                              │
       ▼                              ▼
  服务端收到 version=8          服务端发现 version 冲突
  当前 version=7 → 接受         当前 version=8 → 冲突
                                      │
                                      ▼
                              ConflictResolver 介入:
                              1. 默认 LWW（updatedAt 较新者胜出）
                              2. 被覆盖方备份到 .history/<id>.conflict.<ts>.md
                              3. 可选：用户手动选择
```

### 冲突解决策略

| 策略 | 适用场景 | 说明 |
|------|---------|------|
| **LWW（Last Write Win）** | 默认 | 比较 `updatedAt`，较新者胜出 |
| **版本号优先** | 显式发布场景 | 服务端 version 高者胜出 |
| **手动合并** | 用户需要控制 | 提供对比界面，由用户选择 |

所有冲突中被覆盖的一方都备份到 `.history/` 目录，不会丢失数据。

---

## 7. 同步队列（SyncQueue）

### 作用

- 离线时将写操作持久化到 IndexedDB
- 网络恢复后按顺序重放
- 保证最终一致性

```typescript
interface SyncQueueItem {
  id: string;             // prompt 的 stable UUID
  action: 'create' | 'update' | 'delete';
  localVersion: number;
  data: string;           // 完整的文件内容
  queuedAt: number;       // 入队时间戳
  retryCount: number;     // 重试次数
}
```

### 队列处理规则

- 按 `queuedAt` 顺序处理
- 相同 `id` 的连续操作可以合并（例如连续三次 update → 只推最后一次）
- 网络失败时指数退避重试（1s → 2s → 4s → 8s → max 60s）
- 超过 `MAX_RETRY`（默认 10 次）后标记为失败，提示用户

---

## 8. 后端设计（最小可行方案）

### 可选方案

| 方案 | 复杂度 | 成本 | 维护 |
|------|--------|------|------|
| **Supabase BaaS** | 低 | 免费额度够个人使用 | 几乎零维护 |
| **轻量自建服务**（Node.js + SQLite） | 中 | 服务器成本 | 需要维护 |
| **Firebase** | 低 | 有免费额度 | 几乎零维护 |

推荐起步：**Supabase**，零成本，JS SDK 成熟，后续可迁移到自建服务。

### API 设计

```
POST   /api/sync/register         # 注册设备，获取 deviceId
POST   /api/sync/push             # 推送本地变更 [{promptId, version, content, hash, action}]
GET    /api/sync/pull?since=      # 拉取服务端增量变更（since = 上次拉取的 version）
POST   /api/sync/resolve          # 冲突解决结果上报
```

### 数据表设计

```
prompts:
  id          UUID (PK)
  title       TEXT
  content     TEXT
  tags        JSON
  metadata    JSON
  version     INT (递增)
  content_hash TEXT
  created_at  TIMESTAMPTZ
  updated_at  TIMESTAMPTZ
  deleted_at  TIMESTAMPTZ (软删除)

sync_log:
  id          BIGSERIAL (PK)
  prompt_id   UUID → prompts.id
  device_id   TEXT
  version     INT
  action      TEXT
  data_snapshot JSON
  created_at  TIMESTAMPTZ

devices:
  id          TEXT (PK)
  name        TEXT
  last_sync_at TIMESTAMPTZ
```

---

## 9. 后端认证

极简方案，避免复杂的用户系统：

| 方案 | 复杂度 | 体验 |
|------|--------|------|
| **设备配对码** | 低 | 扫码或输入配对码关联设备 |
| **GitHub OAuth** | 中 | 需要 GitHub 账号 |
| **匿名 + 可选的账户绑定** | 中 | 先匿名使用，之后可绑定 |

推荐起步：**设备配对码**。首次使用时生成设备 ID，扫另一端的二维码即可配对。不需要注册、不需要账号。

---

## 10. 实施路线图

### Phase 1: Frontmatter 扩展（1-2 天）

- [ ] 在 Prompt metadata 类型中增加 `version` 和 `contentHash` 字段
- [ ] 修改 `serializeMarkdown` / `parseMarkdown` 支持读写这两个字段
- [ ] 修改 `PromptService.loadPrompts` 自动计算缺失的 contentHash
- [ ] 确保向前兼容：旧文件没有 version/hash 时不报错

### Phase 2: Desktop FileWatcher（3-5 天）

- [ ] 实现 Tauri 端的文件系统监听（notify crate 或 Tauri plugin）
- [ ] 实现 ChangeDetector（content hash 计算、变更集输出）
- [ ] 实现 300ms debounce 聚合批量变更
- [ ] 排除 `.history/` 和 `.trash/` 目录
- [ ] 编写测试

### Phase 3: 后端基础设施（3-5 天）

- [ ] 选择后端方案（推荐 Supabase）
- [ ] 创建数据表
- [ ] 实现 REST API
- [ ] 实现设备配对逻辑

### Phase 4: RemoteRepository + SyncQueue（3-5 天）

- [ ] 实现 `RemoteRepository`（FileRepository 接口）
- [ ] 实现 `SyncQueue`（IndexedDB 持久化）
- [ ] 实现 `SyncEngine`（协调层）
- [ ] 实现 `RemoteChangePoller`（定期拉取远程变更）

### Phase 5: Web Polling Watcher（2-3 天）

- [ ] 实现 Web 端 polling 扫描
- [ ] 页面可见性感知（暂停/恢复）
- [ ] 性能优化

### Phase 6: 冲突解决 UI（2-3 天）

- [ ] 同步状态指示器（UI 组件）
- [ ] 冲突通知与对比界面
- [ ] 手动选择/合并能力

### Phase 7: Mobile 端（独立项目，时间另估）

- [ ] React Native 或 Flutter 新项目
- [ ] 复用 sync API
- [ ] 移动端 UI

---

## 11. 关键权衡与风险

### 已知风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 浏览器 FileWatcher polling 性能 | 大型工作区可能卡顿 | 页面不可见时暂停，只检查 mtime 而非全量 hash |
| 冲突发生时数据丢失 | 用户创作内容不可逆丢失 | 所有冲突都备份到 .history/ |
| 离线期间多端修改同一文件 | 手动合并体验差 | 优先 LWW，提供历史版本查看 |
| Tauri 文件监听事件过于频繁 | CPU 占用上升 | debounce + 排除忽略目录 |

### 不做的事情

- **不引入 CRDT/OT 实时协同** —— 当前场景是 prompt 级粒度，"最后写入者胜出"已经足够好
- **不构建全量数据库后端** —— 保持以 `.md` 文件为中心，后端仅作为同步中转
- **不实现实时推送** —— polling 足够，推送可以后续加

---

## 12. 当前架构的复用优势

现有 PromptClip 架构对引入 sync 支持良好：

- **`FileRepository` 接口** — 加一个 `RemoteRepository` 实现即可，不影响现有代码
- **Stable UUID** — 每个 prompt 有全局唯一 ID，天然适合分布式同步
- **`updatedAt` 时间戳** — 已有，可用作冲突判断依据
- **`.history/` 版本历史** — 可作为冲突被覆盖时的安全网
- **Zustand 内存状态** — 本地状态不变，SyncEngine 只需要在同步完成后 `setPrompts`
