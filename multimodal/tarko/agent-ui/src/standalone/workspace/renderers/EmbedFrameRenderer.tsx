import React from 'react';
import type { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';

interface EmbedFrameRendererProps {
  panelContent: StandardPanelContent;
  displayMode?: FileDisplayMode;
}

export const EmbedFrameRenderer: React.FC<EmbedFrameRendererProps> = ({
  panelContent,
  displayMode = 'rendered',
}) => {
  const src = typeof panelContent.source === 'string' ? panelContent.source : (panelContent as any).link || '';

  if (!src) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 mb-2">⚠️</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
            No URL Provided
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This embed frame doesn't have a valid URL.
          </p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={src}
      className="w-full h-full border-0"
      style={{ width: '1280px', height: '958px' }}
      title={panelContent.title}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      loading="lazy"
    />
  );
};