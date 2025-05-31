import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiShare2 } from 'react-icons/fi';
import { useSession } from '../../hooks/useSession';
import { ShareModal } from './ShareModal';

/**
 * 分享按钮组件 - 显示在聊天面板底部
 *
 * 设计原则:
 * - 简洁的单色图标，与整体黑白灰风格保持一致
 * - 圆形按钮设计，保持优雅的视觉效果
 * - 精细的悬停和点击动画，提升交互体验
 */
export const ShareButton: React.FC = () => {
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
