/**
 * 回收站主 Modal
 *
 * 由 uiStore.modalType === 'recycleBin' 控制。
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/i18n';
import { useFileStore } from '@/stores/fileStore';
import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import { Modal, Button } from '@/components/common';
import { fileRepository } from '@/services/fileRepository';
import { RecycleService } from '@/services/recycleService';
import { PromptService } from '@/services/promptService';
import type { DeletedPrompt } from '@/types/prompt';
import { RecycleList } from './RecycleList';
import { RecycleDetailDrawer } from './RecycleDetailDrawer';

export function RecycleModal() {
  const { locale, t } = useTranslation();
  const { modalType, closeModal, addToast } = useUIStore();
  const { workspace } = useFileStore();
  const { setPrompts } = usePromptStore();

  const isOpen = modalType === 'recycleBin';

  const [items, setItems] = useState<DeletedPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyFor, setBusyFor] = useState<string | null>(null);
  const [viewing, setViewing] = useState<DeletedPrompt | null>(null);

  const refresh = useCallback(async () => {
    if (!workspace) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const list = await RecycleService.loadDeletedPrompts(fileRepository, workspace);
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.recycle.loading);
    } finally {
      setIsLoading(false);
    }
  }, [workspace, t.recycle.loading]);

  useEffect(() => {
    if (!isOpen) return;
    void refresh();
  }, [isOpen, refresh]);

  const reloadMainList = useCallback(async () => {
    if (!workspace) return;
    try {
      const prompts = await PromptService.loadPrompts(fileRepository, workspace);
      await setPrompts(prompts);
    } catch (err) {
      console.error('Failed to reload prompts after restore:', err);
    }
  }, [workspace, setPrompts]);

  const handleRestore = useCallback(
    async (deleted: DeletedPrompt) => {
      if (!workspace) return;
      if (!window.confirm(t.recycle.confirmRestore(deleted.title))) return;

      setBusyFor(deleted.trashBase);
      try {
        await RecycleService.restorePrompt(fileRepository, workspace, deleted, {
          buildRestoreSuffix: t.recycle.restoreSuffix,
        });
        addToast({
          type: 'success',
          message: t.recycle.restored(deleted.title),
          duration: 3000,
        });
        await reloadMainList();
        await refresh();
      } catch (err) {
        addToast({
          type: 'error',
          message: err instanceof Error ? err.message : t.recycle.restoreFailed,
          duration: 5000,
        });
      } finally {
        setBusyFor(null);
      }
    },
    [workspace, t, addToast, reloadMainList, refresh]
  );

  const handlePermanentDelete = useCallback(
    async (deleted: DeletedPrompt) => {
      if (!workspace) return;
      if (!window.confirm(t.recycle.confirmPermanentDelete(deleted.title))) return;

      setBusyFor(deleted.trashBase);
      try {
        await RecycleService.permanentDelete(fileRepository, workspace, deleted);
        addToast({
          type: 'success',
          message: t.recycle.permanentlyDeleted,
          duration: 3000,
        });
        await refresh();
      } catch (err) {
        addToast({
          type: 'error',
          message: err instanceof Error ? err.message : t.recycle.deleteFailed,
          duration: 5000,
        });
      } finally {
        setBusyFor(null);
      }
    },
    [workspace, t, addToast, refresh]
  );

  const handleEmptyAll = useCallback(async () => {
    if (!workspace) return;
    if (items.length === 0) return;
    if (!window.confirm(t.recycle.confirmEmptyAll)) return;

    setBusyFor('__empty_all__');
    try {
      await RecycleService.emptyRecycleBin(fileRepository, workspace);
      addToast({
        type: 'success',
        message: t.recycle.allCleared,
        duration: 3000,
      });
      await refresh();
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : t.recycle.emptyFailed,
        duration: 5000,
      });
      await refresh();
    } finally {
      setBusyFor(null);
    }
  }, [workspace, items.length, t, addToast, refresh]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={t.recycle.title}
        maxWidth="2xl"
        className="max-w-3xl"
        closeLabel={t.app.close}
        closeOnOverlayClick={busyFor === null}
        closeOnEscape={busyFor === null}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-muted">
            {items.length > 0 && (
              <>
                {items.length} / {t.recycle.title}
              </>
            )}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleEmptyAll}
            disabled={items.length === 0 || busyFor !== null}
          >
            <span className="material-symbols-outlined text-base">delete_sweep</span>
            {t.recycle.emptyAll}
          </Button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted">{t.recycle.loading}</div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <RecycleList
              items={items}
              locale={locale}
              onView={setViewing}
              onRestore={handleRestore}
              onPermanentDelete={handlePermanentDelete}
            />
          </div>
        )}
      </Modal>

      <RecycleDetailDrawer deleted={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
