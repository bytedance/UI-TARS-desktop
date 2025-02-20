/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GUIAgent } from '../src/GUIAgent';
import OpenAI from 'openai';
import { Operator } from '../src/types';
import { Jimp } from 'jimp';
import { useContext } from '../src/context/useContext';
import { StatusEnum } from '../src';
import { IMAGE_PLACEHOLDER } from '@ui-tars/shared/constants';
import { UITarsModel } from '../src/Model';

const getContext = vi.fn();
vi.mock('openai', () => ({
  default: vi.fn(),
}));

function mockOpenAIResponse(responses: string | (string | Promise<string>)[]) {
  const responseArray = Array.isArray(responses) ? responses : [responses];

  const mockCreate = vi.fn();

  responseArray.forEach((response) => {
    mockCreate.mockImplementationOnce(async (params, options) => {
      const checkAbort = () => {
        if (options?.signal?.aborted) {
          const error = new Error('Request aborted');
          error.name = 'AbortError';
          throw error;
        }
      };

      const result = {
        choices: [
          {
            message: {
              content:
                typeof response === 'string'
                  ? response
                  : await Promise.race([
                      response,
                      // 创建一个 Promise 来监听 abort 事件
                      new Promise((_, reject) => {
                        console.log(
                          'options?.signal?.aborted',
                          options?.signal?.aborted,
                        );
                        if (options?.signal?.aborted) {
                          reject(new Error('Request aborted'));
                        }
                        options?.signal?.addEventListener(
                          'abort',
                          () => {
                            reject(new Error('Request aborted'));
                          },
                          { once: true },
                        );
                      }),
                    ]),
            },
          },
        ],
      };
      checkAbort();
      return Promise.resolve(result);
    });
  });

  vi.mocked(OpenAI).mockReturnValue({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  } as unknown as OpenAI);
}

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
    let data = {
      conversations: [],
    };
    const onData = vi.fn().mockImplementation(({ data: newData }) => {
      data = {
        ...data,
        ...newData,
        conversations: [...data.conversations, ...newData.conversations],
      };
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

    expect(operator.execute).toBeCalledTimes(1);
    expect(operator.execute.mock.calls[0][0]).toEqual({
      parsedPrediction: {
        action_inputs: {
          start_box: '[0.072,0.646,0.072,0.646]',
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

    expect(data.conversations).toEqual([
      expect.objectContaining({
        from: 'human',
        value: IMAGE_PLACEHOLDER,
        screenshotBase64: (await image.getBuffer('image/png')).toString(
          'base64',
        ),
      }),
      expect.objectContaining({
        from: 'gpt',
        value:
          "Thought: Click on the search bar at the top of the screen\nAction: click(start_box='(72,646)')",
      }),
      expect.objectContaining({
        from: 'human',
        value: IMAGE_PLACEHOLDER,
        screenshotBase64: (await image.getBuffer('image/png')).toString(
          'base64',
        ),
      }),
      expect.objectContaining({
        from: 'gpt',
        value: 'Thought: finished.\nAction: finished()',
      }),
    ]);
    // @ts-ignore
    expect(data.status!).toEqual(StatusEnum.END);
    expect(onData.mock.calls[0][0]).toEqual({
      data: expect.objectContaining({
        status: StatusEnum.RUNNING,
        modelName: 'ui-tars',
      }),
    });
    expect(onData.mock.calls[1][0]).toEqual({
      data: expect.objectContaining({
        status: StatusEnum.RUNNING,
      }),
    });
    expect(onData.mock.calls[2][0]).toEqual({
      data: expect.objectContaining({
        status: StatusEnum.RUNNING,
      }),
    });
    expect(onData.mock.calls[3][0]).toEqual({
      data: expect.objectContaining({
        status: StatusEnum.RUNNING,
      }),
    });
    expect(onData.mock.calls[4][0]).toEqual({
      data: expect.objectContaining({
        status: StatusEnum.END,
      }),
    });

    expect(onError).not.toHaveBeenCalled();
  });

  it('custom UITarsModel run', async () => {
    mockOpenAIResponse(['Thought: finished.\nAction: finished()']);
    const operator = new MockOperator();
    const getContextCustom = vi.fn();

    class CustomUITarsModel extends UITarsModel {
      constructor(modelConfig: { model: string }) {
        super(modelConfig);
      }
      async invoke(params: any) {
        getContextCustom(useContext());
        const prediction = await Promise.resolve('finished.');
        return {
          prediction,
          parsedPredictions: [
            {
              action_type: 'finished',
              action_inputs: {},
              reflection: null,
              thought: 'finished.',
            },
          ],
        };
      }
    }
    let data = {
      conversations: [],
    };
    const onData = vi.fn().mockImplementation(({ data: newData }) => {
      data = {
        ...data,
        ...newData,
        conversations: [...data.conversations, ...newData.conversations],
      };
    });
    const onError = vi.fn();

    const agent = new GUIAgent({
      model: new CustomUITarsModel({
        model: 'ui-tars-sft',
      }),
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

    expect(operator.execute).not.toHaveBeenCalled();

    expect(data.conversations).toEqual([
      expect.objectContaining({
        from: 'human',
        value: IMAGE_PLACEHOLDER,
        screenshotBase64: (await image.getBuffer('image/png')).toString(
          'base64',
        ),
      }),
      expect.objectContaining({
        from: 'gpt',
        value: 'finished.',
      }),
    ]);
    // @ts-ignore
    expect(data.status!).toEqual(StatusEnum.END);
    expect(onData.mock.calls[0][0]).toEqual({
      data: expect.objectContaining({
        status: StatusEnum.RUNNING,
        modelName: 'ui-tars-sft',
      }),
    });
    expect(onData.mock.calls[1][0]).toEqual({
      data: expect.objectContaining({
        status: StatusEnum.RUNNING,
      }),
    });
    expect(onData.mock.calls[1][0]).toEqual({
      data: expect.objectContaining({
        status: StatusEnum.RUNNING,
      }),
    });

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
    let data = {
      conversations: [],
    };
    const onData = vi.fn().mockImplementation(({ data: newData }) => {
      data = {
        ...data,
        ...newData,
        conversations: [...data.conversations, ...newData.conversations],
      };
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
    expect(operator.execute).not.toHaveBeenCalled();
  });
});
