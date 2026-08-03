import { useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AgentToolIcon } from '@/components/common';
import { Modal } from '@/components/common/Modal';
import { useTranslation } from '@/i18n';
import type { AgentTool, SkillManagerSettings, SyncMode, ToolSyncMode } from '@/types/skill';

type SkillSettingsTab = 'sync' | 'storage';

export interface SkillSettingsModalProps {
  isOpen: boolean;
  settings: SkillManagerSettings;
  tools: AgentTool[];
  skillsPath: string;
  onClose: () => void;
  onSave: (defaultMode: SyncMode, overrides: Record<string, ToolSyncMode>) => void;
  onRevealStorage: () => void;
  /** 切换某 Agent 工具的启用状态（builtin/custom 通用）。 */
  onToggleToolEnabled?: (toolId: string, enabled: boolean) => void;
  /** 新增自定义工具。返回 false 表示失败（如表单校验），用于清空表单判断。 */
  onAddCustomTool?: (name: string, skillsPath: string) => boolean | Promise<boolean>;
  /** 删除自定义工具。 */
  onRemoveCustomTool?: (toolId: string) => void;
  /** 拖拽排序后的新顺序（tool id 数组）。 */
  onReorderTools?: (toolOrder: string[]) => void;
  isSaving?: boolean;
}

export function SkillSettingsModal({
  isOpen,
  settings,
  tools,
  skillsPath,
  onClose,
  onSave,
  onRevealStorage,
  onToggleToolEnabled,
  onAddCustomTool,
  onRemoveCustomTool,
  onReorderTools,
  isSaving = false,
}: SkillSettingsModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SkillSettingsTab>('sync');
  const [defaultMode, setDefaultMode] = useState<SyncMode>(settings.defaultSyncMode);
  const [overrides, setOverrides] = useState<Record<string, ToolSyncMode>>(settings.toolOverrides);
  // 自定义工具表单的本地输入态
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('sync');
    setDefaultMode(settings.defaultSyncMode);
    setOverrides(settings.toolOverrides);
    setNewName('');
    setNewPath('');
  }, [isOpen, settings]);

  const handleAddCustomTool = async () => {
    if (!onAddCustomTool) return;
    const ok = await onAddCustomTool(newName.trim(), newPath.trim());
    if (ok) {
      setNewName('');
      setNewPath('');
    }
  };

  const handlePickDirectory = async () => {
    try {
      const selected = await open({ multiple: false, directory: true });
      if (typeof selected === 'string') setNewPath(selected);
    } catch {
      // 用户取消或对话框失败时静默
    }
  };

  // 拖拽排序：用 8px 激活距离避免误触（点击按钮/开关/下拉时不会触发拖拽）
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!onReorderTools) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const currentIds = tools.map((tool) => tool.id);
    const oldIndex = currentIds.indexOf(String(active.id));
    const newIndex = currentIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderTools(arrayMove(currentIds, oldIndex, newIndex));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.skills.settingsTitle}
      maxWidth="3xl"
      closeLabel={t.skills.close}
      className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden"
      contentClassName="flex min-h-0 flex-1 overflow-hidden"
    >
      <div className="-mx-6 -my-4 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <nav className="w-52 shrink-0 border-r border-border bg-surface-dim p-4">
            <SettingsTabButton
              icon="settings"
              label={t.skills.syncTab}
              isActive={activeTab === 'sync'}
              onClick={() => setActiveTab('sync')}
            />
            <SettingsTabButton
              icon="folder"
              label={t.skills.storageTab}
              isActive={activeTab === 'storage'}
              onClick={() => setActiveTab('storage')}
            />
          </nav>

          <section className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
            {activeTab === 'sync' ? (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-fg">{t.skills.syncTab}</h3>
                  <p className="mt-1 text-sm text-muted">{t.skills.syncDescription}</p>
                </div>

                <div className="space-y-5">
                  <fieldset>
                    <legend className="text-sm font-medium text-fg">{t.skills.defaultSyncMode}</legend>
                    <div className="mt-1.5 grid w-full max-w-xs grid-cols-2 rounded-xl border border-border bg-bg p-1">
                      <button
                        type="button"
                        aria-pressed={defaultMode === 'symlink'}
                        onClick={() => setDefaultMode('symlink')}
                        className={`h-8 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
                          defaultMode === 'symlink'
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-muted hover:bg-surface-dim'
                        }`}
                      >
                        {t.skills.symlinkMode}
                      </button>
                      <button
                        type="button"
                        aria-pressed={defaultMode === 'copy'}
                        onClick={() => setDefaultMode('copy')}
                        className={`h-8 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
                          defaultMode === 'copy'
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-muted hover:bg-surface-dim'
                        }`}
                      >
                        {t.skills.copyMode}
                      </button>
                    </div>
                  </fieldset>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={tools.map((tool) => tool.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {tools.map((tool) => (
                          <SortableAgentToolRow
                            key={tool.id}
                            tool={tool}
                            override={overrides[tool.id] ?? 'inherit'}
                            onChangeOverride={(mode) =>
                              setOverrides((current) => ({ ...current, [tool.id]: mode }))
                            }
                            onToggleEnabled={
                              onToggleToolEnabled
                                ? (enabled) => onToggleToolEnabled(tool.id, enabled)
                                : undefined
                            }
                            onRemove={
                              tool.source === 'custom' && onRemoveCustomTool
                                ? () => onRemoveCustomTool(tool.id)
                                : undefined
                            }
                            draggable={Boolean(onReorderTools)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {onReorderTools && (
                    <p className="text-xs leading-5 text-muted">{t.skills.dragHint}</p>
                  )}

                  {onToggleToolEnabled && (
                    <p className="text-xs leading-5 text-muted">{t.skills.agentDisabledHint}</p>
                  )}

                  <p className="text-xs leading-5 text-muted">{t.skills.migrationHint}</p>
                </div>

                {onAddCustomTool && (
                  <CustomToolSection
                    newName={newName}
                    newPath={newPath}
                    onChangeName={setNewName}
                    onChangePath={setNewPath}
                    onPickDirectory={handlePickDirectory}
                    onAdd={handleAddCustomTool}
                  />
                )}
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-fg">{t.skills.storageTab}</h3>
                  <p className="mt-1 text-sm text-muted">{t.skills.storageDescription}</p>
                </div>

                <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
                  <h4 className="text-sm font-semibold text-fg">{t.skills.storagePath}</h4>
                  {skillsPath ? (
                    <>
                      <code className="mt-2 block break-all rounded-md bg-surface-dim px-3 py-2 text-xs leading-5 text-fg">
                        {skillsPath}
                      </code>
                      <div className="mt-4 flex items-center justify-end border-t border-border pt-4">
                        <button
                          type="button"
                          onClick={onRevealStorage}
                          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                        >
                          {t.skills.storageOpen}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted">{t.skills.storageDesktopOnly}</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-end border-t border-border px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted hover:bg-surface-dim">{t.skills.cancel}</button>
          {activeTab === 'sync' && (
            <button type="button" disabled={isSaving} onClick={() => onSave(defaultMode, overrides)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{t.skills.saveSettings}</button>
          )}
        </div>
      </div>
    </Modal>
  );
}

interface AgentToolRowProps {
  tool: AgentTool;
  override: ToolSyncMode;
  onChangeOverride: (mode: ToolSyncMode) => void;
  onToggleEnabled?: (enabled: boolean) => void;
  onRemove?: () => void;
}

function SortableAgentToolRow({
  tool,
  override,
  onChangeOverride,
  onToggleEnabled,
  onRemove,
  draggable,
}: AgentToolRowProps & { draggable: boolean }) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tool.id, disabled: !draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // 名称用于 select 的 aria-label；启用开关用带 "enable" 语义的独立 label 避免冲突。
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between gap-4 rounded-lg border border-border p-3 text-sm font-medium transition-shadow ${
        isDragging ? 'z-50 shadow-card-hover ring-1 ring-accent/30' : ''
      }`}
      {...attributes}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {draggable && (
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={t.skills.dragHandle}
            title={t.skills.dragHandle}
            className="flex h-8 w-5 shrink-0 cursor-grab items-center justify-center text-muted opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing focus:opacity-100 focus:outline-none"
            {...listeners}
          >
            <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
          </button>
        )}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft p-1.5">
          <AgentToolIcon iconId={tool.iconId} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate">
            {tool.name}
            {!tool.installed && (
              <span className="ml-2 text-xs font-normal text-muted">{t.skills.agentNotInstalled}</span>
            )}
          </span>
          <span className="mt-0.5 block break-all text-xs font-normal leading-4 text-muted">
            {tool.skillsPath}
          </span>
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {onToggleEnabled && (
          <label className="flex items-center gap-1.5 text-xs font-normal text-muted">
            <span className="sr-only">
              {tool.enabled ? t.skills.disableAgent(tool.name) : t.skills.enableAgent(tool.name)}
            </span>
            <ToggleSwitch
              checked={tool.enabled}
              disabled={!onToggleEnabled}
              onChange={onToggleEnabled}
            />
          </label>
        )}
        <select
          aria-label={tool.name}
          value={override}
          onChange={(event) => onChangeOverride(event.target.value as ToolSyncMode)}
          className="h-9 rounded-lg border border-border bg-bg px-3 font-normal"
        >
          <option value="inherit">{t.skills.inheritMode}</option>
          <option value="symlink">{t.skills.symlinkMode}</option>
          <option value="copy">{t.skills.copyMode}</option>
        </select>
        {onRemove && (
          <button
            type="button"
            aria-label={t.skills.customToolRemove}
            title={t.skills.customToolRemove}
            onClick={onRemove}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface CustomToolSectionProps {
  newName: string;
  newPath: string;
  onChangeName: (value: string) => void;
  onChangePath: (value: string) => void;
  onPickDirectory: () => void;
  onAdd: () => void;
}

function CustomToolSection({
  newName,
  newPath,
  onChangeName,
  onChangePath,
  onPickDirectory,
  onAdd,
}: CustomToolSectionProps) {
  const { t } = useTranslation();
  const canAdd = newName.trim().length > 0 && newPath.trim().length > 0;
  return (
    <div className="mt-8 border-t border-border pt-6">
      <h4 className="text-sm font-semibold text-fg">{t.skills.customTools}</h4>
      <p className="mt-1 text-xs leading-5 text-muted">{t.skills.customToolHint}</p>

      <div className="mt-3 space-y-2 rounded-lg border border-border bg-bg p-3">
        <label className="block">
          <span className="text-xs font-medium text-fg">{t.skills.customToolName}</span>
          <input
            type="text"
            value={newName}
            onChange={(event) => onChangeName(event.target.value)}
            placeholder={t.skills.customToolNamePlaceholder}
            className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm font-normal"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-fg">{t.skills.customToolPath}</span>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={newPath}
              onChange={(event) => onChangePath(event.target.value)}
              placeholder={t.skills.customToolPathPlaceholder}
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm font-normal"
            />
            <button
              type="button"
              onClick={onPickDirectory}
              className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-fg transition-colors hover:bg-surface-high"
            >
              <span className="material-symbols-outlined text-[16px]">folder_open</span>
              {t.skills.customToolSelectPath}
            </button>
          </div>
        </label>
        <div className="flex justify-end">
          <button
            type="button"
            disabled={!canAdd}
            onClick={onAdd}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {t.skills.customToolAdd}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSwitch({ checked, disabled, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 ${
        checked ? 'bg-accent' : 'bg-surface-high'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

interface SettingsTabButtonProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function SettingsTabButton({ icon, label, isActive, onClick }: SettingsTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        mb-2 flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium
        transition-colors
        ${isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-high'}
      `}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
