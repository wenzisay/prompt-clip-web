/**
 * 标签胶囊组件
 */

import type { TagColor } from '@/types/tag';

interface TagPillProps {
  /** 标签名称 */
  label: string;
  /** 标签颜色 */
  color?: TagColor;
  /** 标签尺寸 */
  size?: 'sm' | 'md';
  /** 是否显示删除按钮 */
  showRemove?: boolean;
  /** 删除回调 */
  onRemove?: () => void;
  /** 点击回调 */
  onClick?: () => void;
  /** 是否可点击 */
  clickable?: boolean;
  /** 自定义类名 */
  className?: string;
}

const colorClasses: Record<TagColor, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export function TagPill({
  label,
  color = 'gray',
  size = 'md',
  showRemove = false,
  onRemove,
  onClick,
  clickable = false,
  className = '',
}: TagPillProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border
        ${colorClasses[color]} ${sizeClasses[size]}
        ${clickable || onClick ? 'cursor-pointer hover:opacity-80' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {formatTagLabel(label)}
      {showRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="hover:opacity-70"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      )}
    </span>
  );
}

function formatTagLabel(label: string): string {
  return label.startsWith('#') ? label : `#${label}`;
}
