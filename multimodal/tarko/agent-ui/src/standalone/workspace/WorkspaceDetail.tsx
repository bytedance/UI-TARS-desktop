import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCode, FiEye } from 'react-icons/fi';
import { useAtom } from 'jotai';
import { useSession } from '@/common/hooks/useSession';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { ResearchReportRenderer } from './renderers/ResearchReportRenderer';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { RawModeRenderer } from './components/RawModeRenderer';
import { ImageModal } from './components/ImageModal';
import { FullscreenModal } from './components/FullscreenModal';
import { StandardPanelContent, ZoomedImageData, FullscreenFileData } from './types/panelContent';
import { FileDisplayMode } from './types';
import { ToggleSwitchProps } from './renderers/generic/components';
import { workspaceDisplayModeAtom, WorkspaceDisplayMode } from '@/common/state/atoms/workspace';
import { rawToolMappingAtom } from '@/common/state/atoms/rawEvents';
import { getFileTypeInfo, getDefaultDisplayMode } from './utils/fileTypeUtils';

/**
 * All renderers
 */
import { ImageRenderer } from './renderers/ImageRenderer';
import { LinkRenderer } from './renderers/LinkRenderer';
import { LinkReaderRenderer } from './renderers/LinkReaderRenderer';
import { SearchResultRenderer } from './renderers/SearchResultRenderer';
import { CommandResultRenderer } from './renderers/CommandResultRenderer';
import { ScriptResultRenderer } from './renderers/ScriptResultRenderer';
import { BrowserResultRenderer } from './renderers/BrowserResultRenderer';
import { BrowserControlRenderer } from './renderers/BrowserControlRenderer';
import { PlanViewerRenderer } from './renderers/PlanViewerRenderer';
import { GenericResultRenderer } from './renderers/generic/GenericResultRenderer';
import { DeliverableRenderer } from './renderers/DeliverableRenderer';
import { DiffRenderer } from './renderers/DiffRenderer';
import { FileResultRenderer } from './renderers/FileResultRenderer';
import { TabbedFilesRenderer } from './renderers/TabbedFilesRenderer';

/**
 * Registry of content renderers that handle StandardPanelContent directly
 */
const CONTENT_RENDERERS: Record<
  string,
  React.FC<{
    panelContent: StandardPanelContent;
    onAction?: (action: string, data: unknown) => void;
    displayMode?: FileDisplayMode;
  }>
> = {
  image: ImageRenderer,
  link: LinkRenderer,
  link_reader: LinkReaderRenderer,
  search_result: SearchResultRenderer,
  command_result: CommandResultRenderer,
  script_result: ScriptResultRenderer,
  browser_result: BrowserResultRenderer,
  browser_vision_control: BrowserControlRenderer,
  plan: PlanViewerRenderer,
  research_report: ResearchReportRenderer,
  json: GenericResultRenderer,
  deliverable: DeliverableRenderer,
  file_result: FileResultRenderer,
  diff_result: DiffRenderer,
  file: FileResultRenderer,
  tabbed_files: TabbedFilesRenderer,
};

/**
 * WorkspaceDetail Component - Displays details of a single tool result or report
 */
export const WorkspaceDetail: React.FC = () => {
  const { activePanelContent, setActivePanelContent, activeSessionId } = useSession();
  const { isReplayMode } = useReplayMode();
  const [workspaceDisplayMode, setWorkspaceDisplayMode] = useAtom(workspaceDisplayModeAtom);
  const [rawToolMapping] = useAtom(rawToolMappingAtom);
  const [zoomedImage, setZoomedImage] = useState<ZoomedImageData | null>(null);
  const [fullscreenData, setFullscreenData] = useState<FullscreenFileData | null>(null);

  // Determine initial display mode based on content type and streaming state
  const getInitialDisplayMode = (): FileDisplayMode => {
    if (
      !activePanelContent ||
      activePanelContent.type !== 'file' ||
      !activePanelContent.arguments?.path
    ) {
      return 'rendered';
    }

    return getDefaultDisplayMode(
      activePanelContent.arguments.path,
      Boolean(activePanelContent.isStreaming),
    );
  };

  const [displayMode, setDisplayMode] = useState<FileDisplayMode>(getInitialDisplayMode());

  // Auto-switch HTML files from source to rendered when streaming completes
  useEffect(() => {
    if (
      !activePanelContent ||
      activePanelContent.type !== 'file' ||
      !activePanelContent.arguments?.path
    ) {
      return;
    }

    const { isHtml } = getFileTypeInfo(activePanelContent.arguments.path);

    // When streaming completes for HTML files, auto-switch to rendered mode
    if (isHtml && !activePanelContent.isStreaming && displayMode === 'source') {
      const timer = setTimeout(() => {
        setDisplayMode('rendered');
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [activePanelContent?.isStreaming, displayMode]);

  // Reset display mode when switching to different content
  useEffect(() => {
    setDisplayMode(getInitialDisplayMode());
  }, [activePanelContent?.toolCallId, activePanelContent?.timestamp]);

  if (!activePanelContent) {
    return null;
  }

  // Type assertion with runtime validation
  const panelContent = activePanelContent as StandardPanelContent;

  // Get raw tool mapping for current tool call
  const getCurrentToolMapping = () => {
    if (!activeSessionId || !panelContent.toolCallId) return null;
    const sessionMappings = rawToolMapping[activeSessionId];
    return sessionMappings?.[panelContent.toolCallId] || null;
  };

  // Handle research reports and deliverables
  if (isResearchReportType(panelContent)) {
    return (
      <ResearchReportRenderer
        panelContent={panelContent}
        onAction={handleContentAction}
        displayMode={displayMode}
      />
    );
  }

  // Handle content actions
  const handleContentAction = (action: string, data: unknown) => {
    switch (action) {
      case 'zoom':
        if (isZoomData(data)) {
          setZoomedImage({ src: data.src, alt: data.alt });
        }
        break;
      case 'fullscreen':
        if (isFullscreenData(data)) {
          setFullscreenData(data);
        }
        break;
    }
  };

  // Handle back navigation
  const handleBack = () => {
    setActivePanelContent(null);
  };

  // Handle fullscreen from header
  const handleFullscreen = () => {
    if (
      panelContent.type === 'file' &&
      panelContent.arguments?.path &&
      panelContent.arguments?.content
    ) {
      const { fileName, isMarkdown, isHtml } = getFileTypeInfo(panelContent.arguments.path);

      setFullscreenData({
        content: panelContent.arguments.content,
        fileName,
        filePath: panelContent.arguments.path,
        displayMode,
        isMarkdown,
        isHtml,
      });
    }
  };

  // Check if the toggle button needs to be displayed
  const shouldShowToggle = () => {
    if (workspaceDisplayMode === 'raw') return false;
    if (panelContent.type === 'file' && panelContent.arguments?.path) {
      return getFileTypeInfo(panelContent.arguments.path).isRenderableFile;
    }
    return false;
  };

  // Check if fullscreen button should be displayed
  const shouldShowFullscreen = () => {
    if (workspaceDisplayMode === 'raw') return false;
    if (panelContent.type === 'file' && panelContent.arguments?.path) {
      return getFileTypeInfo(panelContent.arguments.path).isRenderableFile;
    }
    return false;
  };

  // Check if workspace toggle should be displayed
  const shouldShowWorkspaceToggle = () => {
    return Boolean(panelContent.toolCallId && getCurrentToolMapping());
  };

  // Get switch configuration
  const getToggleConfig = (): ToggleSwitchProps<FileDisplayMode> | undefined => {
    if (panelContent.type === 'file' && panelContent.arguments?.path) {
      const { isHtml, isMarkdown } = getFileTypeInfo(panelContent.arguments.path);

      if (isHtml) {
        return {
          leftLabel: 'Source Code',
          rightLabel: 'Preview',
          leftIcon: <FiCode size={12} />,
          rightIcon: <FiEye size={12} />,
          value: displayMode,
          leftValue: 'source',
          rightValue: 'rendered',
          onChange: setDisplayMode,
        };
      }

      if (isMarkdown) {
        return {
          leftLabel: 'Source',
          rightLabel: 'Rendered',
          leftIcon: <FiCode size={12} />,
          rightIcon: <FiEye size={12} />,
          value: displayMode,
          leftValue: 'source',
          rightValue: 'rendered',
          onChange: setDisplayMode,
        };
      }
    }
  };

  // Render content based on workspace display mode
  const renderContent = () => {
    if (workspaceDisplayMode === 'raw') {
      const toolMapping = getCurrentToolMapping();
      if (toolMapping) {
        return <RawModeRenderer toolMapping={toolMapping} />;
      } else {
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-400 mb-2">⚠️</div>
              <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
                No Raw Data Available
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This content doesn't have associated tool call data.
              </p>
            </div>
          </div>
        );
      }
    }

    // Default interaction mode rendering
    const RendererComponent = CONTENT_RENDERERS[panelContent.type] || GenericResultRenderer;

    return (
      <RendererComponent
        panelContent={panelContent}
        onAction={handleContentAction}
        displayMode={displayMode}
      />
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-full flex flex-col bg-white dark:bg-gray-900/20"
      >
        <WorkspaceHeader
          panelContent={panelContent}
          onBack={handleBack}
          showToggle={shouldShowToggle()}
          toggleConfig={getToggleConfig()}
          showFullscreen={shouldShowFullscreen()}
          onFullscreen={handleFullscreen}
          workspaceDisplayMode={workspaceDisplayMode}
          onWorkspaceDisplayModeChange={setWorkspaceDisplayMode}
          showWorkspaceToggle={shouldShowWorkspaceToggle()}
          isReplayMode={isReplayMode}
        />
        <div className="flex-1 overflow-auto p-4 pt-2">{renderContent()}</div>
      </motion.div>

      <ImageModal imageData={zoomedImage} onClose={() => setZoomedImage(null)} />

      <FullscreenModal data={fullscreenData} onClose={() => setFullscreenData(null)} />
    </>
  );
};

function isResearchReportType(content: StandardPanelContent): boolean {
  return (
    content.type === 'research_report' ||
    content.type === 'deliverable' ||
    Boolean(content.toolCallId?.startsWith('final-answer'))
  );
}

function isZoomData(data: unknown): data is { src: string; alt?: string } {
  return data !== null && typeof data === 'object' && 'src' in data && typeof data.src === 'string';
}

function isFullscreenData(data: unknown): data is FullscreenFileData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'content' in data &&
    'fileName' in data &&
    'filePath' in data &&
    'displayMode' in data &&
    'isMarkdown' in data &&
    typeof (data as FullscreenFileData).content === 'string' &&
    typeof (data as FullscreenFileData).fileName === 'string' &&
    typeof (data as FullscreenFileData).filePath === 'string'
  );
}
