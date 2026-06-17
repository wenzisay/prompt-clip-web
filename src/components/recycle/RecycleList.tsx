/**
 * 回收站列表：含空状态展示
 */

import type { DeletedPrompt } from '@/types/prompt';
import type { Locale } from '@/i18n';
import { messages } from '@/i18n';
import { RecycleCard } from './RecycleCard';

export interface RecycleListProps {
  items: DeletedPrompt[];
  locale?: Locale;
  onView: (deleted: DeletedPrompt) => void;
  onRestore: (deleted: DeletedPrompt) => void;
  onPermanentDelete: (deleted: DeletedPrompt) => void;
}

export function RecycleList({
  items,
  locale = 'zh-CN',
  onView,
  onRestore,
  onPermanentDelete,
}: RecycleListProps) {
  const t = messages[locale];

  if (items.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center"
        data-testid="recycle-empty"
      >
        <span className="material-symbols-outlined mb-3 text-5xl text-muted">
          delete_outline
        </span>
        <p className="text-sm text-muted">{t.recycle.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="recycle-list">
      {items.map((deleted) => (
        <RecycleCard
          key={deleted.trashBase}
          deleted={deleted}
          locale={locale}
          onView={() => onView(deleted)}
          onRestore={() => onRestore(deleted)}
          onPermanentDelete={() => onPermanentDelete(deleted)}
        />
      ))}
    </div>
  );
}
