import { useEffect, useState } from 'react';
import type { HistoryVersion, Prompt } from '@/types/prompt';
import { useFileStore } from '@/stores/fileStore';
import { usePromptStore } from '@/stores/promptStore';
import { Modal } from '@/components/common';
import { PromptService } from '@/services/promptService';
import { fileRepository } from '@/services/fileRepository';
import { countChars, renderMarkdownSync } from '@/utils/markdown';
import { formatDateTime } from '@/utils/date';

export interface HistoryModalProps {
  isOpen: boolean;
  prompt: Prompt;
  onClose: () => void;
}

interface HistoryVersionListProps {
  versions: HistoryVersion[];
  selectedFilename: string | null;
  onSelect: (filename: string) => void;
}

interface HistoryVersionDetailProps {
  version: HistoryVersion | null;
  copied: boolean;
  isRestoring: boolean;
  onCopy: () => void;
  onRestore: () => void;
}

export function HistoryModal({ isOpen, prompt, onClose }: HistoryModalProps) {
  const { workspace } = useFileStore();
  const { updatePrompt } = usePromptStore();
  const [versions, setVersions] = useState<HistoryVersion[]>([]);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;

    async function loadVersions() {
      if (!workspace) {
        setError('未选择目录');
        return;
      }

      setIsLoading(true);
      setError(null);
      setCopied(false);

      try {
        const historyVersions = await PromptService.getHistoryVersions(
          fileRepository,
          workspace,
          prompt.id
        );

        if (isCancelled) {
          return;
        }

        setVersions(historyVersions);
        setSelectedFilename(historyVersions[0]?.filename ?? null);
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : '读取历史版本失败');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadVersions();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, prompt.id, workspace]);

  const selectedVersion =
    versions.find((version) => version.filename === selectedFilename) ?? null;

  const handleCopy = async () => {
    if (!selectedVersion) {
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedVersion.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '复制历史版本失败');
    }
  };

  const handleRestore = async () => {
    if (!workspace || !selectedVersion) {
      return;
    }

    setIsRestoring(true);
    setError(null);

    try {
      const restored = await PromptService.restoreHistoryVersion(
        fileRepository,
        workspace,
        prompt,
        selectedVersion.filename
      );
      updatePrompt(restored);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '恢复历史版本失败');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="历史版本"
      maxWidth="2xl"
      className="max-w-5xl"
      closeOnOverlayClick={!isRestoring}
      closeOnEscape={!isRestoring}
    >
      <div className="flex h-[72vh] min-h-[520px] overflow-hidden">
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-border pr-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              加载中...
            </div>
          ) : (
            <HistoryVersionList
              versions={versions}
              selectedFilename={selectedFilename}
              onSelect={(filename) => {
                setSelectedFilename(filename);
                setCopied(false);
              }}
            />
          )}
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto pl-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <HistoryVersionDetail
            version={selectedVersion}
            copied={copied}
            isRestoring={isRestoring}
            onCopy={handleCopy}
            onRestore={handleRestore}
          />
        </section>
      </div>
    </Modal>
  );
}

export function HistoryVersionList({
  versions,
  selectedFilename,
  onSelect,
}: HistoryVersionListProps) {
  if (versions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted">
        暂无历史版本
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {versions.map((version) => {
        const isSelected = version.filename === selectedFilename;

        return (
          <button
            key={version.filename}
            type="button"
            onClick={() => onSelect(version.filename)}
            className={`
              w-full rounded-lg px-3 py-3 text-left transition-colors
              ${isSelected ? 'bg-accent-soft text-accent' : 'text-fg hover:bg-surface-dim'}
            `}
          >
            <span className="block truncate text-sm font-medium">{version.title}</span>
            <span className="mt-1 block text-xs text-muted">
              {formatDateTime(version.editedAt)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function HistoryVersionDetail({
  version,
  copied,
  isRestoring,
  onCopy,
  onRestore,
}: HistoryVersionDetailProps) {
  if (!version) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        请选择历史版本
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-fg">{version.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <span>{formatDateTime(version.editedAt)}</span>
            <span>{countChars(version.content)} 字符</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-surface px-3 text-sm font-medium text-fg shadow-card transition-colors hover:bg-surface-dim"
          >
            <span className="material-symbols-outlined text-xl">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? '已复制' : '复制'}
          </button>
          <button
            type="button"
            onClick={onRestore}
            disabled={isRestoring}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-white shadow-card transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-xl">
              {isRestoring ? 'refresh' : 'restore'}
            </span>
            {isRestoring ? '恢复中...' : '恢复'}
          </button>
        </div>
      </div>

      {version.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {version.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-accent"
            >
              {tag.replace(/^#/, '')}
            </span>
          ))}
        </div>
      )}

      <div
        className="prose prose-sm max-w-none border-t border-border pt-4 prompt-detail-content"
        dangerouslySetInnerHTML={{ __html: renderMarkdownSync(version.content) }}
      />
    </div>
  );
}
