import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from '@/common/hooks/useSession';
import { ToolResultRenderer } from './renderers/ToolResultRenderer';
import { ResearchReportRenderer } from './renderers/ResearchReportRenderer';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { ImageModal } from './components/ImageModal';
import { FullscreenModal } from './components/FullscreenModal';
import { standardizeContent } from './utils/contentStandardizer';
import { StandardPanelContent, ZoomedImageData, FullscreenFileData } from './types/panelContent';

/**
 * WorkspaceDetail Component - Displays details of a single tool result or report
 */
export const WorkspaceDetail: React.FC = () => {
  const { activePanelContent, setActivePanelContent } = useSession();
  const [zoomedImage, setZoomedImage] = useState<ZoomedImageData | null>(null);
  const [fullscreenData, setFullscreenData] = useState<FullscreenFileData | null>(null);

  if (!activePanelContent) {
    return null;
  }

  // Type assertion with runtime validation
  const panelContent = activePanelContent as StandardPanelContent;

  // Handle research reports and deliverables
  if (isResearchReportType(panelContent)) {
    return (
      <ResearchReportRenderer
        content={getReportContent(panelContent)}
        title={panelContent.title || 'Research Report'}
        isStreaming={panelContent.isStreaming}
      />
    );
  }

  // Handle tool result content actions
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

  // Get standardized content
  const standardizedContent = standardizeContent(panelContent);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-full flex flex-col bg-white dark:bg-gray-900/20"
      >
        <WorkspaceHeader panelContent={panelContent} onBack={handleBack} />
        <div className="flex-1 overflow-auto p-4">
          <ToolResultRenderer content={standardizedContent} onAction={handleContentAction} />
        </div>
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

function getReportContent(content: StandardPanelContent): string {
  if (typeof content.source === 'string') {
    return content.source;
  }
  return JSON.stringify(content.source, null, 2);
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
