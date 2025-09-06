import { atom } from 'jotai';

/**
 * Workspace display mode types
 */
export type WorkspaceDisplayMode = 'interaction' | 'raw' | 'events';

/**
 * Current workspace display mode
 * - 'interaction': Default mode showing processed tool results with UI components
 * - 'raw': Raw mode showing original tool input/output in JSON format
 * - 'events': Event stream viewer showing real-time event flow
 */
export const workspaceDisplayModeAtom = atom<WorkspaceDisplayMode>('interaction');
