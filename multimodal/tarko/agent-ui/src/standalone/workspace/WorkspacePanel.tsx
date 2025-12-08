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
import { FiExternalLink, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
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
      window.open(navItem.link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900/20 animate-in fade-in duration-200">
      {/* Elegant Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/60 dark:border-gray-700/60 bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-gray-900/50 dark:to-gray-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Title with subtle accent */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
              {navItem.title}
            </h3>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenInNewTab}
            className="group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-95"
            title="Open in new tab"
          >
            <FiExternalLink className="w-3.5 h-3.5 transition-transform group-hover:rotate-12" />
            <span className="hidden sm:inline">Open</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-gradient-to-br from-gray-50/30 to-white/50 dark:from-gray-900/30 dark:to-gray-800/50">
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
    if (
      focusParam &&
      workspaceDisplayState.toolContent &&
      workspaceDisplayState.toolContent.type === 'file' &&
      !focusProcessed
    ) {
      const filePath =
        workspaceDisplayState.toolContent.arguments?.path ||
        workspaceDisplayState.toolContent.title;
      const fileName = filePath.split('/').pop() || filePath;
      const content =
        workspaceDisplayState.toolContent.arguments?.content ||
        workspaceDisplayState.toolContent.source;

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
        <div className="flex-1 overflow-hidden">{renderWorkspaceContent()}</div>

        <AnimatePresence>{isReplayActive && <ReplayControlPanel />}</AnimatePresence>
      </div>

      <FullscreenModal data={fullscreenData} onClose={() => setFullscreenData(null)} />
    </>
  );
};
