import React, { useState } from 'react';
import { Modal, ModalContent, Button, Chip } from '@nextui-org/react';
import { ShowcaseItem } from '../../data/showcaseData';
import { BrowserShell } from './BrowserShell';

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
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentUrl, setCurrentUrl] = useState('');
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // Reset loading state when modal opens with new item
  React.useEffect(() => {
    if (isOpen && item) {
      setIsLoading(true);
      setCurrentUrl(item.link);
    }
  }, [isOpen, item?.id]);

  if (!item) return null;

  const handleShare = () => {
    if (onShare && item) {
      onClose(); // 先关闭预览
      onShare(item); // 然后打开分享模态框
    }
  };

  const handleExpand = () => {
    if (onExpand && item) {
      onClose(); // 先关闭预览
      onExpand(item); // 然后展开
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
        <div className="w-full h-[90vh] bg-background">
          <BrowserShell
            url={currentUrl}
            loading={isLoading}
            onNavigate={handleNavigate}
            onClose={onClose}
            onShare={handleShare}
            onExpand={onExpand ? handleExpand : undefined}
            title={item.title}
          >
            <iframe
              ref={iframeRef}
              src={item.link}
              className="w-full h-full"
              onLoad={() => setIsLoading(false)}
              title={item.title}
              frameBorder="0"
              style={{
                borderRadius: '0 0 12px 12px',
                backgroundColor: '#fff',
              }}
            />
          </BrowserShell>
        </div>
      </ModalContent>
    </Modal>
  );
};
