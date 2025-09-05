import { useRef, useEffect, useState, useCallback } from 'react';

// Constants
const SCROLL_CHECK_DELAY = 100; // ms - delay for DOM updates

interface UseScrollToBottomOptions {
  threshold?: number; // Distance from bottom to consider "at bottom"
  dependencies?: React.DependencyList; // Dependencies to trigger re-check (e.g., messages)
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
 * - No automatic scrolling behavior
 */
export const useScrollToBottom = ({
  threshold = 100,
  dependencies = [],
}: UseScrollToBottomOptions = {}): UseScrollToBottomReturn => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Check if container is at bottom
  const checkIsAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight <= threshold;
  }, [threshold]);

  // Smooth scroll to bottom
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceFromBottom <= threshold;
    
    // Show button when NOT at bottom and there's content to scroll
    const shouldShow = !atBottom && scrollHeight > clientHeight;
    setShowScrollToBottom(shouldShow);
  }, [threshold]);

  // Delayed scroll check helper
  const scheduleScrollCheck = useCallback(() => {
    const timer = setTimeout(() => {
      handleScroll();
    }, SCROLL_CHECK_DELAY);
    return timer;
  }, [handleScroll]);

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
