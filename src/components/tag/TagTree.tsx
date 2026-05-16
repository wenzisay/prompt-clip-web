/**
 * 标签树组件
 */

import { useTagStore } from '@/stores/tagStore';
import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import type { TagTreeNode } from '@/types/tag';

interface TreeNodeProps {
  node: TagTreeNode;
  level: number;
}

function TreeNode({ node, level }: TreeNodeProps) {
  const { toggleExpand, getTagColor } = useTagStore();
  const { filter, setFilter } = usePromptStore();
  const { clearSelection } = useUIStore();

  const hasChildren = node.children.length > 0;
  const isActive = filter.tag === node.name;
  const color = getTagColor(node.name);

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
        <span className="flex-1 text-sm truncate">{node.displayName}</span>

        {/* 计数 */}
        <span
          className={`text-xs ${
            isActive ? 'text-accent' : 'text-muted'
          }`}
        >
          {node.count}
        </span>
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
  const { filter, setFilter } = usePromptStore();
  const { clearSelection } = useUIStore();

  // 置顶标签
  const pinnedNodes = tagTree
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

  // 清除筛选
  const handleClearFilter = () => {
    clearSelection();
    setFilter({ tag: undefined });
  };

  return (
    <div className="space-y-1">
      {/* 清除筛选按钮 */}
      {filter.tag && (
        <button
          onClick={handleClearFilter}
          className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-sm text-accent hover:bg-accent-soft transition-colors"
        >
          <span className="material-symbols-outlined text-lg">close</span>
          <span>清除筛选</span>
        </button>
      )}

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
