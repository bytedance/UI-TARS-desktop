/**
 * The following code is modified based on
 * https://github.com/token-js/token.js/blob/main/src/handlers/anthropic.ts
 *
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  ContentBlock,
  ImageBlockParam,
  Message,
  MessageCreateParamsNonStreaming,
  MessageCreateParamsStreaming,
  RawMessageStreamEvent,
  TextBlock,
  TextBlockParam,
  ToolResultBlockParam,
  ToolUseBlock,
  ToolUseBlockParam,
} from '@anthropic-ai/sdk/resources/messages';
import { ChatCompletionMessageToolCall } from 'openai/resources/index';

import { AnthropicModel, CompletionParams, ProviderCompletionParams } from '../chat/index.js';
import {
  CompletionResponse,
  CompletionResponseChunk,
  StreamCompletionResponse,
  AnthropicContentBlock,
} from '../userTypes/index.js';
import { BaseHandler } from './base.js';
import { InputError, InvariantError } from './types.js';
import {
  consoleWarn,
  convertMessageContentToString,
  fetchThenParseImage,
  getTimestamp,
  isEmptyObject,
} from './utils.js';

export const createCompletionResponseNonStreaming = (
  response: Message,
  created: number,
  toolChoice: CompletionParams['tool_choice'],
): CompletionResponse => {
  const finishReason = toFinishReasonNonStreaming(response.stop_reason);
  const chatMessage = toChatCompletionChoiceMessage(response.content, response.role, toolChoice);
  const choice = {
    index: 0,
    logprobs: null,
    message: chatMessage,
    finish_reason: finishReason,
  };
  const converted: CompletionResponse = {
    id: response.id,
    choices: [choice],
    created,
    model: response.model,
    object: 'chat.completion',
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };

  return converted;
};

export async function* createCompletionResponseStreaming(
  response: AsyncIterable<RawMessageStreamEvent>,
  created: number,
): StreamCompletionResponse {
  let message: Message | undefined;

  // Native block indices include text/thinking; OpenAI tool indices must be dense.
  const toolIndices = new Map<number, number>();
  const blocks: AnthropicContentBlock[] = [];
  const toolInputs = new Map<number, string>();

  for await (const chunk of response) {
    if (chunk.type === 'message_start') {
      message = chunk.message;
      // Yield the first element
      yield {
        choices: [
          {
            index: 0,
            finish_reason: toFinishReasonStreaming(chunk.message.stop_reason),
            logprobs: null,
            delta: {
              role: chunk.message.role,
            },
          },
        ],
        created,
        model: message.model,
        id: message.id,
        object: 'chat.completion.chunk',
      };
    }

    if (message === undefined) {
      throw new InvariantError(`Message is undefined.`);
    }

    // message_delta already emitted the final content, finish reason, and usage.
    if (chunk.type === 'message_stop') continue;

    let newStopReason: Message['stop_reason'] | undefined;

    let delta: CompletionResponseChunk['choices'][0]['delta'] = {};
    if (chunk.type === 'content_block_start') {
      // The pinned SDK predates thinking, but its raw SSE transport preserves these events.
      const block = { ...chunk.content_block } as AnthropicContentBlock;
      blocks[chunk.index] = block;
      if (block.type === 'text') {
        delta.content = block.text;
      } else if (block.type === 'thinking') {
        delta.reasoning_content = block.thinking;
      } else if (block.type === 'tool_use') {
        const index = toolIndices.size;
        toolIndices.set(chunk.index, index);
        delta.tool_calls = [
          {
            index,
            id: block.id,
            type: 'function',
            function: {
              name: block.name,
              arguments: isEmptyObject(block.input) ? '' : JSON.stringify(block.input),
            },
          },
        ];
      }
    } else if (chunk.type === 'content_block_delta') {
      const change = chunk.delta as
        | typeof chunk.delta
        | { type: 'thinking_delta'; thinking: string }
        | { type: 'signature_delta'; signature: string };
      const block = blocks[chunk.index];
      if (change.type === 'input_json_delta') {
        const index = toolIndices.get(chunk.index);
        if (index === undefined || block?.type !== 'tool_use') {
          throw new InvariantError('Tool input delta arrived without a tool block.');
        }
        toolInputs.set(chunk.index, (toolInputs.get(chunk.index) ?? '') + change.partial_json);
        delta.tool_calls = [{ index, function: { arguments: change.partial_json } }];
      } else if (change.type === 'text_delta' && block?.type === 'text') {
        block.text += change.text;
        delta.content = change.text;
      } else if (change.type === 'thinking_delta' && block?.type === 'thinking') {
        block.thinking += change.thinking;
        delta.reasoning_content = change.thinking;
      } else if (change.type === 'signature_delta' && block?.type === 'thinking') {
        block.signature = (block.signature ?? '') + change.signature;
      }
    } else if (chunk.type === 'content_block_stop') {
      const block = blocks[chunk.index];
      if (block?.type === 'tool_use' && toolInputs.has(chunk.index)) {
        block.input = JSON.parse(toolInputs.get(chunk.index)!);
      }
    } else if (chunk.type === 'message_delta') {
      newStopReason = chunk.delta.stop_reason;
      message.stop_reason = newStopReason;
      message.usage.output_tokens = chunk.usage.output_tokens;
      if (blocks.some((block) => block.type === 'thinking' || block.type === 'redacted_thinking')) {
        delta.anthropic_content = blocks;
      }
    }

    const stopReason = newStopReason !== undefined ? newStopReason : message.stop_reason;
    const finishReason = toFinishReasonStreaming(stopReason);

    const chunkChoice = {
      index: 0,
      finish_reason: finishReason,
      logprobs: null,
      delta,
    };

    yield {
      choices: [chunkChoice],
      created,
      model: message.model,
      id: message.id,
      object: 'chat.completion.chunk',
      ...(chunk.type === 'message_delta'
        ? {
            usage: {
              prompt_tokens: message.usage.input_tokens,
              completion_tokens: message.usage.output_tokens,
              total_tokens: message.usage.input_tokens + message.usage.output_tokens,
            },
          }
        : {}),
    };
  }
}

const isTextBlock = (contentBlock: ContentBlock): contentBlock is TextBlock => {
  return contentBlock.type === 'text';
};

const isToolUseBlock = (contentBlock: ContentBlock): contentBlock is ToolUseBlock => {
  return contentBlock.type === 'tool_use';
};

const toChatCompletionChoiceMessage = (
  content: Message['content'],
  role: Message['role'],
  toolChoice: CompletionParams['tool_choice'],
): CompletionResponse['choices'][0]['message'] => {
  const nativeBlocks = content as AnthropicContentBlock[];
  const thinkingBlocks = nativeBlocks.filter((block) => block.type === 'thinking');
  const continuation = nativeBlocks.some(
    (block) => block.type === 'thinking' || block.type === 'redacted_thinking',
  )
    ? {
        anthropic_content: nativeBlocks,
        reasoning_content: thinkingBlocks.map((block) => block.thinking).join(''),
      }
    : {};
  const textBlocks = content.filter(isTextBlock);
  if (textBlocks.length > 1) {
    consoleWarn(
      `Received multiple text blocks from Anthropic, which is unexpected. Concatenating the text blocks into a single string.`,
    );
  }

  let toolUseBlocks: Anthropic.Messages.ToolUseBlock[];
  // Signed native history must retain every tool call so continuation can provide
  // a matching result for each tool_use block without rewriting signed content.
  if (
    !continuation.anthropic_content &&
    typeof toolChoice !== 'string' &&
    toolChoice?.type === 'function'
  ) {
    // When the user-defined tool_choice type is 'function', OpenAI always returns a single tool use
    // block, but Anthropic can return multiple tool use blocks. We select just one of these blocks
    // to conform to OpenAI's API.
    const selected = content
      .filter(isToolUseBlock)
      .find((block) => block.name === toolChoice.function.name);
    if (!selected) {
      throw new InvariantError(
        `Did not receive a tool use block from Anthropic for the function: ${toolChoice.function.name}`,
      );
    }
    toolUseBlocks = [selected];
  } else {
    toolUseBlocks = content.filter(isToolUseBlock);
  }

  let toolCalls: Array<ChatCompletionMessageToolCall> | undefined;
  if (toolUseBlocks.length > 0) {
    toolCalls = toolUseBlocks.map((toolUse) => {
      return {
        id: toolUse.id,
        function: {
          name: toolUse.name,
          arguments: JSON.stringify(toolUse.input),
        },
        type: 'function',
      };
    });
  }

  if (textBlocks.length === 0) {
    // There can be zero text blocks if either of these scenarios happen:
    // - A stop sequence is immediately hit, in which case Anthropic's `content` array is empty. In this
    //   scenario, OpenAI returns an empty string `content` field.
    // - There's only tool call responses. In this scenario, OpenAI returns a `content` field of `null`.
    const messageContent = content.every(isToolUseBlock) ? null : '';
    return {
      role,
      refusal: null,
      content: messageContent,
      tool_calls: toolCalls,
      ...continuation,
    };
  } else {
    return {
      role,
      refusal: null,
      content: textBlocks.map((textBlock) => textBlock.text).join('\n'),
      tool_calls: toolCalls,
      ...continuation,
    };
  }
};

const toFinishReasonNonStreaming = (
  stopReason: Message['stop_reason'],
): CompletionResponse['choices'][0]['finish_reason'] => {
  if (stopReason === null) {
    // Anthropic's documentation says that the `stop_reason` will never be `null` for non-streaming
    // calls.
    throw new InvariantError(
      `Detected a 'stop_reason' value of 'null' during a non-streaming call.`,
    );
  }

  if (stopReason === 'end_turn' || stopReason === 'stop_sequence') {
    return 'stop';
  } else if (stopReason === 'max_tokens') {
    return 'length';
  } else if (stopReason === 'tool_use') {
    return 'tool_calls';
  } else {
    return 'unknown';
  }
};

export const convertToolParams = (
  toolChoice: CompletionParams['tool_choice'],
  tools: CompletionParams['tools'],
): {
  toolChoice: MessageCreateParamsNonStreaming['tool_choice'];
  tools: MessageCreateParamsNonStreaming['tools'];
} => {
  if (tools === undefined || toolChoice === 'none') {
    return { toolChoice: undefined, tools: undefined };
  }

  const convertedTools: MessageCreateParamsNonStreaming['tools'] = tools.map((tool) => {
    return {
      name: tool.function.name,
      description: tool.function.description,
      input_schema: { type: 'object', ...tool.function.parameters },
    };
  });

  let convertedToolChoice: MessageCreateParamsNonStreaming['tool_choice'];
  if (toolChoice === undefined || toolChoice === 'auto') {
    convertedToolChoice = { type: 'auto' };
  } else if (toolChoice === 'required') {
    convertedToolChoice = { type: 'any' };
  } else {
    convertedToolChoice = { type: 'tool', name: toolChoice.function.name };
  }

  return { toolChoice: convertedToolChoice, tools: convertedTools };
};

const toFinishReasonStreaming = (
  stopReason: Message['stop_reason'],
): CompletionResponseChunk['choices'][0]['finish_reason'] => {
  if (stopReason === null) {
    return null;
  } else if (stopReason === 'end_turn' || stopReason === 'stop_sequence') {
    return 'stop';
  } else if (stopReason === 'max_tokens') {
    return 'length';
  } else if (stopReason === 'tool_use') {
    return 'tool_calls';
  } else {
    return 'unknown';
  }
};

export const getDefaultMaxTokens = (model: string): number => {
  if (
    model === 'claude-3-5-sonnet-20240620' ||
    model === 'claude-3-opus-20240229' ||
    model === 'claude-3-sonnet-20240229' ||
    model === 'claude-3-haiku-20240307' ||
    model === 'claude-2.1' ||
    model === 'claude-2.0' ||
    model === 'claude-instant-1.2'
  ) {
    return 4096;
  } else if (
    model === 'claude-3-5-sonnet-latest' ||
    model === 'claude-3-5-sonnet-20241022' ||
    model === 'claude-3-7-sonnet-latest' ||
    model === 'claude-3-7-sonnet-20250219' ||
    model === 'claude-3-5-haiku-20241022'
  ) {
    return 8192;
  } else {
    // We default to 8192 when the model is not specifically handled here to avoid throwing errors
    return 8192;
  }
};

export const convertMessages = async (
  messages: CompletionParams['messages'],
): Promise<{
  messages: MessageCreateParamsNonStreaming['messages'];
  systemMessage: string | undefined;
}> => {
  const output: MessageCreateParamsNonStreaming['messages'] = [];
  const clonedMessages = structuredClone(messages);

  // Pop the first element from the user-defined `messages` array if it begins with a 'system'
  // message. The returned element will be used for Anthropic's `system` parameter. We only pop the
  // system message if it's the first element in the array so that the order of the messages remains
  // unchanged.
  let systemMessage: string | undefined;
  if (clonedMessages.length > 0 && clonedMessages[0].role === 'system') {
    systemMessage = convertMessageContentToString(clonedMessages[0].content);
    clonedMessages.shift();
  }

  // Anthropic requires that the first message in the array is from a 'user' role, so we inject a
  // placeholder user message if the array doesn't already begin with a message from a 'user' role.
  if (clonedMessages[0].role !== 'user' && clonedMessages[0].role !== 'system') {
    clonedMessages.unshift({
      role: 'user',
      content: 'Empty',
    });
  }

  let previousRole: 'user' | 'assistant' = 'user';
  let currentParams: Array<
    TextBlockParam | ImageBlockParam | ToolUseBlockParam | ToolResultBlockParam
  > = [];
  for (const message of clonedMessages) {
    // Anthropic doesn't support the `system` role in their `messages` array, so if the user
    // defines system messages, we replace it with the `user` role and prepend 'System: ' to its
    // content. We do this instead of putting every system message in Anthropic's `system` string
    // parameter so that the order of the user-defined `messages` remains the same, even when the
    // system messages are interspersed with messages from other roles.
    const newRole =
      message.role === 'user' || message.role === 'system' || message.role === 'tool'
        ? 'user'
        : 'assistant';

    if (previousRole !== newRole) {
      output.push({
        role: previousRole,
        content: currentParams,
      });
      currentParams = [];
    }

    if (message.role === 'tool') {
      const toolResult: ToolResultBlockParam = {
        tool_use_id: message.tool_call_id,
        content: message.content,
        type: 'tool_result',
      };
      currentParams.push(toolResult);
    } else if (message.role === 'assistant') {
      if (message.anthropic_content?.length) {
        // Pass native signed blocks back verbatim, without duplicating text/tools.
        currentParams.push(...(message.anthropic_content as typeof currentParams));
        previousRole = newRole;
        continue;
      }
      if (typeof message.content === 'string') {
        currentParams.push({
          text: message.content,
          type: 'text',
        });
      }

      if (Array.isArray(message.tool_calls)) {
        const convertedContent: Array<ToolUseBlockParam> = message.tool_calls.map((toolCall) => {
          return {
            id: toolCall.id,
            input: JSON.parse(toolCall.function.arguments),
            name: toolCall.function.name,
            type: 'tool_use',
          };
        });
        currentParams.push(...convertedContent);
      }
    } else if (typeof message.content === 'string') {
      const text = message.role === 'system' ? `System: ${message.content}` : message.content;
      currentParams.push({
        type: 'text',
        text,
      });
    } else if (Array.isArray(message.content)) {
      const convertedContent: Array<TextBlockParam | ImageBlockParam> = await Promise.all(
        message.content.map(async (e) => {
          if (e.type === 'text') {
            const text = message.role === 'system' ? `System: ${e.text}` : e.text;
            return {
              type: 'text',
              text,
            } as TextBlockParam;
          } else {
            // @ts-expect-error
            // FIXME: Property 'image_url' does not exist on type 'ChatCompletionContentPartImage | ChatCompletionContentPartInputAudio | File'.
            const parsedImage = await fetchThenParseImage(e.image_url.url);
            return {
              type: 'image',
              source: {
                data: parsedImage.content,
                media_type: parsedImage.mimeType,
                type: 'base64',
              },
            } as ImageBlockParam;
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

  return { messages: output, systemMessage };
};

export const convertStopSequences = (
  stop?: CompletionParams['stop'],
): Array<string> | undefined => {
  if (stop === null || stop === undefined) {
    return undefined;
  } else if (typeof stop === 'string') {
    return [stop];
  } else if (Array.isArray(stop) && stop.every((e) => typeof e === 'string')) {
    return stop;
  } else {
    throw new Error(`Unknown stop sequence: ${stop}`);
  }
};

const getApiKey = (apiKey?: string): string | undefined => {
  return apiKey ?? process.env.ANTHROPIC_API_KEY;
};

export class AnthropicHandler extends BaseHandler<AnthropicModel> {
  validateInputs(body: ProviderCompletionParams<'anthropic'>): void {
    super.validateInputs(body);

    let logImageDetailWarning = false;
    for (const message of body.messages) {
      if (Array.isArray(message.content)) {
        for (const e of message.content) {
          if (e.type === 'image_url') {
            if (e.image_url.detail !== undefined && e.image_url.detail !== 'auto') {
              logImageDetailWarning = true;
            }

            if (
              body.model === 'claude-instant-1.2' ||
              body.model === 'claude-2.0' ||
              body.model === 'claude-2.1'
            ) {
              throw new InputError(
                `Model '${body.model}' does not support images. Remove any images from the prompt or use Claude version 3 or later.`,
              );
            }
          }
        }
      }
    }

    if (logImageDetailWarning) {
      consoleWarn(
        `Anthropic does not support the 'detail' field for images. The default image quality will be used.`,
      );
    }
  }

  async create(
    body: ProviderCompletionParams<'anthropic'>,
  ): Promise<CompletionResponse | StreamCompletionResponse> {
    this.validateInputs(body);

    const apiKey = getApiKey(this.opts.apiKey);
    if (apiKey === undefined) {
      throw new InputError(
        "No Anthropic API key detected. Please define an 'ANTHROPIC_API_KEY' environment variable or supply the API key using the 'apiKey' parameter.",
      );
    }

    const stream = typeof body.stream === 'boolean' ? body.stream : undefined;
    const maxTokens = body.max_tokens ?? getDefaultMaxTokens(body.model);
    const client = new Anthropic({
      apiKey: getApiKey(this.opts.apiKey)!,
      baseURL: this.opts.baseURL,
      defaultHeaders: this.opts.defaultHeaders,
    });
    const stopSequences = convertStopSequences(body.stop);
    const topP = typeof body.top_p === 'number' ? body.top_p : undefined;
    const temperature =
      typeof body.temperature === 'number'
        ? // We divide by two because Anthropic's temperature range is 0 to 1, unlike OpenAI's, which is
          // 0 to 2.
          body.temperature / 2
        : undefined;
    const { messages, systemMessage } = await convertMessages(body.messages);
    const { toolChoice, tools } = convertToolParams(body.tool_choice, body.tools);

    if (stream === true) {
      const convertedBody: MessageCreateParamsStreaming = {
        max_tokens: maxTokens,
        messages,
        model: body.model,
        stop_sequences: stopSequences,
        temperature,
        top_p: topP,
        stream,
        system: systemMessage,
        tools,
        tool_choice: toolChoice,
      };
      const created = getTimestamp();
      // Use raw SSE events: the pinned SDK's MessageStream accumulator predates thinking.
      const response = await client.messages.create(convertedBody);

      return createCompletionResponseStreaming(response, created);
    } else {
      const convertedBody: MessageCreateParamsNonStreaming = {
        max_tokens: maxTokens,
        messages,
        model: body.model,
        stop_sequences: stopSequences,
        temperature,
        top_p: topP,
        system: systemMessage,
        tools,
        tool_choice: toolChoice,
      };

      const created = getTimestamp();
      const response = await client.messages.create(convertedBody);
      return createCompletionResponseNonStreaming(response, created, body.tool_choice);
    }
  }
}
