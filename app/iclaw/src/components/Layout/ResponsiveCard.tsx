import { ReactNode } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface ResponsiveCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  /** Enable responsive padding (smaller on mobile) */
  responsivePadding?: boolean;
}

const paddingClasses = {
  sm: {
    base: 'p-3',
    responsive: 'p-3 md:p-4',
  },
  md: {
    base: 'p-4',
    responsive: 'p-4 md:p-6',
  },
  lg: {
    base: 'p-5',
    responsive: 'p-5 md:p-6',
  },
};

/**
 * ResponsiveCard - A card with responsive padding and optional interactivity
 */
export function ResponsiveCard({
  children,
  className,
  onClick,
  hoverable = false,
  padding = 'md',
  responsivePadding = true,
}: ResponsiveCardProps) {
  const isInteractive = onClick || hoverable;
  const paddingClass = responsivePadding
    ? paddingClasses[padding].responsive
    : paddingClasses[padding].base;

  const cardStyle = {
    backgroundColor: 'var(--bg-card)',
    borderColor: 'var(--border-primary)',
  };

  if (onClick) {
    return (
      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={clsx(
          'rounded-2xl border text-left w-full transition-all',
          paddingClass,
          isInteractive && 'cursor-pointer hover:shadow-md',
          className
        )}
        style={cardStyle}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <div
      className={clsx(
        'rounded-2xl border transition-all',
        paddingClass,
        isInteractive && 'hover:shadow-md cursor-pointer',
        className
      )}
      style={cardStyle}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accentColor?: string;
  className?: string;
}

/**
 * StatCard - A card designed for displaying metrics/statistics
 */
export function StatCard({
  icon,
  label,
  value,
  trend,
  trendValue,
  accentColor = 'var(--accent)',
  className,
}: StatCardProps) {
  return (
    <div
      className={clsx('rounded-xl p-4', className)}
      style={{ backgroundColor: 'var(--bg-elevated)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: accentColor }}>{icon}</span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      </div>
      <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
      {trend && trendValue && (
        <p
          className={clsx(
            'text-xs mt-1',
            trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'var(--text-tertiary)'
          )}
        >
          {trendValue}
        </p>
      )}
    </div>
  );
}

interface MetricGridProps {
  children: ReactNode;
  className?: string;
  cols?: 2 | 3 | 4;
}

/**
 * MetricGrid - A responsive grid for StatCard components
 */
export function MetricGrid({ children, className, cols = 4 }: MetricGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <div className={clsx('grid', gridCols[cols], 'gap-4', className)}>
      {children}
    </div>
  );
}
