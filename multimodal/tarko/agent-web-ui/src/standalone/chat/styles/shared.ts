/**
 * Shared styling patterns for Chat UI components
 * Consolidates common animation variants and class patterns
 */

// Common animation variants
export const fadeInUpVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

export const scaleInVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
};

export const containerStaggerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1,
    },
  },
};

export const itemSlideUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

// Common class patterns
export const buttonBaseClasses = 'rounded-full transition-colors duration-200';
export const cardBaseClasses = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/50';
export const backdropBlurClasses = 'backdrop-blur-sm';
export const shadowClasses = 'shadow-sm hover:shadow-md';

// Interactive button classes
export const interactiveButtonClasses = `${buttonBaseClasses} ${shadowClasses} hover:scale-105 active:scale-95`;

// Status indicator classes
export const statusIndicatorClasses = {
  success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  processing: 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300',
  error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

// Common motion props
export const standardHoverProps = {
  whileHover: { scale: 1.05, y: -2 },
  whileTap: { scale: 0.95 },
};

export const subtleHoverProps = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};
