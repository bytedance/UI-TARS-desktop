/**
 * The following code is modified based on
 * https://github.com/token-js/token.js/blob/main/src/handlers/cohere.ts
 *
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

import { CohereClient } from 'cohere-ai';
import {
  ApiMetaBilledUnits,
  ChatRequest,
  FinishReason,
  Message,
  StreamedChatResponse,
  Tool,
  ToolResult,
} from 'cohere-ai/api';
import { Stream } from 'cohere-ai/core';
import { nanoid } from 'nanoid';
import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionToolMessageParam,
} from 'openai/resources/index';
import { ChatCompletionTool } from 'openai/src/resources/index.js';

import { CohereModel, CompletionParams, ProviderCompletionParams } from '../chat/index.js';
import { CompletionResponse, StreamCompletionResponse } from '../userTypes/index.js';
import { BaseHandler } from './base.js';
import { InputError, InvariantError, MessageRole } from './types.js';
import { consoleWarn, convertMessageContentToString, getTimestamp } from './utils.js';

type CohereMessageRole = 'CHATBOT' | 'SYSTEM' | 'USER' | 'TOOL';

const convertRole = (role: MessageRole): CohereMessageRole => {
  if (role === 'assistant') {
    return 'CHATBOT';
  } else if (role === 'system') {
    return 'SYSTEM';
  } else if (role === 'tool') {
    return 'TOOL';
  } else if (role === 'user') {
    return 'USER';
  } else if (role === 'developer') {
    return 'SYSTEM';
  } else {
    throw new InputError(`Unknown role: ${role}`);
  }
};

const convertFinishReason = (
  finishReason?: FinishReason,
): CompletionResponse['choices'][0]['finish_reason'] => {
  if (
    finishReason === 'COMPLETE' ||
    finishReason === 'USER_CANCEL' ||
    finishReason === 'STOP_SEQUENCE'
  ) {
    return 'stop';
  } else if (finishReason === 'MAX_TOKENS') {
    return 'length';
  } else if (finishReason === 'ERROR_TOXIC') {
    return 'content_filter';
  } else if (finishReason === 'ERROR_LIMIT') {
    // OpenAI throws an error in when the model's context limit is reached, so we do too for consistency.
    throw new Error(
      `The generation could not be completed because the model’s context limit was reached.`,
    );
  } else if (finishReason === 'ERROR') {
    throw new Error(`The generation could not be completed due to an error.`);
  } else {
    return 'unknown';
  }
};

const popLastUserMessageContentString = (messages: CompletionParams['messages']): string => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'user') {
      if (typeof message.content === 'string') {
        messages.splice(i, 1); // Remove the object from the array
        return message.content;
      } else if (Array.isArray(message.content)) {
        for (const e of message.content) {
          if (e.type === 'text') {
            messages.splice(i, 1); // Remove the object from the array
            return e.text;
          }
        }
      }
    }
  }

  // Return a placeholder string if the user didn't include a text message. We include a whitespace
  // in the string because Cohere throws an error if the user's message contains zero tokens.
  return 'Empty';
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

export const toCohereTool = (tool: ChatCompletionTool): Tool => {
  const convertType = (type: string, properties?: any, additionalProperties?: any): string => {
    switch (type) {
      case 'string':
        return 'str';
      case 'integer':
        return 'int';
      case 'array':
        return `List${properties ? `[${convertType(properties.type)}]` : ''}`;
      case 'object':
        if (additionalProperties) {
          return `Dict[str, ${convertType(additionalProperties.type)}]`;
        }
        return 'Dict';
      default:
        return type;
    }
  };

  const convertProperties = (
    properties: Record<string, any>,
    requiredFields: string[],
  ): Record<string, any> => {
    const converted: Record<string, any> = {};
    for (const [key, value] of Object.entries(properties)) {
      const isRequired = requiredFields.includes(key);
      converted[key] = {
        description: value.description,
        type: convertType(value.type, value.items, value.additionalProperties),
        required: isRequired,
      };
      if (value.type === 'object' && value.properties) {
        converted[key].properties = convertProperties(value.properties, value.required || []);
      }
    }
    return converted;
  };

  const required: string[] = Array.isArray(tool.function.parameters?.required)
    ? tool.function.parameters?.required
    : [];
  const parameterDefinitions = tool.function.parameters?.properties
    ? convertProperties(tool.function.parameters.properties, required)
    : undefined;

  return {
    name: tool.function.name,
    description: tool.function.description ?? '',
    parameterDefinitions,
  };
};

const getUsageTokens = (billedUnits?: ApiMetaBilledUnits): CompletionResponse['usage'] => {
  if (
    billedUnits &&
    typeof billedUnits.inputTokens === 'number' &&
    typeof billedUnits.outputTokens === 'number'
  ) {
    const { inputTokens, outputTokens } = billedUnits;
    return {
      completion_tokens: outputTokens,
      prompt_tokens: inputTokens,
      total_tokens: outputTokens + inputTokens,
    };
  } else {
    return undefined;
  }
};

const popLastToolMessageParams = (
  messages: CompletionParams['messages'],
): Array<ChatCompletionToolMessageParam> | undefined => {
  const lastMessage = messages.at(messages.length - 1);
  if (lastMessage === undefined || lastMessage.role !== 'tool') {
    return undefined;
  }

  const toolMessages: Array<ChatCompletionToolMessageParam> = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'tool') {
      // Put the new element at the beginning of the array to maintain the same order as the
      // messages array. (This is necessary because we're iterating from the end of the messages
      // array to the beginning).
      toolMessages.unshift(message);

      messages.pop();
    }
  }

  return toolMessages;
};

/**
 * @param previousMessages All of the messages before the `toolMessage`.
 */
const toToolResult = (
  toolMessage: ChatCompletionToolMessageParam,
  previousMessages: CompletionParams['messages'],
): ToolResult => {
  // Find the most recent assistant message, which contains the function arguments. The assistant
  // message must immediately precede the tool messages in order to adhere to OpenAI's API.
  let lastAssistantMessage: ChatCompletionAssistantMessageParam | null = null;
  for (let i = previousMessages.length - 1; i >= 0; i--) {
    const message = previousMessages[i];
    if (message.role === 'tool') {
      continue;
    } else if (message.role === 'assistant') {
      lastAssistantMessage = message;
      break;
    } else {
      throw new Error(
        `Expected an assistant message to precede tool messages, but detected a message from the ${message.role} role instead.`,
      );
    }
  }

  // The following errors can occur due to a bug in our code or due to the user incorrectly handling
  // assistant and/or tool messages.
  if (lastAssistantMessage === null) {
    // OpenAI enforces that an assistant message must precede tool messages, and since we need the
    // assistant message to get the function arguments, we throw an error if we can't find it.
    throw new Error(
      `Could not find message from the 'assistant' role, which must precede messages from the 'tool' role.`,
    );
  }
  if (lastAssistantMessage.tool_calls === undefined) {
    throw new Error(
      `Expected 'assistant' message to contain a 'tool_calls' field because it precedes tool call messages, but no 'tool_calls' field was found.`,
    );
  }
  const toolCall = lastAssistantMessage.tool_calls.find((t) => t.id === toolMessage.tool_call_id);
  if (!toolCall) {
    throw new Error(
      `Could not find the following tool call ID in the 'assistant' message: ${toolMessage.tool_call_id}`,
    );
  }

  const tollCallContentStr = convertMessageContentToString(toolMessage.content);
  const toolResult: ToolResult = {
    call: {
      name: toolCall.function.name,
      parameters: JSON.parse(toolCall.function.arguments),
    },
    outputs: [JSON.parse(tollCallContentStr)],
  };
  return toolResult;
};

export const convertMessages = (
  unclonedMessages: CompletionParams['messages'],
): {
  messages: Array<Message>;
  lastUserMessage: string;
  toolResults: ChatRequest['toolResults'];
} => {
  const clonedMessages = structuredClone(unclonedMessages);

  // Cohere has a distinct field, `toolResults`, for the most recent tool messages. If the user's
  // `message` ends with tool messages, we pop them from the array in order to populate this field.
  const lastToolMessages = popLastToolMessageParams(clonedMessages);
  const lastToolResults = lastToolMessages?.map((toolMessage) =>
    toToolResult(toolMessage, clonedMessages),
  );

  // Cohere throws the following error if the `toolResults` field is defined and the `message` field
  // is a non-empty string: 'invalid request: cannot specify both message and tool_results in
  // multistep mode'. To avoid this error, we only populate the user message if the `toolResults`
  // aren't defined.
  const lastUserMessage =
    lastToolResults === undefined ? popLastUserMessageContentString(clonedMessages) : '';

  const chatHistory: ChatRequest['chatHistory'] = [];
  for (let i = 0; i < clonedMessages.length; i++) {
    const message = clonedMessages[i];
    if (message.role === 'tool') {
      const newToolResult = toToolResult(message, clonedMessages.slice(0, i));
      const lastChatHistoryMessage = chatHistory.at(chatHistory.length - 1);
      if (lastChatHistoryMessage !== undefined && lastChatHistoryMessage.role === 'TOOL') {
        if (lastChatHistoryMessage.toolResults === undefined) {
          // We manually populate the `toolResults` array when creating the `TOOL` message, so it
          // should always be defined here.
          throw new InvariantError(`The 'toolResults' field is undefined.`);
        }

        lastChatHistoryMessage.toolResults.push(newToolResult);
      } else {
        chatHistory.push({
          role: 'TOOL',
          toolResults: [newToolResult],
        });
      }
    } else if (message.role === 'assistant') {
      const messageContentStr = convertMessageContentToString(message.content);
      chatHistory.push({
        role: convertRole(message.role),
        message: messageContentStr,
        toolCalls: message.tool_calls?.map((toolCall) => {
          return {
            name: toolCall.function.name,
            parameters: JSON.parse(toolCall.function.arguments),
          };
        }),
      });
    } else if (typeof message.content === 'string') {
      chatHistory.push({
        role: convertRole(message.role),
        message: message.content,
      });
    } else if (Array.isArray(message.content)) {
      for (const e of message.content) {
        if (e.type === 'text') {
          chatHistory.push({
            role: convertRole(message.role),
            message: e.text,
          });
        }
      }
    }
  }

  return {
    messages: chatHistory,
    lastUserMessage,
    toolResults: lastToolResults,
  };
};

export const convertTools = (
  tools: CompletionParams['tools'],
  toolChoice: CompletionParams['tool_choice'],
): ChatRequest['tools'] => {
  if (toolChoice === 'none' || tools === undefined) {
    return undefined;
  } else {
    return tools.map(toCohereTool);
  }
};

async function* createCompletionResponseStreaming(
  response: Stream<StreamedChatResponse>,
  model: CohereModel,
  created: number,
): StreamCompletionResponse {
  let id: string | undefined;
  // Mapping from tool call index to tool call ID. We need to maintain a mapping because we create
  // our own tool call IDs and because we only want to assign a tool call index to a single ID, even
  // when its content is streamed across many chunks.
  const toolCallIdMap: Map<number, string> = new Map();

  for await (const chunk of response) {
    if (chunk.eventType === 'stream-start') {
      id = chunk.generationId;
      yield {
        choices: [
          {
            index: 0,
            finish_reason: null,
            logprobs: null,
            delta: {
              role: 'assistant',
            },
          },
        ],
        created,
        model,
        id: chunk.generationId,
        object: 'chat.completion.chunk',
      };
    }

    if (id === undefined) {
      // Should never happen because the 'stream-start' event, where the `id` field is assigned,
      // occurs first.
      throw new InvariantError(`The generated ID is undefined.`);
    }

    if (chunk.eventType === 'stream-end') {
      yield {
        choices: [
          {
            index: 0,
            finish_reason: convertFinishReason(chunk.finishReason),
            logprobs: null,
            // We return an empty delta because the returned text in the 'stream-end' event contains
            // the aggregated response.
            delta: {},
          },
        ],
        created,
        model,
        id,
        object: 'chat.completion.chunk',
      };
    } else if (
      chunk.eventType === 'text-generation' ||
      // Cohere's documentation states that a `text` field can exist on 'tool-calls-chunk' chunks if
      // the chunk does not contain a `toolCallIndex` field. However, Cohere's TypeScript type does
      // not contain a text field, which appears to be a bug. We must manually cast to the chunk to
      // `any` in order to determine whether it has a `text` field in this scenario. If the field
      // exists, we treat the chnk like a 'text-generation' chunk.
      (chunk.eventType === 'tool-calls-chunk' && typeof (chunk as any).text === 'string')
    ) {
      const text = (chunk as any).text;
      yield {
        choices: [
          {
            index: 0,
            finish_reason: null,
            logprobs: null,
            delta: {
              content: text,
            },
          },
        ],
        created,
        model,
        id,
        object: 'chat.completion.chunk',
      };
    } else if (chunk.eventType === 'tool-calls-chunk') {
      const index = chunk.toolCallDelta.index;
      if (typeof index !== 'number') {
        throw new InvariantError(`Content block index is undefined.`);
      }

      let toolCallId = toolCallIdMap.get(index);
      if (toolCallId === undefined) {
        toolCallId = nanoid();
        toolCallIdMap.set(index, toolCallId);
      }

      yield {
        choices: [
          {
            index: 0,
            finish_reason: null,
            logprobs: null,
            delta: {
              content: chunk.toolCallDelta.text,
              tool_calls: [
                {
                  index,
                  id: toolCallId,
                  type: 'function',
                  function: {
                    name: chunk.toolCallDelta.name,
                    arguments: chunk.toolCallDelta.parameters,
                  },
                },
              ],
            },
          },
        ],
        created,
        model,
        id,
        object: 'chat.completion.chunk',
      };
    }
  }
}

export class CohereHandler extends BaseHandler<CohereModel> {
  async create(
    body: ProviderCompletionParams<'cohere'>,
  ): Promise<CompletionResponse | StreamCompletionResponse> {
    this.validateInputs(body);

    if (this.opts.baseURL) {
      consoleWarn(
        `The 'baseUrl' will be ignored by Cohere because it does not support this field.`,
      );
    }

    const apiKey = this.opts.apiKey ?? process.env.COHERE_API_KEY;
    if (apiKey === undefined) {
      throw new InputError(
        "No Cohere API key detected. Please define an 'COHERE_API_KEY' environment variable or supply the API key using the 'apiKey' parameter.",
      );
    }

    const maxTokens = body.max_tokens ?? undefined;
    const p = body.top_p ?? undefined;
    const stopSequences = convertStopSequences(body.stop);
    const temperature =
      typeof body.temperature === 'number'
        ? // We divide by two because Cohere's temperature range is 0 to 1 and the input temperature
          // range is 0 to 2.
          body.temperature / 2
        : undefined;
    const tools = convertTools(body.tools, body.tool_choice);

    const { messages, lastUserMessage, toolResults } = convertMessages(body.messages);

    const input = {
      maxTokens,
      message: lastUserMessage,
      chatHistory: messages,
      model: body.model,
      stopSequences,
      temperature,
      p,
      toolResults,
      tools,
    };
    const cohere = new CohereClient({
      token: apiKey,
    });

    if (body.stream === true) {
      const created = getTimestamp();
      const response = await cohere.chatStream(input);
      return createCompletionResponseStreaming(response, body.model, created);
    } else {
      const created = getTimestamp();
      const response = await cohere.chat(input);

      const toolCalls: Array<ChatCompletionMessageToolCall> | undefined = response.toolCalls?.map(
        (toolCall) => {
          return {
            type: 'function',
            id: nanoid(),
            function: {
              name: toolCall.name,
              arguments: JSON.stringify(toolCall.parameters),
            },
          };
        },
      );

      const usage = getUsageTokens(response.meta?.billedUnits);
      const convertedResponse: CompletionResponse = {
        object: 'chat.completion',
        choices: [
          {
            finish_reason: convertFinishReason(response.finishReason),
            index: 0,
            logprobs: null,
            message: {
              role: 'assistant',
              refusal: null, // openai requires this field, fill in if Cohere ever supports
              content: response.text,
              tool_calls: toolCalls,
            },
          },
        ],
        created,
        id: response.generationId ?? null,
        model: body.model,
        usage,
      };

      return convertedResponse;
    }
  }
}
