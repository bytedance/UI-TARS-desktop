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
  FiFileText,
  FiBarChart2,
  FiAlertCircle,
  FiWifi,
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
 * Provides:
 * - Session list with create, edit, delete actions
 * - Connection status indicator
 * - Session navigation
 * - Collapsible interface
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

  // Navigation items for the sidebar
  const navigationItems = [
    { icon: <FiHome size={18} />, label: 'Overview', isActive: false },
    { icon: <FiFileText size={18} />, label: 'Editor', isActive: false },
    { icon: <FiBarChart2 size={18} />, label: 'Analytics', isActive: false },
    { icon: <FiSettings size={18} />, label: 'Settings', isActive: false },
  ];

  // Enhanced connection status indicator component
  const ConnectionStatus = () => (
    <div
      className={classNames('flex items-center px-3 py-2 mb-3 rounded-xl text-sm border', {
        'bg-green-50/60 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200/50 dark:border-green-800/30':
          connectionStatus.connected,
        'bg-yellow-50/60 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200/50 dark:border-yellow-800/30':
          connectionStatus.reconnecting,
        'bg-red-50/60 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200/50 dark:border-red-800/30':
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
  );

  return (
    <div
      className={classNames('flex flex-col h-full', {
        'w-64': !isCollapsed,
        'w-14': isCollapsed,
      })}
    >
      {/* Header with logo/title and collapse button */}
      <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/20">
        {!isCollapsed ? (
          <h1 className="text-lg font-display font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 dark:from-blue-500 dark:to-purple-600 flex items-center justify-center text-white font-bold mr-2 text-xs shadow-sm">
              A
            </span>
            Agent TARS
          </h1>
        ) : (
          <div className="w-full flex justify-center">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 dark:from-blue-500 dark:to-purple-600 flex items-center justify-center text-white font-bold shadow-sm"
            >
              A
            </motion.div>
          </div>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleCollapse}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
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
            'flex items-center justify-center gap-2 py-2.5 rounded-[30px] text-white transition-all duration-200 border border-gray-700/30 dark:border-gray-600/30 shadow-sm',
            {
              'w-full px-3': !isCollapsed,
              'w-9 h-9 mx-auto': isCollapsed,
            },
            connectionStatus.connected
              ? 'bg-gray-800 hover:bg-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700'
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
          <ConnectionStatus />
        </div>
      )}

      {/* Modern navigation section (only for collapsed view) */}
      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center pt-6 gap-6">
          {navigationItems.map((item, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-md ${
                item.isActive
                  ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={item.label}
            >
              {item.icon}
            </motion.button>
          ))}
        </div>
      )}

      {/* Chat sessions list */}
      <div
        className={classNames('flex-1 overflow-y-auto sidebar-scrollbar', { 'mt-2': !isCollapsed })}
      >
        {!isCollapsed && (
          <div className="px-3 py-2 flex items-center justify-between">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Recent Chats
            </div>
            <div className="flex items-center gap-1">
              {/* Connection status indicator */}
              <div
                className={`h-2 w-2 rounded-full ${
                  connectionStatus.connected
                    ? 'bg-green-600 animate-pulse'
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
                className={`text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-xs transition-all ${
                  !connectionStatus.connected && 'opacity-50 cursor-not-allowed'
                }`}
                title={connectionStatus.connected ? 'Refresh sessions' : 'Server disconnected'}
              >
                <FiRefreshCw className={isRefreshing ? 'animate-spin' : ''} size={12} />
              </motion.button>
            </div>
          </div>
        )}

        {/* Server disconnected message - simplified but kept for reference */}
        {/* ... existing code ... */}

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
                  <div className="flex items-center p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300/40 dark:border-gray-600/40 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 dark:focus:ring-green-600"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(session.id);
                        if (e.key === 'Escape') setEditingSessionId(null);
                      }}
                    />
                    <button
                      onClick={() => handleSaveEdit(session.id)}
                      className="ml-2 px-2 py-1 text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-800/30 rounded-md text-xs transition-colors"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveSession(session.id)}
                    disabled={!connectionStatus.connected}
                    className={classNames(
                      'text-left text-sm transition-all duration-200 flex items-center p-2 w-full rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60',
                      {
                        'text-green-600 dark:text-green-500': activeSessionId === session.id,
                        'opacity-60 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent':
                          !connectionStatus.connected,
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
                        <FiMessageSquare
                          className={
                            activeSessionId === session.id ? 'text-green-600' : 'text-gray-500'
                          }
                          size={16}
                        />
                      </div>
                    ) : (
                      <>
                        <div
                          className={`mr-3 h-8 w-8 flex-shrink-0 rounded-md flex items-center justify-center border ${
                            activeSessionId === session.id
                              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/30'
                              : 'bg-gray-50 border-gray-200/40 dark:border-gray-600/40'
                          }`}
                        >
                          <FiMessageSquare
                            className={`${
                              activeSessionId === session.id
                                ? 'text-green-600 dark:text-green-500'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                            size={16}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium truncate`}>
                            {session.name || 'Untitled Chat'}
                          </div>
                          <div className="text-xs flex items-center mt-0.5">
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
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                          title="Edit session name"
                        >
                          <FiEdit2 size={12} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
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
                        className="flex items-center bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5 text-[10px] border border-gray-200/30 dark:border-gray-700/30"
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

      {/* Settings button at the bottom */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800/20 mt-auto">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={classNames(
            'flex items-center justify-center gap-2 py-2 text-gray-700 dark:text-gray-300 transition-all duration-200',
            {
              'w-full px-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700/70 rounded-md border border-gray-200/60 dark:border-gray-700/30':
                !isCollapsed,
              'w-10 h-10 mx-auto hover:text-green-600 dark:hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md':
                isCollapsed,
            },
          )}
          title="Settings"
        >
          <FiSettings size={isCollapsed ? 18 : 16} />
          {!isCollapsed && <span className="font-medium">Settings</span>}
        </motion.button>
      </div>
    </div>
  );
};
