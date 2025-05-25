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
 * - Clean, minimalist aesthetic with refined borders and subtle shadows
 * - Neutral color palette with elegant accent colors
 * - Consistent spacing and typography for optimal readability
 * - Seamless visual flow between different interface elements
 */
export const Layout: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useLayout();
  const { connectionStatus } = useSession();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebar} />
      
      <div className="flex-1 flex flex-col overflow-hidden p-5 lg:p-6">
        <div className="flex gap-6 h-full">
          {/* Chat panel */}
          <motion.div 
            layout 
            className="w-[45%]"
          >
            <Shell 
              className="h-full rounded-3xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-100/60 dark:border-gray-700/20 shadow-soft dark:shadow-gray-950/5"
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
              className="h-full rounded-3xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-100/60 dark:border-gray-700/20 shadow-soft dark:shadow-gray-950/5"
            >
              <WorkspacePanel />
            </Shell>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
