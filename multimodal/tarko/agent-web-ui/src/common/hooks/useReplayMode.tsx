import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { atom, useAtom } from 'jotai';
import { replayStateAtom } from '../state/atoms/replay';
import { activeSessionIdAtom, sessionsAtom } from '../state/atoms/session';
import { messagesAtom } from '../state/atoms/message';
import { connectionStatusAtom, activePanelContentAtom } from '../state/atoms/ui';
import { processEventAction } from '../state/actions/eventProcessors';
import { useSetAtom } from 'jotai';
import { AgentEventStream } from '@/common/types';

/**
 * ReplayModeContext - Global context for sharing replay mode state and controls
 */
interface ReplayModeContextType {
  isReplayMode: boolean;
  cancelAutoPlay: () => void;
}

const ReplayModeContext = createContext<ReplayModeContextType>({
  isReplayMode: false,
  cancelAutoPlay: () => {},
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
  const [, setSessions] = useAtom(sessionsAtom);
  const [, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [, setConnectionStatus] = useAtom(connectionStatusAtom);
  const [, setActivePanelContent] = useAtom(activePanelContentAtom);
  const processEvent = useSetAtom(processEventAction);

  // Timer refs for auto-play countdown - properly managed
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cancel auto-play countdown function
  const cancelAutoPlay = React.useCallback(() => {
    console.log('[ReplayMode] Canceling auto-play countdown');

    // Clear the countdown timer
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Update replay state to cancel auto-play
    setReplayState((prev) => ({
      ...prev,
      autoPlayCountdown: null,
      isPlaying: false,
    }));
  }, [setReplayState]);

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
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
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

  return (
    <ReplayModeContext.Provider value={{ isReplayMode, cancelAutoPlay }}>
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
export const useReplayMode = (): { isReplayMode: boolean; cancelAutoPlay: () => void } => {
  const { isReplayMode, cancelAutoPlay } = useContext(ReplayModeContext);
  return { isReplayMode, cancelAutoPlay };
};
