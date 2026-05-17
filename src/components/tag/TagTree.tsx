/**
 * 标签树组件
 */

import { useTagStore } from '@/stores/tagStore';
import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import { useFileStore } from '@/stores/fileStore';
import { PromptService } from '@/services/promptService';
import { TagService } from '@/services/tagService';
import type { TagTreeNode } from '@/types/tag';
import { useEffect, useRef, useState } from 'react';

interface TreeNodeProps {
  node: TagTreeNode;
  level: number;
}

function TreeNode({ node, level }: TreeNodeProps) {
  const {
    pinnedTags,
    toggleExpand,
    togglePin,
    getTagColor,
    renamePinnedTag,
    removePinnedTag,
  } = useTagStore();
  const { prompts, filter, setFilter, updatePrompt } = usePromptStore();
  const { directoryHandle } = useFileStore();
  const { clearSelection } = useUIStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasChildren = node.children.length > 0;
  const isActive = filter.tag === node.name;
  const color = getTagColor(node.name);
  const isPinned = pinnedTags.includes(node.name);

  // 切换展开
  const handleToggleExpand = () => {
    if (hasChildren) {
      toggleExpand(node.name);
    }
  };

  // 点击筛选
  const handleClick = () => {
    clearSelection();
    setFilter({ tag: node.name });
  };

  const handleTogglePin = (event: React.MouseEvent) => {
    event.stopPropagation();
    togglePin(node.name);
    setIsMenuOpen(false);
  };

  const handleRename = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!directoryHandle || isBusy) return;

    const input = window.prompt('输入新的标签路径', `#${node.name}`);
    const nextTag = TagService.normalizeTagPath(input || '');
    if (!nextTag || nextTag === node.name) {
      setIsMenuOpen(false);
      return;
    }

    setIsBusy(true);
    try {
      const affectedPrompts = prompts.filter((prompt) =>
        prompt.tags.some((tag) => TagService.isTagMatch(tag, node.name))
      );

      for (const prompt of affectedPrompts) {
        const updated = await PromptService.updatePrompt(
          directoryHandle,
          prompt,
          {
            id: prompt.id,
            tags: TagService.renameTagsInList(prompt.tags, node.name, nextTag),
          }
        );
        updatePrompt(updated);
      }

      renamePinnedTag(node.name, nextTag);
      if (filter.tag && TagService.isTagMatch(filter.tag, node.name)) {
        setFilter({ tag: `${nextTag}${filter.tag.slice(node.name.length)}` });
      }
    } finally {
      setIsBusy(false);
      setIsMenuOpen(false);
    }
  };

  const handleRemove = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!directoryHandle || isBusy) return;

    const confirmed = window.confirm(`确定要从相关 Prompt 中移除标签 #${node.name} 吗？`);
    if (!confirmed) {
      setIsMenuOpen(false);
      return;
    }

    setIsBusy(true);
    try {
      const affectedPrompts = prompts.filter((prompt) =>
        prompt.tags.some((tag) => TagService.isTagMatch(tag, node.name))
      );

      for (const prompt of affectedPrompts) {
        const updated = await PromptService.updatePrompt(
          directoryHandle,
          prompt,
          {
            id: prompt.id,
            tags: TagService.removeTagFromList(prompt.tags, node.name),
          }
        );
        updatePrompt(updated);
      }

      removePinnedTag(node.name);
      if (filter.tag && TagService.isTagMatch(filter.tag, node.name)) {
        setFilter({ tag: undefined });
      }
    } finally {
      setIsBusy(false);
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // 计算缩进
  const indent = level * 16;

  return (
    <div>
      {/* 节点 */}
      <div
        onClick={handleClick}
        className={`
          flex items-center gap-1 py-1.5 px-2 rounded-lg cursor-pointer
          transition-colors group
          ${isActive ? 'bg-accent-soft text-accent' : 'hover:bg-surface-dim'}
        `}
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {/* 展开/折叠按钮 */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleExpand();
            }}
            className="p-0.5 rounded hover:bg-surface-high"
          >
            <span
              className={`material-symbols-outlined text-lg text-muted transition-transform ${
                node.expanded ? 'rotate-90' : ''
              }`}
            >
              chevron_right
            </span>
          </button>
        ) : (
          <span className="w-6" />
        )}

        {/* 标签颜色指示器 */}
        <span
          className={`w-2 h-2 rounded-full ${
            color === 'blue'
              ? 'bg-blue-500'
              : color === 'purple'
              ? 'bg-purple-500'
              : color === 'violet'
              ? 'bg-violet-500'
              : 'bg-gray-400'
          }`}
        />

        {/* 标签名称 */}
        <span className="flex-1 text-xs truncate">{node.displayName}</span>

        {isPinned && (
          <span className="material-symbols-outlined text-sm text-muted">
            push_pin
          </span>
        )}

        {/* 计数 */}
        <span
          className={`text-xs ${
            isActive ? 'text-accent' : 'text-muted'
          }`}
        >
          {node.count}
        </span>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsMenuOpen((value) => !value);
            }}
            disabled={isBusy}
            className="w-6 h-6 inline-flex items-center justify-center rounded-md text-muted opacity-0 group-hover:opacity-100 hover:bg-surface-high transition disabled:opacity-40"
            aria-label="标签操作"
            title="标签操作"
          >
            <span className="material-symbols-outlined text-base">
              more_horiz
            </span>
          </button>

          {isMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-36 bg-surface border border-border rounded-lg shadow-card py-1 z-20"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleTogglePin}
                className="w-full px-3 py-2 text-left text-sm text-fg hover:bg-surface-dim transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">
                  {isPinned ? 'keep_off' : 'push_pin'}
                </span>
                {isPinned ? '取消置顶' : '置顶'}
              </button>
              <button
                type="button"
                onClick={handleRename}
                disabled={!directoryHandle || isBusy}
                className="w-full px-3 py-2 text-left text-sm text-fg hover:bg-surface-dim transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                重命名
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={!directoryHandle || isBusy}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
                删除标签
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 子节点 */}
      {hasChildren && node.expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.name} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TagTree() {
  const { tagTree, pinnedTags } = useTagStore();

  // 置顶标签
  const pinnedNodes = flattenNodes(tagTree)
    .filter((node) => pinnedTags.includes(node.name))
    .sort((a, b) => {
      const aIndex = pinnedTags.indexOf(a.name);
      const bIndex = pinnedTags.indexOf(b.name);
      return aIndex - bIndex;
    });

  // 非置顶标签
  const unpinnedNodes = tagTree.filter(
    (node) => !pinnedTags.includes(node.name)
  );

  return (
    <div className="space-y-1">
      {/* 置顶标签 */}
      {pinnedNodes.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 px-2 py-1">
            <span className="material-symbols-outlined text-lg text-muted">
              push_pin
            </span>
            <span className="text-xs font-semibold text-muted uppercase">
              置顶
            </span>
          </div>
          {pinnedNodes.map((node) => (
            <TreeNode key={node.name} node={node} level={0} />
          ))}
        </div>
      )}

      {/* 所有标签 */}
      {unpinnedNodes.length > 0 && (
        <div className="space-y-1">
          {pinnedNodes.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 mt-2">
              <span className="material-symbols-outlined text-lg text-muted">
                folder
              </span>
              <span className="text-xs font-semibold text-muted uppercase">
                全部标签
              </span>
            </div>
          )}
          {unpinnedNodes.map((node) => (
            <TreeNode key={node.name} node={node} level={0} />
          ))}
        </div>
      )}

      {/* 空状态 */}
      {tagTree.length === 0 && (
        <div className="py-4 text-center text-muted text-sm">
          暂无标签
        </div>
      )}
    </div>
  );
}

function flattenNodes(nodes: TagTreeNode[]): TagTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children)]);
}
