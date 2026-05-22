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
import {
  MetadataRepairService,
  type PromptMetadataField,
  type PromptMetadataScanResult,
} from '@/services/metadataRepairService';
import { PromptService } from '@/services/promptService';
import { useFileStore } from '@/stores/fileStore';
import { DEFAULT_HISTORY_SETTINGS, useSettingsStore } from '@/stores/settingsStore';
import { usePromptStore } from '@/stores/promptStore';
import { useTagStore } from '@/stores/tagStore';
import { useUIStore } from '@/stores/uiStore';

type SettingsTab = 'general' | 'about';

const RETENTION_DAY_OPTIONS = [7, 30, 90, 180, 365];
const MAX_METADATA_ISSUE_PREVIEW_COUNT = 1000;

export function SettingsModal() {
  const { modalType, closeModal, addToast } = useUIStore();
  const { workspace } = useFileStore();
  const setPrompts = usePromptStore((state) => state.setPrompts);
  const setTags = useTagStore((state) => state.setTags);
  const setStoredHistorySettings = useSettingsStore((state) => state.setHistorySettings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [historySettings, setHistorySettings] = useState<HistoryVersionSettings>(
    DEFAULT_HISTORY_SETTINGS
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isScanningMetadata, setIsScanningMetadata] = useState(false);
  const [isRepairingMetadata, setIsRepairingMetadata] = useState(false);
  const [metadataScanResult, setMetadataScanResult] =
    useState<PromptMetadataScanResult | null>(null);

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
          setStoredHistorySettings(config.historyVersions);
        }
      } catch (error) {
        console.warn('Failed to load settings:', error);
      }
    }

    setActiveTab('general');
    setMetadataScanResult(null);
    void loadSettings();

    return () => {
      isCurrent = false;
    };
  }, [isOpen, setStoredHistorySettings, workspace]);

  const handleSave = async () => {
    if (!workspace) return;

    setIsSaving(true);
    try {
      await FolderConfigService.updateHistoryVersionSettings(
        fileRepository,
        workspace,
        historySettings
      );
      setStoredHistorySettings(historySettings);
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

  const handleScanMetadata = async () => {
    if (!workspace) return;

    setIsScanningMetadata(true);
    try {
      const result = await MetadataRepairService.scanPromptMetadata(fileRepository, workspace);
      setMetadataScanResult(result);
    } catch (error) {
      console.warn('Failed to scan prompt metadata:', error);
      addToast({
        type: 'error',
        message: '扫描元数据失败',
        duration: 3000,
      });
    } finally {
      setIsScanningMetadata(false);
    }
  };

  const handleRepairMetadata = async () => {
    if (!workspace || !metadataScanResult || metadataScanResult.repairableFiles === 0) return;

    const confirmed = window.confirm(
      `将补全 ${metadataScanResult.repairableFiles} 个文件的缺失元数据。` +
        '已有字段和正文会保留，是否继续？'
    );
    if (!confirmed) {
      return;
    }

    setIsRepairingMetadata(true);
    try {
      const result = await MetadataRepairService.repairPromptMetadata(fileRepository, workspace);
      const prompts = await PromptService.loadPrompts(fileRepository, workspace);
      await setPrompts(prompts);
      setTags(prompts.flatMap((prompt) => prompt.tags));
      setMetadataScanResult({
        totalMarkdownFiles: result.totalMarkdownFiles,
        healthyFiles: result.totalMarkdownFiles,
        repairableFiles: 0,
        issues: [],
      });
      addToast({
        type: 'success',
        message: `已补全 ${result.repairedFiles} 个文件`,
        duration: 2500,
      });
    } catch (error) {
      console.warn('Failed to repair prompt metadata:', error);
      addToast({
        type: 'error',
        message: '补全元数据失败',
        duration: 3000,
      });
    } finally {
      setIsRepairingMetadata(false);
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
        isRepairingMetadata={isRepairingMetadata}
        isSaveDisabled={isSaving || !workspace}
        isSaving={isSaving}
        isScanningMetadata={isScanningMetadata}
        metadataScanResult={metadataScanResult}
        onCancel={closeModal}
        onChangeHistorySettings={setHistorySettings}
        onRepairMetadata={handleRepairMetadata}
        onReset={() => setHistorySettings(DEFAULT_HISTORY_SETTINGS)}
        onSave={handleSave}
        onScanMetadata={handleScanMetadata}
        onSelectTab={setActiveTab}
      />
    </Modal>
  );
}

interface SettingsModalContentProps {
  activeTab: SettingsTab;
  historySettings: HistoryVersionSettings;
  isRepairingMetadata?: boolean;
  isSaveDisabled: boolean;
  isSaving: boolean;
  isScanningMetadata?: boolean;
  metadataScanResult?: PromptMetadataScanResult | null;
  onCancel: () => void;
  onChangeHistorySettings: (settings: HistoryVersionSettings) => void;
  onRepairMetadata?: () => void;
  onReset: () => void;
  onSave: () => void;
  onScanMetadata?: () => void;
  onSelectTab: (tab: SettingsTab) => void;
}

export function SettingsModalContent({
  activeTab,
  historySettings,
  isRepairingMetadata = false,
  isSaveDisabled,
  isSaving,
  isScanningMetadata = false,
  metadataScanResult = null,
  onCancel,
  onChangeHistorySettings,
  onRepairMetadata,
  onReset,
  onSave,
  onScanMetadata,
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
              isRepairingMetadata={isRepairingMetadata}
              isScanningMetadata={isScanningMetadata}
              metadataScanResult={metadataScanResult}
              onChange={onChangeHistorySettings}
              onRepairMetadata={onRepairMetadata}
              onScanMetadata={onScanMetadata}
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
  isRepairingMetadata: boolean;
  isScanningMetadata: boolean;
  metadataScanResult: PromptMetadataScanResult | null;
  onChange: (settings: HistoryVersionSettings) => void;
  onRepairMetadata?: () => void;
  onScanMetadata?: () => void;
}

function GeneralSettings({
  historySettings,
  isRepairingMetadata,
  isScanningMetadata,
  metadataScanResult,
  onChange,
  onRepairMetadata,
  onScanMetadata,
}: GeneralSettingsProps) {
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

      <div className="space-y-4">
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
            关闭后不会自动创建历史目录和历史快照；保留天数目前仅保存配置，暂不自动清理。
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

        <MetadataMaintenance
          isRepairing={isRepairingMetadata}
          isScanning={isScanningMetadata}
          result={metadataScanResult}
          onRepair={onRepairMetadata}
          onScan={onScanMetadata}
        />
      </div>
    </div>
  );
}

interface MetadataMaintenanceProps {
  isRepairing: boolean;
  isScanning: boolean;
  result: PromptMetadataScanResult | null;
  onRepair?: () => void;
  onScan?: () => void;
}

function MetadataMaintenance({
  isRepairing,
  isScanning,
  result,
  onRepair,
  onScan,
}: MetadataMaintenanceProps) {
  const canRepair = Boolean(result && result.repairableFiles > 0 && !isRepairing);
  const displayedIssues = result?.issues.slice(0, MAX_METADATA_ISSUE_PREVIEW_COUNT) ?? [];
  const hiddenIssueCount = result
    ? Math.max(0, result.issues.length - displayedIssues.length)
    : 0;

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-fg">文件夹维护</h4>
          <p className="mt-1 text-sm text-muted">
            扫描 Obsidian 创建的 Markdown，补全 PromptClip 需要的 frontmatter。
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onScan}
          disabled={isScanning || isRepairing}
        >
          <span className="material-symbols-outlined text-[18px]">travel_explore</span>
          {isScanning ? '扫描中...' : '扫描元数据'}
        </Button>
      </div>

      <MetadataScanSummary result={result} />

      {result && result.issues.length > 0 && (
        <div className="mt-4 max-h-40 overflow-y-auto rounded-lg border border-border">
          {displayedIssues.map((issue) => (
            <div
              key={issue.path}
              className="border-b border-border px-3 py-2 text-sm last:border-b-0"
            >
              <div className="truncate font-medium text-fg">{issue.path}</div>
              <div className="mt-1 text-xs text-muted">
                缺失：{formatMetadataFields(issue.missingFields)}
                {issue.invalidFields.length > 0
                  ? `；无效：${formatMetadataFields(issue.invalidFields)}`
                  : ''}
              </div>
            </div>
          ))}
          {hiddenIssueCount > 0 && (
            <div className="px-3 py-2 text-xs text-muted">
              还有 {hiddenIssueCount} 个文件未显示，列表最多显示前{' '}
              {MAX_METADATA_ISSUE_PREVIEW_COUNT} 个。
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-end border-t border-border pt-4">
        <Button type="button" onClick={onRepair} disabled={!canRepair}>
          <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
          {isRepairing ? '补全中...' : '补全缺失元数据'}
        </Button>
      </div>
    </div>
  );
}

function MetadataScanSummary({ result }: { result: PromptMetadataScanResult | null }) {
  if (!result) {
    return (
      <div className="mt-4 rounded-lg bg-surface-dim px-4 py-3 text-sm text-muted">
        扫描后会列出缺少或无效的 PromptClip 元数据，不会立即修改文件。
      </div>
    );
  }

  if (result.repairableFiles === 0) {
    return (
      <div className="mt-4 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent">
        共扫描 {result.totalMarkdownFiles} 个 Markdown 文件，当前无需补全。
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent">
      共扫描 {result.totalMarkdownFiles} 个 Markdown 文件，{result.repairableFiles}{' '}
      个文件需要补全。
    </div>
  );
}

function formatMetadataFields(fields: PromptMetadataField[]): string {
  if (fields.length === 0) {
    return '无';
  }

  return fields.map((field) => FIELD_LABELS[field]).join('、');
}

const FIELD_LABELS: Record<PromptMetadataField, string> = {
  id: 'ID',
  title: '标题',
  tags: '标签',
  created: '创建时间',
  modified: '修改时间',
  copy_count: '复制次数',
  pinned: '收藏状态',
};

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
