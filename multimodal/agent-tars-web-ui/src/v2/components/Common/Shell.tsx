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
 * Design principles:
 * - Clean, minimal container with subtle backdrop blur
 * - Flexible container that adapts to content while maintaining visual harmony
 * - Optional header with consistent spacing and typography
 * - Transparent mode for seamless integration with parent components
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
          'backdrop-blur-sm': !transparent,
          'bg-transparent': transparent,
        },
        className,
      )}
    >
      {(title || headerActions) && (
        <div
          className={classNames('flex items-center justify-between px-5 py-4', {
            'border-b border-gray-100/80 dark:border-gray-800/60': !transparent,
            'border-b border-gray-200/5 dark:border-gray-700/5': transparent,
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
