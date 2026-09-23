/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ChatCompletionContentPart,
  ChatCompletionContentPartImage,
} from '@tarko/agent-interface';
import { ImageCompressor, formatBytes } from '@tarko/shared-media-utils';

/**
 * ImageProcessor - Handles image compression and processing for agent queries
 *
 * Features:
 * - Compresses base64 images to reduce token usage
 * - Maintains image quality while optimizing size
 * - Provides compression statistics
 */
export class ImageProcessor {
  private compressor: ImageCompressor;
  private readonly options: { quality: number; format: 'webp' | 'jpeg' | 'png' };

  constructor(options: { quality?: number; format?: 'webp' | 'jpeg' | 'png' } = {}) {
    // Resolved once here so the compression statistics report what this instance
    // actually runs with, rather than a copy of the compressor's own defaults.
    this.options = {
      quality: options.quality ?? 5,
      format: options.format ?? 'webp',
    };
    this.compressor = new ImageCompressor(this.options);
  }

  /**
   * Compress images in query content if present
   * @param query - The query content that may contain images
   * @returns Processed query with compressed images
   */
  async compressImagesInQuery(
    query: string | ChatCompletionContentPart[],
  ): Promise<string | ChatCompletionContentPart[]> {
    try {
      // Handle different query formats
      if (typeof query === 'string') {
        return query; // Text only, no compression needed
      }

      // Handle array of content parts (multimodal format)
      if (Array.isArray(query)) {
        const compressedQuery = await Promise.all(
          query.map(async (part: ChatCompletionContentPart) => {
            if (part.type === 'image_url' && part.image_url?.url) {
              return await this.compressImageUrl(part);
            }
            return part;
          }),
        );
        return compressedQuery;
      }

      return query;
    } catch (error) {
      console.error('Error compressing images in query:', error);
      // Return original query if compression fails
      return query;
    }
  }

  /**
   * Compress a single image URL
   * @param imagePart - Content part containing image URL
   * @returns Compressed image content part
   */
  async compressImageUrl(
    imagePart: ChatCompletionContentPartImage,
  ): Promise<ChatCompletionContentPartImage> {
    try {
      const imageUrl = imagePart.image_url.url;

      // Skip if not a base64 image
      if (!imageUrl.startsWith('data:image/')) {
        return imagePart;
      }

      // Extract base64 data
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
      const originalBuffer = Buffer.from(base64Data, 'base64');
      const originalSize = originalBuffer.length;

      // Compress the image
      const compressedBuffer = await this.compressor.compressToBuffer(originalBuffer);
      const compressedSize = compressedBuffer.length;

      // Convert compressed buffer to base64
      const compressedBase64 = `data:image/webp;base64,${compressedBuffer.toString('base64')}`;

      // Log compression stats
      const compressionRatio = originalSize / compressedSize;
      const compressionPercentage = ((1 - compressedSize / originalSize) * 100).toFixed(2);

      console.log('Image compression stats:', {
        original: formatBytes(originalSize),
        compressed: formatBytes(compressedSize),
        ratio: `${compressionRatio.toFixed(2)}x (${compressionPercentage}% smaller)`,
        format: this.options.format,
        quality: this.options.quality,
      });

      return {
        ...imagePart,
        image_url: {
          url: compressedBase64,
        },
      };
    } catch (error) {
      console.error('Error compressing individual image:', error);
      // Return original image part if compression fails
      return imagePart;
    }
  }
}
