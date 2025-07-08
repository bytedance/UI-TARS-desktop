import { atom } from 'jotai';

/**
 * 文件信息接口
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
 * 按会话存储文件的 atom
 */
export const sessionFilesAtom = atom<Record<string, FileItem[]>>({});

/**
 * 获取当前会话文件的派生 atom
 */
export const currentSessionFilesAtom = atom<FileItem[]>((get) => {
  const allFiles = get(sessionFilesAtom);
  // 这里需要从某个地方获取当前会话ID，暂时返回空数组
  return [];
});
