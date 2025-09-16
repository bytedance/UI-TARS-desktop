import { useState, useCallback } from 'react';

/**
 * Hook for handling copy to clipboard functionality with feedback state
 * @param timeout - Duration in milliseconds to show copied state (default: 2000)
 * @returns Object with copied state and copy function
 */
export function useCopyToClipboard(timeout = 2000) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), timeout);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    },
    [timeout],
  );

  return { isCopied, copyToClipboard };
}
