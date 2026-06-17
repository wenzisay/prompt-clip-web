/**
 * 回收站卡片：单个被删除 Prompt 的展示与操作
 */

import type { DeletedPrompt } from '@/types/prompt';
import type { Locale } from '@/i18n';
import { messages } from '@/i18n';
import { formatDateTime } from '@/utils/date';

export interface RecycleCardProps {
  deleted: DeletedPrompt;
  locale?: Locale;
  onView: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
}

export function RecycleCard({
  deleted,
  locale = 'zh-CN',
  onView,
  onRestore,
  onPermanentDelete,
}: RecycleCardProps) {
  const t = messages[locale];

  return (
    <div
      className="rounded-card border border-border bg-surface p-4 transition-colors hover:bg-surface-dim"
      data-testid="recycle-card"
      data-trash-base={deleted.trashBase}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-fg" title={deleted.title}>
            {deleted.title}
          </h3>
          <p className="mt-1 text-xs text-muted">
            {t.recycle.deletedAt(formatDateTime(deleted.deletedAt))}
          </p>
          {deleted.hasAnnotations && (
            <span className="mt-2 inline-flex items-center rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
              {t.recycle.hasAnnotationsBadge}
            </span>
          )}
        </div>
      </div>

      {deleted.preview && (
        <p className="mt-3 line-clamp-2 text-xs text-muted">{deleted.preview}</p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onView}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-fg transition-colors hover:bg-surface-dim"
        >
          <span className="material-symbols-outlined text-base">visibility</span>
          {t.recycle.view}
        </button>
        <button
          type="button"
          onClick={onRestore}
          className="inline-flex h-8 items-center gap-1 rounded-md bg-accent px-2.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          <span className="material-symbols-outlined text-base">restore</span>
          {t.recycle.restore}
        </button>
        <button
          type="button"
          onClick={onPermanentDelete}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-surface px-2.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <span className="material-symbols-outlined text-base">delete_forever</span>
          {t.recycle.permanentDelete}
        </button>
      </div>
    </div>
  );
}
