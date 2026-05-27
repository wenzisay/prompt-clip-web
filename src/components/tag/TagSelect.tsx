import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/i18n';
import { useTagStore } from '@/stores/tagStore';

interface TagSelectProps {
  /** 已选标签 */
  selectedTags: string[];
  /** 标签变化回调 */
  onChange: (tags: string[]) => void;
}

export function TagSelect({ selectedTags, onChange }: TagSelectProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { tags } = useTagStore();

  const suggestions = tags
    .filter((tag) => !selectedTags.includes(tag))
    .filter((tag) => !input.trim() || tag.toLowerCase().includes(input.trim().toLowerCase()))
    .slice(0, 8);

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  // 添加标签
  const handleAddTag = (value = input) => {
    const tag = normalizeTag(value);
    addTag(tag);
    setInput('');
    setIsAdding(false);
  };

  const addTag = (tag: string) => {
    if (tag && !selectedTags.includes(tag)) {
      onChange([...selectedTags, tag]);
    }
  };

  // 移除标签
  const handleRemoveTag = (tag: string) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  // 回车添加
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setInput('');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {selectedTags.map((tag, index) => (
          <span
            key={tag}
            className={`
              inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium
              ${index % 2 === 0 ? 'bg-blue-50 text-accent' : 'bg-purple-50 text-tertiary'}
            `}
          >
            {tag.replace(/^#/, '')}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="inline-flex h-4 w-4 items-center justify-center rounded-sm opacity-70 transition-opacity hover:opacity-100"
              aria-label={t.app.removeTagAria(tag)}
              title={t.app.removeTag}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </span>
        ))}

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-[var(--border-strong)] px-2.5 py-1 text-sm font-medium text-muted transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
          >
            <span className="material-symbols-outlined text-base">add</span>
            {t.app.add}
          </button>
        )}

        {isAdding && (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (input.trim()) {
                handleAddTag();
              } else {
                setIsAdding(false);
              }
            }}
            placeholder={t.app.tagNamePlaceholder}
            className="h-7 min-w-[120px] flex-1 rounded-md border border-[var(--border-strong)] bg-surface-container px-2 text-sm text-fg placeholder:text-muted shadow-inner transition-colors focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent-soft"
          />
        )}
      </div>

      {isAdding && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleAddTag(tag);
              }}
              className="px-2 py-1 rounded-md bg-surface-dim text-xs text-muted hover:text-fg hover:bg-surface-high transition-colors"
              title={tag}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function normalizeTag(value: string): string {
  return value.trim().replace(/^#/, '').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
}
