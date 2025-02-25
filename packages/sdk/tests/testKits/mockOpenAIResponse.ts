import { vi } from 'vitest';
import OpenAI from 'openai';

export function mockOpenAIResponse(
  responses: string | (string | Promise<string>)[],
) {
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
