/**
 * 应用主组件
 */

import { WelcomeScreen } from '@/components/WelcomeScreen';
import { Sidebar, TopBar, DetailPanel } from '@/components/layout';
import { PromptGrid, CreateModal, DeleteConfirm } from '@/components/prompt';
import { CommandPalette } from '@/components/command';
import { ExportModal } from '@/components/export/ExportModal';
import { SettingsModal } from '@/components/settings';
import { ShareImageModal } from '@/components/share';
import { useFileStore } from '@/stores/fileStore';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTagStore } from '@/stores/tagStore';
import { FolderConfigService } from '@/services/folderConfigService';
import { fileRepository } from '@/services/fileRepository';
import { usePromptLoader } from '@/hooks/usePromptLoader';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useEffect } from 'react';

function AppContent() {
  const { isAuthorized, workspace, initialize } = useFileStore();
  const { modalType, selectedPromptId } = useUIStore();
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
    if (locale === 'zh-CN') {
      document.documentElement.lang = 'zh-Hans';
    } else if (locale === 'zh-TW') {
      document.documentElement.lang = 'zh-Hant';
    } else {
      document.documentElement.lang = 'en';
    }
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

  // 自动加载 Prompts
  usePromptLoader();

  // 键盘快捷键
  useKeyboardShortcuts();

  // 未授权时显示欢迎界面
  if (!isAuthorized || !workspace) {
    return <WelcomeScreen />;
  }

  // 编辑模式下使用选中的 Prompt ID
  const editingPromptId = modalType === 'edit' ? selectedPromptId : null;

  // 获取要删除的 Prompt 信息
  const deletingPrompt = prompts.find((p) => p.id === selectedPromptId);

  // 已授权时显示主界面
  return (
    <div className="h-screen w-screen flex flex-col">
      {/* 侧边栏 + 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        {/* 主内容区 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <TopBar />

          {/* Prompt 网格区域 */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 bg-bg">
            <PromptGrid />
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
      <ExportModal />

      {/* 设置对话框 */}
      <SettingsModal />

      {/* 分享图片对话框 */}
      <ShareImageModal />
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
