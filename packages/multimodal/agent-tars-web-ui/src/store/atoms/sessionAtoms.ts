import { atom } from 'jotai';
import { SessionInfo, Message, ToolResult } from '../../types';

// 存储所有会话信息
export const sessionsAtom = atom<SessionInfo[]>([]);

// 当前激活的会话ID
export const activeSessionIdAtom = atom<string | null>(null);

// 存储每个会话的消息记录
export const messagesAtom = atom<Record<string, Message[]>>({});

// 存储每个会话的工具结果
export const toolResultsAtom = atom<Record<string, ToolResult[]>>({});

// 是否正在处理请求的状态
export const isProcessingAtom = atom<boolean>(false);
