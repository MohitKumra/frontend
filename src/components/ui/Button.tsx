import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary: 'text-text-onaccent shadow-md shadow-accent/10 hover:shadow-lg hover:shadow-accent/20 active:shadow-sm',
  secondary:
    'bg-surface text-text-primary border border-border hover:border-border-strong hover:bg-neutral-100 dark:hover:bg-neutral-800',
  outline:
    'bg-transparent text-text-primary border border-border hover:border-accent hover:bg-accent-subtle hover:text-accent',
  ghost: 'bg-transparent text-text-muted hover:bg-accent-subtle hover:text-accent',
  danger: 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 hover:border-danger/30',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-sm min-h-[38px] gap-1.5',
  md: 'px-5 py-2.5 text-sm min-h-[44px] gap-2',
  lg: 'px-7 py-3 text-base min-h-[52px] gap-2.5',
  icon: 'p-2.5 min-h-[40px] min-w-[40px]',
};

/**
 * Premium enterprise button component.
 * - Consistent styling & micro-interactions (press scale, shadow transition)
 * - Touch-friendly (≥44px on md/lg)
 * - WCAG compliant focus states
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  leftIcon,
  rightIcon,
  children,
  fullWidth = false,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center rounded-xl font-bold',
        'transition-all duration-200 ease-out active:scale-[0.97]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      style={{
        background: variant === 'primary' ? 'var(--gradient-accent)' : undefined,
      }}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {size !== 'icon' && children}
      {size !== 'icon' && !loading && rightIcon}
    </button>
  );
}
