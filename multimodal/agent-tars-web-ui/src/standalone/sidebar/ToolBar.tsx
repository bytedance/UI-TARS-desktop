import React, { useCallback } from 'react';
import { motion } from 'framer-motion';

import { FiPlus, FiHome } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/common/hooks/useSession';
import { useReplayMode } from '@/common/hooks/useReplayMode';

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
  const isReplayMode = useReplayMode();
  const { createSession, connectionStatus } = useSession();

  // Create new session
  const handleNewSession = useCallback(async () => {
    try {
      const sessionId = await createSession();
      navigate(`/${sessionId}`);
    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  }, [createSession, navigate]);

  // Navigate to home
  const handleNavigateHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <div className="w-14 h-full flex flex-col backdrop-blur-sm">
      {/* Tool buttons */}
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
            disabled={!connectionStatus.connected}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              connectionStatus.connected
                ? 'bg-white dark:bg-gray-800 text-dark dark:text-white hover:shadow-md'
                : 'bg-gray-400 text-white cursor-not-allowed opacity-60'
            }`}
            title={connectionStatus.connected ? 'New Task' : 'Server disconnected'}
          >
            <FiPlus size={16} />
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
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 text-dark hover:shadow-md"
            title="Home"
          >
            <FiHome size={16} />
          </motion.button>
        )}
      </div>
    </div>
  );
};
