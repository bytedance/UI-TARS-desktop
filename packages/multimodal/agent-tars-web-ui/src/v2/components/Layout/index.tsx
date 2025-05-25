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
 * Design principles:
 * - Seamless floating panels with larger corner radius for contemporary feel
 * - Subtle transparency and backdrop blur for depth without heaviness
 * - Consistent spacing and minimal borders for a clean, modern look
 * - Background that blends with foreground elements rather than contrasting
 */
export const Layout: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useLayout();
  const { connectionStatus } = useSession();

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-gray-50/80 to-primary-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950/30 text-gray-900 dark:text-gray-100 overflow-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebar} />
      
      <div className="flex-1 flex flex-col overflow-hidden p-5 lg:p-7">
        <div className="flex gap-7 h-full">
          {/* Chat panel */}
          <motion.div 
            layout 
            className="w-[45%]"
          >
            <Shell 
              className="h-full rounded-4xl bg-white/80 dark:bg-gray-800/60 backdrop-blur-md shadow-soft dark:shadow-gray-950/10"
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
              className="h-full rounded-4xl bg-white/80 dark:bg-gray-800/60 backdrop-blur-md shadow-soft dark:shadow-gray-950/10"
            >
              <WorkspacePanel />
            </Shell>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
