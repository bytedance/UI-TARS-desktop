import {
  LaunchOptions,
  LocalBrowser,
  Page,
  RemoteBrowserOptions,
} from '@agent-infra/browser';
import { Tool as McpTool } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '@agent-infra/logger';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Browser, Viewport } from 'puppeteer-core';
import { ZodObject, ZodRawShape } from 'zod';
import { DOMElementNode } from '@agent-infra/browser-use';

declare global {
  interface Window {
    // @ts-ignore
    buildDomTree: (args: any) => any | null;
  }
}

export interface McpState {
  globalConfig: GlobalConfig;
  globalBrowser: Browser | null;
  globalPage: Page | null;
  selectorMap: Map<number, DOMElementNode> | null;
  logger: Logger;
}

export interface GlobalConfig {
  /**
   * Browser launch options
   */
  launchOptions?: LaunchOptions;
  /**
   * Remote browser options
   */
  remoteOptions?: RemoteBrowserOptions;
  contextOptions?: ContextOptions;
  /**
   * Custom logger
   */
  logger?: Partial<Logger>;
  /**
   * Using a external browser instance.
   * @defaultValue true
   */
  externalBrowser?: LocalBrowser;
  /**
   * Whether to enable ad blocker
   * @defaultValue true
   */
  enableAdBlocker?: boolean;
  /**
   * Whether to add vision tools
   * @defaultValue false
   */
  vision?: boolean;
}

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
