import React from 'react';
import { Sidebar } from '@/standalone/sidebar';
import { Navbar } from '@/standalone/navbar';
import { ChatPanel } from '@/standalone/chat/ChatPanel';
import { WorkspacePanel } from '@/standalone/workspace/WorkspacePanel';
import { useSession } from '@/common/hooks/useSession';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { motion } from 'framer-motion';
import { Shell } from './Shell';
import './Layout.css';

interface LayoutProps {
  isReplayMode?: boolean;
}

/**
 * Layout Component - Main application layout
 *
 * Design principles:
 * - Clean, minimalist aesthetic with refined borders and subtle shadows
 * - Neutral color palette with elegant accent colors
 * - Consistent spacing and typography for optimal readability
 * - Seamless visual flow between different interface elements
 * - Adapts layout based on replay mode status
 */
export const Layout: React.FC<LayoutProps> = ({ isReplayMode: propIsReplayMode }) => {
  const { connectionStatus } = useSession();

  // Use the context hook to get global replay mode status
  const contextIsReplayMode = useReplayMode();

  // Prioritize props for backward compatibility, but fall back to context
  const isReplayMode = propIsReplayMode !== undefined ? propIsReplayMode : contextIsReplayMode;

  return (
    <div className="flex flex-col h-screen bg-[#F2F3F5] dark:bg-white/5 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Global navbar at the top */}
      <Navbar />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with ToolBar and ChatSession - only show when not in replay mode */}
        {!isReplayMode && <Sidebar />}

        {/* Content area - using flex-col to properly distribute vertical space */}
        <div className="flex-1 flex flex-col overflow-hidden pr-2 pb-2 lg:pr-3 lg:pb-3">
          {/* Panels container - apply flex-1 to take remaining vertical space */}
          <div className="flex gap-3 flex-1 min-h-0">
            {/* Chat panel - adjust width based on replay mode */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Shell className="h-full rounded-xl bg-white dark:bg-gray-800/95 backdrop-blur-sm bg-[#FFFFFFE5] dark:shadow-gray-950/5">
                <ChatPanel />
              </Shell>
            </div>

            {/* Workspace panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Shell className="h-full rounded-xl bg-white dark:bg-gray-800/95 backdrop-blur-sm bg-[#FFFFFFE5] dark:shadow-gray-950/5">
                <WorkspacePanel />
              </Shell>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
