import React from 'react';
import { Sidebar } from '../Sidebar';
import { ChatPanel } from '../Chat/ChatPanel';
import { WorkspacePanel } from '../Workspace/WorkspacePanel';
import { useLayout } from '../../hooks/useLayout';
import { motion } from 'framer-motion';
import { Shell } from '../Common/Shell';

/**
 * Layout Component - Main application layout
 *
 * Provides:
 * - Responsive layout with sidebar and content areas
 * - Collapsible sidebar
 * - Split view with chat panel and workspace panel
 */
export const Layout: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useLayout();

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 lg:bg-zinc-100 lg:dark:bg-[#131315] text-gray-900 dark:text-gray-100 overflow-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="flex gap-4 h-full">
          <motion.div layout className="w-[40%] transition-all duration-300">
            <Shell>
              <ChatPanel />
            </Shell>
          </motion.div>

          <motion.div layout className="w-[60%] transition-all duration-300">
            <Shell>
              <WorkspacePanel />
            </Shell>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
