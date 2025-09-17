import React, { useState } from 'react';
import { FiShare2 } from 'react-icons/fi';
import { useSession } from '@/common/hooks/useSession';
import { ShareModal } from './ShareModal';
import { Tooltip, MenuItem } from '@tarko/ui';

interface ShareButtonProps {
  variant?: 'default' | 'navbar' | 'mobile';
  disabled?: boolean;
  onShare?: () => void;
  showModal?: boolean; // For external modal management
}

/**
 * Share button component - displayed at the bottom of chat panel or in navigation bar
 */
export const ShareButton: React.FC<ShareButtonProps> = ({
  variant = 'default',
  disabled = false,
  onShare,
  showModal,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { activeSessionId } = useSession();

  const handleOpenModal = () => {
    console.log('ShareButton handleOpenModal called', { disabled, activeSessionId, variant });
    if (disabled) return;

    if (onShare) {
      // External modal management
      console.log('Using external modal management');
      onShare();
    } else {
      // Internal modal management
      console.log('Using internal modal management');
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  if (!activeSessionId) {
    return null;
  }

  // Mobile variant for menu items
  if (variant === 'mobile') {
    return (
      <>
        <MenuItem onClick={handleOpenModal} icon={<FiShare2 size={16} />} disabled={disabled}>
          Share
        </MenuItem>

        {!onShare && (
          <ShareModal isOpen={isModalOpen} onClose={handleCloseModal} sessionId={activeSessionId} />
        )}
      </>
    );
  }

  // Navbar variant has different styling
  if (variant === 'navbar') {
    return (
      <>
        <Tooltip
          title={
            disabled
              ? 'Share unavailable during agent execution. Please wait for agent execution to complete'
              : 'Share this conversation'
          }
          placement="bottom-right"
        >
          <span>
            <button
              onClick={handleOpenModal}
              className={`p-2 rounded-full transition-all duration-200 ${
                disabled
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100/40 dark:hover:bg-gray-700/40 hover:scale-105 active:scale-95'
              }`}
            >
              <FiShare2 size={16} />
            </button>
          </span>
        </Tooltip>

        {!onShare && (
          <ShareModal isOpen={isModalOpen} onClose={handleCloseModal} sessionId={activeSessionId} />
        )}
      </>
    );
  }

  return (
    <>
      <Tooltip
        title={
          disabled
            ? 'Share unavailable during agent execution. Please wait for agent execution to complete'
            : 'Share this conversation'
        }
        placement="bottom"
      >
        <span>
          <button
            onClick={handleOpenModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-3xl text-xs border shadow-sm transition-all duration-200 ${
              disabled
                ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 border-gray-200/50 dark:border-gray-600/30 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border-gray-200/70 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/70 hover:scale-105 active:scale-95'
            }`}
          >
            <FiShare2
              className={
                disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'
              }
              size={14}
            />
            <span>Share</span>
          </button>
        </span>
      </Tooltip>

      {!onShare && (
        <ShareModal isOpen={isModalOpen} onClose={handleCloseModal} sessionId={activeSessionId} />
      )}
    </>
  );
};
