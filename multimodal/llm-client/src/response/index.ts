/**
 * The following code is modified based on
 * https://github.com/token-js/token.js/blob/main/src/chat/index.ts
 *
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */
import { ResponseCreateParams } from 'openai/resources/responses/responses.js';
import { ConfigOptions } from '../userTypes/index.js';
import { LLMProvider, ProviderModelMap } from '../chat/index.js';
import { getHandler } from './handlers/utils.js';
import { Responses } from 'openai/resources/index';
import { Stream } from 'openai/streaming';

type ResponseApiBaseParams<P extends LLMProvider> = Pick<
  ResponseCreateParams,
  | 'temperature'
  | 'top_p'
  | 'input'
  | 'tools'
  | 'tool_choice'
  | 'previous_response_id'
  | 'max_output_tokens'
> & {
  provider: P;
  model: ProviderModelMap[P];
};

export type ResponseApiStreamingParams<P extends LLMProvider> = ResponseApiBaseParams<P> & {
  stream: true;
};

export type ResponseApiNonStreamingParams<P extends LLMProvider> = ResponseApiBaseParams<P> & {
  stream?: false | null;
};

export type ResponseApiParams = {
  [P in LLMProvider]: ResponseApiStreamingParams<P> | ResponseApiNonStreamingParams<P>;
}[LLMProvider];

export type ResponseReturnType = ReturnType<Responses['create']>;
export type ResponseStreamingReturnType = Stream<Responses.ResponseStreamEvent>;
export type ResponseNonStreamingReturnType = Responses.Response;

export class LLMResponse {
  private opts: ConfigOptions;

  constructor(opts: ConfigOptions) {
    this.opts = opts;
  }

  create<P extends LLMProvider>(
    body: ResponseApiNonStreamingParams<P>,
  ): Promise<ResponseNonStreamingReturnType>;
  create<P extends LLMProvider>(
    body: ResponseApiStreamingParams<P>,
  ): Promise<ResponseStreamingReturnType>;
  create<P extends LLMProvider>(
    body: ResponseApiBaseParams<P>,
  ): Promise<ResponseNonStreamingReturnType | ResponseStreamingReturnType>;
  create(
    body: ResponseApiParams,
  ): Promise<ResponseNonStreamingReturnType | ResponseStreamingReturnType> {
    const handler = getHandler(body.provider, this.opts);
    return handler.create(body);
  }

  delete(repsonseId: string) {
    const handler = getHandler('openai', this.opts);
    return handler.delete(repsonseId);
  }
}
