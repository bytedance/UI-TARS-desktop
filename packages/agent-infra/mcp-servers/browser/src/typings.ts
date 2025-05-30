import { Logger } from '@agent-infra/logger';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Browser, Page } from 'puppeteer-core';

export type ToolContext = {
  page: Page;
  browser: Browser;
  logger: Logger;
};

export type ResourceContext = {
  logger: Logger;
  server: McpServer;
};
