import React from 'react';
import { useSession } from '../../hooks/useSession';
import { useLayout } from '../../hooks/useLayout';
import { WorkspaceContent } from './WorkspaceContent';

/**
 * WorkspacePanel Component - Container for workspace content
 *
 * Provides:
 * - Content display area for tool results
 * - Empty state when no active session
 */
export const WorkspacePanel: React.FC = () => {
  const { activeSessionId } = useSession();
  const { isWorkspacePanelCollapsed, toggleWorkspacePanel } = useLayout();

  if (!activeSessionId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm p-4 text-center">
        No active session
      </div>
    );
  }

  if (isWorkspacePanelCollapsed) {
    return (
      <div className="h-full flex flex-col justify-between">
        <div className="flex justify-center py-4">
          <span className="writing-vertical-lr text-xs text-gray-500 font-medium uppercase tracking-wider">
            Workspace
          </span>
        </div>
        <button
          onClick={toggleWorkspacePanel}
          className="mt-auto mb-4 flex justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200"
          title="Expand panel"
        >
          {/* Icon for expand */}
        </button>
      </div>
    );
  }

  return <WorkspaceContent onToggleCollapse={toggleWorkspacePanel} />;
};
