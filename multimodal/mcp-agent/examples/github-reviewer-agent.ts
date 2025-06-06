/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { join } from 'path';
import { MCPAgent } from '../src';
import { TEST_MODEL_PROVIDERS } from '@multimodal/agent/_config';

async function main() {
  const agent = new MCPAgent({
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
      '5. ALWAYS use the filesystem tool to save your final review report to a file named "REVIEW_RESULT.md" in the current directory.\n\n' +
      'Make extensive use of the playwright browsing tool to navigate GitHub repositories, ' +
      'examine code changes in PRs, understand context by exploring related files, and analyze commit histories. ' +
      'Take screenshots of specific code sections when they help illustrate complex issues or changes. ' +
      'Your reviews should be thorough yet easy to understand, with code examples making your feedback concrete and actionable. ' +
      "Remember that including actual code snippets makes your reports more vivid and helps the developer understand exactly what you're referring to.",
    model: {
      providers: TEST_MODEL_PROVIDERS,
    },
    mcpServers: {
      playwright: {
        command: 'npx',
        args: ['@playwright/mcp@latest'],
      },
      filesystem: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', join(__dirname, 'filesystem')],
      },
    },
  });

  try {
    await agent.initialize();
    const tools = agent.getTools();
    console.log(`\nAvailable tools (${tools.length}):`);
    for (const tool of tools) {
      console.log(`- ${tool.name}: ${tool.description}`);
    }

    // GitHub PR review related queries
    const queries = ['Review https://github.com/bytedance/UI-TARS-desktop/pull/534'];

    for (const query of queries) {
      console.log('\n==================================================');
      console.log(`👤 Review request: ${query}`);
      console.log('==================================================');

      const reviewFeedback = await agent.run(query);

      console.log('--------------------------------------------------');
      console.log(`🔍 Review feedback: ${reviewFeedback}`);
      console.log('==================================================\n');
    }
  } catch (error) {
    console.error('Error during code review:', error);
  } finally {
    await agent.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
