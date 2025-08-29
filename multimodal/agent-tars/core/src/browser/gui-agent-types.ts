/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Base interface for all GUI Agent action types
 */
export interface BaseGUIAction {
  type: string;
}

/**
 * Click action with coordinates
 */
export interface ClickAction extends BaseGUIAction {
  type: 'click';
  inputs: {
    startX: number; // Percentage coordinates (0-1)
    startY: number; // Percentage coordinates (0-1)
  };
}

/**
 * Double click action with coordinates
 */
export interface DoubleClickAction extends BaseGUIAction {
  type: 'double_click' | 'left_double';
  inputs: {
    startX: number; // Percentage coordinates (0-1)
    startY: number; // Percentage coordinates (0-1)
  };
}

/**
 * Right click action with coordinates
 */
export interface RightClickAction extends BaseGUIAction {
  type: 'right_click' | 'right_single';
  inputs: {
    startX: number; // Percentage coordinates (0-1)
    startY: number; // Percentage coordinates (0-1)
  };
}

/**
 * Drag action with start and end coordinates
 */
export interface DragAction extends BaseGUIAction {
  type: 'drag';
  inputs: {
    startX: number; // Percentage coordinates (0-1)
    startY: number; // Percentage coordinates (0-1)
    endX: number; // Percentage coordinates (0-1)
    endY: number; // Percentage coordinates (0-1)
  };
}

/**
 * Type action with text content
 */
export interface TypeAction extends BaseGUIAction {
  type: 'type';
  inputs: {
    content: string;
  };
}

/**
 * Hotkey action with key combination
 */
export interface HotkeyAction extends BaseGUIAction {
  type: 'hotkey';
  inputs: {
    key: string;
  };
}

/**
 * Scroll action with coordinates and direction
 */
export interface ScrollAction extends BaseGUIAction {
  type: 'scroll';
  inputs: {
    startX: number; // Percentage coordinates (0-1)
    startY: number; // Percentage coordinates (0-1)
    direction: 'up' | 'down' | 'left' | 'right';
  };
}

/**
 * Wait action with no inputs
 */
export interface WaitAction extends BaseGUIAction {
  type: 'wait';
  inputs: Record<string, never>; // Empty object
}

/**
 * Navigate action with URL
 */
export interface NavigateAction extends BaseGUIAction {
  type: 'navigate';
  inputs: {
    url: string;
  };
}

/**
 * Navigate back action
 */
export interface NavigateBackAction extends BaseGUIAction {
  type: 'navigate_back';
  inputs: Record<string, never>; // Empty object
}

/**
 * Union type of all possible GUI actions
 */
export type GUIAction =
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
export interface GUIAgentToolResponse<T extends GUIAction = GUIAction> {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Raw action string as received from the model
   */
  actionStr: string;
  
  /**
   * Parsed and normalized action with strict typing
   */
  action: T;
  
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
export type ClickResponse = GUIAgentToolResponse<ClickAction>;
export type DoubleClickResponse = GUIAgentToolResponse<DoubleClickAction>;
export type RightClickResponse = GUIAgentToolResponse<RightClickAction>;
export type DragResponse = GUIAgentToolResponse<DragAction>;
export type TypeResponse = GUIAgentToolResponse<TypeAction>;
export type HotkeyResponse = GUIAgentToolResponse<HotkeyAction>;
export type ScrollResponse = GUIAgentToolResponse<ScrollAction>;
export type WaitResponse = GUIAgentToolResponse<WaitAction>;
export type NavigateResponse = GUIAgentToolResponse<NavigateAction>;
export type NavigateBackResponse = GUIAgentToolResponse<NavigateBackAction>;

/**
 * Legacy action inputs interface for backward compatibility
 * @deprecated Use the new GUIAction types instead
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
 * @deprecated Use the new GUIAction types instead
 */
export interface PredictionParsed {
  /** Action inputs parsed from action_type(action_inputs) */
  action_inputs: ActionInputs;
  /** Action type parsed from action_type(action_inputs) */
  action_type: string;
  /** Thinking content */
  thought?: string;
}
