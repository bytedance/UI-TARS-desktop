import React from 'react';
import { motion } from 'framer-motion';

interface SharedGradientTitleProps {
  children: React.ReactNode;
  size?: 'lg' | 'xl' | '2xl';
  className?: string;
  animated?: boolean;
}

const sizeConfig = {
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

/**
 * Shared gradient title component with consistent styling
 * Eliminates redundant gradient title patterns across components
 */
export const SharedGradientTitle: React.FC<SharedGradientTitleProps> = ({
  children,
  size = '2xl',
  className = '',
  animated = true,
}) => {
  const sizeClass = sizeConfig[size];
  const baseClasses = `${sizeClass} font-semibold mb-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-white dark:to-gray-100 text-transparent bg-clip-text tracking-tight ${className}`;

  if (animated) {
    return (
      <motion.h3 variants={itemVariants} className={baseClasses}>
        {children}
      </motion.h3>
    );
  }

  return <h3 className={baseClasses}>{children}</h3>;
};
