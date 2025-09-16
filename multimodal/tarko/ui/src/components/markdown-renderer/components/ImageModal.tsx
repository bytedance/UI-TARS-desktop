import React from 'react';
import { Dialog, DialogPanel } from '../../basic';

interface ImageModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ isOpen, imageSrc, onClose }) => {
  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth={false} fullWidth={false}>
      <DialogPanel className="max-w-[90vw] max-h-[90vh] outline-none">
        <img
          src={imageSrc || ''}
          alt="Enlarged view"
          className="max-w-full max-h-[85vh] object-contain rounded-lg cursor-pointer"
          onClick={onClose}
        />
      </DialogPanel>
    </Dialog>
  );
};
