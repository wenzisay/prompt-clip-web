/**
 * 顶部栏组件
 */

import { useFileStore } from '@/stores/fileStore';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';
import { IconButton } from '@/components/common';
import { useEffect, useState } from 'react';

export function TopBar() {
  const { directoryName } = useFileStore();
  const { openModal } = useUIStore();
  const { filteredPrompts, filter } = usePromptStore();
  const [searchQuery, setSearchQuery] = useState(filter.searchQuery || '');

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      usePromptStore.getState().setFilter({ searchQuery });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center gap-4 px-4">
      {/* 左侧：目录信息 */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 text-muted">
          <span className="material-symbols-outlined text-lg">folder</span>
          <span className="text-sm truncate max-w-[200px]">
            {directoryName || '未选择目录'}
          </span>
        </div>

        {/* 结果计数 */}
        {filter.searchQuery && (
          <span className="text-sm text-muted">
            找到 {filteredPrompts.length} 个结果
          </span>
        )}
      </div>

      {/* 搜索框 */}
      <div className="w-[min(420px,40vw)] max-w-md">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted text-lg">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索 Prompts... (Cmd+K)"
            className={`
              w-full pl-10 pr-10 py-2 bg-surface-dim rounded-lg
              text-sm text-fg placeholder:text-muted
              border border-transparent focus:border-accent focus:bg-surface
              transition-colors focus:outline-none
            `}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-surface-high"
            >
              <span className="material-symbols-outlined text-muted text-lg">
                close
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <IconButton
          icon="download"
          label="导出 Prompts"
          onClick={() => openModal('export')}
          variant="ghost"
          size="sm"
        />
        <IconButton
          icon="add"
          label="新建 Prompt (Cmd+N)"
          onClick={() => openModal('create')}
          variant="primary"
          size="sm"
        />
      </div>
    </header>
  );
}
