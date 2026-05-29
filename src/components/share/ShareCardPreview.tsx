import type { Locale } from '@/i18n';
import { messages } from '@/i18n';
import promptClipLogo from '@/assets/promptclip-share-logo.png';
import { getShareTemplate, SHARE_CARD_WIDTH } from '@/constants/shareTemplates';
import { getShareContentPreview } from '@/services/shareImageService';
import type { Prompt } from '@/types/prompt';
import type { ShareImageOptions, ShareTemplateId } from '@/types/share';
import { renderMarkdownSync } from '@/utils/markdown';

export interface ShareCardPreviewProps {
  prompt: Prompt;
  authorName: string;
  options: ShareImageOptions;
  templateId: ShareTemplateId;
  locale: Locale;
}

export function ShareCardPreview({
  prompt,
  authorName,
  options,
  templateId,
  locale,
}: ShareCardPreviewProps) {
  const t = messages[locale];
  const template = getShareTemplate(templateId);
  const preview = getShareContentPreview(prompt.content);
  const html = options.renderMarkdown ? renderMarkdownSync(preview.content) : '';
  const shouldShowAuthor = options.showAuthor && authorName.trim().length > 0;
  const shouldShowTags = options.showTags && prompt.tags.length > 0;

  return (
    <div
      className={`share-card-export-root flex justify-center p-6 ${template.previewClassName}`}
      style={{ width: SHARE_CARD_WIDTH }}
    >
      <article
        className={`relative w-full overflow-hidden rounded-lg px-12 py-11 ${template.cardClassName}`}
      >
        {shouldShowAuthor && (
          <div className="mb-7 text-lg font-medium opacity-75">{authorName.trim()}</div>
        )}

        <h1
          className={`mb-7 break-words text-4xl font-semibold leading-tight ${template.titleClassName}`}
          style={{ overflowWrap: 'anywhere' }}
        >
          {prompt.title}
        </h1>

        {shouldShowTags && (
          <div className="mb-7 flex flex-wrap gap-2">
            {prompt.tags.map((tag) => (
              <span
                key={tag}
                className={`rounded-md px-3 py-1.5 text-lg font-medium ${template.tagClassName}`}
              >
                {tag.replace(/^#/, '')}
              </span>
            ))}
          </div>
        )}

        {options.renderMarkdown ? (
          <div
            className={`prompt-detail-content share-card-content break-words ${template.contentClassName}`}
            style={{ overflowWrap: 'anywhere' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre
            className={`whitespace-pre-wrap break-words font-sans text-xl leading-9 ${template.contentClassName}`}
          >
            {preview.content}
          </pre>
        )}

        {preview.isTruncated && (
          <p className="mt-8 text-sm opacity-55">{t.app.shareContentTruncated}</p>
        )}

        {options.showLogo && (
          <div className="mt-10 flex items-center justify-end gap-2 text-sm font-medium opacity-75">
            <img
              src={promptClipLogo}
              alt=""
              className={`h-7 w-7 rounded-md ${template.logoClassName}`}
            />
            <span>PromptClip</span>
          </div>
        )}
      </article>
    </div>
  );
}
