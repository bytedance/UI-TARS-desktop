import React from 'react';
import { motion } from 'framer-motion';
import { FiFileText, FiBookOpen, FiClock } from 'react-icons/fi';
import { useSession } from '../../hooks/useSession';
import { formatTimestamp } from '../../utils/formatters';

interface ResearchReportEntryProps {
  title: string;
  timestamp: number;
  content: string;
}

/**
 * ResearchReportEntry - Displays a prominent entry point for accessing research reports
 *
 * Design principles:
 * - Visually distinct from regular messages
 * - Clear visual hierarchy with document icon
 * - Animated feedback for interaction
 * - Consistent styling with overall UI
 */
export const ResearchReportEntry: React.FC<ResearchReportEntryProps> = ({
  title,
  timestamp,
  content,
}) => {
  const { setActivePanelContent } = useSession();

  const handleOpenReport = () => {
    setActivePanelContent({
      type: 'research_report',
      source: content,
      title: title || 'Research Report',
      timestamp,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
      whileTap={{ scale: 0.98 }}
      onClick={handleOpenReport}
      className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-accent-100/40 dark:border-accent-700/20 cursor-pointer group"
    >
      <div className="flex items-center">
        <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-900/20 flex items-center justify-center mr-3 border border-accent-100/40 dark:border-accent-800/30 text-accent-500 dark:text-accent-400">
          <FiBookOpen size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-800 dark:text-gray-200 mb-1 flex items-center">
            <span className="truncate">{title}</span>
          </div>

          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <FiClock className="mr-1.5" size={12} />
            <span className="mr-2">{formatTimestamp(timestamp)}</span>
            <span className="px-1.5 py-0.5 bg-accent-50/70 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400 rounded-full border border-accent-100/30 dark:border-accent-800/20">
              Research Report
            </span>
          </div>
        </div>

        <motion.div
          className="ml-2 w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 group-hover:bg-accent-50 dark:group-hover:bg-accent-900/20 group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-all duration-200 border border-gray-100/40 dark:border-gray-700/30"
          animate={{ x: [0, 3, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            repeatDelay: 2,
          }}
        >
          <FiFileText size={16} />
        </motion.div>
      </div>
    </motion.div>
  );
};
