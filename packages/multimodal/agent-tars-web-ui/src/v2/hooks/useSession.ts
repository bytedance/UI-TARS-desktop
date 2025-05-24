import { atom, useAtom, useAtomValue } from 'jotai';
import { useCallback } from 'react';
import { SessionInfo, Message, ToolResult, PanelContent } from '../types';
import { useApi } from '../contexts/ApiContext';
import { useEventHandler } from './useEventHandler';

// 会话状态原子
const sessionsAtom = atom<SessionInfo[]>([]);
const activeSessionIdAtom = atom<string | null>(null);
const messagesAtom = atom<Record<string, Message[]>>({});
const toolResultsAtom = atom<Record<string, ToolResult[]>>({});
const isProcessingAtom = atom<boolean>(false);
const activePanelContentAtom = atom<PanelContent | null>(null);

/**
 * 会话管理Hook
 * 提供会话相关的状态和操作
 */
export function useSession() {
  const { sessionService } = useApi();
  const { processEvent, clearToolResultMap } = useEventHandler();

  // 状态原子
  const [sessions, setSessions] = useAtom(sessionsAtom);
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [messages, setMessages] = useAtom(messagesAtom);
  const [toolResults, setToolResults] = useAtom(toolResultsAtom);
  const [isProcessing, setIsProcessing] = useAtom(isProcessingAtom);
  const [activePanelContent, setActivePanelContent] = useAtom(activePanelContentAtom);

  /**
   * 加载所有会话
   */
  const loadSessions = useCallback(async () => {
    try {
      const loadedSessions = await sessionService.getSessions();
      setSessions(loadedSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }, [sessionService, setSessions]);

  /**
   * 创建新会话
   */
  const createNewSession = useCallback(async () => {
    try {
      const newSession = await sessionService.createSession();
      setSessions((prev) => [newSession, ...prev]);

      // 初始化会话消息和工具结果
      setMessages((prev) => ({
        ...prev,
        [newSession.id]: [],
      }));

      setToolResults((prev) => ({
        ...prev,
        [newSession.id]: [],
      }));

      // 设置为活动会话
      setActiveSessionId(newSession.id);
      return newSession.id;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }, [sessionService, setActiveSessionId, setMessages, setSessions, setToolResults]);

  /**
   * 设置活动会话
   */
  const setActiveSession = useCallback(
    async (sessionId: string) => {
      try {
        // 先设置加载状态
        setIsProcessing(true);

        // 清除活动面板内容
        setActivePanelContent(null);

        // 检查会话是否活动，如果不是则恢复
        const sessionDetails = await sessionService.getSessionDetails(sessionId);

        if (!sessionDetails.active) {
          await sessionService.restoreSession(sessionId);
        }

        // 如果尚未加载消息，则加载会话事件
        if (!messages[sessionId] || messages[sessionId].length === 0) {
          // 先设置一个空数组，避免重复加载
          setMessages((prev) => ({
            ...prev,
            [sessionId]: prev[sessionId] || [],
          }));

          setToolResults((prev) => ({
            ...prev,
            [sessionId]: prev[sessionId] || [],
          }));

          // 清除之前的工具结果映射
          clearToolResultMap();

          // 加载会话事件
          const events = await sessionService.getSessionEvents(sessionId);

          // 先设置活动会话ID，确保UI更新
          setActiveSessionId(sessionId);

          // 处理事件以构建消息和工具结果
          if (events && events.length > 0) {
            // 使用批处理方式处理事件，减少状态更新次数
            for (const event of events) {
              processEvent(sessionId, event);
            }
          }
        } else {
          // 如果消息已经加载，直接设置活动会话ID
          setActiveSessionId(sessionId);
        }

        // 处理完成后关闭加载状态
        setIsProcessing(false);
      } catch (error) {
        console.error('Failed to set active session:', error);
        setIsProcessing(false);
        throw error;
      }
    },
    [
      messages,
      processEvent,
      sessionService,
      setActiveSessionId,
      setMessages,
      setToolResults,
      setActivePanelContent,
      clearToolResultMap,
      setIsProcessing,
    ],
  );

  /**
   * 更新会话元数据
   */
  const updateSessionMetadata = useCallback(
    async (sessionId: string, updates: { name?: string; tags?: string[] }) => {
      try {
        const updatedSession = await sessionService.updateSession(sessionId, updates);

        setSessions((prev) =>
          prev.map((session) =>
            session.id === sessionId ? { ...session, ...updatedSession } : session,
          ),
        );
      } catch (error) {
        console.error('Failed to update session:', error);
        throw error;
      }
    },
    [sessionService, setSessions],
  );

  /**
   * 删除会话
   */
  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        const success = await sessionService.deleteSession(sessionId);

        if (success) {
          setSessions((prev) => prev.filter((session) => session.id !== sessionId));

          if (activeSessionId === sessionId) {
            setActiveSessionId(null);
          }

          // 清除与会话相关的消息和工具结果
          setMessages((prev) => {
            const newMessages = { ...prev };
            delete newMessages[sessionId];
            return newMessages;
          });

          setToolResults((prev) => {
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
    },
    [activeSessionId, sessionService, setActiveSessionId, setMessages, setSessions, setToolResults],
  );

  return {
    // 状态
    sessions,
    activeSessionId,
    messages,
    toolResults,
    isProcessing,
    activePanelContent,

    // 设置器
    setIsProcessing,
    setActivePanelContent,

    // 操作
    loadSessions,
    createNewSession,
    setActiveSession,
    updateSessionMetadata,
    deleteSession,
  };
}
