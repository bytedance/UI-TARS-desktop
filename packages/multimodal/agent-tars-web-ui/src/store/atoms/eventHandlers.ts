import { atom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import { Event, EventType, Message, ToolResult } from '../../types';
import {
  messagesAtom,
  toolResultsAtom,
  isProcessingAtom,
  activePanelContentAtom,
  sessionsAtom,
} from './sessionAtoms';
import { ApiService } from '../../services/api';

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
  event: Event & { content: string; isComplete?: boolean; messageId?: string },
  get: any,
  set: any,
) => {
  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];

    // 尝试基于messageId查找现有消息
    const messageIdToFind = event.messageId;
    let existingMessageIndex = -1;

    if (messageIdToFind) {
      existingMessageIndex = sessionMessages.findIndex((msg) => msg.messageId === messageIdToFind);
    } else if (sessionMessages.length > 0) {
      // 向后兼容: 如果没有messageId，则查找最后一条流式消息
      const lastMessage = sessionMessages[sessionMessages.length - 1];
      if (lastMessage && lastMessage.isStreaming) {
        existingMessageIndex = sessionMessages.length - 1;
      }
    }

    // 如果找到了已有消息，更新它
    if (existingMessageIndex !== -1) {
      const existingMessage = sessionMessages[existingMessageIndex];
      const updatedMessage = {
        ...existingMessage,
        content:
          typeof existingMessage.content === 'string'
            ? existingMessage.content + event.content
            : event.content,
        isStreaming: !event.isComplete,
        toolCalls: event.toolCalls || existingMessage.toolCalls,
      };

      return {
        ...prev,
        [sessionId]: [
          ...sessionMessages.slice(0, existingMessageIndex),
          updatedMessage,
          ...sessionMessages.slice(existingMessageIndex + 1),
        ],
      };
    }

    // 如果没有找到现有消息，创建新消息
    const newMessage: Message = {
      id: event.id || uuidv4(),
      role: 'assistant',
      content: event.content,
      timestamp: event.timestamp,
      isStreaming: !event.isComplete,
      toolCalls: event.toolCalls,
      messageId: event.messageId, // 保存messageId便于后续关联
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
    error: result.error,
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

      // Check for images in user message and show them in the panel
      checkForImagesAndSetActive(sessionId, event.content, set);
      break;

    case EventType.ASSISTANT_MESSAGE:
      // 检查是否有messageId并基于messageId查找现有消息
      const messageId = (event as any).messageId;

      set(messagesAtom, (prev: Record<string, Message[]>) => {
        const sessionMessages = prev[sessionId] || [];
        let existingMessageIndex = -1;

        if (messageId) {
          // 优先通过messageId查找
          existingMessageIndex = sessionMessages.findIndex((msg) => msg.messageId === messageId);
        } else if (sessionMessages.length > 0) {
          // 向后兼容: 如果没有messageId，则检查最后一条流式消息
          const lastMessage = sessionMessages[sessionMessages.length - 1];
          if (lastMessage && lastMessage.isStreaming && lastMessage.id === event.id) {
            existingMessageIndex = sessionMessages.length - 1;
          }
        }

        // 如果找到了已有消息，更新它
        if (existingMessageIndex !== -1) {
          const existingMessage = sessionMessages[existingMessageIndex];

          // 合并消息，保留流式过程中累积的内容
          return {
            ...prev,
            [sessionId]: [
              ...sessionMessages.slice(0, existingMessageIndex),
              {
                ...existingMessage,
                isStreaming: false,
                toolCalls: event.toolCalls || existingMessage.toolCalls,
                finishReason: (event as any).finishReason,
                // 内容已经通过流式消息累积，不需要替换
              },
              ...sessionMessages.slice(existingMessageIndex + 1),
            ],
          };
        } else {
          // 如果没有找到现有消息，添加新消息
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
                finishReason: (event as any).finishReason,
                messageId: messageId,
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

      // Add tool result and automatically show it in panel
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

// Enhanced helper function to determine if an event should be aggregated with previous events
const shouldAggregateEvent = (event: Event, prevEvent: Event | null): boolean => {
  if (!prevEvent) return false;

  // Aggregate assistant streaming messages for smoother replay
  if (
    event.type === EventType.ASSISTANT_STREAMING_MESSAGE &&
    prevEvent.type === EventType.ASSISTANT_STREAMING_MESSAGE
  ) {
    return true;
  }

  // Aggregate thinking messages
  if (
    event.type === EventType.ASSISTANT_STREAMING_THINKING_MESSAGE &&
    prevEvent.type === EventType.ASSISTANT_STREAMING_THINKING_MESSAGE
  ) {
    return true;
  }

  return false;
};

// Enhanced grouping function that ensures events are logically grouped for replay
// 为回放增强分组函数，确保事件在逻辑上分组
export const groupEventsForReplay = (events: Event[]): Event[][] => {
  const groups: Event[][] = [];
  let currentGroup: Event[] = [];
  let currentMessageId: string | null = null;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const prevEvent = i > 0 ? events[i - 1] : null;
    const eventMessageId = (event as any).messageId;

    // 开始新的对话轮次
    if (event.type === EventType.USER_MESSAGE || event.type === EventType.AGENT_RUN_START) {
      if (currentGroup.length > 0) {
        groups.push([...currentGroup]);
        currentGroup = [];
      }
      currentMessageId = eventMessageId || null;
      currentGroup.push(event);
      continue;
    }

    // 如果有messageId，则使用它关联事件
    if (eventMessageId) {
      // 如果是新的messageId，则结束当前组并开始新组
      if (currentMessageId && eventMessageId !== currentMessageId) {
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
          currentGroup = [];
        }
        currentMessageId = eventMessageId;
      } else {
        currentMessageId = eventMessageId;
      }
    }

    // 处理助手消息事件
    if (
      event.type === EventType.ASSISTANT_STREAMING_MESSAGE ||
      event.type === EventType.ASSISTANT_MESSAGE
    ) {
      // 如果是完整消息，并且我们已经有了流式块，则确保它们在同一组中
      if (
        event.type === EventType.ASSISTANT_MESSAGE &&
        currentGroup.some((e) => e.type === EventType.ASSISTANT_STREAMING_MESSAGE)
      ) {
        // 如果有messageId匹配，保持在同一组中，否则结束当前组
        const hasMatchingStreamingEvent = currentGroup.some(
          (e) =>
            e.type === EventType.ASSISTANT_STREAMING_MESSAGE &&
            (e as any).messageId === eventMessageId,
        );

        if (!hasMatchingStreamingEvent) {
          groups.push([...currentGroup]);
          currentGroup = [];
        }
      }

      // 添加到当前组
      currentGroup.push(event);
      continue;
    }

    // 工具调用应该开始新组
    if (event.type === EventType.TOOL_CALL) {
      // 如果当前组中有内容，则完成它
      if (currentGroup.length > 0) {
        groups.push([...currentGroup]);
        currentGroup = [];
      }
      currentGroup.push(event);
      continue;
    }

    // 工具结果属于其工具调用
    if (event.type === EventType.TOOL_RESULT) {
      currentGroup.push(event);
      // 工具结果后结束组
      groups.push([...currentGroup]);
      currentGroup = [];
      continue;
    }

    // 默认：添加到当前组
    currentGroup.push(event);
  }

  // 添加任何剩余事件
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
};

export const processEventBatch = atom(
  null,
  (
    get,
    set,
    params: {
      sessionId: string;
      events: Event[];
      isPlayback?: boolean;
      speed?: number;
    },
  ) => {
    const { sessionId, events, isPlayback = false, speed = 1 } = params;

    // 如果是回放，处理事件时添加延迟模拟实时流
    if (isPlayback) {
      // 重置该会话的现有状态
      set(messagesAtom, (prev) => ({ ...prev, [sessionId]: [] }));
      set(toolResultsAtom, (prev) => ({ ...prev, [sessionId]: [] }));
      set(isProcessingAtom, true);

      // 按逻辑单元分组事件以维持对话流
      const eventGroups = groupEventsForReplay(events);

      // 处理每个组，使用适当的延迟
      const processGroups = async () => {
        const messageIdMap = new Map<string, string>(); // 跟踪messageId -> eventId的映射

        for (let i = 0; i < eventGroups.length; i++) {
          const group = eventGroups[i];

          // 处理组中的每个事件
          for (const event of group) {
            // 确保流式消息和完整消息有相同的messageId
            if (
              event.type === EventType.ASSISTANT_STREAMING_MESSAGE ||
              event.type === EventType.ASSISTANT_MESSAGE
            ) {
              const messageId = (event as any).messageId;
              if (messageId) {
                messageIdMap.set(messageId, event.id);
              }
            }

            set(handleEventAction, sessionId, event);

            // 在同一组中的事件之间添加小延迟以获得自然流
            // 根据速度设置调整延迟
            if (event.type === EventType.ASSISTANT_STREAMING_MESSAGE) {
              await new Promise((resolve) => setTimeout(resolve, 30 / speed));
            }
          }

          // 在组之间添加更大的延迟以模拟真实交互暂停
          if (i < eventGroups.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500 / speed));
          }
        }

        // 完成处理
        set(isProcessingAtom, false);
      };

      processGroups();
    } else {
      // 正常批处理（非回放）
      events.forEach((event) => {
        set(handleEventAction, sessionId, event);
      });
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

// Handle event to generate summary when conversation ends
export const handleEventWithSummary = atom(
  null,
  async (get, set, sessionId: string, event: Event) => {
    // First handle the event normally
    set(handleEventAction, sessionId, event);

    // Generate summary when a user message is sent
    if (event.type === EventType.USER_MESSAGE) {
      const allMessages = get(messagesAtom)[sessionId] || [];

      // Only proceed if we have actual conversation messages
      if (allMessages.length > 1) {
        try {
          // Convert messages to format expected by LLM API
          const apiMessages = allMessages.map((msg) => ({
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : 'multimodal content',
          }));

          // Request summary generation
          const summary = await ApiService.generateSummary(sessionId, apiMessages);

          // Update session name with the generated summary
          if (summary) {
            await ApiService.updateSession(sessionId, { name: summary });

            // Also update sessions in the atom to reflect the change immediately
            set(sessionsAtom, (prev) =>
              prev.map((session) =>
                session.id === sessionId ? { ...session, name: summary } : session,
              ),
            );
          }
        } catch (error) {
          console.error('Failed to generate or update summary:', error);
        }
      }
    }
  },
);
