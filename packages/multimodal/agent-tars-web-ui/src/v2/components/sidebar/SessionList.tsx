import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '../../hooks/useSession';
import classNames from 'classnames';

interface SessionListProps {
  isCollapsed: boolean;
}

/**
 * 会话列表组件
 * 显示所有可用会话并允许用户切换、编辑、删除会话
 */
export const SessionList: React.FC<SessionListProps> = ({ isCollapsed }) => {
  const { sessions, activeSessionId, setActiveSession, updateSessionMetadata, deleteSession } =
    useSession();
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  // 处理会话点击 - 优化会话切换体验
  const handleSessionClick = (sessionId: string) => {
    // 如果已经是活动会话，不重新加载
    if (sessionId === activeSessionId) return;

    // 立即设置活动会话，提高响应性
    setActiveSession(sessionId).catch((error) => {
      console.error('Error loading session:', error);
      // 可以在这里添加错误处理逻辑，例如显示通知
    });
  };
  // 处理编辑会话
  const handleEditSession = (sessionId: string, currentName?: string) => {
    setEditingSessionId(sessionId);
    setEditedName(currentName || '');
  };

  // 处理保存编辑
  const handleSaveEdit = async (sessionId: string) => {
    try {
      await updateSessionMetadata(sessionId, { name: editedName });
      setEditingSessionId(null);
    } catch (error) {
      console.error('Failed to update session name:', error);
    }
  };

  // 处理删除会话
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止点击会话

    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        await deleteSession(sessionId);
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  };

  // 格式化日期
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
                onClick={() => handleSessionClick(session.id)}
                className={classNames(
                  'text-left text-sm transition-all duration-200 flex items-center p-2 w-full rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60',
                  {
                    'text-green-600 dark:text-green-500': activeSessionId === session.id,
                  },
                )}
                title={
                  isCollapsed
                    ? session.name || new Date(session.createdAt).toLocaleString()
                    : undefined
                }
              >
                {isCollapsed ? (
                  <div className="w-8 h-8 flex items-center justify-center mx-auto">
                    <svg
                      className={
                        activeSessionId === session.id ? 'text-green-600' : 'text-gray-500'
                      }
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                ) : (
                  <>
                    <div
                      className={`mr-3 h-8 w-8 flex-shrink-0 rounded-md flex items-center justify-center border ${
                        activeSessionId === session.id
                          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/30'
                          : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                      }`}
                    >
                      <svg
                        className={`${
                          activeSessionId === session.id
                            ? 'text-green-600 dark:text-green-500'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate`}>
                        {session.name || 'Untitled Chat'}
                      </div>
                      <div className="text-xs flex items-center mt-0.5">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
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
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      title="Edit session name"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1"
                      >
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                      </svg>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      title="Delete session"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
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
                    <svg
                      className="mr-1"
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                      <line x1="7" y1="7" x2="7.01" y2="7"></line>
                    </svg>
                    {tag}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
};
