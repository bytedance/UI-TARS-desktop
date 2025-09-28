import { ChatCompletionContentPart } from '@tarko/agent-interface';
import { TarkoMultimodalClipboardProtocol } from '@/common/types';

/**
 * Convert image URL to base64 data
 * @param url - Image URL (data URL or regular URL)
 * @returns Promise resolving to base64 string and MIME type
 */
export async function imageToBase64(url: string): Promise<{ data: string; mime: string }> {
  if (url.startsWith('data:')) {
    // Handle data URLs
    const [header, data] = url.split(',');
    const mime = header.split(';')[0].split(':')[1];
    return { data, mime };
  }

  // Handle regular URLs
  const res = await fetch(url);
  const blob = await res.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const [header, data] = result.split(',');
      const mime = header.split(';')[0].split(':')[1];
      resolve({ data, mime });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Copy multimodal content to clipboard using Tarko protocol
 * @param text - Text content
 * @param imageUrls - Array of image URLs
 */
export async function copyToClipboard(text: string, imageUrls: string[] = []): Promise<void> {
  const images = await Promise.all(imageUrls.map(imageToBase64));

  const data: TarkoMultimodalClipboardProtocol = {
    protocol: 'tarko://webui/clipboard/v1',
    text,
    images,
  };

  await navigator.clipboard.write([
    new ClipboardItem({
      'text/plain': new Blob([JSON.stringify(data)], { type: 'text/plain' }),
    }),
  ]);
}

/**
 * Check if clipboard text is a valid Tarko multimodal protocol
 * @param text - Text from clipboard
 * @returns True if text is valid Tarko protocol
 */
export function isTarkoMultimodalProtocol(text: string): boolean {
  try {
    const data = JSON.parse(text);
    return (
      typeof data === 'object' &&
      data !== null &&
      data.protocol === 'tarko://webui/clipboard/v1' &&
      typeof data.text === 'string' &&
      Array.isArray(data.images)
    );
  } catch {
    return false;
  }
}

/**
 * Parse Tarko multimodal clipboard data into text and images
 * @param clipboardText - JSON string from clipboard
 * @returns Parsed text and images, or null if invalid
 */
export function parseTarkoMultimodalClipboard(
  clipboardText: string,
): { text: string; images: ChatCompletionContentPart[] } | null {
  try {
    const data: TarkoMultimodalClipboardProtocol = JSON.parse(clipboardText);

    if (data.protocol !== 'tarko://webui/clipboard/v1') {
      return null;
    }

    const images: ChatCompletionContentPart[] = data.images.map((img) => ({
      type: 'image_url',
      image_url: {
        url: `data:${img.mime};base64,${img.data}`,
        detail: 'auto',
      },
    }));

    return {
      text: data.text,
      images,
    };
  } catch {
    return null;
  }
}

/**
 * Handle paste event for multimodal clipboard support
 * @param event - Clipboard paste event
 * @param onTextPaste - Callback for text content
 * @param onImagePaste - Callback for image content
 * @param onMultimodalPaste - Callback for multimodal protocol content
 * @returns Promise<boolean> - True if paste was handled
 */
export async function handleMultimodalPaste(
  event: ClipboardEvent,
  callbacks: {
    onTextPaste?: (text: string) => void;
    onImagePaste?: (images: ChatCompletionContentPart[]) => void;
    onMultimodalPaste?: (text: string, images: ChatCompletionContentPart[]) => void;
  },
): Promise<boolean> {
  const items = event.clipboardData?.items;
  if (!items) return false;

  let hasHandledContent = false;

  // First, check for text content that might be Tarko protocol
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.type === 'text/plain') {
      const text = await new Promise<string>((resolve) => {
        item.getAsString(resolve);
      });

      // Check if it's Tarko multimodal protocol
      if (isTarkoMultimodalProtocol(text)) {
        const parsed = parseTarkoMultimodalClipboard(text);
        if (parsed && callbacks.onMultimodalPaste) {
          callbacks.onMultimodalPaste(parsed.text, parsed.images);
          return true;
        }
      } else if (callbacks.onTextPaste) {
        // Regular text paste
        callbacks.onTextPaste(text);
        hasHandledContent = true;
      }
    }
  }

  // If no text or not Tarko protocol, check for images
  if (!hasHandledContent) {
    const images: ChatCompletionContentPart[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (!blob) continue;

        const imageData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        images.push({
          type: 'image_url',
          image_url: {
            url: imageData,
            detail: 'auto',
          },
        });
        hasHandledContent = true;
      }
    }

    if (images.length > 0 && callbacks.onImagePaste) {
      callbacks.onImagePaste(images);
    }
  }

  return hasHandledContent;
}
