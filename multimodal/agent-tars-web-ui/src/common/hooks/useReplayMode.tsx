import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { replayStateAtom } from '../state/atoms/replay';
import { activeSessionIdAtom, sessionsAtom } from '../state/atoms/session';
import { messagesAtom } from '../state/atoms/message';
import { connectionStatusAtom, modelInfoAtom, activePanelContentAtom } from '../state/atoms/ui';

/**
 * ReplayModeContext - Global context for sharing replay mode state
 *
 * This context provides a centralized way to check if the application
 * is currently in replay mode, allowing components to adapt their behavior
 * without needing to directly access the replay state atom.
 */
interface ReplayModeContextType {
  isReplayMode: boolean;
}

const ReplayModeContext = createContext<ReplayModeContextType>({
  isReplayMode: false,
});

/**
 * Parse URL parameters for replay configuration
 */
function parseReplayParams(): {
  shouldReplay: boolean;
  focusFile: string | null;
} {
  const urlParams = new URLSearchParams(window.location.search);
  const shouldReplay = urlParams.get('replay') === '1';
  const focusFile = urlParams.get('focus');

  return { shouldReplay, focusFile };
}

/**
 * Check if events contain generated files
 */
function hasGeneratedFiles(events: any[]): boolean {
  return events.some(
    (event) =>
      event.type === 'tool_result' &&
      (event.name === 'write_file' ||
        event.name === 'create_file' ||
        (event.content && typeof event.content === 'object' && event.content.path)),
  );
}

/**
 * Find specific file in generated files from events
 */
function findGeneratedFile(events: any[], fileName: string): any | null {
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
 * ReplayModeProvider - Provides replay mode state to the application and initializes replay data
 */
export const ReplayModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Access necessary atoms
  const [replayState, setReplayState] = useAtom(replayStateAtom);
  const [, setMessages] = useAtom(messagesAtom);
  const [, setSessions] = useAtom(sessionsAtom);
  const [, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [, setConnectionStatus] = useAtom(connectionStatusAtom);
  const [, setActivePanelContent] = useAtom(activePanelContentAtom);

  // Initialize replay mode if window variables are present
  useEffect(() => {
    // Check if in replay mode
    if (window.AGENT_TARS_REPLAY_MODE && window.AGENT_TARS_EVENT_STREAM) {
      // Get session data and event stream
      const sessionData = window.AGENT_TARS_SESSION_DATA;
      const events = window.AGENT_TARS_EVENT_STREAM;
      const { shouldReplay, focusFile } = parseReplayParams();

      console.log('[ReplayMode] Initializing replay mode with', events.length, 'events');
      console.log('[ReplayMode] URL params:', { shouldReplay, focusFile });

      if (sessionData && sessionData.id) {
        // Set connection status to "offline" to prevent API calls
        setConnectionStatus({
          connected: false,
          lastConnected: null,
          lastError: null,
          reconnecting: false,
        });

        // Set sessions data
        setSessions([sessionData]);
        setActiveSessionId(sessionData.id);

        // Initialize messages state
        setMessages({
          [sessionData.id]: [],
        });

        if (focusFile) {
          // Handle focus parameter - find the specific file and show it in fullscreen
          const foundFile = findGeneratedFile(events, focusFile);
          console.log('[ReplayMode] Focus file requested:', focusFile, 'found:', !!foundFile);

          if (foundFile) {
            // Initialize replay state to show final state
            setReplayState({
              isActive: true,
              isPaused: true,
              events: events,
              currentEventIndex: events.length - 1,
              startTimestamp: events.length > 0 ? events[0].timestamp : null,
              endTimestamp: events.length > 0 ? events[events.length - 1].timestamp : null,
              playbackSpeed: 1,
              autoPlayCountdown: null,
              visibleTimeWindow:
                events.length > 0
                  ? {
                      start: events[0].timestamp,
                      end: events[events.length - 1].timestamp,
                    }
                  : null,
              processedEvents: {},
              needsInitialProcessing: true, // Flag to indicate processing is needed
            });

            // Set the focused file as active panel content for fullscreen display
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

            return;
          }
        }

        if (shouldReplay) {
          // Traditional replay mode with countdown
          setReplayState({
            isActive: true,
            isPaused: true,
            events: events,
            currentEventIndex: -1,
            startTimestamp: events.length > 0 ? events[0].timestamp : null,
            endTimestamp: events.length > 0 ? events[events.length - 1].timestamp : null,
            playbackSpeed: 1,
            autoPlayCountdown: 2,
            visibleTimeWindow:
              events.length > 0
                ? {
                    start: events[0].timestamp,
                    end: events[events.length - 1].timestamp,
                  }
                : null,
            processedEvents: {},
            needsInitialProcessing: false, // No processing needed until replay starts
          });

          // Start countdown timer
          const countdownTimer = setInterval(() => {
            setReplayState((prev) => {
              if (prev.autoPlayCountdown === null || prev.autoPlayCountdown <= 0) {
                clearInterval(countdownTimer);

                if (prev.autoPlayCountdown === 0) {
                  setTimeout(() => {
                    console.log('[ReplayMode] Auto-play countdown finished, starting replay...');
                    window.dispatchEvent(new CustomEvent('replay-autostart'));
                  }, 0);
                }

                return {
                  ...prev,
                  autoPlayCountdown: null,
                };
              }

              return {
                ...prev,
                autoPlayCountdown: prev.autoPlayCountdown - 1,
              };
            });
          }, 1000);
        } else {
          // New default behavior: jump to final state
          const finalIndex = events.length - 1;

          setReplayState({
            isActive: true,
            isPaused: true,
            events: events,
            currentEventIndex: finalIndex,
            startTimestamp: events.length > 0 ? events[0].timestamp : null,
            endTimestamp: events.length > 0 ? events[events.length - 1].timestamp : null,
            playbackSpeed: 1,
            autoPlayCountdown: null,
            visibleTimeWindow:
              events.length > 0
                ? {
                    start: events[0].timestamp,
                    end: events[events.length - 1].timestamp,
                  }
                : null,
            processedEvents: {},
            needsInitialProcessing: true, // Flag to indicate processing is needed
          });

          console.log('[ReplayMode] Jumping to final state without replay');
        }
      } else {
        console.error('[ReplayMode] Missing session data or session ID');
      }
    }
  }, [
    setMessages,
    setSessions,
    setActiveSessionId,
    setReplayState,
    setConnectionStatus,
    setActivePanelContent,
  ]);

  // Check both the atom and global window variable for replay mode
  const isReplayMode = replayState.isActive || !!window.AGENT_TARS_REPLAY_MODE;

  return (
    <ReplayModeContext.Provider
      value={{
        isReplayMode,
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
