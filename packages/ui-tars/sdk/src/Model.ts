/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import OpenAI, { type ClientOptions } from 'openai';
import {
  type ChatCompletionCreateParamsNonStreaming,
  type ChatCompletionCreateParamsBase,
  type ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import { actionParser } from '@ui-tars/action-parser';

import { useContext } from './context/useContext';
import { Model, type InvokeParams, type InvokeOutput } from './types';

import { preprocessResizeImage, convertToOpenAIMessages } from './utils';
import { DEFAULT_FACTORS } from './constants';
import {
  UITarsModelVersion,
  MAX_PIXELS_V1_0,
  MAX_PIXELS_V1_5,
  MAX_PIXELS_DOUBAO,
} from '@ui-tars/shared/types';

type OpenAIChatCompletionCreateParams = Omit<ClientOptions, 'maxRetries'> &
  Pick<
    ChatCompletionCreateParamsBase,
    'model' | 'max_tokens' | 'temperature' | 'top_p'
  >;

export interface UITarsModelConfig extends OpenAIChatCompletionCreateParams {}

export interface ThinkingVisionProModelConfig
  extends ChatCompletionCreateParamsNonStreaming {
  thinking?: {
    type: 'enabled' | 'disabled';
  };
}

export class UITarsModel extends Model {
  constructor(protected readonly modelConfig: UITarsModelConfig) {
    super();
    this.modelConfig = modelConfig;
  }

  /** [widthFactor, heightFactor] */
  get factors(): [number, number] {
    return DEFAULT_FACTORS;
  }

  get modelName(): string {
    return this.modelConfig.model ?? 'unknown';
  }

  /**
   * call real LLM / VLM Model
   * @param params
   * @param options
   * @returns
   */
  protected async invokeModelProvider(
    uiTarsVersion: UITarsModelVersion = UITarsModelVersion.V1_0,
    params: {
      messages: Array<ChatCompletionMessageParam>;
    },
    options: {
      signal?: AbortSignal;
    },
  ): Promise<{
    prediction: string;
    costTime?: number;
    costTokens?: number;
  }> {
    const { messages } = params;
    const {
      baseURL,
      apiKey,
      model,
      max_tokens = uiTarsVersion == UITarsModelVersion.V1_5 ? 65535 : 1000,
      temperature = 0,
      top_p = 0.7,
      ...restOptions
    } = this.modelConfig;

    const openai = new OpenAI({
      ...restOptions,
      maxRetries: 0,
      baseURL,
      apiKey,
    });

    const createCompletionPrams: ChatCompletionCreateParamsNonStreaming = {
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
    };

    const createCompletionPramsThinkingVp: ThinkingVisionProModelConfig = {
      ...createCompletionPrams,
      thinking: {
        type: 'disabled',
      },
    };

    const startTime = Date.now();
    const result = await openai.chat.completions.create(
      createCompletionPramsThinkingVp,
      options,
    );
    const costTime = Date.now() - startTime;

    return {
      prediction: result.choices?.[0]?.message?.content ?? '',
      costTime: costTime,
      costTokens: result.usage?.total_tokens ?? 0,
    };
  }

  async invoke(params: InvokeParams): Promise<InvokeOutput> {
    const { conversations, images, screenContext, scaleFactor, uiTarsVersion } =
      params;
    const { logger, signal } = useContext();

    logger?.info(
      `[UITarsModel] invoke: screenContext=${JSON.stringify(screenContext)}, scaleFactor=${scaleFactor}, uiTarsVersion=${uiTarsVersion}`,
    );

    const maxPixels =
      uiTarsVersion === UITarsModelVersion.V1_5
        ? MAX_PIXELS_V1_5
        : uiTarsVersion === UITarsModelVersion.DOUBAO_1_5_15B ||
            uiTarsVersion === UITarsModelVersion.DOUBAO_1_5_20B
          ? MAX_PIXELS_DOUBAO
          : MAX_PIXELS_V1_0;
    const compressedImages = await Promise.all(
      images.map((image) => preprocessResizeImage(image, maxPixels)),
    );

    const messages = convertToOpenAIMessages({
      conversations,
      images: compressedImages,
    });

    const startTime = Date.now();
    const result = await this.invokeModelProvider(
      uiTarsVersion,
      {
        messages,
      },
      {
        signal,
      },
    )
      .catch((e) => {
        logger?.error('[UITarsModel] error', e);
        throw e;
      })
      .finally(() => {
        logger?.info(`[UITarsModel cost]: ${Date.now() - startTime}ms`);
      });

    if (!result.prediction) {
      const err = new Error();
      err.name = 'vlm response error';
      err.stack = JSON.stringify(result) ?? 'no message';
      logger?.error(err);
      throw err;
    }

    const { prediction, costTime, costTokens } = result;

    try {
      const { parsed: parsedPredictions } = await actionParser({
        prediction,
        factor: this.factors,
        screenContext,
        scaleFactor,
        modelVer: uiTarsVersion,
      });
      return {
        prediction,
        parsedPredictions,
        costTime,
        costTokens,
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
