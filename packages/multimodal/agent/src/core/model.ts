/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { OpenAI } from 'openai';
import { TokenJS } from 'token.js';
import {
  ActualModelProviderName,
  ModelProvider,
  ModelProviderName,
  ModelProviderServingConfig,
} from '../types';

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
    baseURL: 'https://ark-cn-beijing.bytedance.net/api/v3',
  },
];

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

export function getLLMClient(
  modelProviders: ModelProvider[],
  usingModel: string,
  usingProvider: string,
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
    throw new Error(
      `Cannot find model provider "${usingProvider}" that contains model: ${usingModel}.`,
    );
  }

  /**
   * Set default config for some extended model provider.
   */
  console.log(`🤖 Origibal model provider: ${JSON.stringify(modelProvider)}`);
  modelProvider = getNormalizedModelProvider(modelProvider);
  console.log(`🤖 Normalized model provider: ${JSON.stringify(modelProvider)}`);

  const client = new TokenJS({
    apiKey: modelProvider?.apiKey,
    baseURL: modelProvider?.baseURL,
  });

  for (const model of modelProvider.models) {
    // @ts-expect-error FIXME: support custom provider.
    client.extendModelList(modelProvider.name, model.id, {
      streaming: true,
      json: true,
      toolCalls: true,
      images: true,
    });
  }

  // FIXME: remove as
  // Considering that Token.js is not completely aligned with OpenAI and there are some type issues,
  // in order to decouple the upper and lower layers, we created a duck type to let the outer layer
  // know that this is the OpenAI Client. We need to consider a more reasonable solution later.
  return {
    chat: {
      completions: {
        async create(arg: any) {
          const res = await client.chat.completions.create({
            provider: modelProvider.name,
            ...arg,
          });
          console.log('res', res);

          return res;
        },
      },
    },
  } as unknown as OpenAI;
}
