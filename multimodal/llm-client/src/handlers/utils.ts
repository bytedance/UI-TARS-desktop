/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The following code is modified based on
 * https://github.com/token-js/token.js/blob/main/src/handlers/utils.ts
 *
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

// @ts-nocheck FIXME: this file has too many type errors.

import chalk from 'chalk';
import { lookup } from 'mime-types';
import OpenAI from 'openai';

import { LLMChatModel, LLMProvider } from '../chat/index.js';
import { models } from '../models.js';
import { ConfigOptions } from '../userTypes/index.js';
import { AI21Handler } from './ai21.js';
import { AnthropicHandler } from './anthropic.js';
import { BaseHandler } from './base.js';
import { BedrockHandler } from './bedrock.js';
import { CohereHandler } from './cohere.js';
import { GeminiHandler } from './gemini.js';
import { GroqHandler } from './groq.js';
import { MistralHandler } from './mistral.js';
import { OpenAICompatibleHandler } from './openai-compatible.js';
import { OpenAIHandler } from './openai.js';
import { OpenRouterHandler } from './openrouter.js';
import { PerplexityHandler } from './perplexity.js';
import { InputError, MIMEType } from './types.js';
import { AzureOpenAIHandler } from './azure-openai.js';

export const Handlers: Record<string, (opts: ConfigOptions) => any> = {
  ['openai']: (opts: ConfigOptions) =>
    new OpenAIHandler(
      opts,
      models.openai.models,
      models.openai.supportsJSON,
      models.openai.supportsImages,
      models.openai.supportsToolCalls,
      models.openai.supportsN,
      models.openai.supportsStreaming,
    ),
  ['anthropic']: (opts: ConfigOptions) =>
    new AnthropicHandler(
      opts,
      models.anthropic.models,
      models.anthropic.supportsJSON,
      models.anthropic.supportsImages,
      models.anthropic.supportsToolCalls,
      models.anthropic.supportsN,
      models.anthropic.supportsStreaming,
    ),
  ['gemini']: (opts: ConfigOptions) =>
    new GeminiHandler(
      opts,
      models.gemini.models,
      models.gemini.supportsJSON,
      models.gemini.supportsImages,
      models.gemini.supportsToolCalls,
      models.gemini.supportsN,
      models.gemini.supportsStreaming,
    ),
  ['cohere']: (opts: ConfigOptions) =>
    new CohereHandler(
      opts,
      models.cohere.models,
      models.cohere.supportsJSON,
      models.cohere.supportsImages,
      models.cohere.supportsToolCalls,
      models.cohere.supportsN,
      models.cohere.supportsStreaming,
    ),
  ['bedrock']: (opts: ConfigOptions) =>
    new BedrockHandler(
      opts,
      models.bedrock.models,
      models.bedrock.supportsJSON,
      models.bedrock.supportsImages,
      models.bedrock.supportsToolCalls,
      models.bedrock.supportsN,
      models.bedrock.supportsStreaming,
    ),
  ['mistral']: (opts: ConfigOptions) =>
    new MistralHandler(
      opts,
      models.mistral.models,
      models.mistral.supportsJSON,
      models.mistral.supportsImages,
      models.mistral.supportsToolCalls,
      models.mistral.supportsN,
      models.mistral.supportsStreaming,
    ),
  ['groq']: (opts: ConfigOptions) =>
    new GroqHandler(
      opts,
      models.groq.models,
      models.groq.supportsJSON,
      models.groq.supportsImages,
      models.groq.supportsToolCalls,
      models.groq.supportsN,
      models.groq.supportsStreaming,
    ),
  ['ai21']: (opts: ConfigOptions) =>
    new AI21Handler(
      opts,
      models.ai21.models,
      models.ai21.supportsJSON,
      models.ai21.supportsImages,
      models.ai21.supportsToolCalls,
      models.ai21.supportsN,
      models.ai21.supportsStreaming,
    ),
  ['perplexity']: (opts: ConfigOptions) =>
    new PerplexityHandler(
      opts,
      models.perplexity.models,
      models.perplexity.supportsJSON,
      models.perplexity.supportsImages,
      models.perplexity.supportsToolCalls,
      models.perplexity.supportsN,
      models.perplexity.supportsStreaming,
    ),
  ['openrouter']: (opts: ConfigOptions) =>
    new OpenRouterHandler(
      opts,
      models.openrouter.models,
      models.openrouter.supportsJSON,
      models.openrouter.supportsImages,
      models.openrouter.supportsToolCalls,
      models.openrouter.supportsN,
      models.openrouter.supportsStreaming,
    ),
  ['openai-compatible']: (opts: ConfigOptions) =>
    new OpenAICompatibleHandler(
      opts,
      models.openrouter.models,
      models.openrouter.supportsJSON,
      models.openrouter.supportsImages,
      models.openrouter.supportsToolCalls,
      models.openrouter.supportsN,
      models.openrouter.supportsStreaming,
    ),
  ['azure-openai']: (opts: ConfigOptions) =>
    new AzureOpenAIHandler(
      opts,
      models['azure-openai'].models,
      models['azure-openai'].supportsJSON,
      models['azure-openai'].supportsImages,
      models['azure-openai'].supportsToolCalls,
      models['azure-openai'].supportsN,
      models['azure-openai'].supportsStreaming,
    ),
};

export const getHandler = (provider: LLMProvider, opts: ConfigOptions): BaseHandler<any> => {
  for (const handlerKey in Handlers) {
    if (provider === handlerKey) {
      return Handlers[handlerKey](opts);
    }
  }

  throw new Error(
    `Could not find provider for model. Are you sure the model name is correct and the provider is supported?`,
  );
};

export const getTimestamp = () => {
  return Math.floor(new Date().getTime() / 1000);
};

export const fetchImageAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)));
};

export const getMimeType = (url: string): string => {
  const parsedUrl = new URL(url);
  const pathname = parsedUrl.pathname;
  const extension = pathname.split('.').pop();
  return lookup(extension);
};

const isUrl = (input: string): boolean => {
  try {
    const url = new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

const isBase64Image = (input: string): boolean => /^data:image\/[a-zA-Z]+;base64,/.test(input);

export const fetchThenParseImage = async (
  urlOrBase64Image: string,
): Promise<{ content: string; mimeType: MIMEType }> => {
  if (isUrl(urlOrBase64Image)) {
    const content = await fetchImageAsBase64(urlOrBase64Image);
    const mimeType = getMimeType(urlOrBase64Image);
    if (mimeType === null) {
      throw new Error(`Failed to get the mime type for the URL: ${urlOrBase64Image}`);
    }
    if (!isSupportedMIMEType(mimeType)) {
      throw new InputError(`Unsupported MIME type: ${mimeType}`);
    }

    return {
      content,
      mimeType,
    };
  } else if (isBase64Image(urlOrBase64Image)) {
    return parseImage(urlOrBase64Image);
  } else {
    throw new InputError('Invalid image URL.');
  }
};

export const isSupportedMIMEType = (value: string): value is MIMEType => {
  return (
    value === 'image/jpeg' ||
    value === 'image/png' ||
    value === 'image/gif' ||
    value === 'image/webp'
  );
};

export const parseImage = (image: string): { content: string; mimeType: MIMEType } => {
  const parts = image.split(';base64,');
  if (parts.length === 2) {
    const mimeType = parts[0].replace('data:', '').toLowerCase();
    if (!isSupportedMIMEType(mimeType)) {
      throw new InputError(`Unsupported MIME type: ${mimeType}`);
    }
    return {
      content: parts[1],
      mimeType,
    };
  } else {
    throw new InputError('Invalid image URL.');
  }
};

export const consoleWarn = (message: string): void => {
  console.warn(chalk.yellow.bold(`Warning: ${message}\n`));
};

export const normalizeTemperature = (
  temperature: number,
  provider: LLMProvider,
  model: LLMChatModel,
): number => {
  const normalizeProviders = ['mistral', 'anthropic', 'cohere', 'bedrock'];

  if (normalizeProviders.includes(provider as string)) {
    return temperature / 2;
  } else if (provider === 'bedrock') {
    if (
      model.startsWith('amazon') ||
      model.startsWith('anthropic') ||
      model.startsWith('cohere') ||
      model.startsWith('mistral') ||
      model.startsWith('meta')
    ) {
      return temperature / 2;
    }
  }

  return temperature;
};

export const isEmptyObject = (variable: any): boolean => {
  return (
    variable &&
    typeof variable === 'object' &&
    variable.constructor === Object &&
    Object.keys(variable).length === 0
  );
};

export const isObject = (variable: any): boolean => {
  return variable && typeof variable === 'object' && variable.constructor === Object;
};

export const convertMessageContentToString = (
  messageContent: OpenAI.Chat.Completions.ChatCompletionMessageParam['content'],
): string => {
  if (!messageContent) {
    return '';
  }

  return (
    (typeof messageContent === 'string'
      ? messageContent
      : messageContent
          .map((m: OpenAI.Chat.Completions.ChatCompletionContentPartText) => m.text)
          .join('\n')) ?? ''
  );
};
