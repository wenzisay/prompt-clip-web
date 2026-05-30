import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PromptAnnotation } from '@/types/annotation';
import { AnnotationImagePreview, AnnotationList } from './AnnotationPanel';

const annotation: PromptAnnotation = {
  id: 'annotation-1',
  text: '这条 Prompt 在客服场景表现稳定。',
  attachments: [
    {
      id: 'attachment-1',
      type: 'image',
      name: 'result.png',
      mimeType: 'image/png',
      path: '.promptclip/assets/prompt/annotation/result.png',
      size: 1024,
      createdAt: '2026-05-30T10:00:00.000Z',
    },
  ],
  createdAt: '2026-05-30T10:00:00.000Z',
  updatedAt: '2026-05-30T11:00:00.000Z',
};

describe('AnnotationList', () => {
  it('renders an empty state when there are no annotations', () => {
    const markup = renderToStaticMarkup(
      <AnnotationList
        annotations={[]}
        isSaving={false}
        onDelete={() => undefined}
        onUpdate={() => undefined}
      />
    );

    expect(markup).toContain('暂无批注');
  });

  it('renders annotation text, edited time, and attachment file name', () => {
    const markup = renderToStaticMarkup(
      <AnnotationList
        annotations={[annotation]}
        isSaving={false}
        onDelete={() => undefined}
        onUpdate={() => undefined}
      />
    );

    expect(markup).toContain('客服场景');
    expect(markup).toContain('编辑于');
    expect(markup).toContain('result.png');
  });

  it('uses the composer controls when an annotation with an image enters edit mode', () => {
    const markup = renderToStaticMarkup(
      <AnnotationList
        annotations={[annotation]}
        editingAnnotationId="annotation-1"
        isSaving={false}
        onDelete={() => undefined}
        onUpdate={() => undefined}
      />
    );

    expect(markup).toContain('>这条 Prompt 在客服场景表现稳定。</textarea>');
    expect(markup).toContain('添加图片');
    expect(markup).toContain('已选择 result.png');
    expect(markup).toContain('aria-label="移除图片"');
  });

  it('renders an enlarged image preview dialog', () => {
    const markup = renderToStaticMarkup(
      <AnnotationImagePreview
        imageUrl="blob:preview"
        imageName="result.png"
        locale="zh-CN"
        onClose={() => undefined}
      />
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-label="关闭图片预览"');
    expect(markup).toContain('alt="批注图片 result.png"');
  });
});
