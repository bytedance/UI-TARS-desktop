/*
 * Copyright (C) 2025 Bytedance Ltd. and/or its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { describe, expect, it } from 'vitest';

import {
  IMAGE_PLACEHOLDER,
  MAX_IMAGE_LENGTH,
} from '@ui-tars/desktop-shared/constants/vlm';
import type { Message } from '@ui-tars/desktop-shared/types';

import { convertToOpenAIMessages, processVlmParams } from './utils';

describe('processVlmParams', () => {
  it('round 1', () => {
    const images = ['img1'];
    const conversations: Message[] = [
      { from: 'human', value: 'SP+打开 Chrome 浏览器' },
      { from: 'human', value: IMAGE_PLACEHOLDER },
    ];

    const result = processVlmParams({ conversations, images });

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

    const result = processVlmParams({ conversations, images });

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

    const result = processVlmParams({ conversations, images });

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

    const result = processVlmParams({ conversations, images });

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
