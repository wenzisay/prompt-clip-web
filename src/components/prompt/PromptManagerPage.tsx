import { lazy, Suspense, useEffect } from 'react';
import { CommandPalette } from '@/components/command';
import { RecycleModal } from '@/components/recycle';
import { MetadataRepairPrompt, SettingsModal } from '@/components/settings';
import { DetailPanel, Sidebar, TopBar } from '@/components/layout';
import { DEFAULT_HISTORY_SETTINGS, useSettingsStore } from '@/stores/settingsStore';
import { useFileStore } from '@/stores/fileStore';
import { useMetadataRepairStore } from '@/stores/metadataRepairStore';
import { usePromptStore } from '@/stores/promptStore';
import { useTagStore } from '@/stores/tagStore';
import { useUIStore } from '@/stores/uiStore';
import { messages } from '@/i18n';
import { FolderConfigService } from '@/services/folderConfigService';
import { fileRepository } from '@/services/fileRepository';
import { MetadataRepairService } from '@/services/metadataRepairService';
import { PromptService } from '@/services/promptService';
import { WorkspaceIntegrityService } from '@/services/workspaceIntegrityService';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePromptLazyLoad } from '@/hooks/usePromptLazyLoad';
import { usePromptLoader } from '@/hooks/usePromptLoader';
import { useWorkspaceFileWatcher } from '@/hooks/useWorkspaceFileWatcher';
import { CreateModal } from './CreateModal';
import { DeleteConfirm } from './DeleteConfirm';
import { PromptGrid } from './PromptGrid';

const ExportModal = lazy(() =>
  import('@/components/export/ExportModal').then((module) => ({
    default: module.ExportModal,
  }))
);
const ShareImageModal = lazy(() =>
  import('@/components/share').then((module) => ({
    default: module.ShareImageModal,
  }))
);

export function PromptManagerPage() {
  const { workspace } = useFileStore();
  const { modalType, selectedPromptId, deletingPromptId, openModal, addToast } = useUIStore();
  const { prompts, isLoading: isPromptLoading } = usePromptStore();
  const { locale, setHistorySettings, setShareAuthorName } = useSettingsStore();
  const { setTags } = useTagStore();
  const metadataResult = useMetadataRepairStore((state) => state.result);
  const closeMetadataPrompt = useMetadataRepairStore((state) => state.close);

  useEffect(() => {
    setTags(prompts.flatMap((prompt) => prompt.tags));
  }, [prompts, setTags]);

  useEffect(() => {
    if (!workspace) {
      setHistorySettings(DEFAULT_HISTORY_SETTINGS);
      setShareAuthorName('');
      return;
    }
    let isCurrent = true;
    const currentWorkspace = workspace;
    void FolderConfigService.readFolderConfig(fileRepository, currentWorkspace).then((config) => {
      if (isCurrent) {
        setHistorySettings(config.historyVersions);
        setShareAuthorName(config.shareAuthorName);
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [workspace, setHistorySettings, setShareAuthorName]);

  usePromptLoader();
  useWorkspaceFileWatcher();
  usePromptLazyLoad();
  useKeyboardShortcuts();

  const repairDetectedMetadata = async () => {
    if (!workspace || !metadataResult) return;
    try {
      const paths = new Set(metadataResult.issues.map((issue) => issue.path));
      await WorkspaceIntegrityService.repairPromptIds(fileRepository, workspace);
      const result = await MetadataRepairService.repairPromptMetadata(
        fileRepository,
        workspace,
        { paths }
      );
      const reloaded = await PromptService.loadPrompts(fileRepository, workspace);
      await usePromptStore.getState().setPrompts(reloaded);
      addToast({
        type: 'success',
        message: messages[locale].settings.repairSucceeded(result.repairedFiles),
        duration: 2500,
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: messages[locale].settings.repairFailed,
        duration: 3000,
      });
      throw error;
    }
  };

  const editingPromptId = modalType === 'edit' ? selectedPromptId : null;
  const deletingPrompt = prompts.find((prompt) => prompt.id === deletingPromptId);

  return (
    <div className="h-screen w-screen flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <div className="flex-1 min-h-0 px-6 pb-6 pt-4 bg-bg">
            <PromptGrid isLoading={isPromptLoading} />
          </div>
        </main>
      </div>
      <DetailPanel />
      <CreateModal
        editingPromptId={editingPromptId}
        key={`modal-${modalType}-${editingPromptId}`}
      />
      {deletingPrompt && (
        <DeleteConfirm promptId={deletingPrompt.id} promptTitle={deletingPrompt.title} />
      )}
      <CommandPalette />
      {modalType === 'export' && (
        <Suspense fallback={null}>
          <ExportModal />
        </Suspense>
      )}
      <SettingsModal />
      <MetadataRepairPrompt
        onRepair={repairDetectedMetadata}
        onViewDetails={() => {
          closeMetadataPrompt();
          openModal('settings');
        }}
      />
      {modalType === 'share' && (
        <Suspense fallback={null}>
          <ShareImageModal />
        </Suspense>
      )}
      <RecycleModal />
    </div>
  );
}
