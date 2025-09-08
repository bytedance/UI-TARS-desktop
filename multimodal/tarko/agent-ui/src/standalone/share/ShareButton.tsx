import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiShare2 } from 'react-icons/fi';
import { Tooltip } from '@mui/material';
import { useSession } from '@/common/hooks/useSession';
import { ShareModal } from './ShareModal';
import { getTooltipProps } from '@/common/components/TooltipConfig';

interface ShareButtonProps {
  variant?: 'default' | 'navbar';
  disabled?: boolean;
}

/**
 * Share button component - displayed at the bottom of chat panel or in navigation bar
 *
 * Design principles:
 * - Clean monochrome icon, consistent with the overall black-white-gray style
 * - Circular button design, maintaining elegant visual effect
 * - Fine hover and click animations, enhancing interactive experience
 * - Support different display variants to adapt to different positions
 */
export const ShareButton: React.FC<ShareButtonProps> = ({
  variant = 'default',
  disabled = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { activeSessionId } = useSession();

  const tooltipProps = getTooltipProps('bottom');

  const handleOpenModal = () => {
    if (disabled) return;
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  if (!activeSessionId) {
    return null;
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
          {...tooltipProps}
        >
          <span>
            <motion.button
              whileHover={disabled ? {} : { scale: 1.05 }}
              whileTap={disabled ? {} : { scale: 0.95 }}
              onClick={handleOpenModal}
              className={`p-2 rounded-full transition-all duration-200 ${
                disabled
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100/40 dark:hover:bg-gray-700/40'
              }`}
            >
              <FiShare2 size={16} />
            </motion.button>
          </span>
        </Tooltip>

        {!disabled && (
          <ShareModal isOpen={isModalOpen} onClose={handleCloseModal} sessionId={activeSessionId} />
        )}
      </>
    );
  }

  // Default variant (original styling)
  return (
    <>
      <Tooltip
        title={
          disabled
            ? 'Share unavailable during agent execution. Please wait for agent execution to complete'
            : 'Share this conversation'
        }
        {...tooltipProps}
      >
        <span>
          <motion.button
            whileHover={disabled ? {} : { scale: 1.05 }}
            whileTap={disabled ? {} : { scale: 0.95 }}
            onClick={handleOpenModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-3xl text-xs border shadow-sm transition-all duration-200 ${
              disabled
                ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 border-gray-200/50 dark:border-gray-600/30 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border-gray-200/70 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/70'
            }`}
          >
            <FiShare2
              className={
                disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'
              }
              size={14}
            />
            <span>Share</span>
          </motion.button>
        </span>
      </Tooltip>

      {!disabled && (
        <ShareModal isOpen={isModalOpen} onClose={handleCloseModal} sessionId={activeSessionId} />
      )}
    </>
  );
};
