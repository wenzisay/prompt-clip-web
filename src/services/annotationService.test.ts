import { describe, expect, it, vi } from 'vitest';
import { AnnotationService } from './annotationService';
import { createFakeFileRepository, createFakeWorkspace } from './fileRepository';

const workspace = createFakeWorkspace();
const promptId = '12345678901234567';
const now = new Date('2026-05-30T10:00:00.000Z');

describe('AnnotationService', () => {
  it('returns an empty annotation file when sidecar JSON does not exist', async () => {
    vi.setSystemTime(now);
    const repository = createFakeFileRepository();

    const file = await AnnotationService.loadAnnotations(repository, workspace, promptId);

    expect(file).toMatchObject({
      promptId,
      version: 1,
      annotations: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it('treats File System Access API missing file errors as empty annotations', async () => {
    vi.setSystemTime(now);
    const repository = createFakeFileRepository();
    vi.spyOn(repository, 'readText').mockRejectedValue(
      new DOMException(
        'A requested file or directory could not be found at the time an operation was processed.',
        'NotFoundError'
      )
    );

    const file = await AnnotationService.loadAnnotations(repository, workspace, promptId);

    expect(file.annotations).toEqual([]);
    expect(file.promptId).toBe(promptId);
  });

  it('creates a text annotation in the prompt sidecar JSON', async () => {
    vi.setSystemTime(now);
    const repository = createFakeFileRepository();

    const file = await AnnotationService.createAnnotation(repository, workspace, promptId, {
      text: '  这个 Prompt 在客服回复中效果稳定。  ',
    });

    expect(file.annotations).toHaveLength(1);
    expect(file.annotations[0]).toMatchObject({
      text: '这个 Prompt 在客服回复中效果稳定。',
      attachments: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    expect(repository.dumpFiles()[`.promptclip/annotations/${promptId}.json`])
      .toContain('客服回复');
  });

  it('writes one image attachment and records its relative path', async () => {
    vi.setSystemTime(now);
    const repository = createFakeFileRepository();
    const image = new Uint8Array([1, 2, 3]);

    const file = await AnnotationService.createAnnotation(repository, workspace, promptId, {
      text: '附带结果截图。',
      image: {
        data: image,
        name: 'result.png',
        mimeType: 'image/png',
      },
    });

    const annotation = file.annotations[0];
    expect(annotation.attachments).toHaveLength(1);
    expect(annotation.attachments[0]).toMatchObject({
      type: 'image',
      name: 'result.png',
      mimeType: 'image/png',
      size: 3,
    });
    expect(annotation.attachments[0].path).toContain(
      `.promptclip/assets/${promptId}/${annotation.id}/`
    );
    expect(repository.dumpBinaryFiles()[annotation.attachments[0].path])
      .toEqual([1, 2, 3]);
  });

  it('rejects non-image attachments and images larger than 5MB', async () => {
    vi.setSystemTime(now);
    const repository = createFakeFileRepository();
    const largeImage = new Uint8Array((5 * 1024 * 1024) + 1);

    await expect(
      AnnotationService.createAnnotation(repository, workspace, promptId, {
        text: '错误附件',
        image: {
          data: new Uint8Array([1]),
          name: 'notes.txt',
          mimeType: 'text/plain',
        },
      })
    ).rejects.toThrow('仅支持图片附件');

    await expect(
      AnnotationService.createAnnotation(repository, workspace, promptId, {
        text: '图片太大',
        image: {
          data: largeImage,
          name: 'large.png',
          mimeType: 'image/png',
        },
      })
    ).rejects.toThrow('图片不能超过 5MB');
  });

  it('updates annotation text and updatedAt without changing createdAt', async () => {
    vi.setSystemTime(now);
    const repository = createFakeFileRepository();
    const created = await AnnotationService.createAnnotation(repository, workspace, promptId, {
      text: '旧内容',
    });
    const annotation = created.annotations[0];

    vi.setSystemTime(new Date('2026-05-30T11:00:00.000Z'));
    const updated = await AnnotationService.updateAnnotation(repository, workspace, promptId, {
      id: annotation.id,
      text: '新内容',
    });

    expect(updated.annotations[0]).toMatchObject({
      id: annotation.id,
      text: '新内容',
      createdAt: now.toISOString(),
      updatedAt: '2026-05-30T11:00:00.000Z',
    });
  });

  it('deletes an annotation and its attachment directory', async () => {
    vi.setSystemTime(now);
    const repository = createFakeFileRepository();
    const created = await AnnotationService.createAnnotation(repository, workspace, promptId, {
      text: '带图批注',
      image: {
        data: new Uint8Array([9]),
        name: 'screen.png',
        mimeType: 'image/png',
      },
    });
    const annotation = created.annotations[0];

    const updated = await AnnotationService.deleteAnnotation(
      repository,
      workspace,
      promptId,
      annotation.id
    );

    expect(updated.annotations).toEqual([]);
    expect(repository.dumpBinaryFiles()[annotation.attachments[0].path]).toBeUndefined();
  });

  it('moves annotation JSON and assets to trash using the prompt trash base', async () => {
    vi.setSystemTime(now);
    const repository = createFakeFileRepository();
    const created = await AnnotationService.createAnnotation(repository, workspace, promptId, {
      text: '删除时带走',
      image: {
        data: new Uint8Array([7]),
        name: 'result.png',
        mimeType: 'image/png',
      },
    });
    const annotation = created.annotations[0];

    await AnnotationService.movePromptAnnotationsToTrash(
      repository,
      workspace,
      promptId,
      `${promptId}.2026-05-30-100000`
    );

    expect(repository.dumpFiles()[`.promptclip/annotations/${promptId}.json`]).toBeUndefined();
    expect(repository.dumpFiles()[`.trash/annotations/${promptId}.2026-05-30-100000.json`])
      .toContain('删除时带走');
    expect(repository.dumpBinaryFiles()[annotation.attachments[0].path]).toBeUndefined();
    expect(
      repository.dumpBinaryFiles()[
        `.trash/assets/${promptId}.2026-05-30-100000/${annotation.id}/${annotation.attachments[0].id}.png`
      ]
    ).toEqual([7]);
  });
});
