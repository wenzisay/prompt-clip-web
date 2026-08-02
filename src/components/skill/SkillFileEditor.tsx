import { useEffect, useMemo, useState } from 'react';
import { PromptContent } from '@/components/prompt/PromptContent';
import { useTranslation } from '@/i18n';
import { splitFrontmatter } from '@/utils/markdown';
import type { SkillFileEntry, SkillTextFile } from '@/types/skill';

const isHtmlFileName = (name: string): boolean => {
  const lower = name.toLowerCase();
  return lower.endsWith('.html') || lower.endsWith('.htm');
};

export interface SkillFileEditorProps {
  entry: SkillFileEntry | null;
  file: SkillTextFile | null;
  onSave: (content: string, expectedModifiedAtMs: number) => void;
  onDownload: () => void;
  isSaving?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

export function SkillFileEditor({
  entry,
  file,
  onSave,
  onDownload,
  isSaving = false,
  onDirtyChange,
}: SkillFileEditorProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState(file?.content ?? '');
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    setContent(file?.content ?? '');
    setPreview(false);
  }, [file]);

  useEffect(() => {
    onDirtyChange?.(Boolean(file && content !== file.content));
  }, [content, file, onDirtyChange]);

  if (!entry) {
    return <div className="flex h-full items-center justify-center text-sm text-muted">{t.skills.selectFile}</div>;
  }
  if (!entry.isText) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-muted">
        <span className="material-symbols-outlined text-5xl">draft</span>
        <p className="max-w-md text-sm">{t.skills.binaryNoPreview}</p>
        <button type="button" onClick={onDownload} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">{t.skills.download}</button>
      </div>
    );
  }
  if (!file) return null;
  const dirty = content !== file.content;
  const isHtml = isHtmlFileName(entry.name);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 items-center gap-2 border-b border-border px-4">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.relativePath}</span>
        {(entry.isMarkdown || isHtml) && (
          <div
            role="group"
            aria-label={`${t.skills.edit} / ${t.skills.preview}`}
            className="grid grid-cols-2 rounded-lg border border-border bg-surface-container p-0.5"
          >
            <button
              type="button"
              aria-pressed={!preview}
              onClick={() => setPreview(false)}
              className={`min-w-16 rounded-md px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
                !preview
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:bg-surface-dim hover:text-fg'
              }`}
            >
              {t.skills.edit}
            </button>
            <button
              type="button"
              aria-pressed={preview}
              onClick={() => setPreview(true)}
              className={`min-w-16 rounded-md px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
                preview
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:bg-surface-dim hover:text-fg'
              }`}
            >
              {t.skills.preview}
            </button>
          </div>
        )}
        <button
          type="button"
          disabled={!dirty || isSaving}
          onClick={() => onSave(content, file.modifiedAtMs)}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {t.skills.save}
        </button>
      </div>
      {preview && isHtml ? (
        <SkillHtmlPreview value={content} name={entry.name} />
      ) : preview && entry.isMarkdown ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <SkillMarkdownPreview value={content} name={entry.name} />
        </div>
      ) : (
        <textarea
          aria-label={entry.name}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="min-h-0 flex-1 resize-none bg-bg p-5 font-mono text-[13px] leading-5 text-fg outline-none"
          spellCheck={false}
        />
      )}
    </div>
  );
}

/**
 * Skill HTML 预览：用 sandbox iframe 做纯静态渲染，HTML 自带的脚本不执行、
 * 样式与父应用完全隔离，避免污染 app 的全局样式或上下文。
 */
function SkillHtmlPreview({ value, name }: { value: string; name: string }) {
  return (
    <iframe
      data-testid="html-preview"
      title={name}
      srcDoc={value}
      sandbox=""
      className="min-h-0 w-full flex-1 border-0 bg-white"
    />
  );
}

/**
 * Skill Markdown 预览：顶部等宽块展示原始 frontmatter，正文复用 Prompt 详情页的 prose 渲染。
 */
function SkillMarkdownPreview({ value, name }: { value: string; name: string }) {
  const { frontmatter, body } = useMemo(() => splitFrontmatter(value), [value]);
  return (
    <div
      data-testid="markdown-preview-editor"
      aria-label={name}
      className="prose prose-sm max-w-none prompt-detail-content"
    >
      {frontmatter && (
        <pre>
          <code>{frontmatter}</code>
        </pre>
      )}
      <PromptContent content={body} />
    </div>
  );
}
