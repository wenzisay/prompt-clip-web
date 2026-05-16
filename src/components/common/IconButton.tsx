/**
 * 图标按钮组件
 */

import { forwardRef } from 'react';
import type { ButtonVariant } from './Button';

export type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 图标名称（Material Symbol） */
  icon: string;
  /** 按钮变体 */
  variant?: ButtonVariant;
  /** 按钮尺寸 */
  size?: IconButtonSize;
  /** 是否填充图标 */
  filled?: boolean;
  /** 无障碍标签 */
  label: string;
}

export type { IconButtonProps };

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'w-8 h-8 text-lg',
  md: 'w-10 h-10 text-xl',
  lg: 'w-12 h-12 text-2xl',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:opacity-90',
  secondary: 'bg-surface text-fg border border-border hover:bg-surface-dim',
  ghost: 'bg-transparent text-fg hover:bg-surface-dim',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = 'ghost',
      size = 'md',
      filled = false,
      disabled,
      className = '',
      label,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        aria-label={label}
        title={label}
        className={`
          inline-flex items-center justify-center
          rounded-lg transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
        {...props}
      >
        <span
          className={`material-symbols-outlined ${filled ? 'filled' : ''}`}
        >
          {icon}
        </span>
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
