/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MCPAgent, Tool } from '../../src';
import { LogLevel, MCPAgentOptions } from '@tarko/mcp-agent-interface';
import { join } from 'path';

const MAX_TOOL_RESULT_LENGTH = 20000;
const TOOL_BLACK_LIST = ['browser_get_html', 'browser_get_text'];

export class MyMCPAgent extends MCPAgent {
  onRetrieveTools(tools: Tool[]): Tool[] {
    return tools
      .filter((tool) => !TOOL_BLACK_LIST.includes(tool.name))
      .map<Tool>((tool) => {
        if (tool.schema.type === 'object' && !tool.schema.properties) {
          tool.schema.properties = {};
          // if (
          //   tool.name === 'browser_get_clickable_elements' ||
          //   tool.name === 'browser_get_markdown' ||
          //   tool.name === 'browser_read_links'
          // ) {
          //   tool.schema = {};
          //   console.log('tool', tool);
          // }
        }

        return tool;
      });
  }
  // onAfterToolCall(id: string, toolCall: { toolCallId: string; name: string }, result: unknown) {
  //   if (Array.isArray(result)) {
  //     return result.map((item) => {
  //       if (item.type === 'text' && item.text.length > MAX_TOOL_RESULT_LENGTH) {
  //         console.log('BIG TOOL RESULT', item.text.length);
  //         return {
  //           ...item,
  //           text: item.text.slice(0, MAX_TOOL_RESULT_LENGTH),
  //         };
  //       }
  //       return item;
  //     });
  //   }
  // }
}

export const getCommonOptions = (filename: string): MCPAgentOptions => ({
  instructions:
    'You are GitHub Reviewer, a specialized assistant designed to help with code review tasks. ' +
    'You excel at analyzing pull requests, identifying potential bugs, security issues, and suggesting code improvements. ' +
    'You should focus on code quality, maintainability, performance, and adherence to best practices. ' +
    'When reviewing code, consider readability, potential edge cases, error handling, and test coverage. ' +
    'Provide constructive feedback and suggest specific improvements when possible.\n\n' +
    'IMPORTANT WORKFLOW REQUIREMENTS:\n' +
    '1. You MUST browse through ALL code changes in the pull request before providing feedback. Do not skip any files or changes.\n' +
    '2. After reviewing all changes, create a comprehensive review report with the following sections:\n' +
    '   - Summary of changes\n' +
    '   - Potential issues and bugs\n' +
    '   - Code quality considerations\n' +
    '   - Suggested improvements\n' +
    '   - Overall assessment\n' +
    '3. ALWAYS include relevant code snippets in your report to illustrate your points. For each important issue or suggestion, ' +
    'include the corresponding code before and after the change (if applicable) in markdown code blocks with proper syntax highlighting.\n' +
    '4. When highlighting significant changes, use the format:\n' +
    '   ```diff\n' +
    '   - removed code\n' +
    '   + added code\n' +
    '   ```\n' +
    `5. ALWAYS use the "write_file" tool to save your final review report to a file named ${filename} in the current directory.\n\n` +
    'Make extensive use of the playwright browsing tool to navigate GitHub repositories, ' +
    'examine code changes in PRs, understand context by exploring related files, and analyze commit histories. ' +
    'Take screenshots of specific code sections when they help illustrate complex issues or changes. ' +
    'Your reviews should be thorough yet easy to understand, with code examples making your feedback concrete and actionable. ' +
    "Remember that including actual code snippets makes your reports more vivid and helps the developer understand exactly what you're referring to." +
    "\n\nIMPORTANT: No matter what, you should always complete the user's task unless it is absolutely impossible. " +
    'Even if you encounter difficulties or limitations, make your best effort to fulfill the request and ' +
    'provide value to the user. Only state something is impossible when you have exhausted all possible approaches.',
  mcpServers: {
    browser: {
      command: 'npx',
      args: ['@agent-infra/mcp-server-browser@latest'],
    },
    filesystem: {
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-filesystem',
        join(__dirname, 'filesystem'),
        '/tmp/',
      ],
    },
  },

  maxIterations: 100,
  logLevel: LogLevel.DEBUG,
});

// /Users/chenhaoli/workspace/code/UI-TARS-desktop-5/multimodal/mcp-agent/examples/github-reviewer-agent/filesystem

export const runOptions = {
  // input: 'Review https://github.com/bytedance/UI-TARS-desktop/pull/534',
  input: 'Review https://github.com/bytedance/UI-TARS-desktop/pull/697',
};

export async function run(agent: MCPAgent) {
  await agent.initialize();
  const tools = agent.getTools();
  console.log(`\nAvailable tools (${tools.length}):`);
  for (const tool of tools) {
    console.log(`- ${tool.name}: ${tool.description}`);
  }

  const reviewFeedback = await agent.run(runOptions);
  console.log('--------------------------------------------------');
  console.log(`🔍 Review feedback: ${reviewFeedback}`);
  console.log('==================================================\n');
}
