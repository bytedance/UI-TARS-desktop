/*
 * Copyright (C) 2025 Bytedance Ltd. and/or its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import OpenAI from 'openai';

import { convertToOpenAIMessages } from '@main/agent/utils';
import { logger } from '@main/logger';
import { store } from '@main/store/create';
import { preprocessResizeImage } from '@main/utils/image';

import { MAX_PIXELS } from '../constant';
import { VLM, VlmRequest, VlmResponse } from './base';

export interface UITARSOptions {
  reflection: boolean;
  num_samples: number;
  max_new_tokens: number;
  do_sample: boolean;
  top_k: number;
  temperature: number;
  top_p: number;
  no_answer: boolean;
  convert_history_reflection: boolean;
}

export class UITARS implements VLM<VlmRequest, VlmResponse> {
  get vlmModel() {
    return store.getState().getSetting('vlmModelName');
  }

  // [image, prompt]
  // [gpt, image]
  async invoke({ conversations, images }: VlmRequest) {
    const compressedImages = await Promise.all(
      images.map((image) => preprocessResizeImage(image, MAX_PIXELS)),
    );

    const messages = convertToOpenAIMessages({
      conversations,
      images: compressedImages,
    });
    const vlmBaseUrl = store.getState().getSetting('vlmBaseUrl');
    const vlmApiKey = store.getState().getSetting('vlmApiKey');
    logger.info('vlmBaseUrl', vlmBaseUrl, 'vlmApiKey', vlmApiKey);

    const openai = new OpenAI({
      baseURL: vlmBaseUrl,
      apiKey: vlmApiKey,
    });

    const startTime = Date.now();
    const result = await openai.chat.completions
      .create({
        model: this.vlmModel,
        max_tokens: 1000,
        stream: false,
        temperature: 0,
        top_p: 0.7,
        seed: null,
        stop: null,
        frequency_penalty: null,
        presence_penalty: null,
        // messages
        messages,
      })
      .finally(() => {
        logger.info(`[vlm_invoke_time_cost]: ${Date.now() - startTime}ms`);
      });
    if (!result.choices[0].message.content) {
      const err = new Error();
      err.name = 'vlm response error';
      err.stack = JSON.stringify(result) ?? 'no message';
      logger.error(err);
      throw err;
    }

    logger.info(
      '[ui_tars_vlm_response_content]',
      result.choices[0].message.content,
    );

    return {
      prediction: result.choices[0].message.content,
      reflections: [],
    };
  }
}
