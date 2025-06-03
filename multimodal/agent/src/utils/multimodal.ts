/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ChatCompletionContentPart,
  MultimodalToolCallResult,
  ToolCallResult,
} from '@multimodal/agent-interface';
import { getLogger } from './logger';

const logger = getLogger('Multimodal');

/**
 * Try to extract image data from an object
 *
 * @param obj The object to check for image data
 * @returns The image data info if found, null otherwise
 */
function extractImageData(obj: any): { data: string; mimeType: string } | null {
  // Object explicitly defines image type
  if (obj.type && obj.data && typeof obj.data === 'string') {
    // If object itself indicates image type
    if (obj.type.includes('screenshot') || obj.type.includes('image')) {
      // If object specifies mime type
      if (obj.mimeType && typeof obj.mimeType === 'string') {
        return { data: obj.data, mimeType: obj.mimeType };
      }

      // Try to detect format from type field
      if (obj.type.includes('png')) {
        return { data: obj.data, mimeType: 'image/png' };
      } else if (obj.type.includes('jpg') || obj.type.includes('jpeg')) {
        return { data: obj.data, mimeType: 'image/jpeg' };
      } else if (obj.type.includes('gif')) {
        return { data: obj.data, mimeType: 'image/gif' };
      } else if (obj.type.includes('webp')) {
        return { data: obj.data, mimeType: 'image/webp' };
      }

      // Default to PNG if we can't determine from type
      return { data: obj.data, mimeType: 'image/png' };
    }
  }

  // Detect by common base64 image patterns
  if (obj.data && typeof obj.data === 'string') {
    const data = obj.data.trim();
    // Check if it looks like valid base64 data
    if (data.match(/^[A-Za-z0-9+/=]+$/)) {
      if (data.startsWith('iVBOR')) {
        // PNG signature
        return { data, mimeType: 'image/png' };
      } else if (data.startsWith('/9j/')) {
        // JPEG signature
        return { data, mimeType: 'image/jpeg' };
      } else if (data.startsWith('R0lGOD')) {
        // GIF signature
        return { data, mimeType: 'image/gif' };
      } else if (data.startsWith('UklGR')) {
        // WEBP signature
        return { data, mimeType: 'image/webp' };
      } else {
        // Generic base64, but still looks valid
        // Default to PNG as a fallback
        return { data, mimeType: 'image/png' };
      }
    }
  }

  return null;
}

/**
 * Convert a ToolCallResult to MultimodalToolCallResult
 *
 * This function transforms the original tool call result into a multimodal format
 * that can be processed by LLMs supporting multimodal inputs.
 *
 * Handled cases:
 * - String content: Converted to text type content part
 * - Array content:
 *   - Arrays containing objects with image data: Extracts images and preserves other data
 *   - Arrays of primitive values or objects without images: Stringified and converted to text
 * - Object content with image data: Extracts image data and adds as image_url type
 *   - Supports common image formats (PNG, JPEG, GIF, WEBP)
 *   - Detects image data through explicit type declarations or base64 signatures
 *   - Preserves non-image data from the object as additional text content
 * - Plain objects without image data: Stringified and converted to text type
 * - Null/undefined values: Converted to empty string
 *
 * Not handled cases:
 * - Nested multimodal content beyond one level (images in nested objects beyond first level)
 * - Binary image formats that aren't base64 encoded
 * - SVG or other vector image formats
 * - Video, audio or other non-image media types
 * - Complex hierarchical data structures that might benefit from custom formatting
 *
 * Error handling:
 * - Image processing errors default back to text representation
 * - Any unexpected errors during conversion result in an error message text
 *
 * @param toolCallResult The original tool call result
 * @returns The multimodal version of the tool call result containing text and/or image content parts
 */
export function convertToMultimodalToolCallResult(
  toolCallResult: ToolCallResult,
): MultimodalToolCallResult {
  const { toolCallId, toolName, content } = toolCallResult;
  const contentParts: ChatCompletionContentPart[] = [];

  try {
    // Handle string content
    if (typeof content === 'string') {
      contentParts.push({
        type: 'text',
        text: content,
      });
    }
    // Handle array content
    else if (Array.isArray(content)) {
      // Check if the array contains objects with image data
      let hasImageInArray = false;
      const processedContent = [];

      for (const item of content) {
        // Only process object elements in the array, skip other types
        if (typeof item === 'object' && item !== null) {
          const imageInfo = extractImageData(item);

          if (imageInfo) {
            hasImageInArray = true;
            // Add image part
            const imageSize = imageInfo.data.length;
            logger.debug(`Converting image data (size: ${imageSize} bytes) to image_url format`);

            contentParts.push({
              type: 'image_url',
              image_url: { url: `data:${imageInfo.mimeType};base64,${imageInfo.data}` },
            });

            // Extract other data from the object
            const remainingContent = { ...item };
            delete remainingContent.data;
            delete remainingContent.type;
            delete remainingContent.mimeType;

            // Keep other properties in processed content
            if (Object.keys(remainingContent).length > 0) {
              processedContent.push(remainingContent);
            }
          } else {
            // No image in object, keep complete object
            processedContent.push(item);
          }
        } else {
          // Non-object elements are preserved directly
          processedContent.push(item);
        }
      }

      // If there are processed content items, add them as text
      if (processedContent.length > 0) {
        contentParts.push({
          type: 'text',
          text: JSON.stringify(processedContent, null, 2),
        });
      }

      // If no image was found in the array, fall back to the original content
      if (!hasImageInArray && contentParts.length === 0) {
        contentParts.push({
          type: 'text',
          text: JSON.stringify(content, null, 2),
        });
      }
    }
    // Handle object content
    else if (typeof content === 'object' && content !== null) {
      // Check if the object contains image data
      const imageInfo = extractImageData(content);

      if (imageInfo) {
        try {
          // Add the image part with proper mime type
          logger.debug(
            `Found image data (${imageInfo.mimeType}) of size: ${imageInfo.data.length} bytes`,
          );

          contentParts.push({
            type: 'image_url',
            image_url: { url: `data:${imageInfo.mimeType};base64,${imageInfo.data}` },
          });

          // Add remaining data as text if there's more content besides the image data
          const remainingContent = { ...content };
          // Remove image-related properties
          delete remainingContent.data;
          delete remainingContent.type;
          delete remainingContent.mimeType;

          // Only stringify and add remaining content if it's not empty
          if (Object.keys(remainingContent).length > 0) {
            contentParts.push({
              type: 'text',
              text: JSON.stringify(remainingContent, null, 2),
            });
          }
        } catch (error) {
          logger.warn(`Failed to process image data: ${error}`);
          // If there's an error with the image data, fall back to text representation
          contentParts.push({
            type: 'text',
            text: JSON.stringify(content, null, 2),
          });
        }
      } else {
        // If no image data, convert the entire object to a text string
        contentParts.push({
          type: 'text',
          text: JSON.stringify(content, null, 2),
        });
      }
    }
    // Handle null, undefined or other types
    else {
      contentParts.push({
        type: 'text',
        text: String(content),
      });
    }

    // Ensure we have at least one content part
    if (contentParts.length === 0) {
      contentParts.push({
        type: 'text',
        text: '',
      });
    }

    // 记录创建了多少个内容部分，但不输出具体内容
    logger.debug(`Created ${contentParts.length} content parts for tool call result`);
  } catch (error) {
    // Fallback for any unexpected errors
    logger.error(`Error in convertToMultimodalToolCallResult: ${error}`);
    contentParts.push({
      type: 'text',
      text: `Error processing content: ${String(error)}`,
    });
  }

  return {
    toolCallId,
    toolName,
    content: contentParts,
  };
}
