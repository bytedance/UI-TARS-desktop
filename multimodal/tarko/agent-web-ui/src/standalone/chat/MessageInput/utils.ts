import { ChatCompletionContentPart } from '@tarko/agent-interface';

/**
 * Compose multimodal message content from text and images
 * 
 * @param text - The text content
 * @param images - Array of image content parts
 * @returns Composed message content (string or array)
 */
export const composeMessageContent = (
  text: string,
  images: ChatCompletionContentPart[] = []
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
export const isMessageEmpty = (
  text: string,
  images: ChatCompletionContentPart[] = []
): boolean => {
  return !text.trim() && images.length === 0;
};
