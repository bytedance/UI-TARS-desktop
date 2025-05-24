import React from 'react';
import { useSession } from '../../hooks/useSession';
import { WorkspaceContent } from './WorkspaceContent';
import { WorkspaceDetail } from './WorkspaceDetail';

/**
 * WorkspacePanel Component - Container for workspace content
 *
 * Provides:
 * - Content display area for tool results
 * - Empty state when no active session
 */
export const WorkspacePanel: React.FC = () => {
  const { activeSessionId, activePanelContent } = useSession();

  if (!activeSessionId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm p-4 text-center">
        No active session
      </div>
    );
  }

  // Show detail view if there's active panel content, otherwise show content browser
  return activePanelContent ? <WorkspaceDetail /> : <WorkspaceContent />;
};
