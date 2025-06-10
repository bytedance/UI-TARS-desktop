import { atom } from 'jotai';
import { SessionMetadata } from '../../types';

/**
 * Atom for storing all sessions
 */
export const sessionsAtom = atom<SessionMetadata[]>([]);

/**
 * Atom for the currently active session ID
 */
export const activeSessionIdAtom = atom<string | null>(null);
