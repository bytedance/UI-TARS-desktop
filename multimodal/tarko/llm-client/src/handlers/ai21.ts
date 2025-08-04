/**
 * The following code is modified based on
 * https://github.com/token-js/token.js/blob/main/src/handlers/ai21.ts
 *
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

import {
  AI21Model,
  CompletionParams,
  LLMChatModel,
  ProviderCompletionParams,
} from '../chat/index.js';
import { CompletionResponse, StreamCompletionResponse } from '../userTypes/index.js';
import { BaseHandler } from './base.js';
import { InputError } from './types.js';
import { convertMessageContentToString, getTimestamp } from './utils.js';

type AI21ChatCompletionParams = {
  model: string;
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string | string[];
  n?: number;
  stream?: boolean;
  logprobs?: never;
  top_logprobs?: never;
};

type AI21ChatCompletionResponseNonStreaming = {
  id: string;
  choices: {
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: 'stop' | 'length';
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

type AI21ChatCompletionResponseStreaming = {
  id: string;
  choices: [
    {
      index: number;
      delta: { role?: 'assistant'; content?: string };
      finish_reason: 'stop' | 'length' | null;
    },
  ];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

const convertMessages = (
  messages: CompletionParams['messages'],
): AI21ChatCompletionParams['messages'] => {
  const output: AI21ChatCompletionParams['messages'] = [];

  let previousRole: 'user' | 'assistant' = 'user';
  let currentMessages: Array<string> = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (i === 0 && message.role === 'system') {
      output.push({
        role: 'system',
        content: convertMessageContentToString(message.content),
      });
    } else if (
      message.role === 'user' ||
      message.role === 'assistant' ||
      message.role === 'system'
    ) {
      // AI21's documentation says to only use the `system` role for the first
      // message in their `messages` array. If the user defines system messages later in their
      // prompt, we replace it with the `user` role and prepend 'System: ' to its content. We do
      // this instead of putting every system message in AI21's `system` string parameter so that
      // the order of the user-defined `messages` remains the same, even when the system messages
      // are interspersed with messages from other roles.
      const newRole = message.role === 'user' || message.role === 'system' ? 'user' : 'assistant';

      if (previousRole !== newRole) {
        output.push({
          role: previousRole,
          content: currentMessages.join('\n'),
        });
        currentMessages = [];
      }

      if (typeof message.content === 'string') {
        const text = message.role === 'system' ? `System: ${message.content}` : message.content;
        currentMessages.push(text);
      } else if (Array.isArray(message.content)) {
        const convertedContent = message.content.map((e) => {
          if (e.type === 'text') {
            const text = message.role === 'system' ? `System: ${e.text}` : e.text;
            return text;
          } else {
            throw new InputError(`AI21 does not support images.`);
          }
        });
        currentMessages.push(...convertedContent);
      }

      previousRole = newRole;
    }
  }

  if (currentMessages.length > 0) {
    output.push({
      role: previousRole,
      content: currentMessages.join('\n'),
    });
  }

  return output;
};

async function* createCompletionResponseStreaming(
  responseStream: ReadableStream<Uint8Array>,
  model: LLMChatModel,
  created: number,
): StreamCompletionResponse {
  const reader = responseStream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === 'data: [DONE]') {
          return;
        }

        if (line.trim().startsWith('data:')) {
          const response: AI21ChatCompletionResponseStreaming = JSON.parse(
            line.replace(/^data:\s*/, '').trim(),
          );

          let content = '';
          for (const choice of response.choices) {
            if (typeof choice.delta.content === 'string') {
              content += choice.delta.content;
            }
          }

          const { id, choices } = response;
          const finish_reason = choices[0].finish_reason;

          yield {
            choices: [
              {
                index: 0,
                finish_reason,
                logprobs: null,
                delta: {
                  role: 'assistant',
                  content,
                },
              },
            ],
            id,
            created,
            model,
            object: 'chat.completion.chunk',
          };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export class AI21Handler extends BaseHandler<AI21Model> {
  validateInputs(body: CompletionParams): void {
    super.validateInputs(body);

    if (typeof body.n === 'number' && (body.n > 16 || body.n < 0)) {
      throw new InputError(
        `AI21 requires that the 'n' parameter is a value between 0 and 16, inclusive. Instead, got: ${body.n}`,
      );
    }

    if (typeof body.n === 'number' && body.stream === true && body.n > 1) {
      throw new InputError(
        `AI21 requires that 'n' equals '1' when streaming is enabled. Received an 'n' value of: ${body.n}`,
      );
    }
  }

  async create(
    body: ProviderCompletionParams<'ai21'>,
  ): Promise<CompletionResponse | StreamCompletionResponse> {
    this.validateInputs(body);

    const apiKey = this.opts.apiKey ?? process.env.AI21_API_KEY;
    if (apiKey === undefined) {
      throw new InputError(
        "No AI21 API key detected. Please define an 'AI21_API_KEY' environment variable or supply the API key using the 'apiKey' parameter.",
      );
    }

    const messages = convertMessages(body.messages);

    const params: AI21ChatCompletionParams = {
      max_tokens: body.max_tokens ?? undefined,
      messages,
      model: body.model,
      n: body.n ?? undefined,
      stop: body.stop ?? undefined,
      temperature: body.temperature ?? undefined,
      top_p: body.top_p ?? undefined,
      stream: body.stream ?? undefined,
    };

    const created = getTimestamp();
    const response = await fetch('https://api.ai21.com/studio/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (body.stream === true) {
      return createCompletionResponseStreaming(
        response.body as ReadableStream<Uint8Array>,
        body.model,
        created,
      );
    } else {
      const data: AI21ChatCompletionResponseNonStreaming = await response.json();

      const convertedChoices = data.choices.map((choice) => {
        return {
          ...choice,
          message: {
            ...choice.message,
            refusal: null,
          },
          logprobs: null,
        };
      });
      const convertedResponse: CompletionResponse = {
        choices: convertedChoices,
        id: data.id,
        usage: data.usage,
        created,
        model: body.model,
        object: 'chat.completion',
      };

      return convertedResponse;
    }
  }
}
