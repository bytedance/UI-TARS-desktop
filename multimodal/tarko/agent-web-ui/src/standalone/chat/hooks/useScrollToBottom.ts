import { useRef, useEffect, useState, useCallback } from 'react';

// Constants
const SCROLL_CHECK_DELAY = 100; // ms - delay for DOM updates
const SCROLL_ANIMATION_DELAY = 300; // ms - delay to account for smooth scroll animation

interface UseScrollToBottomOptions {
  threshold?: number; // Distance from bottom to consider "at bottom"
  dependencies?: React.DependencyList; // Dependencies to trigger re-check (e.g., messages)
  sessionId?: string; // Session ID to reset state on session change
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
 * - No automatic scrolling behavior
 */
export const useScrollToBottom = ({
  threshold = 100,
  dependencies = [],
  sessionId,
}: UseScrollToBottomOptions = {}): UseScrollToBottomReturn => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
    return distanceFromBottom <= Math.max(threshold, 1);
  }, [threshold]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Don't update state during programmatic scrolling to prevent flickering
    if (isScrollingRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceFromBottom <= Math.max(threshold, 1);
    
    // Only show button when:
    // 1. NOT at bottom
    // 2. There's scrollable content (scrollHeight > clientHeight)
    const hasScrollableContent = scrollHeight > clientHeight + 10; // Add small buffer
    const shouldShow = !atBottom && hasScrollableContent;
    
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
    
    // Reset scrolling flag after animation completes and hide button
    setTimeout(() => {
      isScrollingRef.current = false;
      // Hide button immediately when reaching bottom after scroll
      setShowScrollToBottom(false);
    }, SCROLL_ANIMATION_DELAY);
  }, [threshold]);

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

  return {
    messagesContainerRef,
    messagesEndRef,
    showScrollToBottom,
    scrollToBottom,
  };
};
