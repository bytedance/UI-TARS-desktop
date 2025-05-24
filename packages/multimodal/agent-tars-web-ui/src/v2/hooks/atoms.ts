import { atom } from 'jotai';
import { SessionInfo, Message, ToolResult, PanelContent, ConnectionStatus } from '../types';

// 会话状态原子
export const sessionsAtom = atom<SessionInfo[]>([]);
export const activeSessionIdAtom = atom<string | null>(null);
export const messagesAtom = atom<Record<string, Message[]>>({});
export const toolResultsAtom = atom<Record<string, ToolResult[]>>({});
export const isProcessingAtom = atom<boolean>(false);
export const activePanelContentAtom = atom<PanelContent | null>(null);

// 服务器连接状态
export const connectionStatusAtom = atom<ConnectionStatus>({
  connected: false,
  lastConnected: null,
  lastError: null,
  reconnecting: false,
});
