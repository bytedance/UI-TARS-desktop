/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FIXME: remove it.
 */

/**
 * 定义基础消息类型
 */
export type MessageRole = 'user' | 'assistant';

/**
 * 消息类型枚举
 */
export type MessageType = 'text' | 'steps' | string;

/**
 * 基础消息接口
 */
export interface BaseMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  type?: MessageType;
  meta?: Record<string, unknown>;
}

/**
 * 纯文本消息
 */
export interface TextMessage extends BaseMessage {
  type?: 'text';
}

/**
 * 步骤消息
 */
export interface StepsMessage extends BaseMessage {
  type: 'steps';
  steps: Array<{
    id: number;
    title: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed';
  }>;
}

/**
 * 消息联合类型 - 所有支持的消息类型
 */
export type Message = TextMessage | StepsMessage | BaseMessage;

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  timestamp: number;
  /** Preserved extension fields */
  meta?: Record<string, unknown>;
}

/**
 * 消息渲染器Props
 */
export interface MessageRendererProps<T extends BaseMessage = Message> {
  message: T;
  toggleExpand?: (messageId: string) => void;
  isExpanded?: boolean;
}

/**
 * 消息渲染器函数类型
 */
export type MessageRenderer<T extends BaseMessage = Message> = (
  props: MessageRendererProps<T>,
) => React.ReactNode;

export interface ChatProps {
  /** Basic configuration */
  chat: Chat;
  isLoading?: boolean;

  /** Custom rendering */
  renderMessage?: MessageRenderer;
  renderInput?: (props: ChatInputProps) => React.ReactNode;

  /** Message renderers registry */
  messageRenderers?: Record<MessageType, MessageRenderer>;

  /** Event handling */
  onSendMessage: (content: string) => Promise<void>;

  /** Style related */
  className?: string;
  style?: React.CSSProperties;
}

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  placeholder?: string;
}

/**
 * Persistence interface
 */
export interface ChatStorage {
  getChats(): Promise<Chat[]>;
  saveChat(chat: Chat): Promise<void>;
  deleteChat(chatId: string): Promise<void>;
  clear(): Promise<void>;
}

export type Model = string;
