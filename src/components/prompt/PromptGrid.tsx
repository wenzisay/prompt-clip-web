/**
 * Prompt 网格组件（虚拟化）
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePromptStore } from '@/stores/promptStore';
import { useTranslation } from '@/i18n';
import { useUIStore } from '@/stores/uiStore';
import { useFileStore } from '@/stores/fileStore';
import { PromptCard } from './PromptCard';
import { Spinner } from '@/components/common';
import { PromptService } from '@/services/promptService';
import { fileRepository } from '@/services/fileRepository';
import { FilterTabs } from '@/components/layout/FilterTabs';
import { useResponsiveColumnCount } from '@/hooks/useResponsiveColumnCount';

interface PromptGridProps {
  /** 加载状态 */
  isLoading?: boolean;
}

const ESTIMATED_ROW_HEIGHT = 220;
const ROW_OVERSCAN = 2;
const ROW_GAP = 16; // 与 Tailwind gap-4 对应

export function PromptGrid({ isLoading = false }: PromptGridProps) {
  const { t } = useTranslation();
  const { filteredPrompts, deletePrompt } = usePromptStore();
  const { selectedPromptIds, toggleSelectAll, clearSelection, openModal } = useUIStore();
  const { workspace } = useFileStore();
  const selectedCount = selectedPromptIds.length;
  const [openMenuPromptId, setOpenMenuPromptId] = useState<string | null>(null);

  const { ref: setContainerRef, columnCount } = useResponsiveColumnCount<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const rowCount = Math.max(1, Math.ceil(filteredPrompts.length / columnCount));

  const promptRows = useMemo(() => {
    const rows: Array<Array<typeof filteredPrompts[number]>> = [];
    for (let i = 0; i < rowCount; i += 1) {
      rows.push(filteredPrompts.slice(i * columnCount, (i + 1) * columnCount));
    }
    return rows;
  }, [filteredPrompts, rowCount, columnCount]);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: ROW_OVERSCAN,
  });

  // 当列数或 rowCount 变化时手动触发一次 measure
  useEffect(() => {
    rowVirtualizer.measure();
  }, [columnCount, rowCount, rowVirtualizer]);

  const handleBatchDelete = async () => {
    if (!workspace || selectedPromptIds.length === 0) return;
    const confirmed = window.confirm(t.app.batchDeleteConfirm(selectedPromptIds.length));
    if (!confirmed) return;

    const selectedSet = new Set(selectedPromptIds);
    const promptsToDelete = filteredPrompts.filter((prompt) => selectedSet.has(prompt.id));

    for (const prompt of promptsToDelete) {
      await PromptService.deletePrompt(fileRepository, workspace, prompt);
      deletePrompt(prompt.id);
    }

    clearSelection();
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  // 空状态
  if (filteredPrompts.length === 0) {
    return (
      <div className="space-y-4">
        <FilterTabs />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-6xl text-muted-light mb-4">
            search_off
          </span>
          <h3 className="text-lg font-medium text-fg mb-2">{t.app.noPromptsFound}</h3>
          <p className="text-muted text-sm max-w-md">
            {t.app.emptyPromptHint}
          </p>
        </div>
      </div>
    );
  }

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize() + (rowCount - 1) * ROW_GAP;

  return (
    <div className="space-y-4 h-full flex flex-col">
      <FilterTabs />

      {selectedCount > 0 && (
        <div className="sticky top-0 z-10 bg-surface border border-border rounded-card shadow-card px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-fg">{t.app.selectedCount(selectedCount)}</span>
            <button
              onClick={() => toggleSelectAll(filteredPrompts.map((prompt) => prompt.id))}
              className="text-accent hover:underline"
            >
              {t.app.toggleSelectAll}
            </button>
            <button onClick={clearSelection} className="text-muted hover:text-fg">
              {t.app.clear}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openModal('export')}
              className="px-3 py-1.5 text-sm text-fg rounded-lg hover:bg-surface-dim transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              {t.app.export}
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-3 py-1.5 text-sm text-white bg-red-600 rounded-lg hover:opacity-90 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              {t.app.delete}
            </button>
          </div>
        </div>
      )}

      <div
        ref={(node) => {
          setContainerRef(node);
          scrollRef.current = node;
        }}
        className="prompt-card-virtual-scroll flex-1 min-h-0 overflow-y-auto"
      >
        <div
          style={{ height: totalHeight, position: 'relative' }}
          className="prompt-card-grid"
        >
          {virtualRows.map((virtualRow) => {
            const rowPrompts = promptRows[virtualRow.index] ?? [];
            const hasOpenMenu = rowPrompts.some((prompt) => prompt.id === openMenuPromptId);
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  zIndex: hasOpenMenu ? 20 : 0,
                  transform: `translateY(${virtualRow.start + virtualRow.index * ROW_GAP}px)`,
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(360px, 100%), 1fr))',
                }}
                className="grid gap-4"
              >
                {rowPrompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    onMenuOpenChange={setOpenMenuPromptId}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
