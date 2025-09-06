import { useCallback, useEffect, useRef, useState } from 'react';

interface UseScrollStateOptions {
  threshold?: number;
  dependencies?: React.DependencyList;
  sessionId?: string;
}

interface UseScrollStateReturn {
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  showScrollToBottom: boolean;
  isScrollingRef: React.MutableRefObject<boolean>;
  handleScroll: () => void;
}

/**
 * Custom hook for managing scroll state detection
 * Handles scroll position tracking and scroll-to-bottom button visibility
 */
export const useScrollState = ({
  threshold = 100,
  dependencies = [],
  sessionId,
}: UseScrollStateOptions = {}): UseScrollStateReturn => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const isScrollingRef = useRef(false);
  const lastSessionIdRef = useRef<string | undefined>(sessionId);

  // Check if container is at bottom
  const checkIsAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Account for sub-pixel differences and rounding errors
    return distanceFromBottom <= Math.max(threshold, 3);
  }, [threshold]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Don't update state during programmatic scrolling to prevent flickering
    if (isScrollingRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // More robust bottom detection with better tolerance for rounding errors
    const atBottom = distanceFromBottom <= Math.max(threshold, 3);

    // Only show button when:
    // 1. NOT at bottom
    // 2. There's scrollable content (scrollHeight > clientHeight)
    // 3. User has actually scrolled up (not just a minor difference)
    const hasScrollableContent = scrollHeight > clientHeight + 5;
    const hasScrolledUp = distanceFromBottom > 10; // Must be meaningfully away from bottom
    const shouldShow = !atBottom && hasScrollableContent && hasScrolledUp;

    setShowScrollToBottom(shouldShow);
  }, [threshold]);

  // Delayed scroll check helper
  const scheduleScrollCheck = useCallback(() => {
    const timer = setTimeout(() => {
      handleScroll();
    }, 100); // SCROLL_CHECK_DELAY
    return timer;
  }, [handleScroll]);

  // Reset state when session changes
  useEffect(() => {
    if (sessionId !== lastSessionIdRef.current) {
      lastSessionIdRef.current = sessionId;
      setShowScrollToBottom(false);
      isScrollingRef.current = false;

      // Schedule a check after session content loads
      const timer = setTimeout(() => {
        handleScroll();
      }, 200); // Double delay for session changes

      return () => clearTimeout(timer);
    }
  }, [sessionId, handleScroll]);

  // Set up scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check
    const timer = scheduleScrollCheck();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [handleScroll, scheduleScrollCheck]);

  // Check when content changes (messages update)
  useEffect(() => {
    const timer = scheduleScrollCheck();
    return () => clearTimeout(timer);
  }, [scheduleScrollCheck, ...dependencies]);

  return {
    messagesContainerRef,
    showScrollToBottom,
    isScrollingRef,
    handleScroll,
  };
};
