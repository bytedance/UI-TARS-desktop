import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApi } from '../contexts/ApiContext';
import { useSession } from './useSession';
import { useEventHandler } from './useEventHandler';
import { Message } from '../types';

/**
 * Agent操作Hook
 * 提供与Agent交互的功能
 */
export function useAgent() {
  const { agentService, sessionService } = useApi();
  const { activeSessionId, messages, setIsProcessing } = useSession();
  const { processEvent } = useEventHandler();

  /**
   * 发送消息给Agent
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeSessionId) {
        throw new Error('No active session');
      }

      setIsProcessing(true);

      // 立即将用户消息添加到状态
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      processEvent(activeSessionId, {
        id: userMessage.id,
        type: 'user_message',
        timestamp: userMessage.timestamp,
        content,
      });

      try {
        // 使用流式查询
        await agentService.sendStreamingQuery(activeSessionId, content, (event) => {
          // 处理事件
          processEvent(activeSessionId, event);

          // 如果是最终消息，生成摘要
          if (event.type === 'assistant_message' && event.finishReason === 'stop') {
            generateSummaryIfNeeded(activeSessionId);
          }
        });
      } catch (error) {
        console.error('Error sending message:', error);
        setIsProcessing(false);
      }
    },
    [activeSessionId, agentService, processEvent, setIsProcessing],
  );

  /**
   * 中止当前查询
   */
  const abortCurrentQuery = useCallback(async () => {
    if (!activeSessionId) {
      return false;
    }

    try {
      const success = await agentService.abortQuery(activeSessionId);

      if (success) {
        setIsProcessing(false);

        // 添加关于中止的系统消息
        const abortMessage: Message = {
          id: uuidv4(),
          role: 'system',
          content: 'The operation was aborted.',
          timestamp: Date.now(),
        };

        processEvent(activeSessionId, {
          id: abortMessage.id,
          type: 'system',
          timestamp: abortMessage.timestamp,
          message: abortMessage.content,
        });
      }

      return success;
    } catch (error) {
      console.error('Error aborting query:', error);
      return false;
    }
  }, [activeSessionId, agentService, processEvent, setIsProcessing]);

  /**
   * 如需要生成会话摘要
   */
  const generateSummaryIfNeeded = useCallback(
    async (sessionId: string) => {
      const sessionMessages = messages[sessionId] || [];

      // 仅在有实际对话消息时继续
      if (sessionMessages.length > 1) {
        try {
          // 将消息转换为LLM API预期的格式
          const apiMessages = sessionMessages.map((msg) => ({
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : 'multimodal content',
          }));

          // 请求生成摘要
          const summary = await sessionService.generateSummary(sessionId, apiMessages);

          // 用生成的摘要更新会话名称
          if (summary) {
            await sessionService.updateSession(sessionId, { name: summary });
          }
        } catch (error) {
          console.error('Failed to generate or update summary:', error);
        }
      }
    },
    [messages, sessionService],
  );

  return {
    sendMessage,
    abortCurrentQuery,
  };
}
