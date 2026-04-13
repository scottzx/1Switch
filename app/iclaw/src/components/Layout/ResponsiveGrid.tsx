import { ReactNode } from 'react';
import clsx from 'clsx';

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  /** Number of columns on desktop */
  cols?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  /** Whether to enable responsive column changes */
  responsive?: boolean;
}

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

const baseCols = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

/**
 * ResponsiveGrid - A grid that adapts columns based on screen size
 * Mobile: 1 column → Tablet: 2 columns → Desktop: cols (3 or 4)
 */
export function ResponsiveGrid({
  children,
  className,
  cols = 3,
  gap = 'md',
  responsive = true,
}: ResponsiveGridProps) {
  if (!responsive) {
    return (
      <div className={clsx('grid', baseCols[cols], gapClasses[gap], className)}>
        {children}
      </div>
    );
  }

  // Responsive grid that adapts from mobile to desktop
  const responsiveCols = {
    1: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    2: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  return (
    <div className={clsx('grid', responsiveCols[cols], gapClasses[gap], className)}>
      {children}
    </div>
  );
}

interface CardGridProps {
  children: ReactNode;
  className?: string;
  /** Minimum card width in pixels */
  minCardWidth?: number;
  gap?: 'sm' | 'md' | 'lg';
}

/**
 * CardGrid - Auto-fitting grid with minimum card width
 * Uses CSS auto-fill minmax for true responsive behavior
 */
export function CardGrid({
  children,
  className,
  minCardWidth = 280,
  gap = 'md',
}: CardGridProps) {
  return (
    <div
      className={clsx('grid', gapClasses[gap], className)}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

interface StackProps {
  children: ReactNode;
  className?: string;
  direction?: 'row' | 'col';
  gap?: 'sm' | 'md' | 'lg';
  /** On mobile, stack vertically; on desktop, keep horizontal */
  responsive?: boolean;
}

/**
 * Stack - Flex container that can stack on mobile
 */
export function Stack({
  children,
  className,
  direction = 'col',
  gap = 'md',
  responsive = false,
}: StackProps) {
  const directionClasses = {
    row: 'flex-row',
    col: 'flex-col',
  };

  if (!responsive) {
    return (
      <div className={clsx('flex', directionClasses[direction], gapClasses[gap], className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex',
        'flex-col sm:flex-row',
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}
