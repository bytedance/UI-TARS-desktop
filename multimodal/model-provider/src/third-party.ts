/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { z, ZodType } from 'zod';
import { OpenAI, AzureOpenAI } from 'openai';
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
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from 'openai/resources';
import {
  ResponseInput,
  ResponseInputImage,
  EasyInputMessage,
  ResponseInputItem,
  ResponseCreateParams,
  ResponseStreamEvent,
} from 'openai/resources/responses/responses';

import { RequestOptions } from 'openai/internal/request-options';

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
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ResponseInput,
  ResponseInputImage,
  ResponseInputItem,
  ResponseCreateParams,
  ResponseStreamEvent,
  EasyInputMessage,
};
