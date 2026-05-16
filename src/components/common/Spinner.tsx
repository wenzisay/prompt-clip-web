/**
 * 加载指示器组件
 */

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  /** 尺寸 */
  size?: SpinnerSize;
  /** 颜色 */
  color?: 'accent' | 'muted' | 'white';
  /** 自定义类名 */
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

const colorClasses: Record<NonNullable<SpinnerProps['color']>, string> = {
  accent: 'text-accent',
  muted: 'text-muted',
  white: 'text-white',
};

export function Spinner({
  size = 'md',
  color = 'accent',
  className = '',
}: SpinnerProps) {
  return (
    <span
      className={`material-symbols-outlined animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      aria-hidden="true"
    >
      refresh
    </span>
  );
}
