/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { preprocessResizeImage } from './image';

describe('preprocessResizeImage', () => {
  const MAX_PIXELS = 512 * 28 * 28;
  // Testing util for creating a base64 image
  async function createTestImage(
    width: number,
    height: number,
  ): Promise<string> {
    const buffer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();
    return buffer.toString('base64');
  }

  it('should resize image when pixel count exceeds limit', async () => {
    // Create a large image (1000x1000 = 1,000,000 pixels)
    const largeImage = await createTestImage(1000, 1000);
    const result = await preprocessResizeImage(largeImage, MAX_PIXELS);

    // Verify processed image dimensions
    const resultBuffer = Buffer.from(result, 'base64');
    const metadata = await sharp(resultBuffer).metadata();

    // Calculate maximum allowed pixels (512 * 28 * 28 = 401,408)
    const processedPixels = metadata.width! * metadata.height!;

    expect(processedPixels).toBeLessThanOrEqual(MAX_PIXELS);
  });

  it('should not resize small images', async () => {
    // Create a small image (100x100 = 10,000 pixels)
    const smallImage = await createTestImage(100, 100);
    const result = await preprocessResizeImage(smallImage, MAX_PIXELS);

    // Verify processed image dimensions
    const resultBuffer = Buffer.from(result, 'base64');
    const metadata = await sharp(resultBuffer).metadata();

    expect(metadata.width).toBe(100);
    expect(metadata.height).toBe(100);
  });

  it('should throw error when processing invalid image', async () => {
    const invalidBase64 = 'invalid_base64_string';

    await expect(
      preprocessResizeImage(invalidBase64, MAX_PIXELS),
    ).rejects.toThrow();
  });
});
