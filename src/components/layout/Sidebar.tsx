/**
 * 侧边栏组件
 */

import { TagTree } from '@/components/tag/TagTree';
import { useState } from 'react';

export function Sidebar() {
  // const { tagTree } = useTagStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

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
