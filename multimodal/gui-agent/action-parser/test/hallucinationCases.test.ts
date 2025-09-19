/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { DefaultActionParser } from '../src/DefaultActionParser';

const actionParser = new DefaultActionParser();

describe('DefaultActionParser for hallucination cases', () => {
  it(`should handle input without 'Action:'`, () => {
    const input = 'click(start_box="(100,200)")';
    const result = actionParser.parsePrediction(input);

    expect(result).toEqual({
      actions: [
        {
          type: 'click',
          inputs: {
            point: {
              raw: {
                x: 100,
                y: 200,
              },
              referenceBox: {
                x1: 100,
                y1: 200,
                x2: 100,
                y2: 200,
              },
            },
          },
        },
      ],
      rawActionStrings: [`click(start_box="(100,200)")`],
      rawContent: `click(start_box="(100,200)")`,
      reasoningContent: undefined,
    });
  });

  it('should NOT handle input without coordinates', () => {
    expect(
      actionParser.parsePrediction(
        `Thought: I need to click on this element
Action: click(start_box='')`,
      ),
    ).toEqual({
      actions: [],
      rawContent: `Thought: I need to click on this element
Action: click(start_box='')`,
      errorMessage: 'The required parameters of start_box of click action is empty',
    });
  });

  it('should handle with Chinese colon (1)', () => {
    const input = `Thought: I need to click this button
Action：click(start_box='(100,200)')`;

    const result = actionParser.parsePrediction(input);

    expect(result).toEqual({
      actions: [
        {
          type: 'click',
          inputs: {
            point: {
              raw: {
                x: 100,
                y: 200,
              },
              referenceBox: {
                x1: 100,
                y1: 200,
                x2: 100,
                y2: 200,
              },
            },
          },
        },
      ],
      rawActionStrings: [`click(start_box='(100,200)')`],
      reasoningContent: 'I need to click this button',
      rawContent: `Thought: I need to click this button
Action：click(start_box='(100,200)')`,
      errorMessage: undefined,
    });
  });

  it('should handle with Chinese colon (2)', () => {
    const input = `\n\nAction：click(start_box='<bbox>191 21 191 21</bbox>')`;

    const result = actionParser.parsePrediction(input);

    expect(result).toEqual({
      actions: [
        {
          type: 'click',
          inputs: {
            point: {
              raw: {
                x: 191,
                y: 21,
              },
              referenceBox: {
                x1: 191,
                y1: 21,
                x2: 191,
                y2: 21,
              },
            },
          },
        },
      ],
      rawActionStrings: [`click(start_box='<bbox>191 21 191 21</bbox>')`],
      reasoningContent: undefined,
      rawContent: `\n\nAction：click(start_box='<bbox>191 21 191 21</bbox>')`,
      errorMessage: undefined,
    });
  });

  it('should NOT handle empty action input', () => {
    const input = 'Thought: Empty action\nAction:';
    const result = actionParser.parsePrediction(input);

    expect(result).toEqual({
      actions: [],
      rawContent: `Thought: Empty action\nAction:`,
      errorMessage: 'There is no GUI action detected',
    });
  });
});
