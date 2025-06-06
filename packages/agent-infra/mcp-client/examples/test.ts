/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { AzureOpenAI } from 'openai';
import { MCPClient, MCPTool } from '../src/index';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/index.mjs';
import { createServer as createMcpBrowserServer } from '@agent-infra/mcp-server-browser';
import { createServer as createMcpCommandsServer } from '@agent-infra/mcp-server-commands';
import {
  createServer as createMcpFilesystemServer,
  setAllowedDirectories,
} from '@agent-infra/mcp-server-filesystem';
import path from 'node:path';

const currentDir = path.join(__dirname, '../');
const PLANNING_SYSTEM_PROMPT = `
You are an expert Planning Agent tasked with solving problems efficiently through structured plans.
Your job is:
1. Analyze requests to understand the task scope
2. Create a clear, actionable plan that makes meaningful progress with the \`planning\` tool
3. Execute steps using available tools as needed
4. Track progress and adapt plans when necessary
5. Use \`finish\` to conclude immediately when the task is complete


Available tools will vary by task but may include:
- \`planning\`: Create, update, and track plans (commands: create, update, mark_step, etc.)
- \`finish\`: End the task when complete
Break tasks into logical steps with clear outcomes. Avoid excessive detail or sub-steps.
Think about dependencies and verification methods.
Know when to conclude - don't continue thinking once objectives are met.
`;

const NEXT_STEP_PROMPT = `
Based on the current state, what's your next action?
Choose the most efficient path forward:
1. Is the plan sufficient, or does it need refinement?
2. Can you execute the next step immediately?
3. Is the task complete? If so, use \`finish\` right away.

Be concise in your reasoning, then select the appropriate tool or action.
`;

const supportedAttributes = [
  'type',
  'nullable',
  'required',
  // 'format',
  'description',
  'properties',
  'items',
  'enum',
  'anyOf',
];
function filterPropertieAttributes(tool: MCPTool) {
  const roperties = tool.inputSchema.properties;
  const getSubMap = (obj: Record<string, any>, keys: string[]) => {
    return Object.fromEntries(
      Object.entries(obj).filter(([key]) => keys.includes(key)),
    );
  };

  for (const [key, val] of Object.entries(roperties as any)) {
    // @ts-ignore
    roperties[key] = getSubMap(val as any, supportedAttributes);
  }
  return roperties;
}

function mcpToolsToOpenAITools(mcpTools: MCPTool[]): Array<ChatCompletionTool> {
  return mcpTools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: filterPropertieAttributes(tool),
      },
    },
  }));
}

function mcpToolsToAnthropicTools(mcpTools: MCPTool[]): Array<any> {
  return mcpTools.map((tool) => {
    const t = {
      name: tool.id,
      description: tool.description,
      // @ts-ignore no check
      input_schema: tool.inputSchema,
    };
    return t;
  });
}

function mcpToolsToAzureTools(mcpTools: MCPTool[]): Array<any> {
  return mcpTools.map((tool) => {
    const t = {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        // @ts-ignore no check
        parameters: tool.inputSchema,
      },
    };
    return t;
  });
}

function toolUseToMcpTool(
  mcpTools: MCPTool[] | undefined,
  toolUse: any,
): MCPTool | undefined {
  if (!mcpTools) return undefined;
  const tool = mcpTools.find((tool) => tool.name === toolUse.function.name);
  if (!tool) {
    return undefined;
  }
  // @ts-ignore ignore type as it it unknow
  tool.inputSchema = JSON.parse(toolUse.function.arguments);
  return tool;
}

(async () => {
  const client = new MCPClient(
    [
      {
        name: 'browser',
        description: 'web browser tools',
        mcpServer: createMcpBrowserServer(),
      },
      {
        name: 'filesystem',
        description: 'filesystem tools',
        mcpServer: createMcpFilesystemServer({
          allowedDirectories: [currentDir],
        }),
      },
      // {
      //   name: 'add_function',
      //   description: 'add function',
      //   type: 'sse',
      //   url: 'http://localhost:8808/sse',
      //   headers: {
      //     Authorization: 'Bearer user@example.com:foo:bar',
      //   },
      // },
      {
        name: 'filesystem',
        command: 'npx',
        args: [
          '-y',
          '@agent-infra/mcp-server-filesystem',
          path.join(__dirname, '../'),
        ],
      },
      {
        name: 'commands',
        description: 'commands tools',
        mcpServer: createMcpCommandsServer(),
      },
      {
        name: 'browser',
        command: 'npx',
        args: ['-y', '@agent-infra/mcp-server-browser'],
      },
    ],
    {
      isDebug: true,
    },
  );

  // await client.init();

  // setInitialBrowser(your_browser, your_page);

  const tools = await client.listTools();
  console.log('toolstools', tools);

  // const openai = new AzureOpenAI({
  //   endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  //   apiVersion: process.env.AZURE_OPENAI_API_VERSION,
  //   apiKey: process.env.AZURE_OPENAI_API_KEY,
  // });

  // const azureTools = mcpToolsToAzureTools(tools);
  // console.log('azureTools', azureTools);

  // const messages: ChatCompletionMessageParam[] = [
  //   {
  //     role: 'system',
  //     content: PLANNING_SYSTEM_PROMPT,
  //   },
  //   {
  //     role: 'user',
  //     content: `将 \"hello world\" 写入到文件 todo.md 中，用户当前目录是 ${currentDir}`,
  //   },
  // ];

  // const pcScreenshotName = 'pc_screenshot';

  // while (true) {
  //   if (messages.length > 0) {
  //     if (messages[messages.length - 1].role === 'tool') {
  //       const screenshotResule = await client.callTool({
  //         client: 'browser',
  //         name: 'browser_screenshot',
  //         args: {
  //           name: pcScreenshotName,
  //         },
  //       });
  //       messages.push({
  //         role: 'user',
  //         content: [
  //           ...((screenshotResule.content as any).map((item: any) => {
  //             if (item.type === 'image') {
  //               return {
  //                 type: 'image_url',
  //                 image_url: {
  //                   url: `data:image/png;base64,aaaa`,
  //                 },
  //               };
  //             }
  //             return item;
  //           }) || []),
  //           {
  //             type: 'text',
  //             text: NEXT_STEP_PROMPT,
  //           },
  //         ],
  //       });
  //     } else if (messages[messages.length - 1].role === 'assistant') {
  //       messages.push({
  //         role: 'user',
  //         content: NEXT_STEP_PROMPT,
  //       });
  //     }
  //   }

  //   console.log('messages', JSON.stringify(messages, null, 4));

  //   const response = await openai.chat.completions.create({
  //     model: process.env.AZURE_OPENAI_MODEL || '',
  //     messages,
  //     tools: azureTools,
  //     tool_choice: 'auto',
  //     max_tokens: 5120,
  //     stream: false,
  //   });

  //   console.log('response.choices', response.choices);

  //   const choice = response.choices[0];
  //   if (!choice.message) continue;

  //   const responseMessage = response.choices[0].message;
  //   messages.push({
  //     role: responseMessage.role,
  //     content: responseMessage.content,
  //   });

  //   console.log('choice.message', choice.message.tool_calls);

  //   if (response.choices.length > 0) {
  //     const toolResults = [];
  //     for (const responseChoice of response.choices) {
  //       for (const toolCall of responseChoice.message?.tool_calls || []) {
  //         console.log(
  //           `调用函数${toolCall.id}: ${toolCall.function.name}(${toolCall.function.arguments})`,
  //         );
  //         const mcpTool = toolUseToMcpTool(tools, toolCall);
  //         if (mcpTool) {
  //           const result = await client.callTool({
  //             client: mcpTool?.serverName as 'commands' | 'browser',
  //             name: mcpTool?.name,
  //             args: mcpTool?.inputSchema,
  //           });
  //           console.log('result', result);
  //           const { content } = result as any;
  //           console.log('content', content);
  //           toolResults.push({
  //             name: mcpTool?.name,
  //             role: 'tool' as const,
  //             tool_call_id: toolCall.id,
  //             content: JSON.stringify(content),
  //           });
  //         }
  //       }
  //     }

  //     messages.push(...toolResults);
  //     console.log('messages_after_tool_call', messages);
  //   }
  // }

  await client.cleanup();
})();
