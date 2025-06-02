import React from 'react';
import { useSession } from '../../hooks/useSession';
import { WorkspaceContent } from './WorkspaceContent';
import { WorkspaceDetail } from './WorkspaceDetail';
import { PlanView } from './PlanView';
import { useReplay } from '../../hooks/useReplay';
import { TimelineSlider } from '../Replay/TimelineSlider';
import { ReplayControls } from '../Replay/ReplayControls';
import { usePro } from '../../hooks/usePro';
import { AnimatePresence, motion } from 'framer-motion';
import './Workspace.css';

/**
 * WorkspacePanel Component - Container for workspace content
 */
export const WorkspacePanel: React.FC = () => {
  const { activeSessionId, activePanelContent, setActivePanelContent } = useSession();
  const { replayState } = useReplay();
  const isProMode = usePro();

  // 检查是否在查看计划，同时确保只有在 Pro 模式下才允许查看计划
  const isViewingPlan = isProMode && activePanelContent?.type === 'plan';
  const isReplayActive = replayState.isActive;

  if (!activeSessionId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm p-4 text-center">
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-gray-400 dark:text-gray-500"
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
          </div>
          <h3 className="text-lg font-medium mb-2">No active session</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create or select a session to start working
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        {isViewingPlan ? (
          <PlanView onBack={() => setActivePanelContent(null)} />
        ) : activePanelContent ? (
          <WorkspaceDetail />
        ) : (
          <WorkspaceContent />
        )}
      </div>

      {/* Refined replay controls with monochromatic styling */}
      <AnimatePresence>
        {isReplayActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="p-4 border-t border-gray-100/40 dark:border-gray-700/20 bg-gray-50/50 dark:bg-gray-900/30"
          >
            {/* Timeline slider */}
            <TimelineSlider />

            {/* Controls centered below the timeline */}
            <div className="flex justify-center mt-3">
              <ReplayControls />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
