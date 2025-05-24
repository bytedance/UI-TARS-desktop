import React, { useState } from 'react';
import { useSession } from '../../hooks/useSession';
import { ResultViewer } from './ResultViewer';
import { CollapsedPanel } from './CollapsedPanel';

interface WorkspacePanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * 工作区面板组件
 * 显示工具结果和工作区内容
 */
export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({
  isCollapsed,
  onToggleCollapse,
}) => {
  const { activeSessionId, toolResults } = useSession();
  const activeResults = activeSessionId ? toolResults[activeSessionId] || [] : [];
  const [showReplayControls, setShowReplayControls] = useState(false);

  // 当会话改变时，更新回放控件可见性
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

  return <ResultViewer onToggleCollapse={onToggleCollapse} />;
};
