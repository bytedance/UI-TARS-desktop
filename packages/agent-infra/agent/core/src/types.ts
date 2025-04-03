import { z } from 'zod';
import { OpenAI } from 'openai';
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionMessageToolCall,
} from 'openai/resources';
import { ToolCallProvider } from './providers/tool-call-provider';

export { OpenAI };
export {
  ChatCompletion,
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionMessageToolCall,
};

export type ToolDefinition = {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  function: (args: any) => Promise<any>;
};

export type AgentOptions = {
  name?: string;
  instructions: string;
  model: Model;
  tools?: ToolDefinition[];
  toolCallProvider?: ToolCallProvider;
  maxIterations?: number;
};

export class Model {
  constructor(
    public client: OpenAI,
    public name: string,
  ) {}
}
