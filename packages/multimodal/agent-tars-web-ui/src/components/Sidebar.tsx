import React, { useState } from 'react';
import { useSessionStore } from '../store';
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
  FiMenu,
  FiClock,
} from 'react-icons/fi';
import classNames from 'classnames';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const {
    sessions,
    activeSessionId,
    createNewSession,
    setActiveSession,
    updateSessionMetadata,
    deleteSession,
    loadSessions,
  } = useSessionStore();

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

  const handleEditSession = (sessionId: string, currentName?: string) => {
    setEditingSessionId(sessionId);
    setEditedName(currentName || '');
  };

  const handleSaveEdit = async (sessionId: string) => {
    try {
      await updateSessionMetadata({
        sessionId,
        updates: { name: editedName },
      });
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
      await loadSessions();
    } catch (error) {
      console.error('Failed to refresh sessions:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div
      className={classNames(
        'flex flex-col h-full bg-gray-50/60 dark:bg-gray-900/40 transition-all duration-300 border-r border-gray-200/30 dark:border-gray-800/20 backdrop-blur-sm',
        {
          'w-64': !isCollapsed,
          'w-16': isCollapsed,
        },
      )}
    >
      <div className="p-4 flex items-center justify-between border-b border-gray-200/20 dark:border-gray-800/10">
        {!isCollapsed ? (
          <h1 className="text-lg font-display font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
            Agent TARS
          </h1>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-600 to-primary-400 flex items-center justify-center text-white font-bold">
              T
            </div>
          </div>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleCollapse}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-200/40 dark:hover:bg-gray-700/30 transition-colors"
        >
          {isCollapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
        </motion.button>
      </div>

      <div className="p-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNewSession}
          className={classNames(
            'flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 rounded-xl text-white transition-all duration-200 border border-primary-400/30 dark:border-primary-700/30',
            {
              'w-full px-3': !isCollapsed,
              'w-10 h-10 mx-auto': isCollapsed,
            },
          )}
          title="New Chat"
        >
          <FiPlus className="text-white" />
          {!isCollapsed && <span className="font-medium">New Chat</span>}
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-3 py-2 flex items-center justify-between">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Recent Chats
            </div>
            <motion.button
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              onClick={refreshSessions}
              disabled={isRefreshing}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-200/40 dark:hover:bg-gray-700/30 text-xs transition-all"
              title="Refresh sessions"
            >
              <FiRefreshCw className={isRefreshing ? 'animate-spin' : ''} size={12} />
            </motion.button>
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
                  <div className="flex items-center p-2 bg-gray-200/40 dark:bg-gray-700/30 rounded-xl">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300/40 dark:border-gray-600/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-400"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(session.id);
                        if (e.key === 'Escape') setEditingSessionId(null);
                      }}
                    />
                    <button
                      onClick={() => handleSaveEdit(session.id)}
                      className="ml-2 px-2 py-1 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-800/30 rounded-lg text-xs transition-colors"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveSession(session.id)}
                    className={classNames(
                      'sidebar-item text-left text-sm transition-all duration-200 flex items-center p-2 w-full',
                      {
                        'active bg-primary-50/70 dark:bg-primary-900/20 border-primary-400/40 dark:border-primary-600/40':
                          activeSessionId === session.id,
                      },
                    )}
                    title={
                      isCollapsed
                        ? session.name || new Date(session.createdAt).toLocaleString()
                        : undefined
                    }
                  >
                    {isCollapsed ? (
                      <div className="w-10 h-10 flex items-center justify-center mx-auto">
                        <FiMessageSquare className="text-lg" />
                      </div>
                    ) : (
                      <>
                        <div className="mr-3 h-8 w-8 flex-shrink-0 bg-gray-100/80 dark:bg-gray-800/80 rounded-full flex items-center justify-center border border-gray-200/50 dark:border-gray-700/40">
                          <FiMessageSquare
                            className={`${activeSessionId === session.id ? 'text-primary-500 dark:text-primary-400' : 'text-gray-600 dark:text-gray-300'}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {session.name || 'Untitled Chat'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-0.5">
                            <FiClock className="mr-1" size={10} />
                            {formatDate(session.updatedAt || session.createdAt)}
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
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100/60 dark:hover:bg-gray-700/40 transition-all"
                          title="Edit session name"
                        >
                          <FiEdit2 size={12} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100/60 dark:hover:bg-gray-700/40 transition-all"
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
                        className="flex items-center bg-gray-100/70 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5 text-[10px] border border-gray-200/30 dark:border-gray-700/30"
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

      <div className="p-3 border-t border-gray-200/20 dark:border-gray-800/10">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={classNames(
            'flex items-center justify-center gap-2 py-2 bg-gray-100/70 dark:bg-gray-800/60 hover:bg-gray-200/70 dark:hover:bg-gray-700/60 rounded-xl text-gray-700 dark:text-gray-300 transition-all duration-200 border border-gray-200/30 dark:border-gray-700/30',
            {
              'w-full px-3': !isCollapsed,
              'w-10 h-10 mx-auto': isCollapsed,
            },
          )}
          title="Settings"
        >
          <FiSettings />
          {!isCollapsed && <span className="font-medium">Settings</span>}
        </motion.button>
      </div>
    </div>
  );
};
