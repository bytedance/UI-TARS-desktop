import { atom } from 'jotai';
import { Message, MessageGroup } from '@/common/types';

/**
 * Atom for storing messages for each session
 * Key is the session ID, value is an array of messages for that session
 */
export const messagesAtom = atom<Record<string, Message[]>>({});

/**
 * Simplified atom for sorted messages by session
 * Provides time-sorted messages without complex grouping logic
 */
export const sortedMessagesAtom = atom<Record<string, Message[]>>((get) => {
  const allMessages = get(messagesAtom);
  const result: Record<string, Message[]> = {};

  // Sort messages by timestamp for each session
  Object.entries(allMessages).forEach(([sessionId, messages]) => {
    result[sessionId] = [...messages].sort((a, b) => a.timestamp - b.timestamp);
  });

  return result;
});

/**
 * Grouped messages atom with stable grouping logic
 * Groups messages by conversation flow while maintaining stability
 */
export const groupedMessagesAtom = atom<Record<string, MessageGroup[]>>((get) => {
  const allMessages = get(messagesAtom);
  const result: Record<string, MessageGroup[]> = {};

  // Process each session's messages into stable groups
  Object.entries(allMessages).forEach(([sessionId, messages]) => {
    result[sessionId] = createStableMessageGroups(messages);
  });

  return result;
});

/**
 * Create stable message groups with simplified logic
 * Focuses on preventing flickering while maintaining logical grouping
 */
function createStableMessageGroups(messages: Message[]): MessageGroup[] {
  if (!messages.length) return [];

  const groups: MessageGroup[] = [];
  let currentGroup: Message[] = [];

  // Sort messages by timestamp to ensure consistent ordering
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sortedMessages.length; i++) {
    const message = sortedMessages[i];

    // User messages always start a new group
    if (message.role === 'user') {
      if (currentGroup.length > 0) {
        groups.push({ messages: [...currentGroup] });
      }
      currentGroup = [message];
      continue;
    }

    // System messages are standalone
    if (message.role === 'system') {
      if (currentGroup.length > 0) {
        groups.push({ messages: [...currentGroup] });
      }
      groups.push({ messages: [message] });
      currentGroup = [];
      continue;
    }

    // Assistant and environment messages
    if (message.role === 'assistant' || message.role === 'environment') {
      // Check if this assistant message should start a new group
      // This happens when messageId changes (different response cycle)
      if (message.role === 'assistant' && message.messageId && currentGroup.length > 0) {
        const lastAssistantInGroup = currentGroup
          .slice()
          .reverse()
          .find((m) => m.role === 'assistant');

        if (
          lastAssistantInGroup &&
          lastAssistantInGroup.messageId &&
          lastAssistantInGroup.messageId !== message.messageId
        ) {
          // Different messageId means new response cycle - start new group
          groups.push({ messages: [...currentGroup] });
          currentGroup = [message];
          continue;
        }
      }

      // Add to current group
      currentGroup.push(message);
    }
  }

  // Add the last group if not empty
  if (currentGroup.length > 0) {
    groups.push({ messages: [...currentGroup] });
  }

  return groups;
}
