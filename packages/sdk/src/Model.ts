/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import OpenAI, { type ClientOptions } from 'openai';
import { ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions';
import { actionParser } from '@ui-tars/action-parser';

import { useContext } from './context/useContext';
import { Model, type InvokeParams, type InvokeOutput } from './types';

import { preprocessResizeImage, convertToOpenAIMessages } from './utils';
import { FACTOR, MAX_PIXELS } from './constants';

type OpenAIChatCompletionCreateParams = Omit<ClientOptions, 'maxRetries'> &
  Pick<
    ChatCompletionCreateParamsBase,
    'model' | 'max_tokens' | 'temperature' | 'top_p'
  >;

export interface UITarsModelConfig extends OpenAIChatCompletionCreateParams {}

export class UITarsModel extends Model {
  constructor(private readonly modelConfig: UITarsModelConfig) {
    super();
    this.modelConfig = modelConfig;
  }

  get factor(): number {
    return FACTOR;
  }

  get modelName(): string {
    return this.modelConfig.model ?? 'unknown';
  }

  async invoke(params: InvokeParams): Promise<InvokeOutput> {
    const { conversations, images } = params;
    const { logger, signal } = useContext();
    const {
      baseURL,
      apiKey,
      model,
      max_tokens = 1000,
      temperature = 0,
      top_p = 0.7,
      ...restOptions
    } = this.modelConfig;

    const compressedImages = await Promise.all(
      images.map((image) => preprocessResizeImage(image, MAX_PIXELS)),
    );

    const messages = convertToOpenAIMessages({
      conversations,
      images: compressedImages,
    });

    const openai = new OpenAI({
      ...restOptions,
      maxRetries: 0,
      baseURL,
      apiKey,
    });

    const startTime = Date.now();
    const result = await openai.chat.completions
      .create(
        {
          model,
          messages,
          stream: false,
          seed: null,
          stop: null,
          frequency_penalty: null,
          presence_penalty: null,
          // custom options
          max_tokens,
          temperature,
          top_p,
        },
        {
          signal,
        },
      )
      .finally(() => {
        logger?.info(`[UITarsModel cost]: ${Date.now() - startTime}ms`);
      });

    if (!result.choices[0].message.content) {
      const err = new Error();
      err.name = 'vlm response error';
      err.stack = JSON.stringify(result) ?? 'no message';
      logger?.error(err);
      throw err;
    }

    const prediction = result.choices[0].message.content;

    const data = {
      prediction,
      factor: FACTOR,
    };
    try {
      const { parsed: parsedPredictions } = await actionParser(data);
      return {
        prediction,
        parsedPredictions,
      };
    } catch (error) {
      logger?.error('[UITarsModel] error', error);
      return {
        prediction,
        parsedPredictions: [],
      };
    }
  }
}
