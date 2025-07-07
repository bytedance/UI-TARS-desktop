/* eslint-disable @typescript-eslint/no-explicit-any */
import { atom, Setter, Getter } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import { AgentEventStream, ToolResult, Message } from '@/common/types';
import { determineToolType } from '@/common/utils/formatters';
import { messagesAtom } from '../atoms/message';
import { toolResultsAtom, toolCallResultMap } from '../atoms/tool';
import { isProcessingAtom, activePanelContentAtom, modelInfoAtom } from '../atoms/ui';
import { plansAtom, PlanKeyframe } from '../atoms/plan';
import { replayStateAtom } from '../atoms/replay';
import { ChatCompletionContentPartImage } from '@multimodal/agent-interface';
import { jsonrepair } from 'jsonrepair';

// Store tool call arguments mapping (not an Atom, internal cache)
const toolCallArgumentsMap = new Map<string, any>();

// Store streaming tool call arguments accumulation
const streamingToolCallArgsMap = new Map<string, string>();

/**
 * Process a single event and update the appropriate state atoms
 */
export const processEventAction = atom(
  null,
  (get, set, params: { sessionId: string; event: AgentEventStream.Event }) => {
    const { sessionId, event } = params;
    const replayState = get(replayStateAtom);
    const isReplayMode = replayState.isActive;

    switch (event.type) {
      case 'user_message':
        handleUserMessage(set, sessionId, event);
        break;

      case 'assistant_message':
        handleAssistantMessage(get, set, sessionId, event);
        break;

      case 'assistant_streaming_message':
        if (!isReplayMode) {
          handleStreamingMessage(get, set, sessionId, event);
        }
        break;

      case 'assistant_streaming_tool_call':
        if (!isReplayMode) {
          handleStreamingToolCall(get, set, sessionId, event);
        }
        break;

      case 'assistant_thinking_message':
      case 'assistant_streaming_thinking_message':
        handleThinkingMessage(get, set, sessionId, event);
        break;

      case 'tool_call':
        handleToolCall(set, sessionId, event);
        break;

      case 'tool_result':
        handleToolResult(set, sessionId, event);
        break;

      case 'system':
        handleSystemMessage(set, sessionId, event);
        break;

      case 'environment_input':
        handleEnvironmentInput(get, set, sessionId, event);
        break;

      case 'agent_run_start':
        if (event.provider || event.model) {
          set(modelInfoAtom, {
            provider: event.provider || '',
            model: event.model || '',
          });
        }
        set(isProcessingAtom, true);
        break;

      case 'agent_run_end':
        set(isProcessingAtom, false);
        break;

      case 'plan_start':
        handlePlanStart(set, sessionId, event);
        break;

      case 'plan_update':
        handlePlanUpdate(set, sessionId, event);
        break;

      case 'plan_finish':
        handlePlanFinish(set, sessionId, event);
        break;

      case 'final_answer':
        handleFinalAnswer(get, set, sessionId, event);
        break;

      case 'final_answer_streaming':
        if (!isReplayMode) {
          handleFinalAnswerStreaming(get, set, sessionId, event);
        }
        break;
    }
  },
);

/**
 * Handle user message event
 */
function handleUserMessage(
  set: Setter,
  sessionId: string,
  event: AgentEventStream.UserMessageEvent,
): void {
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
  set: Setter,
  sessionId: string,
  event: AgentEventStream.AssistantMessageEvent,
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

  if (event.finishReason !== 'tool_calls') {
    // 检查是否需要关联最近的环境输入
    const currentMessages = get(messagesAtom)[sessionId] || [];

    // 从后往前查找最近的环境输入
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      const msg = currentMessages[i];
      if (msg.role === 'environment' && Array.isArray(msg.content)) {
        const imageContent = msg.content.find(
          (item) => item.type === 'image_url' && item.image_url && item.image_url.url,
        );

        if (imageContent) {
          set(activePanelContentAtom, {
            type: 'image',
            source: msg.content,
            title: msg.description || 'Final Browser State',
            timestamp: msg.timestamp,
            environmentId: msg.id,
          });
          break;
        }
      }
    }
  }

  set(isProcessingAtom, false);
}

/**
 * Handle streaming message event (incremental content)
 */
function handleStreamingMessage(
  get: any,
  set: Setter,
  sessionId: string,
  event: AgentEventStream.AssistantStreamingMessageEvent,
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
      if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
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
  set: Setter,
  sessionId: string,
  event:
    | AgentEventStream.AssistantThinkingMessageEvent
    | AgentEventStream.AssistantStreamingThinkingMessageEvent,
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
  set: Setter,
  sessionId: string,
  event: AgentEventStream.ToolCallEvent,
): void {
  // 保存工具调用的参数信息以便后续使用
  if (event.toolCallId && event.arguments) {
    toolCallArgumentsMap.set(event.toolCallId, event.arguments);
  }
}

function handleToolResult(set: Setter, sessionId: string, event: AgentEventStream.ToolResultEvent) {
  // 获取之前存储的参数信息
  const args = toolCallArgumentsMap.get(event.toolCallId);

  const result: ToolResult = {
    id: uuidv4(),
    toolCallId: event.toolCallId,
    name: event.name,
    content: event.content,
    timestamp: event.timestamp,
    error: event.error,
    type: determineToolType(event.name, event.content),
    arguments: args,
    _extra: event._extra,
  };

  // 1. 先更新消息atom和工具结果 - 确保chat UI能立即响应
  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];

    // 找到对应的消息并添加toolResults
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

  // 2. 同时更新工具结果atom
  set(toolResultsAtom, (prev: Record<string, ToolResult[]>) => {
    const sessionResults = prev[sessionId] || [];
    return {
      ...prev,
      [sessionId]: [...sessionResults, result],
    };
  });

  // 3. 最后更新workspace面板内容 - 保持时序一致
  if (result.type === 'browser_vision_control') {
    set(activePanelContentAtom, (prev) => {
      if (prev && prev.type === 'image' && prev.environmentId) {
        // 在这里添加环境ID到已处理列表，避免重复渲染
        const environmentId = prev.environmentId;

        return {
          ...prev,
          type: 'browser_vision_control',
          source: event.content,
          title: prev.title,
          timestamp: event.timestamp,
          toolCallId: event.toolCallId,
          error: event.error,
          arguments: args,
          originalContent: prev.source,

          environmentId: environmentId,
          processedEnvironmentIds: [environmentId], // 新增：记录已处理的环境ID
        };
      } else {
        return {
          type: result.type,
          source: result.content,
          title: result.name,
          timestamp: result.timestamp,
          toolCallId: result.toolCallId,
          error: result.error,
          arguments: args,
        };
      }
    });
  } else {
    set(activePanelContentAtom, {
      type: result.type,
      source: result.content,
      title: result.name,
      timestamp: result.timestamp,
      toolCallId: result.toolCallId,
      error: result.error,
      arguments: args,
      _extra: result._extra,
    });
  }

  // Store in the map for future reference
  toolCallResultMap.set(result.toolCallId, result);
}

/**
 * Handle system message event
 */
function handleSystemMessage(
  set: Setter,
  sessionId: string,
  event: AgentEventStream.Event & { message: string; level?: string },
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
  get: Getter,
  set: Setter,
  sessionId: string,
  event: AgentEventStream.EnvironmentInputEvent,
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
  // 检查是否包含图片内容并直接设置为活动面板内容
  if (Array.isArray(event.content)) {
    const imageContent = event.content.find(
      (item) => item.type === 'image_url' && item.image_url && item.image_url.url,
    ) as ChatCompletionContentPartImage;

    if (imageContent && imageContent.image_url) {
      // 获取当前面板状态
      const currentPanel = get(activePanelContentAtom);

      // 只有当前面板是 browser_vision_control 类型时才更新
      if (currentPanel && currentPanel.type === 'browser_vision_control') {
        set(activePanelContentAtom, {
          ...currentPanel,
          type: 'browser_vision_control',
          title: `${currentPanel.title} · Screenshot Update`,
          timestamp: event.timestamp,
          originalContent: event.content,
          environmentId: event.id,
        });
      }
      // 不是 browser_vision_control 类型时完全跳过 set 操作
      // 这样避免了 Browser Screenshot 被重复渲染
    }
  }
}

/**
 * Handle plan start event
 */
function handlePlanStart(
  set: Setter,
  sessionId: string,
  event: AgentEventStream.PlanStartEvent,
): void {
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
  set: Setter,
  sessionId: string,
  event: AgentEventStream.PlanUpdateEvent,
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
  set: Setter,
  sessionId: string,
  event: AgentEventStream.Event & { sessionId: string; summary: string },
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
  set: Setter,
  sessionId: string,
  event: AgentEventStream.FinalAnswerEvent,
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
  set: Setter,
  sessionId: string,
  event: AgentEventStream.Event & {
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

/**
 * Handle streaming tool call event - accumulate arguments for real-time display
 */
function handleStreamingToolCall(
  get: any,
  set: Setter,
  sessionId: string,
  event: AgentEventStream.AssistantStreamingToolCallEvent,
): void {
  const { toolCallId, toolName, arguments: argsDelta, isComplete, messageId } = event;

  // Accumulate arguments for this tool call
  const currentArgs = streamingToolCallArgsMap.get(toolCallId) || '';
  const newArgs = currentArgs + argsDelta;

  streamingToolCallArgsMap.set(toolCallId, newArgs);

  // Try to parse arguments safely using jsonrepair
  let parsedArgs: any = {};
  try {
    if (newArgs.trim()) {
      const repairedJson = jsonrepair(newArgs);
      parsedArgs = JSON.parse(repairedJson);
    }
  } catch (error) {
    // Keep empty object if parsing fails
    parsedArgs = {};
  }

  console.log('parsedArgs', parsedArgs);

  // Store current arguments for tool result processing
  toolCallArgumentsMap.set(toolCallId, parsedArgs);

  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];
    let existingMessageIndex = -1;

    // Find message by messageId if provided
    if (messageId) {
      existingMessageIndex = sessionMessages.findIndex((msg) => msg.messageId === messageId);
    }
    // Fallback to last streaming assistant message
    else if (sessionMessages.length > 0) {
      const lastMessageIndex = sessionMessages.length - 1;
      const lastMessage = sessionMessages[lastMessageIndex];
      if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
        existingMessageIndex = lastMessageIndex;
      }
    }

    if (existingMessageIndex !== -1) {
      const existingMessage = sessionMessages[existingMessageIndex];
      const existingToolCalls = existingMessage.toolCalls || [];

      // Find or create tool call in the message
      const toolCallIndex = existingToolCalls.findIndex((tc) => tc.id === toolCallId);
      const updatedToolCalls = [...existingToolCalls];

      if (toolCallIndex !== -1) {
        // Update existing tool call
        updatedToolCalls[toolCallIndex] = {
          ...updatedToolCalls[toolCallIndex],
          function: {
            ...updatedToolCalls[toolCallIndex].function,
            name: toolName || updatedToolCalls[toolCallIndex].function.name,
            arguments: parsedArgs,
          },
        };
      } else {
        // Add new tool call
        updatedToolCalls.push({
          id: toolCallId,
          type: 'function',
          function: {
            name: toolName,
            arguments: parsedArgs,
          },
        });
      }

      const updatedMessage = {
        ...existingMessage,
        toolCalls: updatedToolCalls,
        isStreaming: !isComplete,
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

    // Create new message if not found
    const newMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: event.timestamp,
      isStreaming: !isComplete,
      toolCalls: [
        {
          id: toolCallId,
          type: 'function',
          function: {
            name: toolName,
            arguments: newArgs,
          },
        },
      ],
      messageId,
    };

    return {
      ...prev,
      [sessionId]: [...sessionMessages, newMessage],
    };
  });

  // For write_file tool, immediately show in workspace panel
  if (toolName === 'write_file' && parsedArgs.path) {
    set(activePanelContentAtom, {
      type: 'file',
      source: parsedArgs.content || '',
      title: `Writing: ${parsedArgs.path.split('/').pop()}`,
      timestamp: event.timestamp,
      toolCallId,
      arguments: parsedArgs,
    });
  }

  // Clean up completed streaming tool call arguments
  if (isComplete) {
    streamingToolCallArgsMap.delete(toolCallId);
  }
}
