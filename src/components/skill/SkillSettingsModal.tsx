import { useEffect, useState } from 'react';
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
  isSaving = false,
}: SkillSettingsModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SkillSettingsTab>('sync');
  const [defaultMode, setDefaultMode] = useState<SyncMode>(settings.defaultSyncMode);
  const [overrides, setOverrides] = useState<Record<string, ToolSyncMode>>(settings.toolOverrides);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('sync');
    setDefaultMode(settings.defaultSyncMode);
    setOverrides(settings.toolOverrides);
  }, [isOpen, settings]);

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
                  <div className="space-y-3">
                    {tools.filter((tool) => tool.installed).map((tool) => (
                      <label
                        key={tool.id}
                        className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 text-sm font-medium"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block">{tool.name}</span>
                          <span className="mt-0.5 block break-all text-xs font-normal leading-4 text-muted">
                            {tool.skillsPath}
                          </span>
                        </span>
                        <select
                          aria-label={tool.name}
                          value={overrides[tool.id] ?? 'inherit'}
                          onChange={(event) => setOverrides((current) => ({
                            ...current,
                            [tool.id]: event.target.value as ToolSyncMode,
                          }))}
                          className="h-9 shrink-0 rounded-lg border border-border bg-bg px-3 font-normal"
                        >
                          <option value="inherit">{t.skills.inheritMode}</option>
                          <option value="symlink">{t.skills.symlinkMode}</option>
                          <option value="copy">{t.skills.copyMode}</option>
                        </select>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs leading-5 text-muted">{t.skills.migrationHint}</p>
                </div>
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
