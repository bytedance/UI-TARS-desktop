import { MCPServerName } from '@agent-infra/shared';
import type { ChatCompletionTool } from 'openai/resources/chat';

export enum ExecutorToolType {
  FileSystem = MCPServerName.FileSystem,
  Commands = MCPServerName.Commands,
  Idle = 'idle',
  ChatMessage = 'chat-message',
}

export const idleTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: ExecutorToolType.Idle,
    description:
      'If you find the current task is done, and current task is the last task, then you should call this tool to indicate that you are done.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
};

export const chatMessageTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: ExecutorToolType.ChatMessage,
    description:
      'You can communicate with user by this tool. You should call this tool to output the response text to user.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The response text to user',
        },
      },
      required: ['text'],
    },
  },
};
