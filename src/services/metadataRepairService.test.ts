import { describe, expect, it, vi } from 'vitest';
import { createFakeFileRepository, createFakeWorkspace } from './fileRepository';
import { MetadataRepairService } from './metadataRepairService';

const workspace = createFakeWorkspace();

describe('MetadataRepairService', () => {
  it('scans markdown files that need PromptClip metadata', async () => {
    const repository = createFakeFileRepository({
      files: {
        'obsidian.md': '# Obsidian Prompt\n\nBody',
        'ready.md': [
          '---',
          'id: "11111111111111111"',
          'title: Ready',
          'tags: []',
          'created: "2026-05-17T00:00:00.000Z"',
          'modified: "2026-05-17T00:00:00.000Z"',
          'copy_count: 0',
          'pinned: false',
          '---',
          '',
          'Body',
        ].join('\n'),
      },
    });

    const result = await MetadataRepairService.scanPromptMetadata(repository, workspace);

    expect(result.totalMarkdownFiles).toBe(2);
    expect(result.healthyFiles).toBe(1);
    expect(result.repairableFiles).toBe(1);
    expect(result.issues[0]).toMatchObject({
      path: 'obsidian.md',
      title: 'Obsidian Prompt',
      missingFields: ['title', 'tags', 'created', 'modified', 'copy_count', 'pinned'],
      invalidFields: [],
    });
  });

  it('repairs missing metadata without removing existing Obsidian frontmatter', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T00:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.4567);
    const repository = createFakeFileRepository({
      now: () => new Date('2026-05-17T08:30:00.000Z'),
      files: {
        'nested/obsidian.md': [
          '---',
          'aliases: [Prompt Note]',
          'tags:',
          '  - ai/prompt',
          '---',
          '# Heading Title',
          '',
          'Body',
        ].join('\n'),
      },
    });

    const result = await MetadataRepairService.repairPromptMetadata(repository, workspace);
    const repaired = repository.dumpFiles()['nested/obsidian.md'];

    expect(result.repairedFiles).toBe(1);
    expect(repaired).toContain('aliases: [Prompt Note]');
    expect(repaired).toContain('tags:\n  - ai/prompt');
    expect(repaired).toContain('title: "Heading Title"');
    expect(repaired).toContain('created: "2026-05-17T08:30:00.000Z"');
    expect(repaired).toContain('modified: "2026-05-17T08:30:00.000Z"');
    expect(repaired).toContain('copy_count: 0');
    expect(repaired).toContain('pinned: false');
    expect(repaired).toContain('# Heading Title\n\nBody');
  });

  it('keeps complete files unchanged', async () => {
    const content = [
      '---',
      'id: "11111111111111111"',
      'title: Ready',
      'tags: ["work"]',
      'created: "2026-05-17T00:00:00.000Z"',
      'modified: "2026-05-17T00:00:00.000Z"',
      'copy_count: 0',
      'pinned: false',
      '---',
      '',
      'Body',
    ].join('\n');
    const repository = createFakeFileRepository({
      files: {
        'ready.md': content,
      },
    });

    const result = await MetadataRepairService.repairPromptMetadata(repository, workspace);

    expect(result.repairedFiles).toBe(0);
    expect(repository.dumpFiles()['ready.md']).toBe(content);
  });

  it('does not report id-only issues that are repaired automatically', async () => {
    const repository = createFakeFileRepository({
      files: {
        'id-only.md': [
          '---',
          'title: Ready',
          'tags: []',
          'created: "2026-05-17T00:00:00.000Z"',
          'modified: "2026-05-17T00:00:00.000Z"',
          'copy_count: 0',
          'pinned: false',
          '---',
          '',
          'Body',
        ].join('\n'),
      },
    });

    const result = await MetadataRepairService.scanPromptMetadata(repository, workspace);

    expect(result.repairableFiles).toBe(0);
  });

  it('can limit metadata scanning to newly created paths', async () => {
    const repository = createFakeFileRepository({
      files: {
        'old.md': '# Old',
        'new.md': '# New',
      },
    });

    const result = await MetadataRepairService.scanPromptMetadata(repository, workspace, {
      paths: new Set(['new.md']),
    });

    expect(result.totalMarkdownFiles).toBe(1);
    expect(result.issues[0].path).toBe('new.md');
  });
});
