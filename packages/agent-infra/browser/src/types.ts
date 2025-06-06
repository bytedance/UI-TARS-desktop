/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Page, KeyInput, WaitForOptions } from 'puppeteer-core';

export type BrowserType = 'chrome' | 'edge' | 'firefox';

/**
 * Options for launching a browser instance
 * @interface LaunchOptions
 */
export interface LaunchOptions {
  /**
   * Additional command line arguments to pass to the browser instance.
   */
  args?: string[];
  /**
   * If true, pipes the browser process stdout and stderr to `process.stdout`
   * and `process.stderr`.
   * @defaultValue `false`
   */
  dumpio?: boolean;
  /**
   * Whether to run browser in headless mode
   * @default false
   */
  headless?: boolean;

  /**
   * Browser type, 'chrome' | 'edge' | 'firefox'
   */
  browserType?: BrowserType;

  /**
   * Maximum time in milliseconds to wait for the browser to start
   * @default 0 (no timeout)
   */
  timeout?: number;

  /**
   * The viewport dimensions
   * @property {number} width - Viewport width in pixels
   * @property {number} height - Viewport height in pixels
   */
  defaultViewport?: {
    width: number;
    height: number;
  };

  /**
   * Path to a browser executable to use instead of the automatically detected one
   * If not provided, the system will attempt to find an installed browser
   */
  executablePath?: string;

  /**
   * Path to a specific browser profile to use
   * Allows using existing browser profiles with cookies, extensions, etc.
   */
  profilePath?: string;

  /**
   * Proxy server URL, e.g. 'http://proxy.example.com:8080'
   * Used to route browser traffic through a proxy server
   */
  proxy?: string;

  /**
   * Proxy bypass list, e.g. '*.example.com,*.test.com'
   * Used to bypass the proxy server for specific domains
   */
  proxyBypassList?: string;

  /**
   * Path to a user data directory.
   * {@link https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/user_data_dir.md | see the Chromium docs}
   * for more info.
   */
  userDataDir?: string;
}

/**
 * Options for evaluating JavaScript in a new page
 * @template T - Array of parameters to pass to the page function
 * @template R - Return type of the page function
 * @interface EvaluateOnNewPageOptions
 */
export interface EvaluateOnNewPageOptions<T extends any[], R> {
  /**
   * URL to navigate to before evaluating the function
   * The page will load this URL before executing the pageFunction
   */
  url: string;

  /**
   * Options for waiting for the page to load
   */
  waitForOptions?: WaitForOptions;

  /**
   * Function to be evaluated in the page context
   * This function runs in the context of the browser page, not Node.js
   * @param {Window} window - The window object of the page
   * @param {...T} args - Additional arguments passed to the function
   * @returns {R} Result of the function execution
   */
  pageFunction: (window: Window, ...args: T) => R;

  /**
   * Parameters to pass to the page function
   * These values will be serialized and passed to the pageFunction
   */
  pageFunctionParams: T;

  /**
   * Optional function to execute before page navigation
   * Useful for setting up page configuration before loading the URL
   * @param {Page} page - Puppeteer page instance
   * @returns {void | Promise<void>}
   */
  beforePageLoad?: (page: Page) => void | Promise<void>;

  /**
   * Optional function to execute after page navigation
   * Useful for setting up page configuration after loading the URL
   * @param {Page} page - Puppeteer page instance
   * @returns {void | Promise<void>}
   */
  afterPageLoad?: (page: Page) => void | Promise<void>;

  /**
   * Optional function to process the result before returning
   * Can be used to transform or validate the result from page evaluation
   * @param {Page} page - Puppeteer page instance
   * @param {R} result - Result from page function evaluation
   * @returns {R | Promise<R>} Processed result
   */
  beforeSendResult?: (page: Page, result: R) => R | Promise<R>;
}

/**
 * Core browser interface that all browser implementations must implement
 * Defines the standard API for browser automation
 * @interface BrowserInterface
 */
export interface BrowserInterface {
  /**
   * Launch a new browser instance
   * @param {LaunchOptions} [options] - Launch configuration options
   * @returns {Promise<void>} Promise resolving when browser is launched
   */
  launch(options?: LaunchOptions): Promise<void>;

  /**
   * Close the browser instance and all its pages
   * @returns {Promise<void>} Promise resolving when browser is closed
   */
  close(): Promise<void>;

  /**
   * Create a new page in the browser
   * @returns {Promise<Page>} Promise resolving to the new page instance
   */
  createPage(): Promise<Page>;

  /**
   * Evaluate a function in a new page context
   * Creates a new page, navigates to URL, executes function, and returns result
   * @template T - Array of parameters to pass to the page function
   * @template R - Return type of the page function
   * @param {EvaluateOnNewPageOptions<T, R>} options - Evaluation options
   * @returns {Promise<R | null>} Promise resolving to the function result or null
   */
  evaluateOnNewPage<T extends any[], R>(
    options: EvaluateOnNewPageOptions<T, R>,
  ): Promise<R | null>;

  /**
   * Get the currently active page or create one if none exists
   * @returns {Promise<Page>} Promise resolving to the active page instance
   */
  getActivePage(): Promise<Page>;
}

export { Page, KeyInput };
