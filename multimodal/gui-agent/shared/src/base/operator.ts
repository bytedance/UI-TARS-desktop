/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExecuteParams, ScreenshotOutput, ExecuteOutput, BaseAction } from '../types';

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
 * import type { GUIAction, ClickAction, DoubleClickAction, TypeAction, ScreenShotAction } from '../types/actions';
 *
 * class MyDesktopOperator extends Operator {
 *   static MANUAL = {
 *     ACTION_SPACES: [
 *       {
 *         type: 'click',
 *         description: 'Perform a mouse click at specified coordinates',
 *         example: { point: { normalized: { x: 0.5, y: 0.5 }, reference: 'screen' } }
 *       } as const,
 *       {
 *         type: 'double_click',
 *         description: 'Perform a double click at specified coordinates',
 *         example: { point: { raw: { x: 500, y: 300 }, reference: 'window' } }
 *       } as const,
 *       {
 *         type: 'type',
 *         description: 'Type text at the current cursor position',
 *         example: { text: 'Hello World' }
 *       } as const,
 *       {
 *         type: 'screenshot',
 *         description: 'Capture a screenshot of the screen or region',
 *         example: { start: { normalized: { x: 0.1, y: 0.1 } }, end: { normalized: { x: 0.9, y: 0.9 } } }
 *       } as const
 *     ] satisfies Array<Pick<GUIAction, 'type' | 'inputs'> & { description: string, example?: Record<string, unknown> }>,
 *     EXAMPLES: [
 *       'Click on the search button in the top-right corner',
 *       'Double-click on the file icon to open it',
 *       'Type "Hello World" in the input field',
 *       'Take a screenshot of the entire screen',
 *       'Scroll down to view more content'
 *     ]
 *   };
 *
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
  static MANUAL: {
    ACTION_SPACES: Array<
      Pick<BaseAction, 'type' | 'inputs'> & {
        description: string;
        example?: Record<string, unknown>;
      }
    >;
    EXAMPLES?: string[];
  };
  abstract screenshot(): Promise<ScreenshotOutput>;
  abstract execute(params: ExecuteParams): Promise<ExecuteOutput>;
}
