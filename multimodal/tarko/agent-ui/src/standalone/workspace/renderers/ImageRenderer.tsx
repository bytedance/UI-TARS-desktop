import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { motion } from 'framer-motion';
import { FiDownload, FiZoomIn } from 'react-icons/fi';
import { BrowserShell } from './BrowserShell';
import { FileDisplayMode } from '../types';
import { commonExtractors } from '@/common/utils/panelContentExtractor';
import { downloadFromUrl } from '@/common/utils/downloadUtils';
import { isScreenshotImage } from '@/common/utils/stringUtils';

interface ImageRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

/**
 * Renders image content with zoom and download actions
 */
export const ImageRenderer: React.FC<ImageRendererProps> = ({ panelContent, onAction }) => {
  // Extract image data from panelContent
  const imageData = commonExtractors.imageData(panelContent);

  if (!imageData) {
    return <div className="text-gray-500 italic">Image data missing</div>;
  }

  const { src, mimeType, name } = imageData;

  const handleDownload = () => {
    const filename = name || 'image';
    downloadFromUrl(src, filename);
  };

  const handleZoom = () => {
    if (onAction) {
      onAction('zoom', { src, alt: name });
    }
  };

  const isScreenshot = name ? isScreenshotImage(name) : false;

  const actionButtons = (
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleZoom}
        className="p-2 bg-gray-800/70 hover:bg-gray-800/90 rounded-full text-white"
        title="Zoom"
      >
        <FiZoomIn size={16} />
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleDownload}
        className="p-2 bg-gray-800/70 hover:bg-gray-800/90 rounded-full text-white"
        title="Download"
      >
        <FiDownload size={16} />
      </motion.button>
    </div>
  );

  if (isScreenshot) {
    return (
      <div className="relative group">
        <BrowserShell title={name || 'Browser Screenshot'}>
          <img
            src={src}
            alt={name || 'Image'}
            className="w-full h-auto object-contain max-h-[70vh]"
          />
        </BrowserShell>
        {actionButtons}
      </div>
    );
  }

  return (
    <div className="relative group">
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-2 border border-gray-200/50 dark:border-gray-700/30 shadow-sm"
      >
        <div className="relative">
          <img
            src={src}
            alt={name || 'Image'}
            className="max-h-[70vh] object-contain rounded-lg mx-auto"
          />

          {actionButtons}
        </div>
      </motion.div>
    </div>
  );
};
