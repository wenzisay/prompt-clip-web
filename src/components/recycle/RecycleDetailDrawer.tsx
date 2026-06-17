/**
 * 回收站详情查看（只读）
 *
 * 从 trash 路径直接读取内容，不污染主 promptStore。
 */

import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n';
import { useFileStore } from '@/stores/fileStore';
import { SideDrawer } from '@/components/common';
import { fileRepository } from '@/services/fileRepository';
import { renderMarkdownSync } from '@/utils/markdown';
import { formatDateTime } from '@/utils/date';
import type { DeletedPrompt } from '@/types/prompt';
import type { PromptAnnotationFile } from '@/types/annotation';

export interface RecycleDetailDrawerProps {
  deleted: DeletedPrompt | null;
  onClose: () => void;
}

export function RecycleDetailDrawer({ deleted, onClose }: RecycleDetailDrawerProps) {
  const { t } = useTranslation();
  const { workspace } = useFileStore();
  const [content, setContent] = useState<string>('');
  const [annotations, setAnnotations] = useState<PromptAnnotationFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!deleted || !workspace) {
      setContent('');
      setAnnotations(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const raw = await fileRepository.readText(workspace, deleted.filePath);
        const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
        if (cancelled) return;
        setContent(body.replace(/^\r?\n/, ''));

        if (deleted.hasAnnotations) {
          const annotationPath = `_promptclip/.trash/annotations/${deleted.trashBase}.json`;
          const annotationRaw = await fileRepository.readText(workspace, annotationPath);
          if (cancelled) return;
          setAnnotations(JSON.parse(annotationRaw) as PromptAnnotationFile);
        } else {
          setAnnotations(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deleted, workspace]);

  return (
    <SideDrawer
      isOpen={deleted !== null}
      onClose={onClose}
      title={deleted?.title ?? ''}
      closeLabel={t.recycle.closeDetail}
      resizeLabel={t.app.resizeDrawer}
      resizeTitle={t.app.dragResize}
      overlayZIndex={55}
      panelZIndex={60}
      panelClassName="max-w-[calc(100vw-2rem)]"
      bodyClassName="bg-surface"
    >
      <div className="min-h-full">
        {isLoading && <p className="py-8 text-center text-sm text-muted">{t.recycle.loading}</p>}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && deleted && (
          <>
            <p className="mb-3 text-xs text-muted">
              {t.recycle.deletedAt(formatDateTime(deleted.deletedAt))}
            </p>
            <div
              className="prose prose-sm max-w-none border-t border-border pt-3 prompt-detail-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdownSync(content) }}
            />

            {annotations && annotations.annotations.length > 0 && (
              <div className="mt-6 border-t border-border pt-4">
                <h3 className="mb-3 text-sm font-semibold text-fg">
                  {t.recycle.hasAnnotationsBadge}
                </h3>
                <ul className="space-y-2">
                  {annotations.annotations.map((annotation) => (
                    <li key={annotation.id} className="rounded-md bg-surface-dim p-3 text-sm">
                      {annotation.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </SideDrawer>
  );
}
