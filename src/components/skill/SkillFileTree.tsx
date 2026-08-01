import type { SkillFileEntry } from '@/types/skill';
import { useTranslation } from '@/i18n';

/** 根目录相对路径，作为折叠态的 key 以及「未选中具体条目」的标识 */
export const ROOT_PATH = '';

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
}

export function SkillFileTree({
  entries,
  skillName,
  selectedPath,
  collapsedPaths,
  onToggle,
  onSelect,
  onContextMenu,
}: SkillFileTreeProps) {
  const rootCollapsed = collapsedPaths.has(ROOT_PATH);
  const rootSelected = selectedPath === null;
  // 按条目构造右键处理器，确保每个节点右键命中的是自身而非冒泡到父级
  const buildContextMenu = (entry: SkillFileEntry | null) => (event: React.MouseEvent) => {
    event.preventDefault();
    onContextMenu(entry, event.clientX, event.clientY);
  };

  return (
    <div className="py-2" role="tree">
      {/* 根节点：skill 文件夹本身 */}
      <TreeRow
        name={skillName}
        relativePath={ROOT_PATH}
        depth={0}
        isDirectory
        isProtected={false}
        collapsed={rootCollapsed}
        selected={rootSelected}
        onToggle={() => onToggle(ROOT_PATH)}
        onSelect={() => onSelect(null)}
        onContextMenu={buildContextMenu(null)}
      />
      {!rootCollapsed &&
        entries.map((entry) => (
          <TreeEntry
            key={entry.relativePath}
            entry={entry}
            depth={1}
            selectedPath={selectedPath}
            collapsedPaths={collapsedPaths}
            onToggle={onToggle}
            onSelect={onSelect}
            buildContextMenu={buildContextMenu}
          />
        ))}
    </div>
  );
}

/** 递归渲染子条目（根节点之外的真实文件/目录） */
function TreeEntry({
  entry,
  depth,
  selectedPath,
  collapsedPaths,
  onToggle,
  onSelect,
  buildContextMenu,
}: {
  entry: SkillFileEntry;
  depth: number;
  selectedPath: string | null;
  collapsedPaths: Set<string>;
  onToggle: (relativePath: string) => void;
  onSelect: (entry: SkillFileEntry | null) => void;
  /** 按条目构造右键处理器（确保每个节点右键命中的是自身而非父级） */
  buildContextMenu: (entry: SkillFileEntry) => (event: React.MouseEvent) => void;
}) {
  const collapsed = collapsedPaths.has(entry.relativePath);
  const selected = selectedPath === entry.relativePath;
  const isProtected = entry.relativePath.toLocaleLowerCase() === 'skill.md';
  const handleClick = () => {
    if (entry.isDirectory) onToggle(entry.relativePath);
    else onSelect(entry);
  };
  return (
    <div role="treeitem" aria-expanded={entry.isDirectory ? !collapsed : undefined}>
      <TreeRow
        name={entry.name}
        relativePath={entry.relativePath}
        depth={depth}
        isDirectory={entry.isDirectory}
        isProtected={isProtected}
        isMarkdown={entry.isMarkdown}
        isText={entry.isText}
        collapsed={collapsed}
        selected={selected}
        onToggle={handleClick}
        onSelect={handleClick}
        onContextMenu={buildContextMenu(entry)}
      />
      {entry.isDirectory && !collapsed &&
        entry.children.map((child) => (
          <TreeEntry
            key={child.relativePath}
            entry={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            collapsedPaths={collapsedPaths}
            onToggle={onToggle}
            onSelect={onSelect}
            buildContextMenu={buildContextMenu}
          />
        ))}
    </div>
  );
}

interface TreeRowProps {
  name: string;
  relativePath: string;
  depth: number;
  isDirectory: boolean;
  isProtected: boolean;
  isMarkdown?: boolean;
  isText?: boolean;
  collapsed: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

/** 单行节点，目录可折叠、文件可选中 */
function TreeRow({
  name,
  depth,
  isDirectory,
  isProtected,
  isMarkdown,
  isText,
  collapsed,
  selected,
  onToggle,
  onSelect,
  onContextMenu,
}: TreeRowProps) {
  const { t } = useTranslation();
  const folderIcon = isDirectory ? (collapsed ? 'folder' : 'folder_open') : isMarkdown ? 'markdown' : isText ? 'description' : 'draft';
  return (
    <button
      type="button"
      aria-label={name}
      onClick={isDirectory ? onToggle : onSelect}
      onContextMenu={onContextMenu}
      className={`flex h-8 w-full items-center gap-1 rounded-md pr-2 text-left text-sm hover:bg-surface-dim ${
        selected ? 'bg-accent-soft text-accent' : 'text-fg'
      }`}
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
