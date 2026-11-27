import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { confirm, open, save } from '@tauri-apps/plugin-dialog';
import { Sidebar } from '@/components/layout';
import { useTranslation } from '@/i18n';
import { SkillService } from '@/services/skillService';
import { useSkillStore } from '@/stores/skillStore';
import { useUIStore, type AppSection } from '@/stores/uiStore';
import { toSkillManagerError } from '@/utils/skillError';
import type {
  ArchivePreview,
  ExternalEntryTarget,
  ExternalImportSelection,
  ImportDecision,
  SkillManagerError,
  SkillManagerSettings,
  SkillDeleteMode,
  SyncMode,
  ToolSyncMode,
} from '@/types/skill';
import { SkillArchiveImportModal } from './SkillArchiveImportModal';
import { SkillCreateModal } from './SkillCreateModal';
import { SkillDeleteModal } from './SkillDeleteModal';
import { SkillDetailPage, type SkillDetailPageHandle } from './SkillDetailPage';
import { SkillGrid } from './SkillGrid';
import { SkillImportModal } from './SkillImportModal';
import { SkillQuickSwitcher } from './SkillQuickSwitcher';
import { SkillSettingsModal } from './SkillSettingsModal';
import { SkillTopBar } from './SkillTopBar';

export function SkillManagerPage() {
  const { t } = useTranslation();
  const {
    skills,
    filteredSkills,
    tools,
    skillsPath,
    isLoading,
    load,
    error,
    externalScan,
    importProgress,
    rescanExternal,
    cleanupBrokenExternalLinks,
    importExternalSelections,
    deleteSkill,
    addCustomTool,
    removeCustomTool,
    setToolEnabledState,
    reorderTools,
  } = useSkillStore();
  const [isQuickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [isImportOpen, setImportOpen] = useState(false);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isImporting, setImporting] = useState(false);
  const [isCleaningBrokenLinks, setCleaningBrokenLinks] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  /** 详情页 ref：用于在切换 appSection 前请求「未保存修改确认」 */
  const detailRef = useRef<SkillDetailPageHandle>(null);
  /** 列表滚动容器：进入/返回详情页时保存与恢复滚动位置 */
  const listScrollRef = useRef<HTMLDivElement>(null);
  const savedScrollTopRef = useRef<number>(0);
  /** 详情页期间是否保存过文件：返回列表或切走时按需刷新卡片摘要 */
  const hasSavedInDetailRef = useRef(false);
  const { setAppSection, addToast } = useUIStore();
  const [selectedDeleteSkillId, setSelectedDeleteSkillId] = useState<string | null>(null);
  const [archivePath, setArchivePath] = useState<string | null>(null);
  const [archivePreview, setArchivePreview] = useState<ArchivePreview | null>(null);
  const [settings, setSettings] = useState<SkillManagerSettings | null>(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const lastNotifiedErrorRef = useRef<SkillManagerError | null>(null);

  const notifyError = useCallback(
    (err: unknown) => {
      const normalized = toSkillManagerError(err);
      addToast({
        type: 'error',
        message: t.skills.skillOperationError(normalized.code, normalized.params),
        duration: 4500,
      });
    },
    [addToast, t.skills]
  );

  useEffect(() => {
    if (!error || error === lastNotifiedErrorRef.current) return;
    lastNotifiedErrorRef.current = error;
    addToast({
      type: 'error',
      message: t.skills.skillOperationError(error.code, error.params),
      duration: 4500,
    });
  }, [error, addToast, t.skills]);

  useEffect(() => {
    void load();
  }, [load]);

  // 返回列表时恢复滚动位置（在浏览器绘制前同步执行，避免闪到顶部再回弹）
  useLayoutEffect(() => {
    if (!selectedSkillId && listScrollRef.current) {
      listScrollRef.current.scrollTop = savedScrollTopRef.current;
    }
  }, [selectedSkillId]);

  // 进入详情页前保存列表滚动位置——此时 <main> 仍挂载，ref 可用
  const openSkill = (skillId: string) => {
    if (listScrollRef.current) {
      savedScrollTopRef.current = listScrollRef.current.scrollTop;
    }
    hasSavedInDetailRef.current = false;
    setSelectedSkillId(skillId);
  };

  const handleBackFromDetail = () => {
    const shouldRefresh = hasSavedInDetailRef.current;
    hasSavedInDetailRef.current = false;
    setSelectedSkillId(null);
    if (shouldRefresh) {
      void load();
    }
  };

  const handleQuickSwitchSelect = (skillId: string) => {
    if (selectedSkillId && selectedSkillId !== skillId && detailRef.current) {
      detailRef.current.requestNavigateAway(() => {
        const shouldRefresh = hasSavedInDetailRef.current;
        hasSavedInDetailRef.current = false;
        if (shouldRefresh) void load();
        openSkill(skillId);
      });
      return;
    }
    openSkill(skillId);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault();
        setQuickSwitcherOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const rescan = async () => {
    await Promise.all([load(), rescanExternal()]);
    const state = useSkillStore.getState();
    if (state.error) return;
    const scan = state.externalScan;
    if (scan && (scan.groups.length > 0 || scan.invalidEntries.length > 0)) {
      setImportOpen(true);
    } else if (scan) {
      addToast({
        type: 'info',
        message: t.skills.scanNoExternalFound,
        duration: 3000,
      });
    }
  };

  const confirmImport = async (selections: ExternalImportSelection[]) => {
    // 保持弹窗打开并进入 loading，直到导入完成/失败——避免后台静默导入
    // 让用户无法区分"还没完成"与"导入失败"。
    setImporting(true);
    try {
      await importExternalSelections(selections);
    } finally {
      setImporting(false);
      setImportOpen(false);
    }
  };

  const revealExternal = async (targetGroupId: string, directoryName: string) => {
    try {
      await SkillService.revealExternal(targetGroupId, directoryName);
    } catch (err) {
      notifyError(err);
    }
  };

  const cleanupBrokenLinks = async (
    entries: ExternalEntryTarget[],
    displayPath?: string
  ) => {
    if (entries.length === 0) return;
    const message =
      entries.length === 1
        ? t.skills.confirmCleanupBrokenLink(
            entries[0].directoryName,
            displayPath ?? entries[0].directoryName
          )
        : t.skills.confirmCleanupAllBrokenLinks(entries.length);
    try {
      const confirmed = await confirm(message, {
        title: t.skills.confirmCleanupBrokenLinkTitle,
        kind: 'warning',
        okLabel:
          entries.length === 1 ? t.skills.cleanupBrokenLink : t.skills.cleanupAllBrokenLinks,
        cancelLabel: t.skills.cancel,
      });
      if (!confirmed) return;
    } catch (err) {
      notifyError(err);
      return;
    }

    setCleaningBrokenLinks(true);
    try {
      const result = await cleanupBrokenExternalLinks(entries);
      if (!result) return;
      if (result.removedCount > 0) {
        addToast({
          type: 'success',
          message: t.skills.cleanupBrokenLinksSuccess(result.removedCount),
          duration: 3000,
        });
      }
      if (result.errors.length > 0) {
        notifyError(result.errors[0]);
      }
      if (result.scan.groups.length === 0 && result.scan.invalidEntries.length === 0) {
        setImportOpen(false);
      }
    } finally {
      setCleaningBrokenLinks(false);
    }
  };

  const revealStorage = async () => {
    try {
      await SkillService.revealHub();
    } catch (err) {
      notifyError(err);
    }
  };

  const createSkill = async (skillId: string, description: string) => {
    setSubmitting(true);
    try {
      await SkillService.create(skillId, description);
      await load();
      setCreateOpen(false);
      openSkill(skillId);
    } catch (err) {
      notifyError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const selectArchive = async () => {
    try {
      const path = await open({
        multiple: false,
        directory: false,
        filters: [{ name: 'Skill', extensions: ['zip', 'skill'] }],
      });
      if (!path) return;
      const preview = await SkillService.previewArchive(path);
      setArchivePath(path);
      setArchivePreview(preview);
    } catch (err) {
      notifyError(err);
    }
  };

  const importArchive = async (decision: ImportDecision) => {
    if (!archivePath || !archivePreview) return;
    try {
      await SkillService.importArchive(archivePath, decision);
      setArchivePath(null);
      setArchivePreview(null);
      await load();
      if (decision !== 'keepHub' && decision !== 'skip') {
        openSkill(archivePreview.skillId);
      }
    } catch (err) {
      notifyError(err);
    }
  };

  const exportOne = async (skillId: string) => {
    try {
      const destination = await save({
        defaultPath: `${skillId}.zip`,
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
      });
      if (!destination) return;
      await SkillService.export(skillId, destination);
      addToast({
        type: 'success',
        message: t.skills.exportSuccess,
        duration: 2500,
      });
    } catch (err) {
      notifyError(err);
    }
  };

  const confirmDelete = async (mode: SkillDeleteMode) => {
    if (!selectedDeleteSkillId) return;
    setSubmitting(true);
    const deleted = await deleteSkill(selectedDeleteSkillId, mode);
    setSubmitting(false);
    if (deleted) setSelectedDeleteSkillId(null);
  };

  const openSettings = async () => {
    try {
      const initialization = await SkillService.initialize();
      setSettings(initialization.settings);
      setSettingsOpen(true);
    } catch (err) {
      notifyError(err);
    }
  };

  const saveSettings = async (
    defaultMode: SyncMode,
    overrides: Record<string, ToolSyncMode>
  ) => {
    setSubmitting(true);
    try {
      const result = await SkillService.updateSettings(defaultMode, overrides);
      setSettings(result.settings);
      setSettingsOpen(false);
      if (result.migrationErrors.length > 0) {
        addToast({
          type: 'error',
          message: t.skills.syncPartialFailure,
          duration: 4500,
        });
      }
      await load();
    } catch (err) {
      notifyError(err);
    } finally {
      setSubmitting(false);
    }
  };

  // 切换某 Agent 工具的启用状态。settings 弹窗内逐项开关，无需关闭弹窗。
  const toggleToolEnabled = async (toolId: string, enabled: boolean) => {
    const ok = await setToolEnabledState(toolId, enabled);
    if (!ok) return;
    // 同步刷新弹窗内的 settings 快照（disabledToolIds 已变）
    try {
      const initialization = await SkillService.initialize();
      setSettings(initialization.settings);
    } catch {
      // 刷新快照失败不阻断，主状态已通过 store 更新
    }
  };

  const handleAddCustomTool = async (name: string, skillsPath: string) => {
    const ok = await addCustomTool(name, skillsPath);
    if (!ok) return ok;
    try {
      const initialization = await SkillService.initialize();
      setSettings(initialization.settings);
    } catch {
      // 忽略快照刷新失败
    }
    return ok;
  };

  const handleRemoveCustomTool = async (toolId: string) => {
    const ok = await removeCustomTool(toolId);
    if (!ok) return;
    try {
      const initialization = await SkillService.initialize();
      setSettings(initialization.settings);
    } catch {
      // 忽略快照刷新失败
    }
  };

  const handleReorderTools = async (toolOrder: string[]) => {
    const ok = await reorderTools(toolOrder);
    if (!ok) return;
    try {
      const initialization = await SkillService.initialize();
      setSettings(initialization.settings);
    } catch {
      // 忽略快照刷新失败
    }
  };

  // 切换 Prompts/Skills：在 skill 详情页有未保存修改时先弹确认框，确认后才真正切换
  const handleSelectSection = (section: AppSection) => {
    if (selectedSkillId && detailRef.current) {
      detailRef.current.requestNavigateAway(() => setAppSection(section));
    } else {
      setAppSection(section);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-bg text-fg">
      <Sidebar onSkillSettings={() => void openSettings()} onSelectSection={handleSelectSection} />
      <div className="flex min-w-0 flex-1 flex-col">
        {selectedSkillId ? (
          <SkillDetailPage
            ref={detailRef}
            skillId={selectedSkillId}
            onBack={handleBackFromDetail}
            onExport={(skillId) => void exportOne(skillId)}
            onSaved={() => {
              hasSavedInDetailRef.current = true;
            }}
          />
        ) : (
          <>
            <SkillTopBar
              onCreate={() => setCreateOpen(true)}
              onUpload={() => void selectArchive()}
              onQuickSwitch={() => setQuickSwitcherOpen(true)}
              onRescan={() => void rescan()}
            />
            <main ref={listScrollRef} className="min-h-0 flex-1 overflow-y-auto p-6">
              <SkillGrid
                skills={filteredSkills}
                tools={tools}
                isLoading={isLoading}
                hasAnyHubSkills={skills.length > 0}
                onOpenSkill={openSkill}
                onExportSkill={(skillId) => void exportOne(skillId)}
                onDeleteSkill={setSelectedDeleteSkillId}
                onRescan={() => void rescan()}
                onCreateSkill={() => setCreateOpen(true)}
              />
            </main>
          </>
        )}
      </div>
      <SkillQuickSwitcher
        isOpen={isQuickSwitcherOpen}
        skills={skills}
        onClose={() => setQuickSwitcherOpen(false)}
        onSelect={handleQuickSwitchSelect}
      />
      <SkillImportModal
        isOpen={isImportOpen}
        scan={externalScan}
        hubSkills={skills}
        isImporting={isImporting}
        importProgress={importProgress}
        isCleaningBrokenLinks={isCleaningBrokenLinks}
        onClose={() => setImportOpen(false)}
        onConfirm={(selections) => void confirmImport(selections)}
        onRevealExternal={(targetGroupId, directoryName) =>
          void revealExternal(targetGroupId, directoryName)
        }
        onCleanupBrokenLinks={(entries, displayPath) =>
          void cleanupBrokenLinks(entries, displayPath)
        }
      />
      <SkillCreateModal
        isOpen={isCreateOpen}
        isSubmitting={isSubmitting}
        onClose={() => setCreateOpen(false)}
        onConfirm={(skillId, description) => void createSkill(skillId, description)}
      />
      <SkillArchiveImportModal
        isOpen={Boolean(archivePreview)}
        preview={archivePreview}
        hasConflict={Boolean(archivePreview && skills.some((skill) => skill.id === archivePreview.skillId))}
        onClose={() => {
          setArchivePath(null);
          setArchivePreview(null);
        }}
        onConfirm={(decision) => void importArchive(decision)}
      />
      <SkillDeleteModal
        skill={skills.find((skill) => skill.id === selectedDeleteSkillId) ?? null}
        isDeleting={isSubmitting}
        onClose={() => setSelectedDeleteSkillId(null)}
        onConfirm={(mode) => void confirmDelete(mode)}
      />
      {settings && (
        <SkillSettingsModal
          isOpen={isSettingsOpen}
          settings={settings}
          tools={tools}
          skillsPath={skillsPath}
          isSaving={isSubmitting}
          onClose={() => setSettingsOpen(false)}
          onSave={(defaultMode, overrides) => void saveSettings(defaultMode, overrides)}
          onRevealStorage={() => void revealStorage()}
          onToggleToolEnabled={(toolId, enabled) => void toggleToolEnabled(toolId, enabled)}
          onAddCustomTool={(name, skillsPath) => handleAddCustomTool(name, skillsPath)}
          onRemoveCustomTool={(toolId) => void handleRemoveCustomTool(toolId)}
          onReorderTools={(toolOrder) => void handleReorderTools(toolOrder)}
        />
      )}
    </div>
  );
}
