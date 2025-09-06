import { useRef, useCallback } from 'react';
import { useScrollState } from './useScrollState';
import { useUserMessageAutoScroll } from './useUserMessageAutoScroll';
import { useReplayAutoScroll } from './useReplayAutoScroll';
import { UseScrollToBottomOptions, UseScrollToBottomReturn } from './types';

// Constants
const SCROLL_ANIMATION_DELAY = 300; // ms - delay to account for smooth scroll animation

/**
 * Custom hook for managing scroll-to-bottom functionality in chat
 *
 * Features:
 * - Shows scroll-to-bottom indicator when user has scrolled up
 * - Manual scroll to bottom functionality
 * - Properly handles session switching
 * - Auto-scroll behavior in replay mode
 * - Auto-scroll for user messages in normal mode
 *
 * Refactored for better maintainability, type safety, and performance
 */
export const useScrollToBottom = ({
  threshold = 100,
  dependencies = [],
  sessionId,
  isReplayMode = false,
  autoScrollOnUserMessage = true,
}: UseScrollToBottomOptions = {}): UseScrollToBottomReturn => {
  const messagesEndRef = useRef<HTMLDivElement>(null); // Keep for compatibility

  // Use scroll state management hook
  const { messagesContainerRef, showScrollToBottom, isScrollingRef, handleScroll } = useScrollState(
    {
      threshold,
      dependencies,
      sessionId,
    },
  );

  // Unified scroll to bottom function (eliminates DRY violation)
  const scrollToBottom = useCallback(
    (source: 'manual' | 'auto' = 'manual') => {
      const container = messagesContainerRef.current;
      if (!container) return;

      isScrollingRef.current = true;

      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });

      // Reset scrolling flag after animation completes
      setTimeout(() => {
        isScrollingRef.current = false;
        // Force check scroll position for manual scrolls to ensure button hides
        if (source === 'manual') {
          handleScroll();
        }
      }, SCROLL_ANIMATION_DELAY);
    },
    [handleScroll],
  );

  // Auto-scroll callback for sub-hooks
  const handleAutoScroll = useCallback(() => {
    scrollToBottom('auto');
  }, [scrollToBottom]);

  // Manual scroll callback
  const handleManualScroll = useCallback(() => {
    scrollToBottom('manual');
  }, [scrollToBottom]);

  // Use replay auto-scroll hook
  useReplayAutoScroll({
    isReplayMode,
    onAutoScroll: handleAutoScroll,
  });

  // Use user message auto-scroll hook
  useUserMessageAutoScroll({
    dependencies,
    isEnabled: autoScrollOnUserMessage,
    isReplayMode,
    onAutoScroll: handleAutoScroll,
  });

  return {
    messagesContainerRef,
    messagesEndRef,
    showScrollToBottom,
    scrollToBottom: handleManualScroll,
  };
};
