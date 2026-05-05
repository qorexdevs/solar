import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
};

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-container shadow-sm',
  secondary: 'bg-surface-tint text-on-primary hover:bg-primary-container shadow-sm',
  outline: 'border border-outline text-primary bg-transparent hover:bg-surface-variant',
  ghost: 'text-primary hover:bg-surface-container',
  danger: 'bg-error text-on-error hover:bg-error/90',
};

const SIZES: Record<Size, string> = {
  md: 'h-touch-target px-2 text-body-md',
  lg: 'h-touch-target px-2xl text-body-md font-semibold',
};

export function Button({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1 rounded-lg font-body-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
