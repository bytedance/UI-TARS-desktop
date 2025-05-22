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
  loadSessions: () => Promise<void>;
  setActiveSession: (sessionId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  updateSessionMetadata: (
    sessionId: string,
    updates: { name?: string; tags?: string[] },
  ) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<boolean>;
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

  // Load all sessions from the server
  const loadSessions = useCallback(async (): Promise<void> => {
    try {
      const loadedSessions = await ApiService.getSessions();
      setSessions(loadedSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }, []);

  // Load initial sessions when component mounts
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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

  // Function to set the active session and load its events if needed
  const setActiveSession = useCallback(
    async (sessionId: string) => {
      try {
        // Check if session is active, if not restore it
        const sessionDetails = await ApiService.getSessionDetails(sessionId);

        if (!sessionDetails.active) {
          await ApiService.restoreSession(sessionId);
        }

        // If we don't have messages for this session yet, load them
        if (!messages[sessionId]) {
          const events = await ApiService.getSessionEvents(sessionId);

          // Process events to build message and tool result history
          const sessionMessages: Message[] = [];
          const sessionToolResults: ToolResult[] = [];

          events.forEach((event) => {
            handleEvent(sessionId, event, sessionMessages, sessionToolResults);
          });

          setMessages((prev) => ({
            ...prev,
            [sessionId]: sessionMessages,
          }));

          setToolResults((prev) => ({
            ...prev,
            [sessionId]: sessionToolResults,
          }));
        }

        setActiveSessionId(sessionId);
      } catch (error) {
        console.error('Failed to set active session:', error);
        throw error;
      }
    },
    [messages],
  );

  // Update session metadata
  const updateSessionMetadata = useCallback(
    async (sessionId: string, updates: { name?: string; tags?: string[] }) => {
      try {
        const updatedSession = await ApiService.updateSession(sessionId, updates);

        setSessions((prev) =>
          prev.map((session) =>
            session.id === sessionId ? { ...session, ...updatedSession } : session,
          ),
        );
      } catch (error) {
        console.error('Failed to update session:', error);
        throw error;
      }
    },
    [],
  );

  // Delete a session
  const deleteSessionById = useCallback(
    async (sessionId: string): Promise<boolean> => {
      try {
        const success = await ApiService.deleteSession(sessionId);

        if (success) {
          setSessions((prev) => prev.filter((session) => session.id !== sessionId));

          if (activeSessionId === sessionId) {
            setActiveSessionId(null);
          }

          // Clean up messages and tool results
          setMessages((prev) => {
            const newMessages = { ...prev };
            delete newMessages[sessionId];
            return newMessages;
          });

          setToolResults((prev) => {
            const newResults = { ...prev };
            delete newResults[sessionId];
            return newResults;
          });
        }

        return success;
      } catch (error) {
        console.error('Failed to delete session:', error);
        throw error;
      }
    },
    [activeSessionId],
  );

  // Function to handle events from the server
  const handleEvent = useCallback(
    (
      sessionId: string,
      event: Event,
      sessionMessages?: Message[],
      sessionToolResults?: ToolResult[],
    ) => {
      console.log('Received event:', event);

      // Determine if we're updating state directly or returning values for history
      const updateMode = !sessionMessages;
      const messages = sessionMessages || [];
      const toolResults = sessionToolResults || [];

      switch (event.type) {
        case EventType.USER_MESSAGE:
          const userMessage: Message = {
            id: event.id,
            role: 'user',
            content: event.content,
            timestamp: event.timestamp,
          };

          if (updateMode) {
            addMessage(sessionId, userMessage);
          } else {
            messages.push(userMessage);
          }
          break;

        case EventType.ASSISTANT_MESSAGE:
          // Check if there is an existing streaming message
          if (updateMode) {
            setMessages((prev) => {
              const sessionMessages = prev[sessionId] || [];
              const lastMessage = sessionMessages[sessionMessages.length - 1];

              // If the last message is a streaming message, update it instead of adding a new one
              if (lastMessage && lastMessage.isStreaming) {
                return prev;
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
          } else {
            messages.push({
              id: event.id,
              role: 'assistant',
              content: event.content,
              timestamp: event.timestamp,
              toolCalls: event.toolCalls,
            });
          }
          break;

        case EventType.ASSISTANT_STREAMING_MESSAGE:
          if (updateMode) {
            handleStreamingMessage(sessionId, event);
          } else {
            // For history, treat streaming messages as complete messages
            const existingMessage = messages.find((m) => m.id === event.id);

            if (
              existingMessage &&
              typeof existingMessage.content === 'string' &&
              typeof event.content === 'string'
            ) {
              existingMessage.content += event.content;
            } else if (!existingMessage) {
              messages.push({
                id: event.id || uuidv4(),
                role: 'assistant',
                content: event.content,
                timestamp: event.timestamp,
                toolCalls: event.toolCalls,
              });
            }
          }
          break;

        case EventType.ASSISTANT_THINKING_MESSAGE:
        case EventType.ASSISTANT_STREAMING_THINKING_MESSAGE:
          if (updateMode) {
            updateThinking(sessionId, event.content, event.isComplete);
          } else {
            // Find the last assistant message and update its thinking
            const lastAssistantIndex = [...messages]
              .reverse()
              .findIndex((m) => m.role === 'assistant');
            if (lastAssistantIndex !== -1) {
              const actualIndex = messages.length - 1 - lastAssistantIndex;
              messages[actualIndex].thinking = event.content;
            }
          }
          break;

        case EventType.TOOL_CALL:
          // Handle tool call
          console.log('Tool call:', event);
          break;

        case EventType.TOOL_RESULT:
          const result: ToolResult = {
            id: uuidv4(),
            toolCallId: event.toolCallId,
            name: event.name,
            content: event.content,
            timestamp: event.timestamp,
            error: event.error,
            type: determineToolType(event.name, event.content),
          };

          if (updateMode) {
            addToolResult(sessionId, result);
          } else {
            toolResults.push(result);

            // Link to the corresponding message
            const messageIndex = [...messages]
              .reverse()
              .findIndex((m) => m.toolCalls?.some((tc) => tc.id === result.toolCallId));

            if (messageIndex !== -1) {
              const actualIndex = messages.length - 1 - messageIndex;
              const message = messages[actualIndex];

              message.toolResults = message.toolResults || [];
              message.toolResults.push(result);
            }
          }
          break;

        case EventType.SYSTEM:
          const systemMessage: Message = {
            id: uuidv4(),
            role: 'system',
            content: event.message,
            timestamp: event.timestamp || Date.now(),
          };

          if (updateMode) {
            addMessage(sessionId, systemMessage);
          } else {
            messages.push(systemMessage);
          }
          break;
      }

      // If not in update mode, we don't need to return anything as the arrays were passed by reference
    },
    [],
  );

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
        loadSessions,
        setActiveSession,
        sendMessage,
        updateSessionMetadata,
        deleteSession: deleteSessionById,
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
