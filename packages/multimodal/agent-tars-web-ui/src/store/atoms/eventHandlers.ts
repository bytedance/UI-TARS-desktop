import { atom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import { Event, EventType, Message, ToolResult } from '../../types';
import { messagesAtom, toolResultsAtom, isProcessingAtom } from './sessionAtoms';

// 确定工具类型的辅助函数
export const determineToolType = (name: string, content: any): ToolResult['type'] => {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('search')) return 'search';
  if (lowerName.includes('browser')) return 'browser';
  if (lowerName.includes('command') || lowerName.includes('terminal')) return 'command';
  if (lowerName.includes('file') || lowerName.includes('document')) return 'file';

  // 检查内容是否包含图像数据
  if (
    content &&
    ((typeof content === 'object' && content.type === 'image') ||
      (typeof content === 'string' && content.startsWith('data:image/')))
  ) {
    return 'image';
  }

  return 'other';
};

// 添加消息的辅助函数
const addMessage = (sessionId: string, message: Message, get: any, set: any) => {
  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];
    return {
      ...prev,
      [sessionId]: [...sessionMessages, message],
    };
  });
};

// 处理流式消息
const handleStreamingMessage = (
  sessionId: string,
  event: Event & { content: string; isComplete?: boolean },
  get: any,
  set: any,
) => {
  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];
    const lastMessage = sessionMessages[sessionMessages.length - 1];

    // 如果已有流式消息，则更新它
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

    // 否则，添加新的流式消息
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

// 更新思考内容
const updateThinking = (
  sessionId: string,
  content: string,
  isComplete?: boolean,
  get: any,
  set: any,
) => {
  set(messagesAtom, (prev: Record<string, Message[]>) => {
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
};

// 添加工具结果
const addToolResult = (sessionId: string, result: ToolResult, get: any, set: any) => {
  set(toolResultsAtom, (prev: Record<string, ToolResult[]>) => {
    const sessionResults = prev[sessionId] || [];
    return {
      ...prev,
      [sessionId]: [...sessionResults, result],
    };
  });

  // 同时链接到具有工具调用的最后一条消息
  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];

    // 查找具有此工具调用的最后一条消息
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

// 事件处理主函数 - 此版本用于从Jotai atom调用，有get和set参数
export const handleEventAction = atom(null, (get, set, sessionId: string, event: Event) => {
  console.log('Event received:', event);

  switch (event.type) {
    case EventType.USER_MESSAGE:
      const userMessage: Message = {
        id: event.id,
        role: 'user',
        content: event.content,
        timestamp: event.timestamp,
      };
      addMessage(sessionId, userMessage, get, set);
      break;

    case EventType.ASSISTANT_MESSAGE:
      set(messagesAtom, (prev: Record<string, Message[]>) => {
        const sessionMessages = prev[sessionId] || [];
        const lastMessage = sessionMessages[sessionMessages.length - 1];

        // 如果最后一条消息是流式消息，更新它而不是添加新消息
        if (lastMessage && lastMessage.isStreaming) {
          return prev;
        } else {
          // 如果没有流式消息，添加新消息
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
      set(isProcessingAtom, false);
      break;

    case EventType.ASSISTANT_STREAMING_MESSAGE:
      handleStreamingMessage(sessionId, event as any, get, set);
      break;

    case EventType.ASSISTANT_THINKING_MESSAGE:
    case EventType.ASSISTANT_STREAMING_THINKING_MESSAGE:
      updateThinking(sessionId, event.content as string, event.isComplete, get, set);
      break;

    case EventType.TOOL_CALL:
      // 仅记录工具调用
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
      addToolResult(sessionId, result, get, set);
      break;

    case EventType.SYSTEM:
      const systemMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: event.message,
        timestamp: event.timestamp || Date.now(),
      };
      addMessage(sessionId, systemMessage, get, set);
      break;
  }
});

// 历史事件处理版本 - 此版本用于初始加载历史事件
export const handleEventHistory = (
  sessionId: string,
  event: Event,
  sessionMessages: Message[],
  sessionToolResults: ToolResult[],
): void => {
  switch (event.type) {
    case EventType.USER_MESSAGE:
      sessionMessages.push({
        id: event.id,
        role: 'user',
        content: event.content,
        timestamp: event.timestamp,
      });
      break;

    case EventType.ASSISTANT_MESSAGE:
      sessionMessages.push({
        id: event.id,
        role: 'assistant',
        content: event.content,
        timestamp: event.timestamp,
        toolCalls: event.toolCalls,
      });
      break;

    case EventType.ASSISTANT_STREAMING_MESSAGE:
      // 对于历史记录，将流式消息视为完整消息
      const existingMessage = sessionMessages.find((m) => m.id === event.id);

      if (
        existingMessage &&
        typeof existingMessage.content === 'string' &&
        typeof event.content === 'string'
      ) {
        existingMessage.content += event.content;
      } else if (!existingMessage) {
        sessionMessages.push({
          id: event.id || uuidv4(),
          role: 'assistant',
          content: event.content,
          timestamp: event.timestamp,
          toolCalls: event.toolCalls,
        });
      }
      break;

    case EventType.ASSISTANT_THINKING_MESSAGE:
    case EventType.ASSISTANT_STREAMING_THINKING_MESSAGE:
      // 查找最后一条助手消息并更新其思考内容
      const lastAssistantIndex = [...sessionMessages]
        .reverse()
        .findIndex((m) => m.role === 'assistant');

      if (lastAssistantIndex !== -1) {
        const actualIndex = sessionMessages.length - 1 - lastAssistantIndex;
        sessionMessages[actualIndex].thinking = event.content as string;
      }
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

      sessionToolResults.push(result);

      // 链接到相应的消息
      const messageIndex = [...sessionMessages]
        .reverse()
        .findIndex((m) => m.toolCalls?.some((tc) => tc.id === result.toolCallId));

      if (messageIndex !== -1) {
        const actualIndex = sessionMessages.length - 1 - messageIndex;
        const message = sessionMessages[actualIndex];

        message.toolResults = message.toolResults || [];
        message.toolResults.push(result);
      }
      break;

    case EventType.SYSTEM:
      sessionMessages.push({
        id: uuidv4(),
        role: 'system',
        content: event.message,
        timestamp: event.timestamp || Date.now(),
      });
      break;
  }
};
