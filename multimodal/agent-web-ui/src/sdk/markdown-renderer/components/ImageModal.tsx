import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { motion } from 'framer-motion';

interface ImageModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
}

/**
 * Image preview modal component
 */
export const ImageModal: React.FC<ImageModalProps> = ({ isOpen, imageSrc, onClose }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset loading state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setImageLoaded(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[9999]">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />

      {/* Image container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="max-w-[90vw] max-h-[90vh] outline-none">
          <motion.img
            src={imageSrc || ''}
            alt="Enlarged view"
            onLoad={() => setImageLoaded(true)}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: imageLoaded ? 1 : 0.3,
              scale: imageLoaded ? 1 : 0.95,
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', duration: 0.3 }}
            onClick={onClose}
          />
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
