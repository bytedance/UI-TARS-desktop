/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExecuteParams, ScreenshotOutput, ExecuteOutput, SupportedActionType } from '../types';

export interface ScreenContext {
  screenWidth: number;
  screenHeight: number;
  scaleX: number;
  scaleY: number;
}

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
 *   async initialize(): Promise<void> {
 *     // Implementation for initializing the operator
 *     // e.g., validate connections, setup resources
 *     // ...
 *   }
 *
 *   get supportedActions(): Array<SupportedActionType> {
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
   * Initializes the operator
   * @description Performs initialization operations for the operator, such as validating connections,
   * setting up resources, and preparing the operation environment. Implementations should handle
   * all necessary setup to ensure the operator is ready for use.
   * @returns Promise that resolves when initialization is complete
   * @throws Error if initialization fails
   */
  abstract initialize(): Promise<void>;

  /**
   * Returns an array of supported action types
   * @returns Array of action types supported by this operator
   */
  abstract get supportedActions(): Array<SupportedActionType>;
  /**
   * Returns the screen context
   * @returns The screen context
   */
  abstract get screenContext(): ScreenContext;
  /**
   * Takes a screenshot
   * @returns Promise that resolves to the screenshot output
   */
  abstract screenshot(): Promise<ScreenshotOutput>;
  /**
   * Executes actions
   * @param params - The parameters for the actions
   * @returns Promise that resolves to the execution output
   */
  abstract execute(params: ExecuteParams): Promise<ExecuteOutput>;
}
