import { useRef, useEffect, useState, useCallback } from 'react';

interface UseAutoScrollOptions {
  threshold?: number; // Distance from bottom to consider "at bottom"
  debounceMs?: number; // Debounce time for user interaction detection
  autoScrollDelay?: number; // Delay before auto-scrolling after user stops interacting
  dependencies?: any[]; // Dependencies to trigger auto-scroll (e.g., messages)
}

interface UseAutoScrollReturn {
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  showScrollToBottom: boolean;
  scrollToBottom: () => void;
  isUserScrolling: boolean;
}

/**
 * Custom hook for managing intelligent auto-scroll behavior in chat
 * 
 * Features:
 * - Auto-scrolls to bottom when new content appears
 * - Detects user manual scrolling and respects it
 * - Shows scroll-to-bottom indicator when user has scrolled up
 * - Automatically resumes auto-scroll after user inactivity
 */
export const useAutoScroll = ({
  threshold = 100,
  debounceMs = 1000,
  autoScrollDelay = 2000,
  dependencies = [],
}: UseAutoScrollOptions = {}): UseAutoScrollReturn => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  const userInteractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTopRef = useRef<number>(0);
  const isAutoScrollingRef = useRef(false);

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
    
    isAutoScrollingRef.current = true;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
    
    // Reset auto-scrolling flag after animation
    setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 500);
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || isAutoScrollingRef.current) return;
    
    const currentScrollTop = container.scrollTop;
    const atBottom = checkIsAtBottom();
    
    setIsAtBottom(atBottom);
    setShowScrollToBottom(!atBottom);
    
    // Detect user scrolling (not programmatic)
    const isUserInitiated = Math.abs(currentScrollTop - lastScrollTopRef.current) > 1;
    
    if (isUserInitiated) {
      setIsUserScrolling(true);
      
      // Clear existing timeout
      if (userInteractionTimeoutRef.current) {
        clearTimeout(userInteractionTimeoutRef.current);
      }
      
      // Set timeout to resume auto-scroll after inactivity
      userInteractionTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
        // If still at bottom after timeout, hide the indicator
        if (checkIsAtBottom()) {
          setShowScrollToBottom(false);
        }
      }, autoScrollDelay);
    }
    
    lastScrollTopRef.current = currentScrollTop;
  }, [checkIsAtBottom, autoScrollDelay]);

  // Immediate scroll handler for real-time updates
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    let scrollTimeout: NodeJS.Timeout;
    
    const immediateHandleScroll = () => {
      handleScroll();
    };
    
    const debouncedHandleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, debounceMs);
    };
    
    // Use immediate handler for better responsiveness
    container.addEventListener('scroll', immediateHandleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', immediateHandleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [handleScroll, debounceMs]);

  // Auto-scroll to bottom when new content appears (if user hasn't scrolled up)
  useEffect(() => {
    if (!isUserScrolling && isAtBottom) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [isUserScrolling, isAtBottom, scrollToBottom, ...dependencies]);

  // Initial scroll to bottom when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (userInteractionTimeoutRef.current) {
        clearTimeout(userInteractionTimeoutRef.current);
      }
    };
  }, []);

  return {
    messagesContainerRef,
    messagesEndRef,
    showScrollToBottom,
    scrollToBottom,
    isUserScrolling,
  };
};
