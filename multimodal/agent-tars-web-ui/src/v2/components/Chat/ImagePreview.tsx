import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMaximize2, FiImage } from 'react-icons/fi';
import { ChatCompletionContentPart } from '@multimodal/agent-interface';
import { Dialog } from '@headlessui/react';

interface ImagePreviewProps {
  image: ChatCompletionContentPart;
  onRemove: () => void;
}

/**
 * ImagePreview Component - Displays an uploaded image with enhanced styling and zoom functionality
 *
 * Design principles:
 * - Elegant thumbnail with improved visual hierarchy
 * - Click to zoom functionality for better image viewing
 * - Smooth animations and hover effects
 * - Clear remove action with visual feedback
 */
export const ImagePreview: React.FC<ImagePreviewProps> = ({ image, onRemove }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  if (image.type !== 'image_url' || !image.image_url) {
    return null;
  }

  const handleImageClick = () => {
    setIsZoomed(true);
  };

  const handleCloseZoom = () => {
    setIsZoomed(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="relative group cursor-pointer"
      >
        {/* Enhanced thumbnail container */}
        <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-gray-200/60 dark:border-gray-700/40 hover:border-accent-300 dark:hover:border-accent-600 transition-all duration-200 shadow-sm hover:shadow-md">
          <img
            src={image.image_url.url}
            alt="Image preview"
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            onClick={handleImageClick}
            onLoad={() => setImageLoaded(true)}
          />

          {/* Loading state */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <FiImage className="text-gray-400 dark:text-gray-500" size={20} />
            </div>
          )}

          {/* Hover overlay with zoom hint */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1, opacity: 1 }}
              className="bg-white/90 dark:bg-gray-800/90 rounded-full p-2 backdrop-blur-sm"
            >
              <FiMaximize2 className="text-gray-700 dark:text-gray-300" size={16} />
            </motion.div>
          </div>

          {/* Enhanced remove button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md border-2 border-white dark:border-gray-800 z-10"
            title="Remove image"
          >
            <FiX size={14} />
          </motion.button>
        </div>

        {/* Image info tooltip */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-gray-800 dark:bg-gray-900 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
            Click to zoom
          </div>
        </div>
      </motion.div>

      {/* Zoom modal */}
      <Dialog open={isZoomed} onClose={handleCloseZoom} className="relative z-[9999]">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />

        {/* Modal content */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="relative max-w-[90vw] max-h-[90vh] outline-none">
            {/* Close button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleCloseZoom}
              className="absolute -top-10 -right-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors z-10"
            >
              <FiX size={24} />
            </motion.button>

            {/* Zoomed image */}
            <motion.img
              src={image.image_url.url}
              alt="Zoomed preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', duration: 0.3 }}
            />
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
};
