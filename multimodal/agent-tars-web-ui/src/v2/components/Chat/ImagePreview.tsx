import React from 'react';
import { motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { ChatCompletionContentPart } from '@multimodal/agent-interface';

interface ImagePreviewProps {
  image: ChatCompletionContentPart;
  onRemove: () => void;
}

/**
 * ImagePreview Component - Displays an uploaded image with a remove button
 *
 * Design principles:
 * - Clean, thumbnail representation of uploaded images
 * - Easy removal with a clear delete button
 * - Consistent styling with the overall UI design language
 * - Subtle animations for improved user experience
 */
export const ImagePreview: React.FC<ImagePreviewProps> = ({ image, onRemove }) => {
  if (image.type !== 'image_url' || !image.image_url) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative rounded-lg overflow-hidden group"
    >
      <div className="relative w-20 h-20">
        <img
          src={image.image_url.url}
          alt="Preview"
          className="w-full h-full object-cover rounded-lg border border-gray-200/50 dark:border-gray-700/30"
        />

        {/* Remove button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onRemove}
          className="absolute -top-1 -right-1 bg-gray-800/80 dark:bg-gray-900/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-gray-700/30"
        >
          <FiX size={12} />
        </motion.button>

        {/* Overlay effect on hover */}
        <div className="absolute inset-0 bg-black/10 dark:bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
      </div>
    </motion.div>
  );
};
