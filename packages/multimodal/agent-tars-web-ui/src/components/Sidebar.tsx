import React, { useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import {
  FiPlus,
  FiMessageSquare,
  FiSettings,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiTag,
} from 'react-icons/fi';

export const Sidebar: React.FC = () => {
  const {
    sessions,
    activeSessionId,
    createNewSession,
    setActiveSession,
    updateSessionMetadata,
    deleteSession,
    loadSessions,
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

  const handleEditSession = (sessionId: string, currentName?: string) => {
    setEditingSessionId(sessionId);
    setEditedName(currentName || '');
  };

  const handleSaveEdit = async (sessionId: string) => {
    try {
      await updateSessionMetadata(sessionId, { name: editedName });
      setEditingSessionId(null);
    } catch (error) {
      console.error('Failed to update session name:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent clicking on the session

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

  return (
    <div className="w-48 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
        <h1 className="text-lg font-display font-bold">Agent TARS</h1>
      </div>

      <div className="p-3">
        <button
          onClick={handleNewSession}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-primary-600 rounded-md hover:bg-primary-700 transition-colors text-sm"
        >
          <FiPlus /> New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-1.5 flex items-center justify-between">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Sessions
          </div>
          <button
            onClick={refreshSessions}
            disabled={isRefreshing}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 text-xs"
            title="Refresh sessions"
          >
            <FiRefreshCw className={isRefreshing ? 'animate-spin' : ''} size={12} />
          </button>
        </div>

        <div className="space-y-1 px-2">
          {sessions.map((session) => (
            <div key={session.id} className="relative group">
              {editingSessionId === session.id ? (
                <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-700 rounded-md">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="flex-1 px-2 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(session.id);
                      if (e.key === 'Escape') setEditingSessionId(null);
                    }}
                  />
                  <button
                    onClick={() => handleSaveEdit(session.id)}
                    className="ml-1 p-1 text-primary-600 hover:text-primary-700 text-xs"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveSession(session.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 ${
                    activeSessionId === session.id
                      ? 'bg-gray-100 dark:bg-gray-700 text-primary-600 dark:text-primary-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiMessageSquare className="text-xs" />
                  <span className="truncate">
                    {session.name || new Date(session.createdAt).toLocaleString()}
                  </span>

                  <div className="hidden group-hover:flex absolute right-2 gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditSession(session.id, session.name);
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-0.5"
                      title="Edit session name"
                    >
                      <FiEdit2 size={10} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="text-gray-500 hover:text-red-500 p-0.5"
                      title="Delete session"
                    >
                      <FiTrash2 size={10} />
                    </button>
                  </div>
                </button>
              )}

              {session.tags && session.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 px-3 mt-1 mb-2">
                  {session.tags.map((tag, idx) => (
                    <div
                      key={idx}
                      className="flex items-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded px-1.5 py-0.5 text-[10px]"
                    >
                      <FiTag size={8} className="mr-1" />
                      {tag}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <button className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
          <FiSettings /> Settings
        </button>
      </div>
    </div>
  );
};
