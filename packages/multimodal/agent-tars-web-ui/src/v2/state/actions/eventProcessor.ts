/* eslint-disable @typescript-eslint/no-explicit-any */
import { atom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import { Event, EventType, Message, ToolResult } from '../../types';
import { messagesAtom } from '../atoms/message';
import { toolResultsAtom, toolCallResultMap } from '../atoms/tool';
import { isProcessingAtom, activePanelContentAtom } from '../atoms/ui';
import { determineToolType } from '../../utils/formatters';
import { plansAtom, PlanKeyframe } from '../atoms/plan';
import { PlanStep } from '@multimodal/agent-interface';

// 存储工具调用参数的映射表 (不是 Atom，是内部缓存)
const toolCallArgumentsMap = new Map<string, any>();

/**
 * Process a single event and update the appropriate state atoms
 */
export const processEventAction = atom(
  null,
  (get, set, params: { sessionId: string; event: Event }) => {
    const { sessionId, event } = params;

    switch (event.type) {
      case EventType.USER_MESSAGE:
        handleUserMessage(set, sessionId, event);
        break;

      case EventType.ASSISTANT_MESSAGE:
        handleAssistantMessage(get, set, sessionId, event);
        break;

      case EventType.ASSISTANT_STREAMING_MESSAGE:
        handleStreamingMessage(get, set, sessionId, event);
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
  const messageId = event.messageId;

  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];
    let existingMessageIndex = -1;

    if (messageId) {
      // Find by messageId if provided
      existingMessageIndex = sessionMessages.findIndex((msg) => msg.messageId === messageId);
    } else if (sessionMessages.length > 0) {
      // Fallback: Look for streaming message
      const lastMessage = sessionMessages[sessionMessages.length - 1];
      if (lastMessage && lastMessage.isStreaming && lastMessage.id === event.id) {
        existingMessageIndex = sessionMessages.length - 1;
      }
    }

    // Update existing message if found
    if (existingMessageIndex !== -1) {
      const existingMessage = sessionMessages[existingMessageIndex];

      return {
        ...prev,
        [sessionId]: [
          ...sessionMessages.slice(0, existingMessageIndex),
          {
            ...existingMessage,
            isStreaming: false,
            toolCalls: event.toolCalls || existingMessage.toolCalls,
            finishReason: event.finishReason,
            // Content already accumulated via streaming
          },
          ...sessionMessages.slice(existingMessageIndex + 1),
        ],
      };
    }

    // Add new message if not found
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

    if (messageIdToFind) {
      existingMessageIndex = sessionMessages.findIndex((msg) => msg.messageId === messageIdToFind);
    } else if (sessionMessages.length > 0) {
      // Fallback for backward compatibility
      const lastMessage = sessionMessages[sessionMessages.length - 1];
      if (lastMessage && lastMessage.isStreaming) {
        existingMessageIndex = sessionMessages.length - 1;
      }
    }

    // Update existing message
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

    // Create new message
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