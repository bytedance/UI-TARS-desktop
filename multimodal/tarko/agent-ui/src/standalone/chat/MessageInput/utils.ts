import { ChatCompletionContentPart } from '@tarko/agent-interface';
import { ContextualItem } from '@/common/state/atoms/contextualSelector';

/**
 * Compose multimodal message content from text and images
 *
 * @param text - The text content
 * @param images - Array of image content parts
 * @returns Composed message content (string or array)
 */
export const composeMessageContent = (
  text: string,
  images: ChatCompletionContentPart[] = [],
): string | ChatCompletionContentPart[] => {
  const trimmedText = text.trim();

  if (images.length === 0) {
    return trimmedText;
  }

  return [
    ...images,
    ...(trimmedText ? [{ type: 'text', text: trimmedText } as ChatCompletionContentPart] : []),
  ];
};

/**
 * Check if message content is empty
 *
 * @param text - The text content
 * @param images - Array of image content parts
 * @returns True if both text and images are empty
 */
export const isMessageEmpty = (text: string, images: ChatCompletionContentPart[] = []): boolean => {
  return !text.trim() && images.length === 0;
};

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
