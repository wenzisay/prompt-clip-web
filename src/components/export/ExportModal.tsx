/**
 * Prompt 导出对话框
 */

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/common';
import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import { ExportService, type ExportFormat } from '@/services/exportService';

const FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string; icon: string }> = [
  { value: 'json', label: 'JSON', icon: 'data_object' },
  { value: 'csv', label: 'CSV', icon: 'table' },
  { value: 'markdown', label: 'Markdown ZIP', icon: 'folder_zip' },
];

export function ExportModal() {
  const { modalType, closeModal, selectedPromptIds } = useUIStore();
  const { prompts, filteredPrompts } = usePromptStore();
  const [format, setFormat] = useState<ExportFormat>('json');
  const [scope, setScope] = useState<'selected' | 'filtered' | 'all'>('selected');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selectedPromptIds), [selectedPromptIds]);
  const exportPrompts = useMemo(() => {
    if (scope === 'selected') {
      return prompts.filter((prompt) => selectedSet.has(prompt.id));
    }
    if (scope === 'filtered') {
      return filteredPrompts;
    }
    return prompts;
  }, [filteredPrompts, prompts, scope, selectedSet]);

  const isOpen = modalType === 'export';
  const hasSelection = selectedPromptIds.length > 0;

  useEffect(() => {
    if (isOpen && !hasSelection && scope === 'selected') {
      setScope('filtered');
    }
  }, [hasSelection, isOpen, scope]);

  const handleExport = async () => {
    setError(null);

    if (exportPrompts.length === 0) {
      setError('没有可导出的 Prompt');
      return;
    }

    setIsExporting(true);
    try {
      await ExportService.exportPrompts(exportPrompts, format);
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="导出 Prompts" maxWidth="md">
      <div className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-fg mb-2">导出范围</label>
          <div className="grid grid-cols-3 gap-2">
            <ScopeButton
              active={scope === 'selected'}
              disabled={!hasSelection}
              label={`选中 ${selectedPromptIds.length}`}
              onClick={() => setScope('selected')}
            />
            <ScopeButton
              active={scope === 'filtered'}
              label={`当前筛选 ${filteredPrompts.length}`}
              onClick={() => setScope('filtered')}
            />
            <ScopeButton
              active={scope === 'all'}
              label={`全部 ${prompts.length}`}
              onClick={() => setScope('all')}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-fg mb-2">导出格式</label>
          <div className="grid grid-cols-3 gap-2">
            {FORMAT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFormat(option.value)}
                className={`
                  px-3 py-3 rounded-lg border text-sm transition-colors
                  flex flex-col items-center gap-1
                  ${
                    format === option.value
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-border text-fg hover:bg-surface-dim'
                  }
                `}
              >
                <span className="material-symbols-outlined text-xl">{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted">将导出 {exportPrompts.length} 个 Prompt</span>
          <div className="flex items-center gap-3">
            <button
              onClick={closeModal}
              disabled={isExporting}
              className="px-4 py-2 text-sm font-medium text-fg rounded-lg hover:bg-surface-dim transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">
                {isExporting ? 'refresh' : 'download'}
              </span>
              {isExporting ? '导出中...' : '导出'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ScopeButton({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-3 py-2 rounded-lg border text-sm transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed
        ${
          active
            ? 'border-accent bg-accent-soft text-accent'
            : 'border-border text-fg hover:bg-surface-dim'
        }
      `}
    >
      {label}
    </button>
  );
}
