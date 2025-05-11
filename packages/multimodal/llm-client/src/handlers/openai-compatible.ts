/**
 * The following code is modified based on
 * https://github.com/token-js/token.js/blob/main/src/handlers/openai-compatible.ts
 *
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

import OpenAI from 'openai';
import { Stream } from 'openai/streaming';

import {
  CompletionParams,
  OpenAICompatibleModel,
  ProviderCompletionParams,
} from '../chat/index.js';
import { CompletionResponse, StreamCompletionResponse } from '../userTypes/index.js';
import { BaseHandler } from './base.js';
import { InputError } from './types.js';

async function* streamOpenAI(
  response: Stream<OpenAI.Chat.Completions.ChatCompletionChunk>,
): StreamCompletionResponse {
  for await (const chunk of response) {
    yield chunk;
  }
}

// To support a new provider, we just create a handler for them extending the BaseHandler class and implement the create method.
// Then we update the Handlers object in src/handlers/utils.ts to include the new handler.
export class OpenAICompatibleHandler extends BaseHandler<OpenAICompatibleModel> {
  protected validateInputs(body: CompletionParams): void {
    super.validateInputs(body);

    if (!this.opts.baseURL) {
      throw new InputError(
        'No baseURL option provided for openai compatible provider. You must define a baseURL option to use a generic openai compatible API with Token.js',
      );
    }
  }

  determineAPIKey = () => {
    if (this.opts.apiKey) {
      return this.opts.apiKey;
    } else if (process.env.OPENAI_COMPATIBLE_API_KEY) {
      return process.env.OPENAI_COMPATIBLE_API_KEY;
    } else {
      /**
       * We hardcode an empty API key if none is defined because the OpenAI SDK throws an error if we do not do this.
       * There are plenty of reasonable cases where an API is not required by an openai compartible model provider (locally
       * hosted models for example), so we want to avoid runtime errors in those situations.
       * See this issue for an example: https://github.com/twinnydotdev/twinny/issues/440
       *
       * However, the tradeoff with this is that if the underlying provider requires an API key and the user does not provide one,
       * they may get an unpredictable error. We deem this tradeoff acceptible in this case because using an unvetted openai-compatible
       * model provider is inherently less safe than using a provider officially integrated and supported by Token.js. If users often,
       * report errors related to this, we should consider officially supporting the behavior of the underlying provider that is causing issues.
       *
       * For example, we may want to officially support ollama local models if users often report problems related to using that provider via this
       * generic implementation.
       */
      return '';
    }
  };

  async create(
    body: ProviderCompletionParams<'openai'>,
  ): Promise<CompletionResponse | StreamCompletionResponse> {
    this.validateInputs(body);

    // Uses the OPENAI_API_KEY environment variable, if the apiKey is not provided.
    // This makes the UX better for switching between providers because you can just
    // define all the environment variables and then change the model field without doing anything else.
    const apiKey = this.determineAPIKey();
    const openai = new OpenAI({
      ...this.opts,
      apiKey,
    });

    // We have to delete the provider field because it's not a valid parameter for the OpenAI API.
    const params: any = body;
    delete params.provider;

    if (body.stream) {
      const stream = await openai.chat.completions.create(body);
      return streamOpenAI(stream);
    } else {
      return openai.chat.completions.create(body);
    }
  }
}
