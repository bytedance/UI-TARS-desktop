import { atom } from 'jotai';
import { Message, MessageGroup } from '../../types';

/**
 * Atom for storing messages for each session
 * Key is the session ID, value is an array of messages for that session
 */
export const messagesAtom = atom<Record<string, Message[]>>({});

/**
 * Atom for storing grouped messages for each session
 * Key is the session ID, value is an array of message groups for that session
 * This is derived from messagesAtom but with messages properly grouped
 */
export const groupedMessagesAtom = atom<Record<string, MessageGroup[]>>((get) => {
  const allMessages = get(messagesAtom);
  const result: Record<string, MessageGroup[]> = {};

  // Process each session's messages into groups
  Object.entries(allMessages).forEach(([sessionId, messages]) => {
    result[sessionId] = createMessageGroups(messages);
  });

  return result;
});

/**
 * Group messages into logical conversation groups
 *
 * The grouping logic creates groups based on:
 * 1. User messages always start a new group
 * 2. System messages are standalone groups
 * 3. Assistant/environment messages that belong together are grouped
 * 4. Thinking/processing sequences are properly maintained
 */
function createMessageGroups(messages: Message[]): MessageGroup[] {
  if (!messages.length) return [];

  const groups: MessageGroup[] = [];
  let currentGroup: Message[] = [];
  let currentThinkingSequence: {
    startIndex: number;
    messages: Message[];
  } | null = null;

  // Process messages in order
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    // User messages always start a new group
    if (message.role === 'user') {
      if (currentGroup.length > 0) {
        groups.push({ messages: [...currentGroup] });
      }
      currentGroup = [message];
      currentThinkingSequence = null;
      continue;
    }

    // System messages are standalone
    if (message.role === 'system') {
      if (currentGroup.length > 0) {
        groups.push({ messages: [...currentGroup] });
      }
      groups.push({ messages: [message] });
      currentGroup = [];
      currentThinkingSequence = null;
      continue;
    }

    // Process assistant and environment messages
    if (message.role === 'assistant' || message.role === 'environment') {
      // Check if this is the start of a thinking sequence
      if (
        message.role === 'assistant' &&
        currentGroup.length > 0 &&
        currentGroup[currentGroup.length - 1].role === 'user' &&
        (!message.finishReason || message.finishReason !== 'stop')
      ) {
        // Create new thinking sequence
        currentThinkingSequence = {
          startIndex: currentGroup.length,
          messages: [message],
        };
        currentGroup.push(message);
        continue;
      }

      // Continue existing thinking sequence
      if (currentThinkingSequence && (!message.finishReason || message.finishReason !== 'stop')) {
        currentThinkingSequence.messages.push(message);
        currentGroup.push(message);
        continue;
      }

      // Handle final answer in a thinking sequence
      if (message.role === 'assistant' && message.finishReason === 'stop') {
        if (currentThinkingSequence) {
          currentThinkingSequence.messages.push(message);
          currentGroup.push(message);
          currentThinkingSequence = null;
          continue;
        } else {
          // Standalone final answer
          currentGroup.push(message);
          continue;
        }
      }

      // Default: add to current group
      currentGroup.push(message);
    }
  }

  // Add the last group if not empty
  if (currentGroup.length > 0) {
    groups.push({ messages: [...currentGroup] });
  }

  return groups;
}
