import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  ExternalEntryTarget,
  ExternalImportProgress,
  ExternalInvalidSkillEntry,
  ExternalScanResult,
  ExternalImportSelection,
  ExternalSkillGroup,
  ImportDecision,
  SkillSummary,
} from '@/types/skill';
import { useTranslation } from '@/i18n';
import { Spinner } from '@/components/common';

const INVALID_GROUP_PRIORITY = [
  'skill_external_link_invalid',
  'skill_markdown_invalid_type',
  'skill_content_symlink',
];
const BROKEN_LINK_ERROR_CODE = 'skill_external_link_invalid';
/** 某类错误数量超过此阈值时默认折叠明细，避免大量同类提示刷屏。 */
const AUTO_COLLAPSE_GROUP_THRESHOLD = 3;

export interface SkillImportModalProps {
  isOpen: boolean;
  scan: ExternalScanResult | null;
  hubSkills: SkillSummary[];
  isImporting?: boolean;
  importProgress?: ExternalImportProgress | null;
  isCleaningBrokenLinks?: boolean;
  onClose: () => void;
  onConfirm: (selections: ExternalImportSelection[]) => void;
  onRevealExternal: (targetGroupId: string, directoryName: string) => void;
  onCleanupBrokenLinks?: (entries: ExternalEntryTarget[], displayPath?: string) => void;
}

interface GroupChoice {
  decision: ImportDecision;
  versionIndex: number;
}

interface InvalidEntryGroup {
  code: string;
  entries: ExternalInvalidSkillEntry[];
}

function groupInvalidEntries(entries: ExternalInvalidSkillEntry[]): InvalidEntryGroup[] {
  const byCode = new Map<string, ExternalInvalidSkillEntry[]>();
  for (const entry of entries) {
    const list = byCode.get(entry.error.code);
    if (list) {
      list.push(entry);
    } else {
      byCode.set(entry.error.code, [entry]);
    }
  }
  const orderedCodes = [
    ...INVALID_GROUP_PRIORITY.filter((code) => byCode.has(code)),
    ...[...byCode.keys()].filter((code) => !INVALID_GROUP_PRIORITY.includes(code)),
  ];
  return orderedCodes.map((code) => ({
    code,
    entries: byCode.get(code) ?? [],
  }));
}

export function SkillImportModal({
  isOpen,
  scan,
  hubSkills,
  isImporting = false,
  importProgress = null,
  isCleaningBrokenLinks = false,
  onClose,
  onConfirm,
  onRevealExternal,
  onCleanupBrokenLinks,
}: SkillImportModalProps) {
  const { t } = useTranslation();
  const [choices, setChoices] = useState<Record<string, GroupChoice>>({});
  const [existingCollapsed, setExistingCollapsed] = useState(false);
  const [newCollapsed, setNewCollapsed] = useState(false);
  const [invalidSectionCollapsed, setInvalidSectionCollapsed] = useState(false);
  const [collapsedInvalidGroups, setCollapsedInvalidGroups] = useState<Record<string, boolean>>({});

  const hubNames = useMemo(
    () => new Set(hubSkills.map((skill) => skill.name.toLocaleLowerCase())),
    [hubSkills]
  );

  const invalidGroups = useMemo(
    () => (scan ? groupInvalidEntries(scan.invalidEntries) : []),
    [scan]
  );

  useEffect(() => {
    if (!isOpen || !scan) return;
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
    setExistingCollapsed(false);
    setNewCollapsed(false);
    // 有可导入 Skill 时，异常区默认折叠避免把主内容挤出可视区；仅剩异常项时默认展开
    setInvalidSectionCollapsed(scan.groups.length > 0);
    setCollapsedInvalidGroups(
      Object.fromEntries(
        groupInvalidEntries(scan.invalidEntries).map((group) => [
          group.code,
          group.entries.length > AUTO_COLLAPSE_GROUP_THRESHOLD,
        ])
      )
    );
  }, [hubNames, isOpen, scan]);

  if (!isOpen || !scan) return null;

  const isBusy = isImporting || isCleaningBrokenLinks;
  const brokenLinkEntries = scan.invalidEntries.filter(
    (entry) => entry.error.code === BROKEN_LINK_ERROR_CODE
  );

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

  const toggleInvalidGroup = (code: string) => {
    setCollapsedInvalidGroups((current) => ({
      ...current,
      [code]: !current[code],
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

  const existingGroups = scan.groups.filter((group) => hubNames.has(group.duplicateKey));
  const newGroups = scan.groups.filter((group) => !hubNames.has(group.duplicateKey));
  const total = scan.groups.length;

  const renderGroup = (group: ExternalSkillGroup) => {
    const choice = choices[group.duplicateKey];
    const hasHubVersion = hubNames.has(group.duplicateKey);
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
        {!hasHubVersion && (
          <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-surface-dim">
            <input
              type="radio"
              name={group.duplicateKey}
              checked={choice?.decision === 'skip'}
              onChange={() => updateChoice(group.duplicateKey, 'skip', 0)}
            />
            <span>{t.skills.skipImport}</span>
          </label>
        )}
      </fieldset>
    );
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
            onClick={isBusy ? undefined : onClose}
            disabled={isBusy}
            className="material-symbols-outlined rounded-lg p-1 text-muted hover:bg-surface-dim disabled:cursor-not-allowed disabled:opacity-40"
          >
            close
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          {scan.invalidEntries.length > 0 && (
            <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  aria-expanded={!invalidSectionCollapsed}
                  onClick={() => setInvalidSectionCollapsed((value) => !value)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm font-medium"
                >
                  <span
                    className="material-symbols-outlined shrink-0 text-[18px]"
                    aria-hidden="true"
                  >
                    {invalidSectionCollapsed ? 'chevron_right' : 'expand_more'}
                  </span>
                  <span>{t.skills.invalidExternalEntries(scan.invalidEntries.length)}</span>
                  {brokenLinkEntries.length > 0 && (
                    <span className="ml-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-xs font-normal text-amber-950">
                      {t.skills.invalidBrokenLinkCountBadge(brokenLinkEntries.length)}
                    </span>
                  )}
                </button>
                {onCleanupBrokenLinks && brokenLinkEntries.length > 0 && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      onCleanupBrokenLinks(
                        brokenLinkEntries.map((entry) => ({
                          targetGroupId: entry.source.targetGroupId,
                          directoryName: entry.directoryName,
                        })),
                        brokenLinkEntries.length === 1 ? brokenLinkEntries[0].source.path : undefined
                      )
                    }
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-400 bg-white px-2.5 py-1 text-xs font-medium text-amber-950 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                      delete_sweep
                    </span>
                    <span>
                      {isCleaningBrokenLinks
                        ? t.skills.cleaningBrokenLinks
                        : t.skills.cleanupAllBrokenLinks}
                    </span>
                  </button>
                )}
              </div>

              {!invalidSectionCollapsed && (
                <div className="mt-3 space-y-2.5">
                  {invalidGroups.map((group) => {
                    const isGroupCollapsed = Boolean(collapsedInvalidGroups[group.code]);
                    const hint = t.skills.invalidGroupHint(group.code);
                    const isBrokenLinkGroup = group.code === BROKEN_LINK_ERROR_CODE;
                    return (
                      <div
                        key={group.code}
                        data-testid={`invalid-group-${group.code}`}
                        className="rounded-lg border border-amber-200 bg-white/75 p-2.5"
                      >
                        <button
                          type="button"
                          aria-expanded={!isGroupCollapsed}
                          onClick={() => toggleInvalidGroup(group.code)}
                          className="flex w-full items-center gap-1.5 text-left text-xs font-semibold text-amber-950"
                        >
                          <span
                            className="material-symbols-outlined shrink-0 text-[16px] text-amber-800"
                            aria-hidden="true"
                          >
                            {isGroupCollapsed ? 'chevron_right' : 'expand_more'}
                          </span>
                          <span>{t.skills.invalidGroupTitle(group.code)}</span>
                          <span className="font-normal text-amber-800">
                            （{group.entries.length}）
                          </span>
                        </button>
                        {hint && (
                          <p className="mt-1 pl-5 text-xs leading-5 text-amber-900/80">{hint}</p>
                        )}
                        {!isGroupCollapsed && (
                          <ul className="mt-2 space-y-2 pl-5 text-xs">
                            {group.entries.map((entry, index) => (
                              <li
                                key={`${entry.directoryName}-${entry.source.targetGroupId}-${index}`}
                                className="space-y-1 border-t border-amber-100 pt-2 first:border-t-0 first:pt-0"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex min-w-0 flex-wrap gap-x-2">
                                    <span className="font-medium text-fg">
                                      {entry.directoryName}
                                    </span>
                                    <span className="text-amber-950/90">
                                      {t.skills.skillScanError(entry.error.code, entry.error.params)}
                                    </span>
                                  </div>
                                  {isBrokenLinkGroup && onCleanupBrokenLinks && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() =>
                                        onCleanupBrokenLinks(
                                          [
                                            {
                                              targetGroupId: entry.source.targetGroupId,
                                              directoryName: entry.directoryName,
                                            },
                                          ],
                                          entry.source.path
                                        )
                                      }
                                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-950 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <span
                                        className="material-symbols-outlined text-[14px]"
                                        aria-hidden="true"
                                      >
                                        delete_outline
                                      </span>
                                      <span>{t.skills.cleanupBrokenLink}</span>
                                    </button>
                                  )}
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
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
          {total > 0 && (
            <p className="text-sm text-muted">
              {t.skills.importSummary(total, existingGroups.length, newGroups.length)}
            </p>
          )}
          {existingGroups.length > 0 && (
            <CollapsibleGroup
              title={t.skills.existingSkills}
              count={existingGroups.length}
              collapsed={existingCollapsed}
              onToggle={() => setExistingCollapsed((value) => !value)}
            >
              {existingGroups.map(renderGroup)}
            </CollapsibleGroup>
          )}
          {newGroups.length > 0 && (
            <CollapsibleGroup
              title={t.skills.newSkills}
              count={newGroups.length}
              collapsed={newCollapsed}
              onToggle={() => setNewCollapsed((value) => !value)}
            >
              {newGroups.map(renderGroup)}
            </CollapsibleGroup>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            {isImporting && importProgress && importProgress.total > 0 && (
              <div className="space-y-1.5" role="status" aria-live="polite">
                <p
                  data-testid="skill-import-progress-text"
                  className="truncate text-xs font-medium text-muted"
                >
                  {t.skills.importingProgressDetail(
                    importProgress.currentSkillId,
                    importProgress.current,
                    importProgress.total
                  )}
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-dim">
                  <div
                    data-testid="skill-import-progress-bar"
                    className="h-full rounded-full bg-accent transition-all duration-200"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((importProgress.current / importProgress.total) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="rounded-lg px-4 py-2 text-sm text-muted hover:bg-surface-dim disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.skills.close}
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImporting && <Spinner size="sm" color="white" />}
              {isImporting
                ? importProgress && importProgress.total > 0
                  ? t.skills.importingProgress(importProgress.current, importProgress.total)
                  : t.skills.importing
                : t.skills.confirmImport}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CollapsibleGroupProps {
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function CollapsibleGroup({
  title,
  count,
  collapsed,
  onToggle,
  children,
}: CollapsibleGroupProps) {
  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-fg hover:bg-surface-dim"
      >
        <span className="material-symbols-outlined text-[18px] text-muted" aria-hidden="true">
          {collapsed ? 'chevron_right' : 'expand_more'}
        </span>
        <span>{title}</span>
        <span className="text-muted">（{count}）</span>
      </button>
      {!collapsed && <div className="space-y-4">{children}</div>}
    </section>
  );
}
