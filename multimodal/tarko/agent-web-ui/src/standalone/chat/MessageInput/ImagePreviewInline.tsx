import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { ChatCompletionContentPart } from '@tarko/agent-interface';

interface ImagePreviewInlineProps {
  images: ChatCompletionContentPart[];
  onRemoveImage: (index: number) => void;
  className?: string;
}

/**
 * ImagePreviewInline - Shared inline image preview component
 *
 * Used by both ChatInput and MessageInputField for consistent image preview behavior
 */
export const ImagePreviewInline: React.FC<ImagePreviewInlineProps> = ({
  images,
  onRemoveImage,
  className = '',
}) => {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className={`px-5 pt-3 pb-2 ${className}`}>
      <AnimatePresence>
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative group cursor-pointer"
            >
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-200">
                <img
                  src={image.type === 'image_url' ? image.image_url?.url : ''}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveImage(index);
                  }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-gray-600 hover:bg-gray-700 dark:bg-gray-400 dark:hover:bg-gray-300 text-white dark:text-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm z-10"
                  title="Remove image"
                >
                  <FiX size={10} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
};
