import React from 'react';
import { ToolBar } from './ToolBar';
import { ChatSession } from './ChatSession';
import { useLayout } from '@/common/hooks/useLayout';
import { useReplayMode } from '@/common/hooks/useReplayMode';

export const SidebarContainer: React.FC = () => {
  const { isSidebarCollapsed } = useLayout();
  const { isReplayMode } = useReplayMode();

  // In replay mode, only show the ToolBar
  if (isReplayMode) {
    return (
      <div className="flex h-full pb-2 lg:pb-3">
        <ToolBar />
      </div>
    );
  }

  return (
    <div className="flex h-full pb-2 lg:pb-3">
      <ToolBar />
      <ChatSession isCollapsed={isSidebarCollapsed} />
    </div>
  );
};

export default SidebarContainer;
