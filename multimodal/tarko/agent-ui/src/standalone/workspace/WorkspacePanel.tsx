import React, { useEffect } from 'react';
import { useSession } from '@/common/hooks/useSession';
import { WorkspaceContent } from './WorkspaceContent';
import { WorkspaceDetail } from './WorkspaceDetail';
import { PlanView } from './PlanView';
import { useReplay } from '@/common/hooks/useReplay';
import { ReplayControlPanel } from '@/standalone/replay/ReplayControlPanel';
import { FullscreenModal } from './components/FullscreenModal';
import { AnimatePresence, motion } from 'framer-motion';
import { FullscreenFileData } from './types/panelContent';
import { getFileTypeInfo } from './utils/fileTypeUtils';
import './Workspace.css';

/**
 * Parse focus parameter from URL
 */
function getFocusParam(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('focus');
}

/**
 * Check if file should be displayed in fullscreen based on extension
 */
function shouldShowFullscreen(filePath: string): boolean {
  return getFileTypeInfo(filePath).isRenderableFile;
}

/**
 * WorkspacePanel Component - Container for workspace content
 */
export const WorkspacePanel: React.FC = () => {
  const { activeSessionId, activePanelContent, setActivePanelContent } = useSession();
  const { replayState } = useReplay();
  const [fullscreenData, setFullscreenData] = React.useState<FullscreenFileData | null>(null);
  // Track whether focus parameter has already been processed once
  const [focusProcessed, setFocusProcessed] = React.useState(false);

  const isViewingPlan = activePanelContent?.type === 'plan';
  const isReplayActive = replayState.isActive;
  const focusParam = getFocusParam();

  // Handle focus parameter for fullscreen display - only process once
  useEffect(() => {
    if (focusParam && activePanelContent && activePanelContent.type === 'file' && !focusProcessed) {
      const filePath = activePanelContent.arguments?.path || activePanelContent.title;
      const fileName = filePath.split('/').pop() || filePath;
      const content = activePanelContent.arguments?.content || activePanelContent.source;

      // Check if this is the focused file and should be shown fullscreen
      if (
        (fileName === focusParam || filePath === focusParam) &&
        typeof content === 'string' &&
        shouldShowFullscreen(filePath)
      ) {
        const { isMarkdown, isHtml } = getFileTypeInfo(filePath);

        setFullscreenData({
          content,
          fileName,
          filePath,
          displayMode: 'rendered', // Default to rendered for focus mode
          isMarkdown,
          isHtml,
        });

        // Mark focus parameter as processed
        setFocusProcessed(true);
      }
    }
  }, [focusParam, activePanelContent, focusProcessed]);

  if (!activeSessionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-200/50 dark:border-gray-700/30"
          >
            <svg
              className="w-10 h-10 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200"
          >
            No Active Session
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-gray-600 dark:text-gray-400"
          >
            Create or select a session to view detailed information and tool results in this
            workspace.
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          {isViewingPlan ? (
            <PlanView onBack={() => setActivePanelContent(null)} />
          ) : activePanelContent ? (
            <WorkspaceDetail />
          ) : (
            <WorkspaceContent />
          )}
        </div>

        <AnimatePresence>{isReplayActive && <ReplayControlPanel />}</AnimatePresence>
      </div>

      {/* Fullscreen modal for focused files */}
      <FullscreenModal data={fullscreenData} onClose={() => setFullscreenData(null)} />
    </>
  );
};
