import React from 'react';
import { useSession } from '../contexts/SessionContext';
import { FiPlus, FiMessageSquare, FiSettings } from 'react-icons/fi';

export const Sidebar: React.FC = () => {
  const { sessions, activeSessionId, createNewSession, setActiveSession } = useSession();

  const handleNewSession = async () => {
    try {
      await createNewSession();
    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  };

  return (
    <div className="w-48 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-lg font-display font-bold">Agent TARS</h1>
      </div>

      <div className="p-3">
        <button
          onClick={handleNewSession}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
        >
          <FiPlus /> New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Sessions
        </div>

        <div className="space-y-1 px-2">
          {sessions.map((session) => (
            <button
              key={session.id}
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
            </button>
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
