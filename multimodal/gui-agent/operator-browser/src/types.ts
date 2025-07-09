/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Logger } from '@agent-infra/logger';
import type { BrowserInterface, Page, BrowserType } from '@agent-infra/browser';
import type { ScreenshotOutput, ExecuteParams } from '@ui-tars/sdk/core';

export { StatusEnum } from '@ui-tars/sdk';
export type { Page, ScreenshotOutput, ExecuteParams };
export type ParsedPrediction = ExecuteParams['parsedPrediction'];

/**
 * Search engine options
 */
export enum SearchEngine {
  GOOGLE = 'google',
  BAIDU = 'baidu',
  BING = 'bing',
}

/**
 * Configuration options for the BrowserOperator
 */
export interface BrowserOperatorOptions {
  /**
   * Browser instance to control
   */
  browser: BrowserInterface;

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

  /**
   * Callback triggered when an operator action is performed
   * @deprecated Will be removed when `@ui-tars/sdk` supports hooks natively
   */
  onOperatorAction?: (prediction: ParsedPrediction) => Promise<void>;

  /**
   * Callback triggered when a screenshot is taken
   */
  onScreenshot?: (screenshot: ScreenshotOutput, page: Page) => Promise<void>;

  /**
   * Callback triggered when a final answer is received
   */
  onFinalAnswer?: (finalAnswer: string) => Promise<void>;
}
