import { useRef, useEffect, useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { replayStateAtom } from '@/common/state/atoms/replay';

// Constants
const SCROLL_CHECK_DELAY = 100; // ms - delay for DOM updates
const SCROLL_ANIMATION_DELAY = 300; // ms - delay to account for smooth scroll animation
const REPLAY_AUTO_SCROLL_DELAY = 50; // ms - delay for auto-scroll in replay mode

interface UseScrollToBottomOptions {
  threshold?: number; // Distance from bottom to consider "at bottom"
  dependencies?: React.DependencyList; // Dependencies to trigger re-check (e.g., messages)
  sessionId?: string; // Session ID to reset state on session change
  isReplayMode?: boolean; // Whether we're in replay mode
}

interface UseScrollToBottomReturn {
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>; // Keep for compatibility
  showScrollToBottom: boolean;
  scrollToBottom: () => void;
}

/**
 * Custom hook for managing scroll-to-bottom indicator in chat
 * 
 * Features:
 * - Shows scroll-to-bottom indicator when user has scrolled up
 * - Manual scroll to bottom functionality
 * - Properly handles session switching
 * - Auto-scroll behavior ONLY in replay mode
 */
export const useScrollToBottom = ({
  threshold = 100,
  dependencies = [],
  sessionId,
  isReplayMode = false,
}: UseScrollToBottomOptions = {}): UseScrollToBottomReturn => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const isScrollingRef = useRef(false);
  const lastSessionIdRef = useRef<string | undefined>(sessionId);
  const replayState = useAtomValue(replayStateAtom);
  const lastEventIndexRef = useRef<number>(-1);

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

  // Smooth scroll to bottom
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    isScrollingRef.current = true;
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
    
    // Reset scrolling flag after animation completes and force check scroll position
    setTimeout(() => {
      isScrollingRef.current = false;
      // Force check scroll position to ensure button hides when at bottom
      handleScroll();
    }, SCROLL_ANIMATION_DELAY);
  }, []);

  // Auto-scroll to bottom for replay mode
  const autoScrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    isScrollingRef.current = true;
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
    
    // Reset scrolling flag after animation completes
    setTimeout(() => {
      isScrollingRef.current = false;
    }, SCROLL_ANIMATION_DELAY);
  }, []);

  // Delayed scroll check helper
  const scheduleScrollCheck = useCallback(() => {
    const timer = setTimeout(() => {
      handleScroll();
    }, SCROLL_CHECK_DELAY);
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
      }, SCROLL_CHECK_DELAY * 2);
      
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

  // Auto-scroll in replay mode when event index changes (including jumps)
  useEffect(() => {
    if (!isReplayMode || !replayState.isActive) {
      lastEventIndexRef.current = -1;
      return;
    }

    // Auto-scroll whenever the event index changes in replay mode
    // This covers both sequential playback and manual jumps/seeks
    if (replayState.currentEventIndex !== lastEventIndexRef.current) {
      lastEventIndexRef.current = replayState.currentEventIndex;
      
      // Schedule auto-scroll after DOM updates
      const timer = setTimeout(() => {
        autoScrollToBottom();
      }, REPLAY_AUTO_SCROLL_DELAY);
      
      return () => clearTimeout(timer);
    }
  }, [isReplayMode, replayState.isActive, replayState.currentEventIndex, autoScrollToBottom]);

  return {
    messagesContainerRef,
    messagesEndRef,
    showScrollToBottom,
    scrollToBottom,
  };
};
