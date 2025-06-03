import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { replayStateAtom } from '../state/atoms/replay';
import { activeSessionIdAtom, sessionsAtom } from '../state/atoms/session';
import { messagesAtom } from '../state/atoms/message';
import { connectionStatusAtom, modelInfoAtom } from '../state/atoms/ui';
import { setModelInfoAction } from '../state/actions/modelInfoAction';

/**
 * ReplayModeContext - Global context for sharing replay mode state
 *
 * This context provides a centralized way to check if the application
 * is currently in replay mode, allowing components to adapt their behavior
 * without needing to directly access the replay state atom.
 */
interface ReplayModeContextType {
  isReplayMode: boolean;
  modelInfo: { provider: string; model: string } | null;
}

const ReplayModeContext = createContext<ReplayModeContextType>({
  isReplayMode: false,
  modelInfo: null,
});

/**
 * ReplayModeProvider - Provides replay mode state to the application and initializes replay data
 *
 * 1. Detects replay mode from window variables
 * 2. Initializes application state with replay data when in replay mode
 * 3. Prevents server communication in replay mode
 * 4. Provides the replay mode status to all child components
 */
export const ReplayModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Access necessary atoms
  const [replayState, setReplayState] = useAtom(replayStateAtom);
  const [, setMessages] = useAtom(messagesAtom);
  const [, setSessions] = useAtom(sessionsAtom);
  const [, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [, setConnectionStatus] = useAtom(connectionStatusAtom);
  const modelInfo = useAtomValue(modelInfoAtom);
  const setModelInfo = useSetAtom(setModelInfoAction);

  // Initialize replay mode if window variables are present
  useEffect(() => {
    // Check if in replay mode
    if (window.AGENT_TARS_REPLAY_MODE && window.AGENT_TARS_EVENT_STREAM) {
      // Get session data and event stream
      const sessionData = window.AGENT_TARS_SESSION_DATA;
      const events = window.AGENT_TARS_EVENT_STREAM;
      const modelData = window.AGENT_TARS_MODEL_INFO;

      console.log('[ReplayMode] Initializing replay mode with', events.length, 'events');

      if (sessionData && sessionData.id) {
        // Set connection status to "offline" to prevent health checks
        setConnectionStatus({
          connected: false, // Mark as disconnected to prevent API calls
          lastConnected: null,
          lastError: null,
          reconnecting: false,
        });

        // Set model info if available using the action
        if (modelData) {
          setModelInfo(modelData);
          console.log('[ReplayMode] Model info loaded:', modelData);
        }

        // Set sessions data
        setSessions([sessionData]);

        // When in replay mode, the session ID must be set immediately
        setActiveSessionId(sessionData.id);

        // Add debug logging
        console.log('[ReplayMode] Active session set to:', sessionData.id);

        // Initialize replay state with autoPlayCountdown
        setReplayState({
          isActive: true,
          isPaused: true, // 始终从暂停状态开始
          events: events,
          currentEventIndex: -1,
          startTimestamp: events.length > 0 ? events[0].timestamp : null,
          endTimestamp: events.length > 0 ? events[events.length - 1].timestamp : null,
          playbackSpeed: 1,
          autoPlayCountdown: 2, // 设置2秒倒计时
          visibleTimeWindow:
            events.length > 0
              ? {
                  start: events[0].timestamp,
                  end: events[events.length - 1].timestamp,
                }
              : null,
          processedEvents: {},
        });

        // Initialize empty messages state
        setMessages({
          [sessionData.id]: [],
        });

        console.log('[ReplayMode] Replay mode initialized successfully');

        // 启动倒计时
        const countdownTimer = setInterval(() => {
          setReplayState((prev) => {
            // 如果倒计时结束或已被取消
            if (prev.autoPlayCountdown === null || prev.autoPlayCountdown <= 0) {
              clearInterval(countdownTimer);

              // 只在倒计时完成时准备开始播放，但不直接改变isPaused状态
              // 这样将由useReplay中的startReplay函数正确启动播放过程
              if (prev.autoPlayCountdown === 0) {
                // 设置一个延迟启动标记，在下一个useEffect中捕获并启动播放
                setTimeout(() => {
                  console.log('[ReplayMode] Auto-play countdown finished, starting replay...');
                  // 触发一个事件通知播放开始
                  window.dispatchEvent(new CustomEvent('replay-autostart'));
                }, 0);
              }

              return {
                ...prev,
                autoPlayCountdown: null, // 只清除倒计时，不改变播放状态
              };
            }

            // 继续倒计时
            return {
              ...prev,
              autoPlayCountdown: prev.autoPlayCountdown - 1,
            };
          });
        }, 1000);
      } else {
        console.error('[ReplayMode] Missing session data or session ID');
      }
    }
  }, [setMessages, setSessions, setActiveSessionId, setReplayState, setConnectionStatus, setModelInfo]);

  // Check both the atom and global window variable for replay mode
  const isReplayMode = replayState.isActive || !!window.AGENT_TARS_REPLAY_MODE;

  return (
    <ReplayModeContext.Provider
      value={{
        isReplayMode,
        modelInfo: isReplayMode ? modelInfo : null,
      }}
    >
      {children}
    </ReplayModeContext.Provider>
  );
};

/**
 * useReplayMode - Hook to access replay mode state
 */
export const useReplayMode = (): boolean => {
  const { isReplayMode } = useContext(ReplayModeContext);
  return isReplayMode;
};

/**
 * useReplayModelInfo - Hook to access model info in replay mode
 */
export const useReplayModelInfo = (): { provider: string; model: string } | null => {
  const { modelInfo } = useContext(ReplayModeContext);
  return modelInfo;
};