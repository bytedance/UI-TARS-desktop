/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from 'zod';
import { OpenAI } from 'openai';
import type { JSONSchema7 } from 'json-schema';
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionMessageToolCall,
} from 'openai/resources';
import { ToolCallProvider } from './providers/tool-call-provider';

export { OpenAI };
export {
  ChatCompletion,
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionMessageToolCall,
};

// Generic type for tool parameters
export type ToolParameters = Record<string, any>;

export type ToolDefinition = {
  name: string;
  description: string;
  schema: z.ZodObject<any> | JSONSchema7;
  function: (args: any) => Promise<any>;
  hasZodSchema?: () => boolean;
  hasJsonSchema?: () => boolean;
};

export type AgentOptions = {
  name?: string;
  instructions: string;
  model: Model;
  tools?: ToolDefinition[];
  toolCallProvider?: ToolCallProvider;
  maxIterations?: number;
};

export class Model {
  constructor(
    public client: OpenAI,
    public name: string,
  ) {}
}
