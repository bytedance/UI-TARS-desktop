/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import { IMAGE_PLACEHOLDER, MAX_IMAGE_LENGTH } from '@ui-tars/shared/constants';
import type { Message } from '@ui-tars/shared/types';

import {
  convertToOpenAIMessages,
  processVlmParams,
  preprocessResizeImage,
} from '../src/utils';
import { Jimp } from 'jimp';

describe('processVlmParams', () => {
  it('round 1', () => {
    const images = ['img1'];
    const conversations: Message[] = [
      { from: 'human', value: 'SP+打开 Chrome 浏览器' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
    ];

    const result = processVlmParams(conversations, images);

    expect(result.images.length).toBe(1);
    expect(result.conversations).toEqual(conversations);
  });

  it('round 2', () => {
    const images = ['img1', 'img2'];
    const conversations: Message[] = [
      { from: 'human', value: 'SP+打开 Chrome 浏览器' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      {
        from: 'gpt',
        value:
          "双击桌面上的“Google Chrome”图标以打开浏览器，图标是圆形的，外圈是红色、黄色、绿色组成的圆环，内圈是一个蓝色的圆形。\nAction: left_double(start_box='(23,245)')",
      },
      { from: 'human', value: IMAGE_PLACEHOLDER },
    ];

    const result = processVlmParams(conversations, images);

    expect(result.images.length).toBe(2);
    expect(result.conversations).toEqual(conversations);
  });

  it(`round ${MAX_IMAGE_LENGTH}`, () => {
    const images = ['img1', 'img2', 'img3', 'img4', 'img5'];
    const conversations: Message[] = [
      { from: 'human', value: 'SP+打开 Chrome 浏览器' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      {
        from: 'gpt',
        value:
          "双击桌面上的“Google Chrome”图标以打开浏览器，图标是圆形的，外圈是红色、黄色、绿色组成的圆环，内圈是一个蓝色的圆形。\nAction: left_double(start_box='(23,245)')",
      },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      { from: 'gpt', value: 'Summary_2' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      { from: 'gpt', value: 'Summary_3' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      { from: 'gpt', value: 'Summary_4' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
    ];

    const result = processVlmParams(conversations, images);

    expect(result.images.length).toBe(MAX_IMAGE_LENGTH);
    expect(result.conversations).toEqual(conversations);
  });

  it(`round ${MAX_IMAGE_LENGTH + 1}`, () => {
    const images = ['img1', 'img2', 'img3', 'img4', 'img5', 'img6'];
    const conversations: Message[] = [
      { from: 'human', value: 'SP+打开 Chrome 浏览器' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      {
        from: 'gpt',
        value:
          "双击桌面上的“Google Chrome”图标以打开浏览器，图标是圆形的，外圈是红色、黄色、绿色组成的圆环，内圈是一个蓝色的圆形。\nAction: left_double(start_box='(23,245)')",
      },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      { from: 'gpt', value: 'Summary_2' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      { from: 'gpt', value: 'Summary_3' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      { from: 'gpt', value: 'Summary_4' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      { from: 'gpt', value: 'Summary_5' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
    ];

    const result = processVlmParams(conversations, images);

    expect(result.images.length).toBe(MAX_IMAGE_LENGTH);
    expect(result.conversations).toEqual([
      { from: 'human', value: 'SP+打开 Chrome 浏览器' },
      {
        from: 'gpt',
        value:
          "双击桌面上的“Google Chrome”图标以打开浏览器，图标是圆形的，外圈是红色、黄色、绿色组成的圆环，内圈是一个蓝色的圆形。\nAction: left_double(start_box='(23,245)')",
      },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      { from: 'gpt', value: 'Summary_2' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      { from: 'gpt', value: 'Summary_3' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      { from: 'gpt', value: 'Summary_4' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      { from: 'gpt', value: 'Summary_5' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
    ]);
  });
});

describe('convertToOpenAIMessages', () => {
  it('1 round', () => {
    const conversations: Message[] = [
      { from: 'human', value: 'SP+打开 Chrome 浏览器' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
    ];
    const images = ['base64'];

    const result = convertToOpenAIMessages({ conversations, images });

    expect(result).toEqual([
      {
        role: 'user',
        content: 'SP+打开 Chrome 浏览器',
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,base64' },
          },
        ],
      },
    ]);
  });

  it('2 round', () => {
    const conversations: Message[] = [
      { from: 'human', value: 'SP+打开 Chrome 浏览器' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      {
        from: 'gpt',
        value:
          "双击桌面上的“Google Chrome”图标以打开浏览器，图标是圆形的，外圈是红色、黄色、绿色组成的圆环，内圈是一个蓝色的圆形。\nAction: left_double(start_box='(23,245)')",
      },
      { from: 'human', value: IMAGE_PLACEHOLDER },
    ];
    const images = ['base64', 'base64_2'];

    const result = convertToOpenAIMessages({ conversations, images });

    expect(result).toEqual([
      {
        role: 'user',
        content: 'SP+打开 Chrome 浏览器',
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,base64' },
          },
        ],
      },
      {
        role: 'assistant',
        content:
          "双击桌面上的“Google Chrome”图标以打开浏览器，图标是圆形的，外圈是红色、黄色、绿色组成的圆环，内圈是一个蓝色的圆形。\nAction: left_double(start_box='(23,245)')",
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,base64_2' },
          },
        ],
      },
    ]);
  });

  it('3 round', () => {
    const conversations: Message[] = [
      { from: 'human', value: 'SP+打开 Chrome 浏览器' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      {
        from: 'gpt',
        value:
          "双击桌面上的“Google Chrome”图标以打开浏览器，图标是圆形的，外圈是红色、黄色、绿色组成的圆环，内圈是一个蓝色的圆形。\nAction: left_double(start_box='(23,245)')",
      },
      { from: 'human', value: IMAGE_PLACEHOLDER },
      { from: 'gpt', value: 'Summary_2' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
    ];
    const images = ['base64', 'base64_2', 'base64_3'];

    const result = convertToOpenAIMessages({ conversations, images });

    expect(result).toEqual([
      {
        role: 'user',
        content: 'SP+打开 Chrome 浏览器',
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,base64' },
          },
        ],
      },
      {
        role: 'assistant',
        content:
          "双击桌面上的“Google Chrome”图标以打开浏览器，图标是圆形的，外圈是红色、黄色、绿色组成的圆环，内圈是一个蓝色的圆形。\nAction: left_double(start_box='(23,245)')",
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,base64_2' },
          },
        ],
      },
      {
        role: 'assistant',
        content: 'Summary_2',
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,base64_3' },
          },
        ],
      },
    ]);
  });
});

describe('preprocessResizeImage', () => {
  const MAX_PIXELS = 512 * 28 * 28;
  // Testing util for creating a base64 image
  async function createTestImage(
    width: number,
    height: number,
  ): Promise<string> {
    const image = new Jimp({
      width,
      height,
      color: 0xff0000ff,
    }); // 创建红色图片
    const buffer = await image.getBuffer('image/png');
    return buffer.toString('base64');
  }

  it('should resize image when pixel count exceeds limit', async () => {
    // Create a large image (1000x1000 = 1,000,000 pixels)
    const largeImage = await createTestImage(1000, 1000);
    const result = await preprocessResizeImage(largeImage, MAX_PIXELS);

    // Verify processed image dimensions
    const resultBuffer = Buffer.from(result, 'base64');
    const { width, height } = await Jimp.read(resultBuffer);

    // Calculate maximum allowed pixels (512 * 28 * 28 = 401,408)
    const processedPixels = width! * height!;

    expect(processedPixels).toBeLessThanOrEqual(MAX_PIXELS);
  });

  it('should not resize small images', async () => {
    // Create a small image (100x100 = 10,000 pixels)
    const smallImage = await createTestImage(100, 100);
    const result = await preprocessResizeImage(smallImage, MAX_PIXELS);
    // Verify processed image dimensions
    const resultBuffer = Buffer.from(result, 'base64');
    const { width, height } = await Jimp.fromBuffer(resultBuffer);

    expect(width).toBe(100);
    expect(height).toBe(100);
  });

  it('should throw error when processing invalid image', async () => {
    const invalidBase64 = 'invalid_base64_string';

    await expect(
      preprocessResizeImage(invalidBase64, MAX_PIXELS),
    ).rejects.toThrow();
  });
});
