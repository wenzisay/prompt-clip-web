import { describe, expect, it, vi } from 'vitest';
import { RecycleService } from './recycleService';
import { createFakeFileRepository, createFakeWorkspace } from './fileRepository';
import { CONFIG } from '@/constants/config';
import { isStableId } from '@/utils/id';

const workspace = createFakeWorkspace();
const TRASH = CONFIG.FILE_SYSTEM.TRASH_DIR;
const ANNOTATIONS = CONFIG.FILE_SYSTEM.ANNOTATIONS_DIR;
const ASSETS = CONFIG.FILE_SYSTEM.ANNOTATION_ASSETS_DIR;

function makePromptMarkdown(opts: { id?: string; title: string; content: string }): string {
  const idLine = opts.id ? `id: "${opts.id}"\n` : '';
  return `---
${idLine}title: "${opts.title}"
---

${opts.content}`;
}

describe('RecycleService.loadDeletedPrompts', () => {
  it('parses stableId-shaped trashBase and extracts deletedAt', async () => {
    const repository = createFakeFileRepository({
      files: {
        [`${TRASH}/12345678901234567.2025-01-15-103045.md`]: makePromptMarkdown({
          id: '12345678901234567',
          title: '客服回复 Prompt',
          content: '你好，请问有什么可以帮您？',
        }),
      },
    });

    const result = await RecycleService.loadDeletedPrompts(repository, workspace);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      trashBase: '12345678901234567.2025-01-15-103045',
      filePath: `${TRASH}/12345678901234567.2025-01-15-103045.md`,
      title: '客服回复 Prompt',
      hasAnnotations: false,
    });
    expect(result[0].deletedAt).toEqual(new Date(2025, 0, 15, 10, 30, 45));
  });

  it('parses legacy-shaped trashBase (basename without stableId)', async () => {
    const repository = createFakeFileRepository({
      files: {
        [`${TRASH}/我的标题.2025-02-20-080000.md`]: makePromptMarkdown({
          title: '我的标题',
          content: '正文内容',
        }),
      },
    });

    const result = await RecycleService.loadDeletedPrompts(repository, workspace);

    expect(result).toHaveLength(1);
    expect(result[0].trashBase).toBe('我的标题.2025-02-20-080000');
    expect(result[0].title).toBe('我的标题');
    expect(result[0].deletedAt).toEqual(new Date(2025, 1, 20, 8, 0, 0));
  });

  it('skips files with malformed timestamp', async () => {
    const repository = createFakeFileRepository({
      files: {
        [`${TRASH}/12345678901234567.broken.md`]: makePromptMarkdown({
          title: 't',
          content: '...',
        }),
        [`${TRASH}/12345678901234568.2025-03-01-120000.md`]: makePromptMarkdown({
          title: 'ok',
          content: '...',
        }),
      },
    });

    const result = await RecycleService.loadDeletedPrompts(repository, workspace);

    expect(result).toHaveLength(1);
    expect(result[0].trashBase).toBe('12345678901234568.2025-03-01-120000');
  });

  it('detects hasAnnotations when sidecar JSON exists', async () => {
    const repository = createFakeFileRepository({
      files: {
        [`${TRASH}/12345678901234567.2025-01-15-103045.md`]: makePromptMarkdown({
          title: 't',
          content: '...',
        }),
        [`${TRASH}/annotations/12345678901234567.2025-01-15-103045.json`]:
          '{"annotations":[]}',
      },
    });

    const result = await RecycleService.loadDeletedPrompts(repository, workspace);

    expect(result[0].hasAnnotations).toBe(true);
  });

  it('returns hasAnnotations=false when sidecar JSON missing', async () => {
    const repository = createFakeFileRepository({
      files: {
        [`${TRASH}/12345678901234567.2025-01-15-103045.md`]: makePromptMarkdown({
          title: 't',
          content: '...',
        }),
      },
    });

    const result = await RecycleService.loadDeletedPrompts(repository, workspace);

    expect(result[0].hasAnnotations).toBe(false);
  });

  it('sorts by deletedAt descending', async () => {
    const repository = createFakeFileRepository({
      files: {
        [`${TRASH}/old.2024-01-01-000000.md`]: makePromptMarkdown({
          title: 'old',
          content: '...',
        }),
        [`${TRASH}/new.2025-12-31-235959.md`]: makePromptMarkdown({
          title: 'new',
          content: '...',
        }),
        [`${TRASH}/mid.2025-06-15-120000.md`]: makePromptMarkdown({
          title: 'mid',
          content: '...',
        }),
      },
    });

    const result = await RecycleService.loadDeletedPrompts(repository, workspace);

    expect(result.map((r) => r.title)).toEqual(['new', 'mid', 'old']);
  });

  it('does not include files outside .trash (main dir, .history)', async () => {
    const repository = createFakeFileRepository({
      files: {
        'main.md': makePromptMarkdown({ title: 'main', content: '...' }),
        [`${CONFIG.FILE_SYSTEM.HISTORY_DIR}/12345678901234567.2025-01-01-000000.md`]:
          makePromptMarkdown({ title: 'hist', content: '...' }),
        [`${TRASH}/12345678901234567.2025-01-15-103045.md`]: makePromptMarkdown({
          title: 'trash',
          content: '...',
        }),
      },
    });

    const result = await RecycleService.loadDeletedPrompts(repository, workspace);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('trash');
  });

  it('returns empty array when trash is empty', async () => {
    const repository = createFakeFileRepository({ files: {} });

    const result = await RecycleService.loadDeletedPrompts(repository, workspace);

    expect(result).toEqual([]);
  });
});

describe('RecycleService.restorePrompt', () => {
  it('restores a legacy-shaped prompt: md gets new stableId, annotations follow', async () => {
    const trashBase = '我的标题.2025-01-15-103045';
    const repository = createFakeFileRepository({
      files: {
        [`${TRASH}/${trashBase}.md`]: makePromptMarkdown({
          title: '我的标题',
          content: '正文',
        }),
        [`${TRASH}/annotations/${trashBase}.json`]: '{"annotations":[]}',
        [`${TRASH}/assets/${trashBase}/anno-1/img.png`]: 'binary-placeholder',
      },
      binaryFiles: {
        [`${TRASH}/assets/${trashBase}/anno-1/img.png`]: new Uint8Array([1, 2, 3]),
      },
    });

    const restored = await RecycleService.restorePrompt(repository, workspace, {
      trashBase,
      filePath: `${TRASH}/${trashBase}.md`,
      title: '我的标题',
      preview: '',
      deletedAt: new Date(2025, 0, 15, 10, 30, 45),
      hasAnnotations: true,
    });

    // md 已移到主目录
    expect(restored.filePath).toBe('我的标题.md');
    expect(isStableId(restored.id)).toBe(true);

    // 原文件已不在 trash
    expect(await repository.exists(workspace, `${TRASH}/${trashBase}.md`)).toBe(false);

    // 批注 JSON 移到 active 区，且文件名 = 新 stableId
    const expectedAnnotationPath = `${ANNOTATIONS}/${restored.id}.json`;
    expect(await repository.exists(workspace, expectedAnnotationPath)).toBe(true);
    expect(await repository.exists(workspace, `${TRASH}/annotations/${trashBase}.json`)).toBe(false);

    // 附件目录也跟随 stableId
    const expectedAssetPath = `${ASSETS}/${restored.id}/anno-1/img.png`;
    expect(await repository.exists(workspace, expectedAssetPath)).toBe(true);
    expect(await repository.exists(workspace, `${TRASH}/assets/${trashBase}`)).toBe(false);
  });

  it('restores a stableId-shaped prompt: keeps original stableId', async () => {
    const stableId = '12345678901234567';
    const trashBase = `${stableId}.2025-02-01-090000`;
    const repository = createFakeFileRepository({
      files: {
        [`${TRASH}/${trashBase}.md`]: makePromptMarkdown({
          id: stableId,
          title: '保留原 ID',
          content: '...',
        }),
        [`${TRASH}/annotations/${trashBase}.json`]: '{"annotations":[]}',
      },
    });

    const restored = await RecycleService.restorePrompt(repository, workspace, {
      trashBase,
      filePath: `${TRASH}/${trashBase}.md`,
      title: '保留原 ID',
      preview: '',
      deletedAt: new Date(2025, 1, 1, 9, 0, 0),
      hasAnnotations: true,
    });

    expect(restored.id).toBe(stableId);
    expect(restored.filePath).toBe('保留原 ID.md');
    expect(await repository.exists(workspace, `${ANNOTATIONS}/${stableId}.json`)).toBe(true);
  });

  it('appends restore suffix on filename conflict', async () => {
    const trashBase = '同名.2025-01-15-103045';
    const repository = createFakeFileRepository({
      files: {
        // 主目录已有同名文件
        '同名.md': makePromptMarkdown({
          id: '99999999999999999',
          title: '同名',
          content: 'existing',
        }),
        [`${TRASH}/${trashBase}.md`]: makePromptMarkdown({
          title: '同名',
          content: 'from trash',
        }),
      },
    });

    const restored = await RecycleService.restorePrompt(repository, workspace, {
      trashBase,
      filePath: `${TRASH}/${trashBase}.md`,
      title: '同名',
      preview: '',
      deletedAt: new Date(2025, 0, 15, 10, 30, 45),
      hasAnnotations: false,
    }, {
      buildRestoreSuffix: (n) => `-恢复${n}`,
    });

    expect(restored.filePath).toBe('同名-恢复1.md');
    expect(restored.title).toBe('同名');
    // 原主目录文件未被覆盖
    expect(await repository.exists(workspace, '同名.md')).toBe(true);
  });

  it('uses default restore suffix when not provided', async () => {
    const trashBase = '冲突.2025-01-15-103045';
    const repository = createFakeFileRepository({
      files: {
        '冲突.md': makePromptMarkdown({ title: '冲突', content: '...' }),
        [`${TRASH}/${trashBase}.md`]: makePromptMarkdown({ title: '冲突', content: '...' }),
      },
    });

    const restored = await RecycleService.restorePrompt(repository, workspace, {
      trashBase,
      filePath: `${TRASH}/${trashBase}.md`,
      title: '冲突',
      preview: '',
      deletedAt: new Date(2025, 0, 15, 10, 30, 45),
      hasAnnotations: false,
    });

    expect(restored.filePath).toBe('冲突-restored-1.md');
  });

  it('skips annotation move gracefully when sidecar is absent', async () => {
    const trashBase = '无批注.2025-01-15-103045';
    const repository = createFakeFileRepository({
      files: {
        [`${TRASH}/${trashBase}.md`]: makePromptMarkdown({
          title: '无批注',
          content: '...',
        }),
        // 没有批注 JSON 也没有附件
      },
    });

    const restored = await RecycleService.restorePrompt(repository, workspace, {
      trashBase,
      filePath: `${TRASH}/${trashBase}.md`,
      title: '无批注',
      preview: '',
      deletedAt: new Date(2025, 0, 15, 10, 30, 45),
      hasAnnotations: false,
    });

    expect(restored.filePath).toBe('无批注.md');
    expect(isStableId(restored.id)).toBe(true);
    // active annotations 目录不应有该 id 的文件
    expect(await repository.exists(workspace, `${ANNOTATIONS}/${restored.id}.json`)).toBe(false);
  });
});

describe('RecycleService.permanentDelete', () => {
  it('removes md, annotation JSON, and asset directory', async () => {
    const trashBase = '12345678901234567.2025-01-15-103045';
    const repository = createFakeFileRepository({
      files: {
        [`${TRASH}/${trashBase}.md`]: makePromptMarkdown({ title: 't', content: '...' }),
        [`${TRASH}/annotations/${trashBase}.json`]: '{}',
        [`${TRASH}/assets/${trashBase}/anno-1/img.png`]: 'binary',
      },
      binaryFiles: {
        [`${TRASH}/assets/${trashBase}/anno-1/img.png`]: new Uint8Array([1]),
      },
    });

    await RecycleService.permanentDelete(repository, workspace, {
      trashBase,
      filePath: `${TRASH}/${trashBase}.md`,
      title: 't',
      preview: '',
      deletedAt: new Date(2025, 0, 15, 10, 30, 45),
      hasAnnotations: true,
    });

    expect(await repository.exists(workspace, `${TRASH}/${trashBase}.md`)).toBe(false);
    expect(await repository.exists(workspace, `${TRASH}/annotations/${trashBase}.json`)).toBe(false);
    expect(await repository.exists(workspace, `${TRASH}/assets/${trashBase}`)).toBe(false);
  });

  it('succeeds when annotation and assets are absent', async () => {
    const trashBase = 'solo.2025-01-15-103045';
    const repository = createFakeFileRepository({
      files: {
        [`${TRASH}/${trashBase}.md`]: makePromptMarkdown({ title: 't', content: '...' }),
      },
    });

    await expect(
      RecycleService.permanentDelete(repository, workspace, {
        trashBase,
        filePath: `${TRASH}/${trashBase}.md`,
        title: 't',
        preview: '',
        deletedAt: new Date(2025, 0, 15, 10, 30, 45),
        hasAnnotations: false,
      })
    ).resolves.toBeUndefined();
  });
});

describe('RecycleService.emptyRecycleBin', () => {
  it('deletes all items when all succeed', async () => {
    const repository = createFakeFileRepository({
      files: {
        [`${TRASH}/a.2025-01-01-000000.md`]: makePromptMarkdown({ title: 'a', content: '...' }),
        [`${TRASH}/b.2025-02-01-000000.md`]: makePromptMarkdown({ title: 'b', content: '...' }),
        [`${TRASH}/annotations/a.2025-01-01-000000.json`]: '{}',
      },
    });

    await RecycleService.emptyRecycleBin(repository, workspace);

    expect(await RecycleService.loadDeletedPrompts(repository, workspace)).toEqual([]);
  });

  it('throws aggregated error when some items fail, but still deletes successful ones', async () => {
    const repository = createFakeFileRepository({
      files: {
        [`${TRASH}/a.2025-01-01-000000.md`]: makePromptMarkdown({ title: 'a', content: '...' }),
        [`${TRASH}/b.2025-02-01-000000.md`]: makePromptMarkdown({ title: 'b', content: '...' }),
      },
    });

    // 让 b 的删除失败：spy remove 在路径包含 `b.2025` 时抛错
    const originalRemove = repository.remove.bind(repository);
    const spy = vi.spyOn(repository, 'remove').mockImplementation(async (ws, path) => {
      if (path.includes('b.2025')) {
        throw new Error('mock failure');
      }
      return originalRemove(ws, path);
    });

    await expect(RecycleService.emptyRecycleBin(repository, workspace)).rejects.toThrow(
      /部分文件删除失败/
    );

    // a 已被删除，b 仍存在
    expect(await repository.exists(workspace, `${TRASH}/a.2025-01-01-000000.md`)).toBe(false);
    expect(await repository.exists(workspace, `${TRASH}/b.2025-02-01-000000.md`)).toBe(true);

    spy.mockRestore();
  });

  it('succeeds with no error when trash is empty', async () => {
    const repository = createFakeFileRepository({ files: {} });

    await expect(RecycleService.emptyRecycleBin(repository, workspace)).resolves.toBeUndefined();
  });
});
