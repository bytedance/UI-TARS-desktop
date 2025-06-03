import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiHome, FiCpu, FiMonitor } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../hooks/useSession';
import { useReplayMode } from '../../context/ReplayModeContext';

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
    <div className="w-14 h-full flex flex-col backdrop-blur-sm border-r border-gray-300/40 dark:border-gray-600/20">
      {/* Logo */}
      <motion.img
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        src="https://lf3-static.bytednsdoc.com/obj/eden-cn/psvhouloj/agent-tars/icon.png"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white dark:text-gray-900 font-bold mx-auto mt-4 mb-6 cursor-pointer"
        onClick={handleNavigateHome}
      ></motion.img>

      {/* Tool buttons */}
      <div className="flex-1 flex flex-col items-center gap-4 py-4">
        {/* New session button */}
        {!isReplayMode && (
          <motion.button
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNewSession}
            disabled={!connectionStatus.connected}
            className={`w-8 h-8 rounded-3xl flex items-center justify-center transition-all duration-200 ${
              connectionStatus.connected
                ? 'bg-gradient-to-r from-[#141414] to-[#1e1e1e] dark:from-gray-900 dark:to-gray-800 text-white hover:shadow-md'
                : 'bg-gray-400 text-white cursor-not-allowed opacity-60'
            }`}
            title={connectionStatus.connected ? 'New Task' : 'Server disconnected'}
          >
            <FiPlus size={20} />
          </motion.button>
        )}

        {/* Home button */}
        {!isReplayMode && (
          <motion.button
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNavigateHome}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200"
            title="Home"
          >
            <FiHome size={20} />
          </motion.button>
        )}

        {/* Workspace button */}
        <motion.button
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200"
          title="Workspace"
        >
          <FiMonitor size={20} />
        </motion.button>
      </div>
    </div>
  );
};
