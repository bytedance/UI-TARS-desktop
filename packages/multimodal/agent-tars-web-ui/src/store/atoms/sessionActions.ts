import { atom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import { ApiService } from '../../services/api';
import { SessionInfo, Message, ToolResult, Event } from '../../types';
import {
  sessionsAtom,
  activeSessionIdAtom,
  messagesAtom,
  toolResultsAtom,
  isProcessingAtom,
} from './sessionAtoms';
import { handleEventAction, handleEventHistory } from './eventHandlers';

// 加载所有会话
export const loadSessionsAction = atom(null, async (get, set) => {
  try {
    const loadedSessions = await ApiService.getSessions();
    set(sessionsAtom, loadedSessions);
  } catch (error) {
    console.error('Failed to load sessions:', error);
  }
});

// 创建新会话
export const createNewSessionAction = atom(null, async (get, set) => {
  try {
    const newSession = await ApiService.createSession();
    set(sessionsAtom, (prev) => [...prev, newSession]);

    // 初始化会话的消息和工具结果
    set(messagesAtom, (prev) => ({
      ...prev,
      [newSession.id]: [],
    }));

    set(toolResultsAtom, (prev) => ({
      ...prev,
      [newSession.id]: [],
    }));

    set(activeSessionIdAtom, newSession.id);
    return newSession.id;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
});

// 设置激活会话
export const setActiveSessionAction = atom(null, async (get, set, sessionId: string) => {
  try {
    const messages = get(messagesAtom);

    // 检查会话是否激活，如果未激活则恢复
    const sessionDetails = await ApiService.getSessionDetails(sessionId);

    if (!sessionDetails.active) {
      await ApiService.restoreSession(sessionId);
    }

    // 如果该会话的消息尚未加载，则加载
    if (!messages[sessionId]) {
      const events = await ApiService.getSessionEvents(sessionId);

      // 处理事件以构建消息和工具结果历史
      const sessionMessages: Message[] = [];
      const sessionToolResults: ToolResult[] = [];

      events.forEach((event) => {
        // 使用正确的历史事件处理函数而不是action
        handleEventHistory(sessionId, event, sessionMessages, sessionToolResults);
      });

      set(messagesAtom, (prev) => ({
        ...prev,
        [sessionId]: sessionMessages,
      }));

      set(toolResultsAtom, (prev) => ({
        ...prev,
        [sessionId]: sessionToolResults,
      }));
    }

    set(activeSessionIdAtom, sessionId);
  } catch (error) {
    console.error('Failed to set active session:', error);
    throw error;
  }
});

// 更新会话元数据
export const updateSessionMetadataAction = atom(
  null,
  async (get, set, params: { sessionId: string; updates: { name?: string; tags?: string[] } }) => {
    const { sessionId, updates } = params;
    try {
      const updatedSession = await ApiService.updateSession(sessionId, updates);

      set(sessionsAtom, (prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, ...updatedSession } : session,
        ),
      );
    } catch (error) {
      console.error('Failed to update session:', error);
      throw error;
    }
  },
);

// 删除会话
export const deleteSessionAction = atom(null, async (get, set, sessionId: string) => {
  try {
    const success = await ApiService.deleteSession(sessionId);
    const activeSessionId = get(activeSessionIdAtom);

    if (success) {
      set(sessionsAtom, (prev) => prev.filter((session) => session.id !== sessionId));

      if (activeSessionId === sessionId) {
        set(activeSessionIdAtom, null);
      }

      // 清理会话相关的消息和工具结果
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

// 发送消息
export const sendMessageAction = atom(null, async (get, set, content: string) => {
  const activeSessionId = get(activeSessionIdAtom);

  if (!activeSessionId) {
    throw new Error('No active session');
  }

  set(isProcessingAtom, true);

  // 立即添加用户消息到状态
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

  try {
    // 使用流式查询
    await ApiService.sendStreamingQuery(activeSessionId, content, (event) => {
      // 直接处理事件
      set((get) => {
        const event_handler = handleEventAction(activeSessionId, event);
        return { ...get }; // 返回新状态但没有修改，因为handleEventAction已经设置了相关状态
      });
    });
  } catch (error) {
    console.error('Error sending message:', error);
    set(isProcessingAtom, false);
  }
});

// 中止当前查询
export const abortCurrentQueryAction = atom(null, async (get, set) => {
  const activeSessionId = get(activeSessionIdAtom);

  if (!activeSessionId) {
    return false;
  }

  try {
    const success = await ApiService.abortQuery(activeSessionId);

    if (success) {
      set(isProcessingAtom, false);

      // 添加关于中止的系统消息
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

// 重置所有会话
export const resetSessionsAction = atom(null, (get, set) => {
  set(sessionsAtom, []);
  set(activeSessionIdAtom, null);
  set(messagesAtom, {});
  set(toolResultsAtom, {});
  ApiService.disconnect();
});
