import { useRef, useEffect, useState, useCallback } from 'react';

interface UseScrollToBottomOptions {
  threshold?: number; // Distance from bottom to consider "at bottom"
  dependencies?: any[]; // Dependencies to trigger re-check (e.g., messages)
}

interface UseScrollToBottomReturn {
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
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
    
    const atBottom = checkIsAtBottom();
    const shouldShow = !atBottom;
    
    // Only update if state actually changed
    setShowScrollToBottom(prev => prev !== shouldShow ? shouldShow : prev);
  }, [checkIsAtBottom]);

  // Set up scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check after a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      handleScroll();
    }, 100);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [handleScroll]);

  // Also check when content changes (messages update)
  useEffect(() => {
    const timer = setTimeout(() => {
      handleScroll();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [handleScroll, ...dependencies]);

  return {
    messagesContainerRef,
    messagesEndRef,
    showScrollToBottom,
    scrollToBottom,
  };
};
