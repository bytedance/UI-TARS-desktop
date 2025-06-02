import { Logger } from '@agent-infra/logger';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Browser, Page } from 'puppeteer-core';

export type ToolContext = {
  page: Page;
  browser: Browser;
  logger: Logger;
  contextOptions: ContextOptions;
};

export type ResourceContext = {
  logger: Logger;
  server: McpServer;
};

export type ContextOptions = {
  /** Vision model coordinate system scaling factors [width_factor, height_factor] for coordinate space normalization. */
  factors?: [number, number];
  userAgent?: string;
};
