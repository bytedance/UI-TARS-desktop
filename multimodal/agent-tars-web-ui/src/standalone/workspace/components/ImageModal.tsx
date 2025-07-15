import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { ZoomedImageData } from '../types/panelContent';

interface ImageModalProps {
  imageData: ZoomedImageData | null;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageData, onClose }) => {
  if (!imageData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
          className="relative max-w-[95vw] max-h-[95vh]"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute -top-2 -right-2 p-2 rounded-full bg-gray-900/90 text-white hover:bg-gray-800 shadow-lg"
            aria-label="Close"
          >
            <FiX size={24} />
          </button>
          <img
            src={imageData.src}
            alt={imageData.alt || 'Zoomed image'}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
