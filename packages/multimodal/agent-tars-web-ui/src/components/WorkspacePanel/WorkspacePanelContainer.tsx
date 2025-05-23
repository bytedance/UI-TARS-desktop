import React from 'react';
import { useSessionStore } from '../../store';
import { WorkspaceView } from './WorkspaceView';

interface WorkspacePanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const WorkspacePanelContainer: React.FC<WorkspacePanelProps> = ({
  isCollapsed,
  onToggleCollapse,
}) => {
  const { activeSessionId } = useSessionStore();

  if (!activeSessionId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm p-4 text-center">
        No active session
      </div>
    );
  }

  return <WorkspaceView onToggleCollapse={onToggleCollapse} />;
};
