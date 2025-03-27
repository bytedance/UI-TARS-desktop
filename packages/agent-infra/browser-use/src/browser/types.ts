/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/browser/types.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import type { DOMState } from '../dom/views';

export type PartialWithRequired<T, K extends keyof T> = Required<Pick<T, K>> &
  Partial<Omit<T, K>>;

export interface BrowserContextWindowSize {
  width: number;
  height: number;
}

export interface BrowserContextConfig {
  /**
   * Minimum time to wait before getting page state for LLM input
   * @default 0.5
   */
  minimumWaitPageLoadTime: number;

  /**
   * Time to wait for network requests to finish before getting page state.
   * Lower values may result in incomplete page loads.
   * @default 1.0
   */
  waitForNetworkIdlePageLoadTime: number;

  /**
   * Maximum time to wait for page load before proceeding anyway
   * @default 5.0
   */
  maximumWaitPageLoadTime: number;

  /**
   * Time to wait between multiple per step actions
   * @default 1.0
   */
  waitBetweenActions: number;

  /**
   * Default browser window size
   * @default { width: 1280, height: 1100 }
   */
  browserWindowSize: BrowserContextWindowSize;

  /**
   * Highlight elements in the DOM on the screen
   * @default true
   */
  highlightElements: boolean;

  /**
   * Viewport expansion in pixels. This amount will increase the number of elements
   * which are included in the state what the LLM will see.
   * If set to -1, all elements will be included (this leads to high token usage).
   * If set to 0, only the elements which are visible in the viewport will be included.
   * @default 500
   */
  viewportExpansion: number;

  /**
   * Include dynamic attributes in the CSS selector. If you want to reuse the css_selectors, it might be better to set this to False.
   * @default true
   */
  includeDynamicAttributes: boolean;

  /**
   * Home page url
   * @default 'https://www.google.com'
   */
  homePageUrl: string;
}

export const DEFAULT_BROWSER_CONTEXT_CONFIG: BrowserContextConfig = {
  minimumWaitPageLoadTime: 1,
  waitForNetworkIdlePageLoadTime: 1.0,
  maximumWaitPageLoadTime: 5.0,
  waitBetweenActions: 1.0,
  browserWindowSize: { width: 1280, height: 1100 },
  highlightElements: true,
  viewportExpansion: 500,
  includeDynamicAttributes: true,
  homePageUrl: 'https://www.google.com',
};

export interface PageState extends DOMState {
  tabId: number;
  url: string;
  title: string;
  screenshot: string | null;
  pixelsAbove: number;
  pixelsBelow: number;
}

export interface PageInfo {
  id: string;
  url: string;
  title: string;
}

export interface BrowserState extends PageState {
  pages?: PageInfo[];
}
