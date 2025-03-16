/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/helper.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import {
  type ProviderConfig,
  LLMProviderEnum,
  AgentNameEnum,
} from '../context';
import { AzureChatOpenAI } from '@langchain/openai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { createLogger } from '../utils';

const logger = createLogger('agent_helper');

// create a chat model based on the agent name, the model name and provider
export function createChatModel(
  agentName: string,
  providerName: LLMProviderEnum,
  providerConfig: ProviderConfig,
  modelName: string,
): BaseChatModel {
  const maxTokens = 2000;
  const maxCompletionTokens = 5000;
  let temperature = 0;
  const topP = 0.001;
  switch (providerName) {
    case LLMProviderEnum.AzureOpenAI: {
      if (agentName === AgentNameEnum.Planner) {
        temperature = 0.02;
      }
      const args: any = {
        model: modelName,
        apiKey: providerConfig.apiKey,
        configuration: {},
      };
      if (providerConfig.baseUrl) {
        args.configuration = {
          baseURL: providerConfig.baseUrl,
        };
      }

      // O series models have different parameters
      if (modelName.startsWith('o')) {
        args.modelKwargs = {
          max_completion_tokens: maxCompletionTokens,
        };
      } else {
        args.topP = topP;
        args.temperature = temperature;
        args.maxTokens = maxTokens;
      }
      logger.info('azure args', args);
      return new AzureChatOpenAI(args);
    }
    default: {
      throw new Error(`Provider ${providerName} not supported yet`);
    }
  }
}
