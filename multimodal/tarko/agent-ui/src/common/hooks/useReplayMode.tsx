import React, { createContext, useContext, ReactNode, useEffect, useRef, useCallback } from 'react';
import { atom, useAtom } from 'jotai';
import { replayStateAtom } from '../state/atoms/replay';
import { activeSessionIdAtom, sessionsAtom } from '../state/atoms/session';
import { messagesAtom } from '../state/atoms/message';
import { toolResultsAtom } from '../state/atoms/tool';
import { connectionStatusAtom, activePanelContentAtom } from '../state/atoms/ui';
import { processEventAction } from '../state/actions/eventProcessors';
import { useSetAtom } from 'jotai';
import { AgentEventStream } from '@/common/types';

/**
 * Base interval for playback speed calculation (in milliseconds)
 */
const BASE_PLAYBACK_INTERVAL = 800;

/**
 * ReplayModeContext - Global context for sharing replay mode state and controls
 */
interface ReplayModeContextType {
  isReplayMode: boolean;
  replayState: any;
  // Replay controls
  startReplay: () => void;
  pauseReplay: () => void;
  jumpToPosition: (position: number) => void;
  jumpToFinalState: () => void;
  resetAndPlay: () => void;
  setPlaybackSpeed: (speed: number) => void;
  cancelAutoPlay: () => void;
  exitReplay: () => void;
  getCurrentPosition: () => number;
}

const ReplayModeContext = createContext<ReplayModeContextType>({
  isReplayMode: false,
  replayState: null,
  startReplay: () => {},
  pauseReplay: () => {},
  jumpToPosition: () => {},
  jumpToFinalState: () => {},
  resetAndPlay: () => {},
  setPlaybackSpeed: () => {},
  cancelAutoPlay: () => {},
  exitReplay: () => {},
  getCurrentPosition: () => 0,
});

/**
 * Parse URL parameters for replay configuration
 */
function shouldAutoPlay(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('replay') === '1';
}

/**
 * Check if focus parameter exists
 */
function getFocusParam(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('focus');
}

/**
 * Find specific file in generated files from events
 */
function findGeneratedFile(events: AgentEventStream.Event[], fileName: string): any | null {
  for (const event of events) {
    if (
      event.type === 'tool_result' &&
      (event.name === 'write_file' || event.name === 'create_file')
    ) {
      const content = event.content;
      if (content && typeof content === 'object' && content.path) {
        const filePath = content.path as string;
        const name = filePath.split('/').pop() || filePath;
        if (name === fileName || filePath === fileName) {
          return {
            path: filePath,
            content: content.content || '',
            toolCallId: event.toolCallId,
            timestamp: event.timestamp,
          };
        }
      }
    }
  }
  return null;
}

/**
 * ReplayModeProvider - Provides replay mode state and initializes replay data
 */
export const ReplayModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [replayState, setReplayState] = useAtom(replayStateAtom);
  const [, setMessages] = useAtom(messagesAtom);
  const [, setToolResults] = useAtom(toolResultsAtom);
  const [, setSessions] = useAtom(sessionsAtom);
  const [, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [, setConnectionStatus] = useAtom(connectionStatusAtom);
  const [, setActivePanelContent] = useAtom(activePanelContentAtom);
  const processEvent = useSetAtom(processEventAction);

  // Timer refs for auto-play countdown and playback - properly managed
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSpeedRef = useRef<number>(1);
  const isProcessingEventRef = useRef<boolean>(false);

  // Timer management functions
  const clearPlaybackTimer = useCallback(() => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  }, []);

  const clearCountdownTimer = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Keep current speed ref synchronized with state
  useEffect(() => {
    currentSpeedRef.current = replayState.playbackSpeed;
  }, [replayState.playbackSpeed]);

  // Process events up to index function
  const processEventsUpToIndex = useCallback(
    (targetIndex: number) => {
      const activeSessionId = replayState.events.length > 0 ? sessionsAtom : null;
      if (!activeSessionId || !replayState.events.length || targetIndex < -1) return;

      console.log('[ReplayMode] Processing events up to index:', targetIndex);

      // Clear current session state
      setMessages((prev) => ({
        ...prev,
        [activeSessionId]: [],
      }));

      setToolResults((prev) => ({
        ...prev,
        [activeSessionId]: [],
      }));

      // Process events from 0 to targetIndex
      for (let i = 0; i <= targetIndex; i++) {
        const event = replayState.events[i];
        if (event) {
          processEvent({ sessionId: activeSessionId, event });
        }
      }
    },
    [replayState.events, setMessages, setToolResults, processEvent],
  );

  // Process next single event in replay
  const processNextEvent = useCallback(() => {
    if (isProcessingEventRef.current) {
      console.log('[ReplayMode] Skipping event processing - already processing');
      return false;
    }

    isProcessingEventRef.current = true;

    try {
      setReplayState((current) => {
        if (!current.isPlaying || !current.isActive) {
          return current;
        }

        const nextIndex = current.currentEventIndex + 1;
        if (nextIndex >= current.events.length) {
          // Reached end of replay
          clearPlaybackTimer();
          return {
            ...current,
            isPlaying: false,
            currentEventIndex: current.events.length - 1,
          };
        }

        // Process the next event
        const activeSessionId = current.events.length > 0 ? sessionsAtom : null;
        if (activeSessionId && current.events[nextIndex]) {
          console.log(`[ReplayMode] Processing event ${nextIndex}:`, current.events[nextIndex].type);
          processEvent({
            sessionId: activeSessionId,
            event: current.events[nextIndex],
          });
        }

        return {
          ...current,
          currentEventIndex: nextIndex,
        };
      });

      return true;
    } finally {
      // Reset processing flag after a short delay to prevent rapid successive calls
      setTimeout(() => {
        isProcessingEventRef.current = false;
      }, 50);
    }
  }, [processEvent, setReplayState, clearPlaybackTimer]);

  // Start replay from current position
  const startReplay = useCallback(() => {
    console.log('startReplay');

    clearPlaybackTimer();
    clearCountdownTimer();

    setReplayState((prev) => ({
      ...prev,
      isPlaying: true,
      autoPlayCountdown: null,
    }));

    console.log('[ReplayMode] Starting replay with speed:', currentSpeedRef.current);

    const interval = setInterval(
      () => {
        const success = processNextEvent();
        if (!success) {
          clearInterval(interval);
        }
      },
      Math.max(200, BASE_PLAYBACK_INTERVAL / currentSpeedRef.current),
    );

    playbackIntervalRef.current = interval;
  }, [clearPlaybackTimer, clearCountdownTimer, processNextEvent, setReplayState]);

  // Pause replay
  const pauseReplay = useCallback(() => {
    clearPlaybackTimer();
    clearCountdownTimer();
    setReplayState((prev) => ({
      ...prev,
      isPlaying: false,
      autoPlayCountdown: null,
    }));
  }, [clearPlaybackTimer, clearCountdownTimer, setReplayState]);

  // Jump to specific position (0-1 range)
  const jumpToPosition = useCallback(
    (position: number) => {
      const normalizedPosition = Math.max(0, Math.min(1, position));
      if (replayState.events.length === 0) return;

      const targetIndex = Math.floor(normalizedPosition * (replayState.events.length - 1));

      clearPlaybackTimer();
      clearCountdownTimer();

      // Process events up to target index
      processEventsUpToIndex(targetIndex);

      setReplayState((prev) => ({
        ...prev,
        currentEventIndex: targetIndex,
        isPlaying: false,
        autoPlayCountdown: null,
      }));
    },
    [
      clearPlaybackTimer,
      clearCountdownTimer,
      processEventsUpToIndex,
      replayState.events.length,
      setReplayState,
    ],
  );

  // Reset to beginning and start replay
  const resetAndPlay = useCallback(() => {
    clearPlaybackTimer();
    clearCountdownTimer();

    // Reset to beginning
    processEventsUpToIndex(-1);

    setReplayState((prev) => ({
      ...prev,
      currentEventIndex: -1,
      isPlaying: false,
      autoPlayCountdown: null,
    }));

    // Start playing after a brief delay
    setTimeout(() => {
      startReplay();
    }, 100);
  }, [
    clearPlaybackTimer,
    clearCountdownTimer,
    processEventsUpToIndex,
    setReplayState,
    startReplay,
  ]);

  // Jump to final state
  const jumpToFinalState = useCallback(() => {
    if (replayState.events.length === 0) return;

    const finalIndex = replayState.events.length - 1;
    clearPlaybackTimer();
    clearCountdownTimer();

    processEventsUpToIndex(finalIndex);

    setReplayState((prev) => ({
      ...prev,
      currentEventIndex: finalIndex,
      isPlaying: false,
      autoPlayCountdown: null,
    }));
  }, [
    clearPlaybackTimer,
    clearCountdownTimer,
    processEventsUpToIndex,
    replayState.events.length,
    setReplayState,
  ]);

  // Set playback speed
  const setPlaybackSpeed = useCallback(
    (speed: number) => {
      // Update the speed ref immediately for immediate use
      currentSpeedRef.current = speed;

      setReplayState((prev) => ({
        ...prev,
        playbackSpeed: speed,
      }));

      // If currently playing, restart with new speed
      if (replayState.isPlaying) {
        clearPlaybackTimer();

        const interval = setInterval(
          () => {
            const success = processNextEvent();
            if (!success) {
              clearInterval(interval);
            }
          },
          Math.max(200, BASE_PLAYBACK_INTERVAL / speed),
        );

        playbackIntervalRef.current = interval;
      }
    },
    [replayState.isPlaying, processNextEvent, setReplayState, clearPlaybackTimer],
  );

  // Cancel auto-play countdown function
  const cancelAutoPlay = useCallback(() => {
    console.log('[ReplayMode] Canceling auto-play countdown');
    clearPlaybackTimer();
    clearCountdownTimer();
    setReplayState((prev) => ({
      ...prev,
      autoPlayCountdown: null,
      isPlaying: false,
    }));
  }, [clearPlaybackTimer, clearCountdownTimer, setReplayState]);

  // Exit replay mode
  const exitReplay = useCallback(() => {
    clearPlaybackTimer();
    clearCountdownTimer();
    isProcessingEventRef.current = false;
    setReplayState({
      isActive: false,
      events: [],
      currentEventIndex: -1,
      isPlaying: false,
      playbackSpeed: 1,
      startTimestamp: null,
      endTimestamp: null,
      autoPlayCountdown: null,
    });
  }, [clearPlaybackTimer, clearCountdownTimer, setReplayState]);

  // Get current position percentage (0-100)
  const getCurrentPosition = useCallback(() => {
    if (!replayState.isActive || replayState.events.length <= 1) {
      return 0;
    }
    return (replayState.currentEventIndex / (replayState.events.length - 1)) * 100;
  }, [replayState.currentEventIndex, replayState.events.length, replayState.isActive]);

  // Initialize replay mode if window variables are present
  useEffect(() => {
    if (!window.AGENT_REPLAY_MODE || !window.AGENT_EVENT_STREAM) {
      return;
    }

    const sessionData = window.AGENT_SESSION_DATA;
    const events = window.AGENT_EVENT_STREAM;
    const shouldReplay = shouldAutoPlay();
    const focusFile = getFocusParam();

    console.log('[ReplayMode] Initializing with', events.length, 'events');
    console.log('[ReplayMode] Should auto play:', shouldReplay);
    console.log('[ReplayMode] Focus file:', focusFile);
    console.log('[ReplayMode] Session data:', sessionData);
    console.log('[ReplayMode] Session metadata:', sessionData?.metadata);

    if (!sessionData?.id) {
      console.error('[ReplayMode] Missing session data');
      return;
    }

    // Set offline mode
    setConnectionStatus({
      connected: false,
      lastConnected: null,
      lastError: null,
      reconnecting: false,
    });

    // Set session data
    setSessions([sessionData]);
    setActiveSessionId(sessionData.id);
    setMessages({ [sessionData.id]: [] });

    const finalIndex = events.length - 1;
    const startTimestamp = events.length > 0 ? events[0].timestamp : null;
    const endTimestamp = events.length > 0 ? events[finalIndex].timestamp : null;

    // Handle focus file parameter
    if (focusFile) {
      const foundFile = findGeneratedFile(events, focusFile);
      if (foundFile) {
        setActivePanelContent({
          type: 'file',
          source: foundFile.content,
          title: foundFile.path.split('/').pop() || foundFile.path,
          timestamp: foundFile.timestamp,
          toolCallId: foundFile.toolCallId,
          arguments: {
            path: foundFile.path,
            content: foundFile.content,
          },
        });
      }
    }

    if (shouldReplay) {
      // Auto-play mode: start countdown from 3 seconds
      console.log('[ReplayMode] Starting auto-play countdown');

      setReplayState({
        isActive: true,
        events,
        currentEventIndex: -1,
        isPlaying: false,
        playbackSpeed: 1,
        startTimestamp,
        endTimestamp,
        autoPlayCountdown: 3, // Start countdown from 3 seconds
      });

      // Start countdown timer with proper cleanup
      let countdown = 3;
      const startCountdown = () => {
        countdownIntervalRef.current = setInterval(() => {
          countdown -= 1;
          console.log('[ReplayMode] Countdown:', countdown);

          setReplayState((prev) => {
            // Check if auto-play was cancelled
            if (prev.autoPlayCountdown === null) {
              return prev; // Don't update if cancelled
            }

            return {
              ...prev,
              autoPlayCountdown: countdown,
            };
          });

          if (countdown <= 0) {
            // Clear countdown and start playback
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }

            setReplayState((prev) => {
              // Check if auto-play was cancelled
              if (prev.autoPlayCountdown === null) {
                return prev; // Don't start playback if cancelled
              }

              return {
                ...prev,
                autoPlayCountdown: null,
                isPlaying: true,
              };
            });

            console.log('[ReplayMode] Auto-play countdown finished, starting playback');
          }
        }, 1000);
      };

      // Add small delay to ensure UI is ready
      setTimeout(startCountdown, 100);
    } else {
      // Jump to final state mode
      setReplayState({
        isActive: true,
        events,
        currentEventIndex: finalIndex,
        isPlaying: false,
        playbackSpeed: 1,
        startTimestamp,
        endTimestamp,
        autoPlayCountdown: null,
      });

      // Process all events to final state
      processAllEventsToIndex(sessionData.id, events, finalIndex, processEvent);
    }

    // Cleanup on unmount
    return () => {
      clearPlaybackTimer();
      clearCountdownTimer();
    };
  }, [
    setMessages,
    setSessions,
    setActiveSessionId,
    setReplayState,
    setConnectionStatus,
    setActivePanelContent,
    processEvent,
  ]);

  const isReplayMode = replayState.isActive || !!window.AGENT_REPLAY_MODE;

  // Auto-start playback when countdown finishes
  useEffect(() => {
    if (
      replayState.autoPlayCountdown === null &&
      replayState.isPlaying &&
      !playbackIntervalRef.current
    ) {
      console.log('[ReplayMode] Auto-starting playback after countdown');
      startReplay();
    }
  }, [replayState.autoPlayCountdown, replayState.isPlaying, startReplay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPlaybackTimer();
      clearCountdownTimer();
      isProcessingEventRef.current = false;
    };
  }, [clearPlaybackTimer, clearCountdownTimer]);

  return (
    <ReplayModeContext.Provider value={{ 
      isReplayMode, 
      replayState,
      startReplay,
      pauseReplay,
      jumpToPosition,
      jumpToFinalState,
      resetAndPlay,
      setPlaybackSpeed,
      cancelAutoPlay,
      exitReplay,
      getCurrentPosition,
    }}>
      {children}
    </ReplayModeContext.Provider>
  );
};

/**
 * Process all events up to a specific index
 */
function processAllEventsToIndex(
  sessionId: string,
  events: AgentEventStream.Event[],
  targetIndex: number,
  processEvent: (params: { sessionId: string; event: AgentEventStream.Event }) => void,
): void {
  for (let i = 0; i <= targetIndex; i++) {
    if (events[i]) {
      processEvent({ sessionId, event: events[i] });
    }
  }
}

/**
 * useReplayMode - Hook to access replay mode state and controls
 */
export const useReplayMode = () => {
  const context = useContext(ReplayModeContext);
  return context;
};

/**
 * useReplay - Alias for useReplayMode for backward compatibility
 */
export const useReplay = useReplayMode;
