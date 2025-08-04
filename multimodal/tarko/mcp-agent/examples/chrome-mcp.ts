/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LogLevel, MCPAgent, Tool } from '../src';

const MAX_TOOL_RESULT_LENGTH = 20000;

const TOOL_BLACK_LIST = ['browser_get_html', 'browser_get_text'];

class BrowserAgent extends MCPAgent {
  onRetrieveTools(tools: Tool[]): Tool[] {
    return tools.filter((tool) => !TOOL_BLACK_LIST.includes(tool.name));
  }
  onAfterToolCall(id: string, toolCall: { toolCallId: string; name: string }, result: unknown) {
    if (Array.isArray(result)) {
      return result.map((item) => {
        if (item.type === 'text' && item.text.length > MAX_TOOL_RESULT_LENGTH) {
          console.log('BIG TOOL RESULT', item.text.length);
          return {
            ...item,
            text: item.text.slice(0, MAX_TOOL_RESULT_LENGTH),
          };
        }
        return item;
      });
    }
  }
}

async function main() {
  const agent = new BrowserAgent({
    model: {
      provider: 'azure-openai',
      baseURL: process.env.AWS_CLAUDE_API_BASE_URL,
      id: 'aws_sdk_claude37_sonnet',
      // provider: 'azure-openai',
      // apiKey: process.env.ARK_API_KEY,
      // id: 'ep-20250510145437-5sxhs', // 'doubao-1.5-thinking-vision-pro',
    },
    mcpServers: {
      'streamable-mcp-server': {
        type: 'streamable-http',
        url: 'http://127.0.0.1:12306/mcp',
      },
    },
    toolCallEngine: 'native',
    maxIterations: 100,
    // logLevel: LogLevel.DEBUG,
  });

  await agent.initialize();
  const tools = agent.getTools();
  console.log(`\nAvailable tools (${tools.length}):`);
  for (const tool of tools) {
    console.log(`- ${tool.name}: ${tool.description}`);
  }

  const stream = await agent.run({
    input: `
    1. Open https://github.com/bytedance/UI-TARS-desktop/pull/700
    3. Give a "LGTM" comment 

    Please complete the task as quickly as possible.
  `,
    stream: true,
  });

  for await (const chunk of stream) {
    if (chunk.type === 'assistant_streaming_message') {
      if (chunk.content) process.stdout.write(chunk.content);
    }
    if (chunk.type === 'tool_call') {
      console.log(`\nCall ${chunk.tool.name} with argument ${JSON.stringify(chunk.arguments)}`);
    }
    if (chunk.type === 'tool_result') {
      console.log(`\nTool call response ${JSON.stringify(chunk)}`);
    }
  }
}

main().catch(console.error);
