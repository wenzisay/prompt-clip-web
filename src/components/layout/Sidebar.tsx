/**
 * 侧边栏组件
 */

import { TagTree } from '@/components/tag/TagTree';
import { useFileStore } from '@/stores/fileStore';
import { usePromptStore } from '@/stores/promptStore';
import { useTagStore } from '@/stores/tagStore';
import { useUIStore } from '@/stores/uiStore';
import { useState } from 'react';

export function Sidebar() {
  // const { tagTree } = useTagStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isStorageExpanded, setIsStorageExpanded] = useState(false);
  const { workspaceName, clearWorkspace } = useFileStore();
  const { clearPrompts } = usePromptStore();
  const { clearTags } = useTagStore();
  const { openModal } = useUIStore();

  const handleSwitchDirectory = () => {
    clearPrompts();
    clearTags();
    void clearWorkspace();
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
        <div className="px-3 py-3 border-t border-border">
          <div className="rounded-lg border border-border bg-surface-dim px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted">数据存储在本地</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsStorageExpanded((expanded) => !expanded)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-high hover:text-fg"
                  aria-label={isStorageExpanded ? '收起数据文件夹信息' : '展开数据文件夹信息'}
                  aria-expanded={isStorageExpanded}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isStorageExpanded ? 'expand_more' : 'chevron_right'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => openModal('settings')}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-high hover:text-fg"
                  aria-label="打开设置"
                  title="设置"
                >
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                </button>
              </div>
            </div>

            {isStorageExpanded && (
              <div className="mt-2 border-t border-border pt-2">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined mt-0.5 text-[18px] text-muted">
                    folder
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium text-fg"
                      title={workspaceName || '未选择目录'}
                    >
                      {workspaceName || '未选择目录'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchDirectory}
                  className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface text-xs font-medium text-fg transition-colors hover:bg-surface-high"
                  aria-label="切换数据文件夹"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    drive_folder_upload
                  </span>
                  <span>切换文件夹</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
