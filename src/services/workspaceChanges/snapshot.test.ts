import { describe, expect, it } from 'vitest';
import type { FileEntry } from '@/types/file';
import { createFileSnapshot, diffFileSnapshots } from './snapshot';

function entry(path: string, size: number, modifiedAt: string): FileEntry {
  const parts = path.split('/');
  return {
    name: parts[parts.length - 1] ?? path,
    path,
    size,
    modifiedAt: new Date(modifiedAt),
  };
}

describe('workspace file snapshots', () => {
  it('detects created, modified, and deleted Markdown files', () => {
    const previous = createFileSnapshot([
      entry('deleted.md', 10, '2026-07-12T00:00:00Z'),
      entry('changed.md', 10, '2026-07-12T00:00:00Z'),
    ]);
    const current = createFileSnapshot([
      entry('changed.md', 20, '2026-07-12T00:00:01Z'),
      entry('created.md', 5, '2026-07-12T00:00:01Z'),
    ]);

    expect(diffFileSnapshots(previous, current, new Date('2026-07-12T00:00:02Z'))).toEqual([
      {
        kind: 'deleted',
        path: 'deleted.md',
        detectedAt: new Date('2026-07-12T00:00:02Z'),
      },
      {
        kind: 'modified',
        path: 'changed.md',
        detectedAt: new Date('2026-07-12T00:00:02Z'),
      },
      {
        kind: 'created',
        path: 'created.md',
        detectedAt: new Date('2026-07-12T00:00:02Z'),
      },
    ]);
  });

  it('ignores PromptClip internal and hidden directory files', () => {
    const snapshot = createFileSnapshot([
      entry('prompt.md', 10, '2026-07-12T00:00:00Z'),
      entry('_promptclip/.history/prompt.md', 10, '2026-07-12T00:00:00Z'),
      entry('.obsidian/note.md', 10, '2026-07-12T00:00:00Z'),
    ]);

    expect(Array.from(snapshot.keys())).toEqual(['prompt.md']);
  });
});
