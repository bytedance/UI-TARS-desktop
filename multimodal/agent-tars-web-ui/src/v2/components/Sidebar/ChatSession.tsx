import React, { useState, useMemo, useCallback } from 'react';
import { useSession } from '../../hooks/useSession';
import { useNavigate } from 'react-router-dom';
import { FiRefreshCw, FiWifiOff, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import SessionItem from './SessionItem';

interface ChatSessionProps {
  isCollapsed: boolean;
}

/**
 * ChatSession Component - Collapsible sidebar for session management
 *
 * Design principles:
 * - Clean, consistent visual hierarchy
 * - Collapsible interface to maximize workspace
 * - Time-based grouping for easy navigation
 * - Offline mode support with clear visual feedback
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

  // Toggle section collapse state
  const toggleSectionCollapse = useCallback((sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }, []);

  // Group sessions by time period
  const groupedSessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Initialize groups
    const groups: Array<{ label: string; sessions: Array<any>; key: string }> = [
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

  // Event handlers
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
      e.stopPropagation();

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

  const handleSessionClick = useCallback(
    async (sessionId: string) => {
      if (loadingSessionId || !connectionStatus.connected) return;

      try {
        setLoadingSessionId(sessionId);
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

  // If collapsed, render minimal sidebar
  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full bg-transparent w-0 border-r border-gray-100/40 dark:border-gray-700/20">
        {/* No collapse button here anymore - moved to Navbar */}
      </div>
    );
  }

  return (
    <div className="w-64 flex flex-col h-full duration-200 backdrop-blur-sm border-r border-gray-100/40 dark:border-gray-700/20">
      {/* Header with title - no collapse button anymore */}
      <div className="p-4 flex items-center justify-between border-b border-gray-100/40 dark:border-gray-700/20">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Tasks</div>
        <div className="flex items-center gap-2">
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

      {/* Offline mode banner */}
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

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto sidebar-scrollbar p-3">
        <AnimatePresence>
          {groupedSessions.map((group) => (
            <div key={group.key} className="mb-4">
              {/* Group header and toggle */}
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

              {/* Sessions in this group */}
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
                          setEditedName={setEditedName}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};