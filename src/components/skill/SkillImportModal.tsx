import { useEffect, useState } from 'react';
import type {
  ExternalScanResult,
  ExternalImportSelection,
  ImportDecision,
  SkillSummary,
} from '@/types/skill';
import { useTranslation } from '@/i18n';

export interface SkillImportModalProps {
  isOpen: boolean;
  scan: ExternalScanResult | null;
  hubSkills: SkillSummary[];
  onClose: () => void;
  onConfirm: (selections: ExternalImportSelection[]) => void;
  onRevealExternal: (targetGroupId: string, directoryName: string) => void;
}

interface GroupChoice {
  decision: ImportDecision;
  versionIndex: number;
}

export function SkillImportModal({
  isOpen,
  scan,
  hubSkills,
  onClose,
  onConfirm,
  onRevealExternal,
}: SkillImportModalProps) {
  const { t } = useTranslation();
  const [choices, setChoices] = useState<Record<string, GroupChoice>>({});

  useEffect(() => {
    if (!isOpen || !scan) return;
    const hubNames = new Set(hubSkills.map((skill) => skill.name.toLocaleLowerCase()));
    setChoices(
      Object.fromEntries(
        scan.groups.map((group) => [
          group.duplicateKey,
          {
            decision: hubNames.has(group.duplicateKey) ? 'keepHub' : 'useExternal',
            versionIndex: 0,
          },
        ])
      )
    );
  }, [hubSkills, isOpen, scan]);

  if (!isOpen || !scan) return null;

  const updateChoice = (
    duplicateKey: string,
    decision: ImportDecision,
    versionIndex: number
  ) => {
    setChoices((current) => ({
      ...current,
      [duplicateKey]: { decision, versionIndex },
    }));
  };

  const confirm = () => {
    const selections = scan.groups.flatMap((group) => {
      const choice = choices[group.duplicateKey];
      const version = group.versions[choice?.versionIndex ?? 0];
      const source = version?.sources[0];
      if (!choice || !version || !source) return [];
      return [{
        skillId: group.name,
        contentHash: version.contentHash,
        targetGroupId: source.targetGroupId,
        decision: choice.decision,
      }];
    });
    onConfirm(selections);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.skills.importTitle}
    >
      <div className="flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-fg">{t.skills.importTitle}</h2>
          <button
            type="button"
            aria-label={t.skills.close}
            onClick={onClose}
            className="material-symbols-outlined rounded-lg p-1 text-muted hover:bg-surface-dim"
          >
            close
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          {scan.invalidEntries.length > 0 && (
            <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
              <p className="text-sm font-medium">
                {t.skills.invalidExternalEntries(scan.invalidEntries.length)}
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {scan.invalidEntries.map((entry, index) => (
                  <li
                    key={`${entry.directoryName}-${entry.error.code}-${index}`}
                    className="space-y-1"
                  >
                    <div className="flex flex-wrap gap-x-2">
                      <span className="font-medium">{entry.directoryName}</span>
                      <span>{t.skills.externalScanError(entry.error.code)}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 text-muted">
                      <span>{entry.source.toolIds.join(', ')}</span>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        aria-label={t.skills.revealExternalPath(entry.source.path)}
                        title={t.skills.revealExternalPath(entry.source.path)}
                        onClick={() =>
                          onRevealExternal(
                            entry.source.targetGroupId,
                            entry.directoryName
                          )
                        }
                        className="min-w-0 break-all text-left text-accent hover:underline"
                      >
                        {entry.source.path}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {scan.groups.map((group) => {
            const choice = choices[group.duplicateKey];
            const hasHubVersion = hubSkills.some(
              (skill) => skill.name.toLocaleLowerCase() === group.duplicateKey
            );
            return (
              <fieldset key={group.duplicateKey} className="rounded-xl border border-border p-4">
                <legend className="px-1 font-semibold text-fg">{group.name}</legend>
                {hasHubVersion && (
                  <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-surface-dim">
                    <input
                      type="radio"
                      name={group.duplicateKey}
                      checked={choice?.decision === 'keepHub'}
                      onChange={() => updateChoice(group.duplicateKey, 'keepHub', 0)}
                    />
                    <span>{t.skills.keepHub}</span>
                  </label>
                )}
                {group.versions.map((version, versionIndex) => (
                  <label
                    key={version.contentHash}
                    className="mt-2 flex cursor-pointer items-start gap-3 rounded-lg border border-transparent p-2 hover:border-border hover:bg-surface-dim"
                  >
                    <input
                      type="radio"
                      name={group.duplicateKey}
                      checked={
                        choice?.decision === 'useExternal' &&
                        choice.versionIndex === versionIndex
                      }
                      onChange={() =>
                        updateChoice(group.duplicateKey, 'useExternal', versionIndex)
                      }
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-fg">{t.skills.useExternal}</span>
                      <span className="mt-1 block text-sm text-muted">{version.description}</span>
                      <span className="mt-1 block text-xs text-muted">
                        {t.skills.sourceCount(version.sources.length)} · {version.contentHash.slice(0, 12)}
                      </span>
                      {version.sources.map((source) => (
                        <span key={source.targetGroupId} className="mt-1 block truncate text-xs text-muted">
                          {source.toolIds.join(', ')} · {source.path}
                        </span>
                      ))}
                    </span>
                  </label>
                ))}
                <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-surface-dim">
                  <input
                    type="radio"
                    name={group.duplicateKey}
                    checked={choice?.decision === 'skip'}
                    onChange={() => updateChoice(group.duplicateKey, 'skip', 0)}
                  />
                  <span>{t.skills.skipImport}</span>
                </label>
              </fieldset>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted hover:bg-surface-dim">
            {t.skills.close}
          </button>
          <button type="button" onClick={confirm} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            {t.skills.confirmImport}
          </button>
        </div>
      </div>
    </div>
  );
}
