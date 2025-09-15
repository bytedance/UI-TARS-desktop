/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AgentEventStream,
  ChatCompletionContentPart,
  ChatCompletionMessageToolCall,
} from '@tarko/agent-interface';
import { SanitizedAgentOptions, WorkspaceInfo, SessionInfo } from '@tarko/interface';

export { AgentEventStream };
export type { SanitizedAgentOptions, WorkspaceInfo, SessionInfo };

export type { ChatCompletionContentPart, ChatCompletionMessageToolCall };

/**
 * Tool result type with categorization and timing information
 */
export interface ToolResult {
  id: string;
  toolCallId: string;
  name: string;
  content: any;
  timestamp: number;
  error?: string;
  type: string;
  arguments?: any;
  elapsedMs?: number;
  _extra?: { currentScreenshot: string };
}

/**
 * Conversation message with expanded capabilities
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'environment' | 'final_answer';
  content: string | ChatCompletionContentPart[];
  timestamp: number;
  toolCalls?: ChatCompletionMessageToolCall[];
  thinking?: string;
  toolResults?: ToolResult[];
  isStreaming?: boolean;
  finishReason?: string;
  messageId?: string;
  description?: string; // Added for environment inputs
  isDeepResearch?: boolean; // Added for final answer events
  title?: string; // Added for research report title
  ttftMs?: number; // Time to First Token (TTFT) in milliseconds
  ttltMs?: number; // Total response time in milliseconds
  thinkingDuration?: number; // Thinking duration in milliseconds

  // System message specific properties
  level?: 'info' | 'warning' | 'error';
  details?: Record<string, any>;

  // Environment message specific properties
  metadata?: AgentEventStream.EnvironmentInputMetadata;

  // UI state properties
  isLocalMessage?: boolean; // Marks messages added locally before server confirmation
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
  type: string;
  source: string | ChatCompletionContentPart[] | null;
  title: string;
  timestamp: number;
  toolCallId?: string;
  error?: string;
  arguments?: any;
  environmentId?: string;
  originalContent?: string | ChatCompletionContentPart[];
  _extra?: { currentScreenshot: string };
  isStreaming?: boolean;
  // FIXME: Consider whether to remove it
  isDeepResearch?: boolean;
  messageId?: string;
}

/**
 * Replay event marker for visual timeline display
 */
export interface ReplayEventMarker {
  id: string;
  type: AgentEventStream.EventType;
  timestamp: number;
  position: number; // 0-1 normalized position on timeline
  content?: string | any;
}

/**
 * Tarko multimodal clipboard protocol for cross-application data exchange
 */
export interface TarkoMultimodalClipboardProtocol {
  protocol: 'tarko://webui/clipboard/v1';
  text: string;
  images: {
    data: string; // base64 data without data URL prefix
    mime: string; // MIME type like 'image/png', 'image/jpeg'
  }[];
}
