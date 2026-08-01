import { useEffect, useMemo, useRef, useState } from 'react';
import type { SkillSummary } from '@/types/skill';
import { useTranslation } from '@/i18n';

export interface SkillQuickSwitcherProps {
  isOpen: boolean;
  skills: SkillSummary[];
  onClose: () => void;
  onSelect: (skillId: string) => void;
}

export function SkillQuickSwitcher({
  isOpen,
  skills,
  onClose,
  onSelect,
}: SkillQuickSwitcherProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return skills.filter(
      (skill) => !normalized || skill.name.toLocaleLowerCase().includes(normalized)
    );
  }, [query, skills]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIndex(0);
    queueMicrotask(() => inputRef.current?.focus());
  }, [isOpen]);

  if (!isOpen) return null;

  const select = (skillId: string) => {
    onSelect(skillId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-[14vh]"
      role="dialog"
      aria-modal="true"
      aria-label={t.skills.quickSwitch}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <label className="relative block border-b border-border">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            search
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setSelectedIndex((index) => Math.min(index + 1, results.length - 1));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setSelectedIndex((index) => Math.max(index - 1, 0));
              }
              if (event.key === 'Enter' && results[selectedIndex]) {
                select(results[selectedIndex].id);
              }
            }}
            placeholder={t.skills.searchPlaceholder}
            className="h-14 w-full bg-transparent pl-12 pr-4 text-base text-fg outline-none"
          />
        </label>
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {results.map((skill, index) => (
            <button
              key={skill.id}
              type="button"
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => select(skill.id)}
              className={`flex w-full items-start rounded-xl px-3 py-3 text-left transition ${
                index === selectedIndex ? 'bg-accent-soft' : 'hover:bg-surface-dim'
              }`}
            >
              <span className="material-symbols-outlined mr-3 text-accent">extension</span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-fg">{skill.name}</span>
                <span className="mt-0.5 block truncate text-sm text-muted">
                  {skill.description}
                </span>
              </span>
            </button>
          ))}
          {results.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted">{t.skills.noSkills}</p>
          )}
        </div>
      </div>
    </div>
  );
}
