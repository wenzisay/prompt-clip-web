import { useCallback, useEffect, useRef, useState } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { useTranslation } from '@/i18n';
import { SkillService } from '@/services/skillService';
import type { SkillFileEntry, SkillTextFile } from '@/types/skill';
import { SkillFileEditor } from './SkillFileEditor';
import { SkillFileTree } from './SkillFileTree';

export interface SkillDetailPageProps {
  skillId: string;
  onBack: () => void;
  onExport: (skillId: string) => void;
}

export function SkillDetailPage({ skillId, onBack, onExport }: SkillDetailPageProps) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<SkillFileEntry[]>([]);
  const [selected, setSelected] = useState<SkillFileEntry | null>(null);
  const [file, setFile] = useState<SkillTextFile | null>(null);
  const [isDirty, setDirty] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const selectionRequest = useRef(0);

  const loadTree = useCallback(async () => {
    const nextEntries = await SkillService.listFiles(skillId);
    setEntries(nextEntries);
    return nextEntries;
  }, [skillId]);

  const selectEntry = useCallback(async (entry: SkillFileEntry) => {
    if (isDirty && !window.confirm(t.skills.unsavedChanges)) return;
    const request = ++selectionRequest.current;
    setSelected(entry);
    setDirty(false);
    try {
      const nextFile = entry.isText
        ? await SkillService.readTextFile(skillId, entry.relativePath)
        : null;
      if (selectionRequest.current === request) setFile(nextFile);
    } catch {
      if (selectionRequest.current === request) setError(true);
    }
  }, [isDirty, skillId, t.skills.unsavedChanges]);

  useEffect(() => {
    void loadTree()
      .then((nextEntries) => nextEntries.find((entry) => entry.relativePath === 'SKILL.md'))
      .then(async (entry) => {
        if (!entry) return;
        const request = ++selectionRequest.current;
        setSelected(entry);
        const nextFile = await SkillService.readTextFile(skillId, entry.relativePath);
        if (selectionRequest.current === request) setFile(nextFile);
      })
      .catch(() => setError(true));
  }, [loadTree, skillId]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const refresh = async (path?: string) => {
    const next = await loadTree();
    if (!path) return;
    const match = flattenEntries(next).find((entry) => entry.relativePath === path);
    if (match) await selectEntry(match);
  };

  const saveFile = async (content: string, expectedModifiedAtMs: number) => {
    if (!selected) return;
    setSaving(true);
    setError(false);
    try {
      const result = await SkillService.writeTextFile(
        skillId,
        selected.relativePath,
        content,
        expectedModifiedAtMs
      );
      setFile(result.file);
      setDirty(false);
      if (result.syncErrors.length > 0) window.alert(t.skills.syncPartialFailure);
      await loadTree();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const createFolder = async () => {
    const name = window.prompt(t.skills.newFolder)?.trim();
    if (!name) return;
    await runMutation(() => SkillService.createDirectory(skillId, childPath(selected, name)));
  };

  const createFile = async () => {
    const name = window.prompt(t.skills.newFile)?.trim();
    if (!name) return;
    const path = childPath(selected, name);
    await runMutation(async () => {
      await SkillService.createTextFile(skillId, path);
      await refresh(path);
    });
  };

  const uploadFile = async () => {
    const source = await open({ multiple: false, directory: false });
    if (!source) return;
    const name = source.split(/[\\/]/).pop();
    if (!name) return;
    await runMutation(() => SkillService.uploadFile(skillId, source, childPath(selected, name)));
  };

  const renameSelected = async () => {
    if (!selected || isProtected(selected)) return;
    if (isDirty && !window.confirm(t.skills.unsavedChanges)) return;
    const name = window.prompt(t.skills.rename, selected.name)?.trim();
    if (!name) return;
    const destination = siblingPath(selected.relativePath, name);
    await runMutation(async () => {
      await SkillService.renameEntry(skillId, selected.relativePath, destination);
      setSelected(null);
      setFile(null);
    });
  };

  const deleteSelected = async () => {
    if (!selected || isProtected(selected)) return;
    if (isDirty && !window.confirm(t.skills.unsavedChanges)) return;
    if (!window.confirm(t.skills.delete)) return;
    await runMutation(async () => {
      await SkillService.deleteEntry(skillId, selected.relativePath);
      setSelected(null);
      setFile(null);
    });
  };

  const downloadSelected = async () => {
    if (!selected || selected.isDirectory) return;
    const destination = await save({ defaultPath: selected.name });
    if (destination) await runMutation(() => SkillService.downloadFile(skillId, selected.relativePath, destination));
  };

  const runMutation = async (operation: () => Promise<unknown>) => {
    setError(false);
    try {
      const result = await operation();
      const syncErrors = Array.isArray(result)
        ? result
        : result && typeof result === 'object' && 'syncErrors' in result
          ? (result as { syncErrors: unknown[] }).syncErrors
          : [];
      if (syncErrors.length > 0) window.alert(t.skills.syncPartialFailure);
      await loadTree();
    } catch {
      setError(true);
    }
  };

  const back = () => {
    if (!isDirty || window.confirm(t.skills.unsavedChanges)) onBack();
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-bg text-fg">
      <header className="flex h-16 items-center gap-2 border-b border-border bg-surface px-4">
        <button type="button" onClick={back} className="rounded-lg p-2 text-muted hover:bg-surface-dim" aria-label={t.skills.backToSkills}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{skillId}</h1>
        <DetailAction icon="create_new_folder" label={t.skills.newFolder} onClick={() => void createFolder()} />
        <DetailAction icon="note_add" label={t.skills.newFile} onClick={() => void createFile()} />
        <DetailAction icon="upload_file" label={t.skills.uploadFile} onClick={() => void uploadFile()} />
        <DetailAction icon="drive_file_rename_outline" label={t.skills.rename} disabled={!selected || isProtected(selected)} onClick={() => void renameSelected()} />
        <DetailAction icon="delete" label={t.skills.delete} disabled={!selected || isProtected(selected)} onClick={() => void deleteSelected()} />
        <DetailAction icon="download" label={t.skills.download} disabled={!selected || selected.isDirectory} onClick={() => void downloadSelected()} />
        <DetailAction icon="folder_zip" label={t.skills.export} onClick={() => onExport(skillId)} />
      </header>
      {error && <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{t.skills.operationFailed}</div>}
      <div className="flex min-h-0 flex-1">
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-border bg-surface">
          <SkillFileTree entries={entries} selectedPath={selected?.relativePath ?? null} onSelect={(entry) => void selectEntry(entry)} />
        </aside>
        <main className="min-w-0 flex-1">
          <SkillFileEditor entry={selected} file={file} isSaving={isSaving} onSave={(content, timestamp) => void saveFile(content, timestamp)} onDownload={() => void downloadSelected()} onDirtyChange={setDirty} />
        </main>
      </div>
    </div>
  );
}

function DetailAction({ icon, label, onClick, disabled = false }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className="rounded-lg p-2 text-muted hover:bg-surface-dim hover:text-fg disabled:opacity-30"><span className="material-symbols-outlined text-[20px]">{icon}</span></button>;
}

function flattenEntries(entries: SkillFileEntry[]): SkillFileEntry[] {
  return entries.flatMap((entry) => [entry, ...flattenEntries(entry.children)]);
}

function isProtected(entry: SkillFileEntry): boolean {
  return entry.relativePath.toLocaleLowerCase() === 'skill.md';
}

function childPath(selected: SkillFileEntry | null, name: string): string {
  const directory = selected?.isDirectory
    ? selected.relativePath
    : selected?.relativePath.includes('/')
      ? selected.relativePath.slice(0, selected.relativePath.lastIndexOf('/'))
      : '';
  return directory ? `${directory}/${name}` : name;
}

function siblingPath(path: string, name: string): string {
  const index = path.lastIndexOf('/');
  return index < 0 ? name : `${path.slice(0, index)}/${name}`;
}
