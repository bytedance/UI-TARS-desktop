import { Setter } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import { sessionFilesAtom, FileItem } from '@/common/state/atoms/files';

/**
 * Collect and manage file information from various tool operations
 */
export function collectFileInfo(
  set: Setter,
  sessionId: string,
  toolName: string,
  toolCallId: string,
  args: unknown,
  content: unknown,
  timestamp: number,
): void {
  let fileItem: FileItem | null = null;

  switch (toolName) {
    case 'write_file':
      if (args && typeof args === 'object' && 'path' in args && typeof args.path === 'string') {
        fileItem = {
          id: uuidv4(),
          name: args.path.split('/').pop() || 'Unknown File',
          path: args.path,
          type: 'file',
          content: 'content' in args && typeof args.content === 'string' ? args.content : '',
          timestamp,
          toolCallId,
          sessionId,
        };
      }
      break;

    case 'browser_screenshot':
      if (typeof content === 'string' && content.startsWith('data:image/')) {
        fileItem = {
          id: uuidv4(),
          name: `Screenshot_${new Date(timestamp).toISOString().replace(/[:.]/g, '-')}.png`,
          path: '',
          type: 'screenshot',
          content,
          timestamp,
          toolCallId,
          sessionId,
        };
      }
      break;

    case 'browser_vision_control':
      if (Array.isArray(content)) {
        const imageContent = content.find(
          (item): item is { type: 'image_url'; image_url: { url: string } } =>
            typeof item === 'object' &&
            item !== null &&
            'type' in item &&
            item.type === 'image_url' &&
            'image_url' in item &&
            typeof item.image_url === 'object' &&
            item.image_url !== null &&
            'url' in item.image_url &&
            typeof item.image_url.url === 'string',
        );

        if (imageContent) {
          fileItem = {
            id: uuidv4(),
            name: `Vision_Control_${new Date(timestamp).toISOString().replace(/[:.]/g, '-')}.png`,
            path: '',
            type: 'screenshot',
            content: imageContent.image_url.url,
            timestamp,
            toolCallId,
            sessionId,
          };
        }
      }
      break;

    default:
      break;
  }

  if (fileItem) {
    set(sessionFilesAtom, (prev) => {
      const sessionFiles = prev[sessionId] || [];

      // Avoid duplicates by checking toolCallId and path
      const existingFileIndex = sessionFiles.findIndex(
        (file) => file.toolCallId === fileItem!.toolCallId && file.path === fileItem!.path,
      );

      if (existingFileIndex >= 0) {
        const updatedFiles = [...sessionFiles];
        updatedFiles[existingFileIndex] = fileItem!;
        return {
          ...prev,
          [sessionId]: updatedFiles,
        };
      }

      return {
        ...prev,
        [sessionId]: [...sessionFiles, fileItem!],
      };
    });
  }
}
