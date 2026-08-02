import { useEffect, useRef, useState } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { Sidebar } from '@/components/layout';
import { useTranslation } from '@/i18n';
import { SkillService } from '@/services/skillService';
import { useSkillStore } from '@/stores/skillStore';
import { useUIStore, type AppSection } from '@/stores/uiStore';
import type {
  ArchivePreview,
  ExternalImportSelection,
  ImportDecision,
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
    rescanExternal,
    importExternalSelections,
    deleteSkill,
  } = useSkillStore();
  const [isQuickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [isImportOpen, setImportOpen] = useState(false);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  /** 详情页 ref：用于在切换 appSection 前请求「未保存修改确认」 */
  const detailRef = useRef<SkillDetailPageHandle>(null);
  const { setAppSection } = useUIStore();
  const [selectedDeleteSkillId, setSelectedDeleteSkillId] = useState<string | null>(null);
  const [archivePath, setArchivePath] = useState<string | null>(null);
  const [archivePreview, setArchivePreview] = useState<ArchivePreview | null>(null);
  const [settings, setSettings] = useState<SkillManagerSettings | null>(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [operationError, setOperationError] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

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
    const scan = useSkillStore.getState().externalScan;
    if (scan && (scan.groups.length > 0 || scan.invalidEntries.length > 0)) {
      setImportOpen(true);
    }
  };

  const confirmImport = async (selections: ExternalImportSelection[]) => {
    setImportOpen(false);
    await importExternalSelections(selections);
  };

  const revealExternal = async (targetGroupId: string, directoryName: string) => {
    setOperationError(false);
    try {
      await SkillService.revealExternal(targetGroupId, directoryName);
    } catch {
      setOperationError(true);
    }
  };

  const revealStorage = async () => {
    setOperationError(false);
    try {
      await SkillService.revealHub();
    } catch {
      setOperationError(true);
    }
  };

  const createSkill = async (skillId: string, description: string) => {
    setSubmitting(true);
    setOperationError(false);
    try {
      await SkillService.create(skillId, description);
      await load();
      setCreateOpen(false);
      setSelectedSkillId(skillId);
    } catch {
      setOperationError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const selectArchive = async () => {
    setOperationError(false);
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
    } catch {
      setOperationError(true);
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
        setSelectedSkillId(archivePreview.skillId);
      }
    } catch {
      setOperationError(true);
    }
  };

  const exportOne = async (skillId: string) => {
    try {
      const destination = await save({
        defaultPath: `${skillId}.zip`,
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
      });
      if (destination) await SkillService.export(skillId, destination);
    } catch {
      setOperationError(true);
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
    setOperationError(false);
    try {
      const initialization = await SkillService.initialize();
      setSettings(initialization.settings);
      setSettingsOpen(true);
    } catch {
      setOperationError(true);
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
      if (result.migrationErrors.length > 0) window.alert(t.skills.syncPartialFailure);
      await load();
    } catch {
      setOperationError(true);
    } finally {
      setSubmitting(false);
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
            onBack={() => setSelectedSkillId(null)}
            onExport={(skillId) => void exportOne(skillId)}
          />
        ) : (
          <>
            <SkillTopBar
              onCreate={() => setCreateOpen(true)}
              onUpload={() => void selectArchive()}
              onQuickSwitch={() => setQuickSwitcherOpen(true)}
              onRescan={() => void rescan()}
            />
            {(error || operationError) && (
              <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {t.skills.operationFailed}
              </div>
            )}
            <main className="min-h-0 flex-1 overflow-y-auto p-6">
              <SkillGrid
                skills={filteredSkills}
                tools={tools}
                isLoading={isLoading}
                onOpenSkill={setSelectedSkillId}
                onExportSkill={(skillId) => void exportOne(skillId)}
                onDeleteSkill={setSelectedDeleteSkillId}
              />
            </main>
          </>
        )}
      </div>
      <SkillQuickSwitcher
        isOpen={isQuickSwitcherOpen}
        skills={skills}
        onClose={() => setQuickSwitcherOpen(false)}
        onSelect={setSelectedSkillId}
      />
      <SkillImportModal
        isOpen={isImportOpen}
        scan={externalScan}
        hubSkills={skills}
        onClose={() => setImportOpen(false)}
        onConfirm={(selections) => void confirmImport(selections)}
        onRevealExternal={(targetGroupId, directoryName) =>
          void revealExternal(targetGroupId, directoryName)
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
        />
      )}
    </div>
  );
}
