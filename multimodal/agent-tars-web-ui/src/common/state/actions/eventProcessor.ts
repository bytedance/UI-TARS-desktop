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
import { sessionFilesAtom, FileItem } from '../atoms/files';
import { ChatCompletionContentPartImage } from '@multimodal/agent-interface';
import { jsonrepair } from 'jsonrepair';

// Internal cache - not an Atom to avoid unnecessary reactivity
const toolCallArgumentsMap = new Map<string, any>();

// Accumulate streaming tool call arguments for real-time display
const streamingToolCallArgsMap = new Map<string, string>();

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

  // Auto-show user uploaded images in workspace panel
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

function handleAssistantMessage(
  get: any,
  set: Setter,
  sessionId: string,
  event: AgentEventStream.AssistantMessageEvent,
): void {
  const messageId = event.messageId;

  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];

    // Update existing message if messageId matches, otherwise create new
    if (messageId) {
      const existingMessageIndex = sessionMessages.findIndex((msg) => msg.messageId === messageId);

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
    // Auto-associate with recent environment input for final browser state display
    const currentMessages = get(messagesAtom)[sessionId] || [];

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

    // Find by messageId first, fallback to last streaming message
    if (messageIdToFind) {
      existingMessageIndex = sessionMessages.findIndex((msg) => msg.messageId === messageIdToFind);
    } else if (sessionMessages.length > 0) {
      const lastMessageIndex = sessionMessages.length - 1;
      const lastMessage = sessionMessages[lastMessageIndex];
      if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
        existingMessageIndex = lastMessageIndex;
      }
    }

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

// Store arguments for later use in tool result processing
function handleToolCall(
  set: Setter,
  sessionId: string,
  event: AgentEventStream.ToolCallEvent,
): void {
  if (event.toolCallId && event.arguments) {
    toolCallArgumentsMap.set(event.toolCallId, event.arguments);
  }
}

// Collect and manage file information from various tool operations
function collectFileInfo(
  set: Setter,
  sessionId: string,
  toolName: string,
  toolCallId: string,
  args: any,
  content: any,
  timestamp: number,
): void {
  let fileItem: FileItem | null = null;

  switch (toolName) {
    case 'write_file':
      if (args?.path) {
        fileItem = {
          id: uuidv4(),
          name: args.path.split('/').pop() || 'Unknown File',
          path: args.path,
          type: 'file',
          content: args.content,
          timestamp,
          toolCallId,
          sessionId,
        };
      }
      break;

    case 'browser_screenshot':
      if (typeof content === 'string' && content.startsWith('data:image/')) {
        fileItem = {
          id: uuidv4(),
          name: `Screenshot_${new Date(timestamp).toISOString().replace(/[:.]/g, '-')}.png`,
          path: '',
          type: 'screenshot',
          content,
          timestamp,
          toolCallId,
          sessionId,
        };
      }
      break;

    case 'browser_vision_control':
      if (content && Array.isArray(content)) {
        const imageContent = content.find(
          (item) => item.type === 'image_url' && item.image_url?.url,
        );
        if (imageContent) {
          fileItem = {
            id: uuidv4(),
            name: `Vision_Control_${new Date(timestamp).toISOString().replace(/[:.]/g, '-')}.png`,
            path: '',
            type: 'screenshot',
            content: imageContent.image_url.url,
            timestamp,
            toolCallId,
            sessionId,
          };
        }
      }
      break;

    default:
      break;
  }
  if (fileItem) {
    set(sessionFilesAtom, (prev) => {
      const sessionFiles = prev[sessionId] || [];

      // Avoid duplicates by checking toolCallId and path
      const existingFileIndex = sessionFiles.findIndex(
        (file) => file.toolCallId === fileItem!.toolCallId && file.path === fileItem!.path,
      );

      if (existingFileIndex >= 0) {
        const updatedFiles = [...sessionFiles];
        updatedFiles[existingFileIndex] = fileItem!;
        return {
          ...prev,
          [sessionId]: updatedFiles,
        };
      }

      return {
        ...prev,
        [sessionId]: [...sessionFiles, fileItem!],
      };
    });
  }
}

function handleToolResult(set: Setter, sessionId: string, event: AgentEventStream.ToolResultEvent) {
  const args = toolCallArgumentsMap.get(event.toolCallId);

  collectFileInfo(
    set,
    sessionId,
    event.name,
    event.toolCallId,
    args,
    event.content,
    event.timestamp,
  );

  const result: ToolResult = {
    id: uuidv4(),
    toolCallId: event.toolCallId,
    name: event.name,
    content: event.content,
    timestamp: event.timestamp,
    error: event.error,
    type: determineToolType(event.name, event.content),
    arguments: args,
    elapsedMs: event.elapsedMs,
    _extra: event._extra,
  };

  // Update both message and tool result atoms for immediate UI response
  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];

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

  set(toolResultsAtom, (prev: Record<string, ToolResult[]>) => {
    const sessionResults = prev[sessionId] || [];
    return {
      ...prev,
      [sessionId]: [...sessionResults, result],
    };
  });

  // Special handling for browser vision control to preserve environment context
  if (result.type === 'browser_vision_control') {
    set(activePanelContentAtom, (prev) => {
      if (prev && prev.type === 'image' && prev.environmentId) {
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
          processedEnvironmentIds: [environmentId], // Track processed environment IDs
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

  toolCallResultMap.set(result.toolCallId, result);
}

function handleSystemMessage(
  set: Setter,
  sessionId: string,
  event: AgentEventStream.SystemEvent,
): void {
  const systemMessage: Message = {
    id: event.id || uuidv4(),
    role: 'system',
    content: event.message,
    timestamp: event.timestamp || Date.now(),
    level: event.level,
    details: event.details,
  };

  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];
    return {
      ...prev,
      [sessionId]: [...sessionMessages, systemMessage],
    };
  });
}

// Environment input is added to messages but not automatically displayed to avoid conflicts
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

  if (Array.isArray(event.content)) {
    const imageContent = event.content.find(
      (item) => item.type === 'image_url' && item.image_url && item.image_url.url,
    ) as ChatCompletionContentPartImage;

    if (imageContent && imageContent.image_url) {
      const currentPanel = get(activePanelContentAtom);

      // Only update if current panel is browser_vision_control to maintain context
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
      // Skip update for other panel types to avoid duplicate Browser Screenshot rendering
    }
  }
}

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
      keyframes: [],
    },
  }));
}

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

    // Create keyframe snapshot for plan history tracking
    const newKeyframe: PlanKeyframe = {
      timestamp: event.timestamp || Date.now(),
      steps: event.steps,
      isComplete: false,
      summary: null,
    };

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

    // Create final keyframe for completed plan
    const finalKeyframe: PlanKeyframe = {
      timestamp: event.timestamp || Date.now(),
      steps: currentPlan.steps,
      isComplete: true,
      summary: event.summary,
    };

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

// Always treat final answer as research report, removing JSON_DATA handling
function handleFinalAnswer(
  get: any,
  set: Setter,
  sessionId: string,
  event: AgentEventStream.FinalAnswerEvent,
): void {
  const messageId = event.messageId || `final-answer-${uuidv4()}`;

  set(activePanelContentAtom, {
    type: 'research_report',
    source: event.content,
    title: event.title || 'Research Report',
    timestamp: event.timestamp,
    isDeepResearch: true,
    messageId,
  });

  const finalAnswerMessage: Message = {
    id: event.id || uuidv4(),
    role: 'final_answer',
    content: event.content,
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

  const messages = get(messagesAtom)[sessionId] || [];
  const existingMessageIndex = messages.findIndex((msg) => msg.messageId === messageId);

  // Append content to existing message or create new one for streaming
  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];

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

  // Sync panel content with message state
  set(activePanelContentAtom, (prev: any) => {
    // Start new stream or different messageId
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

    // Append to existing content
    return {
      ...prev,
      source: prev.source + event.content,
      isStreaming: !event.isComplete,
      timestamp: event.timestamp,
      title: event.title || prev.title,
    };
  });

  // Handle first chunk and completion state
  const prevActivePanelContent = get(activePanelContentAtom);
  if (!prevActivePanelContent || prevActivePanelContent.messageId !== messageId) {
    const initialMessage: Message = {
      id: event.id || uuidv4(),
      role: 'final_answer',
      content: event.content,
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
    // Update with complete content when streaming finishes
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

  if (event.isComplete) {
    set(isProcessingAtom, false);
  }
}

// Accumulate arguments for real-time tool call display with JSON repair
function handleStreamingToolCall(
  get: any,
  set: Setter,
  sessionId: string,
  event: AgentEventStream.AssistantStreamingToolCallEvent,
): void {
  const { toolCallId, toolName, arguments: argsDelta, isComplete, messageId } = event;

  const currentArgs = streamingToolCallArgsMap.get(toolCallId) || '';
  const newArgs = currentArgs + argsDelta;

  streamingToolCallArgsMap.set(toolCallId, newArgs);

  // Safe JSON parsing with repair fallback
  let parsedArgs: any = {};
  try {
    if (newArgs) {
      const repairedJson = jsonrepair(newArgs);
      parsedArgs = JSON.parse(repairedJson);
    }
  } catch (error) {
    try {
      const repairedJson = jsonrepair(newArgs + '"');
      parsedArgs = JSON.parse(repairedJson);
    } catch (e) {
      console.error(`ignore parse error chunk`, e);
      return;
    }
  }

  toolCallArgumentsMap.set(toolCallId, parsedArgs);

  set(messagesAtom, (prev: Record<string, Message[]>) => {
    const sessionMessages = prev[sessionId] || [];
    let existingMessageIndex = -1;

    // Find by messageId or fallback to last streaming assistant message
    if (messageId) {
      existingMessageIndex = sessionMessages.findIndex((msg) => msg.messageId === messageId);
    } else if (sessionMessages.length > 0) {
      const lastMessageIndex = sessionMessages.length - 1;
      const lastMessage = sessionMessages[lastMessageIndex];
      if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
        existingMessageIndex = lastMessageIndex;
      }
    }

    if (existingMessageIndex !== -1) {
      const existingMessage = sessionMessages[existingMessageIndex];
      const existingToolCalls = existingMessage.toolCalls || [];

      const toolCallIndex = existingToolCalls.findIndex((tc) => tc.id === toolCallId);
      const updatedToolCalls = [...existingToolCalls];

      if (toolCallIndex !== -1) {
        updatedToolCalls[toolCallIndex] = {
          ...updatedToolCalls[toolCallIndex],
          function: {
            ...updatedToolCalls[toolCallIndex].function,
            name: toolName || updatedToolCalls[toolCallIndex].function.name,
            arguments: parsedArgs,
          },
        };
      } else {
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

  // Real-time preview for write_file operations
  if (toolName === 'write_file' && parsedArgs.path) {
    set(activePanelContentAtom, {
      type: 'file',
      source: parsedArgs.content || '',
      title: `Writing: ${parsedArgs.path.split('/').pop()}`,
      timestamp: event.timestamp,
      toolCallId,
      arguments: parsedArgs,
      isStreaming: !isComplete,
    });
  }

  if (isComplete) {
    streamingToolCallArgsMap.delete(toolCallId);
  }
}
