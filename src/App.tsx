/**
 * 应用主组件
 */

import { WelcomeScreen } from '@/components/WelcomeScreen';
import { AboutPage } from '@/components/about';
import { PrivacyPage } from '@/components/privacy';
import { SupportPage } from '@/components/support';
import { Sidebar, TopBar, DetailPanel } from '@/components/layout';
import { PromptGrid, CreateModal, DeleteConfirm } from '@/components/prompt';
import { CommandPalette } from '@/components/command';
import { MetadataRepairPrompt, SettingsModal } from '@/components/settings';
import { RecycleModal } from '@/components/recycle';
import { useFileStore } from '@/stores/fileStore';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';
import { DEFAULT_HISTORY_SETTINGS, useSettingsStore } from '@/stores/settingsStore';
import { useTagStore } from '@/stores/tagStore';
import { messages } from '@/i18n';
import { FolderConfigService } from '@/services/folderConfigService';
import { fileRepository } from '@/services/fileRepository';
import { MetadataRepairService } from '@/services/metadataRepairService';
import { PromptService } from '@/services/promptService';
import { WorkspaceIntegrityService } from '@/services/workspaceIntegrityService';
import { usePromptLoader } from '@/hooks/usePromptLoader';
import { usePromptLazyLoad } from '@/hooks/usePromptLazyLoad';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useQuickSearchBridge } from '@/hooks/useQuickSearchBridge';
import { useQuickSearchShortcutRegister } from '@/hooks/useQuickSearchShortcutRegister';
import { useWorkspaceFileWatcher } from '@/hooks/useWorkspaceFileWatcher';
import { isQuickSearchWindowLocation, QuickSearchApp } from '@/quickSearch';
import { lazy, Suspense, useEffect } from 'react';
import { useMetadataRepairStore } from '@/stores/metadataRepairStore';

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

export function isAboutPath(pathname: string): boolean {
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/';

  return normalizedPathname === '/about';
}

export function isPrivacyPath(pathname: string): boolean {
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/';

  return normalizedPathname === '/privacy';
}

export function isSupportPath(pathname: string): boolean {
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/';

  return normalizedPathname === '/support';
}

function getCurrentPathname(): string {
  if (typeof window === 'undefined') {
    return '/';
  }

  return window.location.pathname;
}

function AppContent() {
  const { isAuthorized, workspace, initialize } = useFileStore();
  const { modalType, selectedPromptId, deletingPromptId, openModal, addToast } = useUIStore();
  const { prompts, isLoading: isPromptLoading } = usePromptStore();
  const { locale, setHistorySettings, setShareAuthorName } = useSettingsStore();
  const { setTags } = useTagStore();
  const metadataResult = useMetadataRepairStore((state) => state.result);
  const closeMetadataPrompt = useMetadataRepairStore((state) => state.close);

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

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    setTags(prompts.flatMap((prompt) => prompt.tags));
  }, [prompts, setTags]);

  useEffect(() => {
    if (locale === 'zh-CN') {
      document.documentElement.lang = 'zh-Hans';
    } else if (locale === 'zh-TW') {
      document.documentElement.lang = 'zh-Hant';
    } else if (locale === 'ja-JP') {
      document.documentElement.lang = 'ja';
    } else {
      document.documentElement.lang = 'en';
    }
  }, [locale]);

  useEffect(() => {
    if (!workspace) {
      setHistorySettings(DEFAULT_HISTORY_SETTINGS);
      setShareAuthorName('');
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
  }, [workspace, setHistorySettings, setShareAuthorName]);

  // 自动加载 Prompts
  usePromptLoader();

  // 根据客户端设置监听工作区外部文件变化
  useWorkspaceFileWatcher();

  // 后台分批补全 content
  usePromptLazyLoad();

  // 键盘快捷键
  useKeyboardShortcuts();

  // 快速搜索浮窗 ↔ 主窗口 的 IPC 桥（仅主窗口生效，浮窗不渲染 AppContent）
  useQuickSearchBridge();

  // 启动时注册用户配置的快速搜索全局快捷键（覆盖 Rust 默认值）
  useQuickSearchShortcutRegister();

  // 未授权时显示欢迎界面
  if (!isAuthorized || !workspace) {
    return <WelcomeScreen />;
  }

  // 编辑模式下使用选中的 Prompt ID
  const editingPromptId = modalType === 'edit' ? selectedPromptId : null;

  // 获取要删除的 Prompt 信息
  const deletingPrompt = prompts.find((p) => p.id === deletingPromptId);

  // 已授权时显示主界面
  return (
    <div className="h-screen w-screen flex flex-col">
      {/* 侧边栏 + 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        {/* 主内容区 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <TopBar />

          {/* Prompt 网格区域（虚拟化滚动容器内置在 PromptGrid） */}
          <div className="flex-1 min-h-0 px-6 pb-6 pt-4 bg-bg">
            <PromptGrid isLoading={isPromptLoading} />
          </div>
        </main>
      </div>

      {/* 详情面板 */}
      <DetailPanel />

      {/* 创建/编辑模态框 */}
      <CreateModal
        editingPromptId={editingPromptId}
        key={`modal-${modalType}-${editingPromptId}`}
      />

      {/* 删除确认对话框 */}
      {deletingPrompt && (
        <DeleteConfirm
          promptId={deletingPrompt.id}
          promptTitle={deletingPrompt.title}
        />
      )}

      {/* 命令面板 */}
      <CommandPalette />

      {/* 导出对话框 */}
      {modalType === 'export' && (
        <Suspense fallback={null}>
          <ExportModal />
        </Suspense>
      )}

      {/* 设置对话框 */}
      <SettingsModal />

      <MetadataRepairPrompt
        onRepair={repairDetectedMetadata}
        onViewDetails={() => {
          closeMetadataPrompt();
          openModal('settings');
        }}
      />

      {/* 分享图片对话框 */}
      {modalType === 'share' && (
        <Suspense fallback={null}>
          <ShareImageModal />
        </Suspense>
      )}

      {/* 回收站 */}
      <RecycleModal />
    </div>
  );
}

interface AppRouterProps {
  pathname?: string;
}

export function AppRouter({ pathname = getCurrentPathname() }: AppRouterProps) {
  if (isAboutPath(pathname)) {
    return <AboutPage />;
  }

  if (isPrivacyPath(pathname)) {
    return <PrivacyPage />;
  }

  if (isSupportPath(pathname)) {
    return <SupportPage />;
  }

  return <AppContent />;
}

export default function App() {
  // 快速搜索浮窗是独立 webview 窗口，靠 URL query ?window=quick-search 区分，
  // 渲染精简的 QuickSearchApp 而非完整主界面。
  if (isQuickSearchWindowLocation(typeof window !== 'undefined' ? window.location.search : '')) {
    return <QuickSearchApp />;
  }
  return <AppRouter />;
}
