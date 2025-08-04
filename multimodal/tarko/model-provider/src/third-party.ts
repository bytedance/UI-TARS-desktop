/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { z, ZodType } from 'zod';
import { OpenAI, AzureOpenAI } from 'openai';
import { RequestOptions } from 'openai/core';
import type { JSONSchema7 } from 'json-schema';
import type {
  ChatCompletion,
  FunctionParameters,
  ChatCompletionTool,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionContentPartText,
  ChatCompletionContentPartImage,
  ChatCompletionContentPartInputAudio,
  ChatCompletionContentPart,
  ChatCompletionMessageToolCall,
} from 'openai/resources';

export { z, ZodType };
export type { OpenAI, AzureOpenAI, JSONSchema7 };
export type {
  RequestOptions,
  ChatCompletion,
  FunctionParameters,
  ChatCompletionTool,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  ChatCompletionContentPartText,
  ChatCompletionContentPartImage,
  ChatCompletionContentPartInputAudio,
  ChatCompletionContentPart,
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionMessageToolCall,
};
