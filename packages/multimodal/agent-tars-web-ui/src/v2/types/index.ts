import {
  Event as BaseEvent,
  EventType,
  ChatCompletionContentPart,
  ChatCompletionMessageToolCall,
} from '@multimodal/agent-interface';

// 重导出基础类型
export { EventType };
export type { ChatCompletionContentPart, ChatCompletionMessageToolCall };

// 扩展Event类型
export interface Event extends BaseEvent {
  content?: string | ChatCompletionContentPart[];
  isComplete?: boolean;
  messageId?: string;
  finishReason?: string;
}

// 会话元数据
export interface SessionMetadata {
  id: string;
  createdAt: number;
  updatedAt: number;
  name?: string;
  workingDirectory: string;
  tags?: string[];
}

// 会话信息，包含活动状态
export interface SessionInfo extends SessionMetadata {
  active?: boolean;
}

// 工具结果
export interface ToolResult {
  id: string;
  toolCallId: string;
  name: string;
  content: any;
  timestamp: number;
  error?: string;
  type: 'search' | 'browser' | 'command' | 'image' | 'file' | 'other';
}

// 图像内容
export interface ImageContent {
  url: string;
  alt?: string;
}

// 消息
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
  messageId?: string;
}

// 面板内容
export interface PanelContent {
  type: 'search' | 'browser' | 'command' | 'image' | 'file' | 'other';
  source: any;
  title: string;
  timestamp: number;
  toolCallId?: string;
  error?: string;
}

// 服务器连接状态
export interface ConnectionStatus {
  connected: boolean;
  lastConnected: number | null;
  lastError: string | null;
  reconnecting: boolean;
}
