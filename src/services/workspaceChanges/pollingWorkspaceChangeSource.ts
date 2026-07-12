import { CONFIG } from '@/constants/config';
import type { FileRepository } from '@/services/fileRepository';
import { createFileSnapshot, diffFileSnapshots, type FileSnapshot } from './snapshot';
import type {
  WorkspaceChangeSource,
  WorkspaceChangeSourceKind,
} from './types';

const DEFAULT_POLL_INTERVAL_MS = 2_000;

interface PollingWorkspaceChangeSourceOptions {
  intervalMs?: number;
  documentTarget?: Pick<
    Document,
    'visibilityState' | 'addEventListener' | 'removeEventListener'
  >;
  windowTarget?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

export function createPollingWorkspaceChangeSource(
  repository: FileRepository,
  options: PollingWorkspaceChangeSourceOptions = {}
): WorkspaceChangeSource {
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const documentTarget = options.documentTarget ?? document;
  const windowTarget = options.windowTarget ?? window;

  return {
    async start(workspace, onChange) {
      let snapshot: FileSnapshot = createFileSnapshot(
        await repository.listFiles(workspace, [...CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS])
      );
      let isStopped = false;
      let isScanning = false;

      const scan = async (source: WorkspaceChangeSourceKind): Promise<void> => {
        if (isStopped || isScanning || documentTarget.visibilityState !== 'visible') {
          return;
        }

        isScanning = true;
        try {
          const nextSnapshot = createFileSnapshot(
            await repository.listFiles(workspace, [...CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS])
          );
          if (isStopped) return;

          const changes = diffFileSnapshots(snapshot, nextSnapshot);
          snapshot = nextSnapshot;
          if (changes.length > 0) {
            onChange({ workspaceId: workspace.id, changes, source });
          }
        } catch (error) {
          console.error('Failed to scan workspace changes:', error);
        } finally {
          isScanning = false;
        }
      };

      const onVisibilityChange = () => {
        if (documentTarget.visibilityState === 'visible') {
          void scan('focus-scan');
        }
      };
      const onFocus = () => void scan('focus-scan');
      const timer = window.setInterval(() => void scan('poll'), intervalMs);

      documentTarget.addEventListener('visibilitychange', onVisibilityChange);
      windowTarget.addEventListener('focus', onFocus);

      return () => {
        isStopped = true;
        window.clearInterval(timer);
        documentTarget.removeEventListener('visibilitychange', onVisibilityChange);
        windowTarget.removeEventListener('focus', onFocus);
      };
    },
  };
}
