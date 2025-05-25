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
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">No active session</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create or select a session to start working
          </p>
        </div>
      </div>
    );
  }

  // Show detail view if there's active panel content, otherwise show content browser
  return activePanelContent ? <WorkspaceDetail /> : <WorkspaceContent />;
};
