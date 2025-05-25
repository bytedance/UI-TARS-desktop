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
 * - Visual hierarchy through subtle shadows and spacing
 */
export const Layout: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useLayout();
  const { connectionStatus } = useSession();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebar} />
      
      <div className="flex-1 flex flex-col overflow-hidden p-4 lg:p-6">
        <div className="flex gap-6 h-full">
          {/* Chat panel */}
          <motion.div 
            layout 
            className="w-[45%]"
          >
            <Shell 
              className="h-full rounded-5xl shadow-soft dark:shadow-gray-950/40 bg-white dark:bg-gray-800/90"
            >
              <ChatPanel />
            </Shell>
          </motion.div>

          {/* Workspace panel */}
          <motion.div 
            layout 
            className="w-[55%]"
          >
            <Shell 
              className="h-full rounded-5xl shadow-soft dark:shadow-gray-950/40 bg-white dark:bg-gray-800/90"
            >
              <WorkspacePanel />
            </Shell>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
