## 目标
让 Skill 详情页的 markdown 预览:(1) 顶部以等宽 `<pre>` 代码块展示原始 frontmatter(含 `---` 包裹);(2) 正文复用 Prompt 详情页的 `PromptContent`(`prose` 富文本渲染),与 Prompt 详情页效果一致。对所有 `.md` 文件生效。

## 改动文件(共 3 个)

### 1. `src/utils/markdown.ts` — 新增 `splitFrontmatter` 纯函数
在文件中新增导出函数,把带 frontmatter 的 markdown 拆成两段:
```ts
/**
 * 拆分 frontmatter 与正文。
 * 仅识别文件开头的 `---\n...\n---\n` 块;不存在则 frontmatter 返回 null。
 */
export function splitFrontmatter(raw: string): { frontmatter: string | null; body: string } {
  const normalized = raw.replace(/^\uFEFF/, '');
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { frontmatter: null, body: raw };
  // frontmatter 保留原始 --- 包裹形式,忠实呈现
  const frontmatter = match[0].replace(/\r?\n?$/, ''); // 去掉末尾换行,展示时由 <pre> 控制
  return { frontmatter, body: normalized.slice(match[0].length) };
}
```
> 复用项目里已有的 frontmatter 正则模式(与 `parseFrontmatter` 第 81 行、`parseFrontmatterOnly` 第 150 行一致),行为统一。纯函数无副作用,符合 utils 层约定。

### 2. `src/components/skill/SkillFileEditor.tsx` — 改造预览分支
- 新增导入:`PromptContent`(`@/components/prompt/PromptContent`)、`splitFrontmatter`(`@/utils/markdown`)、`useMemo`。
- 删除 `MarkdownPreviewEditor` 的导入(预览分支不再使用;编辑态 `<textarea>` 不受影响)。
- 改造第 96–98 行的预览分支:
```tsx
{preview && entry.isMarkdown ? (
  <div className="min-h-0 flex-1 overflow-y-auto p-5">
    <SkillMarkdownPreview value={content} name={entry.name} />
  </div>
) : (
  <textarea ... />
)}
```
- 在文件内(或同目录)新增一个内部组件 `SkillMarkdownPreview`:
```tsx
function SkillMarkdownPreview({ value, name }: { value: string; name: string }) {
  const { frontmatter, body } = useMemo(() => splitFrontmatter(value), [value]);
  return (
    <div className="prose prose-sm max-w-none prompt-detail-content" data-testid="markdown-preview-editor" aria-label={name}>
      {frontmatter && (
        <pre>
          <code>{frontmatter}</code>
        </pre>
      )}
      <PromptContent content={body} />
    </div>
  );
}
```
> 关键点:
> - 外层用 `prose prose-sm max-w-none prompt-detail-content` 包裹,与 Prompt 详情页完全一致,标题/列表/链接/表格等排版统一。
> - 外层 `<pre>` 自动继承 `.prose pre` 样式(`surface-dim` 背景、圆角、`pre-wrap`),无需新增 CSS。
> - `PromptContent` 内部已经再渲染一次 `prose`,嵌套 prose 不会有副作用(只是重复 class,CSS 选择器相同,样式不会叠加放大)。
> - 保留 `data-testid="markdown-preview-editor"` 以维持现有测试契约。
> - `aria-label` 用文件名,保持无障碍语义。
> - 没有 frontmatter 的 .md 文件 → `frontmatter` 为 null,只渲染正文,行为自然。

> **嵌套 prose 的考量**:`PromptContent` 自带 `prose prose-sm max-w-none`,放在外层 `prose` 容器内属于同类嵌套。由于 `.prose` 的样式是基于类名选择器(`.prose h1` 等),子节点同样匹配,样式声明相同不会冲突或叠加(字号用 `em` 单位会随父级缩放,但两处 prose 字号基准一致,实际表现一致)。如担心,可改为外层不加 prose、让 `<pre>` 独立写一段等宽样式——但那样需要新增 CSS。权衡后采用嵌套 prose,零新增 CSS 且效果统一。

### 3. `src/components/skill/SkillFileEditor.test.tsx` — 补充预览测试
现有第 57 行断言 `getByTestId('markdown-preview-editor')` 仍会通过(testid 已保留)。新增用例覆盖新行为:
```ts
it('renders frontmatter block and prose body in Markdown preview', () => {
  const withFm: SkillTextFile = {
    ...textFile,
    content: '---\nname: demo\ndescription: hi\n---\n\n# Title\n\nbody',
  };
  render(<SkillFileEditor entry={markdownEntry} file={withFm} onSave={() => undefined} onDownload={() => undefined} />);
  fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
  const preview = screen.getByTestId('markdown-preview-editor');
  // 元数据区以原始文本形式出现(含 --- 包裹)
  expect(preview.textContent).toContain('name: demo');
  expect(preview.textContent).toContain('---');
  // 正文已渲染(prose 下 # Title 变成 <h1>)
  expect(preview.querySelector('h1')?.textContent).toBe('Title');
});
```
> 同时确认现有 "switches Markdown files..." 测试仍通过:它断言 `getByTestId` 存在(testid 保留),以及切回编辑态后 `getByRole('textbox', { name: 'SKILL.md' })` 存在(编辑态 `<textarea>` 的 aria-label 未变)。

## 不做的事
- 不动 `MarkdownPreviewEditor` 组件本身(Prompt 编辑表单还在用)。
- 不动 `PromptContent` 组件本身。
- 不新增任何 CSS(复用 `.prose` / `.prose pre`)。
- 不改 `marked` 配置、不引入新依赖。
- 不处理非 .md 文件(它们走 `<textarea>`/二进制分支,不涉及)。

## 验证
- `npm run test -- --run src/components/skill/SkillFileEditor.test.tsx`
- `npm run type-check`
- `npm run lint`
- 手动:`npm run tauri:dev`(或 web 端),进 Skill 详情页 → 选中 SKILL.md → Preview,确认顶部等宽元数据块 + 下方 prose 正文,与 Prompt 详情页排版一致;选一个无 frontmatter 的 .md 确认只显示正文。