import { useEffect, useState } from 'react';
import { MarkdownPreviewEditor } from '@/components/prompt/MarkdownPreviewEditor';
import { useTranslation } from '@/i18n';
import type { SkillFileEntry, SkillTextFile } from '@/types/skill';

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 items-center gap-2 border-b border-border px-4">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.relativePath}</span>
        {entry.isMarkdown && (
          <button type="button" onClick={() => setPreview((value) => !value)} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface-dim">
            {preview ? t.skills.edit : t.skills.preview}
          </button>
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
      {preview && entry.isMarkdown ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-5"><MarkdownPreviewEditor value={content} ariaLabel={entry.name} /></div>
      ) : (
        <textarea
          aria-label={entry.name}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="min-h-0 flex-1 resize-none bg-bg p-5 font-mono text-sm leading-6 text-fg outline-none"
          spellCheck={false}
        />
      )}
    </div>
  );
}
