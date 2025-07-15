import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input } from '@nextui-org/react';
import { FiCopy, FiCheck, FiX, FiTwitter } from 'react-icons/fi';
import { ShowcaseItem } from '../../../services/dataProcessor';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ShowcaseItem | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, item }) => {
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const shareUrl = `${window.location.origin}/showcase/${item.id}`;

  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Could not copy text: ', err);
      });
  };

  const handleTwitterShare = () => {
    // Enhanced Twitter share with hashtags and via parameters
    const tweetText = encodeURIComponent(`Check out "${item.title}" on Agent TARS`);
    const tweetUrl = encodeURIComponent(shareUrl);
    const hashtags = encodeURIComponent('AgentTARS,AI,Multimodal');
    const via = 'agent_tars';

    const twitterShareUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}&hashtags=${hashtags}&via=${via}`;
    window.open(twitterShareUrl, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      classNames={{
        base: 'bg-black/95 backdrop-blur-xl',
        header: 'border-b border-white/10',
        backdrop: 'bg-black/70 backdrop-blur-md',
        wrapper: 'backdrop-blur-md',
      }}
      hideCloseButton
    >
      <ModalContent>
        <ModalHeader className="flex flex-row justify-between items-center">
          <h3 className="text-xl font-semibold text-white">Share "{item.title}"</h3>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={onClose}
            className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20"
          >
            <FiX size={18} />
          </Button>
        </ModalHeader>

        <ModalBody>
          <div className="py-4">
            <p className="text-sm text-white/80 mb-4">
              Share this showcase item with a direct link
            </p>

            <div className="flex gap-2 mb-6">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1"
                classNames={{
                  input: 'text-white',
                }}
              />
              <Button
                color="primary"
                isIconOnly
                onClick={handleCopyLink}
                className="bg-gradient-to-r from-[#6D28D9] to-[#7C3AED]"
              >
                {copied ? <FiCheck /> : <FiCopy />}
              </Button>
            </div>

            <Button
              color="primary"
              startContent={<FiTwitter />}
              onClick={handleTwitterShare}
              className="bg-[#1DA1F2] hover:bg-[#1a94e0] w-full"
            >
              Share on Twitter
            </Button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
