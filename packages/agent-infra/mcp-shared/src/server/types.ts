import type {
  ImageContent,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export type ToolSchema<T extends z.ZodType = z.ZodType> = {
  name: string;
  description: string;
  inputSchema: T;
};

export type ToolResult = {
  content: (ImageContent | TextContent)[];
  isError?: boolean;
};

export type Tool<T extends z.ZodType = z.ZodType> = {
  schema: ToolSchema<T>;
  handle: (args: z.infer<T>) => Promise<ToolResult>;
};
