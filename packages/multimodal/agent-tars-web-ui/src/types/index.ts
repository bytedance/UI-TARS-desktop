import {
  Event,
  EventType,
  ChatCompletionContentPart,
  ChatCompletionMessageToolCall,
} from '@multimodal/agent-interface';

export { EventType };

export type { Event, ChatCompletionContentPart, ChatCompletionMessageToolCall };

export interface SessionMetadata {
  id: string;
  createdAt: number;
  updatedAt: number;
  name?: string;
  workingDirectory: string;
  tags?: string[];
}

export interface SessionInfo extends SessionMetadata {
  active?: boolean;
}

export interface ToolResult {
  id: string;
  toolCallId: string;
  name: string;
  content: any;
  timestamp: number;
  error?: string;
  type: 'search' | 'browser' | 'command' | 'image' | 'file' | 'other';
}

export interface ImageContent {
  url: string;
  alt?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ChatCompletionContentPart[];
  timestamp: number;
  toolCalls?: ChatCompletionMessageToolCall[];
  thinking?: string;
  toolResults?: ToolResult[];
  isStreaming?: boolean;
  finishReason?: string;
}
