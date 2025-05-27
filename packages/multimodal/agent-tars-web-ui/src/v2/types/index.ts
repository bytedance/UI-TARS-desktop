/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Event as AgentEvent,
  EventType,
  ChatCompletionContentPart,
  ChatCompletionMessageToolCall,
} from '@multimodal/agent-interface';
import { ToolResultContentPart, StandardToolResult } from '../utils/tool-result';

export { EventType };

export type {
  ChatCompletionContentPart,
  ChatCompletionMessageToolCall,
  ToolResultContentPart,
  StandardToolResult,
};

/**
 * Re-export Event type from agent-interface
 */
export type Event = AgentEvent;

/**
 * Session metadata information
 */
export interface SessionMetadata {
  id: string;
  createdAt: number;
  updatedAt: number;
  name?: string;
  workingDirectory: string;
  tags?: string[];
}

/**
 * Session information including active status
 */
export interface SessionInfo extends SessionMetadata {
  active?: boolean;
}

/**
 * Tool result type with categorization
 */
export interface ToolResult {
  id: string;
  toolCallId: string;
  name: string;
  content: any;
  timestamp: number;
  error?: string;
  type:
    | 'search'
    | 'browser'
    | 'command'
    | 'image'
    | 'file'
    | 'browser_vision_control'
    | 'other';
  arguments?: any; // 保留 arguments 字段存储命令参数
}

/**
 * Conversation message with expanded capabilities
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'environment';
  content: string | ChatCompletionContentPart[];
  timestamp: number;
  toolCalls?: ChatCompletionMessageToolCall[];
  thinking?: string;
  toolResults?: ToolResult[];
  isStreaming?: boolean;
  finishReason?: string;
  messageId?: string;
  description?: string; // Added for environment inputs
}

/**
 * A group of related messages in a conversation
 * Groups are logical units of conversation, typically starting with a user message
 * and including all related assistant responses and tool interactions
 */
export interface MessageGroup {
  messages: Message[];
  isThinking?: boolean;
}

/**
 * Server connection status
 */
export interface ConnectionStatus {
  connected: boolean;
  lastConnected: number | null;
  lastError: string | null;
  reconnecting: boolean;
}

/**
 * Content to be displayed in the workspace panel
 */
export interface PanelContent {
  type: 'search' | 'browser' | 'command' | 'image' | 'file' | 'other';
  source: any;
  title: string;
  timestamp: number;
  toolCallId?: string;
  error?: string;
  arguments?: any; // 添加 arguments 字段
}
