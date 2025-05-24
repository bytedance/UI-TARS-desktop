import React from 'react';
import { Sidebar } from '../Sidebar';
import { ChatPanel } from '../Chat/ChatPanel';
import { WorkspacePanel } from '../Workspace/WorkspacePanel';
import { useLayout } from '../../hooks/useLayout';
import { useSession } from '../../hooks/useSession';
import { motion } from 'framer-motion';
import { Shell } from '../Common/Shell';

/**
 * Layout Component - Main application layout
 *
 * Provides:
 * - Responsive layout with sidebar and content areas
 * - Collapsible sidebar
 * - Split view with chat panel and workspace panel
 * - Visual hierarchy through borders and spacing
 */
export const Layout: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useLayout();
  const { connectionStatus } = useSession();

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 lg:bg-zinc-100 lg:dark:bg-[#131315] text-gray-900 dark:text-gray-100 overflow-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebar} />
      
      <div className="flex-1 flex flex-col overflow-hidden p-4 lg:p-5">
        <div className="flex gap-5 h-full">
          {/* Chat panel */}
          <motion.div 
            layout 
            className="w-[45%]"
          >
            <Shell 
              className="h-full border-l-4 border-l-primary-100 dark:border-l-primary-900/30"
            >
              <ChatPanel />
            </Shell>
          </motion.div>

          {/* Workspace panel - always visible now */}
          <motion.div 
            layout 
            className="w-[55%]"
          >
            <Shell 
              className="h-full border-r-4 border-r-primary-100 dark:border-r-primary-900/30"
            >
              <WorkspacePanel />
            </Shell>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
