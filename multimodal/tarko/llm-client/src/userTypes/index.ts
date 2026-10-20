/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The following code is modified based on
 * https://github.com/token-js/token.js/blob/main/src/userTypes/index.ts
 *
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

/**
 * These types are explicitly intended to be imported by the user. We keep them separate for clarity
 * and so that they can be easily imported and used alongside the primary LLM class.
 */
import { ClientOptions } from 'openai';
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionTool as OpenAIChatCompletionTool,
  ChatCompletionMessageParam as OpenAICompletionMessageParam,
} from 'openai/resources/index';

export type ConfigOptions = Pick<ClientOptions, 'apiKey' | 'baseURL'> & {
  defaultHeaders?: Record<string, string>;
  azure?: {
    endpoint?: string;
    apiVersion?: string;
    azureADTokenProvider?: any;
  };
};

// Native blocks must survive continuation without reconstructing signed thinking.
export type AnthropicContentBlock =
  | { type: 'thinking'; thinking: string; signature?: string }
  | { type: 'redacted_thinking'; data: string }
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown };

export interface AnthropicContinuation {
  anthropic_content?: AnthropicContentBlock[];
  reasoning_content?: string;
}

export type ChatCompletionChoice = Omit<ChatCompletion.Choice, 'finish_reason' | 'message'> & {
  message: ChatCompletion.Choice['message'] & AnthropicContinuation;
  finish_reason: ChatCompletion.Choice['finish_reason'] | 'unknown';
};

export type ChatCompletionChunkChoice = Omit<
  ChatCompletionChunk.Choice,
  'finish_reason' | 'delta'
> & {
  delta: ChatCompletionChunk.Choice['delta'] & AnthropicContinuation;
  finish_reason: ChatCompletionChunk.Choice['finish_reason'] | 'unknown';
};

type CompletionResponseFields = 'created' | 'model' | 'usage' | 'object';
export type CompletionResponse = Pick<ChatCompletion, CompletionResponseFields> & {
  id: string | null;
  choices: Array<ChatCompletionChoice>;
};
export type CompletionResponseChunk = Pick<ChatCompletionChunk, CompletionResponseFields> & {
  id: string | null;
  choices: Array<ChatCompletionChunkChoice>;
};
export type StreamCompletionResponse = AsyncIterable<CompletionResponseChunk>;
export type ChatCompletionMessageParam = OpenAICompletionMessageParam & AnthropicContinuation;
export type ChatCompletionTool = OpenAIChatCompletionTool;
