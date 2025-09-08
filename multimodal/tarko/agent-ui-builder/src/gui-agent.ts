/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GUIAgent, ActionInputs, PredictionParsed } from '@tarko/agent-interface';

/**
 * Execute result interface for GUI operations
 * FIXME: migrate to GUI-Agent package
 */
export interface GUIExecuteResult {
  startX?: number | null;
  startY?: number | null;
  startXPercent?: number | null;
  startYPercent?: number | null;
  action_inputs: ActionInputs;
}

/**
 * Convert legacy prediction result to new GUI Agent response format
 * This utility allows any Agent to easily adopt the new GUI Agent type system
 *
 * @param actionStr - Raw action string as received from the model
 * @param parsed - Parsed prediction with action type and inputs
 * @param result - Execute result with coordinates and action inputs
 * @returns Standardized GUI Agent tool response
 */
export function convertToGUIResponse(
  actionStr: string,
  parsed: PredictionParsed,
  result: GUIExecuteResult,
): GUIAgent.ToolResponse {
  const normalizedAction = convertToNormalizedAction(parsed, result);

  return {
    success: true,
    action: actionStr,
    normalizedAction,
    observation: undefined, // Reserved for future implementation
  };
}

/**
 * Convert parsed prediction to normalized GUI action with percentage coordinates
 *
 * @param parsed - Parsed prediction with action type and inputs
 * @param result - Execute result with coordinates
 * @returns Normalized GUI action with strict typing
 */
export function convertToNormalizedAction(
  parsed: PredictionParsed,
  result: GUIExecuteResult,
): GUIAgent.Action {
  const { action_type, action_inputs } = parsed;
  const { startXPercent, startYPercent } = result;

  switch (action_type) {
    case 'click':
    case 'left_click':
    case 'left_single': {
      const clickAction: GUIAgent.ClickAction = {
        type: 'click',
        inputs: {
          startX: startXPercent || 0,
          startY: startYPercent || 0,
        },
      };
      return clickAction;
    }

    case 'double_click':
    case 'left_double': {
      const doubleClickAction: GUIAgent.DoubleClickAction = {
        type: 'double_click',
        inputs: {
          startX: startXPercent || 0,
          startY: startYPercent || 0,
        },
      };
      return doubleClickAction;
    }

    case 'right_click':
    case 'right_single': {
      const rightClickAction: GUIAgent.RightClickAction = {
        type: 'right_click',
        inputs: {
          startX: startXPercent || 0,
          startY: startYPercent || 0,
        },
      };
      return rightClickAction;
    }

    case 'drag': {
      // Parse end coordinates from action_inputs.end_box
      const endBox = action_inputs.end_box;
      let endXPercent = 0;
      let endYPercent = 0;
      if (endBox) {
        try {
          const coords = JSON.parse(endBox);
          if (Array.isArray(coords) && coords.length >= 2) {
            endXPercent = coords[0];
            endYPercent = coords[1];
          }
        } catch (e) {
          console.warn('Failed to parse end_box coordinates:', endBox);
        }
      }
      const dragAction: GUIAgent.DragAction = {
        type: 'drag',
        inputs: {
          startX: startXPercent || 0,
          startY: startYPercent || 0,
          endX: endXPercent,
          endY: endYPercent,
        },
      };
      return dragAction;
    }

    case 'type': {
      const typeAction: GUIAgent.TypeAction = {
        type: 'type',
        inputs: {
          content: action_inputs.content || '',
        },
      };
      return typeAction;
    }

    case 'hotkey': {
      const hotkeyAction: GUIAgent.HotkeyAction = {
        type: 'hotkey',
        inputs: {
          key: action_inputs.key || action_inputs.hotkey || '',
        },
      };
      return hotkeyAction;
    }

    case 'scroll': {
      const scrollAction: GUIAgent.ScrollAction = {
        type: 'scroll',
        inputs: {
          startX: startXPercent || 0,
          startY: startYPercent || 0,
          direction: (action_inputs.direction as 'up' | 'down' | 'left' | 'right') || 'down',
        },
      };
      return scrollAction;
    }

    case 'wait': {
      const waitAction: GUIAgent.WaitAction = {
        type: 'wait',
        inputs: {},
      };
      return waitAction;
    }

    case 'navigate': {
      const navigateAction: GUIAgent.NavigateAction = {
        type: 'navigate',
        inputs: {
          url: action_inputs.content || '',
        },
      };
      return navigateAction;
    }

    case 'navigate_back': {
      const navigateBackAction: GUIAgent.NavigateBackAction = {
        type: 'navigate_back',
        inputs: {},
      };
      return navigateBackAction;
    }

    default: {
      // For unknown action types, return the raw type with empty inputs
      console.warn(`Unknown action type: ${action_type}, returning raw type`);
      const fallbackAction: GUIAgent.BaseAction = {
        type: action_type as any,
        inputs: {},
      };
      return fallbackAction as GUIAgent.Action;
    }
  }
}

/**
 * Create a default error action for failed operations
 *
 * @returns Default wait action for error scenarios
 */
export function createErrorAction(): GUIAgent.Action {
  const errorAction: GUIAgent.WaitAction = {
    type: 'wait',
    inputs: {},
  };
  return errorAction;
}

/**
 * Create an error response for failed GUI operations
 *
 * @param actionStr - Raw action string that failed
 * @param error - Error that occurred
 * @returns Error response in GUI Agent format
 */
export function createGUIErrorResponse(actionStr: string, error: unknown): GUIAgent.ToolResponse {
  return {
    success: false,
    action: actionStr,
    normalizedAction: createErrorAction(),
    error: error instanceof Error ? error.message : String(error),
  };
}
