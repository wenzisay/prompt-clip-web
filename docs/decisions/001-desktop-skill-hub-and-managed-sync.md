# ADR-001: 使用桌面原生 Skill Hub 与受管目标同步

## Status

Accepted

## Date

2026-08-01

## Context

PromptClip 需要把 Agent Skills 统一存储在 `~/.prompt-clip/skills`，并同步到 Claude Code、Codex、
Cursor 等工具的 Home 目录。现有 Prompt 工作区文件抽象服务于用户显式选择的目录，同时覆盖 Web File
System Access API 和 Tauri；它不适合授予 Web 端或通用前端接口访问整个 Home 的能力。

同步还有三个关键约束：

- 同一目标路径可能被多个 Agent 工具共享，按工具保存独立 bool 会产生虚假状态。
- 软链接、Windows junction、复制目录需要不同的识别与安全删除逻辑。
- Agent 目录中可能已有用户自己维护的同名真实目录，PromptClip 不得误删或覆盖。

本决策参考本地 Skills-Manager 的工具注册表、探测器、linker、复制标记和文件树实现，但不照搬其
接受任意绝对路径的通用文件命令。

## Decision

1. `~/.prompt-clip/skills` 是 Skill 唯一真相源，Agent 目录是可重建目标。
2. Skill 管理只在 Tauri 桌面端可达；Web 端不获得 Home 文件系统能力。
3. 路径、扫描、hash、链接、复制、ZIP 和删除全部由 Rust 模块实现。
4. 普通 Skill 文件命令只接受 `skillId + relativePath`，由 Rust 从固定根目录解析并做越界校验。
5. 启用状态从目标文件系统事实计算，状态至少区分 enabled、disabled、stale、broken、conflict。
6. 物理同步以 canonical `skillsPath` 形成的 TargetGroup 为粒度；共享路径的工具 UI 状态联动。
7. 复制目标带 `.promptclip-sync.json`；只有有效受管目标可被自动更新或删除。
8. 外部 Skill 导入采用复制和用户显式冲突决策，不移动外部源。
9. Web 与桌面复用 UI 代码和视觉系统，但通过运行时门禁与 lazy chunk 隔离 Skill 页面。
10. 第一阶段只实现 Claude Code、Codex、Cursor、OpenCode 和通用 `~/.agents/skills` 目标；
    其余 Skills-Manager 工具定义延后。
11. 收藏通过独立列表筛选提供，不参与默认名称排序。

## Alternatives Considered

### 扩展现有 FileRepository

- 优点：前端接口一致，fake repository 容易测试。
- 缺点：现有抽象允许调用方提供工作区根；扩展到 Home 和 Agent 目录会扩大 Web/前端权限，且难以表达
  symlink、junction、原子目录替换和管理标记。
- 结论：拒绝。保留 Prompt 工作区抽象，新增桌面专用 Skill 原生域。

### 前端直接调用 Tauri FS 插件

- 优点：代码量较少。
- 缺点：业务和安全规则散落在 React；容易接收任意绝对路径；无法可靠保证删除前的受管状态验证。
- 结论：拒绝。前端只调用有业务语义的命令。

### 把整个 Hub 链接到每个 Agent 的 skills 目录

- 优点：实现最简单，源更新即时生效。
- 缺点：无法针对单个 Skill/工具启停；会覆盖 Agent 目录中的既有资产；共享目录冲突严重。
- 结论：拒绝。每个 Skill 在每个 TargetGroup 独立管理。

### 把同步状态作为配置 bool 持久化

- 优点：读取快、UI 简单。
- 缺点：用户可在应用外修改文件；链接可断裂，复制可过期，配置会与事实漂移。
- 结论：拒绝。配置只保存意图和偏好，状态每次从文件系统重建。

### 导入时移动外部 Skill 到 Hub 再回链

- 优点：可立刻完成“收编”。
- 缺点：扫描/导入会改变用户现有工具目录；跨文件系统和失败回滚复杂；不符合最小破坏原则。
- 结论：拒绝。默认复制导入，接管是后续明确动作。

## Consequences

- Rust 侧会新增一个相对完整的 Skill 域，而不是把逻辑放进现有 `lib.rs` 或 React。
- 每次进入页面和重新扫描需要访问多个本地目录，但结果更可靠；可在后续加入短期内存缓存。
- UI 不能只用彩色/黑白两态，需要为 stale、broken、conflict 增加角标和说明。
- 共享路径下无法满足“同一物理目录、不同工具独立启停”；产品必须明确展示联动语义。
- 复制模式需要保存后增量刷新或全量原子复制，速度低于链接，但适配不支持链接的工具。
- 图标可参考 MIT 项目，但必须保留第三方版权与许可证声明。
- 增加 Rust ZIP/hash/Home 解析依赖前需要审批并完成供应链检查。

## Follow-up

- 按 `specs/skill-management.md` 和 `IMPLEMENTATION_PLAN.md` 进入 RED/GREEN TDD 实现。
- 若未来引入更多 Agent、项目级 Skill、多 Hub 或云同步，应先更新规格；改变本 ADR 核心边界时
  新建替代 ADR，不直接改写本决策历史。
