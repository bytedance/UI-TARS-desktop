import { useAtom } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';
import { replayStateAtom } from '../state/atoms/replay';
import { useSession } from './useSession';
import { messagesAtom } from '../state/atoms/message';
import { toolResultsAtom } from '../state/atoms/tool';
import { processEventAction } from '../state/actions/eventProcessors';
import { useSetAtom } from 'jotai';
import { plansAtom } from '../state/atoms/plan';

/**
 * Base interval for playback speed calculation (in milliseconds)
 */
const BASE_PLAYBACK_INTERVAL = 800; // Increased from 500 to slow down playback

/**
 * Simplified replay hook with clear state management and auto-play support
 */
export function useReplay() {
  const [replayState, setReplayState] = useAtom(replayStateAtom);
  const { activeSessionId } = useSession();
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSpeedRef = useRef<number>(replayState.playbackSpeed);
  const isProcessingEventRef = useRef<boolean>(false);

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
   * Clear countdown timer
   */
  const clearCountdownTimer = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
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
   * Process next single event in replay
   */
  const processNextEvent = useCallback(() => {
    if (isProcessingEventRef.current) {
      console.log('[useReplay] Skipping event processing - already processing');
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
        if (activeSessionId && current.events[nextIndex]) {
          console.log(`[useReplay] Processing event ${nextIndex}:`, current.events[nextIndex].type);
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
  }, [activeSessionId, processEvent, setReplayState, clearPlaybackTimer]);

  /**
   * Start replay from current position with proper speed handling
   */
  const startReplay = useCallback(() => {
    console.log('startReplay');

    clearPlaybackTimer();
    clearCountdownTimer();

    setReplayState((prev) => ({
      ...prev,
      isPlaying: true,
      autoPlayCountdown: null,
    }));

    console.log('[useReplay] Starting replay with speed:', currentSpeedRef.current);

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

  /**
   * Pause replay
   */
  const pauseReplay = useCallback(() => {
    clearPlaybackTimer();
    clearCountdownTimer();
    setReplayState((prev) => ({
      ...prev,
      isPlaying: false,
      autoPlayCountdown: null,
    }));
  }, [clearPlaybackTimer, clearCountdownTimer, setReplayState]);

  /**
   * Jump to specific position (0-1 range)
   */
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

  /**
   * Reset to beginning and start replay
   */
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

  /**
   * Jump to final state
   */
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

  /**
   * Set playback speed with proper state handling
   */
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

  /**
   * Cancel auto-play countdown - now properly clears all timers
   */
  const cancelAutoPlay = useCallback(() => {
    console.log('[useReplay] Canceling auto-play countdown');
    clearPlaybackTimer();
    clearCountdownTimer();
    setReplayState((prev) => ({
      ...prev,
      autoPlayCountdown: null,
      isPlaying: false,
    }));
  }, [clearPlaybackTimer, clearCountdownTimer, setReplayState]);

  /**
   * Exit replay mode
   */
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

  /**
   * Get current position percentage (0-100)
   */
  const getCurrentPosition = useCallback(() => {
    if (!replayState.isActive || replayState.events.length <= 1) {
      return 0;
    }
    return (replayState.currentEventIndex / (replayState.events.length - 1)) * 100;
  }, [replayState.currentEventIndex, replayState.events.length, replayState.isActive]);

  // Auto-start playback when countdown finishes
  useEffect(() => {
    if (
      replayState.autoPlayCountdown === null &&
      replayState.isPlaying &&
      !playbackIntervalRef.current
    ) {
      console.log('[useReplay] Auto-starting playback after countdown');
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
    cancelAutoPlay,
    exitReplay,

    // Utilities
    getCurrentPosition,
  };
}
