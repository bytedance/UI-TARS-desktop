/**
 * The following code is modified based on
 * https://github.com/token-js/token.js/blob/main/src/handlers/openrouter.ts
 *
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

import OpenAI from 'openai';

import { OpenRouterModel, ProviderCompletionParams } from '../chat/index.js';
import { CompletionResponse, StreamCompletionResponse } from '../userTypes/index.js';
import { BaseHandler } from './base.js';
import { InputError } from './types.js';

// Groq is very compatible with OpenAI's API, so we could likely reuse the OpenAI SDK for this handler
// to reducee the bundle size.
export class OpenRouterHandler extends BaseHandler<OpenRouterModel> {
  validateInputs(body: ProviderCompletionParams<'openrouter'>): void {
    super.validateInputs(body);
  }

  async create(
    body: ProviderCompletionParams<'openrouter'>,
  ): Promise<CompletionResponse | StreamCompletionResponse> {
    this.validateInputs(body);

    console.log('open router');

    const apiKey = this.opts.apiKey ?? process.env.OPENROUTER_API_KEY;
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'docs.tokenjs.ai',
        'X-Title': 'Token.js',
      },
    });

    if (apiKey === undefined) {
      throw new InputError(
        'API key is required for OpenRouter, define OPENROUTER_API_KEY in your environment or specifty the apiKey option.',
      );
    }

    return client.chat.completions.create(body);
  }
}
