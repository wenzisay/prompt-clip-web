/**
 * 通用按钮组件
 */

import { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体 */
  variant?: ButtonVariant;
  /** 按钮尺寸 */
  size?: ButtonSize;
  /** 是否为全宽 */
  fullWidth?: boolean;
  /** 子元素 */
  children: React.ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:opacity-90 active:opacity-80 shadow-sm',
  secondary:
    'bg-surface text-fg border border-border hover:bg-surface-dim active:bg-surface-high',
  ghost:
    'bg-transparent text-fg hover:bg-surface-dim active:bg-surface-high',
};

export type { ButtonProps };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center gap-2
          font-medium rounded-lg transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${fullWidth ? 'w-full' : ''}
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
