/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { LLMRequester } from '@agent-tars/core';
import { resolveValue } from './utils';

// Terminal styling colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

/**
 * Apply color formatting to text
 */
function colorize(text: string, color: keyof typeof colors): string {
  return colors[color] + text + colors.reset;
}

/**
 * Process the request command, sending a raw request to the LLM provider
 */
export async function processRequestCommand(options: {
  provider: string;
  model: string;
  body: string;
  apiKey?: string;
  baseURL?: string;
  stream?: boolean;
  format?: 'raw' | 'semantic';
}): Promise<void> {
  const { provider, model, body, stream, format = 'raw' } = options;
  const apiKey = resolveValue(options.apiKey, 'API key');
  const baseURL = resolveValue(options.baseURL, 'base URL');

  // Validate required options
  if (!provider) {
    console.error(colorize('Error: --provider is required', 'red'));
    process.exit(1);
  }

  if (!model) {
    console.error(colorize('Error: --model is required', 'red'));
    process.exit(1);
  }

  if (!body) {
    console.error(colorize('Error: --body is required', 'red'));
    process.exit(1);
  }

  // Validate format option
  if (format !== 'raw' && format !== 'semantic') {
    console.error(colorize('Error: --format must be either "raw" or "semantic"', 'red'));
    process.exit(1);
  }

  try {
    const requester = new LLMRequester();

    console.log(
      colorize('🚀 Sending request to ', 'cyan') +
        colorize(provider, 'bold') +
        colorize('/', 'dim') +
        colorize(model, 'bold'),
    );

    // Resolve body file path if it's relative
    let resolvedBody = body;
    if (!body.startsWith('/') && !body.startsWith('{')) {
      resolvedBody = path.resolve(process.cwd(), body);
    }

    // Note: We're passing the stream parameter to the requester, but will rely on response type for handling
    const response = await requester.request({
      provider,
      model,
      body: resolvedBody,
      apiKey,
      baseURL,
      stream,
    });

    console.log('\n' + colorize('Response:', 'bold'));
    console.log(colorize('──────────────────────────────────────────────────', 'gray'));

    // Check if the response is a stream by checking if it has the Symbol.asyncIterator
    if (response[Symbol.asyncIterator]) {
      // Handle streaming response
      console.log(colorize('🔄 Processing streaming response...', 'magenta'));

      // Handle streaming response
      for await (const chunk of response) {
        // Handle based on format mode
        if (format === 'raw') {
          // Print raw JSON chunk
          console.log(JSON.stringify(chunk));
        } else {
          // Semantic format - print content in a more readable way
          // Print chunk delta content if available
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            process.stdout.write(content);
          }

          // Check for special delta content
          const delta = chunk.choices[0]?.delta;
          if (delta?.reasoning_content) {
            process.stdout.write(colorize(`[Reasoning]: ${delta.reasoning_content}`, 'cyan'));
          }

          // Print tool calls if present
          if (delta?.tool_calls) {
            console.log(
              '\n' + colorize('[Tool Call]:', 'magenta') + JSON.stringify(delta.tool_calls),
            );
          }
        }
      }
    } else {
      // Non-streaming mode
      if (format === 'raw') {
        // Raw format - just print the JSON
        console.log(JSON.stringify(response, null, 2));
      } else {
        // Semantic format - format the response in a more readable way
        const message = response.choices[0]?.message;
        if (message) {
          if (message.content) {
            console.log(colorize('[Content]: ', 'green') + message.content);
          }

          if (message.tool_calls) {
            console.log('\n' + colorize('[Tool Calls]:', 'magenta'));
            message.tool_calls.forEach((call: any, index: number) => {
              console.log(
                '  ' +
                  colorize(`${index + 1}.`, 'cyan') +
                  ' ' +
                  colorize(call.function?.name || 'Unknown', 'bold'),
              );
              console.log(
                '     ' + colorize('Arguments:', 'dim') + ' ' + call.function?.arguments || '{}',
              );
            });
          }

          if (message.reasoning_content) {
            console.log('\n' + colorize('[Reasoning]: ', 'cyan') + message.reasoning_content);
          }
        } else {
          console.log('No message content in response');
        }
      }
    }

    console.log(colorize('──────────────────────────────────────────────────', 'gray'));
  } catch (error) {
    console.error('\n' + colorize('❌ Request failed:', 'red'));
    console.error(error);
    process.exit(1);
  }
}
