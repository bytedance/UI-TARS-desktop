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
  abstract doScreenshot(params?: unknown): Promise<unknown>;
  abstract doExecute(params: unknown): Promise<unknown>;
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
 *
 *   // Implement the required abstract methods
 *   protected async initialize(): Promise<void> {
 *     // Implementation for initializing the operator
 *     // e.g., validate connections, setup resources
 *     // ...
 *   }
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
 *
 *   screenContext(): ScreenContext {
 *     // Implementation for getting screen context
 *     // ...
 *     return {
 *       screenWidth: 1920,
 *       screenHeight: 1080,
 *       scaleX: 1,
 *       scaleY: 1
 *     };
 *   }
 *
 *   async screenshot(): Promise<ScreenshotOutput> {
 *     // Implementation for taking screenshots
 *     // ...
 *     return { }; // screenshot output
 *   }
 *
 *   async execute(params: ExecuteParams): Promise<ExecuteOutput> {
 *     // Implementation for executing actions
 *     // ...
 *     return { }; // execution output
 *   }
 * }
 */
export abstract class Operator extends BaseOperator {
  // Track initialization state
  private _initialized = false;
  private _initializing = false;
  private _initPromise: Promise<void> | null = null;

  constructor() {
    super();
    // this.ensureInitialized();
  }

  /**
   * Initializes the operator
   * @description Performs initialization operations for the operator, such as validating connections,
   * setting up resources, and preparing the operation environment.
   * @returns Promise that resolves when initialization is complete
   * @throws Error if initialization fails
   */
  async doInitialize(): Promise<void> {
    // If already initialized, return immediately
    if (this._initialized) {
      return;
    }

    // If initialization is in progress, wait for it to complete
    if (this._initializing && this._initPromise) {
      return this._initPromise;
    }

    // Start initialization
    this._initializing = true;
    this._initPromise = (async () => {
      try {
        await this.initialize();
        this._initialized = true;
      } finally {
        this._initializing = false;
      }
    })();

    return this._initPromise;
  }

  /**
   * Implementation of initialization logic
   * @description Subclasses should implement this method to perform their specific initialization
   * @returns Promise that resolves when initialization is complete
   * @throws Error if initialization fails
   */
  protected abstract initialize(): Promise<void>;

  /**
   * Ensures the operator is initialized before performing operations
   * @private
   */
  private async ensureInitialized(): Promise<void> {
    if (!this._initialized && !this._initializing) {
      await this.doInitialize();
    } else if (this._initializing && this._initPromise) {
      await this._initPromise;
    }
  }

  /**
   * Safely returns an array of supported action types with initialization guarantee
   * @returns Array of action types supported by this operator
   */
  getSupportedActions(): Array<SupportedActionType> {
    // await this.ensureInitialized();
    return this.supportedActions();
  }

  /**
   * Returns an array of supported action types
   * @returns Array of action types supported by this operator
   */
  protected abstract supportedActions(): Array<SupportedActionType>;

  /**
   * Safely returns the screen context with initialization guarantee
   * @returns The screen context
   */
  async getScreenContext(): Promise<ScreenContext> {
    await this.ensureInitialized();
    return this.screenContext();
  }

  /**
   * Returns the screen context
   * @returns The screen context
   */
  protected abstract screenContext(): ScreenContext;

  /**
   * Safely takes a screenshot with initialization guarantee
   * @returns Promise that resolves to the screenshot output
   */
  async doScreenshot(): Promise<ScreenshotOutput> {
    try {
      await this.ensureInitialized();
      return await this.screenshot();
    } catch (error) {
      console.error('Error in doScreenshot:', error);
      return {
        base64: '',
        status: 'failed',
        errorMessage: (error as Error).message,
      };
    }
  }

  /**
   * Takes a screenshot
   * @returns Promise that resolves to the screenshot output
   */
  protected abstract screenshot(): Promise<ScreenshotOutput>;

  /**
   * Safely executes actions with initialization guarantee
   * @param params - The parameters for the actions
   * @returns Promise that resolves to the execution output
   */
  async doExecute(params: ExecuteParams): Promise<ExecuteOutput> {
    try {
      await this.ensureInitialized();
      return await this.execute(params);
    } catch (error) {
      console.error('Error in doExecute:', error);
      return {
        status: 'failed',
        errorMessage: (error as Error).message,
      };
    }
  }

  /**
   * Executes actions
   * @param params - The parameters for the actions
   * @returns Promise that resolves to the execution output
   */
  protected abstract execute(params: ExecuteParams): Promise<ExecuteOutput>;
}
