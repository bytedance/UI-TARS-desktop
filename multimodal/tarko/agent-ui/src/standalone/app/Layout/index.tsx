import React, { useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { Sidebar } from '@/standalone/sidebar';
import { Navbar } from '@/standalone/navbar';
import { ChatPanel } from '@/standalone/chat/ChatPanel';
import { WorkspacePanel } from '@/standalone/workspace/WorkspacePanel';
import { useSession } from '@/common/hooks/useSession';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { layoutModeAtom, initializeLayoutModeAtom } from '@/common/state/atoms/ui';
import { Shell } from './Shell';
import './Layout.css';
import classNames from 'classnames';

interface LayoutProps {
  isReplayMode?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ isReplayMode: propIsReplayMode }) => {
  const { isReplayMode: contextIsReplayMode } = useReplayMode();
  const [layoutMode] = useAtom(layoutModeAtom);
  const initializeLayoutMode = useSetAtom(initializeLayoutModeAtom);

  const isReplayMode = propIsReplayMode !== undefined ? propIsReplayMode : contextIsReplayMode;

  useEffect(() => {
    initializeLayoutMode();
  }, [initializeLayoutMode]);

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
            <div
              className={classNames(
                'flex flex-col overflow-hidden transition-all duration-300 ease-in-out',
                {
                  'flex-1': layoutMode === 'default',
                  'flex-[1_1_33.333%]': layoutMode === 'narrow-chat',
                },
              )}
            >
              <Shell className="h-full rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-gray-950/20">
                <ChatPanel />
              </Shell>
            </div>

            <div
              className={classNames(
                'flex flex-col overflow-hidden transition-all duration-300 ease-in-out',
                {
                  'flex-1': layoutMode === 'default',
                  'flex-[2_1_66.667%]': layoutMode === 'narrow-chat',
                },
              )}
            >
              <Shell className="h-full rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-gray-950/20">
                <WorkspacePanel />
              </Shell>
            </div>
          </div>

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
