/**
 * 设置弹窗组件
 */

import { useEffect, useState } from 'react';
import { Button, Modal } from '@/components/common';
import { fileRepository } from '@/services/fileRepository';
import {
  FolderConfigService,
  type HistoryVersionSettings,
} from '@/services/folderConfigService';
import { useFileStore } from '@/stores/fileStore';
import { useUIStore } from '@/stores/uiStore';

type SettingsTab = 'general' | 'about';

const DEFAULT_HISTORY_SETTINGS: HistoryVersionSettings = {
  enabled: false,
  retentionDays: 30,
};

const RETENTION_DAY_OPTIONS = [7, 30, 90, 180, 365];

export function SettingsModal() {
  const { modalType, closeModal, addToast } = useUIStore();
  const { workspace } = useFileStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [historySettings, setHistorySettings] = useState<HistoryVersionSettings>(
    DEFAULT_HISTORY_SETTINGS
  );
  const [isSaving, setIsSaving] = useState(false);

  const isOpen = modalType === 'settings';

  useEffect(() => {
    if (!isOpen || !workspace) return;

    let isCurrent = true;
    const currentWorkspace = workspace;

    async function loadSettings() {
      try {
        const config = await FolderConfigService.readFolderConfig(
          fileRepository,
          currentWorkspace
        );
        if (isCurrent) {
          setHistorySettings(config.historyVersions);
        }
      } catch (error) {
        console.warn('Failed to load settings:', error);
      }
    }

    setActiveTab('general');
    void loadSettings();

    return () => {
      isCurrent = false;
    };
  }, [isOpen, workspace]);

  const handleSave = async () => {
    if (!workspace) return;

    setIsSaving(true);
    try {
      await FolderConfigService.updateHistoryVersionSettings(
        fileRepository,
        workspace,
        historySettings
      );
      addToast({
        type: 'success',
        message: '设置已保存',
        duration: 2000,
      });
      closeModal();
    } catch (error) {
      console.warn('Failed to save settings:', error);
      addToast({
        type: 'error',
        message: '保存设置失败',
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="设置"
      maxWidth="3xl"
      className="overflow-hidden"
    >
      <SettingsModalContent
        activeTab={activeTab}
        historySettings={historySettings}
        isSaveDisabled={isSaving || !workspace}
        isSaving={isSaving}
        onCancel={closeModal}
        onChangeHistorySettings={setHistorySettings}
        onReset={() => setHistorySettings(DEFAULT_HISTORY_SETTINGS)}
        onSave={handleSave}
        onSelectTab={setActiveTab}
      />
    </Modal>
  );
}

interface SettingsModalContentProps {
  activeTab: SettingsTab;
  historySettings: HistoryVersionSettings;
  isSaveDisabled: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChangeHistorySettings: (settings: HistoryVersionSettings) => void;
  onReset: () => void;
  onSave: () => void;
  onSelectTab: (tab: SettingsTab) => void;
}

export function SettingsModalContent({
  activeTab,
  historySettings,
  isSaveDisabled,
  isSaving,
  onCancel,
  onChangeHistorySettings,
  onReset,
  onSave,
  onSelectTab,
}: SettingsModalContentProps) {
  return (
    <div className="-mx-6 -my-4 flex min-h-[520px] flex-col">
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-52 shrink-0 border-r border-border bg-surface-dim p-4">
          <SettingsTabButton
            icon="settings"
            label="通用"
            isActive={activeTab === 'general'}
            onClick={() => onSelectTab('general')}
          />
          <SettingsTabButton
            icon="info"
            label="关于"
            isActive={activeTab === 'about'}
            onClick={() => onSelectTab('about')}
          />
        </nav>

        <section className="flex-1 overflow-y-auto px-8 py-7">
          {activeTab === 'general' ? (
            <GeneralSettings
              historySettings={historySettings}
              onChange={onChangeHistorySettings}
            />
          ) : (
            <AboutSettings />
          )}
        </section>
      </div>

      <div className="flex items-center justify-between border-t border-border px-6 py-4">
        <Button type="button" variant="secondary" onClick={onReset}>
          恢复默认设置
        </Button>
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            取消
          </Button>
          <Button type="button" onClick={onSave} disabled={isSaveDisabled}>
            {isSaving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SettingsTabButtonProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function SettingsTabButton({ icon, label, isActive, onClick }: SettingsTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        mb-2 flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium
        transition-colors
        ${isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-high'}
      `}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

interface GeneralSettingsProps {
  historySettings: HistoryVersionSettings;
  onChange: (settings: HistoryVersionSettings) => void;
}

function GeneralSettings({ historySettings, onChange }: GeneralSettingsProps) {
  const updateHistorySettings = (settings: Partial<HistoryVersionSettings>) => {
    onChange({
      ...historySettings,
      ...settings,
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-fg">通用设置</h3>
        <p className="mt-1 text-sm text-muted">管理 PromptClip 的通用行为和偏好设置</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-fg">历史版本</h4>
            <p className="mt-1 text-sm text-muted">
              默认关闭。启用后，后续版本会在编辑笔记时保留历史快照。
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={historySettings.enabled}
            aria-label="启用历史版本"
            onClick={() => updateHistorySettings({ enabled: !historySettings.enabled })}
            className={`
              relative h-7 w-12 shrink-0 rounded-full border transition-colors
              ${historySettings.enabled ? 'border-accent bg-accent' : 'border-border bg-surfaceHigh'}
            `}
          >
            <span
              className={`
                absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform
                ${historySettings.enabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent">
          当前仅保存配置开关；历史版本的实际记录、清理和恢复能力会在后续接入。
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
          <label className="text-sm font-medium text-fg" htmlFor="history-retention-days">
            保留天数
          </label>
          <select
            id="history-retention-days"
            value={historySettings.retentionDays}
            onChange={(event) =>
              updateHistorySettings({ retentionDays: Number(event.target.value) })
            }
            className="
              h-10 rounded-lg border border-border bg-surface px-3 text-sm text-fg
              focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20
            "
          >
            {RETENTION_DAY_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {days} 天
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function AboutSettings() {
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-fg">关于 PromptClip</h3>
        <p className="mt-1 text-sm text-muted">本地优先的 AI 提示词管理工具</p>
      </div>

      <div className="space-y-4 text-sm leading-6 text-muted">
        <p>
          PromptClip 用于整理、检索和复用日常工作中的 Prompt。数据直接读写你选择的本地
          Markdown 文件夹，不依赖后端服务或云端数据库。
        </p>
        <p>
          笔记内容以 Markdown 保存，标签、收藏和设置等工作区配置保存在
          <span className="mx-1 rounded bg-surface-dim px-1.5 py-0.5 font-mono text-xs">
            .promptclip.json
          </span>
          中，便于随文件夹一起备份、迁移和版本管理。
        </p>
      </div>
    </div>
  );
}
