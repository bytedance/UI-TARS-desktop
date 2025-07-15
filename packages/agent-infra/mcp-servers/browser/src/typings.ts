import {
  LaunchOptions,
  LocalBrowser,
  Page,
  RemoteBrowserOptions,
} from '@agent-infra/browser';
import { Tool as McpTool } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '@agent-infra/logger';
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
  downloadedFiles: {
    /**
     * Global unique identifier of the download.
     * for download progress event
     */
    guid: string;
    /**
     * URL of the resource being downloaded.
     */
    url: string;
    /**
     * Resource URI of the download.
     */
    resourceUri: string;
    /**
     * The suggested filename of the download.
     */
    suggestedFilename: string;
    /**
     * The created time of the download.
     */
    createdAt: string;
    /** download progress */
    progress: number;
    /** download state */
    state: 'inProgress' | 'completed' | 'canceled';
  }[];
  logger: Logger;
  initialBrowserSetDownloadBehavior: boolean;
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
  logger?: Logger;
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
  /**
   * Path to the directory for output files.
   * @defaultValue /tmp/mcp-server-browser/${date-iso}/
   */
  outputDir?: string;
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
  buildDomTree: (page: Page) => Promise<{
    clickableElements: string;
    elementTree: DOMElementNode;
    selectorMap: Map<number, DOMElementNode>;
  } | null>;
  currTabsIdx: number;
};

export type ResourceContext = {
  logger: Logger;
};

export type ContextOptions = {
  /** Vision model coordinate system scaling factors [width_factor, height_factor] for coordinate space normalization. */
  factors?: [number, number];
  userAgent?: string;
  viewportSize?: Viewport | null;
};
