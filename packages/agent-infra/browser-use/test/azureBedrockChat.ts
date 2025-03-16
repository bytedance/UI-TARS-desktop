/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  _convertMessagesToOpenAIParams,
  AzureChatOpenAI,
  messageToOpenAIRole,
} from '@langchain/openai';
import { BedrockToolChoice, ChatBedrockConverseToolType } from '@langchain/aws';
import type { Tool as BedrockTool } from '@aws-sdk/client-bedrock-runtime';
import {
  BaseLanguageModelInput,
  isOpenAITool,
  StructuredOutputMethodOptions,
  ToolDefinition,
} from '@langchain/core/language_models/base';
import type { ToolConfiguration } from '@aws-sdk/client-bedrock-runtime';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { isLangChainTool } from '@langchain/core/utils/function_calling';
import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  BaseMessageFields,
  isAIMessage,
  ToolMessage,
  UsageMetadata,
} from '@langchain/core/messages';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import {
  ChatGeneration,
  ChatGenerationChunk,
  ChatResult,
} from '@langchain/core/outputs';
import { NewTokenIndices } from '@langchain/core/callbacks/base';
import { ToolCall } from '@langchain/core/messages/tool';
import { convertLangChainToolCallToOpenAI } from '@langchain/core/output_parsers/openai_tools';
import {
  Runnable,
  RunnableLambda,
  RunnablePassthrough,
  RunnableSequence,
} from '@langchain/core/runnables';
import { z } from 'zod';
import { isZodSchema } from '@langchain/core/utils/types';

type BedrockConverseToolChoice = 'any' | 'auto' | string | BedrockToolChoice;

function isBedrockTool(tool: unknown): tool is BedrockTool {
  if (typeof tool === 'object' && tool && 'toolSpec' in tool) {
    return true;
  }
  return false;
}

function convertToConverseTools(
  tools: ChatBedrockConverseToolType[],
): BedrockTool[] {
  if (tools.every(isOpenAITool)) {
    return tools.map((tool) => ({
      toolSpec: {
        name: tool.function.name,
        description: tool.function.description,
        inputSchema: {
          json: tool.function.parameters as any,
        },
      },
    }));
  } else if (tools.every(isLangChainTool)) {
    return tools.map((tool) => ({
      toolSpec: {
        name: tool.name,
        description: tool.description,
        inputSchema: {
          json: zodToJsonSchema(tool.schema) as any,
        },
      },
    }));
  } else if (tools.every(isBedrockTool)) {
    return tools;
  }

  throw new Error(
    'Invalid tools passed. Must be an array of StructuredToolInterface, ToolDefinition, or BedrockTool.',
  );
}

function convertToBedrockToolChoice(
  toolChoice: BedrockConverseToolChoice,
  tools: BedrockTool[],
  fields: {
    model: string;
    supportsToolChoiceValues?: Array<'auto' | 'any' | 'tool'>;
  },
): BedrockToolChoice {
  const supportsToolChoiceValues = fields.supportsToolChoiceValues ?? [];

  let bedrockToolChoice: BedrockToolChoice;
  if (typeof toolChoice === 'string') {
    switch (toolChoice) {
      case 'any':
        bedrockToolChoice = {
          any: {},
        };
        break;
      case 'auto':
        bedrockToolChoice = {
          auto: {},
        };
        break;
      default: {
        const foundTool = tools.find(
          (tool) => tool.toolSpec?.name === toolChoice,
        );
        if (!foundTool) {
          throw new Error(
            `Tool with name ${toolChoice} not found in tools list.`,
          );
        }
        bedrockToolChoice = {
          tool: {
            name: toolChoice,
          },
        };
      }
    }
  } else {
    bedrockToolChoice = toolChoice;
  }

  const toolChoiceType = Object.keys(bedrockToolChoice)[0] as
    | 'auto'
    | 'any'
    | 'tool';
  if (!supportsToolChoiceValues.includes(toolChoiceType)) {
    let supportedTxt = '';
    if (supportsToolChoiceValues.length) {
      supportedTxt =
        `Model ${fields.model} does not currently support 'tool_choice' ` +
        `of type ${toolChoiceType}. The following 'tool_choice' types ` +
        `are supported: ${supportsToolChoiceValues.join(', ')}.`;
    } else {
      supportedTxt = `Model ${fields.model} does not currently support 'tool_choice'.`;
    }

    throw new Error(
      `${supportedTxt} Please see` +
        'https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ToolChoice.html' +
        'for the latest documentation on models that support tool choice.',
    );
  }

  return bedrockToolChoice;
}

export class AzureBedrockChat extends AzureChatOpenAI {
  override async _generate(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    const usageMetadata = {} as UsageMetadata;
    const params = this.invocationParams(options);
    const messagesMapped: any[] = _convertMessagesToOpenAIParams(
      messages,
      this.model,
    );
    if (params.stream) {
      const stream = this._streamResponseChunks(messages, options, runManager);
      const finalChunks: Record<number, ChatGenerationChunk> = {};
      for await (const chunk of stream) {
        chunk.message.response_metadata = {
          ...chunk.generationInfo,
          ...chunk.message.response_metadata,
        };
        const index =
          (chunk.generationInfo as NewTokenIndices)?.completion ?? 0;
        if (finalChunks[index] === undefined) {
          finalChunks[index] = chunk;
        } else {
          finalChunks[index] = finalChunks[index].concat(chunk);
        }
      }
      const generations = Object.entries(finalChunks)
        .sort(([aKey], [bKey]) => parseInt(aKey, 10) - parseInt(bKey, 10))
        .map(([_, value]) => value);
      const { functions, function_call } = this.invocationParams(options);
      // OpenAI does not support token usage report under stream mode,
      // fallback to estimation.
      // @ts-ignore
      const promptTokenUsage = await this.getEstimatedTokenCountFromPrompt(
        messages,
        functions,
        function_call,
      );
      const completionTokenUsage =
        // @ts-ignore
        await this.getNumTokensFromGenerations(generations);
      usageMetadata.input_tokens = promptTokenUsage;
      usageMetadata.output_tokens = completionTokenUsage;
      usageMetadata.total_tokens = promptTokenUsage + completionTokenUsage;
      return {
        generations,
        llmOutput: {
          estimatedTokenUsage: {
            promptTokens: usageMetadata.input_tokens,
            completionTokens: usageMetadata.output_tokens,
            totalTokens: usageMetadata.total_tokens,
          },
        },
      };
    } else {
      let data;
      const toolCalls: any[] = [
        ...messages.flatMap((m) => {
          if (isAIMessage(m) && !!m.tool_calls?.length) {
            return m.tool_calls.map((tc) => {
              // @ts-ignore
              if (tc.name && tc.description && tc.parameters) {
                return {
                  type: 'function',
                  function: {
                    name: tc.name,
                    // @ts-ignore
                    description: tc.description,
                    // @ts-ignore
                    parameters: tc.parameters,
                  },
                };
              }
              return null;
            });
          }
          return null;
        }),
        ...(options.tools ?? []),
      ].filter(Boolean);

      // console.log('toolCallstoolCalls', JSON.stringify(toolCalls));
      // // console.log('paramsparamsparams', JSON.stringify(params));
      // console.log('messagesMapped', JSON.stringify(messagesMapped, null, 2));
      // console.log('options', options);

      if (
        options.response_format &&
        options.response_format.type === 'json_schema'
      ) {
        // const {
        //   name,
        //   description,
        //   schema,
        //   strict = true,
        //   ...restSchemaParams
        // } = options.response_format.json_schema;
        // const toolsWithSchema = [
        //   ...toolCalls,
        //   {
        //     type: 'function' as const,
        //     function: {
        //       ...restSchemaParams,
        //       strict,
        //       name: name || 'extract',
        //       description: description || 'extract a json object from the text',
        //       parameters: schema,
        //     },
        //   },
        // ];
        // console.log('toolsWithSchema', toolsWithSchema);

        const responseFormat = {
          ...options.response_format,
          // @ts-ignore
          json_schema: {
            strict: true,
            ...options.response_format.json_schema,
            schema: isZodSchema(options.response_format.json_schema.schema)
              ? zodToJsonSchema(options.response_format.json_schema.schema)
              : options.response_format.json_schema.schema,
          },
        };

        data = await this.completionWithRetry(
          {
            ...params,
            stream: false,
            tools: toolCalls,
            // @ts-ignore
            response_format: responseFormat,
            messages: messagesMapped,
          },
          {
            signal: options?.signal,
            ...options?.options,
          },
        );

        console.log(
          'typeof data.choices[0]?.message?.content',
          typeof data.choices[0]?.message?.content,
        );

        // if (data.choices[0]?.message?.content) {
        //   console.log(
        //     'data.choices[0]!.message.content',
        //     data.choices[0]!.message.content,
        //   );
        //   try {
        //     data.choices[0]!.message.parsed = JSON.parse(
        //       data.choices[0]!.message.content,
        //     );
        //     console.log(
        //       'choices[0]!.messagechoices[0]!.parsed',
        //       data.choices[0]!.message.parsed,
        //     );
        //   } catch (error) {
        //     console.error('Error parsing JSON:', error);
        //   }
        // }
      } else {
        data = await this.completionWithRetry(
          {
            ...params,
            stream: false,
            tools: toolCalls,
            messages: messagesMapped,
          },
          {
            signal: options?.signal,
            ...options?.options,
          },
        );
      }
      const {
        completion_tokens: completionTokens,
        prompt_tokens: promptTokens,
        total_tokens: totalTokens,
        prompt_tokens_details: promptTokensDetails,
        completion_tokens_details: completionTokensDetails,
      } = data?.usage ?? {};
      if (completionTokens) {
        usageMetadata.output_tokens =
          (usageMetadata.output_tokens ?? 0) + completionTokens;
      }
      if (promptTokens) {
        usageMetadata.input_tokens =
          (usageMetadata.input_tokens ?? 0) + promptTokens;
      }
      if (totalTokens) {
        usageMetadata.total_tokens =
          (usageMetadata.total_tokens ?? 0) + totalTokens;
      }
      if (
        promptTokensDetails?.audio_tokens !== null ||
        promptTokensDetails?.cached_tokens !== null
      ) {
        usageMetadata.input_token_details = {
          ...(promptTokensDetails?.audio_tokens !== null && {
            audio: promptTokensDetails?.audio_tokens,
          }),
          ...(promptTokensDetails?.cached_tokens !== null && {
            cache_read: promptTokensDetails?.cached_tokens,
          }),
        };
      }
      if (
        completionTokensDetails?.audio_tokens !== null ||
        completionTokensDetails?.reasoning_tokens !== null
      ) {
        usageMetadata.output_token_details = {
          ...(completionTokensDetails?.audio_tokens !== null && {
            audio: completionTokensDetails?.audio_tokens,
          }),
          ...(completionTokensDetails?.reasoning_tokens !== null && {
            reasoning: completionTokensDetails?.reasoning_tokens,
          }),
        };
      }
      const generations: ChatGeneration[] = [];
      for (const part of data?.choices ?? []) {
        const text = part.message?.content ?? '';
        const generation: ChatGeneration = {
          text,
          message: this._convertOpenAIChatCompletionMessageToBaseMessage(
            part.message ?? { role: 'assistant' },
            data,
          ),
        };
        generation.generationInfo = {
          ...(part.finish_reason ? { finish_reason: part.finish_reason } : {}),
          ...(part.logprobs ? { logprobs: part.logprobs } : {}),
        };
        if (isAIMessage(generation.message)) {
          generation.message.usage_metadata = usageMetadata;
        }
        // Fields are not serialized unless passed to the constructor
        // Doing this ensures all fields on the message are serialized
        generation.message = new AIMessage(
          Object.fromEntries(
            Object.entries(generation.message).filter(
              ([key]) => !key.startsWith('lc_'),
            ),
          ) as BaseMessageFields,
        );
        generations.push(generation);
      }
      return {
        generations,
        llmOutput: {
          tokenUsage: {
            promptTokens: usageMetadata.input_tokens,
            completionTokens: usageMetadata.output_tokens,
            totalTokens: usageMetadata.total_tokens,
          },
        },
      };
    }
  }
}
