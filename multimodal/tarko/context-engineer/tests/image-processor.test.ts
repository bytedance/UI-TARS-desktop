/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { ImageCompressor, formatBytes } from '@tarko/shared-media-utils';
import { ImageProcessor } from '../src/node/image-processor';
import type { ChatCompletionContentPartImage } from '@tarko/agent-interface';

/** 1x1 transparent PNG */
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const COMPRESSED = Buffer.from('compressed-image-bytes');
const ORIGINAL = Buffer.from(PNG_BASE64, 'base64');

function imagePart(url: string): ChatCompletionContentPartImage {
  return { type: 'image_url', image_url: { url } };
}

function pngPart() {
  return imagePart(`data:image/png;base64,${PNG_BASE64}`);
}

describe('ImageProcessor', () => {
  let stats: Array<Record<string, unknown>>;
  let compressSpy: MockInstance;

  beforeEach(() => {
    stats = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      if (args[0] === 'Image compression stats:') {
        stats.push(args[1] as Record<string, unknown>);
      }
    });
    compressSpy = vi
      .spyOn(ImageCompressor.prototype, 'compressToBuffer')
      .mockResolvedValue(COMPRESSED);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('compression statistics', () => {
    it('reports the quality the processor was constructed with', async () => {
      const processor = new ImageProcessor({ quality: 5, format: 'webp' });
      await processor.compressImageUrl(pngPart());

      expect(stats).toHaveLength(1);
      expect(stats[0].quality).toBe(5);
    });

    it('reports the default quality when constructed without options', async () => {
      const processor = new ImageProcessor();
      await processor.compressImageUrl(pngPart());

      expect(stats[0].quality).toBe(5);
    });

    it('reports the configured format instead of a fixed one', async () => {
      const processor = new ImageProcessor({ quality: 90, format: 'png' });
      await processor.compressImageUrl(pngPart());

      expect(stats[0].format).toBe('png');
      expect(stats[0].quality).toBe(90);
    });

    it('keeps the byte sizes measured from the real buffers', async () => {
      const processor = new ImageProcessor({ quality: 5, format: 'webp' });
      await processor.compressImageUrl(pngPart());

      expect(stats[0].original).toBe(formatBytes(ORIGINAL.length));
      expect(stats[0].compressed).toBe(formatBytes(COMPRESSED.length));
    });

    it('logs one stats line per image in a query', async () => {
      const processor = new ImageProcessor({ quality: 5, format: 'webp' });
      await processor.compressImagesInQuery([pngPart(), pngPart()]);

      expect(stats).toHaveLength(2);
      expect(compressSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('fallbacks', () => {
    it('returns the original part when compression fails', async () => {
      compressSpy.mockRejectedValue(new Error('cwebp is not available'));
      const processor = new ImageProcessor({ quality: 5, format: 'webp' });
      const part = pngPart();

      await expect(processor.compressImageUrl(part)).resolves.toEqual(part);
      expect(stats).toHaveLength(0);
    });

    it('leaves URLs that are not base64 data URIs alone', async () => {
      const processor = new ImageProcessor({ quality: 5, format: 'webp' });
      const part = imagePart('https://example.com/screenshot.png');

      await expect(processor.compressImageUrl(part)).resolves.toEqual(part);
      expect(compressSpy).not.toHaveBeenCalled();
      expect(stats).toHaveLength(0);
    });
  });
});
