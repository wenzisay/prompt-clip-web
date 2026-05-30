import { useRef, useState } from 'react';
import { messages, useTranslation, type Locale } from '@/i18n';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';
import { useFileStore } from '@/stores/fileStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAnnotationStore } from '@/stores/annotationStore';
import { SideDrawer } from '@/components/common';
import {
  HistoryModal,
  AnnotationPanel,
  MarkdownModeToggle,
  MarkdownTextView,
  PromptContent,
  type MarkdownViewMode,
} from '@/components/prompt';
import { countChars } from '@/utils/markdown';
import { PromptService } from '@/services/promptService';
import { fileRepository } from '@/services/fileRepository';

export function DetailPanel() {
  const { locale, t } = useTranslation();
  const { isDetailOpen, selectedPromptId, toggleDetail, openModal } = useUIStore();
  const { prompts, updatePrompt } = usePromptStore();
  const { workspace } = useFileStore();
  const isHistoryEnabled = useSettingsStore((state) => state.historySettings.enabled);
  const annotationPromptId = useAnnotationStore((state) => state.promptId);
  const annotationCount = useAnnotationStore((state) => state.annotations.length);
  const [copied, setCopied] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [contentMode, setContentMode] = useState<MarkdownViewMode>('preview');
  const annotationSectionRef = useRef<HTMLDivElement | null>(null);

  // 获取选中的 Prompt
  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);
  const selectedPromptAnnotationCount =
    annotationPromptId === selectedPrompt?.id ? annotationCount : 0;

  // 复制内容到剪贴板
  const handleCopy = async () => {
    if (!selectedPrompt) return;

    try {
      await navigator.clipboard.writeText(selectedPrompt.content);
      if (workspace) {
        const updated = await PromptService.incrementCopyCount(fileRepository, workspace, selectedPrompt);
        updatePrompt(updated);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 切换收藏
  const handleTogglePin = async () => {
    if (!selectedPrompt || !workspace) return;
    const updated = await PromptService.togglePinned(fileRepository, workspace, selectedPrompt);
    updatePrompt(updated);
  };

  // 打开编辑模态框
  const handleEdit = () => {
    if (!selectedPrompt) return;
    openModal('edit');
  };

  const handleScrollToAnnotations = () => {
    annotationSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  if (!selectedPrompt) {
    return (
      <SideDrawer
        isOpen={isDetailOpen}
        title={t.app.detailPanel}
        onClose={() => toggleDetail(false)}
        closeLabel={t.app.close}
        resizeLabel={t.app.resizeDrawer}
        resizeTitle={t.app.dragResize}
      >
        <p className="text-muted">{t.app.noPromptSelected}</p>
      </SideDrawer>
    );
  }

  return (
    <>
      <SideDrawer
        isOpen={isDetailOpen}
        title={selectedPrompt.title}
        onClose={() => toggleDetail(false)}
        bodyClassName="p-0"
        closeLabel={t.app.close}
        resizeLabel={t.app.resizeDrawer}
        resizeTitle={t.app.dragResize}
        header={
          <div className="h-14 shrink-0 flex items-center justify-between border-b border-border px-4">
            <button
              type="button"
              onClick={() => toggleDetail(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-dim hover:text-fg"
              aria-label={t.app.close}
              title={t.app.close}
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleEdit}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-surface px-3 text-sm font-medium text-fg shadow-card transition-colors hover:bg-surface-dim"
              >
                <span className="material-symbols-outlined text-xl">edit</span>
                {t.app.edit}
              </button>
              <button
                onClick={handleCopy}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-white shadow-card transition-opacity hover:opacity-90"
              >
                <span className="material-symbols-outlined text-xl">
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? t.app.copied : t.app.copy}
              </button>
            </div>
          </div>
        }
      >
        <article className="px-6 pb-10 pt-6">
          <h1 className="mb-3 text-xl font-semibold leading-tight tracking-normal text-fg">
            {selectedPrompt.title}
          </h1>

          {/* 标签 */}
          {selectedPrompt.tags.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {selectedPrompt.tags.map((tag, index) => (
                <span
                  key={tag}
                  className={`
                    inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium
                    ${index % 2 === 0 ? 'bg-blue-50 text-accent' : 'bg-purple-50 text-tertiary'}
                  `}
                >
                  {tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}

          {/* 元数据 */}
          <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border pb-5 text-xs leading-none text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg">description</span>
              {t.app.characterCount(countChars(selectedPrompt.content))}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg">schedule</span>
              {t.app.usageCount(selectedPrompt.copyCount)}
            </span>
            <button
              type="button"
              onClick={handleTogglePin}
              className="inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-fg"
              aria-label={selectedPrompt.pinned ? t.app.unfavorite : t.app.favorite}
              title={selectedPrompt.pinned ? t.app.unfavorite : t.app.favorite}
            >
              <span
                className={`
                  material-symbols-outlined text-lg
                  ${selectedPrompt.pinned ? 'text-yellow-500' : 'text-muted'}
                `}
              >
                {selectedPrompt.pinned ? 'star' : 'star_border'}
              </span>
              {selectedPrompt.pinned ? t.app.favorited : t.app.notFavorited}
            </button>
            <AnnotationSummaryIndicator
              count={selectedPromptAnnotationCount}
              locale={locale}
              onClick={handleScrollToAnnotations}
            />
            <HistoryAction
              isHistoryEnabled={isHistoryEnabled}
              locale={locale}
              onOpen={() => setIsHistoryOpen(true)}
            />
          </div>

          <PromptContentView
            content={selectedPrompt.content}
            locale={locale}
            mode={contentMode}
            onModeChange={setContentMode}
          />

          <div ref={annotationSectionRef}>
            <AnnotationPanel promptId={selectedPrompt.id} workspace={workspace} />
          </div>
        </article>
      </SideDrawer>

      <HistoryModal
        isOpen={isHistoryOpen}
        prompt={selectedPrompt}
        onClose={() => setIsHistoryOpen(false)}
      />
    </>
  );
}

interface AnnotationSummaryIndicatorProps {
  count: number;
  locale?: Locale;
  onClick: () => void;
}

export function AnnotationSummaryIndicator({
  count,
  locale = 'zh-CN',
  onClick,
}: AnnotationSummaryIndicatorProps) {
  const t = messages[locale];
  const label = count > 0 ? t.app.annotationSummary(count) : t.app.noAnnotationSummary;

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-fg"
      aria-label={label}
      title={label}
    >
      <span className="material-symbols-outlined text-lg">chat_bubble</span>
      {label}
    </button>
  );
}

interface HistoryActionProps {
  isHistoryEnabled: boolean;
  locale?: Locale;
  onOpen: () => void;
}

export function HistoryAction({
  isHistoryEnabled,
  locale = 'zh-CN',
  onOpen,
}: HistoryActionProps) {
  const t = messages[locale];

  if (!isHistoryEnabled) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-fg"
      aria-label={t.app.viewHistory}
      title={t.app.viewHistory}
    >
      <span className="material-symbols-outlined text-lg">history</span>
      {t.app.historyVersions}
    </button>
  );
}

interface PromptContentViewProps {
  content: string;
  locale?: Locale;
  mode: MarkdownViewMode;
  onModeChange: (mode: MarkdownViewMode) => void;
}

export function PromptContentView({
  content,
  locale = 'zh-CN',
  mode,
  onModeChange,
}: PromptContentViewProps) {
  const t = messages[locale];

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-fg">{t.app.content}</h2>
        <MarkdownModeToggle locale={locale} mode={mode} onModeChange={onModeChange} />
      </div>

      {mode === 'text' ? (
        <MarkdownTextView content={content} />
      ) : (
        <PromptContent content={content} className="prompt-detail-content" />
      )}
    </>
  );
}
