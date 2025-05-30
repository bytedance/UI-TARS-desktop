import React, { useState, useMemo, useCallback } from 'react';
import { useSession } from '../../hooks/useSession';
import { useNavigate } from 'react-router-dom';
import {
  FiPlus,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiHome,
  FiMoon,
  FiSun,
  FiWifiOff,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import classNames from 'classnames';
import { motion, AnimatePresence } from 'framer-motion';
import { formatRelativeDate } from '../../utils/formatters';
import './Sidebar.css';
import SessionItem from './SessionItem';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// Interface for session group
interface SessionGroup {
  label: string;
  sessions: Array<any>;
  key: string;
}

/**
 * Sidebar Component - Application sidebar with session management
 *
 * Now optimized with:
 * - React.memo for better rendering performance
 * - Extracted SessionItem component
 * - useCallback for event handlers
 * - useMemo for derived state
 */
const Sidebar: React.FC<SidebarProps> = React.memo(({ isCollapsed, onToggleCollapse }) => {
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

  // Toggle section collapse state - memoized
  const toggleSectionCollapse = useCallback((sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }, []);

  // Group sessions by time period - memoized
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

  // Event handlers - all memoized with useCallback
  const handleNewSession = useCallback(async () => {
    try {
      const sessionId = await createNewSession();
      navigate(`/${sessionId}`);
    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  }, [navigate]);

  const createNewSession = useCallback(async () => {
    const sessionId = await createSession();
    await setActiveSession(sessionId);
    return sessionId;
  }, [createSession, setActiveSession]);

  const handleEditSession = useCallback((sessionId: string, currentName?: string) => {
    setEditingSessionId(sessionId);
    setEditedName(currentName || '');
  }, []);

  const handleSaveEdit = useCallback(
    async (sessionId: string) => {
      try {
        await updateSessionMetadata({ sessionId, updates: { name: editedName } });
        setEditingSessionId(null);
      } catch (error) {
        console.error('Failed to update session name:', error);
      }
    },
    [updateSessionMetadata, editedName],
  );

  const handleDeleteSession = useCallback(
    async (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent clicking session

      if (window.confirm('Are you sure you want to delete this session?')) {
        try {
          await deleteSession(sessionId);
        } catch (error) {
          console.error('Failed to delete session:', error);
        }
      }
    },
    [deleteSession],
  );

  const refreshSessions = useCallback(async () => {
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
  }, [checkServerStatus, loadSessions]);

  const toggleDarkMode = useCallback(() => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
  }, [isDarkMode]);

  const handleSessionClick = useCallback(
    async (sessionId: string) => {
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
    },
    [loadingSessionId, connectionStatus.connected, navigate, checkServerStatus],
  );

  // 处理标题点击，导航到首页
  const handleTitleClick = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Memoize the setter function
  const handleSetEditedName = useCallback((name: string) => {
    setEditedName(name);
  }, []);

  return (
    <div
      className={classNames('flex flex-col h-full duration-200 bg-transparent', {
        'w-64': !isCollapsed,
        'w-16': isCollapsed,
      })}
    >
      {/* Header with logo/title and collapse button */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed ? (
          <div
            className="text-lg font-display font-bold text-gray-900 dark:text-gray-100 flex items-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleTitleClick}
          >
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
              className="w-8 h-8 rounded-2xl bg-gray-900 dark:bg-gray-100 flex items-center justify-center text-white dark:text-gray-900 font-bold cursor-pointer"
              onClick={handleTitleClick}
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
            'flex items-center justify-center gap-2 py-2 rounded-3xl text-white duration-200 border',
            {
              'w-full px-3': !isCollapsed,
              'w-8 h-8 mx-auto': isCollapsed,
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
                        <FiRefreshCw className="animate-spin text-gray-500" size={16} />
                      ) : (
                        <FiRefreshCw
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
                            <SessionItem
                              key={session.id}
                              session={session}
                              isActive={activeSessionId === session.id}
                              isLoading={loadingSessionId === session.id}
                              isConnected={connectionStatus.connected}
                              onSessionClick={handleSessionClick}
                              onEditSession={handleEditSession}
                              onDeleteSession={handleDeleteSession}
                              onSaveEdit={handleSaveEdit}
                              editingSessionId={editingSessionId}
                              editedName={editedName}
                              setEditedName={handleSetEditedName}
                            />
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
});

Sidebar.displayName = 'Sidebar';

export { Sidebar };
