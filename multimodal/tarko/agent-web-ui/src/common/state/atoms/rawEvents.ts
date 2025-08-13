import { atom } from 'jotai';
import { AgentEventStream } from '@/common/types';

/**
 * Raw event stream storage - grouped by session
 */
export const rawEventsAtom = atom<Record<string, AgentEventStream.Event[]>>({});

/**
 * Original tool call/result mapping
 */
export interface RawToolMapping {
  toolCall: AgentEventStream.ToolCallEvent;
  toolResult: AgentEventStream.ToolResultEvent | null;
}

export const rawToolMappingAtom = atom<Record<string, Record<string, RawToolMapping>>>({});
