import { atom } from 'jotai';

/**
 * File information interface
 */
export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'screenshot' | 'image';
  content?: string;
  size?: string;
  timestamp: number;
  toolCallId: string;
  sessionId: string;
}

/**
 * Atom for storing files by session
 */
export const sessionFilesAtom = atom<Record<string, FileItem[]>>({});
