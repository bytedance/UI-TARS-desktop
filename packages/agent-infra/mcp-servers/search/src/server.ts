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
import { always_log } from './utils.js';

import { SearchClient, SearchProvider, PageResult } from '@agent-infra/search';
import { SearchSettings } from '../../../shared/dist/agent-tars-types/search.js';

let searchSetting: SearchSettings = {
  provider: SearchProvider.BrowserSearch,
  providerConfig: {
    count: 10,
    engine: 'google',
  },
  apiKey: '',
  baseUrl: '',
};

export function setSearchConfig(config: SearchSettings) {
  searchSetting = {
    ...searchSetting,
    ...config,
    providerConfig: {
      ...searchSetting.providerConfig,
      ...(config.providerConfig || {}),
    },
  };
}

/**
 * Perform search.
 */
async function performSearch(
  args: Record<string, unknown> | undefined,
): Promise<CallToolResult> {
  const query = String(args?.query || '');
  if (!query) {
    throw new Error('Search query is required');
  }

  const provider = searchSetting.provider;
  const providerConfig = searchSetting.providerConfig;
  const count = args?.count ? Number(args.count) : providerConfig.count;

  const API_KEY_ENV_MAP = {
    [SearchProvider.BingSearch]: process.env.BING_SEARCH_API_KEY,
    [SearchProvider.Tavily]: process.env.TAVILY_API_KEY,
    [SearchProvider.BrowserSearch]: undefined,
    [SearchProvider.SearXNG]: undefined,
    [SearchProvider.DuckduckgoSearch]: undefined,
  };

  const API_BASE_URL_ENV_MAP = {
    [SearchProvider.BingSearch]: process.env.BING_SEARCH_API_BASE_URL,
    [SearchProvider.Tavily]: undefined,
    [SearchProvider.BrowserSearch]: undefined,
    [SearchProvider.SearXNG]: undefined,
    [SearchProvider.DuckduckgoSearch]: undefined,
  };

  const apiKey = SearchProvider.BingSearch;
  try {
    const searchClient = new SearchClient({
      provider: provider,
      providerConfig: {
        baseUrl: searchSetting.baseUrl ?? API_BASE_URL_ENV_MAP[provider],
        apiKey: searchSetting.apiKey ?? API_KEY_ENV_MAP[provider],
        // @ts-expect-error FIXME: we need a better type design here.
        engine: providerConfig.engine,
        needVisitedUrls: providerConfig.needVisitedUrls,
      },
    });

    const results = await searchClient.search({
      query,
      count,
    });

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
      ] as TextContent[],
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
      count: z
        .number()
        .optional()
        .describe(
          `Number of results to return (default: ${searchSetting.providerConfig.count})`,
        ),
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
      // FIXME: why?
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
