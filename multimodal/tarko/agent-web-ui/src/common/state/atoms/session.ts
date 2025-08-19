import { atom } from 'jotai';
import { SessionMetadata } from '@/common/types';

/**
 * Atom for storing all sessions
 */
export const sessionsAtom = atom<SessionMetadata[]>([]);

/**
 * Atom for the currently active session ID
 */
export const activeSessionIdAtom = atom<string | null>(null);

/**
 * Session initialization status
 */
export interface SessionInitializationStatus {
  isInitializing: boolean;
  message: string;
  events: Array<{
    type: string;
    message: string;
    timestamp: number;
    error?: string;
  }>;
}

/**
 * Atom for tracking session initialization status
 */
export const sessionInitializationAtom = atom<Record<string, SessionInitializationStatus>>({});
