import React from 'react';
import { ToolBar } from './ToolBar';
import { ChatSession } from './ChatSession';
import { useLayout } from '@/common/hooks/useLayout';
import { useReplayMode } from '@/common/hooks/useReplayMode';

/**
 * SidebarContainer - Container component that orchestrates the sidebar layout
 *
 * Design principles:
 * - Manages the layout of ToolBar and ChatSession components
 * - Handles conditional rendering based on replay mode
 * - Maintains proper spacing and alignment between components
 * - Provides a clean interface for the main layout
 */
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
