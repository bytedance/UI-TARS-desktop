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
import { WorkspaceNavItem } from '@tarko/interface';
import { EmbedFrameRenderer } from './renderers/EmbedFrameRenderer';
import './Workspace.css';

function getFocusParam(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('focus');
}

function shouldShowFullscreen(filePath: string): boolean {
  return getFileTypeInfo(filePath).isRenderableFile;
}

interface EmbedFrameViewProps {
  navItem: WorkspaceNavItem;
}

const EmbedFrameView: React.FC<EmbedFrameViewProps> = ({ navItem }) => {
  const panelContent = {
    type: 'embed_frame',
    source: navItem.link,
    title: navItem.title,
    timestamp: Date.now(),
    link: navItem.link,
  };

  const handleOpenInNewTab = () => {
    if (navItem.link) {
      window.open(navItem.link, '_blank');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900/20 animate-in fade-in duration-200">
      <div className="md:px-4 md:py-3 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {navItem.title}
            </h3>
            <button
              onClick={handleOpenInNewTab}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Open in new tab"
            >
              <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <EmbedFrameRenderer panelContent={panelContent} />
      </div>
    </div>
  );
};

export const WorkspacePanel: React.FC = () => {
  const { activeSessionId, workspaceDisplayState, setWorkspaceDisplayState } = useSession();
  const { replayState } = useReplay();
  const [fullscreenData, setFullscreenData] = React.useState<FullscreenFileData | null>(null);
  const [focusProcessed, setFocusProcessed] = React.useState(false);

  const isReplayActive = replayState.isActive;
  const focusParam = getFocusParam();

  useEffect(() => {
    if (focusParam && workspaceDisplayState.toolContent && workspaceDisplayState.toolContent.type === 'file' && !focusProcessed) {
      const filePath = workspaceDisplayState.toolContent.arguments?.path || workspaceDisplayState.toolContent.title;
      const fileName = filePath.split('/').pop() || filePath;
      const content = workspaceDisplayState.toolContent.arguments?.content || workspaceDisplayState.toolContent.source;

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
          displayMode: 'rendered',
          isMarkdown,
          isHtml,
        });

        setFocusProcessed(true);
      }
    }
  }, [focusParam, workspaceDisplayState.toolContent, focusProcessed]);

  // Auto-clear embed frame when tool content is shown
  useEffect(() => {
    if (workspaceDisplayState.mode === 'tool-content' && workspaceDisplayState.toolContent) {
      // This is already handled by the unified state management
      // No need for additional logic here
    }
  }, [workspaceDisplayState]);

  const renderWorkspaceContent = () => {
    switch (workspaceDisplayState.mode) {
      case 'embed-frame':
        return workspaceDisplayState.embedFrame ? (
          <EmbedFrameView navItem={workspaceDisplayState.embedFrame} />
        ) : null;
      
      case 'tool-content':
        return workspaceDisplayState.toolContent ? <WorkspaceDetail /> : null;
      
      default:
        return <WorkspaceContent />;
    }
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          {renderWorkspaceContent()}
        </div>

        <AnimatePresence>{isReplayActive && <ReplayControlPanel />}</AnimatePresence>
      </div>

      <FullscreenModal data={fullscreenData} onClose={() => setFullscreenData(null)} />
    </>
  );
};