import { MessageRole } from '@vendor/chat-ui';
import {
  MessageItem,
  MessageType,
  OmegaAgentData,
} from '@renderer/type/chatMessage';

export class ChatMessageUtil {
  static userMessage(
    content: string,
    type = MessageType.PlainText,
  ): MessageItem {
    return {
      role: MessageRole.User,
      content,
      type,
      timestamp: Date.now(),
    };
  }

  static assistantOmegaMessage(
    content: OmegaAgentData,
    type = MessageType.OmegaAgent,
  ): MessageItem {
    return {
      role: MessageRole.Assistant,
      content,
      type,
      timestamp: Date.now(),
      showCopyButton: false,
    };
  }

  static assistantTextMessage(content: string): MessageItem {
    return {
      role: MessageRole.Assistant,
      content,
      type: MessageType.PlainText,
      timestamp: Date.now(),
      showCopyButton: false,
      // avatar: logo,
    };
  }

  static assistantThinkMessage(
    content: string,
    type = MessageType.PlainText,
  ): MessageItem {
    return {
      role: MessageRole.Assistant,
      content,
      type,
      timestamp: Date.now(),
      showCopyButton: false,
    };
  }
}
