/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FIXME: remove it.
 */
export interface ToolCall {
  id: string;
  type: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  meta?: Record<string, unknown>;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  timestamp: number;
  /** Preserved extension fields */
  meta?: Record<string, unknown>;
}

export interface ChatProps {
  /** Basic configuration */
  chat: Chat;
  isLoading?: boolean;

  /** Custom rendering */
  renderMessage?: (message: Message) => React.ReactNode;
  renderInput?: (props: ChatInputProps) => React.ReactNode;

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
