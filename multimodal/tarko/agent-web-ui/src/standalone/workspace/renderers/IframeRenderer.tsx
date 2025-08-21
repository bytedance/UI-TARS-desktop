import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { motion } from 'framer-motion';
import { FiExternalLink } from 'react-icons/fi';
import { FileDisplayMode } from '../types';

interface IframeRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

/**
 * Renders iframe content for external panels
 */
export const IframeRenderer: React.FC<IframeRendererProps> = ({ panelContent }) => {
  // Extract iframe URL from panelContent
  const iframeUrl = extractIframeUrl(panelContent);

  if (!iframeUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 mb-2">⚠️</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
            Invalid URL
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The provided URL is not valid for iframe display.
          </p>
        </div>
      </div>
    );
  }

  const handleOpenInNewTab = () => {
    window.open(iframeUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with URL and actions */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/30 bg-gray-50/50 dark:bg-gray-800/30">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {iframeUrl}
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleOpenInNewTab}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-all duration-200"
          title="Open in new tab"
        >
          <FiExternalLink size={14} />
          Open
        </motion.button>
      </div>

      {/* Iframe container */}
      <div className="flex-1 relative">
        <iframe
          src={iframeUrl}
          className="w-full h-full border-0"
          title={panelContent.title || 'External Panel'}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
          loading="lazy"
        />
      </div>
    </div>
  );
};

function extractIframeUrl(panelContent: StandardPanelContent): string | null {
  try {
    // Check source field for URL
    if (typeof panelContent.source === 'string') {
      const url = panelContent.source.trim();
      if (isValidUrl(url)) {
        return url;
      }
    }

    // Check arguments for URL
    if (panelContent.arguments && typeof panelContent.arguments === 'object') {
      const args = panelContent.arguments as any;
      if (typeof args.url === 'string' && isValidUrl(args.url)) {
        return args.url;
      }
      if (typeof args.panel === 'string' && isValidUrl(args.panel)) {
        return args.panel;
      }
    }

    return null;
  } catch (error) {
    console.warn('Failed to extract iframe URL:', error);
    return null;
  }
}

function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
