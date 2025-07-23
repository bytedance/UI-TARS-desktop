/**
 * The following code is modified based on
 * https://github.com/token-js/token.js/blob/main/src/handlers/openai.ts
 *
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

import OpenAI from 'openai';

import { BaseHandler } from './base.js';
import { OpenAIModel } from '../../chat/index.js';
import {
  ResponseApiParams,
  ResponseStreamingReturnType,
  ResponseNonStreamingReturnType,
} from '../index.js';

// To support a new provider, we just create a handler for them extending the BaseHandler class and implement the create method.
// Then we update the Handlers object in src/handlers/utils.ts to include the new handler.
export class OpenAIResponseHandler extends BaseHandler<OpenAIModel> {
  async create(
    body: ResponseApiParams,
  ): Promise<ResponseStreamingReturnType | ResponseNonStreamingReturnType> {
    // this.validateInputs(body);

    // Uses the OPENAI_API_KEY environment variable, if the apiKey is not provided.
    // This makes the UX better for switching between providers because you can just
    // define all the environment variables and then change the model field without doing anything else.
    const apiKey = this.opts.apiKey ?? process.env.OPENAI_API_KEY;
    const openai = new OpenAI({
      ...this.opts,
      apiKey,
    });

    const params: any = body;
    delete params.provider;

    return openai.responses.create(body);
  }

  async delete(responseId: string): Promise<void> {
    const apiKey = this.opts.apiKey ?? process.env.OPENAI_API_KEY;
    const openai = new OpenAI({
      ...this.opts,
      apiKey,
    });

    return openai.responses.delete(responseId);
  }
}
