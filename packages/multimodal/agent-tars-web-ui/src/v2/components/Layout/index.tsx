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
 * Key design features:
 * - Fluid layout with seamless transitions
 * - Subtle background gradient for visual depth
 * - Elegant spacing and shadows for clear section separation
 * - Improved visual hierarchy with smooth rounded corners
 */
export const Layout: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useLayout();
  const { connectionStatus } = useSession();

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100/70 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebar} />
      
      <div className="flex-1 flex flex-col overflow-hidden p-4 lg:p-6">
        <div className="flex gap-6 h-full">
          {/* Chat panel */}
          <motion.div 
            layout 
            className="w-[45%]"
          >
            <Shell 
              className="h-full rounded-3xl bg-white/95 dark:bg-gray-800/90 backdrop-blur-md shadow-soft dark:shadow-gray-950/20 border border-white/40 dark:border-gray-700/10"
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
              className="h-full rounded-3xl bg-white/95 dark:bg-gray-800/90 backdrop-blur-md shadow-soft dark:shadow-gray-950/20 border border-white/40 dark:border-gray-700/10"
            >
              <WorkspacePanel />
            </Shell>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
