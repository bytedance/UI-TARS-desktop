import React from 'react';
import { useSession } from '@/common/hooks/useSession';
import { WorkspaceContent } from './WorkspaceContent';
import { WorkspaceDetail } from './WorkspaceDetail';
import { PlanView } from './PlanView';
import { useReplay } from '@/common/hooks/useReplay';
import { TimelineSlider } from '@/standalone/replay/TimelineSlider';
import { ReplayControls } from '@/standalone/replay/ReplayControls';
import { AnimatePresence, motion } from 'framer-motion';
import './Workspace.css';

/**
 * WorkspacePanel Component - Container for workspace content
 */
export const WorkspacePanel: React.FC = () => {
  const { activeSessionId, activePanelContent, setActivePanelContent } = useSession();
  const { replayState } = useReplay();

  // 检查是否在查看计划，同时确保只有在 Pro 模式下才允许查看计划
  const isViewingPlan = activePanelContent?.type === 'plan';
  const isReplayActive = replayState.isActive;

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
    <div className="flex flex-col h-full bg-gray-50/80 dark:bg-gray-900/30">
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

      {/* Refined replay controls with modern styling */}
      <AnimatePresence>
        {isReplayActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
            className="p-5 border-t border-gray-100/40 dark:border-gray-700/20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
          >
            {/* Timeline slider */}
            <TimelineSlider />

            {/* Controls centered below the timeline */}
            <div className="flex justify-center mt-4">
              <ReplayControls />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
