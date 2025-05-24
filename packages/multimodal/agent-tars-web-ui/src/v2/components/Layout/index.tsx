import React from 'react';
import { Sidebar } from '../Sidebar';
import { ChatPanel } from '../Chat/ChatPanel';
import { WorkspacePanel } from '../Workspace/WorkspacePanel';
import { useLayout } from '../../hooks/useLayout';
import { useSession } from '../../hooks/useSession';
import { motion, AnimatePresence } from 'framer-motion';
import { Shell } from '../Common/Shell';
import { ConnectionStatusBar } from '../Common/ConnectionStatusBar';

/**
 * Layout Component - Main application layout
 *
 * Provides:
 * - Responsive layout with sidebar and content areas
 * - Collapsible sidebar and panels
 * - Split view with chat panel and workspace panel
 * - Visual hierarchy through borders and spacing
 */
export const Layout: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar, isWorkspacePanelCollapsed } = useLayout();
  const { connectionStatus } = useSession();

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 lg:bg-zinc-100 lg:dark:bg-[#131315] text-gray-900 dark:text-gray-100 overflow-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebar} />
      
      <div className="flex-1 flex flex-col overflow-hidden p-4 lg:p-5">
        {/* Global connection status indicator */}
        <AnimatePresence>{!connectionStatus.connected && <ConnectionStatusBar />}</AnimatePresence>

        <div className="flex gap-5 h-full">
          {/* Chat panel with larger size when workspace is collapsed */}
          <motion.div 
            layout 
            className={`transition-all duration-300 ${
              isWorkspacePanelCollapsed ? 'w-full' : 'w-[45%]'
            }`}
          >
            <Shell 
              className="h-full border-l-4 border-l-primary-100 dark:border-l-primary-900/30"
            >
              <ChatPanel />
            </Shell>
          </motion.div>

          {/* Workspace panel */}
          <AnimatePresence>
            {!isWorkspacePanelCollapsed && (
              <motion.div 
                layout 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: '55%' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.3 }}
                className="transition-all duration-300"
              >
                <Shell 
                  className="h-full border-r-4 border-r-primary-100 dark:border-r-primary-900/30"
                >
                  <WorkspacePanel />
                </Shell>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
