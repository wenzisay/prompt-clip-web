import { watch, type DebouncedWatchOptions, type UnwatchFn } from '@tauri-apps/plugin-fs';
import { CONFIG } from '@/constants/config';
import type { FileRepository } from '@/services/fileRepository';
import { createFileSnapshot, diffFileSnapshots, type FileSnapshot } from './snapshot';
import type { WorkspaceChangeSource } from './types';

type NativeWatch = (
  path: string,
  callback: () => void,
  options: DebouncedWatchOptions
) => Promise<UnwatchFn>;

const NATIVE_WATCH_DELAY_MS = 500;

export function createTauriWorkspaceChangeSource(
  repository: FileRepository,
  nativeWatch: NativeWatch = watch
): WorkspaceChangeSource {
  return {
    async start(workspace, onChange) {
      if (!workspace.path) {
        throw new Error('工作区路径不可用');
      }

      let snapshot: FileSnapshot = createFileSnapshot(
        await repository.listFiles(workspace, [...CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS])
      );
      let isStopped = false;
      let isScanning = false;
      let hasPendingScan = false;

      const scan = async (): Promise<void> => {
        if (isStopped) return;
        if (isScanning) {
          hasPendingScan = true;
          return;
        }

        isScanning = true;
        try {
          do {
            hasPendingScan = false;
            const nextSnapshot = createFileSnapshot(
              await repository.listFiles(workspace, [...CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS])
            );
            if (isStopped) return;

            const changes = diffFileSnapshots(snapshot, nextSnapshot);
            snapshot = nextSnapshot;
            if (changes.length > 0) {
              onChange({ workspaceId: workspace.id, changes, source: 'native-watch' });
            }
          } while (hasPendingScan && !isStopped);
        } catch (error) {
          console.error('Failed to scan native workspace changes:', error);
        } finally {
          isScanning = false;
        }
      };

      const unwatch = await nativeWatch(workspace.path, () => void scan(), {
        delayMs: NATIVE_WATCH_DELAY_MS,
        recursive: true,
      });

      return () => {
        isStopped = true;
        unwatch();
      };
    },
  };
}
