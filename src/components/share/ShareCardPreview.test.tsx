import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PromptAnnotation } from '@/types/annotation';
import type { Prompt } from '@/types/prompt';
import type { ShareImageOptions } from '@/types/share';
import { ShareCardPreview } from './ShareCardPreview';

const prompt: Prompt = {
  id: 'share-preview',
  title: '分享标题',
  content: '# 一级标题\n\n- 第一条\n- 第二条',
  preview: '# 一级标题',
  isContentLoaded: true,
  tags: ['效率', 'AI'],
  createdAt: new Date('2026-05-14T00:00:00.000Z'),
  updatedAt: new Date('2026-05-14T00:00:00.000Z'),
  copyCount: 0,
  pinned: false,
  filePath: 'share-preview.md',
};

const baseOptions: ShareImageOptions = {
  showAuthor: false,
  showLogo: false,
  showTags: false,
  renderMarkdown: false,
  includeAnnotations: false,
  selectedAnnotationIds: [],
};

const annotationWithImage: PromptAnnotation = {
  id: 'anno-1',
  text: '使用效果很好',
  attachments: [
    {
      id: 'att-1',
      type: 'image',
      name: 'screenshot.png',
      mimeType: 'image/png',
      path: 'annotations/assets/share-preview/anno-1/att-1.png',
      size: 1024,
      createdAt: '2026-06-24T00:00:00.000Z',
    },
  ],
  createdAt: '2026-06-24T00:00:00.000Z',
  updatedAt: '2026-06-24T00:00:00.000Z',
};

describe('ShareCardPreview', () => {
  it('renders markdown by default with author, tags and logo', () => {
    const markup = renderToStaticMarkup(
      <ShareCardPreview
        authorName="周文超"
        locale="zh-CN"
        options={{
          ...baseOptions,
          renderMarkdown: true,
          showAuthor: true,
          showLogo: true,
          showTags: true,
        }}
        prompt={prompt}
        templateId="minimal"
      />
    );

    expect(markup).toContain('周文超');
    expect(markup).toContain('<h1>一级标题</h1>');
    expect(markup).toContain('效率');
    expect(markup).toContain('AI');
    expect(markup).toContain('PromptClip');
    expect(markup).toContain('width:800px');
    expect(markup).toContain('text-4xl');
    expect(markup).toContain('opacity-55');
  });

  it('can render plain text and hide optional sections', () => {
    const markup = renderToStaticMarkup(
      <ShareCardPreview
        authorName="周文超"
        locale="zh-CN"
        options={baseOptions}
        prompt={prompt}
        templateId="minimal"
      />
    );

    expect(markup).toContain('# 一级标题');
    expect(markup).not.toContain('<h1>一级标题</h1>');
    expect(markup).not.toContain('周文超');
    expect(markup).not.toContain('效率');
    expect(markup).not.toContain('PromptClip');
  });

  it('shows a truncation notice for content longer than 2000 characters', () => {
    const markup = renderToStaticMarkup(
      <ShareCardPreview
        authorName=""
        locale="zh-CN"
        options={baseOptions}
        prompt={{ ...prompt, content: 'a'.repeat(2001) }}
        templateId="minimal"
      />
    );

    expect(markup).toContain('内容已截断');
  });

  it('allows long titles and markdown code blocks to wrap inside the card', () => {
    const markup = renderToStaticMarkup(
      <ShareCardPreview
        authorName=""
        locale="zh-CN"
        options={{ ...baseOptions, renderMarkdown: true }}
        prompt={{
          ...prompt,
          title: 'averyveryveryveryveryveryverylongtitle',
          content: '```text\naveryveryveryveryveryveryverylongline\n```',
        }}
        templateId="minimal"
      />
    );

    expect(markup).toContain('overflow-wrap:anywhere');
    expect(markup).toContain('share-card-content');
    expect(markup).toContain('<pre>');
  });

  it('renders the annotation section with text and image attachments when provided', () => {
    const markup = renderToStaticMarkup(
      <ShareCardPreview
        authorName=""
        locale="zh-CN"
        options={{ ...baseOptions, includeAnnotations: true, selectedAnnotationIds: ['anno-1'] }}
        prompt={prompt}
        templateId="minimal"
        annotations={[annotationWithImage]}
        annotationImageUrls={{ 'att-1': 'data:image/png;base64,abc' }}
      />
    );

    expect(markup).toContain('Note'); // Note 分隔标签
    expect(markup).toContain('使用效果很好'); // 批注文本
    expect(markup).toContain('data:image/png;base64,abc'); // 内联图片
    expect(markup).not.toContain('<h2'); // 不再有「批注」标题
  });

  it('omits the annotation section when annotations is empty', () => {
    const markup = renderToStaticMarkup(
      <ShareCardPreview
        authorName=""
        locale="zh-CN"
        options={{ ...baseOptions, includeAnnotations: true }}
        prompt={prompt}
        templateId="minimal"
        annotations={[]}
        annotationImageUrls={{}}
      />
    );

    expect(markup).not.toContain('Note');
  });
});
