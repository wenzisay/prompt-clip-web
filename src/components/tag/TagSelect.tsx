/**
 * 标签选择器组件
 *
 * TODO: 完整实现见 Task 6.2
 */

import { useState } from 'react';
import { TagPill } from './TagPill';

interface TagSelectProps {
  /** 已选标签 */
  selectedTags: string[];
  /** 标签变化回调 */
  onChange: (tags: string[]) => void;
}

export function TagSelect({ selectedTags, onChange }: TagSelectProps) {
  const [input, setInput] = useState('');

  // 添加标签
  const handleAddTag = () => {
    const tag = input.trim();
    if (tag && !selectedTags.includes(tag)) {
      onChange([...selectedTags, tag]);
    }
    setInput('');
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
              label={tag.split('/').pop() || tag}
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

      {/* 提示 */}
      <p className="text-xs text-muted">
        使用 "/" 可以创建层级标签，如 "计算机/Linux"
      </p>
    </div>
  );
}
