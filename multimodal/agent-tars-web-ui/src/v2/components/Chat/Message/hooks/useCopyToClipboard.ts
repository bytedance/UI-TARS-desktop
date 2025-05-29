import { useState } from 'react';

/**
 * Hook for copying text to clipboard with feedback state
 * 
 * @returns Object containing copy state and copy function
 */
export const useCopyToClipboard = () => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return { isCopied, copyToClipboard };
};
