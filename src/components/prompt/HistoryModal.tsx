import { useEffect, useState } from 'react';
import { messages, useTranslation, type Locale } from '@/i18n';
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
  locale?: Locale;
  versions: HistoryVersion[];
  selectedFilename: string | null;
  onSelect: (filename: string) => void;
}

interface HistoryVersionDetailProps {
  locale?: Locale;
  version: HistoryVersion | null;
  copied: boolean;
  isRestoring: boolean;
  onCopy: () => void;
  onRestore: () => void;
}

export function HistoryModal({ isOpen, prompt, onClose }: HistoryModalProps) {
  const { locale, t } = useTranslation();
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
        setError(t.app.noWorkspace);
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
          setError(err instanceof Error ? err.message : t.app.historyLoadFailed);
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
  }, [isOpen, prompt.id, t.app.historyLoadFailed, t.app.noWorkspace, workspace]);

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
      setError(err instanceof Error ? err.message : t.app.historyCopyFailed);
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
      setError(err instanceof Error ? err.message : t.app.historyRestoreFailed);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.app.historyVersions}
      maxWidth="2xl"
      className="max-w-5xl"
      closeLabel={t.app.close}
      closeOnOverlayClick={!isRestoring}
      closeOnEscape={!isRestoring}
    >
      <div className="flex h-[72vh] min-h-[520px] overflow-hidden">
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-border pr-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              {t.app.loading}
            </div>
          ) : (
            <HistoryVersionList
              locale={locale}
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
            locale={locale}
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
  locale = 'zh-CN',
  versions,
  selectedFilename,
  onSelect,
}: HistoryVersionListProps) {
  const t = messages[locale];

  if (versions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted">
        {t.app.noHistoryVersions}
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
  locale = 'zh-CN',
  version,
  copied,
  isRestoring,
  onCopy,
  onRestore,
}: HistoryVersionDetailProps) {
  const t = messages[locale];

  if (!version) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        {t.app.selectHistoryVersion}
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
            <span>{t.app.characterCount(countChars(version.content))}</span>
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
            {copied ? t.app.copied : t.app.copy}
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
            {isRestoring ? t.app.restoring : t.app.restore}
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
