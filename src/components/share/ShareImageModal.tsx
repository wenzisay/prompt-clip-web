import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Modal } from '@/components/common';
import {
  DEFAULT_SHARE_IMAGE_OPTIONS,
  SHARE_CARD_WIDTH,
  SHARE_TEMPLATES,
} from '@/constants/shareTemplates';
import { useTranslation } from '@/i18n';
import { ShareImageService } from '@/services/shareImageService';
import { usePromptStore } from '@/stores/promptStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { useFileStore } from '@/stores/fileStore';
import { AnnotationService } from '@/services/annotationService';
import { PromptService } from '@/services/promptService';
import { fileRepository } from '@/services/fileRepository';
import type { PromptAnnotation } from '@/types/annotation';
import type { ShareImageOptions, ShareTemplateId } from '@/types/share';
import { ShareCardPreview } from './ShareCardPreview';

export function ShareImageModal() {
  const { locale, t } = useTranslation();
  const { modalType, selectedPromptId, closeModal } = useUIStore();
  const prompt = usePromptStore((state) =>
    state.prompts.find((item) => item.id === selectedPromptId)
  );
  const updatePrompt = usePromptStore((state) => state.updatePrompt);
  const { workspace } = useFileStore();
  const shareAuthorName = useSettingsStore((state) => state.shareAuthorName);
  const [templateId, setTemplateId] = useState<ShareTemplateId>('minimal');
  const [options, setOptions] = useState<ShareImageOptions>(DEFAULT_SHARE_IMAGE_OPTIONS);
  const [status, setStatus] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [annotations, setAnnotations] = useState<PromptAnnotation[]>([]);
  const [annotationImageUrls, setAnnotationImageUrls] = useState<Record<string, string>>({});
  const exportRef = useRef<HTMLDivElement>(null);
  const isOpen = modalType === 'share' && Boolean(prompt);

  const selectedAnnotations = options.includeAnnotations
    ? ShareImageService.selectShareAnnotations(annotations, options.selectedAnnotationIds)
    : [];

  useEffect(() => {
    if (!isOpen || !prompt) return;
    if (prompt.isContentLoaded) return;
    if (!workspace) return;
    let cancelled = false;
    PromptService.ensureContent(fileRepository, workspace, prompt)
      .then((full) => {
        if (cancelled) return;
        updatePrompt(full);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Failed to load prompt content for share:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, prompt, workspace, updatePrompt]);

  // 分享图自加载批注，避免依赖 annotationStore 单例的当前状态（可能对应别的 prompt）。
  useEffect(() => {
    if (!isOpen || !prompt || !workspace) return;

    let cancelled = false;
    AnnotationService.loadAnnotations(fileRepository, workspace, prompt.id)
      .then((file) => {
        if (cancelled) return;
        setAnnotations(file.annotations);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAnnotations([]);
        console.error('Failed to load annotations for share:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, prompt, workspace]);

  // 选中批注的图片附件转为 data URL，供分享图内联渲染与导出。
  useEffect(() => {
    const selected = options.includeAnnotations
      ? ShareImageService.selectShareAnnotations(annotations, options.selectedAnnotationIds)
      : [];
    if (!workspace || selected.length === 0) {
      setAnnotationImageUrls({});
      return;
    }

    let cancelled = false;
    const attachments = selected.flatMap((annotation) => annotation.attachments);
    Promise.all(
      attachments.map(async (attachment) => {
        const data = await AnnotationService.readAttachment(fileRepository, workspace, attachment);
        const url = await ShareImageService.binaryToDataUrl(data, attachment.mimeType);
        return [attachment.id, url] as const;
      })
    )
      .then((entries) => {
        if (cancelled) return;
        setAnnotationImageUrls(Object.fromEntries(entries));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAnnotationImageUrls({});
        console.error('Failed to load annotation images for share:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [options.includeAnnotations, options.selectedAnnotationIds, annotations, workspace]);

  const handleClose = () => {
    setTemplateId('minimal');
    setOptions(DEFAULT_SHARE_IMAGE_OPTIONS);
    setStatus(null);
    setAnnotations([]);
    setAnnotationImageUrls({});
    closeModal();
  };

  const generateBlob = async () => {
    if (!exportRef.current) {
      throw new Error(t.app.sharePreviewMissing);
    }

    return ShareImageService.renderShareNodeToBlob(exportRef.current);
  };

  const handleDownload = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    setStatus(null);
    try {
      const blob = await generateBlob();
      ShareImageService.downloadBlob(blob, ShareImageService.buildShareImageFilename(prompt.title));
      setStatus(t.app.shareImageDownloaded);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.app.shareImageGenerateFailed);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    setIsGenerating(true);
    setStatus(null);
    try {
      const blob = await generateBlob();
      await ShareImageService.copyBlobToClipboard(blob);
      setStatus(t.app.shareImageCopied);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.app.shareImageCopyFailed);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!prompt) {
    return null;
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={t.app.shareImageTitle}
        maxWidth="3xl"
        closeLabel={t.app.close}
        className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden"
        contentClassName="min-h-0 overflow-y-auto"
      >
        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <div>
              <div className="mb-2 text-sm font-semibold text-fg">{t.app.shareTemplate}</div>
              <div className="space-y-2">
                {SHARE_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setTemplateId(template.id)}
                    className={`
                      w-full rounded-lg border px-3 py-2 text-left transition-colors
                      ${
                        templateId === template.id
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-border text-fg hover:bg-surface-dim'
                      }
                    `}
                  >
                    <div className="text-sm font-medium">{template.name}</div>
                    <div className="mt-1 text-xs text-muted">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <ShareImageOptionsPanel
              annotations={annotations}
              options={options}
              onChange={setOptions}
            />
          </aside>

          <div className="min-w-0">
            <div className="mb-3 text-sm text-muted">{t.app.shareRightClickHint}</div>
            <div className="max-h-[58vh] overflow-y-auto rounded-lg border border-border bg-surface-dim">
              <div className="share-card-preview-scale">
                <ShareCardPreview
                  annotations={selectedAnnotations}
                  annotationImageUrls={annotationImageUrls}
                  authorName={shareAuthorName}
                  locale={locale}
                  options={options}
                  prompt={prompt}
                  templateId={templateId}
                />
              </div>
            </div>

            {status && <div className="mt-3 text-sm text-muted">{status}</div>}

            <div className="mt-5 flex items-center justify-end gap-3">
              <Button type="button" variant="secondary" onClick={handleClose}>
                {t.common.cancel}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCopy}
                disabled={isGenerating}
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                {t.app.copyImage}
              </Button>
              <Button type="button" onClick={handleDownload} disabled={isGenerating}>
                <span className="material-symbols-outlined text-[18px]">download</span>
                {isGenerating ? t.app.generatingImage : t.app.downloadImage}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={exportRef}
            className="share-card-export-host"
            style={{ width: SHARE_CARD_WIDTH }}
            aria-hidden="true"
          >
            <ShareCardPreview
              annotations={selectedAnnotations}
              annotationImageUrls={annotationImageUrls}
              authorName={shareAuthorName}
              locale={locale}
              options={options}
              prompt={prompt}
              templateId={templateId}
            />
          </div>,
          document.body
        )}
    </>
  );
}

interface ShareImageOptionsPanelProps {
  options: ShareImageOptions;
  annotations: PromptAnnotation[];
  onChange: (options: ShareImageOptions) => void;
}

function ShareImageOptionsPanel({ options, annotations, onChange }: ShareImageOptionsPanelProps) {
  const { t } = useTranslation();
  const hasAnnotations = annotations.length > 0;

  // 打开「包含批注」时若尚未选择任何批注，则默认全选当前 Prompt 的所有批注。
  const handleIncludeAnnotationsChange = (checked: boolean) => {
    if (checked && options.selectedAnnotationIds.length === 0 && hasAnnotations) {
      onChange({
        ...options,
        includeAnnotations: true,
        selectedAnnotationIds: annotations.map((annotation) => annotation.id),
      });
      return;
    }
    onChange({ ...options, includeAnnotations: checked });
  };

  const handleAnnotationToggle = (id: string, checked: boolean) => {
    const next = checked
      ? [...options.selectedAnnotationIds, id]
      : options.selectedAnnotationIds.filter((item) => item !== id);
    onChange({ ...options, selectedAnnotationIds: next });
  };

  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-fg">{t.app.shareOptions}</div>
      <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
        <ShareOptionSwitch
          checked={options.showAuthor}
          label={t.app.showAuthorInfo}
          onChange={(checked) => onChange({ ...options, showAuthor: checked })}
        />
        <ShareOptionSwitch
          checked={options.showLogo}
          label={t.app.showPromptClipLogo}
          onChange={(checked) => onChange({ ...options, showLogo: checked })}
        />
        <ShareOptionSwitch
          checked={options.showTags}
          label={t.app.showPromptTags}
          onChange={(checked) => onChange({ ...options, showTags: checked })}
        />
        <ShareOptionSwitch
          checked={options.renderMarkdown}
          label={t.app.renderMarkdown}
          onChange={(checked) => onChange({ ...options, renderMarkdown: checked })}
        />
        <ShareOptionSwitch
          checked={options.includeAnnotations && hasAnnotations}
          disabled={!hasAnnotations}
          label={t.app.shareIncludeAnnotations}
          onChange={handleIncludeAnnotationsChange}
        />
        {!hasAnnotations && (
          <p className="text-xs text-muted">{t.app.shareNoAnnotations}</p>
        )}
        {options.includeAnnotations && hasAnnotations && (
          <div className="mt-1 space-y-1 border-t border-border pt-2">
            {annotations.map((annotation) => {
              const isSelected = options.selectedAnnotationIds.includes(annotation.id);
              return (
                <label
                  key={annotation.id}
                  className="flex items-start gap-2 text-sm text-fg"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(event) => handleAnnotationToggle(annotation.id, event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 break-words">{annotation.text}</span>
                    {annotation.attachments.length > 0 && (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted">
                        <span className="material-symbols-outlined text-sm">image</span>
                        {annotation.attachments.length}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface ShareOptionSwitchProps {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function ShareOptionSwitch({ checked, label, disabled = false, onChange }: ShareOptionSwitchProps) {
  return (
    <label
      className={`flex items-center justify-between gap-3 text-sm text-fg ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
    >
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-accent"
      />
    </label>
  );
}
