import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMessageSquare, FiEdit2, FiTrash2, FiTag, FiClock, FiLoader } from 'react-icons/fi';
import { formatTimestamp } from '../../utils/formatters';
import { SessionInfo } from '../../types';
import classNames from 'classnames';

interface SessionItemProps {
  session: SessionInfo;
  isActive: boolean;
  isLoading: boolean;
  isConnected: boolean;
  onSessionClick: (sessionId: string) => void;
  onEditSession: (sessionId: string, currentName?: string) => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onSaveEdit: (sessionId: string) => void;
  editingSessionId: string | null;
  editedName: string;
  setEditedName: (name: string) => void;
}

const SessionItem: React.FC<SessionItemProps> = React.memo(
  ({
    session,
    isActive,
    isLoading,
    isConnected,
    onSessionClick,
    onEditSession,
    onDeleteSession,
    onSaveEdit,
    editingSessionId,
    editedName,
    setEditedName,
  }) => {
    return (
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
              className="flex-1 px-2 py-1 text-sm bg-white/90 dark:bg-gray-700/90 border border-gray-200/50 dark:border-gray-600/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent-500 dark:focus:ring-accent-400 w-[100px]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit(session.id);
                if (e.key === 'Escape') onEditSession('', '');
              }}
            />
            <button
              onClick={() => onSaveEdit(session.id)}
              className="ml-2 px-2 py-1 text-accent-600 dark:text-accent-400 bg-accent-50/70 dark:bg-accent-900/20 hover:bg-accent-100 dark:hover:bg-accent-800/30 rounded-lg text-xs transition-colors border border-accent-100/40 dark:border-accent-700/20"
            >
              Save
            </button>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onSessionClick(session.id)}
            disabled={!isConnected || isLoading}
            className={classNames(
              'text-left text-sm transition-all duration-200 flex items-center p-2 w-full rounded-xl border',
              {
                'bg-white/80 dark:bg-gray-800/80 border-gray-100/60 dark:border-gray-700/30 text-gray-900 dark:text-gray-100':
                  isActive,
                'hover:bg-white/60 dark:hover:bg-gray-800/60 border-transparent hover:border-gray-100/40 dark:hover:border-gray-700/20 backdrop-blur-sm':
                  !isActive,
                'opacity-60 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent hover:border-transparent dark:hover:border-transparent':
                  !isConnected || (isLoading && session.id !== isLoading),
              },
            )}
          >
            <div
              className={`mr-3 h-9 w-9 flex-shrink-0 rounded-xl flex items-center justify-center ${
                isActive
                  ? 'bg-accent-50/50 dark:bg-gray-700/60 text-accent-500 dark:text-accent-400 border border-accent-100/30 dark:border-gray-600/30'
                  : 'bg-gray-50/70 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 border border-gray-100/40 dark:border-gray-700/30'
              }`}
            >
              {isLoading === session.id ? (
                <FiLoader className="animate-spin" size={16} />
              ) : (
                <FiMessageSquare size={16} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{session.name || 'Untitled Task'}</div>
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
                  onEditSession(session.id, session.name);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all border border-transparent hover:border-gray-100/40 dark:hover:border-gray-700/30 bg-white/80 dark:bg-gray-800/80"
                title="Edit task name"
              >
                <FiEdit2 size={12} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => onDeleteSession(session.id, e)}
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
    );
  },
);

SessionItem.displayName = 'SessionItem';

export default SessionItem;
