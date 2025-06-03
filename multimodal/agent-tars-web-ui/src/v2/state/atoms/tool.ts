import { atom } from 'jotai';
import { ToolResult } from '../../types';

/**
 * Atom for storing tool results for each session
 * Key is the session ID, value is an array of tool results for that session
 */
export const toolResultsAtom = atom<Record<string, ToolResult[]>>({});

/**
 * Map to track tool calls to their results (not an atom, just a cache)
 */
export const toolCallResultMap = new Map<string, ToolResult>();
