import { ChatCompletionContentPart } from '@tarko/agent-interface';
import type { ContextualItem } from '../../../common/state/atoms/contextualSelector';
import type { UploadedFileInfo } from '../../../common/types';

/**
 * Compose multimodal message content from text, images, and persisted files.
 *
 * @param text - The text content
 * @param images - Array of image content parts
 * @param files - Files persisted in the Agent workspace
 * @returns Composed message content (string or array)
 */
export const composeMessageContent = (
  text: string,
  images: ChatCompletionContentPart[] = [],
  files: UploadedFileInfo[] = [],
): string | ChatCompletionContentPart[] => {
  const trimmedText = text.trim();
  const uploadedFileContext = files.length
    ? [
        'Uploaded files (paths are relative to the current Agent workspace):',
        ...files.map(
          (file) =>
            `- ${file.relativePath} (${file.size} bytes${file.mimeType ? `, ${file.mimeType}` : ''})`,
        ),
      ].join('\n')
    : '';
  const textContent = [trimmedText, uploadedFileContext].filter(Boolean).join('\n\n');

  if (images.length === 0) {
    return textContent;
  }

  return [
    ...images,
    ...(textContent ? [{ type: 'text', text: textContent } as ChatCompletionContentPart] : []),
  ];
};

/**
 * Check if a message has no text or attachments.
 *
 * @param text - The text content
 * @param images - Array of image content parts
 * @param files - Files persisted in the Agent workspace
 * @returns True if the text, image list, and file list are all empty
 */
export const isMessageEmpty = (
  text: string,
  images: ChatCompletionContentPart[] = [],
  files: UploadedFileInfo[] = [],
): boolean => !text.trim() && images.length === 0 && files.length === 0;

/**
 * Parse contextual references from text - shared utility
 *
 * @param text - The text to parse
 * @returns Array of contextual items found in the text
 */
export const parseContextualReferences = (text: string): ContextualItem[] => {
  const contextualReferencePattern = /@(file|dir):([^\s]+)/g;
  const workspacePattern = /@workspace/g;

  const contextualRefs = Array.from(text.matchAll(contextualReferencePattern)).map(
    (match, index) => {
      const [fullMatch, type, relativePath] = match;
      const name = relativePath.split(/[/\\]/).pop() || relativePath;

      return {
        id: `${type}-${relativePath}-${index}`,
        type: type as 'file' | 'directory',
        name,
        path: relativePath,
        relativePath,
      };
    },
  );

  const workspaceRefs = Array.from(text.matchAll(workspacePattern)).map((match, index) => ({
    id: `workspace-${index}`,
    type: 'workspace' as const,
    name: 'workspace',
    path: '/',
    relativePath: '.',
  }));

  return [...contextualRefs, ...workspaceRefs];
};
