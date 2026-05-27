/**
 * 设置弹窗组件
 */

import { useEffect, useState } from 'react';
import { Button, Modal } from '@/components/common';
import { LOCALE_OPTIONS, messages, useTranslation, type Locale } from '@/i18n';
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
  const { locale, t } = useTranslation();
  const setPrompts = usePromptStore((state) => state.setPrompts);
  const setTags = useTagStore((state) => state.setTags);
  const setLocale = useSettingsStore((state) => state.setLocale);
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
        message: t.settings.saved,
        duration: 2000,
      });
      closeModal();
    } catch (error) {
      console.warn('Failed to save settings:', error);
      addToast({
        type: 'error',
        message: t.settings.saveFailed,
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
        message: t.settings.scanFailed,
        duration: 3000,
      });
    } finally {
      setIsScanningMetadata(false);
    }
  };

  const handleRepairMetadata = async () => {
    if (!workspace || !metadataScanResult || metadataScanResult.repairableFiles === 0) return;

    const confirmed = window.confirm(t.settings.repairConfirm(metadataScanResult.repairableFiles));
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
        message: t.settings.repairSucceeded(result.repairedFiles),
        duration: 2500,
      });
    } catch (error) {
      console.warn('Failed to repair prompt metadata:', error);
      addToast({
        type: 'error',
        message: t.settings.repairFailed,
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
      title={t.settings.title}
      maxWidth="3xl"
      closeLabel={t.app.close}
      className="overflow-hidden"
    >
      <SettingsModalContent
        activeTab={activeTab}
        historySettings={historySettings}
        isRepairingMetadata={isRepairingMetadata}
        isSaveDisabled={isSaving || !workspace}
        isSaving={isSaving}
        isScanningMetadata={isScanningMetadata}
        locale={locale}
        metadataScanResult={metadataScanResult}
        onCancel={closeModal}
        onChangeLocale={setLocale}
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
  locale: Locale;
  metadataScanResult?: PromptMetadataScanResult | null;
  onCancel: () => void;
  onChangeLocale: (locale: Locale) => void;
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
  locale,
  metadataScanResult = null,
  onCancel,
  onChangeLocale,
  onChangeHistorySettings,
  onRepairMetadata,
  onReset,
  onSave,
  onScanMetadata,
  onSelectTab,
}: SettingsModalContentProps) {
  const t = messages[locale];

  return (
    <div className="-mx-6 -my-4 flex min-h-[520px] flex-col">
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-52 shrink-0 border-r border-border bg-surface-dim p-4">
          <SettingsTabButton
            icon="settings"
            label={t.settings.generalTab}
            isActive={activeTab === 'general'}
            onClick={() => onSelectTab('general')}
          />
          <SettingsTabButton
            icon="info"
            label={t.settings.aboutTab}
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
              locale={locale}
              metadataScanResult={metadataScanResult}
              onChangeLocale={onChangeLocale}
              onChange={onChangeHistorySettings}
              onRepairMetadata={onRepairMetadata}
              onScanMetadata={onScanMetadata}
            />
          ) : (
            <AboutSettings locale={locale} />
          )}
        </section>
      </div>

      <div className="flex items-center justify-between border-t border-border px-6 py-4">
        <Button type="button" variant="secondary" onClick={onReset}>
          {t.settings.reset}
        </Button>
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t.common.cancel}
          </Button>
          <Button type="button" onClick={onSave} disabled={isSaveDisabled}>
            {isSaving ? t.settings.saving : t.settings.save}
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
  locale: Locale;
  metadataScanResult: PromptMetadataScanResult | null;
  onChangeLocale: (locale: Locale) => void;
  onChange: (settings: HistoryVersionSettings) => void;
  onRepairMetadata?: () => void;
  onScanMetadata?: () => void;
}

function GeneralSettings({
  historySettings,
  isRepairingMetadata,
  isScanningMetadata,
  locale,
  metadataScanResult,
  onChangeLocale,
  onChange,
  onRepairMetadata,
  onScanMetadata,
}: GeneralSettingsProps) {
  const t = messages[locale];
  const updateHistorySettings = (settings: Partial<HistoryVersionSettings>) => {
    onChange({
      ...historySettings,
      ...settings,
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-fg">{t.settings.generalTitle}</h3>
        <p className="mt-1 text-sm text-muted">{t.settings.generalDescription}</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <label className="text-sm font-semibold text-fg" htmlFor="settings-locale">
                {t.settings.languageTitle}
              </label>
              <p className="mt-1 text-sm text-muted">{t.settings.languageDescription}</p>
            </div>
            <select
              id="settings-locale"
              value={locale}
              onChange={(event) => onChangeLocale(event.target.value as Locale)}
              className="
                h-10 rounded-lg border border-border bg-surface px-3 text-sm text-fg
                focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20
              "
            >
              {LOCALE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t.settings[option.labelKey]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-fg">{t.settings.historyTitle}</h4>
              <p className="mt-1 text-sm text-muted">
                {t.settings.historyDescription}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={historySettings.enabled}
              aria-label={t.settings.historyAriaLabel}
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
            {t.settings.historyNote}
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
            <label className="text-sm font-medium text-fg" htmlFor="history-retention-days">
              {t.settings.retentionDays}
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
                  {t.settings.days(days)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <MetadataMaintenance
          isRepairing={isRepairingMetadata}
          isScanning={isScanningMetadata}
          locale={locale}
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
  locale: Locale;
  result: PromptMetadataScanResult | null;
  onRepair?: () => void;
  onScan?: () => void;
}

function MetadataMaintenance({
  isRepairing,
  isScanning,
  locale,
  result,
  onRepair,
  onScan,
}: MetadataMaintenanceProps) {
  const t = messages[locale];
  const canRepair = Boolean(result && result.repairableFiles > 0 && !isRepairing);
  const displayedIssues = result?.issues.slice(0, MAX_METADATA_ISSUE_PREVIEW_COUNT) ?? [];
  const hiddenIssueCount = result
    ? Math.max(0, result.issues.length - displayedIssues.length)
    : 0;

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-fg">{t.settings.maintenanceTitle}</h4>
          <p className="mt-1 text-sm text-muted">
            {t.settings.maintenanceDescription}
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
          {isScanning ? t.settings.scanningMetadata : t.settings.scanMetadata}
        </Button>
      </div>

      <MetadataScanSummary locale={locale} result={result} />

      {result && result.issues.length > 0 && (
        <div className="mt-4 max-h-40 overflow-y-auto rounded-lg border border-border">
          {displayedIssues.map((issue) => (
            <div
              key={issue.path}
              className="border-b border-border px-3 py-2 text-sm last:border-b-0"
            >
              <div className="truncate font-medium text-fg">{issue.path}</div>
              <div className="mt-1 text-xs text-muted">
                {t.settings.missingFields}: {formatMetadataFields(locale, issue.missingFields)}
                {issue.invalidFields.length > 0
                  ? `; ${t.settings.invalidFields}: ${formatMetadataFields(
                      locale,
                      issue.invalidFields
                    )}`
                  : ''}
              </div>
            </div>
          ))}
          {hiddenIssueCount > 0 && (
            <div className="px-3 py-2 text-xs text-muted">
              {t.settings.hiddenIssues(hiddenIssueCount, MAX_METADATA_ISSUE_PREVIEW_COUNT)}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-end border-t border-border pt-4">
        <Button type="button" onClick={onRepair} disabled={!canRepair}>
          <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
          {isRepairing ? t.settings.repairingMetadata : t.settings.repairMetadata}
        </Button>
      </div>
    </div>
  );
}

function MetadataScanSummary({
  locale,
  result,
}: {
  locale: Locale;
  result: PromptMetadataScanResult | null;
}) {
  const t = messages[locale];

  if (!result) {
    return (
      <div className="mt-4 rounded-lg bg-surface-dim px-4 py-3 text-sm text-muted">
        {t.settings.scanEmpty}
      </div>
    );
  }

  if (result.repairableFiles === 0) {
    return (
      <div className="mt-4 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent">
        {t.settings.scanHealthy(result.totalMarkdownFiles)}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent">
      {t.settings.scanRepairable(result.totalMarkdownFiles, result.repairableFiles)}
    </div>
  );
}

function formatMetadataFields(locale: Locale, fields: PromptMetadataField[]): string {
  const t = messages[locale];

  if (fields.length === 0) {
    return t.settings.emptyField;
  }

  return fields.map((field) => t.metadataFields[field]).join(locale === 'zh-CN' ? '、' : ', ');
}

function AboutSettings({ locale }: { locale: Locale }) {
  const t = messages[locale];

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-fg">{t.settings.aboutTitle}</h3>
        <p className="mt-1 text-sm text-muted">{t.settings.aboutDescription}</p>
      </div>

      <div className="space-y-4 text-sm leading-6 text-muted">
        <p>{t.settings.aboutParagraphOne}</p>
        <p>
          {t.settings.aboutParagraphTwoPrefix}
          <span className="mx-1 rounded bg-surface-dim px-1.5 py-0.5 font-mono text-xs">
            .promptclip.json
          </span>
          {t.settings.aboutParagraphTwoSuffix}
        </p>
      </div>
    </div>
  );
}
