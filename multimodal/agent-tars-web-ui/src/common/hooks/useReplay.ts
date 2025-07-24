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
 * Custom hook for managing replay functionality
 *
 * Provides:
 * - Control for playback (play, pause, jump, etc.)
 * - Event processing through the standard event processor
 * - Timeline calculations and positioning
 * - Support for direct jump to final state
 */
export function useReplay() {
  const [replayState, setReplayState] = useAtom(replayStateAtom);
  const { activeSessionId } = useSession();

  // Use useRef to manage timer, avoiding async state update issues
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [, setMessages] = useAtom(messagesAtom);
  const [, setToolResults] = useAtom(toolResultsAtom);
  const [, setPlans] = useAtom(plansAtom);
  const processEvent = useSetAtom(processEventAction);

  /**
   * Unified method for clearing the timer
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
      if (!activeSessionId || !replayState.events.length || targetIndex < 0) return;

      // Get events to process
      const eventsToProcess = replayState.events.slice(0, targetIndex + 1);

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

      // Process environment input events first to ensure image resources are loaded first
      const envEvents = eventsToProcess.filter((event) => event.type === 'environment_input');
      const nonEnvEvents = eventsToProcess.filter((event) => event.type !== 'environment_input');

      // Process environment input events first
      for (const event of envEvents) {
        processEvent({ sessionId: activeSessionId, event });
      }

      // Then process other events
      for (const event of nonEnvEvents) {
        processEvent({ sessionId: activeSessionId, event });
      }
    },
    [activeSessionId, replayState.events, setMessages, setToolResults, setPlans, processEvent],
  );

  /**
   * Jump directly to final state without animation
   */
  const jumpToFinalState = useCallback(() => {
    if (replayState.events.length === 0 || !activeSessionId) return;

    const finalIndex = replayState.events.length - 1;

    // Clear any ongoing replay
    clearPlaybackTimer();

    // Process to final position
    processEventsUpToIndex(finalIndex);

    setReplayState((prev) => ({
      ...prev,
      isPaused: true,
      currentEventIndex: finalIndex,
      autoPlayCountdown: null, // Ensure no countdown is active
      needsInitialProcessing: false, // Mark as processed
    }));

    console.log('[useReplay] Jumped to final state at index:', finalIndex);
  }, [
    activeSessionId,
    clearPlaybackTimer,
    processEventsUpToIndex,
    replayState.events.length,
    setReplayState,
  ]);

  /**
   * Start replay
   */
  const startReplay = useCallback(() => {
    // First clear any existing timer
    clearPlaybackTimer();

    // Set playing state
    setReplayState((prev) => ({
      ...prev,
      isPaused: false,
      autoPlayCountdown: null, // Clear countdown
    }));

    // Create new timer
    const interval = setInterval(
      () => {
        setReplayState((current) => {
          // Check if paused - if so, clean timer and return
          if (current.isPaused) {
            clearInterval(interval);
            return current;
          }

          // Stop when reaching the end
          if (current.currentEventIndex >= current.events.length - 1) {
            clearInterval(interval);
            return {
              ...current,
              isPaused: true,
              currentEventIndex: current.events.length - 1,
            };
          }

          // Advance to next event
          const nextIndex = current.currentEventIndex + 1;

          // Process to new position
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
      Math.max(100, 500 / replayState.playbackSpeed),
    ); // Minimum interval 100ms to avoid being too fast

    // Save timer reference
    playbackIntervalRef.current = interval;
  }, [
    activeSessionId,
    clearPlaybackTimer,
    processEvent,
    replayState.playbackSpeed,
    setReplayState,
  ]);

  /**
   * Pause replay
   */
  const pauseReplay = useCallback(() => {
    // Clear timer
    clearPlaybackTimer();

    // Set paused state
    setReplayState((prev) => ({
      ...prev,
      isPaused: true,
    }));
  }, [clearPlaybackTimer, setReplayState]);

  /**
   * Jump to specified position on timeline
   */
  const jumpToPosition = useCallback(
    (position: number) => {
      // Ensure position is within valid range
      const normalizedPosition = Math.max(0, Math.min(1, position));

      if (replayState.events.length === 0 || !activeSessionId) return;

      // Calculate target event index based on position
      const targetIndex = Math.floor(normalizedPosition * (replayState.events.length - 1));

      // Pause any ongoing replay
      clearPlaybackTimer();

      // Process to new position
      processEventsUpToIndex(targetIndex);

      setReplayState((prev) => ({
        ...prev,
        isPaused: true,
        currentEventIndex: targetIndex,
      }));
    },
    [
      activeSessionId,
      clearPlaybackTimer,
      processEventsUpToIndex,
      replayState.events.length,
      setReplayState,
    ],
  );

  /**
   * Jump to final result
   */
  const jumpToResult = useCallback(() => {
    if (replayState.events.length === 0 || !activeSessionId) return;

    const finalIndex = replayState.events.length - 1;

    // Pause any ongoing replay
    clearPlaybackTimer();

    // Process to final position
    processEventsUpToIndex(finalIndex);

    setReplayState((prev) => ({
      ...prev,
      isPaused: true,
      currentEventIndex: finalIndex,
    }));
  }, [
    activeSessionId,
    clearPlaybackTimer,
    processEventsUpToIndex,
    replayState.events.length,
    setReplayState,
  ]);

  /**
   * Reset replay to initial state, allowing playback from the beginning
   */
  const resetReplay = useCallback(() => {
    // Pause any ongoing replay
    clearPlaybackTimer();

    // Reset to initial state and clear messages
    if (activeSessionId) {
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
    }

    setReplayState((prev) => ({
      ...prev,
      isPaused: true,
      currentEventIndex: -1,
    }));
  }, [clearPlaybackTimer, setReplayState, activeSessionId, setMessages, setToolResults, setPlans]);

  /**
   * Set playback speed
   */
  const setPlaybackSpeed = useCallback(
    (speed: number) => {
      // Clear current timer
      clearPlaybackTimer();

      // Update playback speed status
      setReplayState((prev) => ({
        ...prev,
        playbackSpeed: speed,
      }));

      // If currently playing, restart with new speed
      setReplayState((current) => {
        if (!current.isPaused) {
          // Start playback immediately with new speed
          const interval = setInterval(
            () => {
              setReplayState((replayState) => {
                // Check if paused
                if (replayState.isPaused) {
                  clearInterval(interval);
                  return replayState;
                }

                // Stop when reaching the end
                if (replayState.currentEventIndex >= replayState.events.length - 1) {
                  clearInterval(interval);
                  return {
                    ...replayState,
                    isPaused: true,
                    currentEventIndex: replayState.events.length - 1,
                  };
                }

                // Advance to the next event
                const nextIndex = replayState.currentEventIndex + 1;

                // Process to a new position
                if (activeSessionId && replayState.events[nextIndex]) {
                  processEvent({
                    sessionId: activeSessionId,
                    event: replayState.events[nextIndex],
                  });
                }

                return {
                  ...replayState,
                  currentEventIndex: nextIndex,
                };
              });
            },
            Math.max(100, 1000 / speed),
          ); // Directly use the incoming speed parameter

          // Save the timer reference
          playbackIntervalRef.current = interval;
        }

        return current;
      });
    },
    [activeSessionId, clearPlaybackTimer, processEvent, setReplayState],
  );

  /**
   * Exit replay mode
   */
  const exitReplay = useCallback(() => {
    clearPlaybackTimer();

    setReplayState({
      isActive: false,
      isPaused: true,
      events: [],
      currentEventIndex: -1,
      startTimestamp: null,
      endTimestamp: null,
      playbackSpeed: 1,
      autoPlayCountdown: null,
      visibleTimeWindow: null,
      processedEvents: {},
      needsInitialProcessing: false,
    });
  }, [clearPlaybackTimer, setReplayState]);

  /**
   * Cancel auto-play countdown
   */
  const cancelAutoPlay = useCallback(() => {
    setReplayState((prev) => ({
      ...prev,
      autoPlayCountdown: null,
    }));
  }, [setReplayState]);

  /**
   * Get current event
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
   * Get current position percentage (0-100)
   */
  const getCurrentPosition = useCallback(() => {
    if (
      !replayState.isActive ||
      replayState.events.length <= 1 ||
      replayState.currentEventIndex === -1
    ) {
      return 0;
    }
    return (replayState.currentEventIndex / (replayState.events.length - 1)) * 100;
  }, [replayState.currentEventIndex, replayState.events.length, replayState.isActive]);

  /**
   * Get all current events
   */
  const getCurrentEvents = useCallback(() => {
    if (!replayState.isActive || replayState.currentEventIndex < 0) {
      return [];
    }

    return replayState.events.slice(0, replayState.currentEventIndex + 1);
  }, [replayState.currentEventIndex, replayState.events, replayState.isActive]);

  // Clear timer when component unmounts
  useEffect(() => {
    return () => {
      clearPlaybackTimer();
    };
  }, [clearPlaybackTimer]);

  // Handle initial processing when replay mode is activated
  useEffect(() => {
    if (
      replayState.isActive &&
      replayState.needsInitialProcessing &&
      replayState.events.length > 0 &&
      activeSessionId
    ) {
      console.log('[useReplay] Processing initial events for non-replay mode');

      // Check URL params to determine the expected behavior
      const urlParams = new URLSearchParams(window.location.search);
      const shouldReplay = urlParams.get('replay') === '1';

      if (!shouldReplay && replayState.currentEventIndex >= 0) {
        // For non-replay mode, process all events up to current index
        processEventsUpToIndex(replayState.currentEventIndex);

        // Mark as processed
        setReplayState((prev) => ({
          ...prev,
          needsInitialProcessing: false,
        }));
      }
    }
  }, [
    replayState.isActive,
    replayState.needsInitialProcessing,
    replayState.events.length,
    replayState.currentEventIndex,
    activeSessionId,
    processEventsUpToIndex,
    setReplayState,
  ]);

  // Add listener for auto-play events
  useEffect(() => {
    const handleAutoStart = () => {
      console.log('Auto-play event received, starting replay...');
      startReplay();
    };

    window.addEventListener('replay-autostart', handleAutoStart);

    return () => {
      window.removeEventListener('replay-autostart', handleAutoStart);
    };
  }, [startReplay]);

  return {
    // State
    replayState,

    // Action methods
    startReplay,
    pauseReplay,
    jumpToPosition,
    jumpToResult,
    jumpToFinalState, // New method for direct jump
    setPlaybackSpeed,
    exitReplay,
    cancelAutoPlay,
    resetReplay,

    // Utility methods
    getCurrentEvents,
    getCurrentPosition,
    getCurrentEvent,
  };
}
