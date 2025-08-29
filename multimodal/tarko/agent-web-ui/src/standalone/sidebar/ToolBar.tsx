import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';

import { FiPlus, FiHome, FiSettings } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/common/hooks/useSession';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { isLayoutSwitchButtonEnabled } from '@/config/web-ui-config';
import { AgentConfigViewer } from './AgentConfigViewer';
import { LayoutSwitchButton } from './LayoutSwitchButton';

/**
 * ToolBar Component - Vertical toolbar inspired by modern IDE designs
 *
 * Design principles:
 * - Minimalist vertical bar with icon-only actions
 * - Consistent visual language with subtle animations
 * - Quick access to essential functionality
 * - Always visible regardless of sidebar collapse state
 */
export const ToolBar: React.FC = () => {
  const navigate = useNavigate();
  const { isReplayMode } = useReplayMode();
  const { createSession, connectionStatus } = useSession();
  const [isConfigViewerOpen, setIsConfigViewerOpen] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const enableLayoutSwitchButton = isLayoutSwitchButtonEnabled();

  // Create new session
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

  // Navigate to home
  const handleNavigateHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <>
      <div className="w-14 h-full flex flex-col backdrop-blur-sm">
        {/* Top tool buttons */}
        <div className="flex-1 flex flex-col items-center gap-4">
          {/* New session button */}
          {!isReplayMode && (
            <motion.button
              whileHover={{
                scale: 1.08,
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={handleNewSession}
              disabled={!connectionStatus.connected || isCreatingSession}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
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
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
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
                </motion.div>
              ) : (
                <FiPlus size={16} />
              )}
            </motion.button>
          )}

          {/* Home button */}
          {!isReplayMode && (
            <motion.button
              whileHover={{
                scale: 1.08,
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={handleNavigateHome}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 text-black dark:text-white hover:shadow-md"
              title="Home"
            >
              <FiHome size={16} />
            </motion.button>
          )}
        </div>

        {/* Bottom tool buttons */}
        <div className="flex flex-col items-center gap-4 pb-4">
          {/* Layout switch button */}
          {!isReplayMode && enableLayoutSwitchButton && <LayoutSwitchButton />}
          
          {/* Agent config button */}
          {!isReplayMode && (
            <motion.button
              whileHover={{
                scale: 1.08,
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={() => setIsConfigViewerOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 text-black dark:text-white hover:shadow-md"
              title="Agent Configuration"
            >
              <FiSettings size={16} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Agent Config Viewer Modal */}
      <AgentConfigViewer isOpen={isConfigViewerOpen} onClose={() => setIsConfigViewerOpen(false)} />
    </>
  );
};
