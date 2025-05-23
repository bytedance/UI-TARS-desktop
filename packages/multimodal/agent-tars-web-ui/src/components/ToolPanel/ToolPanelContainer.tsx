import React from 'react';
import { useSessionStore } from '../../store';
import { ReplayController } from '../ReplayController';
import { ResultTimeline } from './ResultTimeline';
import { ResultViewer } from './ResultViewer';
import { CollapsedPanel } from './CollapsedPanel';

interface ToolPanelContainerProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const ToolPanelContainer: React.FC<ToolPanelContainerProps> = ({
  isCollapsed,
  onToggleCollapse,
}) => {
  const { activeSessionId, toolResults } = useSessionStore();
  const activeResults = activeSessionId ? toolResults[activeSessionId] || [] : [];
  const [showReplayControls, setShowReplayControls] = React.useState(false);

  // When session changes, update replay controls visibility
  React.useEffect(() => {
    setShowReplayControls(!!activeSessionId && activeResults.length > 0);
  }, [activeSessionId, activeResults.length]);

  if (isCollapsed) {
    return (
      <CollapsedPanel onToggleCollapse={onToggleCollapse} showReplayControls={showReplayControls} />
    );
  }

  if (!activeSessionId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm p-4 text-center">
        No active session
      </div>
    );
  }

  return (
    <>
      <ResultViewer onToggleCollapse={onToggleCollapse} />
      <ReplayController isVisible={showReplayControls} />
    </>
  );
};
