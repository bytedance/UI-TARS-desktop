import { useState } from 'react';
import { copyToClipboard as copyToClipboardUtil } from '@/common/utils/clipboard';

/**
 * Hook for copying text to clipboard with feedback state
 *
 * @returns Object containing copy state and copy function
 */
export const useCopyToClipboard = () => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await copyToClipboardUtil(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return { isCopied, copyToClipboard };
};
