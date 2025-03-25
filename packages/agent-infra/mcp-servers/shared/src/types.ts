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

const schema = z.object({
  url: z.string(),
});

const browser_navigate: Tool<typeof schema> = {
  schema: {
    name: 'browser_navigate',
    description: 'Navigate to a URL',
    inputSchema: schema,
  },
  handle: async (args) => {
    return {
      content: [
        {
          type: 'text',
          text: `Navigated to ${args.url}`,
        },
      ],
      isError: false,
    };
  },
};
