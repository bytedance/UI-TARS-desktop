/**
 * The following code is modified based on
 * https://github.com/token-js/token.js/blob/main/src/handlers/mistral.ts
 *
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

import MistralClient, {
  ChatCompletionResponse,
  ChatCompletionResponseChoice,
  ChatCompletionResponseChunk,
  ChatRequest,
  Message,
  ResponseFormat,
  ToolCalls,
} from '@mistralai/mistralai';
import {
  ChatCompletionChunk,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from 'openai/resources/index';
import { ChatCompletionContentPartText } from 'openai/src/resources/index.js';

import { CompletionParams, MistralModel, ProviderCompletionParams } from '../chat/index.js';
import { CompletionResponse, StreamCompletionResponse } from '../userTypes/index.js';
import { BaseHandler } from './base.js';
import { InputError } from './types.js';
import { convertMessageContentToString } from './utils.js';

export const findLinkedToolCallName = (
  messages: ChatCompletionMessage[],
  toolCallId: string,
): string => {
  for (const message of messages) {
    for (const toolCall of message?.tool_calls ?? []) {
      if (toolCall.id === toolCallId) {
        return toolCall.function.name;
      }
    }
  }

  throw new InputError(`Tool call with id ${toolCallId} not found in messages`);
};

export const convertMessages = (
  messages: (ChatCompletionMessageParam | ChatCompletionMessage)[],
): Array<Message | ChatCompletionResponseChoice['message']> => {
  return messages.map((message) => {
    const messageContent = convertMessageContentToString(message.content);
    if (message.role === 'tool') {
      const name = findLinkedToolCallName(
        messages as ChatCompletionMessage[],
        message.tool_call_id,
      );

      return {
        name,
        role: 'tool',
        content: messageContent,
        tool_call_id: message.tool_call_id,
      };
    }

    if (message.role === 'system') {
      return {
        role: message.role,
        content: messageContent,
      };
    } else if (message.role === 'assistant') {
      return {
        role: message.role,
        content: messageContent,
        tool_calls: message.tool_calls ?? null,
      };
    } else if (message.role === 'user') {
      const content =
        typeof message.content === 'string'
          ? message.content
          : message.content?.map((m) => (m as ChatCompletionContentPartText).text);
      return {
        role: message.role,
        content,
      };
    } else {
      throw new Error('Function messages are deprecated.');
    }
  });
};

export const convertTools = (
  tools: CompletionParams['tools'],
  specificFunctionName?: string,
): ChatRequest['tools'] => {
  if (!tools) {
    return undefined;
  }

  const specifiedTool = tools.filter((tool) => {
    if (specificFunctionName === undefined) {
      return true;
    } else {
      return tool.function.name === specificFunctionName;
    }
  });

  if (specificFunctionName !== undefined && specifiedTool.length === 0) {
    throw new InputError(`Tool with name ${specificFunctionName} not found in tool list`);
  }

  return specifiedTool.map((tool) => {
    return {
      type: 'function',
      function: {
        name: tool.function.name,
        description: tool.function.description ?? '',
        parameters: tool.function.parameters ?? {},
      },
    };
  });
};

export const convertToolConfig = (
  toolChoice: CompletionParams['tool_choice'],
  tools: CompletionParams['tools'],
): {
  toolChoice: ChatRequest['toolChoice'];
  tools: ChatRequest['tools'];
} => {
  // If tool choise is an object, then it is a required specific function
  if (typeof toolChoice === 'object') {
    return {
      // Mistral does not fields that allow for specifying a specific tool out of a list, so instead we
      // use the toolChoice `any` to force a tool to be used, and then we filter the tool list to only include
      // the function that was specified.
      toolChoice: 'any',
      tools: convertTools(tools, toolChoice.function.name),
    };
  }

  switch (toolChoice) {
    case 'auto':
      return {
        toolChoice: 'auto',
        tools: convertTools(tools),
      };
    case 'none':
      return {
        toolChoice: 'none',
        tools: convertTools(tools),
      };
    case 'required':
      return {
        toolChoice: 'any',
        tools: convertTools(tools),
      };
    case undefined:
      return {
        toolChoice: undefined,
        tools: convertTools(tools),
      };
    default:
      throw new InputError(`Invalid tool choice: ${toolChoice}`);
  }
};

export const convertToolCalls = (
  toolResponse: ToolCalls[] | null | undefined,
): ChatCompletionMessageToolCall[] | undefined => {
  if (!toolResponse) {
    return undefined;
  }

  return toolResponse.map((tool) => {
    return {
      id: tool.id,
      type: 'function',
      function: {
        name: tool.function.name,
        arguments: tool.function.arguments,
      },
    };
  });
};

export const convertStreamToolCalls = (
  toolResponse: ToolCalls[] | null | undefined,
): Array<ChatCompletionChunk.Choice.Delta.ToolCall> | undefined => {
  if (!toolResponse) {
    return undefined;
  }

  return convertToolCalls(toolResponse)?.map((toolCall, index) => {
    return {
      ...toolCall,
      index,
    };
  });
};

async function* toStreamResponse(
  result: AsyncGenerator<ChatCompletionResponseChunk, void, unknown>,
): StreamCompletionResponse {
  for await (const chunk of result) {
    yield {
      id: chunk.id,
      created: chunk.created,
      object: chunk.object,
      model: chunk.model,
      choices: chunk.choices.map((choice) => {
        return {
          index: choice.index,
          delta: {
            role: 'assistant',
            content: choice.delta.content,
            tool_calls: convertStreamToolCalls(choice.delta.tool_calls),
          },
          finish_reason: choice.finish_reason as any,
          logprobs: null,
        };
      }),
      usage: chunk.usage ?? undefined,
    };
  }
}

const toCompletionResponse = (result: ChatCompletionResponse): CompletionResponse => {
  return {
    id: result.id,
    created: result.created,
    object: result.object,
    model: result.model,
    choices: result.choices.map((choice) => {
      return {
        index: choice.index,
        message: {
          role: 'assistant',
          refusal: null,
          content: choice.message.content,
          tool_calls: convertToolCalls(choice.message.tool_calls),
        },
        finish_reason: choice.finish_reason as any,
        logprobs: null,
      };
    }),
    usage: result.usage,
  };
};

export class MistralHandler extends BaseHandler<MistralModel> {
  async create(
    body: ProviderCompletionParams<'mistral'>,
  ): Promise<CompletionResponse | StreamCompletionResponse> {
    this.validateInputs(body);

    const apiKey = this.opts.apiKey ?? process.env.MISTRAL_API_KEY;

    if (apiKey === undefined) {
      throw new InputError(
        'API key is required for Mistral, define MISTRAL_API_KEY in your environment or specifty the apiKey option.',
      );
    }

    const endpoint = this.opts.baseURL ?? undefined;
    const client = new MistralClient(apiKey, endpoint);
    const responseFormat: ResponseFormat | undefined =
      body.response_format?.type === 'json_object'
        ? {
            type: 'json_object',
          }
        : undefined;

    const temperature =
      typeof body.temperature === 'number'
        ? // We divide by two because Mistral's temperature range is 0 to 1 and the input temperature
          // range is 0 to 2.
          body.temperature / 2
        : undefined;

    const { toolChoice, tools } = convertToolConfig(body.tool_choice, body.tools);

    const messages = convertMessages(body.messages);

    const options: ChatRequest = {
      model: body.model,
      messages: messages as Message[],
      temperature,
      maxTokens: body.max_tokens ?? undefined,
      topP: body.top_p ?? undefined,
      responseFormat,
      toolChoice,
      tools,
      // Mistral does not support `stop`
    };

    if (body.stream) {
      const chatResponseStream = client.chatStream(options);
      return toStreamResponse(chatResponseStream);
    } else {
      const chatResponse = await client.chat(options);
      return toCompletionResponse(chatResponse);
    }
  }
}
