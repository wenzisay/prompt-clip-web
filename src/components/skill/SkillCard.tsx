import { confirm } from '@tauri-apps/plugin-dialog';
import { useEffect, useRef, useState } from 'react';
import { AgentToolIcon, Tooltip } from '@/components/common';
import type { AgentTool, SkillSummary, SkillToolState } from '@/types/skill';
import { useTranslation } from '@/i18n';
import { useSkillStore } from '@/stores/skillStore';
import { SkillAgentToolBar } from './SkillAgentToolBar';

export interface SkillCardProps {
  skill: SkillSummary;
  tools: AgentTool[];
  onOpen?: (skillId: string) => void;
  onExport?: (skillId: string) => void;
  onDelete?: (skillId: string) => void;
}

export function SkillCard({
  skill,
  tools,
  onOpen,
  onExport,
  onDelete,
}: SkillCardProps) {
  const { t } = useTranslation();
  const toggleFavorite = useSkillStore((state) => state.toggleFavorite);
  const setError = useSkillStore((state) => state.setError);
  const setToolEnabled = useSkillStore((state) => state.setToolEnabled);
  const installedTools = tools.filter((tool) => tool.installed && tool.enabled);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isToolMenuOpen, setToolMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const openCard = () => onOpen?.(skill.id);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const confirmForceOverwrite = async (
    tool: AgentTool,
    state: SkillToolState
  ): Promise<void> => {
    const separator = tool.skillsPath.includes('\\') ? '\\' : '/';
    const targetPath = `${tool.skillsPath.replace(/[\\/]+$/, '')}${separator}${skill.id}`;
    try {
      const confirmed = await confirm(
        t.skills.confirmForceOverwrite(skill.name, tool.name, targetPath),
        {
          title: t.skills.forceOverwriteFor(tool.name),
          kind: 'warning',
          okLabel: t.skills.forceOverwrite,
          cancelLabel: t.skills.cancel,
        }
      );
      if (!confirmed) return;
      await setToolEnabled(skill.id, state.targetGroupId, true, true);
    } catch (error) {
      setError({
        code: 'skill_force_confirmation_failed',
        params: { message: error instanceof Error ? error.message : String(error) },
      });
    }
  };

  return (
    <article
      className={`group relative flex min-h-[254px] cursor-pointer flex-col rounded-card border border-transparent bg-surface p-4 shadow-card transition-all hover:border-border hover:shadow-card-hover ${
        isMenuOpen || isToolMenuOpen ? 'z-30' : ''
      }`}
      onClick={openCard}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') openCard();
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-fg">{skill.name}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {skill.description}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {skill.favoritedAt && (
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 items-center justify-center text-yellow-500"
            >
              <span className="material-symbols-outlined overflow-visible text-[21px]">
                star
              </span>
            </span>
          )}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label={t.app.moreActions}
              title={t.app.moreActions}
              className={`material-symbols-outlined -mr-2 -mt-2 inline-flex h-11 w-11
                items-center justify-center rounded-lg text-[21px] text-muted transition-colors
                hover:bg-surface-dim hover:text-fg`}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
            >
              more_vert
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-full z-40 mt-1 w-44 rounded-lg border border-border bg-surface py-1 shadow-card">
                <SkillMenuButton
                  icon={skill.favoritedAt ? 'star' : 'star_border'}
                  label={skill.favoritedAt ? t.skills.unfavorite : t.skills.favorite}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeMenu();
                    void toggleFavorite(skill.id);
                  }}
                />
                <SkillMenuButton
                  icon="folder_zip"
                  label={t.skills.export}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeMenu();
                    onExport?.(skill.id);
                  }}
                />
                <SkillMenuButton
                  icon="delete"
                  label={t.skills.delete}
                  className="text-red-600 hover:bg-red-50"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeMenu();
                    onDelete?.(skill.id);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <SkillAgentToolBar
        tools={installedTools}
        moreLabel={t.skills.moreTools}
        onOpenChange={setToolMenuOpen}
        renderTool={(tool, mode) => {
          const state = skill.toolStates[tool.id] ?? missingToolState(tool);
          const isConflict = state.status === 'conflict';
          const canToggle = !['pending', 'broken'].includes(state.status);
          const shouldDisable = state.status === 'enabled' || state.status === 'stale';
          const label = isConflict
            ? t.skills.forceOverwriteFor(tool.name)
            : state.status === 'pending'
              ? t.skills.pendingFor(tool.name)
              : shouldDisable
                ? t.skills.disableFor(tool.name)
                : t.skills.enableFor(tool.name);
          const statusLabel = getStatusLabel(state.status, t.skills);
          const handleClick = (event: React.MouseEvent) => {
            event.stopPropagation();
            if (!canToggle) return;
            if (isConflict) {
              void confirmForceOverwrite(tool, state);
              return;
            }
            void setToolEnabled(skill.id, state.targetGroupId, !shouldDisable);
          };

          if (mode === 'menu') {
            return (
              <div
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg"
              >
                <button
                  type="button"
                  aria-label={`${label} · ${statusLabel}`}
                  aria-pressed={state.status !== 'disabled'}
                  disabled={!canToggle}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-soft p-1
                    transition hover:bg-surface-dim disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={handleClick}
                >
                  <AgentToolIcon
                    iconId={tool.iconId}
                    className={`block h-full w-full object-contain transition ${
                      state.status === 'disabled' ? 'grayscale' : ''
                    }`}
                  />
                </button>
                <span className="min-w-0 flex-1 truncate">{tool.name}</span>
                <span className="shrink-0 text-xs text-muted">{statusLabel}</span>
              </div>
            );
          }

          return (
            <span className="inline-flex shrink-0">
              <Tooltip
                side="top"
                content={
                  <>
                    <span className="font-medium">{tool.name}</span>
                    <span className="opacity-70"> · {statusLabel}</span>
                  </>
                }
              >
                <button
                  type="button"
                  aria-label={`${label} · ${statusLabel}`}
                  disabled={!canToggle}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg p-1
                    transition-colors hover:bg-surface-dim disabled:cursor-not-allowed"
                  onClick={handleClick}
                >
                  <span className="relative inline-flex">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft p-1.5 transition ${
                        state.status === 'disabled' ? 'grayscale opacity-45' : ''
                      }`}
                    >
                      <AgentToolIcon iconId={tool.iconId} />
                    </span>
                    {isConflict && (
                      <span
                        className={`material-symbols-outlined absolute -bottom-1 -right-1 rounded-full
                          bg-surface text-[14px] text-red-600`}
                        aria-hidden="true"
                      >
                        warning
                      </span>
                    )}
                  </span>
                </button>
              </Tooltip>
            </span>
          );
        }}
      />
    </article>
  );
}

interface SkillMenuButtonProps {
  icon: string;
  label: string;
  onClick: (event: React.MouseEvent) => void;
  className?: string;
}

function SkillMenuButton({
  icon,
  label,
  onClick,
  className = 'text-fg hover:bg-surface-dim',
}: SkillMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${className}`}
    >
      <span aria-hidden="true" className="material-symbols-outlined text-lg">
        {icon}
      </span>
      {label}
    </button>
  );
}

function missingToolState(tool: AgentTool): SkillToolState {
  return {
    toolId: tool.id,
    targetGroupId: tool.targetGroupId,
    status: 'conflict',
    actualMode: null,
    message: 'skill_tool_state_unavailable',
  };
}

interface SkillStatusMessages {
  statusEnabled: string;
  statusDisabled: string;
  statusStale: string;
  statusBroken: string;
  statusConflict: string;
  loading: string;
}

function getStatusLabel(
  status: SkillToolState['status'],
  messages: SkillStatusMessages
): string {
  if (status === 'enabled') return messages.statusEnabled;
  if (status === 'disabled') return messages.statusDisabled;
  if (status === 'stale') return messages.statusStale;
  if (status === 'broken') return messages.statusBroken;
  if (status === 'pending') return messages.loading;
  return messages.statusConflict;
}
