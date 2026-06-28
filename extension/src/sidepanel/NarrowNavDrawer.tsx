/**
 * 窄列导航抽屉
 *
 * 将仓库根 Sidebar 的功能（工作区信息/切换目录、标签树、回收站、设置）收纳进
 * 一个可呼出的 SideDrawer。组件全部复用（SideDrawer / TagTree）。
 */
import { SideDrawer } from '@/components/common';
import { TagTree } from '@/components/tag/TagTree';
import { useFileStore } from '@/stores/fileStore';
import { usePromptStore } from '@/stores/promptStore';
import { useTagStore } from '@/stores/tagStore';
import { useUIStore } from '@/stores/uiStore';
import { useTranslation } from '@/i18n';

interface NarrowNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NarrowNavDrawer({ isOpen, onClose }: NarrowNavDrawerProps) {
  const { t } = useTranslation();
  const { workspaceName, clearWorkspace } = useFileStore();
  const { clearPrompts } = usePromptStore();
  const { clearTags } = useTagStore();
  const { openModal } = useUIStore();

  const handleSwitchDirectory = () => {
    clearPrompts();
    clearTags();
    void clearWorkspace();
    onClose();
  };

  return (
    <SideDrawer
      isOpen={isOpen}
      title={t.app.tags}
      onClose={onClose}
      closeLabel={t.app.close}
      resizeLabel={t.app.resizeDrawer}
      resizeTitle={t.app.dragResize}
    >
      <div className="space-y-5">
        {/* 工作区信息 + 切换 */}
        <div className="rounded-lg border border-border bg-surface-dim px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-muted">folder</span>
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-fg" title={workspaceName || t.app.noWorkspace}>
              {workspaceName || t.app.noWorkspace}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSwitchDirectory}
            className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface text-xs font-medium text-fg transition-colors hover:bg-surface-high"
            aria-label={t.app.switchFolder}
          >
            <span className="material-symbols-outlined text-[16px]">drive_folder_upload</span>
            {t.app.switchFolder}
          </button>
        </div>

        {/* 标签树 */}
        <div>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
            {t.app.tags}
          </h2>
          <TagTree />
        </div>

        {/* 回收站 / 设置 */}
        <div className="space-y-1 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => {
              openModal('recycleBin');
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-fg transition-colors hover:bg-surface-dim"
          >
            <span className="material-symbols-outlined text-muted">delete</span>
            {t.recycle.title}
          </button>
          <button
            type="button"
            onClick={() => {
              openModal('settings');
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-fg transition-colors hover:bg-surface-dim"
          >
            <span className="material-symbols-outlined text-muted">settings</span>
            {t.settings.title}
          </button>
        </div>
      </div>
    </SideDrawer>
  );
}
