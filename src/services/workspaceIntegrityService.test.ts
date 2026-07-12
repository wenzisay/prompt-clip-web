import { describe, expect, it, vi } from 'vitest';
import { createFakeFileRepository, createFakeWorkspace } from './fileRepository';
import { WorkspaceIntegrityService } from './workspaceIntegrityService';

const workspace = createFakeWorkspace();
const DUPLICATE_ID = '11111111111111111';

function markdown(id: string | null, title: string): string {
  return [
    '---',
    'aliases: [Keep Me]',
    ...(id === null ? [] : [`id: "${id}"`]),
    `title: ${title}`,
    '---',
    '',
    `# ${title}`,
  ].join('\n');
}

describe('WorkspaceIntegrityService.repairPromptIds', () => {
  it('keeps an existing file id when a newly created copy duplicates it', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.1234);
    const repository = createFakeFileRepository({
      files: {
        'original.md': markdown(DUPLICATE_ID, 'Original'),
        'copy.md': markdown(DUPLICATE_ID, 'Original'),
      },
    });

    const result = await WorkspaceIntegrityService.repairPromptIds(repository, workspace, {
      newlyCreatedPaths: new Set(['copy.md']),
    });

    expect(result.repairs).toEqual([
      {
        path: 'copy.md',
        previousId: DUPLICATE_ID,
        newId: '17838144000001234',
        reason: 'duplicate',
      },
    ]);
    expect(repository.dumpFiles()['original.md']).toContain(`id: "${DUPLICATE_ID}"`);
    expect(repository.dumpFiles()['copy.md']).toContain('id: "17838144000001234"');
  });

  it('uses modified time and path as the deterministic startup fallback', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.2345);
    let timestamp = 0;
    const repository = createFakeFileRepository({
      now: () => new Date(timestamp += 1_000),
      files: {
        'older.md': markdown(DUPLICATE_ID, 'Renamed Original'),
        'newer.md': markdown(DUPLICATE_ID, 'Copied Title'),
      },
    });

    await WorkspaceIntegrityService.repairPromptIds(repository, workspace);

    expect(repository.dumpFiles()['older.md']).toContain(`id: "${DUPLICATE_ID}"`);
    expect(repository.dumpFiles()['newer.md']).toContain('id: "17838144000002345"');
  });

  it('adds a unique id without removing unknown frontmatter or body content', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.3456);
    const original = markdown(null, 'External');
    const repository = createFakeFileRepository({ files: { 'external.md': original } });

    const result = await WorkspaceIntegrityService.repairPromptIds(repository, workspace);
    const repaired = repository.dumpFiles()['external.md'];

    expect(result.repairs[0]).toMatchObject({ path: 'external.md', reason: 'missing' });
    expect(repaired).toContain('aliases: [Keep Me]');
    expect(repaired).toContain('id: "17838144000003456"');
    expect(repaired).toContain('# External');
  });

  it('records a failed write without blocking other repairs', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.4567).mockReturnValueOnce(0.5678);
    const repository = createFakeFileRepository({
      files: {
        'first.md': '# First',
        'second.md': '# Second',
      },
    });
    const writeText = vi.spyOn(repository, 'writeText');
    writeText.mockRejectedValueOnce(new Error('read only'));

    const result = await WorkspaceIntegrityService.repairPromptIds(repository, workspace);

    expect(result.repairs).toHaveLength(1);
    expect(result.failures).toEqual([
      { path: 'first.md', reason: 'missing', error: 'read only' },
    ]);
    expect(repository.dumpFiles()['second.md']).toContain('id: "17838144000005678"');
  });
});
