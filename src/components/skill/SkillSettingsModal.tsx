import { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { useTranslation } from '@/i18n';
import type { AgentTool, SkillManagerSettings, SyncMode, ToolSyncMode } from '@/types/skill';

export interface SkillSettingsModalProps {
  isOpen: boolean;
  settings: SkillManagerSettings;
  tools: AgentTool[];
  onClose: () => void;
  onSave: (defaultMode: SyncMode, overrides: Record<string, ToolSyncMode>) => void;
  isSaving?: boolean;
}

export function SkillSettingsModal({
  isOpen,
  settings,
  tools,
  onClose,
  onSave,
  isSaving = false,
}: SkillSettingsModalProps) {
  const { t } = useTranslation();
  const [defaultMode, setDefaultMode] = useState<SyncMode>(settings.defaultSyncMode);
  const [overrides, setOverrides] = useState<Record<string, ToolSyncMode>>(settings.toolOverrides);

  useEffect(() => {
    if (!isOpen) return;
    setDefaultMode(settings.defaultSyncMode);
    setOverrides(settings.toolOverrides);
  }, [isOpen, settings]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.skills.settings} maxWidth="lg">
      <div className="space-y-5">
        <fieldset>
          <legend className="text-sm font-medium text-fg">{t.skills.defaultSyncMode}</legend>
          <div className="mt-1.5 grid w-full max-w-sm grid-cols-2 rounded-xl border border-border bg-bg p-1">
            <button
              type="button"
              aria-pressed={defaultMode === 'symlink'}
              onClick={() => setDefaultMode('symlink')}
              className={`h-10 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
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
              className={`h-10 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
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
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted hover:bg-surface-dim">{t.skills.cancel}</button>
          <button type="button" disabled={isSaving} onClick={() => onSave(defaultMode, overrides)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{t.skills.saveSettings}</button>
        </div>
      </div>
    </Modal>
  );
}
