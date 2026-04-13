import { ReactNode } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface ListItemProps {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  description?: string;
  className?: string;
}

/**
 * ListItem - A touch-friendly list item with 48px minimum height
 */
export function ListItem({
  children,
  onClick,
  active = false,
  disabled = false,
  leadingIcon,
  trailingIcon,
  description,
  className,
}: ListItemProps) {
  const content = (
    <>
      {leadingIcon && (
        <span style={{ color: 'var(--text-secondary)' }}>{leadingIcon}</span>
      )}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: active ? 'var(--text-primary)' : 'var(--text-primary)' }}
        >
          {children}
        </p>
        {description && (
          <p
            className="text-xs truncate"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {description}
          </p>
        )}
      </div>
      {trailingIcon && (
        <span style={{ color: 'var(--text-tertiary)' }}>{trailingIcon}</span>
      )}
    </>
  );

  const baseClasses = clsx(
    'flex items-center gap-3 px-4 transition-colors',
    'min-h-[48px]',
    disabled && 'opacity-50 cursor-not-allowed',
    active && 'bg-[var(--bg-elevated)]',
    !disabled && !active && 'hover:bg-[var(--bg-elevated)]/50'
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={clsx(baseClasses, 'w-full text-left', className)}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={clsx(baseClasses, className)}>
      {content}
    </div>
  );
}

interface NavListItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
}

interface NavListProps {
  items: NavListItem[];
  activeId?: string;
  onSelect: (id: string) => void;
  className?: string;
}

/**
 * NavList - A navigation list with animated active indicator
 */
export function NavList({ items, activeId, onSelect, className }: NavListProps) {
  return (
    <ul className={clsx('space-y-1', className)}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            onClick={() => onSelect(item.id)}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all relative',
              'min-h-[48px]',
              activeId === item.id
                ? 'bg-[var(--bg-elevated)]'
                : 'hover:bg-[var(--bg-elevated)]/50'
            )}
            style={{
              color: activeId === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {activeId === item.id && (
              <motion.div
                layoutId="navActiveIndicator"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                style={{ backgroundColor: 'var(--accent)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            {item.icon}
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge !== undefined && (
              <span
                className="px-2 py-0.5 text-xs rounded-full"
                style={{
                  backgroundColor: 'var(--accent-muted)',
                  color: 'var(--accent)',
                }}
              >
                {item.badge}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

interface DividerProps {
  className?: string;
}

/**
 * Divider - A horizontal divider
 */
export function Divider({ className }: DividerProps) {
  return (
    <div
      className={clsx('h-px w-full', className)}
      style={{ backgroundColor: 'var(--border-primary)' }}
    />
  );
}

interface ListSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * ListSection - A grouped section within a list
 */
export function ListSection({ title, children, className }: ListSectionProps) {
  return (
    <div className={clsx('space-y-1', className)}>
      {title && (
        <p
          className="px-4 py-2 text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {title}
        </p>
      )}
      {children}
    </div>
  );
}
