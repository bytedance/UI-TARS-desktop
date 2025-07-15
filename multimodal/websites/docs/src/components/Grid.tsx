import React, { ReactNode } from 'react';

export interface GridProps {
  /**
   * Number of columns in the grid (desktop view only)
   * @default 2
   */
  columns?: 1 | 2 | 3 | 4 | 6 | 12;

  /**
   * Gap between grid cells
   * @default 'md'
   */
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Child elements, typically GridItem components
   */
  children: ReactNode;
}

export interface GridItemProps {
  /**
   * Number of columns this item spans (desktop view only)
   * @default 1
   */
  span?: number;

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Child content
   */
  children: ReactNode;
}

// Grid container component
export function Grid({ columns = 2, gap = 'md', className = '', children }: GridProps) {
  // Generate grid columns class based on specified column count
  const columnsClass = {
    1: 'grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
    6: 'sm:grid-cols-6',
    12: 'sm:grid-cols-12',
  }[columns];

  // Grid gap class
  const gapClass = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  }[gap];

  return (
    <div className={`grid grid-cols-1 ${columnsClass} ${gapClass} ${className}`}>{children}</div>
  );
}

// Grid item component
export function GridItem({ span = 1, className = '', children }: GridItemProps) {
  // Always full width on small screens, span specified columns on larger screens
  const spanClass = span > 1 ? `sm:col-span-${span}` : '';

  return <div className={`${spanClass} ${className}`}>{children}</div>;
}
