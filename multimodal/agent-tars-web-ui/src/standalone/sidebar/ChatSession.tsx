import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useSession } from '@/common/hooks/useSession';
import { useNavigate } from 'react-router-dom';
import { FiRefreshCw, FiWifiOff, FiChevronUp, FiChevronDown, FiSearch } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import SessionItem from './SessionItem';
import { ConfirmDialog } from '@/sdk/dialog';
import { SessionSearch } from './SessionSearch';

interface ChatSessionProps {
  isCollapsed: boolean;
}

/**
 * ChatSession Component - Collapsible sidebar for session management
 */
export const ChatSession: React.FC<ChatSessionProps> = ({ isCollapsed }) => {
  const {
    sessions,
    activeSessionId,
    setActiveSession,
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
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  // 每个组显示的会话数量
  const [visibleSessionsCount, setVisibleSessionsCount] = useState<Record<string, number>>({
    today: 10,
    yesterday: 10,
    thisWeek: 10,
    earlier: 10,
    searchResults: 10,
  });

  // 使用useRef减少过多的状态更新
  const refreshingRef = useRef(false);
  const sessionActionInProgressRef = useRef<string | null>(null);

  // 处理搜索
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setIsSearchMode(!!query);
    
    // 搜索时重置可见数量，确保搜索结果得到合理展示
    if (!!query) {
      setVisibleSessionsCount(prev => ({
        ...prev,
        searchResults: 10,
      }));
    }
  }, []);

  // 切换折叠状态
  const toggleSectionCollapse = useCallback((sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }, []);

  // 加载更多会话
  const loadMoreSessions = useCallback((groupKey: string) => {
    setVisibleSessionsCount((prev) => ({
      ...prev,
      [groupKey]: prev[groupKey] + 10,
    }));
  }, []);

  // 筛选后的会话
  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions;
    
    return sessions.filter(session => 
      (session.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (session.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }, [sessions, searchQuery]);

  // 优化分组计算，减少不必要的重计算
  const groupedSessions = useMemo(() => {
    // 如果在搜索模式下，使用单独的搜索结果组
    if (isSearchMode) {
      return [
        { 
          label: `Search Results`, 
          sessions: filteredSessions, 
          key: 'searchResults' 
        }
      ];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    // 初始化组
    const groups: Array<{ label: string; sessions: Array<any>; key: string }> = [
      { label: 'Today', sessions: [], key: 'today' },
      { label: 'Yesterday', sessions: [], key: 'yesterday' },
      { label: 'This Week', sessions: [], key: 'thisWeek' },
      { label: 'Earlier', sessions: [], key: 'earlier' },
    ];

    // 使用循环一次性完成分类，避免多次迭代
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

    // 优化：预先过滤空组，避免渲染循环中的条件检查
    return groups.filter((group) => group.sessions.length > 0);
  }, [sessions, isSearchMode, filteredSessions]);

  // 优化的 session 点击处理函数
  const handleSessionClick = useCallback(
    (sessionId: string) => {
      if (
        sessionActionInProgressRef.current === sessionId ||
        !connectionStatus.connected ||
        loadingSessionId
      ) {
        return;
      }

      // 使用防抖避免快速点击
      sessionActionInProgressRef.current = sessionId;
      setLoadingSessionId(sessionId);

      // 使用 requestAnimationFrame 推迟导航操作到下一帧，减少布局抖动
      requestAnimationFrame(() => {
        navigate(`/${sessionId}`);

        // 给状态变更一些时间来完成
        setTimeout(() => {
          setLoadingSessionId(null);
          sessionActionInProgressRef.current = null;
        }, 100);
      });
    },
    [connectionStatus.connected, loadingSessionId, navigate],
  );

  // 优化的刷新会话函数
  const refreshSessions = useCallback(async () => {
    if (refreshingRef.current) return;

    refreshingRef.current = true;
    setIsRefreshing(true);

    try {
      // 使用 Promise.all 优化并行请求
      const [isConnected] = await Promise.all([checkServerStatus()]);

      if (isConnected) {
        await loadSessions();
      }
    } catch (error) {
      console.error('Failed to refresh sessions:', error);
    } finally {
      setIsRefreshing(false);
      refreshingRef.current = false;
    }
  }, [checkServerStatus, loadSessions]);

  // 优化的事件处理函数
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

  const handleDeleteSession = useCallback(async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(sessionId);
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDeleteSession = useCallback(async () => {
    if (!sessionToDelete) return;

    try {
      // 在删除之前找到下一个可用的会话
      if (sessionToDelete === activeSessionId && sessions.length > 1) {
        // 找到不是要删除的会话的最近会话
        const nextSession = sessions.find((s) => s.id !== sessionToDelete);
        if (nextSession) {
          // 先导航到新会话
          navigate(`/${nextSession.id}`);

          // 给导航一点时间完成
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      // 然后删除会话
      await deleteSession(sessionToDelete);
    } catch (error) {
      console.error('Failed to delete session:', error);
    } finally {
      setDeleteConfirmOpen(false);
      setSessionToDelete(null);
    }
  }, [deleteSession, sessionToDelete, sessions, activeSessionId, navigate]);

  // 如果折叠，返回最小侧边栏
  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full bg-transparent w-0 border-r border-gray-100/40 dark:border-gray-700/20" />
    );
  }

  return (
    <div className="w-64 flex flex-col h-full duration-200 backdrop-blur-sm border-r border-gray-100/40 dark:border-gray-700/20">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-100/40 dark:border-gray-700/20">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Tasks</div>
        <div className="flex items-center gap-2">
          {/* 连接状态指示器 */}
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

      {/* 搜索框 */}
      <SessionSearch onSearch={handleSearch} />

      {/* 离线模式提示 */}
      {!connectionStatus.connected && sessions.length > 0 && (
        <div className="px-3 py-2">
          <div className="p-3 rounded-xl bg-red-50/30 dark:bg-red-900/15 text-gray-700 dark:text-gray-300 text-sm border border-red-200/50 dark:border-red-800/30 shadow-sm">
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

      {/* 空搜索结果提示 */}
      {isSearchMode && filteredSessions.length === 0 && (
        <div className="p-6 text-center">
          <div className="flex justify-center mb-3 text-gray-400 dark:text-gray-500">
            <FiSearch size={24} />
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">No tasks found</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Try a different search term or clear the search
          </p>
        </div>
      )}

      {/* 会话列表 - 优化渲染 */}
      <div className="flex-1 overflow-y-auto sidebar-scrollbar p-3">
        <AnimatePresence>
          {groupedSessions.map((group) => (
            <div key={group.key} className="mb-4">
              {/* 组标题和切换按钮 */}
              <motion.button
                onClick={() => toggleSectionCollapse(group.key)}
                className="w-full flex items-center justify-between px-1 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300"
                whileHover={{ x: 2 }}
              >
                <span>
                  {group.label} ({group.sessions.length})
                </span>
                <motion.div
                  animate={{ rotate: collapsedSections[group.key] ? 0 : 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiChevronUp size={14} />
                </motion.div>
              </motion.button>

              {/* 该组中的会话 - 避免不必要的渲染 */}
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
                      {group.sessions
                        .slice(0, visibleSessionsCount[group.key] || 10)
                        .map((session) => (
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
                            setEditedName={setEditedName}
                          />
                        ))}
                    </div>

                    {/* 如果有更多会话未显示，显示"加载更多"按钮 */}
                    {group.sessions.length > visibleSessionsCount[group.key] && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => loadMoreSessions(group.key)}
                        className="w-full mt-2 py-2 text-xs text-accent-600 dark:text-accent-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-lg flex items-center justify-center"
                      >
                        <FiChevronDown className="mr-1" size={14} />
                        Load More ({group.sessions.length - visibleSessionsCount[group.key]}{' '}
                        remaining)
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteSession}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};