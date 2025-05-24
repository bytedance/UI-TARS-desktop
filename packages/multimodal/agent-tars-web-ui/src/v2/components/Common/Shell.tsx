import React from 'react';
import classNames from 'classnames';
import { motion } from 'framer-motion';

interface ShellProps {
  children: React.ReactNode;
  title?: string;
  headerActions?: React.ReactNode;
  transparent?: boolean;
  className?: string;
}

/**
 * Shell Component - Container with consistent styling
 *
 * Provides:
 * - Consistent styling for panels
 * - Optional header with title and actions
 * - Transparent mode option
 * - Custom className support
 */
export const Shell: React.FC<ShellProps> = ({
  children,
  title,
  headerActions,
  transparent = false,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={classNames(
        'flex flex-col h-full overflow-hidden transition-all duration-300',
        {
          'bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm lg:border border-zinc-200/80 dark:border-zinc-800/80 lg:rounded-3xl shadow-sm':
            !transparent,
          'bg-transparent border-0': transparent,
        },
        className,
      )}
    >
      {(title || headerActions) && (
        <div
          className={classNames('flex items-center justify-between px-5 py-4', {
            'border-b border-zinc-200/80 dark:border-zinc-800/80': !transparent,
            'border-b border-gray-200/10 dark:border-gray-700/10': transparent,
          })}
        >
          {title && (
            <h2 className="font-medium text-gray-800 dark:text-gray-200 text-base tracking-tight">
              {title}
            </h2>
          )}
          {headerActions}
        </div>
      )}
      <div className="flex-1 overflow-auto relative">{children}</div>
    </motion.div>
  );
};
