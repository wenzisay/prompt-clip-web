## 阶段 1: Stable ID 基础能力

**目标**: 为 stableId 增加类型、生成、校验、Markdown 解析和序列化能力。
**成功标准**: frontmatter `id` 按字符串读写，生成的 stableId 为 17 位数字字符串。
**测试**: 覆盖 `generateStableId`、`isStableId`、`parseMarkdown`、`serializeMarkdown`。
**状态**: 已完成

## 阶段 2: Prompt 服务迁移与历史关联

**目标**: 将 `prompt.id` 改为 stableId，加载时迁移旧文件，处理重复 ID，更新标题校验、历史、删除逻辑。
**成功标准**: 创建/加载/更新/删除/历史查询均使用 stableId，rename 后 ID 不变。
**测试**: 覆盖 spec 中的加载迁移、重复 ID、非法 ID、rename、历史匹配、回收站命名场景。
**状态**: 已完成

## 阶段 3: 导出与回归验证

**目标**: Markdown zip 导出使用可读文件名，同时 frontmatter 保留 stableId；清理旧编码相关测试。
**成功标准**: 导出文件名不使用 stableId，冲突文件名有后缀，所有现有测试通过。
**测试**: 覆盖 Markdown zip 文件名和 frontmatter id；运行 lint、type-check、test。
**状态**: 已完成
