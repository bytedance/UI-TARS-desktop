/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ConsoleLogger } from '@agent-infra/logger';
import type {
  AIOAction,
  ActionResponse,
  ScreenshotResponse,
  AIOHybridOptions,
  MoveToAction,
  ClickAction,
  MouseDownAction,
  MouseUpAction,
  RightClickAction,
  DoubleClickAction,
  DragToAction,
  ScrollAction,
  TypingAction,
  PressAction,
  KeyDownAction,
  KeyUpAction,
  HotkeyAction,
} from './types';
import { AioClient } from '@agent-infra/sandbox';

const logger = new ConsoleLogger('AIOComputer');

export class AIOComputer {
  private baseURL: string;
  private timeout: number;
  private headers: Record<string, string>;
  private aioClient: AioClient;

  constructor(options: AIOHybridOptions) {
    this.baseURL = options.baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = options.timeout || 30000; // Default 30 seconds timeout
    this.aioClient = new AioClient({ baseUrl: this.baseURL });
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

  /**
   * Execute HTTP request
   */
  private async request(action: AIOAction): Promise<ActionResponse> {
    try {
      logger.info('[AIOComputer] Executing action:', action.action_type, action);

      const result = await this.aioClient.browserActions(action, {
        timeout: this.timeout,
        headers: this.headers,
      });

      logger.info('[AIOComputer] Action result:', result);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error('[AIOComputer] Action failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Take screenshot with optional delay
   * @param delay Optional delay in milliseconds before taking screenshot
   */
  async screenshot(delay = 1000): Promise<ScreenshotResponse> {
    try {
      logger.info('[AIOComputer] Taking screenshot' + (delay ? ` with ${delay}ms delay` : ''));

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const response = await this.aioClient.browserScreenshot({
        timeout: this.timeout,
        headers: this.headers,
      });

      // Check if response is image data
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.startsWith('image/')) {
        // If response is image data, convert to base64
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        logger.info('[AIOComputer] Screenshot taken successfully');

        return {
          success: true,
          data: {
            base64,
            scaleFactor: 1, // 默认缩放因子，可能需要从API获取实际值
            contentType,
          },
        };
      } else {
        // If response is JSON
        const result = await response.json();
        logger.info('[AIOComputer] Screenshot result:', result);

        return {
          success: true,
          data: result,
        };
      }
    } catch (error) {
      logger.error('[AIOComputer] Screenshot failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Move mouse to specified position
   */
  async moveTo(x: number, y: number): Promise<ActionResponse> {
    const action: MoveToAction = {
      action_type: 'MOVE_TO',
      x,
      y,
    };
    return this.request(action);
  }

  /**
   * Click operation
   */
  async click(
    x?: number,
    y?: number,
    button?: string,
    numClicks?: number,
  ): Promise<ActionResponse> {
    const action: ClickAction = {
      action_type: 'CLICK',
      ...(x !== undefined && { x }),
      ...(y !== undefined && { y }),
      ...(button && { button }),
      ...(numClicks && { num_clicks: numClicks }),
    };
    return this.request(action);
  }

  /**
   * Press mouse button
   */
  async mouseDown(button?: string): Promise<ActionResponse> {
    const action: MouseDownAction = {
      action_type: 'MOUSE_DOWN',
      ...(button && { button }),
    };
    return this.request(action);
  }

  /**
   * Release mouse button
   */
  async mouseUp(button?: string): Promise<ActionResponse> {
    const action: MouseUpAction = {
      action_type: 'MOUSE_UP',
      ...(button && { button }),
    };
    return this.request(action);
  }

  /**
   * Right click
   */
  async rightClick(x?: number, y?: number): Promise<ActionResponse> {
    const action: RightClickAction = {
      action_type: 'RIGHT_CLICK',
      ...(x !== undefined && { x }),
      ...(y !== undefined && { y }),
    };
    return this.request(action);
  }

  /**
   * Double click
   */
  async doubleClick(x?: number, y?: number): Promise<ActionResponse> {
    const action: DoubleClickAction = {
      action_type: 'DOUBLE_CLICK',
      ...(x !== undefined && { x }),
      ...(y !== undefined && { y }),
    };
    return this.request(action);
  }

  /**
   * Drag to specified position
   */
  async dragTo(x: number, y: number): Promise<ActionResponse> {
    const action: DragToAction = {
      action_type: 'DRAG_TO',
      x,
      y,
    };
    return this.request(action);
  }

  /**
   * Scroll operation
   */
  async scroll(dx?: number, dy?: number): Promise<ActionResponse> {
    const action: ScrollAction = {
      action_type: 'SCROLL',
      ...(dx !== undefined && { dx }),
      ...(dy !== undefined && { dy }),
    };
    return this.request(action);
  }

  /**
   * Type text
   */
  async type(text: string): Promise<ActionResponse> {
    const action: TypingAction = {
      action_type: 'TYPING',
      text,
    };
    return this.request(action);
  }

  /**
   * Press key
   */
  async press(key: string): Promise<ActionResponse> {
    const action: PressAction = {
      action_type: 'PRESS',
      key,
    };
    return this.request(action);
  }

  /**
   * Press down key
   */
  async keyDown(key: string): Promise<ActionResponse> {
    const action: KeyDownAction = {
      action_type: 'KEY_DOWN',
      key,
    };
    return this.request(action);
  }

  /**
   * Release key
   */
  async keyUp(key: string): Promise<ActionResponse> {
    const action: KeyUpAction = {
      action_type: 'KEY_UP',
      key,
    };
    return this.request(action);
  }

  /**
   * Hotkey combination
   */
  async hotkey(keys: string[]): Promise<ActionResponse> {
    // Convert all keys to lowercase
    const lowercaseKeys = keys.map((key: string) => key.toLowerCase());
    const action: HotkeyAction = {
      action_type: 'HOTKEY',
      keys: lowercaseKeys,
    };
    return this.request(action);
  }

  /**
   * Generic execute method
   */
  async execute(action: AIOAction): Promise<ActionResponse> {
    return this.request(action);
  }
}
