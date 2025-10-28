import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';

import { FiPlus, FiHome, FiSettings, FiActivity } from 'react-icons/fi';
import { GoSidebarCollapse, GoSidebarExpand } from 'react-icons/go';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '@/common/hooks/useSession';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useLayout } from '@/common/hooks/useLayout';
import {
  isLayoutSwitchButtonEnabled,
  getLogoUrl,
  getAgentTitle,
  isEventStreamViewerEnabled,
} from '@/config/web-ui-config';
import { AgentConfigViewer } from './AgentConfigViewer';
import { LayoutSwitchButton } from './LayoutSwitchButton';
import { useAtom } from 'jotai';
import { eventStreamModalOpenAtom } from '@/common/state/atoms/eventStreamModal';

export const ToolBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isReplayMode } = useReplayMode();
  const { createSession, connectionStatus } = useSession();
  const { isSidebarCollapsed, toggleSidebar } = useLayout();
  const [isConfigViewerOpen, setIsConfigViewerOpen] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isEventStreamModalOpen, setIsEventStreamModalOpen] = useAtom(eventStreamModalOpenAtom);

  const enableLayoutSwitchButton = isLayoutSwitchButtonEnabled();
  const isHomePage = location.pathname === '/';
  const enableEventStreamViewer = isEventStreamViewerEnabled();

  const handleNewSession = useCallback(async () => {
    if (isCreatingSession || !connectionStatus.connected) return;

    setIsCreatingSession(true);
    try {
      const sessionId = await createSession();
      navigate(`/${sessionId}`);
    } catch (error) {
      console.error('Failed to create new session:', error);
    } finally {
      setIsCreatingSession(false);
    }
  }, [createSession, navigate, isCreatingSession, connectionStatus.connected]);

  const handleNavigateHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Toggle event stream modal
  const handleToggleEventStream = useCallback(() => {
    setIsEventStreamModalOpen(!isEventStreamModalOpen);
  }, [isEventStreamModalOpen, setIsEventStreamModalOpen]);

  return (
    <>
      <div className="w-12 h-full flex flex-col backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 pt-3">
          <button onClick={handleNavigateHome} title="Back to Home">
            <img
              src={getLogoUrl()}
              alt={getAgentTitle()}
              className="w-6 h-6 rounded-lg hover:scale-105 transition-transform"
            />
          </button>

          {/* Sidebar toggle button */}
          {!isReplayMode && (
            <button
              onClick={toggleSidebar}
              className="w-6 h-6 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 text-black dark:text-white hover:shadow-md transition-all hover:scale-105 active:scale-95"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <GoSidebarCollapse size={12} /> : <GoSidebarExpand size={12} />}
            </button>
          )}

          {!isReplayMode && (
            <button
              onClick={handleNewSession}
              disabled={!connectionStatus.connected || isCreatingSession}
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 ${
                connectionStatus.connected && !isCreatingSession
                  ? 'bg-white dark:bg-gray-800 text-black dark:text-white hover:shadow-md'
                  : isCreatingSession
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    : 'bg-gray-400 text-white cursor-not-allowed opacity-60'
              }`}
              title={
                isCreatingSession
                  ? 'Creating new task...'
                  : connectionStatus.connected
                    ? 'New Task'
                    : 'Server disconnected'
              }
            >
              {isCreatingSession ? (
                <div className="animate-spin">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              ) : (
                <FiPlus size={12} />
              )}
            </button>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex flex-col items-center gap-4 pb-4">
          {/* Event stream viewer button */}
          {!isReplayMode && enableEventStreamViewer && !isHomePage && (
            <motion.button
              whileHover={{
                scale: 1.08,
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={handleToggleEventStream}
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 ${
                isEventStreamModalOpen
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-black dark:text-white hover:shadow-md'
              }`}
              title="Event Stream Viewer"
            >
              <FiActivity size={12} />
            </motion.button>
          )}

          {/* Layout switch button */}
          {!isReplayMode && enableLayoutSwitchButton && !isHomePage && <LayoutSwitchButton />}

          {/* Agent config button */}
          {!isReplayMode && (
            <button
              onClick={() => setIsConfigViewerOpen(true)}
              className="w-6 h-6 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 text-black dark:text-white hover:shadow-md transition-all hover:scale-105 active:scale-95"
              title="Agent Configuration"
            >
              <FiSettings size={12} />
            </button>
          )}
        </div>
      </div>

      <AgentConfigViewer isOpen={isConfigViewerOpen} onClose={() => setIsConfigViewerOpen(false)} />
    </>
  );
};
