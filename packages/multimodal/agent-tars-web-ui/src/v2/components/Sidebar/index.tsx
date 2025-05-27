import React, { useState, useMemo } from 'react';
import { useSession } from '../../hooks/useSession';
import { useNavigate } from 'react-router-dom';
import {
  FiPlus,
  FiMessageSquare,
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
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import classNames from 'classnames';
import { motion, AnimatePresence } from 'framer-motion';
import { formatRelativeDate, formatTimestamp } from '../../utils/formatters';
import './Sidebar.css';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * Session grouped by time period
 */

interface SessionGroup {
  label: string;
  sessions: typeof sessions;
  key: string;
}

/**
 * Sidebar Component - Application sidebar with session management
 *
 * Design principles:
 * - Elegant transparent background that blends with app background
 * - Subtle borders and refined spacing for visual organization
 * - Minimal visual weight with emphasis on content
 * - Smooth animations for state transitions and hover effects
 * - Time-based session categorization for better organization
 * - Collapsible sections to reduce visual clutter
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
  
  const navigate = useNavigate();

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  // Track collapsed state for each section

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Toggle section collapse state
  const toggleSectionCollapse = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Group sessions by time period
  const groupedSessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Initialize groups
    const groups: SessionGroup[] = [
      { label: 'Today', sessions: [], key: 'today' },
      { label: 'Yesterday', sessions: [], key: 'yesterday' },
      { label: 'This Week', sessions: [], key: 'thisWeek' },
      { label: 'Earlier', sessions: [], key: 'earlier' },
    ];

    // Categorize sessions
    sessions.forEach((session) => {
      const sessionDate = new Date(session.updatedAt || session.createdAt);

      if (sessionDate >= today) {
        groups[0].sessions.push(session);
      } else if (sessionDate >= yesterday) {
        groups[1].sessions.push(session);
      } else if (sessionDate >= lastWeek) {
        groups[2].sessions.push(session);
      } else {
        groups[3].sessions.push(session);
      }
    });

    // Only return non-empty groups
    return groups.filter((group) => group.sessions.length > 0);
  }, [sessions]);

  const handleNewSession = async () => {
    try {
      const sessionId = await createNewSession();
      navigate(`/${sessionId}`);
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
      
      // 导航到新路由，让路由组件处理会话加载
      navigate(`/${sessionId}`);
    } catch (error) {
      console.error('Failed to switch session:', error);
      checkServerStatus();
    } finally {
      setLoadingSessionId(null);
    }
  };

  return (
    <div
      className={classNames('flex flex-col h-full transition-all duration-300 bg-transparent', {
        'w-64': !isCollapsed,
        'w-16': isCollapsed,
      })}
    >
      {/* Header with logo/title and collapse button */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="text-lg font-display font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <div className="w-8 h-8 rounded-2xl bg-gray-900 dark:bg-gray-100 flex items-center justify-center text-white dark:text-gray-900 font-bold mr-2 text-sm">
              A
            </div>
            <span>Agent TARS</span>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 rounded-2xl bg-gray-900 dark:bg-gray-100 flex items-center justify-center text-white dark:text-gray-900 font-bold"
            >
              A
            </motion.div>
          </div>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleCollapse}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100/40 dark:hover:bg-gray-800/40 rounded-full transition-colors"
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
            'flex items-center justify-center gap-2 py-2.5 rounded-3xl text-white transition-all duration-200 border',
            {
              'w-full px-3': !isCollapsed,
              'w-10 h-10 mx-auto': isCollapsed,
            },
            connectionStatus.connected
              ? 'bg-gradient-to-r from-[#141414] to-[#1e1e1e] dark:from-gray-900 dark:to-gray-800 border-gray-200/10 dark:border-gray-700/20 hover:bg-gray-800 dark:hover:bg-gray-700'
              : 'bg-gray-400 border-gray-300/20 dark:border-gray-700/10 cursor-not-allowed opacity-60',
          )}
          title={connectionStatus.connected ? 'New Task' : 'Server disconnected'}
        >
          <FiPlus className="text-white" size={isCollapsed ? 16 : 18} />
          {!isCollapsed && <span className="font-medium">New Task</span>}
        </motion.button>
      </div>

      {/* Connection status indicator (only when not collapsed) */}
      {!isCollapsed && !connectionStatus.connected && (
        <div className="px-3 mb-2">
          <div
            className={classNames('flex items-center px-3 py-2 mb-3 rounded-3xl text-sm border-2', {
              'bg-green-50/50 dark:bg-green-900/10 text-green-700 dark:text-green-400 border-green-200/40 dark:border-green-700/20':
                connectionStatus.connected,
              'bg-yellow-50/50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400 border-yellow-200/40 dark:border-yellow-700/20':
                connectionStatus.reconnecting,
              'bg-red-50/50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border-red-200/40 dark:border-red-700/20':
                !connectionStatus.connected && !connectionStatus.reconnecting,
            })}
          >
            {connectionStatus.connected ? (
              <FiWifiOff className="mr-2 flex-shrink-0" />
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
                className="ml-auto text-xs px-2 py-1 bg-red-100/70 dark:bg-red-800/30 hover:bg-red-200/70 dark:hover:bg-red-700/40 rounded-3xl transition-colors font-medium text-red-700 dark:text-red-300"
              >
                Retry
              </motion.button>
            )}
          </div>
        </div>
      )}

      {/* Chat sessions list */}
      <div
        className={classNames('flex-1 overflow-y-auto sidebar-scrollbar', { 'mt-2': !isCollapsed })}
      >
        {!isCollapsed && (
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Recent Tasks
            </div>
            <div className="flex items-center gap-1">
              {/* Connection status indicator */}
              <div
                className={`h-2 w-2 rounded-full ${
                  connectionStatus.connected
                    ? 'bg-green-500 animate-pulse'
                    : connectionStatus.reconnecting
                      ? 'bg-yellow-500 animate-ping'
                      : 'bg-gray-400'
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
                className={`text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100/40 dark:hover:bg-gray-800/40 text-xs transition-all ${
                  !connectionStatus.connected && 'opacity-50 cursor-not-allowed'
                }`}
                title={connectionStatus.connected ? 'Refresh tasks' : 'Server disconnected'}
              >
                <FiRefreshCw className={isRefreshing ? 'animate-spin' : ''} size={12} />
              </motion.button>
            </div>
          </div>
        )}

        {!isCollapsed && !connectionStatus.connected && sessions.length > 0 && (
          <div className="px-3 py-2 mb-1">
            <div className="p-3 rounded-3xl bg-red-50/30 dark:bg-red-900/15 text-gray-700 dark:text-gray-300 text-sm border border-red-200/50 dark:border-red-800/30 shadow-sm">
              <div className="flex items-center">
                <FiWifiOff className="mr-2 flex-shrink-0 text-red-500 dark:text-red-400" />
                <div className="font-medium text-red-700 dark:text-red-400">Offline Mode</div>
              </div>
              <p className="mt-1 text-xs">
                You can view tasks but can't create new ones until reconnected.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => checkServerStatus()}
                className="w-full mt-2 py-1.5 px-3 bg-red-100/70 dark:bg-red-800/30 hover:bg-red-200/70 dark:hover:bg-red-700/40 rounded-xl text-xs font-medium transition-colors flex items-center justify-center border border-red-200/30 dark:border-red-700/30 text-red-700 dark:text-red-300"
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
          {/* 折叠模式下仍然平铺所有会话 */}
          {isCollapsed ? (
            <div className="px-2 space-y-1">
              {sessions.map((session) => (
                <motion.div
                  key={session.id}
                  className="relative group"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSessionClick(session.id)}
                    disabled={!connectionStatus.connected || loadingSessionId !== null}
                    className={classNames(
                      'text-left text-sm transition-all duration-200 flex items-center p-2 w-full rounded-xl border',
                      {
                        'bg-white/80 dark:bg-gray-800/80 border-gray-100/60 dark:border-gray-700/30 text-gray-900 dark:text-gray-100':
                          activeSessionId === session.id,
                        'hover:bg-white/60 dark:hover:bg-gray-800/60 border-transparent hover:border-gray-100/40 dark:hover:border-gray-700/20 backdrop-blur-sm':
                          activeSessionId !== session.id,
                        'opacity-60 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent hover:border-transparent dark:hover:border-transparent':
                          !connectionStatus.connected ||
                          (loadingSessionId !== null && loadingSessionId !== session.id),
                      },
                    )}
                    title={
                      !connectionStatus.connected
                        ? 'Cannot access session: Server disconnected'
                        : session.name || new Date(session.createdAt).toLocaleString()
                    }
                  >
                    <div className="w-8 h-8 flex items-center justify-center mx-auto">
                      {loadingSessionId === session.id ? (
                        <FiLoader className="animate-spin text-gray-500" size={16} />
                      ) : (
                        <FiMessageSquare
                          className={
                            activeSessionId === session.id ? 'text-accent-500' : 'text-gray-500'
                          }
                          size={16}
                        />
                      )}
                    </div>
                  </motion.button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="px-3">
              {/* 基于时间分组的会话列表 */}
              {groupedSessions.map((group) => (
                <div key={group.key} className="mb-4">
                  {/* 分组标题和折叠按钮 */}

                  <motion.button
                    onClick={() => toggleSectionCollapse(group.key)}
                    className="w-full flex items-center justify-between px-1 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300"
                    whileHover={{ x: 2 }}
                  >
                    <span>{group.label}</span>
                    <motion.div
                      animate={{ rotate: collapsedSections[group.key] ? 0 : 180 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FiChevronUp size={14} />
                    </motion.div>
                  </motion.button>

                  {/* 会话列表 */}
                  <AnimatePresence>
                    {!collapsedSections[group.key] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-1">
                          {group.sessions.map((session) => (
                            <motion.div
                              key={session.id}
                              className="relative group"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              {editingSessionId === session.id ? (
                                <div className="flex items-center p-2 glass-effect rounded-xl">
                                  <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    className="flex-1 px-2 py-1 text-sm bg-white/90 dark:bg-gray-700/90 border border-gray-200/50 dark:border-gray-600/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent-500 dark:focus:ring-accent-400"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEdit(session.id);
                                      if (e.key === 'Escape') setEditingSessionId(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveEdit(session.id)}
                                    className="ml-2 px-2 py-1 text-accent-600 dark:text-accent-400 bg-accent-50/70 dark:bg-accent-900/20 hover:bg-accent-100 dark:hover:bg-accent-800/30 rounded-lg text-xs transition-colors border border-accent-100/40 dark:border-accent-700/20"
                                  >
                                    Save
                                  </button>
                                </div>
                              ) : (
                                <motion.button
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => handleSessionClick(session.id)}
                                  disabled={
                                    !connectionStatus.connected || loadingSessionId !== null
                                  }
                                  className={classNames(
                                    'text-left text-sm transition-all duration-200 flex items-center p-2 w-full rounded-xl border',
                                    {
                                      'bg-white/80 dark:bg-gray-800/80 border-gray-100/60 dark:border-gray-700/30 text-gray-900 dark:text-gray-100':
                                        activeSessionId === session.id,
                                      'hover:bg-white/60 dark:hover:bg-gray-800/60 border-transparent hover:border-gray-100/40 dark:hover:border-gray-700/20 backdrop-blur-sm':
                                        activeSessionId !== session.id,
                                      'opacity-60 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent hover:border-transparent dark:hover:border-transparent':
                                        !connectionStatus.connected ||
                                        (loadingSessionId !== null &&
                                          loadingSessionId !== session.id),
                                    },
                                  )}
                                >
                                  <div
                                    className={`mr-3 h-9 w-9 flex-shrink-0 rounded-xl flex items-center justify-center ${
                                      activeSessionId === session.id
                                        ? 'bg-accent-50/50 dark:bg-gray-700/60 text-accent-500 dark:text-accent-400 border border-accent-100/30 dark:border-gray-600/30'
                                        : 'bg-gray-50/70 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 border border-gray-100/40 dark:border-gray-700/30'
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
                                      {session.name || 'Untitled Task'}
                                    </div>
                                    <div className="text-xs flex items-center mt-0.5 text-gray-500 dark:text-gray-400">
                                      <FiClock className="mr-1" size={10} />
                                      {formatTimestamp(session.updatedAt || session.createdAt)}
                                    </div>
                                  </div>

                                   <div className="hidden group-hover:flex absolute right-2 gap-1">
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditSession(session.id, session.name);
                                      }}
                                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all border border-transparent hover:border-gray-100/40 dark:hover:border-gray-700/30 bg-white/80 dark:bg-gray-800/80"
                                      title="Edit task name"
                                    >
                                      <FiEdit2 size={12} />
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={(e) => handleDeleteSession(session.id, e)}
                                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all border border-transparent hover:border-gray-100/40 dark:hover:border-gray-700/30 bg-white/80 dark:bg-gray-800/80"
                                      title="Delete task"
                                    >
                                      <FiTrash2 size={12} />
                                    </motion.button>
                                  </div>
                                </motion.button>
                              )}

                              {session.tags && session.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 px-4 my-1 pb-2">
                                  {session.tags.map((tag, idx) => (
                                    <motion.div
                                      key={idx}
                                      whileHover={{ y: -2 }}
                                      className="flex items-center bg-gray-50/60 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5 text-[10px] border border-gray-100/40 dark:border-gray-700/30"
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* 替换原有的设置和主题切换部分，只保留主题切换功能 */}
      <div className="p-3 mt-auto">
        {!isCollapsed ? (
          <div className="flex items-center justify-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={toggleDarkMode}
              className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all duration-200 backdrop-blur-sm border border-gray-100/40 dark:border-gray-700/30"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleDarkMode}
            className="w-10 h-10 mx-auto flex items-center justify-center hover:text-accent-600 dark:hover:text-accent-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-xl backdrop-blur-sm border border-gray-100/40 dark:border-gray-700/30"
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {isDarkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
          </motion.button>
        )}
      </div>
    </div>
  );
};