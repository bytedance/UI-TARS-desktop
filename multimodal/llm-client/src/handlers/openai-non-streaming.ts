/**
 * This handler is designed to work with OpenAI models that don't natively support streaming,
 * but exposes a streaming interface to maintain API compatibility with streaming handlers.
 */

import OpenAI from 'openai';
import { ChatCompletion } from 'openai/resources';

import { OpenAIModel, ProviderCompletionParams } from '../chat/index.js';
import { CompletionResponse, StreamCompletionResponse } from '../userTypes/index.js';
import { BaseHandler } from './base.js';

/**
 * Creates a synthetic stream from a non-streaming response
 * This allows applications to use a unified streaming interface
 * even when the underlying model doesn't support streaming
 */
async function* createSyntheticStream(response: ChatCompletion): StreamCompletionResponse {
  // First chunk with role information
  yield {
    id: response.id,
    object: 'chat.completion.chunk',
    created: response.created,
    model: response.model,
    choices: [
      {
        index: 0,
        delta: { role: 'assistant' },
        finish_reason: null,
        logprobs: null,
      },
    ],
    usage: undefined,
  };

  // For each choice in the response
  for (const choice of response.choices) {
    const content = choice.message.content;

    // If there's content, yield it as a content delta
    if (content) {
      yield {
        id: response.id,
        object: 'chat.completion.chunk',
        created: response.created,
        model: response.model,
        choices: [
          {
            index: choice.index,
            delta: { content },
            finish_reason: null,
            logprobs: null,
          },
        ],
        usage: undefined,
      };
    }

    // If there are tool calls, yield each one
    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        yield {
          id: response.id,
          object: 'chat.completion.chunk',
          created: response.created,
          model: response.model,
          choices: [
            {
              index: choice.index,
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: toolCall.id,
                    type: toolCall.type,
                    function: toolCall.function,
                  },
                ],
              },
              finish_reason: null,
              logprobs: null,
            },
          ],
          usage: undefined,
        };
      }
    }

    // Final chunk with finish reason
    yield {
      id: response.id,
      object: 'chat.completion.chunk',
      created: response.created,
      model: response.model,
      choices: [
        {
          index: choice.index,
          delta: {},
          finish_reason: choice.finish_reason,
          logprobs: null,
        },
      ],
      usage: response.usage,
    };
  }
}

export class OpenAINonStreamingHandler extends BaseHandler<OpenAIModel> {
  async create(
    body: ProviderCompletionParams<'openai'>,
  ): Promise<CompletionResponse | StreamCompletionResponse> {
    this.validateInputs(body);

    // Uses the OPENAI_API_KEY environment variable if not provided
    const apiKey = this.opts.apiKey ?? process.env.OPENAI_API_KEY;
    const openai = new OpenAI({
      ...this.opts,
      apiKey,
    });

    // We have to delete the provider field because it's not a valid parameter for the OpenAI API
    const params = { ...body };
    delete (params as any).provider;

    // If streaming is requested, make a non-streaming call and convert to synthetic stream
    if (body.stream) {
      const nonStreamingParams = { ...params, stream: false };
      const response = await openai.chat.completions.create(nonStreamingParams);
      return createSyntheticStream(response as unknown as ChatCompletion);
    } else {
      // For non-streaming requests, just pass through
      return openai.chat.completions.create(params);
    }
  }
}
