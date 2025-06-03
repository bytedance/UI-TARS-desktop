/* eslint-disable @typescript-eslint/no-explicit-any */
import { atom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import { Event, EventType, Message, ToolResult } from '../../types';
import { messagesAtom } from '../atoms/message';
import { toolResultsAtom, toolCallResultMap } from '../atoms/tool';
import { isProcessingAtom, activePanelContentAtom } from '../atoms/ui';
import { determineToolType } from '../../utils/formatters';
import { plansAtom, PlanKeyframe } from '../atoms/plan';
import type { PlanStep } from '@multimodal/agent-interface';
import { replayStateAtom } from '../atoms/replay';

// 存储工具调用参数的映射表 (不是 Atom，是内部缓存)
const toolCallArgumentsMap = new Map<string, any>();

/**
 * Process a single event and update the appropriate state atoms
 */
export const processEventAction = atom(
  null,
  (get, set, params: { sessionId: string; event: Event }) => {
    const { sessionId, event } = params;
    const replayState = get(replayStateAtom);
    const isReplayMode = replayState.isActive;

    switch (event.type) {
      case EventType.USER_MESSAGE:
        handleUserMessage(set, sessionId, event);
        break;

      case EventType.ASSISTANT_MESSAGE:
        handleAssistantMessage(get, set, sessionId, event);
        break;

      case EventType.ASSISTANT_STREAMING_MESSAGE:
        if (!isReplayMode) {
          handleStreamingMessage(get, set, sessionId, event);
        }
        break;

      case EventType.ASSISTANT_THINKING_MESSAGE:
      case EventType.ASSISTANT_STREAMING_THINKING_MESSAGE:
        handleThinkingMessage(get, set, sessionId, event);
        break;

      case EventType.TOOL_CALL:
        handleToolCall(set, sessionId, event);
        break;

      case EventType.TOOL_RESULT:
        handleToolResult(set, sessionId, event);
        break;

      case EventType.SYSTEM:
        handleSystemMessage(set, sessionId, event);
        break;

      case EventType.ENVIRONMENT_INPUT:
        handleEnvironmentInput(set, sessionId, event);
        break;

      case EventType.AGENT_RUN_START:
        set(isProcessingAtom, true);
        break;

      case EventType.AGENT_RUN_END:
        set(isProcessingAtom, false);
        break;

      case EventType.PLAN_START:
        handlePlanStart(set, sessionId, event);
        break;

      case EventType.PLAN_UPDATE:
        handlePlanUpdate(set, sessionId, event);
        break;

      case EventType.PLAN_FINISH:
        handlePlanFinish(set, sessionId, event);
        break;

      case EventType.FINAL_ANSWER:
        handleFinalAnswer(get, set, sessionId, event);
        break;

      case EventType.FINAL_ANSWER_STREAMING:
        if (!isReplayMode) {
          handleFinalAnswerStreaming(get, set, sessionId, event);
        }
        break;
    }
  },
);

export const updateProcessingStatusAction = atom(
  null,
  (get, set, status: { isProcessing: boolean; state?: string }) => {
    // Update processing state
    set(isProcessingAtom, !!status.isProcessing);
  },
);

/**
 * Handle user message event
 */
function handleUserMessage(set: any, sessionId: string, event: Event): void {
  const userMessage: Message = {
    id: event.id,
    role: 'user',
    content: event.content,
    timestamp: event.timestamp,
  };

  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];
    return {
      ...prev,
      [sessionId]: [...sessionMessages, userMessage],
    };
  });

  // Check for images in user message and set active panel content if found
  if (Array.isArray(event.content)) {
    const images = event.content.filter((part) => part.type === 'image_url');
    if (images.length > 0) {
      set(activePanelContentAtom, {
        type: 'image',
        source: images[0].image_url.url,
        title: 'User Upload',
        timestamp: Date.now(),
      });
    }
  }
}

/**
 * Handle assistant message event (complete message)
 */
function handleAssistantMessage(
  get: any,
  set: any,
  sessionId: string,
  event: Event & { messageId?: string; finishReason?: string },
): void {
  // 获取消息ID
  const messageId = event.messageId;

  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];

    // 检查是否已存在相同messageId的消息
    if (messageId) {
      const existingMessageIndex = sessionMessages.findIndex((msg) => msg.messageId === messageId);

      // 如果找到了现有消息，更新它而不是添加新消息
      if (existingMessageIndex !== -1) {
        const updatedMessages = [...sessionMessages];
        updatedMessages[existingMessageIndex] = {
          ...updatedMessages[existingMessageIndex],
          content: event.content,
          timestamp: event.timestamp,
          toolCalls: event.toolCalls,
          finishReason: event.finishReason,
          isStreaming: false,
        };

        return {
          ...prev,
          [sessionId]: updatedMessages,
        };
      }
    }

    // 没有找到现有消息，添加新消息
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
          messageId: messageId,
        },
      ],
    };
  });

  set(isProcessingAtom, false);
}

/**
 * Handle streaming message event (incremental content)
 */
function handleStreamingMessage(
  get: any,
  set: any,
  sessionId: string,
  event: Event & {
    content: string;
    isComplete?: boolean;
    messageId?: string;
    toolCalls?: any[];
  },
): void {
  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];
    const messageIdToFind = event.messageId;
    let existingMessageIndex = -1;

    // 优先按messageId查找
    if (messageIdToFind) {
      existingMessageIndex = sessionMessages.findIndex((msg) => msg.messageId === messageIdToFind);
    }
    // 没有messageId或未找到，尝试查找标记为streaming的最后一条消息
    else if (sessionMessages.length > 0) {
      const lastMessageIndex = sessionMessages.length - 1;
      const lastMessage = sessionMessages[lastMessageIndex];
      if (lastMessage && lastMessage.isStreaming) {
        existingMessageIndex = lastMessageIndex;
      }
    }

    // 更新现有消息
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

    // 创建新消息
    const newMessage: Message = {
      id: event.id || uuidv4(),
      role: 'assistant',
      content: event.content,
      timestamp: event.timestamp,
      isStreaming: !event.isComplete,
      toolCalls: event.toolCalls,
      messageId: event.messageId,
    };

    return {
      ...prev,
      [sessionId]: [...sessionMessages, newMessage],
    };
  });

  if (event.isComplete) {
    set(isProcessingAtom, false);
  }
}

/**
 * Handle thinking message event
 */
function handleThinkingMessage(
  get: any,
  set: any,
  sessionId: string,
  event: Event & { content: string; isComplete?: boolean },
): void {
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
          { ...message, thinking: event.content },
          ...sessionMessages.slice(actualIndex + 1),
        ],
      };
    }

    return prev;
  });
}

/**
 * Handle tool call event - store arguments for later use
 */
function handleToolCall(
  set: any,
  sessionId: string,
  event: Event & {
    toolCallId: string;
    name: string;
    arguments: any;
    startTime?: number;
  },
): void {
  // 保存工具调用的参数信息以便后续使用
  if (event.toolCallId && event.arguments) {
    toolCallArgumentsMap.set(event.toolCallId, event.arguments);
  }

  console.log('Tool call stored:', event.name, event.toolCallId);
}

/**
 * Handle tool result event
 */
function handleToolResult(
  set: any,
  sessionId: string,
  event: Event & {
    toolCallId: string;
    name: string;
    content: any;
    error?: string;
  },
): void {
  // 获取之前存储的参数信息
  const args = toolCallArgumentsMap.get(event.toolCallId);

  // 添加调试日志来跟踪内容格式
  console.log(`Tool result for ${event.name}:`, {
    content: event.content,
    isArray: Array.isArray(event.content),
    hasTextItems:
      Array.isArray(event.content) && event.content.some((item) => item.type === 'text'),
    names: Array.isArray(event.content) ? event.content.map((item) => item.name) : 'not-an-array',
  });

  // 如果内容是标准化工具结果格式的数组，则直接使用
  const isStandardFormat =
    Array.isArray(event.content) &&
    event.content.length > 0 &&
    typeof event.content[0] === 'object' &&
    'type' in event.content[0];

  const result: ToolResult = {
    id: uuidv4(),
    toolCallId: event.toolCallId,
    name: event.name,
    content: event.content,
    timestamp: event.timestamp,
    error: event.error,
    type: determineToolType(event.name, event.content),
    arguments: args, // 使用保存的参数信息
  };

  // 添加调试日志，显示确定的类型
  console.log(`Determined type for ${event.name}: ${result.type}`);

  // Store in the map for future reference
  toolCallResultMap.set(result.toolCallId, result);

  // Add to toolResults atom
  set(toolResultsAtom, (prev: Record<string, ToolResult[]>) => {
    const sessionResults = prev[sessionId] || [];
    return {
      ...prev,
      [sessionId]: [...sessionResults, result],
    };
  });

  // Set as active panel content
  set(activePanelContentAtom, {
    type: result.type,
    source: result.content,
    title: result.name,
    timestamp: result.timestamp,
    toolCallId: result.toolCallId,
    error: result.error,
    arguments: args, // 使用正确的变量 args 而不是全局的 arguments
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
}

/**
 * Handle system message event
 */
function handleSystemMessage(
  set: any,
  sessionId: string,
  event: Event & { message: string; level?: string },
): void {
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
}

/**
 * Handle environment input event
 * Adds it to messages but doesn't set it as active panel content
 */
function handleEnvironmentInput(
  set: any,
  sessionId: string,
  event: Event & { description?: string },
): void {
  const environmentMessage: Message = {
    id: event.id,
    role: 'environment',
    content: event.content,
    timestamp: event.timestamp,
    description: event.description || 'Environment Input',
  };

  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];
    return {
      ...prev,
      [sessionId]: [...sessionMessages, environmentMessage],
    };
  });
}

/**
 * Handle plan start event
 */
function handlePlanStart(set: any, sessionId: string, event: Event & { sessionId: string }): void {
  console.log('Plan start event:', event);
  set(plansAtom, (prev: Record<string, any>) => ({
    ...prev,
    [sessionId]: {
      steps: [],
      isComplete: false,
      summary: null,
      hasGeneratedPlan: true,
      keyframes: [], // Initialize empty keyframes array
    },
  }));
}

/**
 * Handle plan update event
 */
function handlePlanUpdate(
  set: any,
  sessionId: string,
  event: Event & { sessionId: string; steps: PlanStep[] },
): void {
  console.log('Plan update event:', event);
  set(plansAtom, (prev: Record<string, any>) => {
    const currentPlan = prev[sessionId] || {
      steps: [],
      isComplete: false,
      summary: null,
      hasGeneratedPlan: true,
      keyframes: [],
    };

    // Create a new keyframe for this update
    const newKeyframe: PlanKeyframe = {
      timestamp: event.timestamp || Date.now(),
      steps: event.steps,
      isComplete: false,
      summary: null,
    };

    // Add the keyframe to the history
    const keyframes = [...(currentPlan.keyframes || []), newKeyframe];

    return {
      ...prev,
      [sessionId]: {
        ...currentPlan,
        steps: event.steps,
        hasGeneratedPlan: true,
        keyframes,
      },
    };
  });
}

/**
 * Handle plan finish event
 */
function handlePlanFinish(
  set: any,
  sessionId: string,
  event: Event & { sessionId: string; summary: string },
): void {
  console.log('Plan finish event:', event);
  set(plansAtom, (prev: Record<string, any>) => {
    const currentPlan = prev[sessionId] || {
      steps: [],
      isComplete: false,
      summary: null,
      hasGeneratedPlan: true,
      keyframes: [],
    };

    // Create a final keyframe for the completed plan
    const finalKeyframe: PlanKeyframe = {
      timestamp: event.timestamp || Date.now(),
      steps: currentPlan.steps,
      isComplete: true,
      summary: event.summary,
    };

    // Add the final keyframe to the history
    const keyframes = [...(currentPlan.keyframes || []), finalKeyframe];

    return {
      ...prev,
      [sessionId]: {
        ...currentPlan,
        isComplete: true,
        summary: event.summary,
        keyframes,
      },
    };
  });
}

/**
 * Handle final answer event (complete answer/report)
 */
function handleFinalAnswer(
  get: any,
  set: any,
  sessionId: string,
  event: Event & {
    content: string;
    isDeepResearch: boolean;
    title?: string;
    format?: string;
    messageId?: string;
  },
): void {
  const messageId = event.messageId || `final-answer-${uuidv4()}`;

  // 始终将内容当作研究报告处理，移除JSON_DATA状态
  // 设置活动面板内容为研究报告
  set(activePanelContentAtom, {
    type: 'research_report',
    source: event.content,
    title: event.title || 'Research Report',
    timestamp: event.timestamp,
    isDeepResearch: true,
    messageId,
  });

  // 添加消息到聊天引用报告
  const finalAnswerMessage: Message = {
    id: event.id || uuidv4(),
    role: 'final_answer',
    content: event.content, // 存储完整内容以便后续访问
    timestamp: event.timestamp,
    messageId,
    isDeepResearch: true,
    title: event.title || 'Research Report',
  };

  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];
    return {
      ...prev,
      [sessionId]: [...sessionMessages, finalAnswerMessage],
    };
  });

  // 标记处理完成
  set(isProcessingAtom, false);
}

function handleFinalAnswerStreaming(
  get: any,
  set: any,
  sessionId: string,
  event: Event & {
    content: string;
    isDeepResearch: boolean;
    isComplete?: boolean;
    messageId?: string;
    title?: string;
  },
): void {
  const messageId = event.messageId || `final-answer-${uuidv4()}`;

  // 从当前消息列表中查找已有的相同 messageId 的消息
  const messages = get(messagesAtom)[sessionId] || [];
  const existingMessageIndex = messages.findIndex((msg) => msg.messageId === messageId);

  // 当处理一系列流式事件时，将内容追加到现有消息，或创建新消息
  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];

    // 如果找到现有消息，则更新它
    if (existingMessageIndex >= 0) {
      const existingMessage = sessionMessages[existingMessageIndex];
      const updatedMessage = {
        ...existingMessage,
        content:
          typeof existingMessage.content === 'string'
            ? existingMessage.content + event.content
            : event.content,
        isStreaming: !event.isComplete,
        timestamp: event.timestamp,
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

    // 否则创建新消息
    const newMessage: Message = {
      id: event.id || uuidv4(),
      role: 'final_answer',
      content: event.content,
      timestamp: event.timestamp,
      messageId,
      isDeepResearch: true,
      isStreaming: !event.isComplete,
      title: event.title || 'Research Report',
    };

    return {
      ...prev,
      [sessionId]: [...sessionMessages, newMessage],
    };
  });

  // 更新活动面板内容 - 同步面板与消息状态
  set(activePanelContentAtom, (prev: any) => {
    // 如果是新流或不同的messageId，重新开始
    if (!prev || prev.type !== 'research_report' || prev.messageId !== messageId) {
      return {
        role: 'assistant',
        type: 'research_report',
        source: event.content,
        title: event.title || 'Research Report (Generating...)',
        timestamp: event.timestamp,
        isDeepResearch: true,
        messageId,
        isStreaming: !event.isComplete,
      };
    }

    // 否则追加到现有内容
    return {
      ...prev,
      source: prev.source + event.content,
      isStreaming: !event.isComplete,
      timestamp: event.timestamp,
      title: event.title || prev.title,
    };
  });

  // 如果这是第一个数据块，也添加一条消息到聊天
  const prevActivePanelContent = get(activePanelContentAtom);
  if (!prevActivePanelContent || prevActivePanelContent.messageId !== messageId) {
    const initialMessage: Message = {
      id: event.id || uuidv4(),
      role: 'final_answer',
      content: event.content, // 存储初始内容
      timestamp: event.timestamp,
      messageId,
      isDeepResearch: true,
      isStreaming: !event.isComplete,
      title: event.title || 'Research Report',
    };

    set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];
      return {
        ...prev,
        [sessionId]: [...sessionMessages, initialMessage],
      };
    });
  } else if (event.isComplete) {
    // 当流式生成完成时，更新消息的完整内容
    const fullContent = get(activePanelContentAtom).source;

    set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];
      const messageIndex = sessionMessages.findIndex((msg) => msg.messageId === messageId);

      if (messageIndex >= 0) {
        const updatedMessages = [...sessionMessages];
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          content: fullContent,
          isStreaming: false,
          title: event.title || updatedMessages[messageIndex].title || 'Research Report',
        };

        return {
          ...prev,
          [sessionId]: updatedMessages,
        };
      }

      return prev;
    });
  }

  // 如果这是最后一个数据块，标记处理完成
  if (event.isComplete) {
    set(isProcessingAtom, false);
  }
}
