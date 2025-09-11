/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExecuteParams, ScreenshotOutput, ExecuteOutput, SupportedActionType } from '../types';

/**
 * @abstract
 * @class BaseOperator
 * @classdesc Abstract base class for Operators.
 */
export abstract class BaseOperator {
  abstract screenshot(params?: unknown): Promise<unknown>;
  abstract execute(params: unknown): Promise<unknown>;
}

/**
 * @abstract
 * @class Operator
 * @classdesc Abstract base class for Operators.
 *
 * @example
 * // Example of defining ACTION_SPACES for a custom Operator
 * import type { GUIAction, ClickAction, DoubleClickAction, TypeAction, ScreenShotAction, SupportedActionType } from '../types/actions';
 *
 * class MyDesktopOperator extends Operator {
 *   static MANUAL = {
 *     ACTION_SPACES: [],
 *     EXAMPLES: []
 *   };
 *
 *
 *   supportedActions(): Array<SupportedActionType> {
 *     return [
 *       'click',
 *       'double_click',
 *       'right_click',
 *       'type',
 *       'hotkey',
 *       'scroll',
 *       'drag',
 *       'screenshot'
 *     ] as SupportedActionType[];
 *   }
 *   async screenshot(): Promise<ScreenshotOutput> {
 *     // Implementation for taking screenshots
 *     // ...
 *   }
 *
 *   async execute(params: ExecuteParams): Promise<ExecuteOutput> {
 *     // Implementation for executing actions
 *     // ...
 *   }
 * }
 */
export abstract class Operator extends BaseOperator {
  /**
   * @deprecated Use `supportedActions` instead
   */
  static MANUAL = {
    ACTION_SPACES: [],
    EXAMPLES: [],
  };
  /**
   * Returns an array of supported action types
   * @returns Array of action types supported by this operator
   */
  abstract supportedActions(): Array<SupportedActionType>;
  abstract screenshot(): Promise<ScreenshotOutput>;
  abstract execute(params: ExecuteParams): Promise<ExecuteOutput>;
}
