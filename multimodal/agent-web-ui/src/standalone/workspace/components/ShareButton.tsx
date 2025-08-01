import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiShare2, FiCheck, FiCopy } from 'react-icons/fi';
import { useReplayMode } from '@/common/hooks/useReplayMode';

interface ShareButtonProps {
  fileName: string;
  title?: string;
  className?: string;
}

/**
 * ShareButton - A reusable share button component for HTML and Markdown files
 *
 * Only shows in replay mode and generates share URLs with focus parameter
 */
export const ShareButton: React.FC<ShareButtonProps> = ({
  fileName,
  title = 'Share this file',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const { isReplayMode } = useReplayMode();

  // Only show in replay mode
  if (!isReplayMode) {
    return null;
  }

  // Check if file is HTML or Markdown
  const isShareableFile = fileName.toLowerCase().match(/\.(html?|md|markdown)$/);
  if (!isShareableFile) {
    return null;
  }

  const handleShare = async () => {
    try {
      // Create URL with focus parameter
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('focus', fileName);
      const shareUrl = currentUrl.toString();

      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to share:', error);
      // Fallback to manual URL construction and clipboard
      try {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('focus', fileName);
        await navigator.clipboard.writeText(currentUrl.toString());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (clipboardError) {
        console.error('Failed to copy to clipboard:', clipboardError);
      }
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleShare}
      className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${className}`}
      title={title}
    >
      {copied ? <FiCheck size={16} className="text-green-500" /> : <FiShare2 size={16} />}
    </motion.button>
  );
};
