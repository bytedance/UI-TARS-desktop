#!/usr/bin/env node
/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { program } from 'commander';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer, setSearchConfig } from './server.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SearchProvider } from '@agent-infra/search';

program
  .name(process.env.NAME || 'mcp-server-search')
  .description(process.env.DESCRIPTION || 'MCP server for web search')
  .version(process.env.VERSION || '0.0.1')
  .option(
    '--provider <provider>',
    'Search provider to use (default: browser_search)',
    'browser_search',
  )
  .option(
    '--engine <engine>',
    'Search engine to use for browser search (default: google)',
    'google',
  )
  .option('--count <count>', 'Number of results to return (default: 10)', '10')
  .option('--api-key <apiKey>', 'API key for the search provider')
  .option('--base-url <baseUrl>', 'Base URL for the search provider')
  .action(async (options) => {
    try {
      // Map provider string to enum
      const providerMap: Record<string, SearchProvider> = {
        browser_search: SearchProvider.BrowserSearch,
        bing: SearchProvider.BingSearch,
        tavily: SearchProvider.Tavily,
        searxng: SearchProvider.SearXNG,
        duckduckgo: SearchProvider.DuckduckgoSearch,
      };

      const provider =
        providerMap[options.provider] || SearchProvider.BrowserSearch;

      // Configure search settings
      setSearchConfig({
        provider,
        providerConfig: {
          count: parseInt(options.count, 10),
          engine: options.engine,
        },
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
      });

      const server: McpServer = createServer();
      const transport = new StdioServerTransport();

      await server.connect(transport);
    } catch (error) {
      console.error('Error: ', error);
      process.exit(1);
    }
  });

program.parse();
