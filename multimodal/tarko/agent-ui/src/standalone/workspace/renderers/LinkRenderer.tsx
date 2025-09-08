import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { motion } from 'framer-motion';
import { FiExternalLink } from 'react-icons/fi';
import { FileDisplayMode } from '../types';

interface LinkRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

/**
 * Renders link content with external icon
 */
export const LinkRenderer: React.FC<LinkRendererProps> = ({ panelContent }) => {
  // Extract link data from panelContent
  const linkData = extractLinkData(panelContent);

  if (!linkData) {
    return <div className="text-gray-500 italic">Link URL missing</div>;
  }

  const { url, title } = linkData;

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.01, x: 2 }}
      className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/30 text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 shadow-sm group"
    >
      <FiExternalLink
        className="flex-shrink-0 text-gray-400 group-hover:text-accent-500 transition-colors"
        size={18}
      />

      <div className="flex-1 truncate">
        <div className="font-medium">{title || url}</div>
        {title && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{url}</div>}
      </div>

      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <FiExternalLink size={14} className="text-gray-400" />
      </div>
    </motion.a>
  );
};

function extractLinkData(panelContent: StandardPanelContent): {
  url: string;
  title?: string;
} | null {
  try {
    // Try arguments first
    if (panelContent.arguments) {
      const { url, title } = panelContent.arguments;

      if (url && typeof url === 'string') {
        return {
          url,
          title: title ? String(title) : panelContent.title,
        };
      }
    }

    // Try to extract from source
    if (typeof panelContent.source === 'object' && panelContent.source !== null) {
      const sourceObj = panelContent.source as any;
      const { url, title } = sourceObj;

      if (url && typeof url === 'string') {
        return {
          url,
          title: title ? String(title) : panelContent.title,
        };
      }
    }

    // Check if source is a direct URL
    if (typeof panelContent.source === 'string' && panelContent.source.startsWith('http')) {
      return {
        url: panelContent.source,
        title: panelContent.title,
      };
    }

    return null;
  } catch (error) {
    console.warn('Failed to extract link data:', error);
    return null;
  }
}
