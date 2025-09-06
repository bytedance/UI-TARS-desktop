import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { replayStateAtom } from '@/common/state/atoms/replay';

interface UseReplayAutoScrollOptions {
  isReplayMode: boolean;
  onAutoScroll: () => void;
  delay?: number;
}

/**
 * Custom hook for handling auto-scroll in replay mode
 * Separated from main scroll logic for better maintainability
 */
export const useReplayAutoScroll = ({
  isReplayMode,
  onAutoScroll,
  delay = 50,
}: UseReplayAutoScrollOptions) => {
  const replayState = useAtomValue(replayStateAtom);
  const lastEventIndexRef = useRef<number>(-1);

  // Auto-scroll in replay mode when event index changes (including jumps)
  useEffect(() => {
    if (!isReplayMode || !replayState.isActive) {
      lastEventIndexRef.current = -1;
      return;
    }

    // Auto-scroll whenever the event index changes in replay mode
    // This covers both sequential playback and manual jumps/seeks
    if (replayState.currentEventIndex !== lastEventIndexRef.current) {
      lastEventIndexRef.current = replayState.currentEventIndex;

      // Schedule auto-scroll after DOM updates
      const timer = setTimeout(() => {
        onAutoScroll();
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [isReplayMode, replayState.isActive, replayState.currentEventIndex, onAutoScroll, delay]);
};
