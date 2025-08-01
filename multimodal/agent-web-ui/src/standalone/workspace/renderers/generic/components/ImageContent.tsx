import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';

interface ImageContentProps {
  imageUrl: string;
  alt?: string;
  name?: string;
}

export const ImageContent: React.FC<ImageContentProps> = ({ imageUrl, alt = 'Image', name }) => {
  return (
    <div className="relative group p-4">
      <img
        src={imageUrl}
        alt={alt}
        className="max-w-full h-auto mx-auto rounded-lg border border-gray-200/50 dark:border-gray-700/30"
      />
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
        <motion.a
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 bg-gray-800/70 hover:bg-gray-800/90 rounded-full text-white"
          title="Open in new tab"
        >
          <FiArrowRight size={16} />
        </motion.a>
      </div>
      {name && name !== 'JSON_DATA' && (
        <div className="text-center mt-2 text-sm text-gray-500 dark:text-gray-400">{name}</div>
      )}
    </div>
  );
};
