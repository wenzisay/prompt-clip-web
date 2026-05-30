import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeFileRepository, createFakeWorkspace } from '@/services/fileRepository';
import { useAnnotationStore } from './annotationStore';

const workspace = createFakeWorkspace();
const promptId = '12345678901234567';

describe('useAnnotationStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-30T10:00:00.000Z'));
    useAnnotationStore.getState().reset();
  });

  it('loads annotations for the selected prompt', async () => {
    const repository = createFakeFileRepository();
    await useAnnotationStore.getState().createAnnotation(repository, workspace, promptId, {
      text: '已有批注',
    });
    useAnnotationStore.getState().reset();

    await useAnnotationStore.getState().loadAnnotations(repository, workspace, promptId);

    expect(useAnnotationStore.getState().promptId).toBe(promptId);
    expect(useAnnotationStore.getState().annotations.map((annotation) => annotation.text))
      .toEqual(['已有批注']);
    expect(useAnnotationStore.getState().error).toBeNull();
  });

  it('creates, updates, and deletes annotations through the service', async () => {
    const repository = createFakeFileRepository();

    await useAnnotationStore.getState().createAnnotation(repository, workspace, promptId, {
      text: '初始批注',
    });
    const annotation = useAnnotationStore.getState().annotations[0];

    await useAnnotationStore.getState().updateAnnotation(repository, workspace, promptId, {
      id: annotation.id,
      text: '更新后的批注',
    });

    expect(useAnnotationStore.getState().annotations[0].text).toBe('更新后的批注');

    await useAnnotationStore.getState().deleteAnnotation(
      repository,
      workspace,
      promptId,
      annotation.id
    );

    expect(useAnnotationStore.getState().annotations).toEqual([]);
  });

  it('keeps a clear error state when the service fails', async () => {
    const repository = createFakeFileRepository();

    await expect(
      useAnnotationStore.getState().createAnnotation(repository, workspace, promptId, {
        text: '错误图片',
        image: {
          data: new Uint8Array([1]),
          name: 'notes.txt',
          mimeType: 'text/plain',
        },
      })
    ).rejects.toThrow('仅支持图片附件');

    expect(useAnnotationStore.getState().error).toBe('仅支持图片附件');
    expect(useAnnotationStore.getState().isSaving).toBe(false);
  });
});
