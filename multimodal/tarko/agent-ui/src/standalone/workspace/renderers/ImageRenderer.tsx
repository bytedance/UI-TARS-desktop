import React from 'react';
import { BrowserShell } from '@tarko/ui';
import { StandardPanelContent } from '../types/panelContent';
import { motion } from 'framer-motion';
import { FiDownload, FiZoomIn } from 'react-icons/fi';
import { FileDisplayMode } from '../types';

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
  const imageData = extractImageData(panelContent);

  if (!imageData) {
    return <div className="text-gray-500 italic">Image data missing</div>;
  }

  const { src, mimeType, name } = imageData;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = name || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoom = () => {
    if (onAction) {
      onAction('zoom', { src, alt: name });
    }
  };

  const isScreenshot =
    name?.toLowerCase().includes('screenshot') || name?.toLowerCase().includes('browser');

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
      <div className="relative group md:text-base text-sm">
        <img
          src={src}
          alt={name || 'Image'}
          className="w-full h-auto object-contain md:max-h-[70vh] max-h-48 rounded-lg"
        />
        {actionButtons}
      </div>
    );
  }

  return (
    <div className="relative group max-w-full">
      <motion.div whileHover={{ scale: 1.01 }} className="relative">
        <img
          src={src}
          alt={name || 'Image'}
          className="md:max-h-[70vh] max-h-60 w-full h-auto object-contain rounded-lg mx-auto"
        />
        {actionButtons}
      </motion.div>
    </div>
  );
};

function extractImageData(panelContent: StandardPanelContent): {
  src: string;
  mimeType: string;
  name: string;
} | null {
  try {
    // Try arguments first
    if (panelContent.arguments) {
      const { imageData, mimeType = 'image/png', name } = panelContent.arguments;

      if (imageData && typeof imageData === 'string') {
        return {
          src: `data:${mimeType};base64,${imageData}`,
          mimeType,
          name: String(name || panelContent.title || 'Image'),
        };
      }
    }

    // Handle ChatCompletionContentPart[] array format (for environment_input events)
    if (Array.isArray(panelContent.source)) {
      const imageContent = panelContent.source.find(
        (item): item is { type: 'image_url'; image_url: { url: string } } =>
          typeof item === 'object' &&
          item !== null &&
          'type' in item &&
          item.type === 'image_url' &&
          'image_url' in item &&
          typeof item.image_url === 'object' &&
          item.image_url !== null &&
          'url' in item.image_url &&
          typeof item.image_url.url === 'string',
      );

      if (imageContent && imageContent.image_url) {
        return {
          src: imageContent.image_url.url,
          mimeType: 'image/jpeg',
          name: panelContent.title || 'Environment Screenshot',
        };
      }
    }

    // Try to extract from source
    if (typeof panelContent.source === 'object' && panelContent.source !== null) {
      const sourceObj = panelContent.source as any;
      const { imageData, mimeType = 'image/png', name } = sourceObj;

      if (imageData && typeof imageData === 'string') {
        return {
          src: `data:${mimeType};base64,${imageData}`,
          mimeType,
          name: String(name || panelContent.title || 'Image'),
        };
      }
    }

    /**
     * Check if source is a data URL or direct URL
     * Handle cases like:
     * {
     *   "type": "image",
     *   "source": "data:image/webp;base64,UklGRvgpAA...",
     *   "title": "Image",
     *   "timestamp": 1756996184111
     * }
     */
    if (typeof panelContent.source === 'string') {
      if (panelContent.source.startsWith('data:')) {
        // Extract MIME type from data URL
        const mimeTypeMatch = panelContent.source.match(/^data:([^;]+);/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';

        return {
          src: panelContent.source,
          mimeType,
          name: panelContent.title || 'Image',
        };
      } else if (panelContent.source.startsWith('http')) {
        return {
          src: panelContent.source,
          mimeType: 'image/png',
          name: panelContent.title || 'Image',
        };
      }
    }

    return null;
  } catch (error) {
    console.warn('Failed to extract image data:', error);
    return null;
  }
}
