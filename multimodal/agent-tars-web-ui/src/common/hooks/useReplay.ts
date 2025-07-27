import { useAtom } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';
import { replayStateAtom } from '../state/atoms/replay';
import { useSession } from './useSession';
import { messagesAtom } from '../state/atoms/message';
import { toolResultsAtom } from '../state/atoms/tool';
import { processEventAction } from '../state/actions/eventProcessor';
import { useSetAtom } from 'jotai';
import { plansAtom } from '../state/atoms/plan';

/**
 * Base interval for playback speed calculation (in milliseconds)
 */
const BASE_PLAYBACK_INTERVAL = 500;

/**
 * Simplified replay hook with clear state management and fixed playback speed control
 */
export function useReplay() {
  const [replayState, setReplayState] = useAtom(replayStateAtom);
  const { activeSessionId } = useSession();
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSpeedRef = useRef<number>(replayState.playbackSpeed);

  const [, setMessages] = useAtom(messagesAtom);
  const [, setToolResults] = useAtom(toolResultsAtom);
  const [, setPlans] = useAtom(plansAtom);
  const processEvent = useSetAtom(processEventAction);

  // Keep current speed ref synchronized with state
  useEffect(() => {
    currentSpeedRef.current = replayState.playbackSpeed;
  }, [replayState.playbackSpeed]);

  /**
   * Clear playback timer
   */
  const clearPlaybackTimer = useCallback(() => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  }, []);

  /**
   * Reset session state and process events up to the specified index
   */
  const processEventsUpToIndex = useCallback(
    (targetIndex: number) => {
      if (!activeSessionId || !replayState.events.length || targetIndex < -1) return;

      console.log('[useReplay] Processing events up to index:', targetIndex);

      // Clear current session state
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

      // Process events from 0 to targetIndex
      for (let i = 0; i <= targetIndex; i++) {
        const event = replayState.events[i];
        if (event) {
          processEvent({ sessionId: activeSessionId, event });
        }
      }
    },
    [activeSessionId, replayState.events, setMessages, setToolResults, setPlans, processEvent],
  );

  /**
   * Start replay from current position with proper speed handling
   */
  const startReplay = useCallback(() => {
    clearPlaybackTimer();

    setReplayState((prev) => ({
      ...prev,
      isPlaying: true,
    }));

    const startPlaybackWithSpeed = (speed: number) => {
      const interval = setInterval(
        () => {
          setReplayState((current) => {
            if (!current.isPlaying) {
              clearInterval(interval);
              return current;
            }

            const nextIndex = current.currentEventIndex + 1;
            if (nextIndex >= current.events.length) {
              clearInterval(interval);
              return {
                ...current,
                isPlaying: false,
                currentEventIndex: current.events.length - 1,
              };
            }

            // Process the next event
            if (activeSessionId && current.events[nextIndex]) {
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
        },
        Math.max(100, BASE_PLAYBACK_INTERVAL / speed),
      );

      playbackIntervalRef.current = interval;
    };

    // Use current speed from ref to ensure we have the latest value
    startPlaybackWithSpeed(currentSpeedRef.current);
  }, [activeSessionId, clearPlaybackTimer, processEvent, setReplayState]);

  /**
   * Pause replay
   */
  const pauseReplay = useCallback(() => {
    clearPlaybackTimer();
    setReplayState((prev) => ({
      ...prev,
      isPlaying: false,
    }));
  }, [clearPlaybackTimer, setReplayState]);

  /**
   * Jump to specific position (0-1 range)
   */
  const jumpToPosition = useCallback(
    (position: number) => {
      const normalizedPosition = Math.max(0, Math.min(1, position));
      if (replayState.events.length === 0) return;

      const targetIndex = Math.floor(normalizedPosition * (replayState.events.length - 1));

      clearPlaybackTimer();

      // Process events up to target index
      processEventsUpToIndex(targetIndex);

      setReplayState((prev) => ({
        ...prev,
        currentEventIndex: targetIndex,
        isPlaying: false,
      }));
    },
    [clearPlaybackTimer, processEventsUpToIndex, replayState.events.length, setReplayState],
  );

  /**
   * Reset to beginning and start replay
   */
  const resetAndPlay = useCallback(() => {
    clearPlaybackTimer();

    // Reset to beginning
    processEventsUpToIndex(-1);

    setReplayState((prev) => ({
      ...prev,
      currentEventIndex: -1,
      isPlaying: false,
    }));

    // Start playing after a brief delay
    setTimeout(() => {
      startReplay();
    }, 100);
  }, [clearPlaybackTimer, processEventsUpToIndex, setReplayState, startReplay]);

  /**
   * Jump to final state
   */
  const jumpToFinalState = useCallback(() => {
    if (replayState.events.length === 0) return;

    const finalIndex = replayState.events.length - 1;
    clearPlaybackTimer();

    processEventsUpToIndex(finalIndex);

    setReplayState((prev) => ({
      ...prev,
      currentEventIndex: finalIndex,
      isPlaying: false,
    }));
  }, [clearPlaybackTimer, processEventsUpToIndex, replayState.events.length, setReplayState]);

  /**
   * Set playback speed with proper state handling
   */
  const setPlaybackSpeed = useCallback(
    (speed: number) => {
      // Update the speed ref immediately for immediate use
      currentSpeedRef.current = speed;

      setReplayState((prev) => {
        const newState = {
          ...prev,
          playbackSpeed: speed,
        };

        // If currently playing, restart with new speed after state update
        if (prev.isPlaying) {
          // Clear current timer
          if (playbackIntervalRef.current) {
            clearInterval(playbackIntervalRef.current);
            playbackIntervalRef.current = null;
          }

          // Start new timer with updated speed
          setTimeout(() => {
            const interval = setInterval(
              () => {
                setReplayState((current) => {
                  if (!current.isPlaying) {
                    clearInterval(interval);
                    return current;
                  }

                  const nextIndex = current.currentEventIndex + 1;
                  if (nextIndex >= current.events.length) {
                    clearInterval(interval);
                    return {
                      ...current,
                      isPlaying: false,
                      currentEventIndex: current.events.length - 1,
                    };
                  }

                  // Process the next event
                  if (activeSessionId && current.events[nextIndex]) {
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
              },
              Math.max(100, BASE_PLAYBACK_INTERVAL / speed),
            );

            playbackIntervalRef.current = interval;
          }, 0);
        }

        return newState;
      });
    },
    [activeSessionId, processEvent, setReplayState],
  );

  /**
   * Exit replay mode
   */
  const exitReplay = useCallback(() => {
    clearPlaybackTimer();
    setReplayState({
      isActive: false,
      events: [],
      currentEventIndex: -1,
      isPlaying: false,
      playbackSpeed: 1,
      startTimestamp: null,
      endTimestamp: null,
    });
  }, [clearPlaybackTimer, setReplayState]);

  /**
   * Get current position percentage (0-100)
   */
  const getCurrentPosition = useCallback(() => {
    if (!replayState.isActive || replayState.events.length <= 1) {
      return 0;
    }
    return (replayState.currentEventIndex / (replayState.events.length - 1)) * 100;
  }, [replayState.currentEventIndex, replayState.events.length, replayState.isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPlaybackTimer();
    };
  }, [clearPlaybackTimer]);

  return {
    // State
    replayState,

    // Controls
    startReplay,
    pauseReplay,
    jumpToPosition,
    jumpToFinalState,
    resetAndPlay,
    setPlaybackSpeed,
    exitReplay,

    // Utilities
    getCurrentPosition,
  };
}
