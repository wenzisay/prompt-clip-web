import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PromptAnnotation } from '@/types/annotation';
import { AnnotationList } from './AnnotationPanel';

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
});
