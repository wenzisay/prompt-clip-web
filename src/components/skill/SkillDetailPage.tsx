import { useCallback, useEffect, useRef, useState } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { useTranslation } from '@/i18n';
import { SkillService } from '@/services/skillService';
import type { SkillFileEntry, SkillTextFile } from '@/types/skill';
import { ContextMenu } from '@/components/common/ContextMenu';
import type { MenuItem } from '@/components/common/ContextMenu';
import { SkillFileEditor } from './SkillFileEditor';
import { SkillFileTree, ROOT_PATH } from './SkillFileTree';
import { SkillNamePromptModal } from './SkillNamePromptModal';
import { SkillConfirmModal } from './SkillConfirmModal';

export interface SkillDetailPageProps {
  skillId: string;
  onBack: () => void;
  onExport: (skillId: string) => void;
}

type NamePromptMode = 'folder' | 'file' | 'rename';

interface NamePromptState {
  mode: NamePromptMode;
  /** 操作目标目录/条目；folder/file 模式下为父目录（null=根），rename 模式下为被重命名的条目 */
  target: SkillFileEntry | null;
}

interface ContextMenuState {
  entry: SkillFileEntry | null;
  x: number;
  y: number;
}

interface ConfirmState {
  title: string;
  message: string;
  note?: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: () => void;
}

export function SkillDetailPage({ skillId, onBack, onExport }: SkillDetailPageProps) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<SkillFileEntry[]>([]);
  const [selected, setSelected] = useState<SkillFileEntry | null>(null);
  const [file, setFile] = useState<SkillTextFile | null>(null);
  const [isDirty, setDirty] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [namePrompt, setNamePrompt] = useState<NamePromptState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [isMutating, setMutating] = useState(false);
  const selectionRequest = useRef(0);
  /** 因脏数据需要确认而挂起的选择/返回动作 */
  const pendingAction = useRef<null | (() => void)>(null);

  const loadTree = useCallback(async () => {
    const nextEntries = await SkillService.listFiles(skillId);
    setEntries(nextEntries);
    return nextEntries;
  }, [skillId]);

  const doReadEntry = useCallback(
    async (entry: SkillFileEntry) => {
      const request = ++selectionRequest.current;
      try {
        const nextFile = entry.isText
          ? await SkillService.readTextFile(skillId, entry.relativePath)
          : null;
        if (selectionRequest.current === request) {
          setFile(nextFile);
          setError(false);
        }
      } catch {
        if (selectionRequest.current === request) {
          setError(true);
          setFile(null);
        }
      }
    },
    [skillId],
  );

  // 切换到某个文件：如脏则先弹确认框
  const selectEntry = useCallback(
    (entry: SkillFileEntry | null) => {
      if (entry?.isDirectory || entry === null) {
        setSelected(null);
        setDirty(false);
        setFile(null);
        return;
      }
      const proceed = () => {
        setSelected(entry);
        setDirty(false);
        void doReadEntry(entry);
      };
      if (isDirty) {
        pendingAction.current = proceed;
        setConfirm({
          title: t.skills.unsavedChanges,
          message: t.skills.unsavedChanges,
          confirmLabel: t.skills.confirm,
          danger: false,
          onConfirm: () => {
            setConfirm(null);
            const action = pendingAction.current;
            pendingAction.current = null;
            action?.();
          },
        });
        return;
      }
      proceed();
    },
    [doReadEntry, isDirty, t.skills.confirm, t.skills.unsavedChanges],
  );

  useEffect(() => {
    void loadTree()
      .then((nextEntries) => nextEntries.find((entry) => entry.relativePath === 'SKILL.md'))
      .then(async (entry) => {
        if (!entry) return;
        const request = ++selectionRequest.current;
        setSelected(entry);
        const nextFile = await SkillService.readTextFile(skillId, entry.relativePath);
        if (selectionRequest.current === request) {
          setFile(nextFile);
          setError(false);
        }
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

  const toggle = (relativePath: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(relativePath)) next.delete(relativePath);
      else next.add(relativePath);
      return next;
    });
  };

  const refresh = async (path?: string) => {
    const next = await loadTree();
    if (!path) return;
    const match = flattenEntries(next).find((entry) => entry.relativePath === path);
    if (match) selectEntry(match);
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
        expectedModifiedAtMs,
      );
      setFile(result.file);
      setDirty(false);
      if (result.syncErrors.length > 0) setBanner(t.skills.syncPartialFailure);
      await loadTree();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const runMutation = async (operation: () => Promise<unknown>, successPath?: string) => {
    setMutating(true);
    setError(false);
    setBanner(null);
    try {
      const result = await operation();
      const syncErrors = Array.isArray(result)
        ? result
        : result && typeof result === 'object' && 'syncErrors' in result
          ? (result as { syncErrors: unknown[] }).syncErrors
          : [];
      if (syncErrors.length > 0) setBanner(t.skills.syncPartialFailure);
      await refresh(successPath);
    } catch {
      setError(true);
    } finally {
      setMutating(false);
    }
  };

  // ---- 文件操作（入口由右键菜单触发）----

  const startCreate = (mode: Exclude<NamePromptMode, 'rename'>, parent: SkillFileEntry | null) => {
    setNamePrompt({ mode, target: parent });
  };

  const submitNamePrompt = async (name: string) => {
    if (!namePrompt) return;
    const { mode, target } = namePrompt;
    setNamePrompt(null);
    if (mode === 'folder') {
      const path = childPath(target, name);
      await runMutation(() => SkillService.createDirectory(skillId, path));
    } else if (mode === 'file') {
      const path = childPath(target, name);
      await runMutation(async () => {
        await SkillService.createTextFile(skillId, path);
        await refresh(path);
      }, path);
    } else {
      // rename：target 为被重命名的条目
      if (!target || isProtected(target)) return;
      const destination = siblingPath(target.relativePath, name);
      // 重命名的是当前编辑中的脏文件 → 选中目标后从磁盘重读，等价于放弃未保存修改
      const isCurrentDirty = isDirty && selected?.relativePath === target.relativePath;
      await runMutation(async () => {
        await SkillService.renameEntry(skillId, target.relativePath, destination);
        if (isCurrentDirty) {
          setSelected(null);
          setFile(null);
          setDirty(false);
        }
      }, isCurrentDirty ? undefined : destination);
    }
  };

  const startRename = (entry: SkillFileEntry) => {
    if (isProtected(entry)) return;
    setNamePrompt({ mode: 'rename', target: entry });
  };

  const startUpload = async (parent: SkillFileEntry | null) => {
    const source = await open({ multiple: false, directory: false });
    if (!source) return;
    const name = source.split(/[\\/]/).pop();
    if (!name) return;
    await runMutation(() => SkillService.uploadFile(skillId, source, childPath(parent, name)));
  };

  const startDelete = (entry: SkillFileEntry) => {
    if (isProtected(entry)) return;
    const message = t.skills.deleteEntryConfirm(entry.name);
    const note = entry.isDirectory ? t.skills.deleteEntryNote : t.skills.deleteEntryNote;
    setConfirm({
      title: t.skills.delete,
      message,
      note,
      confirmLabel: t.skills.delete,
      danger: true,
      onConfirm: () => {
        setConfirm(null);
        void runMutation(async () => {
          await SkillService.deleteEntry(skillId, entry.relativePath);
          if (selected?.relativePath === entry.relativePath) {
            setSelected(null);
            setFile(null);
          }
        });
      },
    });
  };

  const startDownload = async (entry: SkillFileEntry) => {
    if (entry.isDirectory) return;
    const destination = await save({ defaultPath: entry.name });
    if (!destination) return;
    await runMutation(() => SkillService.downloadFile(skillId, entry.relativePath, destination));
  };

  // ---- 右键菜单 ----

  const openMenu = (entry: SkillFileEntry | null, x: number, y: number) => {
    setMenu({ entry, x, y });
  };

  const handleMenuSelect = (key: string) => {
    const entry = menu?.entry ?? null;
    setMenu(null);
    switch (key) {
      case 'newFolder':
        startCreate('folder', entry);
        break;
      case 'newFile':
        startCreate('file', entry);
        break;
      case 'upload':
        void startUpload(entry);
        break;
      case 'rename':
        if (entry) startRename(entry);
        break;
      case 'delete':
        if (entry) startDelete(entry);
        break;
      case 'download':
        if (entry) void startDownload(entry);
        break;
      default:
        break;
    }
  };

  const menuItems: MenuItem[] = (() => {
    if (!menu) return [];
    const entry = menu.entry;
    // 根目录
    if (entry === null) {
      return [
        { key: 'newFolder', label: t.skills.newFolder, icon: 'create_new_folder' },
        { key: 'newFile', label: t.skills.newFile, icon: 'note_add' },
        { key: 'upload', label: t.skills.uploadFile, icon: 'upload_file' },
      ];
    }
    // 文件夹
    if (entry.isDirectory) {
      return [
        { key: 'newFolder', label: t.skills.newFolder, icon: 'create_new_folder' },
        { key: 'newFile', label: t.skills.newFile, icon: 'note_add' },
        { key: 'upload', label: t.skills.uploadFile, icon: 'upload_file' },
        { key: 'rename', label: t.skills.rename, icon: 'drive_file_rename_outline', separatorBefore: true },
        { key: 'delete', label: t.skills.delete, icon: 'delete', danger: true },
      ];
    }
    // 文件
    const protectedFile = isProtected(entry);
    return [
      ...(protectedFile
        ? []
        : [
            { key: 'rename', label: t.skills.rename, icon: 'drive_file_rename_outline' } as MenuItem,
            { key: 'delete', label: t.skills.delete, icon: 'delete', danger: true } as MenuItem,
          ]),
      { key: 'download', label: t.skills.download, icon: 'download', separatorBefore: !protectedFile },
    ];
  })();

  const back = () => {
    const proceed = () => onBack();
    if (isDirty) {
      pendingAction.current = proceed;
      setConfirm({
        title: t.skills.unsavedChanges,
        message: t.skills.unsavedChanges,
        confirmLabel: t.skills.confirm,
        danger: false,
        onConfirm: () => {
          setConfirm(null);
          const action = pendingAction.current;
          pendingAction.current = null;
          action?.();
        },
      });
      return;
    }
    proceed();
  };

  // 名称输入弹窗的动态文案
  const namePromptProps = (() => {
    if (!namePrompt) return null;
    const { mode, target } = namePrompt;
    if (mode === 'folder') {
      return {
        title: t.skills.newFolderTitle,
        label: t.skills.folderName,
        confirmLabel: t.skills.newFolder,
        initialValue: '',
      };
    }
    if (mode === 'file') {
      return {
        title: t.skills.newFileTitle,
        label: t.skills.fileName,
        confirmLabel: t.skills.newFile,
        initialValue: '',
      };
    }
    return {
      title: t.skills.renameTitle,
      label: target?.isDirectory ? t.skills.folderName : t.skills.fileName,
      confirmLabel: t.skills.rename,
      initialValue: target?.name ?? '',
    };
  })();

  return (
    <div className="flex h-full w-full flex-col bg-bg text-fg">
      <header className="flex h-16 items-center gap-2 border-b border-border bg-surface px-4">
        <button type="button" onClick={back} className="rounded-lg p-2 text-muted hover:bg-surface-dim" aria-label={t.skills.backToSkills}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{skillId}</h1>
        <DetailAction icon="folder_zip" label={t.skills.export} onClick={() => onExport(skillId)} />
      </header>
      {(error || banner) && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error ? t.skills.operationFailed : banner}
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-border bg-surface">
          <SkillFileTree
            entries={entries}
            skillName={skillId}
            selectedPath={selected?.relativePath ?? null}
            collapsedPaths={collapsedPaths}
            onToggle={toggle}
            onSelect={(entry) => selectEntry(entry)}
            onContextMenu={openMenu}
          />
        </aside>
        <main className="min-w-0 flex-1">
          <SkillFileEditor
            entry={selected}
            file={file}
            isSaving={isSaving}
            onSave={(content, timestamp) => void saveFile(content, timestamp)}
            onDownload={() => selected && void startDownload(selected)}
            onDirtyChange={setDirty}
          />
        </main>
      </div>

      <ContextMenu
        open={menu !== null}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        items={menuItems}
        onClose={() => setMenu(null)}
        onSelect={handleMenuSelect}
      />
      {namePrompt && namePromptProps && (
        <SkillNamePromptModal
          isOpen
          onClose={() => setNamePrompt(null)}
          onSubmit={(name) => void submitNamePrompt(name)}
          title={namePromptProps.title}
          label={namePromptProps.label}
          confirmLabel={namePromptProps.confirmLabel}
          initialValue={namePromptProps.initialValue}
          isSubmitting={isMutating}
        />
      )}
      {confirm && (
        <SkillConfirmModal
          isOpen
          onClose={() => {
            pendingAction.current = null;
            setConfirm(null);
          }}
          onConfirm={confirm.onConfirm}
          title={confirm.title}
          message={confirm.message}
          note={confirm.note}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          isSubmitting={isMutating}
        />
      )}
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

function childPath(parent: SkillFileEntry | null, name: string): string {
  // parent 为 null → 根目录；parent 为文件夹 → 在其内部；parent 为文件 → 同级
  const directory = !parent
    ? ROOT_PATH
    : parent.isDirectory
      ? parent.relativePath
      : parent.relativePath.includes('/')
        ? parent.relativePath.slice(0, parent.relativePath.lastIndexOf('/'))
        : '';
  return directory ? `${directory}/${name}` : name;
}

function siblingPath(path: string, name: string): string {
  const index = path.lastIndexOf('/');
  return index < 0 ? name : `${path.slice(0, index)}/${name}`;
}
