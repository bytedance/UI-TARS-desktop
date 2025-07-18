import { ConfigOptions } from '../../userTypes';
import { LLMChatModel } from '../../chat';
import {
  ResponseApiParams,
  ResponseNonStreamingReturnType,
  ResponseStreamingReturnType,
} from '../index';

export abstract class BaseHandler<T extends LLMChatModel> {
  opts: ConfigOptions;
  protected models: readonly T[] | boolean;
  protected supportResponseApi: boolean;

  constructor(opts: ConfigOptions, models: readonly T[] | boolean, supportResponseApi: boolean) {
    this.opts = opts;
    this.models = models;
    this.supportResponseApi = supportResponseApi;
  }
  abstract create(
    params: ResponseApiParams,
  ): Promise<ResponseStreamingReturnType | ResponseNonStreamingReturnType>;

  abstract delete(responseId: string): Promise<void>;
}
