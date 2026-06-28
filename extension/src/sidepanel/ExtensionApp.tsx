/**
 * 扩展侧边栏根组件
 *
 * 编排逻辑复刻自仓库根 App.tsx（initialize / loaders / settings / locale），
 * 仅将"已授权主界面"从宽屏三栏替换为窄列 NarrowMain；DetailPanel 与全部 Modal
 * 直接复用（DetailPanel 本身已是 SideDrawer 抽屉形态）。
 *
 * 决策见 IMPLEMENTATION_PLAN.md D2/D4。
 */
import { lazy, Suspense, useEffect } from 'react';
import { useFileStore } from '@/stores/fileStore';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTagStore } from '@/stores/tagStore';
import { FolderConfigService } from '@/services/folderConfigService';
import { fileRepository } from '@/services/fileRepository';
import { usePromptLoader } from '@/hooks/usePromptLoader';
import { usePromptLazyLoad } from '@/hooks/usePromptLazyLoad';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { DetailPanel } from '@/components/layout';
import { CreateModal, DeleteConfirm } from '@/components/prompt';
import { CommandPalette } from '@/components/command';
import { SettingsModal } from '@/components/settings';
import { RecycleModal } from '@/components/recycle';
import { NarrowWelcome } from './NarrowWelcome';
import { NarrowMain } from './NarrowMain';

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

export function ExtensionApp() {
  const { hasInitialized, isAuthorized, workspace, initialize } = useFileStore();
  const { modalType, selectedPromptId, deletingPromptId } = useUIStore();
  const { prompts } = usePromptStore();
  const { locale, resetSettings, setHistorySettings, setShareAuthorName } = useSettingsStore();
  const { setTags } = useTagStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    setTags(prompts.flatMap((prompt) => prompt.tags));
  }, [prompts, setTags]);

  useEffect(() => {
    if (locale === 'zh-CN') document.documentElement.lang = 'zh-Hans';
    else if (locale === 'zh-TW') document.documentElement.lang = 'zh-Hant';
    else if (locale === 'ja-JP') document.documentElement.lang = 'ja';
    else document.documentElement.lang = 'en';
  }, [locale]);

  useEffect(() => {
    if (!workspace) {
      resetSettings();
      return;
    }
    let isCurrent = true;
    const currentWorkspace = workspace;
    async function loadSettings() {
      const config = await FolderConfigService.readFolderConfig(
        fileRepository,
        currentWorkspace
      );
      if (isCurrent) {
        setHistorySettings(config.historyVersions);
        setShareAuthorName(config.shareAuthorName);
      }
    }
    void loadSettings();
    return () => {
      isCurrent = false;
    };
  }, [workspace, resetSettings, setHistorySettings, setShareAuthorName]);

  usePromptLoader();
  usePromptLazyLoad();
  useKeyboardShortcuts();

  if (!hasInitialized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg text-muted">
        <span className="material-symbols-outlined animate-spin text-2xl">refresh</span>
      </div>
    );
  }

  if (!isAuthorized || !workspace) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <NarrowWelcome />
      </div>
    );
  }

  const editingPromptId = modalType === 'edit' ? selectedPromptId : null;
  const deletingPrompt = prompts.find((p) => p.id === deletingPromptId);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <NarrowMain />

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

      {modalType === 'share' && (
        <Suspense fallback={null}>
          <ShareImageModal />
        </Suspense>
      )}

      <RecycleModal />
    </div>
  );
}
