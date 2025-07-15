import React, { useState, useRef } from 'react';
import { Modal, ModalContent, Button, Chip } from '@nextui-org/react';
import { ShowcaseItem } from '../../../services/dataProcessor';
import { BrowserShell } from './BrowserShell';
import { ShareModal } from './ShareModal';
import { toggleFullscreen } from '../utils/fullscreenUtils';

interface ShowcasePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  item: ShowcaseItem | null;
  onShare?: (item: ShowcaseItem) => void;
  onExpand?: (item: ShowcaseItem) => void;
}

export const ShowcasePreview: React.FC<ShowcasePreviewProps> = ({
  isOpen,
  onClose,
  item,
  onShare,
  onExpand,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && item) {
      setIsLoading(true);
      setCurrentUrl(item.link);
    }
  }, [isOpen, item?.id]);

  if (!item) return null;

  const handleShare = () => {
    if (onShare && item) {
      onClose();
      onShare(item);
    } else {
      setIsShareModalOpen(true);
    }
  };

  const handleExpand = async () => {
    if (onExpand && item) {
      onClose();
      onExpand(item);
    } else {
      // 使用系统全屏 API
      await toggleFullscreen(modalRef.current || undefined);
    }
  };

  const handleNavigate = (type: 'back' | 'forward' | 'refresh') => {
    if (!iframeRef.current) return;

    if (type === 'back' && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.history.back();
    } else if (type === 'forward' && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.history.forward();
    } else if (type === 'refresh') {
      setIsLoading(true);
      iframeRef.current.src = currentUrl;
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="5xl"
        classNames={{
          base: 'mx-auto my-auto max-w-[90%] max-h-[90%]',
          wrapper: 'items-center justify-center',
          body: 'p-0',
        }}
      >
        <ModalContent>
          <div ref={modalRef} className="w-full h-[90vh] bg-background">
            <BrowserShell
              url={currentUrl}
              loading={isLoading}
              onNavigate={handleNavigate}
              onClose={onClose}
              onShare={handleShare}
              onExpand={handleExpand}
              title={item.title}
            >
              <iframe
                ref={iframeRef}
                src={currentUrl}
                className="w-full h-full"
                onLoad={() => setIsLoading(false)}
                title={item.title}
                frameBorder="0"
                style={{
                  borderRadius: '0 0 12px 12px',
                }}
              />
            </BrowserShell>
          </div>
        </ModalContent>
      </Modal>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        item={item}
      />
    </>
  );
};
