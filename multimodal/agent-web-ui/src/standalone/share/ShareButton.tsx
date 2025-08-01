import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiShare2 } from 'react-icons/fi';
import { useSession } from '@/common/hooks/useSession';
import { ShareModal } from './ShareModal';

interface ShareButtonProps {
  variant?: 'default' | 'navbar';
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
export const ShareButton: React.FC<ShareButtonProps> = ({ variant = 'default' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { activeSessionId } = useSession();

  const handleOpenModal = () => {
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
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleOpenModal}
          className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100/40 dark:hover:bg-gray-700/40 rounded-full transition-all duration-200"
          title="Share this conversation"
        >
          <FiShare2 size={16} />
        </motion.button>

        <ShareModal isOpen={isModalOpen} onClose={handleCloseModal} sessionId={activeSessionId} />
      </>
    );
  }

  // Default variant (original styling)
  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleOpenModal}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-3xl text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/30 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-all duration-200"
        title="Share this conversation"
      >
        <FiShare2 className="text-gray-500 dark:text-gray-400" size={14} />
        <span>Share</span>
      </motion.button>

      <ShareModal isOpen={isModalOpen} onClose={handleCloseModal} sessionId={activeSessionId} />
    </>
  );
};
