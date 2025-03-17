import {
  MessageTypeDescriptor,
  MessageItem as MessageItemBase,
} from '@vendor/chat-ui';
import { EventItem } from './event';

export enum MessageType {
  // Output the chat text directly
  PlainText = 'plain-text',
  // Display the file information
  File = 'file',
  // Output the agent workflow process
  OmegaAgent = 'omega-agent',
}

export interface OmegaAgentData {
  events: EventItem[];
}

export interface MessageContentType extends MessageTypeDescriptor {
  [MessageType.OmegaAgent]: OmegaAgentData;
}

export type MessageItem = MessageItemBase<MessageContentType>;
