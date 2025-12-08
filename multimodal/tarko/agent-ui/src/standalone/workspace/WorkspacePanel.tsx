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

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900/20 animate-in fade-in duration-200">
      <div className="md:px-4 md:py-3 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {navItem.title}
          </h3>
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
    console.log('renderWorkspaceContent called, current mode:', workspaceDisplayState.mode);
    
    switch (workspaceDisplayState.mode) {
      case 'embed-frame':
        console.log('Rendering embed frame:', workspaceDisplayState.embedFrame?.title);
        return workspaceDisplayState.embedFrame ? (
          <EmbedFrameView navItem={workspaceDisplayState.embedFrame} />
        ) : null;
      
      case 'tool-content':
        console.log('Rendering tool content:', workspaceDisplayState.toolContent?.title);
        return workspaceDisplayState.toolContent ? <WorkspaceDetail /> : null;
      
      default:
        console.log('Rendering default WorkspaceContent');
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