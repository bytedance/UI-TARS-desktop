import { atom } from 'jotai';
import { SessionItemInfo } from '@/common/types';

/**
 * Atom for storing all sessions
 */
export const sessionsAtom = atom<SessionItemInfo[]>([]);

/**
 * Atom for the currently active session ID
 */
export const activeSessionIdAtom = atom<string | null>(null);
