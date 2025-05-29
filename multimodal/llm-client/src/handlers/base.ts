/**
 * The following code is modified based on
 * https://github.com/token-js/token.js/blob/main/src/handlers/base.ts
 *
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

import { CompletionParams, LLMChatModel } from '../chat/index.js';
import { CompletionResponse, ConfigOptions, StreamCompletionResponse } from '../userTypes/index.js';
import { InputError } from './types.js';

export abstract class BaseHandler<T extends LLMChatModel> {
  opts: ConfigOptions;
  protected models: readonly T[] | boolean;
  protected supportsJSON: readonly T[] | boolean;
  protected supportsImages: readonly T[] | boolean;
  protected supportsToolCalls: readonly T[] | boolean;
  protected supportsN: readonly T[] | boolean;
  protected supportsStreamingMessages: readonly T[] | boolean;

  constructor(
    opts: ConfigOptions,
    models: readonly T[] | boolean,
    supportsJSON: readonly T[] | boolean,
    supportsImages: readonly T[] | boolean,
    supportsToolCalls: readonly T[] | boolean,
    suportsN: readonly T[] | boolean,
    supportsStreamingMessages: readonly T[] | boolean,
  ) {
    this.opts = opts;
    this.models = models;
    this.supportsJSON = supportsJSON;
    this.supportsImages = supportsImages;
    this.supportsToolCalls = supportsToolCalls;
    this.supportsN = suportsN;
    this.supportsStreamingMessages = supportsStreamingMessages;
  }

  abstract create(body: CompletionParams): Promise<CompletionResponse | StreamCompletionResponse>;

  protected validateInputs(body: CompletionParams): void {
    // We remove the provider key from the body just in case the provider does validation which errors due to it.
    // This can only occur on OpenAI compatible providers, but we do it for all providers for consistency.
    delete (body as any).provider;

    if (!this.isSupportedModel(body.model)) {
      throw new InputError(`Invalid 'model' field: ${body.model}.`);
    }

    if (body.stream && !this.supportsStreaming(body.model)) {
      throw new Error(
        `Detected 'stream: true', but the following model does not support streaming: ${body.model}`,
      );
    }

    if (body.tools !== undefined && !this.supportsTools(body.model)) {
      throw new InputError(
        `Detected a 'tools' parameter, but the following model does not support tools: ${body.model}`,
      );
    }

    if (body.tool_choice !== undefined && !this.supportsTools(body.model)) {
      throw new InputError(
        `Detected a 'tool_choice' parameter, but the following model does not support tools: ${body.model}`,
      );
    }

    if (typeof body.temperature === 'number' && body.temperature > 2) {
      throw new InputError(
        `Expected a temperature less than or equal to 2, but got: ${body.temperature}`,
      );
    }

    for (const message of body.messages) {
      if (message.role === 'function') {
        throw new InputError(
          `The 'function' role is deprecated. Please use the 'tool' role instead.`,
        );
      }

      if (message.role === 'user') {
        if (Array.isArray(message.content)) {
          for (const content of message.content) {
            if (content.type === 'image_url' && !this.supportsImageMessages(body.model)) {
              throw new InputError(
                `Detected an image in the 'messages' array, but the following model does not support images: ${body.model}`,
              );
            }
          }
        }
      }
    }

    if (typeof body.n === 'number' && body.n > 1 && !this.supportsNGreaterThanOne(body.model)) {
      throw new InputError(`The model ${body.model} does not support setting 'n' greater than 1.`);
    }

    if (body.response_format?.type === 'json_object') {
      if (!this.supportsJSONMode(body.model)) {
        throw new InputError(
          `The model ${body.model} does not support the 'response_format' type 'json_object'.`,
        );
      }

      // Check if the user specified the string 'json' somewhere in the prompt. OpenAI throws an
      // error if the user doesn't include this string in the prompt, so we enforce this for every
      // provider for consistency.
      let containsJSONString = false;
      for (const message of body.messages) {
        if (typeof message.content === 'string') {
          if (message.content.toLowerCase().includes('json')) {
            containsJSONString = true;
            break;
          }
        } else if (Array.isArray(message.content)) {
          for (const e of message.content) {
            if (e.type === 'text') {
              if (e.text.toLowerCase().includes('json')) {
                containsJSONString = true;
                break;
              }
            }
          }
        }
      }

      if (!containsJSONString) {
        throw new InputError(
          `You must include the string 'JSON' somewhere in your prompt when the 'response_format' type is 'json_object'.`,
        );
      }
    }
  }

  protected isSupportedFeature(featureSupport: readonly T[] | boolean, model: T): boolean {
    if (typeof featureSupport === 'boolean') {
      return featureSupport;
    } else {
      return featureSupport.includes(model);
    }
  }

  // We make this public so that we can mock it in tests, which is fine because the `BaseHandler`
  // class isn't exposed to the user.
  public isSupportedModel(model: string): model is T {
    return this.isSupportedFeature(this.models, model as T);
  }

  protected supportsJSONMode(model: T): boolean {
    return this.isSupportedFeature(this.supportsJSON, model);
  }

  protected supportsImageMessages(model: T): boolean {
    return this.isSupportedFeature(this.supportsImages, model);
  }

  protected supportsNGreaterThanOne(model: T): boolean {
    return this.isSupportedFeature(this.supportsN, model);
  }

  protected supportsTools(model: T): boolean {
    return this.isSupportedFeature(this.supportsToolCalls, model);
  }

  protected supportsStreaming(model: T): boolean {
    return this.isSupportedFeature(this.supportsStreamingMessages, model);
  }
}
