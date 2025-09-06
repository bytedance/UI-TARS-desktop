import { useEffect, useRef, useMemo } from 'react';
import { Message, MessageGroup, ScrollDependencies } from './types';

interface UseUserMessageAutoScrollOptions {
  dependencies: React.DependencyList;
  isEnabled: boolean;
  isReplayMode: boolean;
  onAutoScroll: () => void;
  delay?: number;
}

/**
 * Custom hook for handling auto-scroll when user sends messages
 * Separated from main scroll logic for better maintainability
 */
export const useUserMessageAutoScroll = ({
  dependencies,
  isEnabled,
  isReplayMode,
  onAutoScroll,
  delay = 100,
}: UseUserMessageAutoScrollOptions) => {
  const lastMessageCountRef = useRef<number>(0);
  const lastUserMessageIdRef = useRef<string | null>(null);

  // Extract and validate messages from dependencies
  const messages = useMemo(() => {
    if (!Array.isArray(dependencies[0])) return [];

    const deps = dependencies as ScrollDependencies;
    const rawMessages = deps[0];

    // Flatten message groups to individual messages
    return rawMessages.flatMap((item): Message[] => {
      // Handle MessageGroup structure
      if ('messages' in item && Array.isArray(item.messages)) {
        return item.messages.filter(
          (msg): msg is Message => msg && typeof msg === 'object' && 'role' in msg && 'id' in msg,
        );
      }

      // Handle direct Message structure
      if (item && typeof item === 'object' && 'role' in item && 'id' in item) {
        return [item as Message];
      }

      return [];
    });
  }, [dependencies]);

  // Find the latest user message efficiently
  const latestUserMessage = useMemo(() => {
    // Search from the end for better performance
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === 'user') {
        return message;
      }
    }
    return null;
  }, [messages]);

  // Handle auto-scroll for new user messages
  useEffect(() => {
    if (!isEnabled || isReplayMode) {
      return;
    }

    const currentMessageCount = messages.length;

    // Check if new messages were added
    if (currentMessageCount > lastMessageCountRef.current) {
      const newMessages = messages.slice(lastMessageCountRef.current);
      const hasNewUserMessage = newMessages.some((msg) => msg.role === 'user');

      if (hasNewUserMessage && latestUserMessage) {
        // Only auto-scroll if this is a truly new user message
        if (latestUserMessage.id !== lastUserMessageIdRef.current) {
          lastUserMessageIdRef.current = latestUserMessage.id;

          // Schedule auto-scroll after DOM updates
          const timer = setTimeout(() => {
            onAutoScroll();
          }, delay);

          return () => clearTimeout(timer);
        }
      }
    }

    lastMessageCountRef.current = currentMessageCount;
  }, [messages, latestUserMessage, isEnabled, isReplayMode, onAutoScroll, delay]);

  // Reset state when conditions change
  useEffect(() => {
    if (!isEnabled || isReplayMode) {
      lastMessageCountRef.current = 0;
      lastUserMessageIdRef.current = null;
    }
  }, [isEnabled, isReplayMode]);
};
