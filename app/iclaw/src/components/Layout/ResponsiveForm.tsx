import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ResponsiveInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

/**
 * ResponsiveInput - An input with responsive sizing and proper touch targets
 */
export function ResponsiveInput({
  label,
  error,
  hint,
  containerClassName,
  className,
  ...props
}: ResponsiveInputProps) {
  return (
    <div className={clsx('space-y-1.5', containerClassName)}>
      {label && (
        <label
          className="block text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </label>
      )}
      <input
        className={clsx(
          'input-base w-full',
          error && 'border-red-500 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

interface ResponsiveSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  containerClassName?: string;
}

/**
 * ResponsiveSelect - A select with custom styling and proper touch targets
 */
export function ResponsiveSelect({
  label,
  error,
  hint,
  options,
  containerClassName,
  className,
  ...props
}: ResponsiveSelectProps) {
  return (
    <div className={clsx('space-y-1.5', containerClassName)}>
      {label && (
        <label
          className="block text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={clsx(
            'input-base w-full appearance-none pr-10',
            error && 'border-red-500 focus:border-red-500',
            className
          )}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B6B6B'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            backgroundSize: '16px',
          }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

interface ResponsiveTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

/**
 * ResponsiveTextarea - A textarea with proper touch targets
 */
export function ResponsiveTextarea({
  label,
  error,
  hint,
  containerClassName,
  className,
  ...props
}: ResponsiveTextareaProps) {
  return (
    <div className={clsx('space-y-1.5', containerClassName)}>
      {label && (
        <label
          className="block text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </label>
      )}
      <textarea
        className={clsx(
          'input-base w-full resize-none',
          error && 'border-red-500 focus:border-red-500',
          className
        )}
        rows={3}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

interface ResponsiveButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

/**
 * ResponsiveButton - A button with consistent touch targets across all sizes
 */
export function ResponsiveButton({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
  onClick,
  type = 'button',
  className,
}: ResponsiveButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-4 py-2.5 text-sm min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[48px]',
  };

  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-150',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        'rounded-lg font-medium transition-all duration-150',
        'flex items-center justify-center gap-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && 'w-full',
        className
      )}
    >
      {loading ? (
        <span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
        />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}

interface FormGroupProps {
  children: ReactNode;
  className?: string;
  /** Number of columns on desktop (1 = always stacked) */
  cols?: 1 | 2;
}

/**
 * FormGroup - A responsive form group that stacks on mobile
 */
export function FormGroup({ children, className, cols = 1 }: FormGroupProps) {
  return (
    <div
      className={clsx(
        'grid gap-4',
        cols === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
        className
      )}
    >
      {children}
    </div>
  );
}
