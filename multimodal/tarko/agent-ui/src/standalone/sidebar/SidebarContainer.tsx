import React from 'react';
import { ToolBar } from './ToolBar';
import { ChatSession } from './ChatSession';
import { useLayout } from '@/common/hooks/useLayout';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { AnimatePresence, motion } from 'framer-motion';

export const SidebarContainer: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useLayout();
  const { isReplayMode } = useReplayMode();

  // In replay mode, only show the ToolBar
  if (isReplayMode) {
    return (
      <div className="flex h-full pb-2 lg:pb-3">
        <ToolBar />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full pb-2 lg:pb-3">
        <ToolBar />
      </div>

      {/* Modal overlay and ChatSession */}
      <AnimatePresence>
        {!isSidebarCollapsed && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-lg z-40"
              onClick={toggleSidebar} // Close modal when clicking backdrop
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 h-full z-50"
            >
              <ChatSession isCollapsed={false} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default SidebarContainer;
