/**
 * 侧边栏组件
 */

import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import { TagTree } from '@/components/tag/TagTree';
import { useState } from 'react';

export function Sidebar() {
  // const { tagTree } = useTagStore();
  const { filter, setFilter } = usePromptStore();
  const { clearSelection } = useUIStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleFilterChange = (newFilter: 'all' | 'recent' | 'favorites') => {
    clearSelection();
    setFilter({
      favoritesOnly: newFilter === 'favorites',
      recentOnly: newFilter === 'recent',
      tag: undefined,
    });
  };

  return (
    <aside
      className={`
        bg-surface border-r border-border flex flex-col
        transition-all duration-200 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-sidebar'}
      `}
    >
      {/* 顶部：折叠按钮 */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border">
        {!isCollapsed && (
          <h1 className="text-lg font-bold text-fg flex items-center gap-2">
            <span className="material-symbols-outlined text-accent">auto_awesome</span>
            PromptClip
          </h1>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`
            p-2 rounded-lg hover:bg-surface-dim transition-colors
            ${isCollapsed ? 'mx-auto' : ''}
          `}
          aria-label={isCollapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          <span className="material-symbols-outlined text-muted">
            {isCollapsed ? 'menu_open' : 'menu'}
          </span>
        </button>
      </div>

      {/* 筛选按钮 */}
      {!isCollapsed && (
        <div className="px-3 py-4 border-b border-border">
          <div className="flex gap-2">
            <button
              onClick={() => handleFilterChange('all')}
              className={`
                flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  !filter.favoritesOnly && !filter.recentOnly
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:bg-surface-dim'
                }
              `}
            >
              全部
            </button>
            <button
              onClick={() => handleFilterChange('recent')}
              className={`
                flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  filter.recentOnly
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:bg-surface-dim'
                }
              `}
            >
              最近
            </button>
            <button
              onClick={() => handleFilterChange('favorites')}
              className={`
                flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  filter.favoritesOnly
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:bg-surface-dim'
                }
              `}
            >
              收藏
            </button>
          </div>
        </div>
      )}

      {/* 标签树 */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-3">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-2">
              标签
            </h2>
            <TagTree />
          </div>
        </div>
      )}

      {/* 底部状态 */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted">数据存储在本地</p>
        </div>
      )}
    </aside>
  );
}
