import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/api';
import { SessionInfo, Message, Event, EventType, ToolResult } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface SessionContextType {
  sessions: SessionInfo[];
  activeSessionId: string | null;
  messages: Record<string, Message[]>;
  toolResults: Record<string, ToolResult[]>;
  isProcessing: boolean;
  createNewSession: () => Promise<string>;
  setActiveSession: (sessionId: string) => void;
  sendMessage: (content: string) => Promise<void>;
  resetSessions: () => void;
  abortCurrentQuery: () => Promise<boolean>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [toolResults, setToolResults] = useState<Record<string, ToolResult[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // 使用 useCallback 包裹函数，确保引用稳定性
  const createNewSession = useCallback(async (): Promise<string> => {
    try {
      const newSession = await ApiService.createSession();
      setSessions((prev) => [...prev, newSession]);

      // Initialize empty messages array for the session
      setMessages((prev) => ({
        ...prev,
        [newSession.id]: [],
      }));

      setToolResults((prev) => ({
        ...prev,
        [newSession.id]: [],
      }));

      setActiveSessionId(newSession.id);
      return newSession.id;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }, []);

  // Function to set the active session
  const setActiveSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  // Function to handle events from the server
  const handleEvent = useCallback((sessionId: string, event: Event) => {
    console.log('Received event:', event);

    switch (event.type) {
      case EventType.USER_MESSAGE:
        addMessage(sessionId, {
          id: event.id,
          role: 'user',
          content: event.content,
          timestamp: event.timestamp,
        });
        break;

      case EventType.ASSISTANT_MESSAGE:
        // Check if there is an existing streaming message
        setMessages((prev) => {
          const sessionMessages = prev[sessionId] || [];
          const lastMessage = sessionMessages[sessionMessages.length - 1];

          // If the last message is a streaming message, update it instead of adding a new one
          if (lastMessage && lastMessage.isStreaming) {
            return prev;
            // const finalMessage = {
            //   ...lastMessage,
            //   id: event.id,
            //   content: event.content,
            //   timestamp: event.timestamp,
            //   toolCalls: event.toolCalls,
            //   isStreaming: false, // Mark as complete
            //   finishReason: event.finishReason,
            // };

            // return {
            //   ...prev,
            //   [sessionId]: [...sessionMessages.slice(0, -1), finalMessage],
            // };
          } else {
            // If no streaming message exists, add a new one
            return {
              ...prev,
              [sessionId]: [
                ...sessionMessages,
                {
                  id: event.id,
                  role: 'assistant',
                  content: event.content,
                  timestamp: event.timestamp,
                  toolCalls: event.toolCalls,
                },
              ],
            };
          }
        });
        setIsProcessing(false);
        break;

      case EventType.ASSISTANT_STREAMING_MESSAGE:
        handleStreamingMessage(sessionId, event);
        break;

      case EventType.ASSISTANT_THINKING_MESSAGE:
      case EventType.ASSISTANT_STREAMING_THINKING_MESSAGE:
        updateThinking(sessionId, event.content, event.isComplete);
        break;

      case EventType.TOOL_CALL:
        // Handle tool call
        console.log('Tool call:', event);
        break;

      case EventType.TOOL_RESULT:
        addToolResult(sessionId, {
          id: uuidv4(),
          toolCallId: event.toolCallId,
          name: event.name,
          content: event.content,
          timestamp: event.timestamp,
          error: event.error,
          type: determineToolType(event.name, event.content),
        });
        break;

      case EventType.SYSTEM:
        console.log(`System event [${event.level}]:`, event.message);
        break;
    }
  }, []);

  // Function to determine tool type based on name and content
  const determineToolType = useCallback((name: string, content: any): ToolResult['type'] => {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('search')) return 'search';
    if (lowerName.includes('browser')) return 'browser';
    if (lowerName.includes('command') || lowerName.includes('terminal')) return 'command';
    if (lowerName.includes('file') || lowerName.includes('document')) return 'file';

    // Check if content contains image data
    if (
      content &&
      ((typeof content === 'object' && content.type === 'image') ||
        (typeof content === 'string' && content.startsWith('data:image/')))
    ) {
      return 'image';
    }

    return 'other';
  }, []);

  // Add a message to the session
  const addMessage = useCallback((sessionId: string, message: Message) => {
    setMessages((prev) => {
      const sessionMessages = prev[sessionId] || [];
      return {
        ...prev,
        [sessionId]: [...sessionMessages, message],
      };
    });
  }, []);

  // Update or add streaming message
  const handleStreamingMessage = useCallback(
    (sessionId: string, event: Event & { content: string; isComplete?: boolean }) => {
      setMessages((prev) => {
        const sessionMessages = prev[sessionId] || [];
        const lastMessage = sessionMessages[sessionMessages.length - 1];

        // If there's a streaming message already, update it
        if (lastMessage && lastMessage.isStreaming) {
          const updatedMessage = {
            ...lastMessage,
            content:
              typeof lastMessage.content === 'string'
                ? lastMessage.content + event.content
                : event.content,
            isStreaming: !event.isComplete,
            toolCalls: event.toolCalls || lastMessage.toolCalls,
          };

          return {
            ...prev,
            [sessionId]: [...sessionMessages.slice(0, -1), updatedMessage],
          };
        }

        // Otherwise, add a new streaming message
        const newMessage: Message = {
          id: event.id || uuidv4(),
          role: 'assistant',
          content: event.content,
          timestamp: event.timestamp,
          isStreaming: !event.isComplete,
          toolCalls: event.toolCalls,
        };

        return {
          ...prev,
          [sessionId]: [...sessionMessages, newMessage],
        };
      });

      if (event.isComplete) {
        setIsProcessing(false);
      }
    },
    [],
  );

  // Update thinking content for the last assistant message
  const updateThinking = useCallback((sessionId: string, content: string, isComplete?: boolean) => {
    setMessages((prev) => {
      const sessionMessages = prev[sessionId] || [];
      const lastAssistantIndex = [...sessionMessages]
        .reverse()
        .findIndex((m) => m.role === 'assistant');

      if (lastAssistantIndex !== -1) {
        const actualIndex = sessionMessages.length - 1 - lastAssistantIndex;
        const message = sessionMessages[actualIndex];

        const updatedMessage = {
          ...message,
          thinking: content,
        };

        return {
          ...prev,
          [sessionId]: [
            ...sessionMessages.slice(0, actualIndex),
            updatedMessage,
            ...sessionMessages.slice(actualIndex + 1),
          ],
        };
      }

      return prev;
    });
  }, []);

  // Add a tool result
  const addToolResult = useCallback((sessionId: string, result: ToolResult) => {
    setToolResults((prev) => {
      const sessionResults = prev[sessionId] || [];
      return {
        ...prev,
        [sessionId]: [...sessionResults, result],
      };
    });

    // Also link to the last message with the tool call
    setMessages((prev) => {
      const sessionMessages = prev[sessionId] || [];

      // Find the last message with this tool call
      const messageIndex = [...sessionMessages]
        .reverse()
        .findIndex((m) => m.toolCalls?.some((tc) => tc.id === result.toolCallId));

      if (messageIndex !== -1) {
        const actualIndex = sessionMessages.length - 1 - messageIndex;
        const message = sessionMessages[actualIndex];

        const toolResults = message.toolResults || [];

        const updatedMessage = {
          ...message,
          toolResults: [...toolResults, result],
        };

        return {
          ...prev,
          [sessionId]: [
            ...sessionMessages.slice(0, actualIndex),
            updatedMessage,
            ...sessionMessages.slice(actualIndex + 1),
          ],
        };
      }

      return prev;
    });
  }, []);

  // Function to send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeSessionId) {
        throw new Error('No active session');
      }

      setIsProcessing(true);

      // Add user message to the state immediately
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      addMessage(activeSessionId, userMessage);

      try {
        // Use streaming query
        await ApiService.sendStreamingQuery(activeSessionId, content, (event) =>
          handleEvent(activeSessionId, event),
        );
      } catch (error) {
        console.error('Error sending message:', error);
        setIsProcessing(false);
      }
    },
    [activeSessionId, addMessage, handleEvent],
  );

  // Function to abort the current query
  const abortCurrentQuery = useCallback(async (): Promise<boolean> => {
    if (!activeSessionId) {
      return false;
    }

    try {
      const success = await ApiService.abortQuery(activeSessionId);

      if (success) {
        setIsProcessing(false);

        // Add system message about abort
        const abortMessage: Message = {
          id: uuidv4(),
          role: 'system',
          content: 'The operation was aborted.',
          timestamp: Date.now(),
        };

        addMessage(activeSessionId, abortMessage);
      }

      return success;
    } catch (error) {
      console.error('Error aborting query:', error);
      return false;
    }
  }, [activeSessionId, addMessage]);

  // Reset all sessions
  const resetSessions = useCallback(() => {
    setSessions([]);
    setActiveSessionId(null);
    setMessages({});
    setToolResults({});
    ApiService.disconnect();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ApiService.disconnect();
    };
  }, []);

  return (
    <SessionContext.Provider
      value={{
        sessions,
        activeSessionId,
        messages,
        toolResults,
        isProcessing,
        createNewSession,
        setActiveSession,
        sendMessage,
        resetSessions,
        abortCurrentQuery,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
