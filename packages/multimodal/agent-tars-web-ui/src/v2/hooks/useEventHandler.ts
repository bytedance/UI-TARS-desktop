import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { atom, useAtom } from 'jotai';
import { Event, EventType, Message, ToolResult } from '../types';
import {
  sessionsAtom,
  messagesAtom,
  toolResultsAtom,
  activePanelContentAtom,
  isProcessingAtom,
} from './atoms';

// 存储工具调用与结果的映射
const toolCallResultMapAtom = atom<Map<string, ToolResult>>(new Map());

/**
 * 事件处理Hook
 * 处理Agent事件流并更新相应的状态
 */
export function useEventHandler() {
  const [toolCallResultMap, setToolCallResultMap] = useAtom(toolCallResultMapAtom);
  const [sessions, setSessions] = useAtom(sessionsAtom);
  const [messages, setMessages] = useAtom(messagesAtom);
  const [toolResults, setToolResults] = useAtom(toolResultsAtom);
  const [isProcessing, setIsProcessing] = useAtom(isProcessingAtom);
  const [activePanelContent, setActivePanelContent] = useAtom(activePanelContentAtom);

  /**
   * 确定工具类型
   */
  const determineToolType = useCallback((name: string, content: any): ToolResult['type'] => {
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
  }, []);

  /**
   * 处理流式消息事件
   */
  const handleStreamingMessage = useCallback(
    (
      sessionId: string,
      event: Event & { content: string; isComplete?: boolean; messageId?: string },
    ) => {
      setMessages((prev) => {
        const sessionMessages = prev[sessionId] || [];

        // 尝试基于messageId查找现有消息
        const messageIdToFind = event.messageId;
        let existingMessageIndex = -1;

        if (messageIdToFind) {
          existingMessageIndex = sessionMessages.findIndex(
            (msg) => msg.messageId === messageIdToFind,
          );
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
        setIsProcessing(false);
      }
    },
    [setIsProcessing, setMessages],
  );

  /**
   * 检查用户消息中的图像并设置为活动面板内容
   */
  const checkForImagesAndSetActive = useCallback(
    (sessionId: string, content: any) => {
      // 如果内容是多模态数组，查找图像
      if (Array.isArray(content)) {
        const images = content.filter((part) => part.type === 'image_url');
        if (images.length > 0) {
          // 将第一个图像设置为活动面板内容
          setActivePanelContent({
            type: 'image',
            source: images[0].image_url.url,
            title: 'User Upload',
            timestamp: Date.now(),
          });
        }
      }
    },
    [setActivePanelContent],
  );

  /**
   * 添加工具结果并更新活动面板内容
   */
  const addToolResult = useCallback(
    (sessionId: string, result: ToolResult) => {
      // 在映射中存储结果以供将来引用
      setToolCallResultMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(result.toolCallId, result);
        return newMap;
      });

      setToolResults((prev) => {
        const sessionResults = prev[sessionId] || [];
        return {
          ...prev,
          [sessionId]: [...sessionResults, result],
        };
      });

      // 立即将此工具结果设置为活动面板内容
      setActivePanelContent({
        type: result.type,
        source: result.content,
        title: result.name,
        timestamp: result.timestamp,
        toolCallId: result.toolCallId,
        error: result.error,
      });

      // 链接到具有此工具调用的消息
      setMessages((prev) => {
        const sessionMessages = prev[sessionId] || [];

        // 查找具有此工具调用的消息
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
    },
    [setActivePanelContent, setMessages, setToolCallResultMap, setToolResults],
  );

  /**
   * 处理事件
   */
  const processEvent = useCallback(
    (sessionId: string, event: Event) => {
      console.log('Event received:', event.type, event.id);

      switch (event.type) {
        case EventType.USER_MESSAGE:
          const userMessage: Message = {
            id: event.id,
            role: 'user',
            content: event.content!,
            timestamp: event.timestamp,
          };

          // 添加消息
          setMessages((prev) => {
            const sessionMessages = prev[sessionId] || [];
            return {
              ...prev,
              [sessionId]: [...sessionMessages, userMessage],
            };
          });

          // 检查用户消息中的图像并在面板中显示
          checkForImagesAndSetActive(sessionId, event.content);
          break;

        case EventType.ASSISTANT_MESSAGE:
          // 检查是否有messageId并基于messageId查找现有消息
          const messageId = event.messageId;

          setMessages((prev) => {
            const sessionMessages = prev[sessionId] || [];
            let existingMessageIndex = -1;

            if (messageId) {
              // 优先通过messageId查找
              existingMessageIndex = sessionMessages.findIndex(
                (msg) => msg.messageId === messageId,
              );
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
                    finishReason: event.finishReason,
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
                    content: event.content!,
                    timestamp: event.timestamp,
                    toolCalls: event.toolCalls,
                    finishReason: event.finishReason,
                    messageId: messageId,
                  },
                ],
              };
            }
          });

          setIsProcessing(false);
          break;

        case EventType.ASSISTANT_STREAMING_MESSAGE:
          handleStreamingMessage(sessionId, event as any);
          break;

        case EventType.ASSISTANT_THINKING_MESSAGE:
        case EventType.ASSISTANT_STREAMING_THINKING_MESSAGE:
          // 更新最后一条助手消息的思考内容
          setMessages((prev) => {
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
          // 仅记录工具调用 - 稍后将其与结果匹配
          console.log('Tool call:', (event as any).name);
          break;

        case EventType.TOOL_RESULT:
          const result: ToolResult = {
            id: uuidv4(),
            toolCallId: (event as any).toolCallId,
            name: (event as any).name,
            content: (event as any).content,
            timestamp: event.timestamp,
            error: (event as any).error,
            type: determineToolType((event as any).name, (event as any).content),
          };

          // 添加工具结果并自动在面板中显示
          addToolResult(sessionId, result);
          break;

        case EventType.SYSTEM:
          const systemMessage: Message = {
            id: uuidv4(),
            role: 'system',
            content: (event as any).message,
            timestamp: event.timestamp || Date.now(),
          };

          setMessages((prev) => {
            const sessionMessages = prev[sessionId] || [];
            return {
              ...prev,
              [sessionId]: [...sessionMessages, systemMessage],
            };
          });
          break;

        case EventType.AGENT_RUN_START:
          // 标记新代理运行的开始
          setIsProcessing(true);
          break;

        case EventType.AGENT_RUN_END:
          // 标记代理运行的结束
          setIsProcessing(false);
          break;
      }
    },
    [
      addToolResult,
      checkForImagesAndSetActive,
      determineToolType,
      handleStreamingMessage,
      setIsProcessing,
      setMessages,
    ],
  );

  /**
   * 获取特定工具调用的工具结果
   */
  const getToolResultForCall = useCallback(
    (toolCallId: string): ToolResult | undefined => {
      return toolCallResultMap.get(toolCallId);
    },
    [toolCallResultMap],
  );

  /**
   * 清除工具结果映射
   */
  const clearToolResultMap = useCallback(() => {
    setToolCallResultMap(new Map());
  }, [setToolCallResultMap]);

  return {
    processEvent,
    getToolResultForCall,
    clearToolResultMap,
  };
}
