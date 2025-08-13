import { Getter } from 'jotai';
import { activeSessionIdAtom } from '@/common/state/atoms/session';
import { replayStateAtom } from '@/common/state/atoms/replay';

/**
 * Helper function to validate if the event belongs to the current active session
 * Prevents cross-session content bleeding in workspace panel
 */
export function shouldUpdatePanelContent(get: Getter, sessionId: string): boolean {
  const activeSessionId = get(activeSessionIdAtom);
  const replayState = get(replayStateAtom);

  // Don't update panel content if:
  // 1. No active session
  // 2. Event is from a different session than the active one
  // 3. In replay mode (replay handles its own content updates)
  if (!activeSessionId || sessionId !== activeSessionId || replayState.isActive) {
    return false;
  }

  return true;
}
