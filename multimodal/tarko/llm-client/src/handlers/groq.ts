/**
 * The following code is modified based on
 * https://github.com/token-js/token.js/blob/main/src/handlers/groq.ts
 *
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

import OpenAI from 'openai';

import { GroqModel, ProviderCompletionParams } from '../chat/index.js';
import { CompletionResponse, StreamCompletionResponse } from '../userTypes/index.js';
import { BaseHandler } from './base.js';
import { InputError } from './types.js';

// Groq is very compatible with OpenAI's API, so we could likely reuse the OpenAI SDK for this handler
// to reducee the bundle size.
export class GroqHandler extends BaseHandler<GroqModel> {
  validateInputs(body: ProviderCompletionParams<'groq'>): void {
    super.validateInputs(body);

    if (body.response_format?.type === 'json_object') {
      if (body.stream) {
        throw new InputError(
          `Groq does not support streaming when the 'response_format' is 'json_object'.`,
        );
      }

      if (body.stop !== null && body.stop !== undefined) {
        throw new InputError(
          `Groq does not support the 'stop' parameter when the 'response_format' is 'json_object'.`,
        );
      }
    }
  }

  async create(
    body: ProviderCompletionParams<'groq'>,
  ): Promise<CompletionResponse | StreamCompletionResponse> {
    this.validateInputs(body);

    const apiKey = this.opts.apiKey ?? process.env.GROQ_API_KEY;
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    if (apiKey === undefined) {
      throw new InputError(
        'API key is required for Groq, define GROQ_API_KEY in your environment or specifty the apiKey option.',
      );
    }

    return client.chat.completions.create(body);
  }
}
