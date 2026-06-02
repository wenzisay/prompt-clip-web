import JSZip from 'jszip';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Prompt } from '@/types/prompt';
import { parseMarkdown } from '@/utils/markdown';
import { exportMDArchive } from './exportService';
import { ExportTargetService } from './exportTargetService';

vi.mock('./exportTargetService', () => ({
  ExportTargetService: {
    saveExportBlob: vi.fn().mockResolvedValue(true),
  },
}));

describe('exportMDArchive', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses the existing markdown basename and keeps the stable id in frontmatter', async () => {
    const prompt = createPrompt({
      id: '17474772001234567',
      title: 'Readable Prompt',
      content: '正文',
      filePath: 'nested/Readable Prompt.md',
    });

    await exportMDArchive([prompt]);

    const zip = await loadSavedZip();
    const fileNames = Object.keys(zip.files);
    expect(fileNames).toContain('Readable Prompt.md');
    expect(fileNames).not.toContain('17474772001234567.md');

    const markdown = await zip.file('Readable Prompt.md')?.async('string');
    expect(markdown).toBeDefined();
    expect(parseMarkdown(markdown ?? '').metadata.id).toBe('17474772001234567');
  });

  it('deduplicates conflicting markdown filenames before the extension', async () => {
    await exportMDArchive([
      createPrompt({
        id: '17474772001234567',
        title: 'First',
        filePath: 'alpha/Shared.md',
      }),
      createPrompt({
        id: '17474772007654321',
        title: 'Second',
        filePath: 'beta/Shared.md',
      }),
      createPrompt({
        id: '17474772009999999',
        title: 'Shared',
        filePath: '',
      }),
    ]);

    const zip = await loadSavedZip();
    expect(Object.keys(zip.files).sort()).toEqual(['Shared-2.md', 'Shared-3.md', 'Shared.md']);
  });

  it('deduplicates markdown filenames case-insensitively', async () => {
    await exportMDArchive([
      createPrompt({
        id: '17474772001234567',
        filePath: 'alpha/Shared.md',
      }),
      createPrompt({
        id: '17474772007654321',
        filePath: 'beta/shared.md',
      }),
    ]);

    const zip = await loadSavedZip();
    expect(Object.keys(zip.files).sort()).toEqual(['Shared.md', 'shared-2.md']);
  });

  it('adds duplicate suffixes before uppercase markdown extensions', async () => {
    await exportMDArchive([
      createPrompt({
        id: '17474772001234567',
        filePath: 'alpha/Prompt.MD',
      }),
      createPrompt({
        id: '17474772007654321',
        filePath: 'beta/Prompt.MD',
      }),
    ]);

    const zip = await loadSavedZip();
    expect(Object.keys(zip.files).sort()).toEqual(['Prompt-2.MD', 'Prompt.MD']);
  });
});

async function loadSavedZip(): Promise<JSZip> {
  const saveMock = vi.mocked(ExportTargetService.saveExportBlob);
  const calls = saveMock.mock.calls;
  const blob = calls[calls.length - 1]?.[0];

  expect(blob).toBeInstanceOf(Blob);
  return JSZip.loadAsync(await (blob as Blob).arrayBuffer());
}

function createPrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: '17474772000000000',
    title: 'Prompt',
    content: 'Content',
    preview: '',
    isContentLoaded: true,
    tags: [],
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    copyCount: 0,
    pinned: false,
    filePath: 'Prompt.md',
    ...overrides,
  };
}
