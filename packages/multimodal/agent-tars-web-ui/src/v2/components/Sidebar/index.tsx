import React, { useState } from 'react';
import { useSession } from '../../hooks/useSession';
import {
  FiPlus,
  FiMessageSquare,
  FiSettings,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiTag,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiHome,
  FiMoon,
  FiSun,
  FiGrid,
  FiLoader,
  FiWifiOff,
} from 'react-icons/fi';
import classNames from 'classnames';
import { motion, AnimatePresence } from 'framer-motion';
import { formatRelativeDate, formatTimestamp } from '../../utils/formatters';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * Sidebar Component - Application sidebar with session management
 * 
 * Design features:
 * - Seamless integration with background (no borders)
 * - Elegant gradients and glassmorphism effects
 * - Animated interaction states
 * - Clear visual hierarchy with vibrant accents
 */
export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const {
    sessions,
    activeSessionId,
    setActiveSession,
    createSession,
    updateSessionMetadata,
    deleteSession,
    loadSessions,
    connectionStatus,
    checkServerStatus,
  } = useSession();

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  const handleNewSession = async () => {
    try {
      await createNewSession();
    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  };

  const createNewSession = async () => {
    const sessionId = await createSession();
    await setActiveSession(sessionId);
    return sessionId;
  };

  const handleEditSession = (sessionId: string, currentName?: string) => {
    setEditingSessionId(sessionId);
    setEditedName(currentName || '');
  };

  const handleSaveEdit = async (sessionId: string) => {
    try {
      await updateSessionMetadata({ sessionId, updates: { name: editedName } });
      setEditingSessionId(null);
    } catch (error) {
      console.error('Failed to update session name:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent clicking session

    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        await deleteSession(sessionId);
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  };

  const refreshSessions = async () => {
    setIsRefreshing(true);
    try {
      // Check server status before attempting to refresh sessions
      const isConnected = await checkServerStatus();
      if (isConnected) {
        await loadSessions();
      }
    } catch (error) {
      console.error('Failed to refresh sessions:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
  };

  const handleSessionClick = async (sessionId: string) => {
    if (loadingSessionId || !connectionStatus.connected) return;

    try {
      setLoadingSessionId(sessionId);
      await setActiveSession(sessionId);
    } catch (error) {
      console.error('Failed to switch session:', error);
      // If switching fails, immediately show alert
      checkServerStatus();
    } finally {
      setLoadingSessionId(null);
    }
  };

  return (
    <div
      className={classNames(
        'flex flex-col h-full transition-all duration-300 backdrop-blur-sm bg-white/30 dark:bg-gray-900/30',
        {
          'w-64': !isCollapsed,
          'w-14': isCollapsed,
        },
      )}
    >
      {/* Header with logo/title and collapse button */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="text-lg font-display font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold mr-2 text-sm shadow-sm">
              A
            </div>
            <span>Agent TARS</span>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold shadow-sm"
            >
              A
            </motion.div>
          </div>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleCollapse}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 hover:bg-gray-100/60 dark:hover:bg-gray-800/40 rounded-lg transition-colors"
        >
          {isCollapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
        </motion.button>
      </div>

      {/* New chat button */}
      <div className="p-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNewSession}
          disabled={!connectionStatus.connected}
          className={classNames(
            'flex items-center justify-center gap-2 py-2.5 rounded-2xl text-white transition-all duration-200 shadow-soft',
            {
              'w-full px-3': !isCollapsed,
              'w-9 h-9 mx-auto': isCollapsed,
            },
            connectionStatus.connected
              ? 'bg-gradient-to-r from-primary-500 to-accent-500 hover:opacity-90'
              : 'bg-gray-400 cursor-not-allowed opacity-60',
          )}
          title={connectionStatus.connected ? 'New Chat' : 'Server disconnected'}
        >
          <FiPlus className="text-white" size={isCollapsed ? 16 : 18} />
          {!isCollapsed && <span className="font-medium">New Chat</span>}
        </motion.button>
      </div>

      {/* Connection status indicator (only when not collapsed) */}
      {!isCollapsed && !connectionStatus.connected && (
        <div className="px-3 mb-2">
          <div
            className={classNames('flex items-center px-3 py-2 mb-3 rounded-xl text-sm', {
              'bg-green-50/60 dark:bg-green-900/20 text-green-700 dark:text-green-400':
                connectionStatus.connected,
              'bg-yellow-50/60 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400':
                connectionStatus.reconnecting,
              'bg-red-50/60 dark:bg-red-900/20 text-red-700 dark:text-red-400':
                !connectionStatus.connected && !connectionStatus.reconnecting,
            })}
          >
            {connectionStatus.connected ? (
              <FiWifi className="mr-2 flex-shrink-0" />
            ) : connectionStatus.reconnecting ? (
              <FiRefreshCw className="mr-2 flex-shrink-0 animate-spin" />
            ) : (
              <FiWifiOff className="mr-2 flex-shrink-0" />
            )}
            <span className="font-medium">
              {connectionStatus.connected
                ? 'Connected'
                : connectionStatus.reconnecting
                  ? 'Reconnecting...'
                  : 'Disconnected'}
            </span>

            {!connectionStatus.connected && !connectionStatus.reconnecting && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => checkServerStatus()}
                className="ml-auto text-xs px-2 py-1 bg-red-100/80 dark:bg-red-800/30 hover:bg-red-200 dark:hover:bg-red-700/40 rounded-md transition-colors"
              >
                Retry
              </motion.button>
            )}
          </div>
        </div>
      )}

      {/* Navigation section for all views */}
      <div className={classNames('px-3 py-2', { hidden: !isCollapsed })}>
        <div className="flex flex-col items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-xl text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20"
            title="Home"
          >
            <FiHome size={20} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60"
            title="Explore"
          >
            <FiGrid size={20} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60"
            title="Settings"
          >
            <FiSettings size={20} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60"
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {isDarkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
          </motion.button>
        </div>
      </div>

      {/* Chat sessions list */}
      <div
        className={classNames('flex-1 overflow-y-auto sidebar-scrollbar', { 'mt-2': !isCollapsed })}
      >
        {!isCollapsed && (
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Recent Chats
            </div>
            <div className="flex items-center gap-1">
              {/* Connection status indicator */}
              <div
                className={`h-2 w-2 rounded-full ${
                  connectionStatus.connected
                    ? 'bg-green-500 animate-pulse'
                    : connectionStatus.reconnecting
                      ? 'bg-yellow-500 animate-ping'
                      : 'bg-red-500'
                }`}
                title={
                  connectionStatus.connected
                    ? 'Connected to server'
                    : connectionStatus.reconnecting
                      ? 'Reconnecting...'
                      : 'Disconnected from server'
                }
              />
              <motion.button
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
                onClick={refreshSessions}
                disabled={isRefreshing || !connectionStatus.connected}
                className={`text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800/70 text-xs transition-all ${
                  !connectionStatus.connected && 'opacity-50 cursor-not-allowed'
                }`}
                title={connectionStatus.connected ? 'Refresh sessions' : 'Server disconnected'}
              >
                <FiRefreshCw className={isRefreshing ? 'animate-spin' : ''} size={12} />
              </motion.button>
            </div>
          </div>
        )}

        {!isCollapsed && !connectionStatus.connected && sessions.length > 0 && (
          <div className="px-3 py-2 mb-1">
            <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-50/90 to-yellow-50/40 dark:from-yellow-900/20 dark:to-yellow-900/5 text-yellow-700 dark:text-yellow-400 text-sm">
              <div className="flex items-center">
                <FiWifiOff className="mr-2 flex-shrink-0" />
                <div className="font-medium">Offline Mode</div>
              </div>
              <p className="mt-1 text-xs">
                You can view chats but can't send messages until reconnected.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => checkServerStatus()}
                className="w-full mt-2 py-1.5 px-3 bg-yellow-100/80 dark:bg-yellow-800/30 hover:bg-yellow-200 dark:hover:bg-yellow-700/30 rounded-lg text-xs font-medium transition-colors flex items-center justify-center"
              >
                <FiRefreshCw
                  className={`mr-1.5 ${connectionStatus.reconnecting ? 'animate-spin' : ''}`}
                  size={12}
                />
                {connectionStatus.reconnecting ? 'Reconnecting...' : 'Reconnect to Server'}
              </motion.button>
            </div>
          </div>
        )}

        <AnimatePresence>
          <div className={classNames('space-y-1', { 'px-3': !isCollapsed, 'px-2': isCollapsed })}>
            {sessions.map((session) => (
              <motion.div
                key={session.id}
                className="relative group"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                {editingSessionId === session.id && !isCollapsed ? (
                  <div className="flex items-center p-2 bg-gray-100/60 dark:bg-gray-800/60 rounded-xl backdrop-blur-sm">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm bg-white/90 dark:bg-gray-700/90 border-0 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-400"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(session.id);
                        if (e.key === 'Escape') setEditingSessionId(null);
                      }}
                    />
                    <button
                      onClick={() => handleSaveEdit(session.id)}
                      className="ml-2 px-2 py-1 text-primary-600 dark:text-primary-400 bg-primary-50/80 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-800/30 rounded-lg text-xs transition-colors"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSessionClick(session.id)}
                    disabled={!connectionStatus.connected || loadingSessionId !== null}
                    className={classNames(
                      'text-left text-sm transition-all duration-200 flex items-center p-2 w-full rounded-xl',
                      {
                        'bg-gradient-to-r from-primary-50/80 to-primary-100/30 dark:from-primary-900/30 dark:to-primary-900/10 text-primary-700 dark:text-primary-400':
                          activeSessionId === session.id,
                        'hover:bg-gray-50/80 dark:hover:bg-gray-800/40 backdrop-blur-sm':
                          activeSessionId !== session.id,
                        'opacity-60 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent':
                          !connectionStatus.connected ||
                          (loadingSessionId !== null && loadingSessionId !== session.id),
                      },
                    )}
                    title={
                      !connectionStatus.connected
                        ? 'Cannot access session: Server disconnected'
                        : isCollapsed
                          ? session.name || new Date(session.createdAt).toLocaleString()
                          : undefined
                    }
                  >
                    {isCollapsed ? (
                      <div className="w-8 h-8 flex items-center justify-center mx-auto">
                        {loadingSessionId === session.id ? (
                          <FiLoader className="animate-spin text-gray-500" size={16} />
                        ) : (
                          <FiMessageSquare
                            className={
                              activeSessionId === session.id ? 'text-primary-600' : 'text-gray-500'
                            }
                            size={16}
                          />
                        )}
                      </div>
                    ) : (
                      <>
                        <div
                          className={`mr-3 h-9 w-9 flex-shrink-0 rounded-xl flex items-center justify-center ${
                            activeSessionId === session.id
                              ? 'bg-gradient-to-tr from-primary-500/10 to-primary-400/20 dark:from-primary-600/20 dark:to-primary-400/10 text-primary-600 dark:text-primary-400'
                              : 'bg-gray-100/70 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400'
                          }`}
                        >
                          {loadingSessionId === session.id ? (
                            <FiLoader className="animate-spin" size={16} />
                          ) : (
                            <FiMessageSquare size={16} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {session.name || 'Untitled Chat'}
                          </div>
                          <div className="text-xs flex items-center mt-0.5 text-gray-500 dark:text-gray-400">
                            <FiClock className="mr-1" size={10} />
                            {formatTimestamp(session.updatedAt || session.createdAt)}
                          </div>
                        </div>
                      </>
                    )}

                    {!isCollapsed && (
                      <div className="hidden group-hover:flex absolute right-2 gap-1">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSession(session.id, session.name);
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100/70 dark:hover:bg-gray-700/50 transition-all"
                          title="Edit session name"
                        >
                          <FiEdit2 size={12} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100/70 dark:hover:bg-gray-700/50 transition-all"
                          title="Delete session"
                        >
                          <FiTrash2 size={12} />
                        </motion.button>
                      </div>
                    )}
                  </motion.button>
                )}

                {!isCollapsed && session.tags && session.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-4 my-1 pb-2">
                    {session.tags.map((tag, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ y: -2 }}
                        className="flex items-center bg-gray-50/70 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5 text-[10px]"
                      >
                        <FiTag size={8} className="mr-1" />
                        {tag}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>

      {/* Settings and theme toggle */}
      <div className="p-3 mt-auto">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 py-2 px-3 text-gray-700 dark:text-gray-300 transition-all duration-200 bg-gray-50/80 hover:bg-gray-100/80 dark:bg-gray-800/60 dark:hover:bg-gray-700/50 rounded-xl backdrop-blur-sm"
              title="Settings"
            >
              <FiSettings size={16} />
              <span className="font-medium">Settings</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={toggleDarkMode}
              className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-200 backdrop-blur-sm"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 mx-auto flex items-center justify-center hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 rounded-xl backdrop-blur-sm"
            title="Settings"
          >
            <FiSettings size={18} />
          </motion.button>
        )}
      </div>
    </div>
  );
};
