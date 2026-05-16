import { useState } from 'react';
import { TagPill } from './TagPill';
import { useTagStore } from '@/stores/tagStore';

interface TagSelectProps {
  /** 已选标签 */
  selectedTags: string[];
  /** 标签变化回调 */
  onChange: (tags: string[]) => void;
}

export function TagSelect({ selectedTags, onChange }: TagSelectProps) {
  const [input, setInput] = useState('');
  const { tags } = useTagStore();

  const suggestions = tags
    .filter((tag) => !selectedTags.includes(tag))
    .filter((tag) => !input.trim() || tag.toLowerCase().includes(input.trim().toLowerCase()))
    .slice(0, 8);

  // 添加标签
  const handleAddTag = () => {
    const tag = normalizeTag(input);
    addTag(tag);
    setInput('');
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
  };

  return (
    <div className="space-y-2">
      {/* 已选标签 */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <TagPill
              key={tag}
              label={tag}
              showRemove
              onRemove={() => handleRemoveTag(tag)}
            />
          ))}
        </div>
      )}

      {/* 输入框 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAddTag}
          placeholder="输入标签后按回车..."
          className="flex-1 px-3 py-2 bg-surface-dim rounded-lg text-sm text-fg placeholder:text-muted border border-transparent focus:border-accent focus:bg-surface transition-colors focus:outline-none"
        />
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(tag);
                setInput('');
              }}
              className="px-2 py-1 rounded-md bg-surface-dim text-xs text-muted hover:text-fg hover:bg-surface-high transition-colors"
              title={tag}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* 提示 */}
      <p className="text-xs text-muted">
        使用 / 可以创建层级标签，如 计算机/Linux
      </p>
    </div>
  );
}

function normalizeTag(value: string): string {
  return value.trim().replace(/^#/, '').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
}
