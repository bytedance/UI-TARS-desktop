import { Tool as McpTool } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '@agent-infra/logger';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Browser, Page, Viewport } from 'puppeteer-core';
import { ZodObject } from 'zod';
import { ZodRawShape } from 'zod';

export type ToolDefinition = {
  name?: McpTool['name'];
  description: NonNullable<McpTool['description']>;
  annotations?: McpTool['annotations'];
  inputSchema?: ZodObject<ZodRawShape>;
};

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
  viewportSize?: Viewport | null;
};
