/**
 * The following code is modified based on
 * https://github.com/token-js/token.js/blob/main/src/handlers/bedrock.ts
 *
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

// @ts-nocheck FIXME: this file has too many type errors.

import {
  BedrockRuntimeClient,
  ContentBlock,
  ContentBlockDelta,
  ConverseCommand,
  ConverseCommandInput,
  ConverseResponse,
  ConverseStreamCommand,
  ConverseStreamCommandOutput,
  ImageFormat,
  SystemContentBlock,
  Tool,
  ToolChoice,
  ToolConfiguration,
  ToolSpecification,
} from '@aws-sdk/client-bedrock-runtime';
import { ChatCompletionMessageToolCall } from 'openai/resources/index';

import {
  BedrockModel,
  CompletionNonStreaming,
  CompletionParams,
  CompletionStreaming,
  ProviderCompletionParams,
} from '../chat/index.js';
import {
  CompletionResponse,
  CompletionResponseChunk,
  StreamCompletionResponse,
} from '../userTypes/index.js';
import { BaseHandler } from './base.js';
import { InputError, InvariantError, MIMEType } from './types.js';
import {
  consoleWarn,
  convertMessageContentToString,
  fetchThenParseImage,
  getTimestamp,
  normalizeTemperature,
} from './utils.js';

const normalizeMIMEType = (mimeType: MIMEType): ImageFormat => {
  if (mimeType === 'image/gif') {
    return 'gif';
  } else if (mimeType === 'image/jpeg') {
    return 'jpeg';
  } else if (mimeType === 'image/png') {
    return 'png';
  } else if (mimeType === 'image/webp') {
    return 'webp';
  } else {
    throw new InvariantError(`Unsupported MIME type: ${mimeType}`);
  }
};

const supportsSystemMessages = (model: BedrockModel): boolean => {
  return (
    model !== 'cohere.command-light-text-v14' &&
    model !== 'cohere.command-text-v14' &&
    model !== 'amazon.titan-text-express-v1' &&
    model !== 'amazon.titan-text-lite-v1' &&
    model !== 'mistral.mistral-7b-instruct-v0:2' &&
    model !== 'mistral.mixtral-8x7b-instruct-v0:1'
  );
};

const supportsAssistantMessages = (model: BedrockModel): boolean => {
  return model !== 'cohere.command-light-text-v14' && model !== 'cohere.command-text-v14';
};

const isTextMember = (contentBlock: ContentBlock): contentBlock is ContentBlock.TextMember => {
  return typeof contentBlock.text === 'string';
};

const isToolUseBlock = (contentBlock: ContentBlock): contentBlock is ContentBlock.ToolUseMember => {
  return contentBlock.toolUse !== undefined;
};

const toChatCompletionChoiceMessage = (
  output: ConverseResponse['output'],
  toolChoice: CompletionParams['tool_choice'],
): CompletionResponse['choices'][0]['message'] => {
  if (output?.message?.content === undefined) {
    return {
      refusal: null,
      content: '',
      role: 'assistant',
    };
  }
  if (output.message.role === 'user') {
    throw new InvariantError(`Detected a user message in Bedrock's response.`);
  }
  const role = output.message.role ?? 'assistant';

  const textBlocks = output.message.content.filter(isTextMember);
  if (textBlocks.length > 1) {
    consoleWarn(
      `Received multiple text blocks from Bedrock, which is unexpected. Concatenating the text blocks into a single string.`,
    );
  }

  let toolUseBlocks: ContentBlock.ToolUseMember[];
  if (typeof toolChoice !== 'string' && toolChoice?.type === 'function') {
    // When the user-defined tool_choice type is 'function', OpenAI always returns a single tool use
    // block, but Anthropic can return multiple tool use blocks. Since Bedrock supports Anthropic,
    // we assume Bedrock can also return multiple tool use blocks. We select just one of these
    // blocks to conform to OpenAI's API.
    const selected = output.message.content
      .filter(isToolUseBlock)
      .find((block) => block.toolUse.name === toolChoice.function.name);
    if (!selected) {
      throw new InvariantError(
        `Did not receive a tool use block from Bedrock for the function: ${toolChoice.function.name}`,
      );
    }
    toolUseBlocks = [selected];
  } else {
    toolUseBlocks = output.message.content.filter(isToolUseBlock);
  }

  let toolCalls: Array<ChatCompletionMessageToolCall> | undefined;
  if (toolUseBlocks.length > 0) {
    toolCalls = toolUseBlocks.map((block) => {
      if (block.toolUse.name === undefined) {
        throw new InvariantError(`Function name is undefined.`);
      }

      return {
        id: block.toolUse.toolUseId ?? block.toolUse.name,
        function: {
          name: block.toolUse.name,
          arguments: block.toolUse.input !== undefined ? JSON.stringify(block.toolUse.input) : '',
        },
        type: 'function',
      };
    });
  }

  if (textBlocks.length === 0) {
    const messageContent = output.message.content.every(isToolUseBlock) ? null : '';
    return {
      role,
      refusal: null,
      content: messageContent,
      tool_calls: toolCalls,
    };
  } else {
    const content = textBlocks.map((textBlock) => textBlock.text).join('\n');
    return {
      role,
      refusal: null,
      content,
      tool_calls: toolCalls,
    };
  }
};

export const convertMessages = async (
  messages: CompletionParams['messages'],
  model: BedrockModel,
): Promise<{
  systemMessages: Array<SystemContentBlock> | undefined;
  messages: ConverseCommandInput['messages'];
}> => {
  const makeTextContent = (role: string, content: string): string => {
    if (role === 'system') {
      return `System: ${content}`;
    } else if (
      // We prepend 'Assistant: ' if the model doesn't support messages from the 'assistant' role in
      // order to differentiate it from user messages in this situation.
      !supportsAssistantMessages(model) &&
      role === 'assistant'
    ) {
      return `Assistant: ${content}`;
    } else {
      return content;
    }
  };

  const output: ConverseCommandInput['messages'] = [];
  const clonedMessages = structuredClone(messages);

  const systemMessages: Array<SystemContentBlock> = [];
  if (supportsSystemMessages(model)) {
    while (clonedMessages.length > 0 && clonedMessages[0].role === 'system') {
      const messageContent = convertMessageContentToString(clonedMessages[0].content);
      systemMessages.push({ text: messageContent });
      clonedMessages.shift();
    }
  }

  // Bedrock's SDK includes Anthropic, which requires that the first message in the array is from a
  // 'user' role, so we inject a placeholder user message if the array doesn't already begin with a
  // message from a 'user' or 'system' role. (The 'system' messages will be converted into user
  // messages later, which is why we don't include this placeholder if the array begins with a
  // system message).
  if (clonedMessages[0].role !== 'user' && clonedMessages[0].role !== 'system') {
    clonedMessages.unshift({
      role: 'user',
      content: 'Empty',
    });
  }

  let previousRole: 'user' | 'assistant' = 'user';
  let currentParams: Array<
    | ContentBlock.ImageMember
    | ContentBlock.TextMember
    | ContentBlock.ToolUseMember
    | ContentBlock.ToolResultMember
  > = [];
  for (const message of clonedMessages) {
    // Bedrock doesn't support the `system` role in their `messages` array, so if the user
    // defines system messages that are interspersed with user and assistant messages, we
    // replace the system messages with the `user` role. We'll also prepend 'System: ' to its
    // content later. We do this instead of putting every system message in Bedrock's `system`
    // parameter so that the order of the user-defined `messages` remains the same.
    let newRole: 'user' | 'assistant';
    if (supportsAssistantMessages(model)) {
      newRole =
        message.role === 'user' || message.role === 'system' || message.role === 'tool'
          ? 'user'
          : 'assistant';
    } else {
      // We'll always use the 'user' role if the model also doesn't support assistant messages.
      newRole = 'user';
    }

    if (previousRole !== newRole) {
      output.push({
        role: previousRole,
        content: currentParams,
      });
      currentParams = [];
    }

    if (message.role === 'tool') {
      const toolResult: ContentBlock.ToolResultMember = {
        toolResult: {
          toolUseId: message.tool_call_id,
          content: [
            {
              text: convertMessageContentToString(message.content),
            },
          ],
        },
      };
      currentParams.push(toolResult);
    } else if (message.role === 'assistant') {
      if (typeof message.content === 'string') {
        const text = makeTextContent(message.role, message.content);
        currentParams.push({
          text,
        });
      }

      if (Array.isArray(message.tool_calls)) {
        const convertedContent: Array<ContentBlock.ToolUseMember> = message.tool_calls?.map(
          (toolCall) => {
            return {
              toolUse: {
                toolUseId: toolCall.id,
                input: JSON.parse(toolCall.function.arguments),
                name: toolCall.function.name,
              },
            };
          },
        );
        currentParams.push(...convertedContent);
      }
    } else if (typeof message.content === 'string') {
      const text = makeTextContent(message.role, message.content);
      currentParams.push({
        text,
      });
    } else if (Array.isArray(message.content)) {
      const convertedContent: Array<ContentBlock.ImageMember | ContentBlock.TextMember> =
        await Promise.all(
          message.content.map(async (e) => {
            if (e.type === 'text') {
              const text = makeTextContent(message.role, e.text);
              return {
                text,
              } as ContentBlock.TextMember;
            } else {
              const parsedImage = await fetchThenParseImage(e.image_url.url);
              return {
                image: {
                  format: normalizeMIMEType(parsedImage.mimeType),
                  source: {
                    bytes: Buffer.from(parsedImage.content, 'base64'),
                  },
                },
              } as ContentBlock.ImageMember;
            }
          }),
        );
      currentParams.push(...convertedContent);
    }
    previousRole = newRole;
  }

  if (currentParams.length > 0) {
    output.push({
      role: previousRole,
      content: currentParams,
    });
  }

  return {
    systemMessages: systemMessages.length > 0 ? systemMessages : undefined,
    messages: output,
  };
};

const convertStopSequences = (stop?: CompletionParams['stop']): Array<string> | undefined => {
  if (stop === null || stop === undefined) {
    return undefined;
  } else if (typeof stop === 'string') {
    return [stop];
  } else if (Array.isArray(stop) && stop.every((e) => typeof e === 'string')) {
    return stop;
  } else {
    throw new Error(`Unknown stop sequence type: ${stop}`);
  }
};

const isContentBlockDeltaTextMember = (
  delta: ContentBlockDelta,
): delta is ContentBlockDelta.TextMember => {
  return typeof delta.text === 'string';
};

const isContentBlockDeltaToolUseMember = (
  delta: ContentBlockDelta,
): delta is ContentBlockDelta.ToolUseMember => {
  return delta.toolUse !== undefined;
};

export const convertToolParams = (
  toolChoice: CompletionParams['tool_choice'],
  tools: CompletionParams['tools'],
): ConverseCommandInput['toolConfig'] => {
  if (tools === undefined || toolChoice === 'none') {
    return undefined;
  }

  const convertedTools: (Tool | undefined)[] =
    tools.length > 0
      ? tools.map((tool) => {
          const inputSchema: ToolSpecification['inputSchema'] | undefined = tool.function.parameters
            ? ({
                // Bedrock and OpenAI's function parameter types are incompatible even though they both
                // adhere to the JSON schema, so we set the type to `any` to prevent a TypeScript error.
                json: tool.function.parameters as any,
              } satisfies ToolSpecification['inputSchema'])
            : undefined;
          return {
            toolSpec: {
              name: tool.function.name,
              description: tool.function.description,
              inputSchema,
            },
          } satisfies Tool;
        })
      : undefined;

  let convertedToolChoice: ToolChoice;
  if (toolChoice === undefined || toolChoice === 'auto') {
    convertedToolChoice = { auto: {} };
  } else if (toolChoice === 'required') {
    convertedToolChoice = { any: {} };
  } else {
    convertedToolChoice = { tool: { name: toolChoice.function.name } };
  }

  return {
    toolChoice: convertedToolChoice,
    tools: convertedTools,
  } satisfies ToolConfiguration;
};

const convertStopReason = (
  completionReason: ConverseResponse['stopReason'],
): CompletionResponse['choices'][0]['finish_reason'] => {
  if (completionReason === 'content_filtered' || completionReason === 'guardrail_intervened') {
    return 'content_filter';
  } else if (completionReason === 'end_turn' || completionReason === 'stop_sequence') {
    return 'stop';
  } else if (completionReason === 'max_tokens') {
    return 'length';
  } else if (completionReason === 'tool_use') {
    return 'tool_calls';
  } else {
    return 'unknown';
  }
};

async function* createCompletionResponseStreaming(
  response: ConverseStreamCommandOutput,
  model: BedrockModel,
  created: number,
): StreamCompletionResponse {
  const id = response.$metadata.requestId ?? null;
  if (response.stream === undefined) {
    const convertedResponse: CompletionResponseChunk = {
      id,
      choices: [
        {
          index: 0,
          finish_reason: null,
          logprobs: null,
          delta: {},
        },
      ],
      created,
      model,
      object: 'chat.completion.chunk',
    };
    yield convertedResponse;
  } else {
    // We manually keep track of the tool call index because some providers, like Anthropic, start
    // with a tool call index of 1 because they're preceded by a text block that has an index of 0 in
    // the `response`. Since OpenAI's tool call index starts with 0, we also enforce that convention
    // here for consistency.
    let initialToolCallIndex: number | null = null;

    for await (const stream of response.stream) {
      if (stream.internalServerException) {
        throw stream.internalServerException;
      } else if (stream.modelStreamErrorException) {
        throw stream.modelStreamErrorException;
      } else if (stream.throttlingException) {
        throw stream.throttlingException;
      } else if (stream.validationException) {
        throw stream.validationException;
      }

      let delta: CompletionResponseChunk['choices'][0]['delta'] = {};
      if (stream.messageStart) {
        if (stream.messageStart.role === 'user') {
          throw new InvariantError(`Received a message from the 'user' role.`);
        }
        delta = {
          role: stream.messageStart.role,
        };
      } else if (stream.contentBlockStart?.start?.toolUse !== undefined) {
        const index = stream.contentBlockStart.contentBlockIndex;
        if (typeof index !== 'number') {
          throw new InvariantError(`Content block index is undefined.`);
        }

        if (initialToolCallIndex === null) {
          initialToolCallIndex = index;
        }

        const toolId =
          stream.contentBlockStart.start.toolUse.toolUseId ??
          stream.contentBlockStart.start.toolUse.name;

        delta = {
          tool_calls: [
            {
              index: index - initialToolCallIndex,
              id: toolId,
              type: 'function',
              function: {
                name: stream.contentBlockStart.start.toolUse.name,
                arguments: '',
              },
            },
          ],
        };
      } else if (stream.contentBlockDelta?.delta !== undefined) {
        if (isContentBlockDeltaTextMember(stream.contentBlockDelta.delta)) {
          delta = {
            content: stream.contentBlockDelta.delta.text,
          };
        } else if (isContentBlockDeltaToolUseMember(stream.contentBlockDelta.delta)) {
          const index = stream.contentBlockDelta.contentBlockIndex;
          if (typeof index !== 'number') {
            throw new InvariantError(`Content block index is undefined.`);
          }

          if (initialToolCallIndex === null) {
            // We assign the initial tool call index in the `content_block_start` event, which should
            // always come before a `content_block_delta` event, so this variable should never be null.
            throw new InvariantError(
              `Content block delta event came before a content block start event.`,
            );
          }

          delta = {
            tool_calls: [
              {
                index: index - initialToolCallIndex,
                function: {
                  arguments: stream.contentBlockDelta.delta.toolUse.input,
                },
              },
            ],
          };
        }
      }

      const finishReason =
        typeof stream.messageStop?.stopReason === 'string'
          ? convertStopReason(stream.messageStop.stopReason)
          : null;

      const convertedResponse: CompletionResponseChunk = {
        id,
        choices: [
          {
            index: 0,
            finish_reason: finishReason,
            logprobs: null,
            delta,
          },
        ],
        created,
        model,
        object: 'chat.completion.chunk',
      };
      yield convertedResponse;
    }
  }
}

export class BedrockHandler extends BaseHandler<BedrockModel> {
  validateInputs(body: CompletionStreaming<'bedrock'> | CompletionNonStreaming<'bedrock'>): void {
    super.validateInputs(body);

    let logImageDetailWarning = false;
    for (const message of body.messages) {
      if (Array.isArray(message.content)) {
        for (const e of message.content) {
          if (e.type === 'image_url') {
            if (e.image_url.detail !== undefined && e.image_url.detail !== 'auto') {
              logImageDetailWarning = true;
            }
          }
        }
      }
    }

    if (logImageDetailWarning) {
      consoleWarn(
        `Bedrock does not support the 'detail' field for images. The default image quality will be used.`,
      );
    }
  }

  async create(
    body: ProviderCompletionParams<'bedrock'>,
  ): Promise<CompletionResponse | StreamCompletionResponse> {
    this.validateInputs(body);

    if (this.opts.baseURL) {
      consoleWarn(
        `The 'baseUrl' parameter will be ignored by Bedrock because it does not support this field.`,
      );
    }
    if (typeof this.opts.apiKey === 'string') {
      consoleWarn(
        `The 'apiKey' parameter will be ignored by Bedrock, which uses the 'accessKeyId' and 'secretAccessKey' fields on the 'bedrock' object instead.`,
      );
    }

    const region = this.opts.bedrock?.region ?? process.env.AWS_REGION_NAME;
    if (!region) {
      throw new InputError(
        "No AWS region detected. Please define a region using either the 'region' parameter on the 'bedrock' object or the 'AWS_REGION_NAME' environment variable.",
      );
    }
    const accessKeyId = this.opts.bedrock?.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = this.opts.bedrock?.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY;
    const missingCredentials: Array<{ envVar: string; param: string }> = [];
    if (!accessKeyId) {
      missingCredentials.push({
        envVar: 'AWS_ACCESS_KEY_ID',
        param: 'accessKeyId',
      });
    }
    if (!secretAccessKey) {
      missingCredentials.push({
        envVar: 'AWS_SECRET_ACCESS_KEY',
        param: 'secretAccessKey',
      });
    }
    if (missingCredentials.length > 0) {
      throw new InputError(
        `Missing AWS credentials: ${missingCredentials
          .map((c) => c.envVar)
          .join(
            ', ',
          )}. Please define these environment variables or supply them using the following parameters on the 'bedrock' object: ${missingCredentials
          .map((c) => c.param)
          .join(', ')}.`,
      );
    }

    const { systemMessages, messages } = await convertMessages(body.messages, body.model);
    const temperature =
      typeof body.temperature === 'number'
        ? normalizeTemperature(body.temperature, 'bedrock', body.model)
        : undefined;
    const topP = body.top_p ?? undefined;
    const maxTokens = body.max_tokens ?? undefined;
    const stopSequences = convertStopSequences(body.stop);
    const modelId = body.model;
    const toolConfig = convertToolParams(body.tool_choice, body.tools);

    const convertedParams: ConverseCommandInput = {
      inferenceConfig: {
        maxTokens,
        stopSequences,
        temperature,
        topP,
      },
      modelId,
      messages,
      system: systemMessages,
      toolConfig,
    };
    const client = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });

    if (body.stream === true) {
      const command = new ConverseStreamCommand(convertedParams);
      const created = getTimestamp();
      const response = await client.send(command);
      return createCompletionResponseStreaming(response, body.model, created);
    } else {
      const command = new ConverseCommand(convertedParams);
      const created = getTimestamp();
      const response = await client.send(command);

      const usage =
        response.usage &&
        typeof response.usage.inputTokens === 'number' &&
        typeof response.usage.outputTokens === 'number' &&
        typeof response.usage.totalTokens === 'number'
          ? {
              prompt_tokens: response.usage.inputTokens,
              completion_tokens: response.usage.outputTokens,
              total_tokens: response.usage.inputTokens + response.usage.outputTokens,
            }
          : undefined;

      const message = toChatCompletionChoiceMessage(response.output, body.tool_choice);

      const convertedResponse: CompletionResponse = {
        id: response.$metadata.requestId ?? null,
        usage,
        choices: [
          {
            index: 0,
            logprobs: null,
            message,
            finish_reason: convertStopReason(response.stopReason),
          },
        ],
        created,
        model: body.model,
        object: 'chat.completion',
      };
      return convertedResponse;
    }
  }
}
