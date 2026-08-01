import type { SkillFileEntry } from '@/types/skill';
import { useTranslation } from '@/i18n';

export interface SkillFileTreeProps {
  entries: SkillFileEntry[];
  selectedPath: string | null;
  onSelect: (entry: SkillFileEntry) => void;
}

export function SkillFileTree({ entries, selectedPath, onSelect }: SkillFileTreeProps) {
  return (
    <div className="py-2" role="tree">
      {entries.map((entry) => (
        <TreeEntry
          key={entry.relativePath}
          entry={entry}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function TreeEntry({
  entry,
  depth,
  selectedPath,
  onSelect,
}: {
  entry: SkillFileEntry;
  depth: number;
  selectedPath: string | null;
  onSelect: (entry: SkillFileEntry) => void;
}) {
  const { t } = useTranslation();
  const isProtected = entry.relativePath.toLocaleLowerCase() === 'skill.md';
  return (
    <div role="treeitem" aria-expanded={entry.isDirectory || undefined}>
      <button
        type="button"
        aria-label={entry.name}
        onClick={() => onSelect(entry)}
        className={`flex h-8 w-full items-center gap-2 rounded-md pr-2 text-left text-sm hover:bg-surface-dim ${
          selectedPath === entry.relativePath ? 'bg-accent-soft text-accent' : 'text-fg'
        }`}
        style={{ paddingLeft: `${10 + depth * 18}px` }}
      >
        <span className="material-symbols-outlined text-[18px] text-muted">
          {entry.isDirectory ? 'folder' : entry.isMarkdown ? 'markdown' : entry.isText ? 'description' : 'draft'}
        </span>
        <span className="min-w-0 flex-1 truncate">{entry.name}</span>
        {isProtected && <span title={t.skills.protected} className="material-symbols-outlined text-[15px] text-muted">lock</span>}
      </button>
      {entry.isDirectory && entry.children.map((child) => (
        <TreeEntry
          key={child.relativePath}
          entry={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
