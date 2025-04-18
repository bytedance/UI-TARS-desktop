/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GUIAgent } from '../src/GUIAgent';
import { Operator } from '../src/types';
import { Jimp } from 'jimp';
import { useContext } from '../src/context/useContext';
import { GUIAgentData, StatusEnum } from '../src';
import { IMAGE_PLACEHOLDER } from '@ui-tars/shared/constants';
import { UITarsModel } from '../src/Model';
import { mockOpenAIResponse } from './testKits/index';
import { DEFAULT_FACTORS } from '../src/constants';

const getContext = vi.fn();
vi.mock('openai', () => ({
  default: vi.fn(),
}));

const image = new Jimp({
  width: 1920,
  height: 1080,
  color: 0xffffffff,
});
class MockOperator extends Operator {
  screenshot = vi.fn().mockImplementation(async () => {
    const buffer = await image.getBuffer('image/png');

    return {
      base64: buffer.toString('base64'),
      width: 1920,
      height: 1080,
      scaleFactor: 1,
    };
  });

  execute = vi.fn().mockImplementation(async () => {
    getContext(useContext());
  });
}

describe('GUIAgent', () => {
  afterEach(() => {
    getContext.mockRestore();
  });
  it('normal run', async () => {
    mockOpenAIResponse([
      "Thought: Click on the search bar at the top of the screen\nAction: click(start_box='(72,646)')",
      'Thought: finished.\nAction: finished()',
    ]);
    const modelConfig = {
      baseURL: 'http://localhost:3000/v1',
      apiKey: 'test',
      model: 'ui-tars',
    };
    const operator = new MockOperator();

    const dataEvents: GUIAgentData[] = [];
    const onData = vi.fn().mockImplementation(({ data: newData }) => {
      dataEvents.push(newData);
    });
    const onError = vi.fn();

    const agent = new GUIAgent({
      model: modelConfig,
      operator,
      onData,
      onError,
    });

    await agent.run('click the button');

    expect(getContext.mock.calls[0][0]).toMatchObject({
      model: {
        modelConfig,
      },
    });

    expect(operator.execute).toBeCalledTimes(2);
    expect(operator.execute.mock.calls[0][0]).toEqual({
      factors: DEFAULT_FACTORS,
      parsedPrediction: {
        action_inputs: {
          start_box: '[0.072,0.646,0.072,0.646]',
          start_coords: [138.24, 697.68],
        },
        action_type: 'click',
        reflection: null,
        thought: 'Click on the search bar at the top of the screen',
      },
      prediction:
        "Thought: Click on the search bar at the top of the screen\nAction: click(start_box='(72,646)')",
      scaleFactor: 1,
      screenHeight: 1080,
      screenWidth: 1920,
    });

    expect(dataEvents).toEqual([
      expect.objectContaining({
        status: StatusEnum.RUNNING,
        conversations: [],
      }),
      expect.objectContaining({
        status: StatusEnum.RUNNING,
        conversations: [
          expect.objectContaining({
            from: 'human',
            value: IMAGE_PLACEHOLDER,
            screenshotBase64: (await image.getBuffer('image/png')).toString(
              'base64',
            ),
          }),
        ],
      }),
      expect.objectContaining({
        status: StatusEnum.RUNNING,
        conversations: [
          expect.objectContaining({
            from: 'gpt',
            value:
              "Thought: Click on the search bar at the top of the screen\nAction: click(start_box='(72,646)')",
          }),
        ],
      }),
      expect.objectContaining({
        status: StatusEnum.RUNNING,
        conversations: [
          expect.objectContaining({
            from: 'human',
            value: IMAGE_PLACEHOLDER,
            screenshotBase64: (await image.getBuffer('image/png')).toString(
              'base64',
            ),
          }),
        ],
      }),
      expect.objectContaining({
        status: StatusEnum.RUNNING,
        conversations: [
          expect.objectContaining({
            from: 'gpt',
            value: 'Thought: finished.\nAction: finished()',
          }),
        ],
      }),
      expect.objectContaining({
        status: StatusEnum.END,
        conversations: [],
      }),
    ]);

    expect(onError).not.toHaveBeenCalled();
  });

  it('custom UITarsModel run', async () => {
    const operator = new MockOperator();
    const getContextCustom = vi.fn();

    class CustomUITarsModel extends UITarsModel {
      constructor(modelConfig: { model: string }) {
        super(modelConfig);
      }
      protected override async invokeModelProvider() {
        getContextCustom(useContext());

        return {
          prediction: 'Thought: finished.\nAction: finished()',
        };
      }
    }

    const dataEvents: GUIAgentData[] = [];
    const onData = vi.fn().mockImplementation(({ data: newData }) => {
      dataEvents.push(newData);
    });
    const onError = vi.fn();
    const model = new CustomUITarsModel({
      model: 'ui-tars-sft',
    });

    const agent = new GUIAgent({
      model,
      operator,
      onData,
      onError,
    });

    await agent.run('click the button');

    expect(getContextCustom.mock.calls[0][0]).toMatchObject({
      model: {
        modelConfig: {
          model: 'ui-tars-sft',
        },
      },
    });

    expect(operator.execute).toHaveBeenCalled();

    expect(dataEvents).toEqual([
      expect.objectContaining({
        status: StatusEnum.RUNNING,
        modelName: 'ui-tars-sft',
        conversations: [],
      }),
      expect.objectContaining({
        status: StatusEnum.RUNNING,
        modelName: 'ui-tars-sft',
        conversations: [
          expect.objectContaining({
            from: 'human',
            value: IMAGE_PLACEHOLDER,
            screenshotBase64: (await image.getBuffer('image/png')).toString(
              'base64',
            ),
          }),
        ],
      }),
      expect.objectContaining({
        status: StatusEnum.RUNNING,
        conversations: [
          expect.objectContaining({
            from: 'gpt',
            value: 'Thought: finished.\nAction: finished()',
          }),
        ],
      }),
      expect.objectContaining({
        status: StatusEnum.END,
        conversations: [],
      }),
    ]);

    expect(onError).not.toHaveBeenCalled();
  });

  it('should handle abort correctly', async () => {
    const abortController = new AbortController();
    class MockAbortOperator extends Operator {
      screenshot = vi.fn().mockImplementation(async () => {
        abortController.abort();
        const buffer = await image.getBuffer('image/png');

        return {
          base64: buffer.toString('base64'),
          width: 1920,
          height: 1080,
          scaleFactor: 1,
        };
      });

      execute = vi.fn().mockImplementation(async () => {
        return;
      });
    }

    const promise: Promise<string> = new Promise((resolve) => {
      setTimeout(
        () =>
          resolve(
            "Thought: Click on the search bar\nAction: click(start_box='(72,646)')",
          ),
        10000,
      );
    });
    // mock 5s
    mockOpenAIResponse([promise]);

    const operator = new MockAbortOperator();
    const dataEvents: GUIAgentData[] = [];

    const onData = vi.fn().mockImplementation(({ data }) => {
      dataEvents.push(data);
    });
    const onError = vi.fn();

    const agent = new GUIAgent({
      model: {
        baseURL: 'http://localhost:3000/v1',
        apiKey: 'test',
        model: 'ui-tars',
      },
      operator,
      signal: abortController.signal,
      onData,
      onError,
    });

    await agent.run('click the button');

    expect(operator.screenshot).toBeCalledTimes(1);
    expect(operator.execute).toHaveBeenCalled();

    expect(dataEvents).toEqual([
      expect.objectContaining({
        status: StatusEnum.RUNNING,
        conversations: [],
      }),
      expect.objectContaining({
        status: StatusEnum.RUNNING,
        conversations: [
          expect.objectContaining({
            from: 'human',
            value: IMAGE_PLACEHOLDER,
            screenshotBase64: (await image.getBuffer('image/png')).toString(
              'base64',
            ),
          }),
        ],
      }),
      expect.objectContaining({
        conversations: [],
      }),
    ]);
  });

  it('Custom Action Spaces in Custom Operator', async () => {
    mockOpenAIResponse([
      "Thought: Click on the search bar at the top of the screen\nAction: CLICK(start_box='(72,646)')",
      'Thought: finished.\nAction: END()',
    ]);
    const modelConfig = {
      baseURL: 'http://localhost:3000/v1',
      apiKey: 'test',
      model: 'ui-tars',
    };
    class CustomActionSpacesOperator extends Operator {
      static MANUAL = {
        ACTION_SPACES: [
          `CLICK(start_box='[x1, y1, x2, y2]')`,
          `END() # Submit the task regardless of whether it succeeds or fails.`,
        ],
      };
      screenshot = vi.fn().mockImplementation(async () => {
        const buffer = await image.getBuffer('image/png');

        return {
          base64: buffer.toString('base64'),
          width: 1920,
          height: 1080,
          scaleFactor: 1,
        };
      });

      execute = vi.fn().mockImplementation(async (params) => {
        getContext(useContext());
        const { parsedPrediction } = params;
        if (parsedPrediction?.action_type === 'END') {
          return {
            status: StatusEnum.END,
          };
        }
      });
    }

    const operator = new CustomActionSpacesOperator();

    const dataEvents: GUIAgentData[] = [];
    const onData = vi.fn().mockImplementation(({ data: newData }) => {
      dataEvents.push(newData);
    });
    const onError = vi.fn();

    const agent = new GUIAgent({
      model: modelConfig,
      systemPrompt: `
      You are a helpful assistant.
      You can only use the following actions:
      ## Action Spaces
      ${CustomActionSpacesOperator.MANUAL.ACTION_SPACES.join('\n')}
      `,
      operator,
      onData,
      onError,
    });

    await agent.run('click the button');

    expect(getContext.mock.calls[0][0]).toMatchObject({
      model: {
        modelConfig,
      },
    });

    expect(operator.execute).toBeCalledTimes(2);
    expect(operator.execute.mock.calls[0][0]).toEqual({
      factors: DEFAULT_FACTORS,
      parsedPrediction: {
        action_inputs: {
          start_box: '[0.072,0.646,0.072,0.646]',
          start_coords: [138.24, 697.68],
        },
        action_type: 'CLICK',
        reflection: null,
        thought: 'Click on the search bar at the top of the screen',
      },
      prediction:
        "Thought: Click on the search bar at the top of the screen\nAction: CLICK(start_box='(72,646)')",
      scaleFactor: 1,
      screenHeight: 1080,
      screenWidth: 1920,
    });

    expect(dataEvents).toEqual([
      expect.objectContaining({
        status: StatusEnum.RUNNING,
        conversations: [],
      }),
      expect.objectContaining({
        status: StatusEnum.RUNNING,
        conversations: [
          expect.objectContaining({
            from: 'human',
            value: IMAGE_PLACEHOLDER,
            screenshotBase64: (await image.getBuffer('image/png')).toString(
              'base64',
            ),
          }),
        ],
      }),
      expect.objectContaining({
        status: StatusEnum.RUNNING,
        conversations: [
          expect.objectContaining({
            from: 'gpt',
            value:
              "Thought: Click on the search bar at the top of the screen\nAction: CLICK(start_box='(72,646)')",
          }),
        ],
      }),
      expect.objectContaining({
        status: StatusEnum.RUNNING,
        conversations: [
          expect.objectContaining({
            from: 'human',
            value: IMAGE_PLACEHOLDER,
            screenshotBase64: (await image.getBuffer('image/png')).toString(
              'base64',
            ),
          }),
        ],
      }),
      expect.objectContaining({
        status: StatusEnum.RUNNING,
        conversations: [
          expect.objectContaining({
            from: 'gpt',
            value: 'Thought: finished.\nAction: END()',
          }),
        ],
      }),
      expect.objectContaining({
        status: StatusEnum.END,
        conversations: [],
      }),
    ]);

    expect(onError).not.toHaveBeenCalled();
  });
});
