import { Getter } from 'jotai';
import { activeSessionIdAtom } from '@/common/state/atoms/session';

/**
 * Helper function to validate if the event belongs to the current active session
 * Prevents cross-session content bleeding in workspace panel
 */
export function shouldUpdatePanelContent(get: Getter, sessionId: string): boolean {
  const activeSessionId = get(activeSessionIdAtom);

  // Don't update panel content if:
  // 1. No active session
  // 2. Event is from a different session than the active one
  if (!activeSessionId || sessionId !== activeSessionId) {
    return false;
  }

  return true;
}
