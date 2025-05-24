import { atom } from 'jotai';
import { SessionInfo, Message, ToolResult } from '../../types';

// Store all session information
export const sessionsAtom = atom<SessionInfo[]>([]);

// Currently active session ID
export const activeSessionIdAtom = atom<string | null>(null);

// Store messages for each session
export const messagesAtom = atom<Record<string, Message[]>>({});

// Store tool results for each session
export const toolResultsAtom = atom<Record<string, ToolResult[]>>({});

// Processing status
export const isProcessingAtom = atom<boolean>(false);

// Server connection status
export interface ServerConnectionStatus {
  connected: boolean;
  lastConnected: number | null;
  lastError: string | null;
  reconnecting: boolean;
}

export const serverConnectionStatusAtom = atom<ServerConnectionStatus>({
  connected: false,
  lastConnected: null,
  lastError: null,
  reconnecting: false,
});

// Currently displayed content in the right panel
export interface PanelContent {
  type: 'search' | 'browser' | 'command' | 'image' | 'file' | 'other';
  source: any;
  title: string;
  timestamp: number;
  toolCallId?: string;
  error?: string;
}

// Currently active panel content
export const activePanelContentAtom = atom<PanelContent | null>(null);
