/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * FIXME: migrate to GUI-Agent package
 *
 * GUI Agent types for Tarko Agent Web UI display.
 * These types are specifically designed for UI rendering and are not part of the internal GUIAgent protocol.
 */
export namespace GUIAgent {
  /**
   * Base interface for all GUI Agent action types
   * Defines the fundamental structure that all actions must follow
   */
  export interface BaseAction<
    T extends string = string,
    I extends Record<string, any> = Record<string, any>,
  > {
    type: T;
    inputs: I;
  }

  /**
   * Click action with coordinates
   */
  export type ClickAction = BaseAction<
    'click',
    {
      startX: number; // Percentage coordinates (0-1)
      startY: number; // Percentage coordinates (0-1)
    }
  >;

  /**
   * Double click action with coordinates
   */
  export type DoubleClickAction = BaseAction<
    'double_click' | 'left_double',
    {
      startX: number; // Percentage coordinates (0-1)
      startY: number; // Percentage coordinates (0-1)
    }
  >;

  /**
   * Right click action with coordinates
   */
  export type RightClickAction = BaseAction<
    'right_click' | 'right_single',
    {
      startX: number; // Percentage coordinates (0-1)
      startY: number; // Percentage coordinates (0-1)
    }
  >;

  /**
   * Drag action with start and end coordinates
   */
  export type DragAction = BaseAction<
    'drag',
    {
      startX: number; // Percentage coordinates (0-1)
      startY: number; // Percentage coordinates (0-1)
      endX: number; // Percentage coordinates (0-1)
      endY: number; // Percentage coordinates (0-1)
    }
  >;

  /**
   * Type action with text content
   */
  export type TypeAction = BaseAction<
    'type',
    {
      content: string;
    }
  >;

  /**
   * Hotkey action with key combination
   */
  export type HotkeyAction = BaseAction<
    'hotkey',
    {
      key: string;
    }
  >;

  /**
   * Scroll action with coordinates and direction
   */
  export type ScrollAction = BaseAction<
    'scroll',
    {
      startX: number; // Percentage coordinates (0-1)
      startY: number; // Percentage coordinates (0-1)
      direction: 'up' | 'down' | 'left' | 'right';
    }
  >;

  /**
   * Wait action with no inputs
   */
  export type WaitAction = BaseAction<'wait', Record<string, never>>;

  /**
   * Navigate action with URL
   */
  export type NavigateAction = BaseAction<
    'navigate',
    {
      url: string;
    }
  >;

  /**
   * Navigate back action
   */
  export type NavigateBackAction = BaseAction<'navigate_back', Record<string, never>>;

  /**
   * Union type of all possible GUI actions
   */
  export type Action =
    | ClickAction
    | DoubleClickAction
    | RightClickAction
    | DragAction
    | TypeAction
    | HotkeyAction
    | ScrollAction
    | WaitAction
    | NavigateAction
    | NavigateBackAction;

  /**
   * Generic GUI Agent tool response with strict typing
   */
  export interface ToolResponse<T extends Action = Action> {
    /**
     * Whether the operation was successful
     */
    success: boolean;

    /**
     * Raw action string as received from the model
     */
    action: string;

    /**
     * Parsed and normalized action with strict typing
     */
    normalizedAction: T;

    /**
     * Optional observation after the action (reserved for future implementation)
     */
    observation?: string;

    /**
     * Error message if the operation failed
     */
    error?: string;
  }

  /**
   * Type-specific response types for better type safety
   */
  export type ClickResponse = ToolResponse<ClickAction>;
  export type DoubleClickResponse = ToolResponse<DoubleClickAction>;
  export type RightClickResponse = ToolResponse<RightClickAction>;
  export type DragResponse = ToolResponse<DragAction>;
  export type TypeResponse = ToolResponse<TypeAction>;
  export type HotkeyResponse = ToolResponse<HotkeyAction>;
  export type ScrollResponse = ToolResponse<ScrollAction>;
  export type WaitResponse = ToolResponse<WaitAction>;
  export type NavigateResponse = ToolResponse<NavigateAction>;
  export type NavigateBackResponse = ToolResponse<NavigateBackAction>;
}

/**
 * Legacy action inputs interface for backward compatibility
 * @deprecated Use the new GUIAgent types instead
 */
export interface ActionInputs {
  content?: string;
  start_box?: string;
  end_box?: string;
  key?: string;
  hotkey?: string;
  direction?: string;
  start_coords?: [number, number] | [];
  end_coords?: [number, number] | [];
}

/**
 * Legacy parsed prediction interface for backward compatibility
 * @deprecated Use the new GUIAgent types instead
 */
export interface PredictionParsed {
  /** Action inputs parsed from action_type(action_inputs) */
  action_inputs: ActionInputs;
  /** Action type parsed from action_type(action_inputs) */
  action_type: string;
  /** Thinking content */
  thought?: string;
}
