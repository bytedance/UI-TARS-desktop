import React, { useState, useEffect } from 'react';
import { useSession } from '../../hooks/useSession';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import { SessionList } from './SessionList';
import { SidebarHeader } from './SidebarHeader';
import { SidebarFooter } from './SidebarFooter';
import { ConnectionStatus } from './ConnectionStatus';
import classNames from 'classnames';
import './Sidebar.css';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * 侧边栏组件
 * 管理会话列表、创建新会话和切换会话的功能
 */
export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const { loadSessions } = useSession();
  const { status } = useConnectionStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 刷新会话列表
  const refreshSessions = async () => {
    setIsRefreshing(true);
    try {
      if (status.connected) {
        await loadSessions();
      }
    } catch (error) {
      console.error('Failed to refresh sessions:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 当连接状态改变时，尝试加载会话
  useEffect(() => {
    if (status.connected) {
      loadSessions();
    }
  }, [loadSessions, status.connected]);

  return (
    <div
      className={classNames('flex flex-col h-full', {
        'w-64': !isCollapsed,
        'w-14': isCollapsed,
      })}
    >
      <SidebarHeader isCollapsed={isCollapsed} onToggleCollapse={onToggleCollapse} />

      <div className="p-3">
        <NewChatButton isCollapsed={isCollapsed} isDisabled={!status.connected} />
      </div>

      <div
        className={classNames('flex-1 overflow-y-auto sidebar-scrollbar', { 'mt-2': !isCollapsed })}
      >
        {!isCollapsed && (
          <div className="px-3 py-2 flex items-center justify-between">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Recent Chats
            </div>
            <ConnectionStatus
              status={status}
              isRefreshing={isRefreshing}
              onRefresh={refreshSessions}
            />
          </div>
        )}

        <SessionList isCollapsed={isCollapsed} />
      </div>

      <SidebarFooter isCollapsed={isCollapsed} />
    </div>
  );
};

// 新建聊天按钮
const NewChatButton: React.FC<{ isCollapsed: boolean; isDisabled: boolean }> = ({
  isCollapsed,
  isDisabled,
}) => {
  const { createNewSession } = useSession();

  return (
    <button
      onClick={createNewSession}
      disabled={isDisabled}
      className={classNames(
        'flex items-center justify-center gap-2 py-2.5 rounded-[30px] text-white transition-all duration-200 border border-gray-700/30 dark:border-gray-600/30 shadow-sm',
        {
          'w-full px-3': !isCollapsed,
          'w-9 h-9 mx-auto': isCollapsed,
        },
        isDisabled
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-gray-800 hover:bg-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700',
      )}
      title={isDisabled ? 'Server disconnected' : 'New Chat'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="text-white"
        width={isCollapsed ? 16 : 18}
        height={isCollapsed ? 16 : 18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      {!isCollapsed && <span className="font-medium">New Chat</span>}
    </button>
  );
};
