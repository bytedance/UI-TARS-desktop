import { motion } from 'framer-motion';
import { cn } from '@renderer/utils';

interface ProgressBarProps {
  progress: number;
  className?: string;
}

export function ProgressBar({ progress, className }: ProgressBarProps) {
  return (
    <div
      className={cn(
        'relative h-1.5 bg-gradient-to-r from-gray-200/50 to-gray-300/50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm',
        className,
      )}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(closest-side,rgba(37,99,235,0.1),transparent)] dark:bg-[radial-gradient(closest-side,rgba(37,99,235,0.15),transparent)] animate-pulse" />

      {/* Progress indicator */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="relative h-full"
      >
        {/* Main progress bar */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700">
          {/* Shine effect */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] animate-shine" />
        </div>

        {/* Glow overlay */}
        <div className="absolute inset-0 bg-blue-400/20 dark:bg-blue-500/20 blur-sm" />
      </motion.div>
    </div>
  );
}
