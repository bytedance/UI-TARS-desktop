/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  CallToolResult,
  TextContent,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  SearchClient,
  SearchProvider,
  SearchProviderConfig,
  PageResult,
} from '@agent-infra/search';

export function always_log(message: string, data?: any) {
  if (data) {
    console.error(message + ': ' + JSON.stringify(data));
  } else {
    console.error(message);
  }
}

const SEARCH_PROVIDERS = {
  bing: SearchProvider.BingSearch,
  tavily: SearchProvider.Tavily,
  browser: SearchProvider.BrowserSearch,
  duckduckgo: SearchProvider.DuckduckgoSearch,
  searxng: SearchProvider.SearXNG,
};

type SearchProviderType = keyof typeof SEARCH_PROVIDERS;

async function performSearch(
  args: Record<string, unknown> | undefined,
): Promise<CallToolResult> {
  const query = String(args?.query || '');
  if (!query) {
    throw new Error('Search query is required');
  }

  const provider = (args?.provider as SearchProviderType) || 'bing';
  if (!SEARCH_PROVIDERS[provider]) {
    throw new Error(`Unknown search provider: ${provider}`);
  }

  const count = args?.count ? Number(args.count) : 5;

  // Extract provider specific configuration
  const providerConfigRaw = args?.providerConfig || {};
  const providerConfig =
    typeof providerConfigRaw === 'object' ? providerConfigRaw : {};

  try {
    const searchClient = new SearchClient({
      provider: SEARCH_PROVIDERS[provider],
      providerConfig: providerConfig as SearchProviderConfig<any>,
    });

    const searchOptions = {
      query,
      count,
    };

    // Extract provider specific search options
    const searchProviderOptions =
      args?.searchOptions && typeof args.searchOptions === 'object'
        ? args.searchOptions
        : {};

    const results = await searchClient.search(
      searchOptions,
      searchProviderOptions as any,
    );

    return {
      isError: false,
      content: formatSearchResults(results.pages, query),
    };
  } catch (error: any) {
    const response = {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Search error: ${error.message}`,
          name: 'ERROR',
        },
      ],
    };
    always_log('WARN: search failed', response);
    return response;
  }
}

function formatSearchResults(
  pages: PageResult[],
  query: string,
): TextContent[] {
  const messages: TextContent[] = [
    {
      type: 'text',
      text: `Search results for: "${query}"`,
      name: 'QUERY',
    },
  ];

  if (pages.length === 0) {
    messages.push({
      type: 'text',
      text: 'No results found.',
      name: 'RESULTS',
    });
    return messages;
  }

  const resultsText = pages
    .map((page, index) => {
      return `[${index + 1}] ${page.title}
URL: ${page.url}
${page.content}`;
    })
    .join('\n\n---\n\n');

  messages.push({
    type: 'text',
    text: resultsText,
    name: 'RESULTS',
  });

  return messages;
}

const toolsMap = {
  web_search: {
    name: 'web_search',
    description: 'Search the web for information',
    inputSchema: z.object({
      query: z.string().describe('Search query'),
      provider: z
        .enum(['bing', 'tavily', 'browser', 'duckduckgo', 'searxng'])
        .optional()
        .describe('Search provider (default: bing)'),
      count: z
        .number()
        .optional()
        .describe('Number of results to return (default: 5)'),
      searchOptions: z
        .record(z.any())
        .optional()
        .describe('Provider-specific search options'),
    }),
  },
};

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;
type ToolNames = keyof typeof toolsMap;
type ToolInputMap = {
  [K in ToolNames]: z.infer<(typeof toolsMap)[K]['inputSchema']>;
};

const listTools: Client['listTools'] = async () => {
  const mcpTools = Object.keys(toolsMap || {}).map((key) => {
    const name = key as ToolNames;
    const tool = toolsMap[name];
    return {
      name: tool?.name || name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema) as ToolInput,
    };
  });

  return {
    tools: mcpTools,
  };
};

const callTool: Client['callTool'] = async ({
  name,
  arguments: toolArgs,
}): Promise<CallToolResult> => {
  const handlers: {
    [K in ToolNames]: (args: ToolInputMap[K]) => Promise<CallToolResult>;
  } = {
    web_search: async (args) => {
      const response = await performSearch(args);
      return {
        ...response,
        toolResult: response,
      };
    },
  };

  if (handlers[name as ToolNames]) {
    return handlers[name as ToolNames](toolArgs as any);
  }

  return {
    content: [
      {
        type: 'text',
        text: `Unknown tool: ${name}`,
      },
    ],
    isError: true,
  };
};

const close: Client['close'] = async () => {
  return;
};

const ping: Client['ping'] = async () => {
  return {
    _meta: {},
  };
};

export const client: Pick<Client, 'callTool' | 'listTools' | 'close' | 'ping'> =
  {
    callTool,
    listTools,
    close,
    ping,
  };
