/**
 * 侧边栏组件
 */

import { TagTree } from '@/components/tag/TagTree';
import { AgentToolIcon } from '@/components/common';
import { useTranslation } from '@/i18n';
import { isTauriRuntime } from '@/services/fileRepository/tauriFileRepository';
import { useFileStore } from '@/stores/fileStore';
import { usePromptStore } from '@/stores/promptStore';
import { useSkillStore } from '@/stores/skillStore';
import { useTagStore } from '@/stores/tagStore';
import { useUIStore, type AppSection } from '@/stores/uiStore';
import { useState } from 'react';

export interface SidebarProps {
  onSkillSettings?: () => void;
  /** 切换 Prompts/Skills 的处理器；传入时用于在离开前做未保存修改确认 */
  onSelectSection?: (section: AppSection) => void;
}

export function Sidebar({ onSkillSettings, onSelectSection }: SidebarProps) {
  // const { tagTree } = useTagStore();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isStorageExpanded, setIsStorageExpanded] = useState(false);
  const { workspaceName, clearWorkspace } = useFileStore();
  const { clearPrompts } = usePromptStore();
  const { clearTags } = useTagStore();
  const { appSection, openModal, setAppSection } = useUIStore();
  const { tools: agentTools, filter: skillFilter, setAgentToolFilter } = useSkillStore();
  const isDesktop = isTauriRuntime();
  const isPromptSection = appSection === 'prompts';
  const installedAgentTools = agentTools.filter(
    (tool) => tool.installed && tool.enabled
  );
  // 切换 section：外部传入处理器时用之（用于未保存修改确认），否则直接切换
  const selectSection = onSelectSection ?? setAppSection;

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
          aria-label={isCollapsed ? t.app.expandSidebar : t.app.collapseSidebar}
        >
          <span className="material-symbols-outlined text-muted">
            {isCollapsed ? 'menu_open' : 'menu'}
          </span>
        </button>
      </div>

      {isDesktop && (
        <nav className="border-b border-border px-3 py-3" aria-label="PromptClip">
          <SectionButton
            active={appSection === 'prompts'}
            collapsed={isCollapsed}
            icon="description"
            label={t.app.prompts}
            section="prompts"
            onSelect={selectSection}
          />
          <SectionButton
            active={appSection === 'skills'}
            collapsed={isCollapsed}
            icon="extension"
            label={t.app.skills}
            section="skills"
            onSelect={selectSection}
          />
        </nav>
      )}

      {/* 标签树 */}
      {!isCollapsed && isPromptSection && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-3">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-2">
              {t.app.tags}
            </h2>
            <TagTree />
          </div>
        </div>
      )}

      {/* Skills 区：Agents 列表 */}
      {!isCollapsed && !isPromptSection && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-3">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-2">
              {t.skills.agents}
            </h2>
            {installedAgentTools.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted">{t.skills.noAgents}</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {installedAgentTools.map((tool) => {
                  const isActive = skillFilter.agentToolId === tool.id;
                  return (
                    <li key={tool.id}>
                      <button
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setAgentToolFilter(tool.id)}
                        title={tool.name}
                        className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                          isActive
                            ? 'bg-accent-soft text-accent'
                            : 'text-fg hover:bg-surface-dim'
                        }`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-soft p-1">
                          <AgentToolIcon iconId={tool.iconId} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {tool.name}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {isCollapsed && <div className="flex-1" />}

      {/* 回收站入口 */}
      {!isCollapsed && isPromptSection && (
        <div className="px-3 py-2 border-t border-border">
          <button
            type="button"
            onClick={() => openModal('recycleBin')}
            aria-label={t.recycle.title}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-surface-dim transition-colors text-left"
          >
            <span className="material-symbols-outlined text-muted">delete</span>
            <span className="text-sm text-fg">{t.recycle.title}</span>
          </button>
        </div>
      )}

      {/* 底部状态 */}
      {!isCollapsed && isPromptSection && (
        <div className="px-3 py-3 border-t border-border">
          <div className="rounded-lg border border-border bg-surface-dim px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted">{t.app.localStorage}</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsStorageExpanded((expanded) => !expanded)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-high hover:text-fg"
                  aria-label={
                    isStorageExpanded ? t.app.collapseStorage : t.app.expandStorage
                  }
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
                  aria-label={t.app.openSettings}
                  title={t.settings.title}
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
                      title={workspaceName || t.app.noWorkspace}
                    >
                      {workspaceName || t.app.noWorkspace}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchDirectory}
                  className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface text-xs font-medium text-fg transition-colors hover:bg-surface-high"
                  aria-label={t.app.switchFolder}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    drive_folder_upload
                  </span>
                  <span>{t.app.switchFolder}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!isPromptSection && (
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={onSkillSettings}
            className={`flex h-10 w-full items-center rounded-lg text-muted transition-colors hover:bg-surface-dim hover:text-fg ${
              isCollapsed ? 'justify-center' : 'gap-3 px-3'
            }`}
            aria-label={t.skills.settingsTitle}
            title={t.skills.settingsTitle}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            {!isCollapsed && <span className="text-sm font-medium">{t.skills.settingsTitle}</span>}
          </button>
        </div>
      )}
    </aside>
  );
}

interface SectionButtonProps {
  active: boolean;
  collapsed: boolean;
  icon: string;
  label: string;
  section: AppSection;
  onSelect: (section: AppSection) => void;
}

function SectionButton({
  active,
  collapsed,
  icon,
  label,
  section,
  onSelect,
}: SectionButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(section)}
      className={`mb-1 flex h-10 w-full items-center rounded-lg transition-colors last:mb-0 ${
        collapsed ? 'justify-center' : 'gap-3 px-3'
      } ${
        active
          ? 'bg-accent-soft font-medium text-accent'
          : 'text-muted hover:bg-surface-dim hover:text-fg'
      }`}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      title={collapsed ? label : undefined}
    >
      <span className="material-symbols-outlined text-[21px]">{icon}</span>
      {!collapsed && <span className="text-sm">{label}</span>}
    </button>
  );
}
