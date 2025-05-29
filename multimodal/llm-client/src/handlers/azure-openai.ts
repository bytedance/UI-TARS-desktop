/* eslint-disable @typescript-eslint/no-explicit-any */
import { OpenAI, AzureOpenAI } from 'openai';
import { Stream } from 'openai/streaming';

import { AzureOpenAIModel, ProviderCompletionParams } from '../chat/index.js';
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

export class AzureOpenAIHandler extends BaseHandler<AzureOpenAIModel> {
  async create(
    body: ProviderCompletionParams<'azure-openai'>,
  ): Promise<CompletionResponse | StreamCompletionResponse> {
    this.validateInputs(body);

    // Azure OpenAI requires apiVersion and endpoint

    const apiVersion = this.opts.azure?.apiVersion || '2024-10-01-preview';
    const endpoint = this.opts.azure?.endpoint ?? this.opts.baseURL;

    if (!endpoint) {
      throw new InputError('Azure OpenAI endpoint is required.');
    }

    // Support for Azure AD authentication using token provider
    const azureADTokenProvider = this.opts.azure?.azureADTokenProvider;

    // Support for API key authentication
    const apiKey = this.opts.apiKey ?? process.env.AZURE_OPENAI_API_KEY;

    if (!apiKey && !azureADTokenProvider) {
      throw new InputError(
        'Either an API key or an Azure AD token provider must be provided for Azure OpenAI',
      );
    }

    const azureOpenAI = new AzureOpenAI({
      apiKey,
      azureADTokenProvider,
      apiVersion,
      endpoint,
    });

    // We have to delete the provider field because it's not a valid parameter for the OpenAI API.
    const params: any = body;
    delete params.provider;

    if (body.stream) {
      const stream = await azureOpenAI.chat.completions.create(body);
      return streamOpenAI(stream);
    } else {
      return azureOpenAI.chat.completions.create(body);
    }
  }
}
