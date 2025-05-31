import { useAtom } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import { replayStateAtom } from '../state/atoms/replay';
import { Event, EventType } from '../types';
import { useSession } from './useSession';
import { messagesAtom } from '../state/atoms/message';
import { toolResultsAtom } from '../state/atoms/tool';
import { processEventAction } from '../state/actions/eventProcessor';
import { atom, useSetAtom } from 'jotai';
import { plansAtom } from '../state/atoms/plan';

/**
 * Custom hook for managing replay functionality
 *
 * Provides:
 * - Control for playback (play, pause, jump, etc.)
 * - Event processing through the standard event processor
 * - Timeline calculations and positioning
 */
export function useReplay() {
  const [replayState, setReplayState] = useAtom(replayStateAtom);
  const { activeSessionId } = useSession();
  const [playbackInterval, setPlaybackInterval] = useState<NodeJS.Timeout | null>(null);
  const [, setMessages] = useAtom(messagesAtom);
  const [, setToolResults] = useAtom(toolResultsAtom);
  const [, setPlans] = useAtom(plansAtom);
  const processEvent = useSetAtom(processEventAction);

  /**
   * Initialize replay with events for the current session
   * Filter out streaming events and only keep key frames
   */
  const initReplay = useCallback(
    async (events: Event[]) => {
      if (!events || events.length === 0 || !activeSessionId) return;

      // 清空当前会话的所有状态
      setMessages((prev) => ({
        ...prev,
        [activeSessionId]: [],
      }));

      setToolResults((prev) => ({
        ...prev,
        [activeSessionId]: [],
      }));

      setPlans((prev) => ({
        ...prev,
        [activeSessionId]: {
          steps: [],
          isComplete: false,
          summary: null,
          hasGeneratedPlan: false,
          keyframes: [],
        },
      }));

      // 过滤出关键帧事件，排除流式消息
      const keyFrameEvents = events
        .filter(
          (event) =>
            // 只保留关键事件，排除所有流式消息
            event.type === EventType.USER_MESSAGE ||
            event.type === EventType.ASSISTANT_MESSAGE ||
            event.type === EventType.TOOL_CALL ||
            event.type === EventType.TOOL_RESULT ||
            event.type === EventType.ENVIRONMENT_INPUT ||
            event.type === EventType.PLAN_START ||
            event.type === EventType.PLAN_UPDATE ||
            event.type === EventType.PLAN_FINISH ||
            event.type === EventType.FINAL_ANSWER,
        )
        .sort((a, b) => a.timestamp - b.timestamp);

      setReplayState({
        isActive: true,
        isPaused: true, // 初始为暂停状态
        events: keyFrameEvents,
        currentEventIndex: -1, // 开始前为-1
        startTimestamp: keyFrameEvents[0]?.timestamp || null,
        endTimestamp: keyFrameEvents[keyFrameEvents.length - 1]?.timestamp || null,
        playbackSpeed: 1,
        autoPlayCountdown: 2, // 设置2秒倒计时
        visibleTimeWindow:
          keyFrameEvents.length > 0
            ? {
                start: keyFrameEvents[0].timestamp,
                end: keyFrameEvents[keyFrameEvents.length - 1].timestamp,
              }
            : null,
        processedEvents: {}, // 初始化空的已处理事件映射
      });

      // 启动倒计时并在结束后自动播放
      const countdownTimer = setInterval(() => {
        setReplayState((prev) => {
          // 如果倒计时结束或已被取消
          if (prev.autoPlayCountdown === null || prev.autoPlayCountdown <= 0) {
            clearInterval(countdownTimer);

            // 只有当倒计时正常结束（为0）时才自动开始播放
            if (prev.autoPlayCountdown === 0) {
              setTimeout(() => startReplay(), 0);
              return {
                ...prev,
                autoPlayCountdown: null,
              };
            }

            return {
              ...prev,
              autoPlayCountdown: null,
            };
          }

          // 继续倒计时
          return {
            ...prev,
            autoPlayCountdown: prev.autoPlayCountdown - 1,
          };
        });
      }, 1000);
    },
    [activeSessionId, setMessages, setToolResults, setPlans, setReplayState],
  );

  /**
   * 重置会话状态并处理事件至指定索引
   */
  const processEventsUpToIndex = useCallback(
    (targetIndex: number) => {
      if (!activeSessionId || !replayState.events.length || targetIndex < 0) return;

      // 获取需要处理的事件
      const eventsToProcess = replayState.events.slice(0, targetIndex + 1);

      // 清空当前会话状态
      setMessages((prev) => ({
        ...prev,
        [activeSessionId]: [],
      }));

      setToolResults((prev) => ({
        ...prev,
        [activeSessionId]: [],
      }));

      setPlans((prev) => ({
        ...prev,
        [activeSessionId]: {
          steps: [],
          isComplete: false,
          summary: null,
          hasGeneratedPlan: false,
          keyframes: [],
        },
      }));

      // 处理环境输入事件优先，确保图片资源先加载
      const envEvents = eventsToProcess.filter(
        (event) => event.type === EventType.ENVIRONMENT_INPUT,
      );
      const nonEnvEvents = eventsToProcess.filter(
        (event) => event.type !== EventType.ENVIRONMENT_INPUT,
      );

      // 先处理环境输入事件
      for (const event of envEvents) {
        processEvent({ sessionId: activeSessionId, event });
      }

      // 然后处理其他事件
      for (const event of nonEnvEvents) {
        processEvent({ sessionId: activeSessionId, event });
      }
    },
    [activeSessionId, replayState.events, setMessages, setToolResults, setPlans, processEvent],
  );

  /**
   * 开始回放
   */
  const startReplay = useCallback(() => {
    // 清除现有的定时器
    if (playbackInterval) {
      clearInterval(playbackInterval);
    }

    setReplayState((prev) => ({
      ...prev,
      isPaused: false,
    }));

    // 设置定时器按间隔前进
    const interval = setInterval(() => {
      setReplayState((prev) => {
        // 到达末尾时停止
        if (prev.currentEventIndex >= prev.events.length - 1) {
          clearInterval(interval);
          return {
            ...prev,
            isPaused: true,
            currentEventIndex: prev.events.length - 1,
          };
        }

        // 前进到下一个事件
        const nextIndex = prev.currentEventIndex + 1;

        // 处理到新位置
        if (activeSessionId) {
          processEvent({
            sessionId: activeSessionId,
            event: prev.events[nextIndex],
          });
        }

        return {
          ...prev,
          currentEventIndex: nextIndex,
        };
      });
    }, 200 / replayState.playbackSpeed); // 由于只显示关键帧，增加了帧间隔时间

    setPlaybackInterval(interval);
  }, [activeSessionId, playbackInterval, processEvent, replayState.playbackSpeed, setReplayState]);

  /**
   * 暂停回放
   */
  const pauseReplay = useCallback(() => {
    if (playbackInterval) {
      clearInterval(playbackInterval);
      setPlaybackInterval(null);
    }

    setReplayState((prev) => ({
      ...prev,
      isPaused: true,
    }));
  }, [playbackInterval, setReplayState]);

  /**
   * 跳转到时间轴上的指定位置
   */
  const jumpToPosition = useCallback(
    (position: number) => {
      // 确保位置在有效范围内
      const normalizedPosition = Math.max(0, Math.min(1, position));

      if (replayState.events.length === 0 || !activeSessionId) return;

      // 根据位置计算目标事件索引
      const targetIndex = Math.floor(normalizedPosition * (replayState.events.length - 1));

      // 暂停任何正在进行的回放
      if (playbackInterval) {
        clearInterval(playbackInterval);
        setPlaybackInterval(null);
      }

      // 处理到新位置
      processEventsUpToIndex(targetIndex);

      setReplayState((prev) => ({
        ...prev,
        isPaused: true,
        currentEventIndex: targetIndex,
      }));
    },
    [
      activeSessionId,
      playbackInterval,
      processEventsUpToIndex,
      replayState.events.length,
      setReplayState,
    ],
  );

  /**
   * 跳转到最终结果
   */
  const jumpToResult = useCallback(() => {
    if (replayState.events.length === 0 || !activeSessionId) return;

    const finalIndex = replayState.events.length - 1;

    // 暂停任何正在进行的回放
    if (playbackInterval) {
      clearInterval(playbackInterval);
      setPlaybackInterval(null);
    }

    // 处理到最终位置
    processEventsUpToIndex(finalIndex);

    setReplayState((prev) => ({
      ...prev,
      isPaused: true,
      currentEventIndex: finalIndex,
    }));
  }, [
    activeSessionId,
    playbackInterval,
    processEventsUpToIndex,
    replayState.events.length,
    setReplayState,
  ]);

  /**
   * 设置播放速度
   */
  const setPlaybackSpeed = useCallback(
    (speed: number) => {
      setReplayState((prev) => ({
        ...prev,
        playbackSpeed: speed,
      }));

      // 如果正在播放，以新速度重启
      if (!replayState.isPaused && playbackInterval) {
        clearInterval(playbackInterval);
        startReplay();
      }
    },
    [playbackInterval, replayState.isPaused, setReplayState, startReplay],
  );

  /**
   * 退出回放模式
   */
  const exitReplay = useCallback(() => {
    if (playbackInterval) {
      clearInterval(playbackInterval);
    }

    setReplayState((prev) => ({
      ...prev,
      isActive: false,
      isPaused: true,
      currentEventIndex: -1,
      events: [],
      processedEvents: {},
    }));
  }, [playbackInterval, setReplayState]);

  /**
   * 获取当前事件
   */
  const getCurrentEvent = useCallback(() => {
    if (
      !replayState.isActive ||
      replayState.currentEventIndex < 0 ||
      replayState.currentEventIndex >= replayState.events.length
    ) {
      return null;
    }

    return replayState.events[replayState.currentEventIndex];
  }, [replayState.currentEventIndex, replayState.events, replayState.isActive]);

  /**
   * 获取当前位置百分比 (0-100)
   */
  const getCurrentPosition = useCallback(() => {
    if (!replayState.isActive || replayState.events.length <= 1) {
      return 0;
    }

    return (replayState.currentEventIndex / (replayState.events.length - 1)) * 100;
  }, [replayState.currentEventIndex, replayState.events.length, replayState.isActive]);

  /**
   * 获取当前所有事件
   */
  const getCurrentEvents = useCallback(() => {
    if (!replayState.isActive || replayState.currentEventIndex < 0) {
      return [];
    }

    return replayState.events.slice(0, replayState.currentEventIndex + 1);
  }, [replayState.currentEventIndex, replayState.events, replayState.isActive]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (playbackInterval) {
        clearInterval(playbackInterval);
      }
    };
  }, [playbackInterval]);

  // 回放模式初始化时：如果索引为-1，需要手动触发第一步，否则会显示为空白
  useEffect(() => {
    if (
      replayState.isActive &&
      replayState.currentEventIndex === -1 &&
      replayState.events.length > 0
    ) {
      // 如果启动回放后立即跳到第一个事件
      processEventsUpToIndex(0);
      setReplayState((prev) => ({
        ...prev,
        currentEventIndex: 0,
      }));
    }
  }, [
    replayState.isActive,
    replayState.currentEventIndex,
    replayState.events.length,
    processEventsUpToIndex,
    setReplayState,
  ]);

  /**
   * 取消自动播放倒计时
   */
  const cancelAutoPlay = useCallback(() => {
    setReplayState((prev) => ({
      ...prev,
      autoPlayCountdown: null,
    }));
  }, [setReplayState]);

  // 添加对自动播放事件的监听
  useEffect(() => {
    const handleAutoStart = () => {
      console.log('Auto-play event received, starting replay...');
      startReplay();
    };

    // 添加事件监听器
    window.addEventListener('replay-autostart', handleAutoStart);

    // 清理函数
    return () => {
      window.removeEventListener('replay-autostart', handleAutoStart);
    };
  }, [startReplay]); // 依赖于startReplay函数

  return {
    // 状态
    replayState,

    // 操作方法
    initReplay,
    startReplay,
    pauseReplay,
    jumpToPosition,
    jumpToResult,
    setPlaybackSpeed,
    exitReplay,
    cancelAutoPlay,

    // 工具方法
    getCurrentEvents,
    getCurrentPosition,
    getCurrentEvent,
  };
}
