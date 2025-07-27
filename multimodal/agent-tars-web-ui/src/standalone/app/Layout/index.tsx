import React from 'react';
import { Sidebar } from '@/standalone/sidebar';
import { Navbar } from '@/standalone/navbar';
import { ChatPanel } from '@/standalone/chat/ChatPanel';
import { WorkspacePanel } from '@/standalone/workspace/WorkspacePanel';
import { useSession } from '@/common/hooks/useSession';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { Shell } from './Shell';
import './Layout.css';
import classNames from 'classnames';

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
 * - Responsive design: horizontal layout on desktop, vertical on mobile
 */
export const Layout: React.FC<LayoutProps> = ({ isReplayMode: propIsReplayMode }) => {
  const { isReplayMode: contextIsReplayMode } = useReplayMode();

  const isReplayMode = propIsReplayMode !== undefined ? propIsReplayMode : contextIsReplayMode;

  return (
    <div className="flex flex-col h-screen bg-[#F2F3F5] dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {!isReplayMode && <Sidebar />}

        <div
          className={classNames('flex-1 flex flex-col overflow-hidden pr-2 pb-2 lg:pr-3 lg:pb-3', {
            'ml-3': isReplayMode,
          })}
        >
          {/* Desktop layout: horizontal split */}
          <div className="hidden md:flex gap-3 flex-1 min-h-0">
            <div className="flex-1 flex flex-col overflow-hidden">
              <Shell className="h-full rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-gray-950/20">
                <ChatPanel />
              </Shell>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <Shell className="h-full rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-gray-950/20">
                <WorkspacePanel />
              </Shell>
            </div>
          </div>

          {/* Mobile layout: vertical split */}
          <div className="md:hidden flex flex-col gap-3 flex-1 min-h-0">
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <Shell className="h-full rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-gray-950/20">
                <ChatPanel />
              </Shell>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <Shell className="h-full rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-gray-950/20">
                <WorkspacePanel />
              </Shell>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
