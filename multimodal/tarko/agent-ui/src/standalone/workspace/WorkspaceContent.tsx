import React, { useState, useEffect } from 'react';
import { useSession } from '@/common/hooks/useSession';
import { FiLayout, FiZap, FiLayers, FiActivity, FiFileText } from 'react-icons/fi';
import { apiService } from '@/common/services/apiService';
import { normalizeFilePath } from '@tarko/ui';
import { getAgentTitle } from '@/config/web-ui-config';
import { useAtomValue } from 'jotai';
import { sessionFilesAtom } from '@/common/state/atoms/files';
import { WorkspaceFileManager } from './components/WorkspaceFileManager';
import './Workspace.css';

/**
 * WorkspaceContent Component - Enhanced workspace with beautiful empty state
 *
 * Design principles:
 * - Beautiful empty state when no content is available
 * - Clean visual hierarchy and elegant animations
 */
export const WorkspaceContent: React.FC = () => {
  const { activeSessionId, setActivePanelContent } = useSession();

  const [workspacePath, setWorkspacePath] = useState<string>('');
  const allFiles = useAtomValue(sessionFilesAtom);

  useEffect(() => {
    const fetchWorkspaceInfo = async () => {
      try {
        const workspaceInfo = await apiService.getWorkspaceInfo();
        setWorkspacePath(normalizeFilePath(workspaceInfo.path));
      } catch (error) {
        console.error('Failed to fetch workspace info:', error);
        setWorkspacePath('');
      }
    };

    fetchWorkspaceInfo();
  }, []);

  // Enhanced empty state when no session
  if (!activeSessionId) {
    return (
      <div className="flex items-center justify-center h-full text-center py-12">
        <div className="max-w-md mx-auto px-6">
          <div className="relative mx-auto mb-8">
            {/* Gradient background glow effect */}
            <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-gray-200/50 to-gray-100/30 dark:from-gray-700/30 dark:to-gray-800/20 blur-xl"></div>

            {/* Main icon */}
            <div className="relative w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center border border-gray-200/60 dark:border-gray-700/40 shadow-lg">
              <FiLayout size={40} className="text-gray-500 dark:text-gray-400" />
            </div>
          </div>

          <h3 className="text-2xl font-medium mb-3 text-gray-800 dark:text-gray-200">
            No Active Session
          </h3>

          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Create or select a session to start working. Tool results and detailed information will
            be displayed here automatically.
          </p>
        </div>
      </div>
    );
  }

  // Enhanced empty state when session exists but no content
  const files = (activeSessionId && allFiles[activeSessionId]) ?? [];
  const hasFiles = files.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header with refined styling */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100/60 dark:border-gray-700/30 bg-white dark:bg-gray-800/90">
        <div className="flex items-center">
          <div className="w-10 h-10 mr-4 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 border border-gray-200/60 dark:border-gray-700/40 shadow-sm">
            <FiLayers size={18} />
          </div>
          <div>
            <h2 className="font-medium text-gray-900 dark:text-gray-100 text-lg">Workspace</h2>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {workspacePath || 'Loading workspace...'}
            </div>
          </div>
        </div>
      </div>

      {/* Content area with elegant empty state */}
      <div className="flex-1 overflow-y-auto p-6">
        {hasFiles ? (
          <div className="space-y-6">
            {/* Generated Files */}
            {hasFiles && activeSessionId && (
              <div>
                <WorkspaceFileManager files={files} sessionId={activeSessionId} />
              </div>
            )}
          </div>
        ) : (
          /* Modern Ready for Action state with unified design */
          <div className="flex items-center justify-center h-full text-center">
            <div className="max-w-md mx-auto px-6">
              {/* Enhanced icon with modern design - matching SessionCreatingState */}
              <div className="relative mb-8">
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/15 via-purple-500/15 to-green-500/15 rounded-full blur-xl" />

                {/* Main icon container */}
                <div className="relative w-20 h-20 bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-750 dark:to-gray-800 rounded-3xl flex items-center justify-center mx-auto shadow-lg border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm">
                  {/* Icon */}
                  <div className="relative z-10">
                    <div className="text-blue-600 dark:text-blue-400">
                      <FiActivity size={28} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced title with gradient */}
              <h3 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-white dark:to-gray-100 text-transparent bg-clip-text tracking-tight">
                Ready for Action
              </h3>

              {/* Elegant description */}
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6 max-w-sm mx-auto">
                Your workspace is active. Start a conversation with {getAgentTitle()} and watch as
                tool results and detailed information appear here in real-time.
              </p>

              {/* Enhanced feature cards with modern design */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
                <div className="flex md:flex-col items-center md:items-center p-4 bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-800 dark:via-gray-750 dark:to-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg backdrop-blur-sm relative overflow-hidden">
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 flex items-center justify-center md:mb-3 mr-3 md:mr-0 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-700/40 shadow-sm flex-shrink-0">
                    <FiLayout size={20} />
                  </div>
                  <div className="md:text-center relative z-10">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Tool Results
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Comprehensive outputs
                    </div>
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-center p-4 bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-800 dark:via-gray-750 dark:to-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg backdrop-blur-sm relative overflow-hidden">
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 flex items-center justify-center md:mb-3 mr-3 md:mr-0 text-green-600 dark:text-green-400 border border-green-200/60 dark:border-green-700/40 shadow-sm flex-shrink-0">
                    <FiZap size={20} />
                  </div>
                  <div className="md:text-center relative z-10">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Live Updates
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Real-time results
                    </div>
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-center p-4 bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-800 dark:via-gray-750 dark:to-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg backdrop-blur-sm relative overflow-hidden">
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 flex items-center justify-center md:mb-3 mr-3 md:mr-0 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-700/40 shadow-sm flex-shrink-0">
                    <FiFileText size={20} />
                  </div>
                  <div className="md:text-center relative z-10">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Deliverables
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Reports & Code</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
