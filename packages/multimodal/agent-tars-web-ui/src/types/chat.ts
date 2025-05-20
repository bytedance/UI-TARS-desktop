import { Event } from '@multimodal/agent-interface';

export type Model = string;

export type AgentIntermediateState = {
  type: string;
  content: string;
  blocks?: AgentIntermediateBlock[];
  steps?: AgentStep[];
};

export type AgentIntermediateBlock = {
  id: string;
  type: string;
  title: string;
  content: string;
};

export type AgentStep = {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  artifactId?: string; // 关联的工件ID
};

// 扩展消息类型以支持更多格式，与CLI统一
export type MessageType = 'text' | 'steps' | 'tool_call' | 'tool_result';

export type MessageRole = 'user' | 'assistant' | 'system';

// 基本消息接口
export interface BaseMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  type?: MessageType;
  meta?: Record<string, unknown>;
}

// 文本消息
export interface TextMessage extends BaseMessage {
  type?: 'text';
}

// 步骤消息
export interface StepsMessage extends BaseMessage {
  type: 'steps';
  steps: AgentStep[];
}

// 工具调用消息 - 新增，与CLI对齐
export interface ToolCallMessage extends BaseMessage {
  type: 'tool_call';
  toolCallId: string;
  name: string;
  arguments: string | Record<string, unknown>;
}

// 工具结果消息 - 新增，与CLI对齐
export interface ToolResultMessage extends BaseMessage {
  type: 'tool_result';
  toolCallId: string;
  name: string;
  content: any;
  error?: string;
}

// 统一消息类型
export type Message =
  | TextMessage
  | StepsMessage
  | ToolCallMessage
  | ToolResultMessage
  | BaseMessage;

/**
 * Chat message format for API communication
 */
export interface ChatMessage {
  role: string;
  content: string;
}

/**
 * Agent event handler function type
 */
export type AgentEventHandler = (event: Event) => void;

// 连接状态类型，与CLI对齐
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';
