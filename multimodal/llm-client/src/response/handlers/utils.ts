import { models } from '../../models';
import { ConfigOptions } from '../../userTypes';
import { BaseHandler } from './base';
import { OpenAIResponseHandler } from './openai';
import { LLMChatModel, LLMProvider } from '../../chat/index.js';

export const Handlers: Record<string, (opts: ConfigOptions) => BaseHandler<LLMChatModel>> = {
  ['openai']: (opts: ConfigOptions) =>
    new OpenAIResponseHandler(opts, models.openai.models, models.openai.supportResponseApi),
};

export const getHandler = (
  provider: LLMProvider,
  opts: ConfigOptions,
): BaseHandler<LLMChatModel> => {
  for (const handlerKey in Handlers) {
    if (provider === handlerKey) {
      return Handlers[handlerKey](opts);
    }
  }

  throw new Error(
    `Could not find provider for model. Are you sure the model name is correct and the provider is supported?`,
  );
};
