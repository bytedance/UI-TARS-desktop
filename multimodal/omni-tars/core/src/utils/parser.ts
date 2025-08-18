/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatCompletionMessageToolCall } from '@tarko/agent-interface';

interface ParsedContent {
  answer: string;
  think: string;
  tools: ChatCompletionMessageToolCall[];
}

/**
 * Generate a unique tool call ID
 */
function generateToolCallId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extract think content from various think tags (think, think_*, or custom think tags)
 */
function extractThinkContent(content: string): string {
  // Match think or think_* tags with a single regex
  const thinkMatch = content.match(/<think[^>]*>([\s\S]*?)<\/think[^>]*>/);
  return thinkMatch ? thinkMatch[1].trim() : '';
}

/**
 * Extract answer content from answer tag or content outside think tags
 */
function extractAnswerContent(content: string): string | null {
  // First try to extract from <answer> tag
  const answerMatch = content.match(/<answer>([\s\S]*?)<\/answer>/);
  if (answerMatch) {
    return answerMatch[1].trim();
  }

  return null;
}

function isUndefined(str: string | null | undefined) {
  return typeof str === 'undefined' || str === null;
}

function finalizeAnswer(parsed: {
  answer: string | null;
  think: string;
  tools?: ChatCompletionMessageToolCall[];
  content: string;
}) {
  const { answer, tools = [], think, content } = parsed;

  // If no answer tag is found, but there is content and no tool calls, use the entire content as the answer
  if (isUndefined(answer) && !tools.length && content.trim()) {
    // The remaining content after removing the think part is used as the answer
    let contentWithoutThink = content;

    if (think) {
      contentWithoutThink = content.replace(/<think[^>]*>[\s\S]*?<\/think[^>]*>/g, '').trim();
    }

    if (contentWithoutThink) {
      return contentWithoutThink;
    }
  }

  if (tools.length > 0) {
    // If a tool call is detected but there is no explicit answer, the answer should be empty
    return '';
  }

  return answer;
}

/**
 * Parse code environment content and extract tool calls
 */
export function parseCodeContent(c: string): ParsedContent {
  const content = enhanceContent(c);
  const think = extractThinkContent(content);
  let answer = extractAnswerContent(content);

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
      const parameterMatches = codeEnvContent.matchAll(
        /<parameter=([^>]+)>([\s\S]*?)<\/parameter>/g,
      );
      for (const match of parameterMatches) {
        parameters[match[1]] = match[2].trim();
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

  answer = finalizeAnswer({ answer, tools, think, content });

  return {
    think,
    answer: answer || '',
    tools,
  };
}

/**
 * Parse MCP environment content and extract tool calls
 */
export function parseMcpContent(c: string): ParsedContent {
  const content = enhanceContent(c);
  const think = extractThinkContent(content);
  let answer = extractAnswerContent(content);

  const tools: ChatCompletionMessageToolCall[] = [];

  // Extract mcp_env function calls
  const mcpEnvMatch = content.match(/<mcp_env>([\s\S]*?)<\/mcp_env>/);
  if (mcpEnvMatch) {
    const mcpEnvContent = mcpEnvMatch[1];

    // Extract function calls between FunctionCallBegin and FunctionCallEnd
    const functionCallMatch = mcpEnvContent.match(
      /<\|FunctionCallBegin\|>\s*(\[[\s\S]*?\])\s*<\|FunctionCallEnd\|>/,
    );
    if (functionCallMatch) {
      try {
        const functionCallData = JSON.parse(functionCallMatch[1]) as Array<{
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
  answer = finalizeAnswer({ answer, tools, think, content });

  return {
    think,
    answer: answer || '',
    tools,
  };
}

/**
 * Parse computer environment content and extract tool calls
 */
export function parseComputerContent(content: string): ParsedContent {
  const think = extractThinkContent(content);
  let answer = extractAnswerContent(content);

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

  answer = finalizeAnswer({ answer, tools, think, content });

  return {
    think,
    answer: answer || '',
    tools,
  };
}

/**
 * Complete environment tags in content
 *
 * This function ensures that environment tags are properly closed by adding
 * missing closing tags for mcp_env and code_env elements.
 *
 * @param c - The content string to process
 * @returns The content with properly closed environment tags
 */
function enhanceContent(c: string): string {
  if (c.includes('<mcp_env>') && !c.includes('</mcp_env>')) {
    return c + '\n</mcp_env>';
  }
  if (c.includes('<code_env>') && !c.includes('</code_env>')) {
    return c + '\n</code_env>';
  }
  return c;
}
