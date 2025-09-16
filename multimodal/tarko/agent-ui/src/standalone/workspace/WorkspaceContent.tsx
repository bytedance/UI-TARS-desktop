import React, { useState, useEffect } from 'react';
import { useSession } from '@/common/hooks/useSession';
import { FiLayout, FiZap, FiLayers, FiActivity, FiFileText } from 'react-icons/fi';
import { apiService } from '@/common/services/apiService';
import { normalizeFilePath } from '@/common/utils/pathNormalizer';
import { getAgentTitle } from '@/config/web-ui-config';
import { useAtomValue } from 'jotai';
import { sessionFilesAtom } from '@/common/state/atoms/files';
import { WorkspaceFileManager } from './components/WorkspaceFileManager';
import { SharedEmptyStateIcon } from './components/SharedEmptyStateIcon';
import { SharedGradientTitle } from './components/SharedGradientTitle';
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
          <SharedEmptyStateIcon
            icon={<FiLayout size={40} />}
            size="lg"
            color="gray"
            animated={false}
          />

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
              <SharedEmptyStateIcon
                icon={<FiActivity size={28} />}
                size="md"
                color="blue"
              />

              <SharedGradientTitle>Ready for Action</SharedGradientTitle>

              {/* Elegant description */}
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6 max-w-sm mx-auto">
                Your workspace is active. Start a conversation with {getAgentTitle()} and watch as
                tool results and detailed information appear here in real-time.
              </p>

              {/* Enhanced feature cards with modern design */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
                <div className="flex flex-col items-center p-4 bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-800 dark:via-gray-750 dark:to-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg backdrop-blur-sm relative overflow-hidden">
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 flex items-center justify-center mb-3 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-700/40 shadow-sm">
                    <FiLayout size={20} />
                  </div>
                  <div className="text-center relative z-10">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Tool Results
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Comprehensive outputs
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center p-4 bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-800 dark:via-gray-750 dark:to-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg backdrop-blur-sm relative overflow-hidden">
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 flex items-center justify-center mb-3 text-green-600 dark:text-green-400 border border-green-200/60 dark:border-green-700/40 shadow-sm">
                    <FiZap size={20} />
                  </div>
                  <div className="text-center relative z-10">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Live Updates
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Real-time results
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center p-4 bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-800 dark:via-gray-750 dark:to-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg backdrop-blur-sm relative overflow-hidden">
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 flex items-center justify-center mb-3 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-700/40 shadow-sm">
                    <FiFileText size={20} />
                  </div>
                  <div className="text-center relative z-10">
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
