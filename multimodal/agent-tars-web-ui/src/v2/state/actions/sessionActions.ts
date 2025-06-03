import { atom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import { apiService } from '../../services/apiService';
import { sessionsAtom, activeSessionIdAtom } from '../atoms/session';
import { messagesAtom } from '../atoms/message';
import { toolResultsAtom, toolCallResultMap } from '../atoms/tool';
import { isProcessingAtom } from '../atoms/ui';
import { processEventAction } from './eventProcessor';
import { Message, EventType } from '../../types';
import { connectionStatusAtom } from '../atoms/ui'; // 假设 connectionStatusAtom 已经存在
import { replayStateAtom } from '../atoms/replay'; // 添加引入回放状态atom
import { ChatCompletionContentPart } from '@multimodal/agent-interface';

/**
 * Load all available sessions
 */
export const loadSessionsAction = atom(null, async (get, set) => {
  try {
    const loadedSessions = await apiService.getSessions();
    set(sessionsAtom, loadedSessions);
  } catch (error) {
    console.error('Failed to load sessions:', error);
    throw error;
  }
});

/**
 * Create a new session
 */
export const createSessionAction = atom(null, async (get, set) => {
  try {
    const newSession = await apiService.createSession();

    // Add to sessions list
    set(sessionsAtom, (prev) => [newSession, ...prev]);

    // Initialize session data
    set(messagesAtom, (prev) => ({
      ...prev,
      [newSession.id]: [],
    }));

    set(toolResultsAtom, (prev) => ({
      ...prev,
      [newSession.id]: [],
    }));

    // Set as active session
    set(activeSessionIdAtom, newSession.id);

    return newSession.id;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
});

/**
 * Set the active session
 * 修改加载逻辑以避免重复处理事件
 */
export const setActiveSessionAction = atom(null, async (get, set, sessionId: string) => {
  try {
    // 检查是否已经是活动会话
    const currentActiveSessionId = get(activeSessionIdAtom);
    if (currentActiveSessionId === sessionId) {
      console.log(`Session ${sessionId} is already active, skipping load`);
      return;
    }

    // 检查回放状态并退出回放模式（除非是同一会话）
    const replayState = get(replayStateAtom);
    if (replayState.isActive) {
      console.log('Exiting replay mode due to session change');
      set(replayStateAtom, {
        isActive: false,

        isPaused: true,
        events: [],
        currentEventIndex: -1,
        startTimestamp: null,
        endTimestamp: null,
        playbackSpeed: 1,

        visibleTimeWindow: null,
        processedEvents: {},
      });
    }

    // 检查会话是否处于活动状态，如果不是则恢复

    const sessionDetails = await apiService.getSessionDetails(sessionId);

    if (!sessionDetails.active) {
      await apiService.restoreSession(sessionId);
    }

    // 获取当前会话状态以更新 isProcessing 状态
    try {
      const status = await apiService.getSessionStatus(sessionId);
      set(isProcessingAtom, status.isProcessing);
    } catch (error) {
      console.warn('Failed to get session status:', error);
      set(isProcessingAtom, false);
    }

    // 清理工具调用映射缓存
    toolCallResultMap.clear();

    // 只有在消息不存在时才加载会话事件
    const messages = get(messagesAtom);
    if (!messages[sessionId] || messages[sessionId].length === 0) {
      console.log(`Loading events for session ${sessionId}`);
      const events = await apiService.getSessionEvents(sessionId);

      // 对流式事件进行预处理，确保正确的连续性
      const processedEvents = preprocessStreamingEvents(events);

      // 处理每个事件以构建消息和工具结果
      for (const event of processedEvents) {
        set(processEventAction, { sessionId, event });
      }
    } else {
      console.log(`Session ${sessionId} already has messages, skipping event loading`);
    }

    // 设置为活动会话
    set(activeSessionIdAtom, sessionId);
  } catch (error) {
    console.error('Failed to set active session:', error);
    set(connectionStatusAtom, (prev) => ({
      ...prev,
      connected: false,
      lastError: error instanceof Error ? error.message : String(error),
    }));
    throw error;
  }
});

/**
 * Update session metadata
 */
export const updateSessionAction = atom(
  null,
  async (get, set, params: { sessionId: string; updates: { name?: string; tags?: string[] } }) => {
    const { sessionId, updates } = params;

    try {
      const updatedSession = await apiService.updateSessionMetadata(sessionId, updates);

      // Update session in the list
      set(sessionsAtom, (prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, ...updatedSession } : session,
        ),
      );

      return updatedSession;
    } catch (error) {
      console.error('Failed to update session:', error);
      throw error;
    }
  },
);

/**
 * 预处理事件，确保流式事件按正确顺序处理
 */
function preprocessStreamingEvents(events: Event[]): Event[] {
  // 对流式消息进行整理
  const messageStreams: Record<string, Event[]> = {};

  // 收集所有流式事件，按messageId分组
  events.forEach((event) => {
    if (event.type === EventType.FINAL_ANSWER_STREAMING && 'messageId' in event) {
      const messageId = event.messageId as string;
      if (!messageStreams[messageId]) {
        messageStreams[messageId] = [];
      }
      messageStreams[messageId].push(event);
    }
  });

  // 返回预处理后的事件，确保流式事件以正确顺序处理
  return events;
}

/**
 * Delete a session
 */
export const deleteSessionAction = atom(null, async (get, set, sessionId: string) => {
  try {
    const success = await apiService.deleteSession(sessionId);
    const activeSessionId = get(activeSessionIdAtom);

    if (success) {
      // Remove from sessions list
      set(sessionsAtom, (prev) => prev.filter((session) => session.id !== sessionId));

      // Clear active session if it was deleted
      if (activeSessionId === sessionId) {
        set(activeSessionIdAtom, null);
      }

      // Clear session data
      set(messagesAtom, (prev) => {
        const newMessages = { ...prev };
        delete newMessages[sessionId];
        return newMessages;
      });

      set(toolResultsAtom, (prev) => {
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
});

/**
 * Send a message in the current session
 */
export const sendMessageAction = atom(
  null,
  async (get, set, content: string | ChatCompletionContentPart[]) => {
    const activeSessionId = get(activeSessionIdAtom);

    if (!activeSessionId) {
      throw new Error('No active session');
    }

    // 明确设置处理状态
    set(isProcessingAtom, true);

    // 添加用户消息到状态
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    set(messagesAtom, (prev) => {
      const sessionMessages = prev[activeSessionId] || [];
      return {
        ...prev,
        [activeSessionId]: [...sessionMessages, userMessage],
      };
    });

    // 立即更新会话名称，使用用户查询作为 Summary
    // 这样即使后续更新失败也至少有一个基本的名称
    try {
      // 检查是否是第一条消息，如果是则直接用查询内容作为会话名称
      const messages = get(messagesAtom)[activeSessionId] || [];
      if (messages.length <= 2) {
        // 算上刚刚添加的用户消息
        let summary = '';
        if (typeof content === 'string') {
          summary = content.length > 50 ? content.substring(0, 47) + '...' : content;
        } else {
          // 从多模态内容中提取文本部分
          const textPart = content.find((part) => part.type === 'text');
          if (textPart && 'text' in textPart) {
            summary =
              textPart.text.length > 50 ? textPart.text.substring(0, 47) + '...' : textPart.text;
          } else {
            summary = 'Image message';
          }
        }

        await apiService.updateSessionMetadata(activeSessionId, { name: summary });

        // 更新 sessions atom
        set(sessionsAtom, (prev) =>
          prev.map((session) =>
            session.id === activeSessionId ? { ...session, name: summary } : session,
          ),
        );
      }
    } catch (error) {
      console.log('Failed to update initial summary, continuing anyway:', error);
      // 错误不中断主流程
    }

    try {
      // 使用流式查询
      await apiService.sendStreamingQuery(activeSessionId, content, (event) => {
        // 处理每个事件
        set(processEventAction, { sessionId: activeSessionId, event });

        // 确保状态保持为处理中，直到明确收到结束事件
        if (event.type !== EventType.AGENT_RUN_END && event.type !== EventType.ASSISTANT_MESSAGE) {
          set(isProcessingAtom, true);
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // 错误时重置处理状态
      set(isProcessingAtom, false);
      throw error;
    }
  },
);

/**
 * Abort the current running query
 */
export const abortQueryAction = atom(null, async (get, set) => {
  const activeSessionId = get(activeSessionIdAtom);

  if (!activeSessionId) {
    return false;
  }

  try {
    const success = await apiService.abortQuery(activeSessionId);

    if (success) {
      set(isProcessingAtom, false);

      // Add system message about abort
      const abortMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: 'The operation was aborted.',
        timestamp: Date.now(),
      };

      set(messagesAtom, (prev) => {
        const sessionMessages = prev[activeSessionId] || [];
        return {
          ...prev,
          [activeSessionId]: [...sessionMessages, abortMessage],
        };
      });
    }

    return success;
  } catch (error) {
    console.error('Error aborting query:', error);
    return false;
  }
});

/**
 * Check the current status of a session
 */
export const checkSessionStatusAction = atom(null, async (get, set, sessionId: string) => {
  if (!sessionId) return;

  try {
    console.log(`Checking status for session: ${sessionId}`);
    const status = await apiService.getSessionStatus(sessionId);

    console.log(`Status for session ${sessionId}:`, status);

    // 根据服务器响应更新处理状态
    set(isProcessingAtom, status.isProcessing);

    return status;
  } catch (error) {
    console.error('Failed to check session status:', error);
    // 错误时不更新处理状态，避免误报
  }
});

/**
 * Handle the end of a conversation
 * 仍然保留此函数，但减少其重要性，避免更新失败带来的影响
 */
async function handleConversationEnd(get: any, set: any, sessionId: string): Promise<void> {
  // 我们不再依赖这个函数来设置会话名称，但仍然保留它作为备份机制
  const allMessages = get(messagesAtom)[sessionId] || [];

  // 只在有足够的消息并且会话没有名称时才尝试生成摘要
  const sessions = get(sessionsAtom);
  const currentSession = sessions.find((s) => s.id === sessionId);

  // 如果会话已经有名称，则不需要再生成
  if (currentSession && currentSession.name) {
    return;
  }

  // 只在有实际对话时才尝试生成摘要
  if (allMessages.length > 1) {
    try {
      // 转换消息为 API 期望的格式
      const apiMessages = allMessages.map((msg: Message) => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : 'multimodal content',
      }));

      // 生成摘要
      const summary = await apiService.generateSummary(sessionId, apiMessages);

      if (summary) {
        // 更新会话名称
        await apiService.updateSessionMetadata(sessionId, { name: summary });

        // 更新 sessions atom
        set(sessionsAtom, (prev: any[]) =>
          prev.map((session) =>
            session.id === sessionId ? { ...session, name: summary } : session,
          ),
        );
      }
    } catch (error) {
      console.error('Failed to generate or update summary, continuing anyway:', error);
      // 错误不影响主流程
    }
  }
}
