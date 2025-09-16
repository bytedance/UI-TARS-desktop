import React, { useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { Sidebar } from '@/standalone/sidebar';
import { Navbar } from '@/standalone/navbar';
import { ChatPanel } from '@/standalone/chat/ChatPanel';
import { WorkspacePanel } from '@/standalone/workspace/WorkspacePanel';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { layoutModeAtom, initializeLayoutModeAtom } from '@/common/state/atoms/ui';
import { Shell } from './Shell';
import './Layout.css';
import classNames from 'classnames';

interface LayoutProps {
  isReplayMode?: boolean;
}

// Common styles to avoid repetition
const SHELL_STYLES = "h-full rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-gray-950/20";
const PANEL_CONTAINER_STYLES = "flex flex-col overflow-hidden transition-all duration-300 ease-in-out";
const MOBILE_PANEL_STYLES = "flex-1 flex flex-col overflow-hidden min-h-0";

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
  const [layoutMode] = useAtom(layoutModeAtom);
  const initializeLayoutMode = useSetAtom(initializeLayoutModeAtom);

  const isReplayMode = propIsReplayMode !== undefined ? propIsReplayMode : contextIsReplayMode;

  useEffect(() => {
    initializeLayoutMode();
  }, [initializeLayoutMode]);

  // Helper function to get desktop panel styles based on layout mode
  const getDesktopPanelStyles = (isChat: boolean) => {
    const baseStyles = PANEL_CONTAINER_STYLES;
    const sizeStyles = layoutMode === 'narrow-chat' 
      ? (isChat ? 'flex-[1_1_33.333%]' : 'flex-[2_1_66.667%]')
      : 'flex-1';
    return classNames(baseStyles, sizeStyles);
  };

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
          <div className="hidden md:flex gap-3 flex-1 min-h-0">
            <div className={getDesktopPanelStyles(true)}>
              <Shell className={SHELL_STYLES}>
                <ChatPanel />
              </Shell>
            </div>

            <div className={getDesktopPanelStyles(false)}>
              <Shell className={SHELL_STYLES}>
                <WorkspacePanel />
              </Shell>
            </div>
          </div>

          <div className="md:hidden flex flex-col gap-3 flex-1 min-h-0">
            <div className={MOBILE_PANEL_STYLES}>
              <Shell className={SHELL_STYLES}>
                <ChatPanel />
              </Shell>
            </div>

            <div className={MOBILE_PANEL_STYLES}>
              <Shell className={SHELL_STYLES}>
                <WorkspacePanel />
              </Shell>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
