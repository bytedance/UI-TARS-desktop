// /packages/sdk/src/utils.test.ts
/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import {
  parseBoxToScreenCoords,
  processVlmParams,
  toVlmModelFormat,
} from './utils';
import { DEFAULT_FACTORS } from './constants';
import { IMAGE_PLACEHOLDER, MAX_IMAGE_LENGTH } from '@ui-tars/shared/constants';

describe('parseBoxToScreenCoords', () => {
  it('should correctly parse single point coordinates', () => {
    const result = parseBoxToScreenCoords({
      boxStr: '[0.5,0.5]',
      screenWidth: 1000,
      screenHeight: 800,
      factors: DEFAULT_FACTORS,
    });
    expect(result).toEqual({
      x: Math.round(0.5 * 1000 * DEFAULT_FACTORS[0]) / DEFAULT_FACTORS[0],
      y: Math.round(0.5 * 800 * DEFAULT_FACTORS[1]) / DEFAULT_FACTORS[1],
    });
  });

  it('should correctly parse single point coordinates by default factors', () => {
    const result = parseBoxToScreenCoords({
      boxStr: '[0.5,0.5]',
      screenWidth: 1000,
      screenHeight: 800,
    });
    expect(result).toEqual({
      x: Math.round(0.5 * 1000 * DEFAULT_FACTORS[0]) / DEFAULT_FACTORS[0],
      y: Math.round(0.5 * 800 * DEFAULT_FACTORS[1]) / DEFAULT_FACTORS[1],
    });
  });

  it('should correctly parse box coordinates', () => {
    const result = parseBoxToScreenCoords({
      boxStr: '[0.2,0.3,0.4,0.5]',
      screenWidth: 1000,
      screenHeight: 800,
      factors: DEFAULT_FACTORS,
    });
    expect(result).toEqual({
      x: Math.round(0.3 * 1000 * DEFAULT_FACTORS[0]) / DEFAULT_FACTORS[0], // (0.2 + 0.4) / 2 = 0.3
      y: Math.round(0.4 * 800 * DEFAULT_FACTORS[1]) / DEFAULT_FACTORS[1], // (0.3 + 0.5) / 2 = 0.4
    });
  });

  it('should handle whitespace in input string', () => {
    const result = parseBoxToScreenCoords({
      boxStr: '[ 0.5 , 0.5 ]',
      screenWidth: 1000,
      screenHeight: 800,
      factors: DEFAULT_FACTORS,
    });
    expect(result).toEqual({
      x: Math.round(0.5 * 1000 * DEFAULT_FACTORS[0]) / DEFAULT_FACTORS[0],
      y: Math.round(0.5 * 800 * DEFAULT_FACTORS[1]) / DEFAULT_FACTORS[1],
    });
  });

  it('should handle integer coordinates', () => {
    const result = parseBoxToScreenCoords({
      boxStr: '[1,1,2,2]',
      screenWidth: 1000,
      screenHeight: 800,
      factors: DEFAULT_FACTORS,
    });
    expect(result).toEqual({
      x: Math.round(1.5 * 1000 * DEFAULT_FACTORS[0]) / DEFAULT_FACTORS[0],
      y: Math.round(1.5 * 800 * DEFAULT_FACTORS[1]) / DEFAULT_FACTORS[1],
    });
  });

  it('should handle empty box string', () => {
    const result = parseBoxToScreenCoords({
      boxStr: '',
      screenWidth: 1000,
      screenHeight: 800,
      factors: DEFAULT_FACTORS,
    });
    expect(result).toEqual({
      x: null,
      y: null,
    });
  });
});

describe('processVlmParams', () => {
  it('should correctly process vlm params', () => {
    const result = processVlmParams(
      [
        {
          from: 'human',
          value: 'system prompt',
        },
        {
          from: 'human',
          value: IMAGE_PLACEHOLDER,
        },
      ],
      ['data:image/png;base64,image_1'],
      MAX_IMAGE_LENGTH,
    );
    expect(result).toEqual({
      conversations: [
        {
          from: 'human',
          value: 'system prompt',
        },
        {
          from: 'human',
          value: IMAGE_PLACEHOLDER,
        },
      ],
      images: ['data:image/png;base64,image_1'],
    });
  });

  it('should correctly process vlm params with max image length', () => {
    const result = processVlmParams(
      [
        {
          from: 'human',
          value: 'system prompt',
        },
        {
          from: 'human',
          value: IMAGE_PLACEHOLDER,
        },
        {
          from: 'gpt',
          value: 'assistant response',
        },
        {
          from: 'human',
          value: IMAGE_PLACEHOLDER,
        },
        {
          from: 'gpt',
          value: 'assistant response',
        },
        {
          from: 'human',
          value: IMAGE_PLACEHOLDER,
        },
      ],
      [
        'data:image/png;base64,image_1',
        'data:image/png;base64,image_2',
        'data:image/png;base64,image_3',
      ],
      2,
    );
    expect(result).toEqual({
      conversations: [
        {
          from: 'human',
          value: 'system prompt',
        },
        {
          from: 'gpt',
          value: 'assistant response',
        },
        {
          from: 'human',
          value: IMAGE_PLACEHOLDER,
        },
        {
          from: 'gpt',
          value: 'assistant response',
        },
        {
          from: 'human',
          value: IMAGE_PLACEHOLDER,
        },
      ],
      images: [
        'data:image/png;base64,image_2',
        'data:image/png;base64,image_3',
      ],
    });
  });
});

describe('toVlmModelFormat', () => {
  it('should correctly convert to vlm model format normal', () => {
    const result = toVlmModelFormat({
      historyMessages: [
        {
          from: 'human',
          value: '12345-0',
        },
        {
          from: 'gpt',
          value: '67890-0',
        },
        {
          from: 'human',
          value: '12345-1',
        },
        {
          from: 'gpt',
          value: '67890-1',
        },
      ],
      conversations: [
        {
          from: 'human',
          value: 'user-instruction',
        },
      ],
      systemPrompt: `You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task.

## Output Examples
Thought: Write your thoughts here in English, your thinking style should follow the Thought Examples above...

Action: click(point='<point>10 20</point>')

## User Instruction
`,
    });
    expect(result).toEqual({
      conversations: [
        {
          from: 'human',
          value: `You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task.

## Output Examples
Thought: Write your thoughts here in English, your thinking style should follow the Thought Examples above...

Action: click(point='<point>10 20</point>')

## History Messages
human: 12345-0
assistant: 67890-0
human: 12345-1
assistant: 67890-1

## User Instruction
user-instruction`,
        },
      ],
      images: [],
    });
  });

  it('should correctly convert to vlm model format no \\n', () => {
    const result = toVlmModelFormat({
      historyMessages: [
        {
          from: 'human',
          value: '12345-0',
        },
        {
          from: 'gpt',
          value: '67890-0',
        },
        {
          from: 'human',
          value: '12345-1',
        },
        {
          from: 'gpt',
          value: '67890-1',
        },
      ],
      conversations: [
        {
          from: 'human',
          value: 'user-instruction',
        },
      ],
      systemPrompt: `You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task.

## Output Examples
Thought: Write your thoughts here in English, your thinking style should follow the Thought Examples above...

Action: click(point='<point>10 20</point>')

## User Instruction`,
    });
    expect(result).toEqual({
      conversations: [
        {
          from: 'human',
          value: `You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task.

## Output Examples
Thought: Write your thoughts here in English, your thinking style should follow the Thought Examples above...

Action: click(point='<point>10 20</point>')

## History Messages
human: 12345-0
assistant: 67890-0
human: 12345-1
assistant: 67890-1

## User Instruction
user-instruction`,
        },
      ],
      images: [],
    });
  });

  it('should correctly convert to vlm model format no instruction title', () => {
    const result = toVlmModelFormat({
      historyMessages: [
        {
          from: 'human',
          value: '12345-0',
        },
        {
          from: 'gpt',
          value: '67890-0',
        },
        {
          from: 'human',
          value: '12345-1',
        },
        {
          from: 'gpt',
          value: '67890-1',
        },
      ],
      conversations: [
        {
          from: 'human',
          value: 'user-instruction',
        },
      ],
      systemPrompt: `You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task.

## Output Examples
Thought: Write your thoughts here in English, your thinking style should follow the Thought Examples above...

Action: click(point='<point>10 20</point>')
`,
    });
    expect(result).toEqual({
      conversations: [
        {
          from: 'human',
          value: `You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task.

## Output Examples
Thought: Write your thoughts here in English, your thinking style should follow the Thought Examples above...

Action: click(point='<point>10 20</point>')

## History Messages
human: 12345-0
assistant: 67890-0
human: 12345-1
assistant: 67890-1

## User Instruction
user-instruction`,
        },
      ],
      images: [],
    });
  });
});
