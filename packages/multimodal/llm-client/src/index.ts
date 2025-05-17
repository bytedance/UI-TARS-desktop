/**
 * The following code is modified based on
 * https://github.com/token-js/token.js/blob/main/src/index.ts
 *
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

import { LLMChat, LLMProvider } from './chat/index.js';
import { InputError } from './handlers/types.js';
import { models } from './models.js';
import { ConfigOptions } from './userTypes/index.js';
export * from './models.js';
export * from './userTypes/index.js';

// Extract the public interface from OpenAI, including both properties and methods
// type PublicInterface<T> = {
//   [K in keyof T]: T[K] extends (...args: any[]) => any ? T[K] : T[K]
// }

// Pick the properties we want to expose from OpenAI and use them to construct our own client interface
// We omit the _client property from the com
// pletions object because it is not needed
// type Completions = Omit<
//   Pick<PublicInterface<OpenAI>['chat'], 'completions'>['completions'],
//   '_client'
// >

// type Chat = {
//   completions: Completions
// }

type TokenJSInterface = {
  chat: LLMChat;
  extendModelList<P extends Exclude<LLMProvider, 'openrouter' | 'openai-compatible'>>(
    provider: P,
    name: string,
    featureSupport: extendedModelFeatureSupport<P>,
  ): void;
};

export type extendedModelFeatureSupport<P extends LLMProvider> =
  | ((typeof models)[P]['models'] extends readonly string[]
      ? (typeof models)[P]['models'][number]
      : never)
  | {
      streaming: boolean;
      json: boolean;
      toolCalls: boolean;
      images: boolean;
    };

type extendedModelList = Array<{
  provider: LLMProvider;
  name: string;
  featureSupport: extendedModelFeatureSupport<any>;
}>;

export class TokenJS implements TokenJSInterface {
  private opts: ConfigOptions;
  public static extendedModelList: Readonly<extendedModelList> = [];
  chat: LLMChat;

  constructor({ ...opts }: ConfigOptions = {}) {
    this.opts = opts;

    // We pass a reference to the LLM instance to the LLMChat instance so that the completions object can access the opts
    this.chat = new LLMChat(opts);
  }

  /**
   * Checks if a model exists in the extended model list for a given provider
   *
   * @param provider - The LLM provider to check
   * @param name - The model name to check
   * @returns boolean indicating if the model exists
   */
  extendedModelExist<P extends Exclude<LLMProvider, 'openrouter' | 'openai-compatible'>>(
    provider: P,
    name: string,
  ): boolean {
    return TokenJS.extendedModelList.some(
      (model) => model.provider === provider && model.name === name,
    );
  }

  /**
   * Extends the predefined model list by adding a new model with specified features.
   *
   * @param provider - The LLM provider (e.g., 'bedrock', 'openai')
   * @param name - The model name/identifier to add
   * @param featureSupport - Either:
   * - A string matching an existing model name from the same provider to copy its feature support
   * - An object specifying which features the model supports:
   * | Feature    | Type    | Description                                  |
   * |------------|---------|----------------------------------------------|
   * | streaming  | boolean | Whether the model supports streaming responses|
   * | json       | boolean | Whether the model supports JSON mode         |
   * | toolCalls  | boolean | Whether the model supports function calling  |
   * | images     | boolean | Whether the model supports image inputs      |
   * @returns The TokenJS instance for chaining
   *
   * @example
   * ```typescript
   * // Example in 2 steps: Adding AWS Bedrock Claude models with region prefix
   * const tokenjs = new TokenJS();
   *
   * // Step 1: Register the new model name
   * tokenjs.extendModelList(
   *   "bedrock",
   *   'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
   *   "anthropic.claude-3-sonnet-20240229-v1:0" // Copy features from existing model
   * );
   *
   * // Step 2: Using the extended model in a chat completion
   * const result = await tokenjs.chat.completions.create({
   *   stream: true,
   *   provider: 'bedrock',
   *   model: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0' as any, // Note: Type casting as 'any' required
   *   messages: [
   *     {
   *       role: 'user',
   *       content: 'Tell me about yourself.',
   *     },
   *   ],
   * });
   * ```
   *
   * Note: When using extended models, type casting (`as any`) is required
   */
  extendModelList<P extends Exclude<LLMProvider, 'openrouter' | 'openai-compatible'>>(
    provider: P,
    name: string,
    featureSupport: extendedModelFeatureSupport<P>,
  ) {
    // Do nothing if the model already added in the extendedModeList
    if (this.extendedModelExist(provider, name)) {
      return this;
    }

    // FIXME: find a better solution for it.
    // If a model name is pre-defined, there is a conflict so we throw an error
    // if (Array.isArray(models[provider].models) && models[provider].models.includes(name)) {
    //   throw new InputError(
    //     `You tried to add the following custom model name: "${name}", for provider: "${provider}". But it conflicts with an existing pre-defined model name. Please try again using different name e.g.: "${name}-custom"`,
    //   );
    // }

    const modelsRef = models[provider] as any;
    modelsRef['models'] = [...(models as any)[provider]['models'], name];

    const isSupportedFeature = (_featureSupport: readonly string[] | boolean, model: string) => {
      if (typeof _featureSupport === 'boolean') {
        return _featureSupport;
      }
      return _featureSupport.includes(model);
    };

    if (typeof featureSupport == 'string') {
      // Copy feature support from existing model
      if (isSupportedFeature(modelsRef.supportsJSON, featureSupport)) {
        modelsRef['supportsJSON'] = [...modelsRef.supportsJSON, name];
      }
      if (isSupportedFeature(modelsRef.supportsStreaming, featureSupport)) {
        modelsRef['supportsStreaming'] = [...modelsRef.supportsStreaming, name];
      }
      if (isSupportedFeature(modelsRef.supportsImages, featureSupport)) {
        modelsRef['supportsImages'] = [...modelsRef.supportsImages, name];
      }
      if (isSupportedFeature(modelsRef.supportsToolCalls, featureSupport)) {
        modelsRef['supportsToolCalls'] = [...modelsRef.supportsToolCalls, name];
      }
    } else {
      // Use explicit feature support object
      if (featureSupport.json) {
        modelsRef['supportsJSON'] = [...modelsRef.supportsJSON, name];
      }
      if (featureSupport.streaming) {
        modelsRef['supportsStreaming'] = [...modelsRef.supportsStreaming, name];
      }
      if (featureSupport.toolCalls) {
        modelsRef['supportsToolCalls'] = [...modelsRef.supportsToolCalls, name];
      }
      if (featureSupport.images) {
        modelsRef['supportsImages'] = [...modelsRef.supportsImages, name];
      }
    }
    (TokenJS.extendedModelList as extendedModelList).push({
      provider,
      name,
      featureSupport,
    });
    return this;
  }
}
