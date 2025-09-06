// Types for scroll-to-bottom functionality

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'final_answer';
  content: string;
  timestamp?: number;
  [key: string]: any; // Allow additional properties for flexibility
}

export interface MessageGroup {
  messages: Message[];
}

export type ScrollDependencies = [Message[] | MessageGroup[], ...any[]];

export interface UseScrollToBottomOptions {
  threshold?: number;
  dependencies?: React.DependencyList;
  sessionId?: string;
  isReplayMode?: boolean;
  autoScrollOnUserMessage?: boolean;
}

export interface UseScrollToBottomReturn {
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  showScrollToBottom: boolean;
  scrollToBottom: () => void;
}

export interface ScrollToBottomState {
  showButton: boolean;
  isScrolling: boolean;
  lastSessionId?: string;
  lastEventIndex: number;
  lastMessageCount: number;
  lastUserMessageId: string | null;
}
