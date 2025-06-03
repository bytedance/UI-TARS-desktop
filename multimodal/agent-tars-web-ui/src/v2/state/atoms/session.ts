import { atom } from 'jotai';
import { SessionInfo } from '../../types';

/**
 * Atom for storing all sessions
 */
export const sessionsAtom = atom<SessionInfo[]>([]);

/**
 * Atom for the currently active session ID
 */
export const activeSessionIdAtom = atom<string | null>(null);
