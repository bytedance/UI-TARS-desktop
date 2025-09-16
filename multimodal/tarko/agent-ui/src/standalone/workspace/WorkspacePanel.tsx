import React, { useEffect } from 'react';
import { useSession } from '@/common/hooks/useSession';
import { WorkspaceContent } from './WorkspaceContent';
import { WorkspaceDetail } from './WorkspaceDetail';

import { useReplay } from '@/common/hooks/useReplay';
import { ReplayControlPanel } from '@/standalone/replay/ReplayControlPanel';
import { FullscreenModal } from './components/FullscreenModal';
import { AnimatePresence } from 'framer-motion';
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



  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          {activePanelContent ? (
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
