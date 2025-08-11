/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatCompletionMessageToolCall } from '@tarko/agent-interface';

interface ParsedContent {
  answer: string;
  think: string;
  tools?: ChatCompletionMessageToolCall[];
}

/**
 * Generate a unique tool call ID
 */
function generateToolCallId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extract think content from think_never_used tag
 */
function extractThinkContent(content: string): string {
  const thinkMatch = content.match(
    /<think_never_used_51bce0c785ca2f68081bfa7d91973934>([\s\S]*?)<\/think_never_used_51bce0c785ca2f68081bfa7d91973934>/,
  );
  return thinkMatch ? thinkMatch[1].trim() : '';
}

/**
 * Extract answer content from answer tag
 */
function extractAnswerContent(content: string): string {
  const answerMatch = content.match(/<answer>([\s\S]*?)<\/answer>/);
  return answerMatch ? answerMatch[1].trim() : '';
}

/**
 * Parse code environment content and extract tool calls
 */
export function parseCodeContent(content: string): ParsedContent {
  const think = extractThinkContent(content);
  const answer = extractAnswerContent(content);

  const tools: ChatCompletionMessageToolCall[] = [];

  // Extract code_env function calls
  const codeEnvMatch = content.match(/<code_env>([\s\S]*?)<\/code_env>/);
  if (codeEnvMatch) {
    const codeEnvContent = codeEnvMatch[1];

    // Extract function name
    const functionMatch = codeEnvContent.match(/<function=([^>]+)>/);
    if (functionMatch) {
      const functionName = functionMatch[1];

      // Extract parameters
      const parameters: Record<string, string> = {};
      const parameterMatches = codeEnvContent.matchAll(/<parameter=([^>]+)>([^<]*)/g);
      for (const match of parameterMatches) {
        parameters[match[1]] = match[2];
      }

      tools.push({
        id: generateToolCallId(),
        type: 'function' as const,
        function: {
          name: functionName,
          arguments: JSON.stringify(parameters),
        },
      });
    }
  }

  return {
    think,
    answer,
    ...(tools.length > 0 && { tools }),
  };
}

/**
 * Parse MCP environment content and extract tool calls
 */
export function parseMcpContent(content: string): ParsedContent {
  const think = extractThinkContent(content);
  const answer = extractAnswerContent(content);

  const tools: ChatCompletionMessageToolCall[] = [];

  // Extract mcp_env function calls
  const mcpEnvMatch = content.match(/<mcp_env>([\s\S]*?)<\/mcp_env>/);
  if (mcpEnvMatch) {
    const mcpEnvContent = mcpEnvMatch[1];

    // Extract function calls between FunctionCallBegin and FunctionCallEnd
    const functionCallMatch = mcpEnvContent.match(
      /<\|FunctionCallBegin\|>\[([\s\S]*?)\]<\|FunctionCallEnd\|>/,
    );
    if (functionCallMatch) {
      try {
        const functionCallData = JSON.parse(`[${functionCallMatch[1]}]`) as Array<{
          name: string;
          parameters: Record<string, unknown>;
        }>;

        for (const call of functionCallData) {
          if (call.name && call.parameters) {
            tools.push({
              id: generateToolCallId(),
              type: 'function' as const,
              function: {
                name: call.name,
                arguments: JSON.stringify(call.parameters),
              },
            });
          }
        }
      } catch (error) {
        console.error('Failed to parse MCP function call data:', error);
      }
    }
  }

  return {
    think,
    answer,
    ...(tools.length > 0 && { tools }),
  };
}

/**
 * Parse computer environment content and extract tool calls
 */
export function parseComputerContent(content: string): ParsedContent {
  const think = extractThinkContent(content);
  const answer = extractAnswerContent(content);

  const tools: ChatCompletionMessageToolCall[] = [];

  // Extract computer_env actions
  const computerEnvMatch = content.match(/<computer_env>([\s\S]*?)<\/computer_env>/);
  if (computerEnvMatch) {
    const computerEnvContent = computerEnvMatch[1].trim();

    // Parse action format: Action: click(point='<point>100 200</point>')
    const actionMatch = computerEnvContent.match(/Action:\s*(\w+)\(([^)]*)\)/);
    if (actionMatch) {
      const actionName = actionMatch[1];
      const actionParams = actionMatch[2];

      // Parse parameters
      const parameters: Record<string, string | { x: number; y: number }> = {};

      // Handle point parameter specially
      const pointMatch = actionParams.match(/point='<point>([^<]+)<\/point>'/);
      if (pointMatch) {
        const [x, y] = pointMatch[1].split(' ').map(Number);
        parameters.point = { x, y };
      }

      // Handle other parameters
      const otherParams = actionParams.replace(/point='<point>[^<]+<\/point>'/, '').split(',');
      for (const param of otherParams) {
        const trimmed = param.trim();
        if (trimmed) {
          const [key, value] = trimmed.split('=').map((s) => s.trim());
          if (key && value) {
            parameters[key] = value.replace(/^['"]|['"]$/g, ''); // Remove quotes
          }
        }
      }

      tools.push({
        id: generateToolCallId(),
        type: 'function' as const,
        function: {
          name: actionName,
          arguments: JSON.stringify(parameters),
        },
      });
    }
  }

  return {
    think,
    answer,
    ...(tools.length > 0 && { tools }),
  };
}
