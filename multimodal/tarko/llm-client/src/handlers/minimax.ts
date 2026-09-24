/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';

import { MiniMaxModel, ProviderCompletionParams } from '../chat/index.js';
import { CompletionResponse, StreamCompletionResponse } from '../userTypes/index.js';
import { BaseHandler } from './base.js';
import { InputError } from './types.js';

export class MiniMaxHandler extends BaseHandler<MiniMaxModel> {
  validateInputs(body: ProviderCompletionParams<'minimax'>): void {
    super.validateInputs(body);

    if (body.temperature !== undefined && body.temperature !== null) {
      if (body.temperature <= 0 || body.temperature > 1) {
        throw new InputError(
          `MiniMax requires temperature to be in the range (0.0, 1.0]. Got: ${body.temperature}`,
        );
      }
    }
  }

  async create(
    body: ProviderCompletionParams<'minimax'>,
  ): Promise<CompletionResponse | StreamCompletionResponse> {
    this.validateInputs(body);

    const apiKey = this.opts.apiKey ?? process.env.MINIMAX_API_KEY;
    if (apiKey === undefined) {
      throw new InputError(
        'API key is required for MiniMax, define MINIMAX_API_KEY in your environment or specify the apiKey option.',
      );
    }

    const client = new OpenAI({
      apiKey,
      baseURL: this.opts.baseURL || 'https://api.minimax.io/v1',
      defaultHeaders: this.opts.defaultHeaders,
    });

    // Default temperature to 1.0 if not provided (MiniMax does not accept 0)
    const params = {
      ...body,
      temperature: body.temperature ?? 1.0,
    };

    return client.chat.completions.create(params);
  }
}
