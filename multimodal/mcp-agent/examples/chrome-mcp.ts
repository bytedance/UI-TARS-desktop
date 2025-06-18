/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LogLevel, MCPAgent } from '../src';

const MAX_TOOL_RESULT_LENGTH = 10000;

class MyAgent extends MCPAgent {
  onAfterToolCall(id: string, toolCall: { toolCallId: string; name: string }, result: any) {
    if (Array.isArray(result)) {
      return result.map((item) =>
        item.type === 'text' && item.text.length > MAX_TOOL_RESULT_LENGTH
          ? {
              ...item,
              text: item.text.slice(0, MAX_TOOL_RESULT_LENGTH),
            }
          : item,
      );
    }
  }
}

async function main() {
  const agent = new MyAgent({
    model: {
      provider: 'azure-openai',
      baseURL: process.env.AWS_CLAUDE_API_BASE_URL,
      id: 'aws_sdk_claude37_sonnet',
      // provider: 'azure-openai',
      // apiKey: process.env.ARK_API_KEY,
      // id: 'ep-20250512165931-2c2ln', // 'doubao-1.5-thinking-vision-pro',
    },
    mcpServers: {
      'streamable-mcp-server': {
        type: 'streamable-http',
        url: 'http://127.0.0.1:12306/mcp',
      },
    },
    toolCallEngine: 'structured_outputs',
    maxIterations: 100,
    logLevel: LogLevel.DEBUG,
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
    2. Review code changes
    3. Give a review comment
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

  console.log('!!!');
}

main().catch(console.error);
