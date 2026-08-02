import { useRef } from 'react';
import type { SkillFileEntry } from '@/types/skill';
import { useTranslation } from '@/i18n';

/** 根目录相对路径，作为折叠态的 key 以及「未选中具体条目」的标识 */
export const ROOT_PATH = '';

/** 内部条目拖动写入 dataTransfer 的自定义 MIME，用于与外部文件拖入区分 */
export const SKILL_ENTRY_MIME = 'application/x-promptclip-skill-entry';

/** 悬停折叠目录自动展开的延迟（ms） */
const HOVER_EXPAND_DELAY = 500;

export interface SkillFileTreeProps {
  /** skill 文件夹下的文件树（不含根节点本身） */
  entries: SkillFileEntry[];
  /** 根节点显示名称（通常是 skillId） */
  skillName: string;
  /** 当前选中条目的相对路径；null 表示未选中任何条目 */
  selectedPath: string | null;
  /** 处于折叠态的路径集合（受控，由父组件持有） */
  collapsedPaths: Set<string>;
  /** 折叠/展开某个目录（含根，根路径为 ''） */
  onToggle: (relativePath: string) => void;
  /** 选中文件；传 null 表示选中根目录（编辑区不展示具体文件） */
  onSelect: (entry: SkillFileEntry | null) => void;
  /** 右键条目；传 null 表示右键的是根目录 */
  onContextMenu: (entry: SkillFileEntry | null, x: number, y: number) => void;
  /** 当前拖拽悬停的目录路径（受控，null 表示未悬停） */
  dragOverPath: string | null;
  /** 当前正在被内部拖动的源条目路径（受控，null 表示无内部拖动） */
  draggingPath: string | null;
  /** 拖拽外部文件落到条目上；entry 为目标目录（null=根），event 携带 dataTransfer.files */
  onDropFiles: (entry: SkillFileEntry | null, event: React.DragEvent) => void;
  /** 内部条目拖动落到目标上；target 为目标目录（null=根） */
  onDropEntry: (source: SkillFileEntry, target: SkillFileEntry | null) => void;
  /** 拖拽悬停的目录变化（受控高亮）；传 null 表示离开文件树 */
  onDragOverPathChange: (relativePath: string | null) => void;
  /** 内部拖动源路径变化（受控）；dragstart 设为源路径，dragend/drop 清为 null */
  onDraggingPathChange: (relativePath: string | null) => void;
}

/** 计算文件条目所属的父目录路径（根级文件返回根路径） */
export function parentDirectoryPath(relativePath: string): string {
  const idx = relativePath.lastIndexOf('/');
  return idx === -1 ? ROOT_PATH : relativePath.slice(0, idx);
}

/** 判断拖拽事件是否携带外部文件 */
function hasFiles(event: React.DragEvent): boolean {
  return event.dataTransfer.types.includes('Files');
}

/** 判断拖拽事件是否来自内部条目拖动 */
function hasInternalEntry(event: React.DragEvent): boolean {
  return event.dataTransfer.types.includes(SKILL_ENTRY_MIME);
}

/**
 * 判断「把 sourcePath 移动到 targetDirPath 内部」是否合法。
 * 非法情形：target 是 source 自身，或 target 位于 source 子树内（会形成循环）。
 */
export function isSelfOrDescendant(sourcePath: string, targetDirPath: string): boolean {
  if (!targetDirPath) return false; // 拖到根目录总是合法（根不可能是任何条目的后代）
  if (targetDirPath === sourcePath) return true;
  // targetDirPath 以 `sourcePath/` 开头 → target 位于 source 子树内
  return targetDirPath.startsWith(`${sourcePath}/`);
}

export function SkillFileTree({
  entries,
  skillName,
  selectedPath,
  collapsedPaths,
  onToggle,
  onSelect,
  onContextMenu,
  dragOverPath,
  draggingPath,
  onDropFiles,
  onDropEntry,
  onDragOverPathChange,
  onDraggingPathChange,
}: SkillFileTreeProps) {
  const rootCollapsed = collapsedPaths.has(ROOT_PATH);
  const rootSelected = selectedPath === null;
  const rootDragOver = dragOverPath === ROOT_PATH;
  // 按条目构造右键处理器，确保每个节点右键命中的是自身而非冒泡到父级
  const buildContextMenu = (entry: SkillFileEntry | null) => (event: React.MouseEvent) => {
    event.preventDefault();
    onContextMenu(entry, event.clientX, event.clientY);
  };
  // 文件树空白处作为兜底落点：拖到具体行时由子行的 onDragOver 设置正确目录，
  // 拖到空白处（事件 target 即容器自身）才高亮根目录。
  const handleRootDragOver = (event: React.DragEvent) => {
    const isExternal = hasFiles(event);
    const isInternal = hasInternalEntry(event);
    if (!isExternal && !isInternal) return;
    if (isInternal && draggingPath && isSelfOrDescendant(draggingPath, ROOT_PATH)) return;
    event.preventDefault();
    if (event.target === event.currentTarget && dragOverPath !== ROOT_PATH) {
      onDragOverPathChange(ROOT_PATH);
    }
  };
  const handleRootDrop = (event: React.DragEvent) => {
    // 仅当 drop 在空白处（target=容器）时由根处理，行内的 drop 由子行处理。
    if (event.target !== event.currentTarget) return;
    const isInternal = hasInternalEntry(event);
    const isExternal = hasFiles(event);
    if (!isInternal && !isExternal) return;
    event.preventDefault();
    onDragOverPathChange(null);
    if (isInternal && draggingPath) {
      const source = findEntryByPath(entries, draggingPath);
      if (source) onDropEntry(source, null);
      onDraggingPathChange(null);
    } else {
      onDropFiles(null, event);
    }
  };
  // 整树离开：只有真正离开文件树区域才清空，避免行间切换抖动。
  // dragOver 时每行会即时设置正确路径，离开时浏览器会触发根容器的 dragleave。
  const handleRootDragLeave = (event: React.DragEvent) => {
    if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget as Node)) {
      onDragOverPathChange(null);
    }
  };

  return (
    <div
      className="py-2"
      role="tree"
      onDragOver={handleRootDragOver}
      onDrop={handleRootDrop}
      onDragLeave={handleRootDragLeave}
    >
      {/* 根节点：skill 文件夹本身 */}
      <TreeRow
        name={skillName}
        entry={null}
        relativePath={ROOT_PATH}
        dropTargetPath={ROOT_PATH}
        depth={0}
        isDirectory
        isProtected={false}
        collapsed={rootCollapsed}
        selected={rootSelected}
        isDragOver={rootDragOver}
        draggingPath={draggingPath}
        onToggle={() => onToggle(ROOT_PATH)}
        onTogglePath={onToggle}
        onSelect={() => onSelect(null)}
        onContextMenu={buildContextMenu(null)}
        onDragOverPathChange={onDragOverPathChange}
        onDropTarget={(event) => {
          if (hasInternalEntry(event) && draggingPath) {
            const source = findEntryByPath(entries, draggingPath);
            if (source) onDropEntry(source, null);
            onDraggingPathChange(null);
          } else {
            onDropFiles(null, event);
          }
        }}
        onDraggingPathChange={onDraggingPathChange}
      />
      {!rootCollapsed &&
        entries.map((entry) => (
          <TreeEntry
            key={entry.relativePath}
            entry={entry}
            depth={1}
            selectedPath={selectedPath}
            collapsedPaths={collapsedPaths}
            dragOverPath={dragOverPath}
            draggingPath={draggingPath}
            entries={entries}
            onToggle={onToggle}
            onSelect={onSelect}
            buildContextMenu={buildContextMenu}
            onDragOverPathChange={onDragOverPathChange}
            onDraggingPathChange={onDraggingPathChange}
            onDropFiles={onDropFiles}
            onDropEntry={onDropEntry}
          />
        ))}
    </div>
  );
}

/** 在文件树中按相对路径查找条目（内部拖动落根时，从 dataTransfer 仅能拿到路径字符串） */
function findEntryByPath(entries: SkillFileEntry[], relativePath: string): SkillFileEntry | null {
  for (const entry of entries) {
    if (entry.relativePath === relativePath) return entry;
    const found = findEntryByPath(entry.children, relativePath);
    if (found) return found;
  }
  return null;
}

/** 递归渲染子条目（根节点之外的真实文件/目录） */
function TreeEntry({
  entry,
  depth,
  selectedPath,
  collapsedPaths,
  dragOverPath,
  draggingPath,
  entries,
  onToggle,
  onSelect,
  buildContextMenu,
  onDragOverPathChange,
  onDraggingPathChange,
  onDropFiles,
  onDropEntry,
}: {
  entry: SkillFileEntry;
  depth: number;
  selectedPath: string | null;
  collapsedPaths: Set<string>;
  dragOverPath: string | null;
  draggingPath: string | null;
  entries: SkillFileEntry[];
  onToggle: (relativePath: string) => void;
  onSelect: (entry: SkillFileEntry | null) => void;
  /** 按条目构造右键处理器（确保每个节点右键命中的是自身而非父级） */
  buildContextMenu: (entry: SkillFileEntry) => (event: React.MouseEvent) => void;
  onDragOverPathChange: (relativePath: string | null) => void;
  onDraggingPathChange: (relativePath: string | null) => void;
  onDropFiles: (entry: SkillFileEntry | null, event: React.DragEvent) => void;
  onDropEntry: (source: SkillFileEntry, target: SkillFileEntry | null) => void;
}) {
  const collapsed = collapsedPaths.has(entry.relativePath);
  const selected = selectedPath === entry.relativePath;
  const isProtected = entry.relativePath.toLocaleLowerCase() === 'skill.md';
  // 落点目录：目录行=自身；文件行=其父目录。拖到文件上时高亮并落入它的同级目录。
  const dropTargetPath = entry.isDirectory ? entry.relativePath : parentDirectoryPath(entry.relativePath);
  // 仅目录行参与高亮；文件行即使落在其父目录路径上也不高亮（避免文件与其父目录同时亮起）。
  const isDragOver = entry.isDirectory && dragOverPath === dropTargetPath;
  const handleClick = () => {
    if (entry.isDirectory) onToggle(entry.relativePath);
    else onSelect(entry);
  };
  // 目录行落入自身；文件行落入其同级目录（childPath 对文件会解析到所在目录）。
  const dropTargetEntry = entry;
  return (
    <div role="treeitem" aria-expanded={entry.isDirectory ? !collapsed : undefined}>
      <TreeRow
        name={entry.name}
        entry={entry}
        relativePath={entry.relativePath}
        dropTargetPath={dropTargetPath}
        depth={depth}
        isDirectory={entry.isDirectory}
        isProtected={isProtected}
        isMarkdown={entry.isMarkdown}
        isText={entry.isText}
        collapsed={collapsed}
        selected={selected}
        isDragOver={isDragOver}
        draggingPath={draggingPath}
        onToggle={handleClick}
        onTogglePath={onToggle}
        onSelect={handleClick}
        onContextMenu={buildContextMenu(entry)}
        onDragOverPathChange={onDragOverPathChange}
        onDraggingPathChange={onDraggingPathChange}
        onDropTarget={(event) => {
          if (hasInternalEntry(event) && draggingPath) {
            const source = findEntryByPath(entries, draggingPath);
            if (source) onDropEntry(source, dropTargetEntry);
            onDraggingPathChange(null);
          } else {
            onDropFiles(dropTargetEntry, event);
          }
        }}
      />
      {entry.isDirectory && !collapsed &&
        entry.children.map((child) => (
          <TreeEntry
            key={child.relativePath}
            entry={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            collapsedPaths={collapsedPaths}
            dragOverPath={dragOverPath}
            draggingPath={draggingPath}
            entries={entries}
            onToggle={onToggle}
            onSelect={onSelect}
            buildContextMenu={buildContextMenu}
            onDragOverPathChange={onDragOverPathChange}
            onDraggingPathChange={onDraggingPathChange}
            onDropFiles={onDropFiles}
            onDropEntry={onDropEntry}
          />
        ))}
    </div>
  );
}

interface TreeRowProps {
  name: string;
  /** 行对应的条目；根节点为 null（不可被拖动） */
  entry: SkillFileEntry | null;
  /** 行自身的相对路径（用于 dragstart 写入 dataTransfer） */
  relativePath: string;
  /** 拖拽时高亮/落入的目标目录路径：目录行=自身，文件行=其父目录 */
  dropTargetPath: string;
  depth: number;
  isDirectory: boolean;
  isProtected: boolean;
  isMarkdown?: boolean;
  isText?: boolean;
  collapsed: boolean;
  selected: boolean;
  isDragOver: boolean;
  draggingPath: string | null;
  onToggle: () => void;
  /** 悬停展开时调用，参数为目录路径 */
  onTogglePath: (relativePath: string) => void;
  onSelect: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onDragOverPathChange: (relativePath: string) => void;
  onDraggingPathChange: (relativePath: string | null) => void;
  onDropTarget: (event: React.DragEvent) => void;
}

/** 单行节点，目录可折叠、文件可选中，支持内部拖动与外部拖入 */
function TreeRow({
  name,
  entry,
  relativePath,
  dropTargetPath,
  depth,
  isDirectory,
  isProtected,
  isMarkdown,
  isText,
  collapsed,
  selected,
  isDragOver,
  draggingPath,
  onToggle,
  onTogglePath,
  onSelect,
  onContextMenu,
  onDragOverPathChange,
  onDraggingPathChange,
  onDropTarget,
}: TreeRowProps) {
  const { t } = useTranslation();
  const hoverExpandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const folderIcon = isDirectory ? (collapsed ? 'folder' : 'folder_open') : isMarkdown ? 'markdown' : isText ? 'description' : 'draft';

  const clearHoverTimer = () => {
    if (hoverExpandTimer.current) {
      clearTimeout(hoverExpandTimer.current);
      hoverExpandTimer.current = null;
    }
  };

  // 内部条目拖动起始：写入自定义 MIME 并通知父组件记录源路径。受保护条目禁拖。
  const handleDragStart = (event: React.DragEvent) => {
    if (isProtected || !entry) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData(SKILL_ENTRY_MIME, relativePath);
    event.dataTransfer.effectAllowed = 'move';
    onDraggingPathChange(relativePath);
  };
  const handleDragEnd = () => {
    clearHoverTimer();
    onDraggingPathChange(null);
  };
  // 悬停高亮 + 折叠目录自动展开。内部拖动需排除拖入自身/子树的非法落点。
  const handleDragOver = (event: React.DragEvent) => {
    const isExternal = hasFiles(event);
    const isInternal = hasInternalEntry(event);
    if (!isExternal && !isInternal) return;
    if (isInternal && draggingPath && isSelfOrDescendant(draggingPath, dropTargetPath)) return;
    event.preventDefault();
    if (isInternal) event.dataTransfer.dropEffect = 'move';
    onDragOverPathChange(dropTargetPath);
    // 内部拖动悬停在折叠目录上时，延迟自动展开
    if (isInternal && isDirectory && collapsed) {
      if (!hoverExpandTimer.current) {
        hoverExpandTimer.current = setTimeout(() => {
          onTogglePath(relativePath);
          hoverExpandTimer.current = null;
        }, HOVER_EXPAND_DELAY);
      }
    }
  };
  const handleDragLeave = () => {
    clearHoverTimer();
  };
  const handleDrop = (event: React.DragEvent) => {
    const isInternal = hasInternalEntry(event);
    const isExternal = hasFiles(event);
    if (!isInternal && !isExternal) return;
    event.preventDefault();
    clearHoverTimer();
    onDropTarget(event);
  };
  return (
    <button
      type="button"
      aria-label={name}
      draggable={!isProtected && entry !== null}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={isDirectory ? onToggle : onSelect}
      onContextMenu={onContextMenu}
      className={`flex h-8 w-full items-center gap-1 rounded-md pr-2 text-left text-sm hover:bg-surface-dim ${
        selected ? 'bg-accent-soft text-accent' : 'text-fg'
      } ${isDragOver ? 'ring-2 ring-accent ring-inset bg-accent-soft' : ''}`}
      style={{ paddingLeft: `${6 + depth * 16}px` }}
    >
      {isDirectory ? (
        <span className="material-symbols-outlined text-[16px] text-muted">
          {collapsed ? 'chevron_right' : 'expand_more'}
        </span>
      ) : (
        <span className="inline-block w-[16px]" />
      )}
      <span className={`material-symbols-outlined text-[18px] text-muted`}>{folderIcon}</span>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {isProtected && (
        <span title={t.skills.protected} className="material-symbols-outlined text-[15px] text-muted">
          lock
        </span>
      )}
    </button>
  );
}
