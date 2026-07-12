import { CONFIG } from '@/constants/config';
import type { FileEntry } from '@/types/file';
import type { WorkspaceFileChange } from './types';

interface FileSnapshotEntry {
  size: number;
  modifiedAt: number;
}

export type FileSnapshot = Map<string, FileSnapshotEntry>;

function shouldTrackPath(path: string): boolean {
  const parts = path.split('/');
  const isHidden = parts.some((part) => part.startsWith('.'));
  const isInternal = parts[0] === CONFIG.FILE_SYSTEM.APP_DATA_DIR;
  return path.toLowerCase().endsWith('.md') && !isHidden && !isInternal;
}

export function createFileSnapshot(entries: FileEntry[]): FileSnapshot {
  return new Map(
    entries
      .filter((entry) => shouldTrackPath(entry.path))
      .map((entry) => [
        entry.path,
        { size: entry.size, modifiedAt: entry.modifiedAt.getTime() },
      ])
  );
}

export function diffFileSnapshots(
  previous: FileSnapshot,
  current: FileSnapshot,
  detectedAt = new Date()
): WorkspaceFileChange[] {
  const changes: WorkspaceFileChange[] = [];

  for (const [path, oldEntry] of previous) {
    const newEntry = current.get(path);
    if (!newEntry) {
      changes.push({ kind: 'deleted', path, detectedAt });
    } else if (
      oldEntry.size !== newEntry.size ||
      oldEntry.modifiedAt !== newEntry.modifiedAt
    ) {
      changes.push({ kind: 'modified', path, detectedAt });
    }
  }

  for (const path of current.keys()) {
    if (!previous.has(path)) {
      changes.push({ kind: 'created', path, detectedAt });
    }
  }

  return changes;
}
