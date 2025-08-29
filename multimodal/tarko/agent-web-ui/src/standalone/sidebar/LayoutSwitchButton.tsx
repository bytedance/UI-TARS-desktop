import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom } from 'jotai';
import { FiColumns, FiSidebar } from 'react-icons/fi';
import { layoutModeAtom } from '@/common/state/atoms/ui';
import { LayoutMode } from '@tarko/interface';

/**
 * LayoutSwitchButton Component - Toggle between layout modes
 *
 * Design principles:
 * - Consistent with toolbar button styling
 * - Clear visual indication of current mode
 * - Smooth animations for state transitions
 */
export const LayoutSwitchButton: React.FC = () => {
  const [layoutMode, setLayoutMode] = useAtom(layoutModeAtom);

  const toggleLayout = () => {
    const newMode: LayoutMode = layoutMode === 'default' ? 'narrow-chat' : 'default';
    setLayoutMode(newMode);
  };

  const isNarrowChat = layoutMode === 'narrow-chat';

  return (
    <motion.button
      whileHover={{
        scale: 1.08,
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={toggleLayout}
      className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 text-black dark:text-white hover:shadow-md"
      title={isNarrowChat ? 'Switch to Equal Layout' : 'Switch to Narrow Chat Layout'}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={layoutMode}
          initial={{ opacity: 0, rotate: -90 }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: 90 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {isNarrowChat ? <FiColumns size={16} /> : <FiSidebar size={16} />}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
};
