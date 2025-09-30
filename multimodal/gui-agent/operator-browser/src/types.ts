/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Logger } from '@agent-infra/logger';
import type { BrowserType, BaseBrowser } from '@agent-infra/browser';

/**
 * Search engine options
 */
export enum SearchEngine {
  GOOGLE = 'google',
  BAIDU = 'baidu',
  BING = 'bing',
}

export const searchEngineUrlMap: Record<SearchEngine, string> = {
  [SearchEngine.GOOGLE]: 'https://www.google.com/',
  [SearchEngine.BING]: 'https://www.bing.com/',
  [SearchEngine.BAIDU]: 'https://www.baidu.com/',
};

/**
 * Configuration options for the BrowserOperator
 */
export interface BrowserOperatorOptions {
  /**
   * Browser instance to control
   */
  browser: BaseBrowser;

  /**
   * Browser type to use for operations
   * example: 'chrome', 'edge', 'firefox'
   */
  browserType: BrowserType;

  /**
   * Optional logger instance
   */
  logger?: Logger;

  /**
   * Whether to highlight clickable elements before taking screenshots
   * @default true
   */
  highlightClickableElements?: boolean;

  /**
   * Whether to show action info in the browser window
   * @default true
   */
  showActionInfo?: boolean;

  /**
   * Whether to show water flow effect during screenshots
   * @default true
   */
  showWaterFlow?: boolean;
}

export interface LocalBrowserOperatorOptions {
  /**
   * Whether to highlight clickable elements before taking screenshots
   * @default true
   */
  highlightClickableElements?: boolean;

  /**
   * Whether to show action information overlay
   * @default false
   */
  showActionInfo?: boolean;

  /**
   * Whether to show water flow animation effects
   * @default false
   */
  showWaterFlow?: boolean;

  /**
   * Search engine to use for search operations
   */
  searchEngine?: SearchEngine;

  /**
   * Logger instance for debugging and error reporting
   * @default new ConsoleLogger(undefined, LogLevel.DEBUG)
   */
  logger?: Logger;
}

export interface RemoteBrowserOperatorOptions {
  /**
   * CDP webSocket endpoint for remote browser control:
   *
   * CDP (Chrome DevTools Protocol) is a protocol that allows for tools to instrument,
   * inspect, debug and profile Chromium, Chrome and other Blink-based browsers.
   * This WebSocket endpoint enables remote control of browser instances through CDP commands,
   * allowing operations like navigation, element interaction, screenshot capture, and more.
   *
   * @example "ws://localhost:9222/devtools/browser/12345678-1234-1234-1234-123456789012"
   */
  wsEndpoint: string;

  /**
   * The viewport dimensions
   * @property {number} width - Viewport width in pixels
   * @property {number} height - Viewport height in pixels
   */
  viewport?: { width: number; height: number };

  /**
   * Whether to highlight clickable elements before taking screenshots
   * @default true
   */
  highlightClickableElements?: boolean;

  /**
   * Whether to show action information overlay
   * @default false
   */
  showActionInfo?: boolean;

  /**
   * Whether to show water flow animation effects
   * @default false
   */
  showWaterFlow?: boolean;

  /**
   * Search engine to use for search operations
   */
  searchEngine?: SearchEngine;

  /**
   * Logger instance for debugging and error reporting
   * @default new ConsoleLogger(undefined, LogLevel.DEBUG)
   */
  logger?: Logger;
}
