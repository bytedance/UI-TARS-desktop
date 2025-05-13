/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { OpenAI } from 'openai';
import { TokenJS } from '@multimodal/llm-client';
import {
  ActualModelProviderName,
  AgentReasoningOptions,
  LLMRequest,
  ModelProvider,
  ModelProviderName,
  ModelProviderServingConfig,
} from '../types';
import { getLogger } from '../utils/logger';

const logger = getLogger('ModelProvider');

interface ModelProviderDefaultConfig extends ModelProviderServingConfig {
  /**
   * Provider name
   */
  name: ModelProviderName;
  /**
   * Actual provider.
   */
  actual: ActualModelProviderName;
}

/**
 * FIXME: support `volcengine` provider natively
 */

const MODEL_PROVIDER_DEFAULT_CONFIGS: ModelProviderDefaultConfig[] = [
  {
    name: 'ollama',
    actual: 'openai',
    baseURL: 'http://127.0.0.1:11434/v1',
    apiKey: 'ollama',
  },
  {
    name: 'lm-studio',
    actual: 'openai',
    baseURL: 'http://127.0.0.1:1234/v1',
    apiKey: 'lm-studio',
  },
  {
    name: 'volcengine',
    actual: 'openai',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  },
];

const IGNORE_EXTENDED_PRIVIDERS = ['openrouter', 'openai-compatible', 'azure-openai'];

export function getNormalizedModelProvider(modelProvider: ModelProvider): ModelProvider {
  const defaultConfig = MODEL_PROVIDER_DEFAULT_CONFIGS.find(
    (config) => config.name === modelProvider.name,
  );
  if (modelProvider) {
    return {
      baseURL: defaultConfig?.baseURL,
      apiKey: defaultConfig?.apiKey,
      ...modelProvider,
      name: defaultConfig?.actual ?? modelProvider.name,
    };
  }
  return modelProvider;
}

/**
 * Get LLM Client by model providers setting and expected provider and model to use.
 *
 * @param modelProviders current model providers
 * @param usingModel model expected to use.
 * @param usingProvider provider expected to use.
 * @param reasoningOptions reasoning options
 * @param requestInterceptor optional request interceptor
 * @returns OpenAI-compatible client
 */
export function getLLMClient(
  modelProviders: ModelProvider[],
  usingModel: string,
  usingProvider: string,
  reasoningOptions: AgentReasoningOptions,
  requestInterceptor?: (provider: string, request: LLMRequest, baseURL?: string) => any,
) {
  /**
   * Find model provider.
   */
  let modelProvider: ModelProvider | undefined;

  if (usingProvider) {
    modelProvider = modelProviders.find((provder) => provder.name === usingProvider);
  } else {
    modelProvider = modelProviders.find((provder) => {
      return provder.models.some((model) => model.id === usingModel);
    });
  }

  if (!modelProvider) {
    logger.error(
      `Cannot find model provider "${usingProvider}" that contains model: ${usingModel}`,
    );
    throw new Error(
      `Cannot find model provider "${usingProvider}" that contains model: ${usingModel}.`,
    );
  }

  /**
   * Set default config for some extended model provider.
   */
  logger.info(`Original model provider: ${JSON.stringify(modelProvider)}`);
  modelProvider = getNormalizedModelProvider(modelProvider);
  logger.info(`Normalized model provider: ${JSON.stringify(modelProvider)}`);
  logger.info(`Model base url: ${modelProvider?.baseURL}`);

  const client = new TokenJS({
    apiKey: modelProvider?.apiKey,
    baseURL: modelProvider?.baseURL,
  });

  if (!IGNORE_EXTENDED_PRIVIDERS.includes(modelProvider.name)) {
    for (const model of modelProvider.models) {
      logger.info(`Extending model list with: ${model.id}`);
      // @ts-expect-error FIXME: support custom provider.
      client.extendModelList(modelProvider.name, model.id, {
        streaming: true,
        json: true,
        toolCalls: true,
        images: true,
      });
    }
  }

  // FIXME: remove as
  // Considering that Token.js is not completely aligned with OpenAI and there are some type issues,
  // in order to decouple the upper and lower layers, we created a duck type to let the outer layer
  // know that this is the OpenAI Client. We need to consider a more reasonable solution later.
  return {
    chat: {
      completions: {
        async create(arg: any) {
          logger.infoWithData('Creating chat completion with args:', arg);

          // Prepare the request payload with all necessary information
          const requestPayload: LLMRequest = {
            // Normalized provider name is the internal implementation,
            // we only expose the public provider name instead.
            provider: usingProvider,
            thinking: reasoningOptions,
            ...arg,
          };

          // Apply request interceptor if provided
          const finalRequest = requestInterceptor
            ? requestInterceptor(modelProvider.name, requestPayload, modelProvider?.baseURL)
            : requestPayload;

          const res = await client.chat.completions.create({
            ...finalRequest,
            provider: modelProvider.name,
          });

          return res;
        },
      },
    },
  } as unknown as OpenAI;
}
