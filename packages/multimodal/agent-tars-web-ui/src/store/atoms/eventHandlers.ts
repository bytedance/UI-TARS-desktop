import { atom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import { Event, EventType, Message, ToolResult } from '../../types';
import {
  messagesAtom,
  toolResultsAtom,
  isProcessingAtom,
  activePanelContentAtom,
} from './sessionAtoms';

// Map to track tool calls to their results
const toolCallResultMap = new Map<string, ToolResult>();

// Determine tool type from name and content
export const determineToolType = (name: string, content: any): ToolResult['type'] => {
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
};

// Handle streaming message events - consolidate them into a single message
const handleStreamingMessage = (
  sessionId: string,
  event: Event & { content: string; isComplete?: boolean },
  get: any,
  set: any,
) => {
  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];
    const lastMessage =
      sessionMessages.length > 0 ? sessionMessages[sessionMessages.length - 1] : null;

    // If already have a streaming message, update it
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
    set(isProcessingAtom, false);
  }
};

// Check for images in user message and set them as active panel content
const checkForImagesAndSetActive = (sessionId: string, content: any, set: any) => {
  // If content is multimodal array, look for images
  if (Array.isArray(content)) {
    const images = content.filter((part) => part.type === 'image_url');
    if (images.length > 0) {
      // Set the first image as active panel content
      set(activePanelContentAtom, {
        type: 'image',
        source: images[0].image_url.url,
        title: 'User Upload',
        timestamp: Date.now(),
      });
    }
  }
};

// Add tool result and update active panel content
const addToolResult = (sessionId: string, result: ToolResult, get: any, set: any) => {
  // Store result in the map for future reference
  toolCallResultMap.set(result.toolCallId, result);

  set(toolResultsAtom, (prev: Record<string, ToolResult[]>) => {
    const sessionResults = prev[sessionId] || [];
    return {
      ...prev,
      [sessionId]: [...sessionResults, result],
    };
  });

  // Immediately set this tool result as the active panel content
  set(activePanelContentAtom, {
    type: result.type,
    source: result.content,
    title: result.name,
    timestamp: result.timestamp,
    toolCallId: result.toolCallId,
  });

  // Link to message with this tool call
  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];

    // Find message with this tool call
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
};

// Event handling action - for real-time events
export const handleEventAction = atom(null, (get, set, sessionId: string, event: Event) => {
  console.log('Event received:', event.type, event.id);

  switch (event.type) {
    case EventType.USER_MESSAGE:
      const userMessage: Message = {
        id: event.id,
        role: 'user',
        content: event.content,
        timestamp: event.timestamp,
      };

      // Add message
      set(messagesAtom, (prev: Record<string, Message[]>) => {
        const sessionMessages = prev[sessionId] || [];
        return {
          ...prev,
          [sessionId]: [...sessionMessages, userMessage],
        };
      });

      // Check for images in user message
      checkForImagesAndSetActive(sessionId, event.content, set);
      break;

    case EventType.ASSISTANT_MESSAGE:
      // Only add a complete assistant message if there isn't already
      // a streaming message that it would duplicate
      set(messagesAtom, (prev: Record<string, Message[]>) => {
        const sessionMessages = prev[sessionId] || [];
        const lastMessage =
          sessionMessages.length > 0 ? sessionMessages[sessionMessages.length - 1] : null;

        // If the last message is still streaming, don't add this complete message
        // since it would duplicate content
        if (lastMessage && lastMessage.isStreaming && lastMessage.id === event.id) {
          // Just update the streaming message with additional data like toolCalls
          return {
            ...prev,
            [sessionId]: [
              ...sessionMessages.slice(0, -1),
              {
                ...lastMessage,
                isStreaming: false,
                toolCalls: event.toolCalls,
                finishReason: event.finishReason,
              },
            ],
          };
        } else {
          // Add new message only if it wouldn't duplicate
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
                finishReason: event.finishReason,
              },
            ],
          };
        }
      });

      set(isProcessingAtom, false);
      break;

    case EventType.ASSISTANT_STREAMING_MESSAGE:
      handleStreamingMessage(sessionId, event as any, get, set);
      break;

    case EventType.ASSISTANT_THINKING_MESSAGE:
    case EventType.ASSISTANT_STREAMING_THINKING_MESSAGE:
      // Update thinking content on last assistant message
      set(messagesAtom, (prev: Record<string, Message[]>) => {
        const sessionMessages = prev[sessionId] || [];
        const lastAssistantIndex = [...sessionMessages]
          .reverse()
          .findIndex((m) => m.role === 'assistant');

        if (lastAssistantIndex !== -1) {
          const actualIndex = sessionMessages.length - 1 - lastAssistantIndex;
          const message = sessionMessages[actualIndex];

          return {
            ...prev,
            [sessionId]: [
              ...sessionMessages.slice(0, actualIndex),
              { ...message, thinking: event.content as string },
              ...sessionMessages.slice(actualIndex + 1),
            ],
          };
        }

        return prev;
      });
      break;

    case EventType.TOOL_CALL:
      // Just log tool call - we'll match it with result later
      console.log('Tool call:', event.name);
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

      addToolResult(sessionId, result, get, set);
      break;

    case EventType.SYSTEM:
      const systemMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: event.message,
        timestamp: event.timestamp || Date.now(),
      };
      set(messagesAtom, (prev: Record<string, Message[]>) => {
        const sessionMessages = prev[sessionId] || [];
        return {
          ...prev,
          [sessionId]: [...sessionMessages, systemMessage],
        };
      });
      break;

    case EventType.AGENT_RUN_START:
      // Mark start of a new agent run
      set(isProcessingAtom, true);
      break;

    case EventType.AGENT_RUN_END:
      // Mark end of agent run
      set(isProcessingAtom, false);
      break;
  }
});

// Process a batch of events for history/playback
export const processEventBatch = atom(
  null,
  (
    get,
    set,
    params: {
      sessionId: string;
      events: Event[];
      isPlayback?: boolean;
    },
  ) => {
    const { sessionId, events, isPlayback = false } = params;

    // Initialize empty arrays for messages and tool results
    const sessionMessages: Message[] = [];
    const sessionToolResults: ToolResult[] = [];

    // Process events in sequence
    for (const event of events) {
      // If playback mode, add a small delay between events
      if (isPlayback) {
        // In real implementation, add delay handling here
      }

      // Process event using the same handler
      set(handleEventAction(sessionId, event));
    }
  },
);

// Get tool result for a specific tool call
export const getToolResultForCall = (toolCallId: string): ToolResult | undefined => {
  return toolCallResultMap.get(toolCallId);
};

// Clear tool result map when session changes
export const clearToolResultMap = () => {
  toolCallResultMap.clear();
};
