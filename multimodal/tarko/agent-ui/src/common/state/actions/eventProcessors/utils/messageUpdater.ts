import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/common/types';
import { Setter } from 'jotai';
import { messagesAtom } from '@/common/state/atoms/message';

/**
 * Utility for managing message updates with consistent patterns
 */
export class MessageUpdater {
  constructor(private set: Setter) {}

  /**
   * Find message index by messageId or fallback criteria
   */
  private findMessageIndex(
    messages: Message[],
    messageId?: string,
    fallbackCriteria?: (msg: Message) => boolean,
  ): number {
    if (messageId) {
      const index = messages.findIndex((msg) => msg.messageId === messageId);
      if (index !== -1) return index;
    }

    if (fallbackCriteria && messages.length > 0) {
      const lastIndex = messages.length - 1;
      if (fallbackCriteria(messages[lastIndex])) {
        return lastIndex;
      }
    }

    return -1;
  }

  /**
   * Update or create message with consistent logic
   */
  updateMessage(
    sessionId: string,
    messageId: string | undefined,
    updateFn: (existingMessage?: Message) => Message,
    fallbackCriteria?: (msg: Message) => boolean,
  ): void {
    this.set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];
      const existingIndex = this.findMessageIndex(sessionMessages, messageId, fallbackCriteria);

      if (existingIndex !== -1) {
        // Update existing message
        const existingMessage = sessionMessages[existingIndex];
        const updatedMessage = updateFn(existingMessage);

        return {
          ...prev,
          [sessionId]: [
            ...sessionMessages.slice(0, existingIndex),
            updatedMessage,
            ...sessionMessages.slice(existingIndex + 1),
          ],
        };
      }

      // Create new message
      const newMessage = updateFn();
      return {
        ...prev,
        [sessionId]: [...sessionMessages, newMessage],
      };
    });
  }

  /**
   * Append content to existing message or create new streaming message
   */
  appendStreamingContent(
    sessionId: string,
    messageId: string | undefined,
    content: string,
    isComplete: boolean,
    baseMessage: Partial<Message>,
    fallbackCriteria?: (msg: Message) => boolean,
  ): void {
    this.updateMessage(
      sessionId,
      messageId,
      (existingMessage) => {
        if (existingMessage) {
          return {
            ...existingMessage,
            content:
              typeof existingMessage.content === 'string'
                ? existingMessage.content + content
                : content,
            isStreaming: !isComplete,
            ...baseMessage,
          };
        }

        return {
          id: uuidv4(),
          content,
          isStreaming: !isComplete,
          ...baseMessage,
        } as Message;
      },
      fallbackCriteria,
    );
  }

  /**
   * Add a complete message to the session
   */
  addMessage(sessionId: string, message: Message): void {
    this.set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];
      return {
        ...prev,
        [sessionId]: [...sessionMessages, message],
      };
    });
  }
}
