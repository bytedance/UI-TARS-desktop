/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useEffect, useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { replayStateAtom } from '@/common/state/atoms/replay';

// Constants
const SCROLL_CHECK_DELAY = 100; // ms - delay for DOM updates
const REPLAY_AUTO_SCROLL_DELAY = 50; // ms - delay for auto-scroll in replay mode

interface UseScrollToBottomOptions {
  threshold?: number; // Distance from bottom to consider "at bottom"
  dependencies?: React.DependencyList; // Dependencies to trigger re-check (e.g., messages)
  sessionId?: string; // Session ID to reset state on session change
  isReplayMode?: boolean; // Whether we're in replay mode
  autoScrollOnUserMessage?: boolean; // Whether to auto-scroll when user sends message
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
  autoScrollOnUserMessage = true,
}: UseScrollToBottomOptions = {}): UseScrollToBottomReturn => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const lastSessionIdRef = useRef<string | undefined>(sessionId);
  const replayState = useAtomValue(replayStateAtom);
  const lastEventIndexRef = useRef<number>(-1);
  const lastMessageCountRef = useRef<number>(0);
  const lastUserMessageIdRef = useRef<string | null>(null);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Simple, robust bottom detection
    const atBottom = distanceFromBottom <= threshold;
    const hasScrollableContent = scrollHeight > clientHeight + 10;

    setShowScrollToBottom(!atBottom && hasScrollableContent);
  }, [threshold]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
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
        scrollToBottom();
      }, REPLAY_AUTO_SCROLL_DELAY);

      return () => clearTimeout(timer);
    }
  }, [isReplayMode, replayState.isActive, replayState.currentEventIndex, scrollToBottom]);

  // Auto-scroll for user messages in normal mode
  useEffect(() => {
    if (!autoScrollOnUserMessage || isReplayMode || !Array.isArray(dependencies[0])) {
      return;
    }

    const messages = dependencies[0] as any[];
    const currentMessageCount = messages.length;

    // Only check for new user messages when message count increases
    if (currentMessageCount <= lastMessageCountRef.current) {
      lastMessageCountRef.current = currentMessageCount;
      return;
    }

    // Get all user messages and check if we have a new one
    const allUserMessages = messages
      .flatMap((group: any) => group?.messages || [group])
      .filter((msg: any) => msg?.role === 'user');

    const latestUserMessage = allUserMessages[allUserMessages.length - 1];

    // Auto-scroll ONLY if:
    // 1. We have a new user message
    // 2. It's the LAST user message (most recent one)
    // 3. It has the isLocalMessage flag (indicating it was just sent by user)
    if (
      latestUserMessage?.id &&
      latestUserMessage.id !== lastUserMessageIdRef.current &&
      latestUserMessage.isLocalMessage
    ) {
      lastUserMessageIdRef.current = latestUserMessage.id;

      const timer = setTimeout(scrollToBottom, SCROLL_CHECK_DELAY);
      return () => clearTimeout(timer);
    }

    lastMessageCountRef.current = currentMessageCount;
  }, [autoScrollOnUserMessage, isReplayMode, scrollToBottom, ...dependencies]);

  return {
    messagesContainerRef,
    messagesEndRef,
    showScrollToBottom,
    scrollToBottom,
  };
};
