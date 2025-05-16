/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { LLMRequester } from '@agent-tars/core';

/**
 * Check if string is in environment variable format (all uppercase letters and underscores)
 */
function isEnvironmentVariableName(str: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(str);
}

/**
 * Handle possible environment variable API key
 * If the parameter looks like an environment variable name, try to get the actual value from the environment
 */
function resolveApiKey(apiKey: string | undefined): string | undefined {
  if (!apiKey) return undefined;

  if (isEnvironmentVariableName(apiKey)) {
    const envValue = process.env[apiKey];
    if (envValue) {
      console.log(`🔑 Using API key from environment variable: ${apiKey}`);
      return envValue;
    } else {
      console.warn(`⚠️ Environment variable ${apiKey} not found, using as literal value`);
    }
  }

  return apiKey;
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
  const { provider, model, body, baseURL, stream, format = 'raw' } = options;
  const apiKey = resolveApiKey(options.apiKey);

  // Validate required options
  if (!provider) {
    console.error('Error: --provider is required');
    process.exit(1);
  }

  if (!model) {
    console.error('Error: --model is required');
    process.exit(1);
  }

  if (!body) {
    console.error('Error: --body is required');
    process.exit(1);
  }

  // Validate format option
  if (format !== 'raw' && format !== 'semantic') {
    console.error('Error: --format must be either "raw" or "semantic"');
    process.exit(1);
  }

  try {
    const requester = new LLMRequester();

    console.log(`🚀 Sending request to ${provider}/${model}...`);

    // Resolve body file path if it's relative
    let resolvedBody = body;
    if (!body.startsWith('/') && !body.startsWith('{')) {
      resolvedBody = path.resolve(process.cwd(), body);
    }

    if (stream) {
      console.log('🔄 Using streaming mode...');

      const streamResponse = await requester.request({
        provider,
        model,
        body: resolvedBody,
        apiKey,
        baseURL,
        stream: true,
      });

      // Handle streaming response
      console.log('\n🔽 Streaming response:');
      console.log();
      console.log();
      console.log();

      for await (const chunk of streamResponse) {
        // Handle based on format mode
        if (format === 'raw') {
          // Print raw JSON chunk
          console.log(JSON.stringify(chunk, null, 2));
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
            process.stdout.write(`[Reasoning]: ${delta.reasoning_content}`);
          }

          // Print tool calls if present
          if (delta?.tool_calls) {
            console.log(`\n[Tool Call]: ${JSON.stringify(delta.tool_calls)}`);
          }
        }
      }
    } else {
      // Non-streaming mode
      const response = await requester.request({
        provider,
        model,
        body: resolvedBody,
        apiKey,
        baseURL,
        stream: false,
      });

      console.log('\n🔽 Response:');
      console.log();
      console.log();
      console.log();

      if (format === 'raw') {
        // Raw format - just print the JSON
        console.log(JSON.stringify(response, null, 2));
      } else {
        // Semantic format - format the response in a more readable way
        const message = response.choices[0]?.message;
        if (message) {
          if (message.content) {
            console.log(`[Content]: ${message.content}`);
          }

          if (message.tool_calls) {
            console.log('\n[Tool Calls]:');
            message.tool_calls.forEach((call: any, index: number) => {
              console.log(`  ${index + 1}. ${call.function?.name || 'Unknown'}`);
              console.log(`     Arguments: ${call.function?.arguments || '{}'}`);
            });
          }

          if (message.reasoning_content) {
            console.log(`\n[Reasoning]: ${message.reasoning_content}`);
          }
        } else {
          console.log('No message content in response');
        }
      }
    }
  } catch (error) {
    console.error('\n❌ Request failed:');
    console.error(error);
    process.exit(1);
  }
}
