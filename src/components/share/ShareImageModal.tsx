import { useRef, useState } from 'react';
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
import type { ShareImageOptions, ShareTemplateId } from '@/types/share';
import { ShareCardPreview } from './ShareCardPreview';

export function ShareImageModal() {
  const { locale, t } = useTranslation();
  const { modalType, selectedPromptId, closeModal } = useUIStore();
  const prompt = usePromptStore((state) =>
    state.prompts.find((item) => item.id === selectedPromptId)
  );
  const shareAuthorName = useSettingsStore((state) => state.shareAuthorName);
  const [templateId, setTemplateId] = useState<ShareTemplateId>('minimal');
  const [options, setOptions] = useState<ShareImageOptions>(DEFAULT_SHARE_IMAGE_OPTIONS);
  const [status, setStatus] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const isOpen = modalType === 'share' && Boolean(prompt);

  const handleClose = () => {
    setTemplateId('minimal');
    setOptions(DEFAULT_SHARE_IMAGE_OPTIONS);
    setStatus(null);
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

            <ShareImageOptionsPanel options={options} onChange={setOptions} />
          </aside>

          <div className="min-w-0">
            <div className="mb-3 text-sm text-muted">{t.app.shareRightClickHint}</div>
            <div className="max-h-[58vh] overflow-y-auto rounded-lg border border-border bg-surface-dim">
              <div className="share-card-preview-scale">
                <ShareCardPreview
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
  onChange: (options: ShareImageOptions) => void;
}

function ShareImageOptionsPanel({ options, onChange }: ShareImageOptionsPanelProps) {
  const { t } = useTranslation();

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
      </div>
    </div>
  );
}

interface ShareOptionSwitchProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

function ShareOptionSwitch({ checked, label, onChange }: ShareOptionSwitchProps) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-fg">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-accent"
      />
    </label>
  );
}
