import React from 'react';
import { Modal, ModalContent, ModalBody } from '@nextui-org/react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose }) => {
  const handleVideoLoad = () => {
    // Video loaded handler
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      classNames={{
        base: 'bg-black/95 backdrop-blur-xl',
        body: 'p-0',
      }}
    >
      <ModalContent>
        <ModalBody>
          <div className="flex items-center justify-center min-h-screen">
            <div className="bg-gray-900 w-[90%] h-[90%] h-400 rounded-lg overflow-hidden">
              <video
                autoPlay
                controls
                className="w-full h-full bg-gray-200"
                onLoadedData={handleVideoLoad}
              >
                <source
                  src="https://github.com/user-attachments/assets/5bfed86f-7201-4fe2-b33b-d93a591c35c8"
                  type="video/mp4"
                />
              </video>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
