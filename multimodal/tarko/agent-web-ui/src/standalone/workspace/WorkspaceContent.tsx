import React, { useState, useEffect } from 'react';
import { useSession } from '@/common/hooks/useSession';
import { usePlan } from '@/common/hooks/usePlan';
import {
  FiLayout,
  FiCpu,
  FiZap,
  FiArrowRight,
  FiLayers,
  FiActivity,
  FiFileText,
} from 'react-icons/fi';
import { apiService } from '@/common/services/apiService';
import { normalizeFilePath } from '@/common/utils/pathNormalizer';
import { getAgentTitle } from '@/config/web-ui-config';
import { useAtomValue } from 'jotai';
import { sessionFilesAtom } from '@/common/state/atoms/files';
import { WorkspaceFileManager } from './components/WorkspaceFileManager';
import './Workspace.css';

/**
 * WorkspaceContent Component - Enhanced workspace with beautiful empty state
 *
 * Design principles:
 * - Focus on plan display for Pro users
 * - Beautiful empty state when no content is available
 * - Clean visual hierarchy and elegant animations
 */
export const WorkspaceContent: React.FC = () => {
  const { activeSessionId, setActivePanelContent } = useSession();
  const { currentPlan } = usePlan(activeSessionId);
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



  // Plan view button for Pro users
  const renderPlanButton = () => {
    if (!currentPlan || !currentPlan.hasGeneratedPlan || currentPlan.steps.length === 0)
      return null;

    const completedSteps = currentPlan.steps.filter((step) => step.done).length;
    const totalSteps = currentPlan.steps.length;
    const isComplete = currentPlan.isComplete;

    return (
      <div className="mb-6">
        <div
          onClick={() =>
            setActivePanelContent({
              type: 'plan',
              source: null,
              title: 'Task Plan',
              timestamp: Date.now(),
            })
          }
          className="bg-white dark:bg-gray-800/90 rounded-2xl border border-[#E5E6EC]/70 dark:border-gray-700/40 overflow-hidden cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <div className="p-5">
            <div className="flex items-start">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mr-4 flex-shrink-0 ${
                  isComplete
                    ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 text-green-600 dark:text-green-400 border border-green-100/80 dark:border-green-800/40'
                    : 'bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/20 dark:to-accent-800/20 text-accent-500 dark:text-accent-400 border border-accent-100/50 dark:border-accent-800/30'
                }`}
              >
                <FiCpu size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-lg mb-1 truncate pr-2">
                    Task Plan
                  </h4>
                  <div className="flex items-center text-xs">
                    <span
                      className={`w-2 h-2 rounded-full mr-1.5 ${
                        isComplete
                          ? 'bg-green-500 dark:bg-green-400'
                          : 'bg-accent-500 dark:bg-accent-400'
                      }`}
                    />
                    <span className="text-gray-500 dark:text-gray-400">
                      {isComplete ? 'Completed' : 'In progress'}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {isComplete
                    ? 'All planned steps have been completed successfully.'
                    : 'The agent is executing a plan to accomplish your task.'}
                </div>

                {/* Progress bar */}
                <div className="mt-1 mb-2">
                  <div className="flex justify-between items-center mb-1.5 text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {completedSteps}/{totalSteps}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700/70 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        isComplete
                          ? 'bg-gradient-to-r from-green-400 to-green-500 dark:from-green-500 dark:to-green-400'
                          : 'bg-gradient-to-r from-accent-400 to-accent-500 dark:from-accent-500 dark:to-accent-400'
                      }`}
                      style={{ width: `${totalSteps ? (completedSteps / totalSteps) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-b from-gray-50/70 to-gray-50 dark:from-gray-800/50 dark:to-gray-800/80 px-5 py-3 border-t border-[#E5E6EC]/50 dark:border-gray-700/30 flex justify-between items-center">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              View plan details
            </div>
            <div className="flex items-center text-sm">
              <FiArrowRight className="text-accent-500 dark:text-accent-400" size={16} />
            </div>
          </div>
        </div>
      </div>
    );
  };

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
  const hasPlan = currentPlan && currentPlan.hasGeneratedPlan && currentPlan.steps.length > 0;
  const files = (activeSessionId && allFiles[activeSessionId]) ?? [];
  const hasFiles = files.length > 0;
  const hasContent = hasPlan || hasFiles;

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
        {hasContent ? (
          <div className="space-y-6">
            {/* Generated Files */}
            {hasFiles && activeSessionId && (
              <div>
                <WorkspaceFileManager files={files} sessionId={activeSessionId} />
              </div>
            )}
            
            {/* Plan view for Pro users */}
            {hasPlan && renderPlanButton()}
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
                Your workspace is active. Start a conversation with {getAgentTitle()} and watch as tool
                results, plans, and detailed information appear here in real-time.
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
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Reports & Code
                    </div>
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
