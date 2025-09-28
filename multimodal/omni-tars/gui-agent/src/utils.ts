/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { BaseAction } from '@gui-agent/shared/types';

/**
 * Convert parsed prediction to normalized GUI action with percentage coordinates
 *
 * @param parsed - Parsed prediction with action type and inputs
 * @param result - Execute result with coordinates
 * @returns Normalized GUI action with strict typing
 */
export function convertToAgentUIAction(action: BaseAction): Record<string, any> {
  const { type: action_type, inputs: action_inputs } = action;

  switch (action_type) {
    case 'click':
    case 'left_click':
    case 'left_single': {
      return {
        type: 'click',
        inputs: {
          startX: action_inputs.point.normalized.x || 0,
          startY: action_inputs.point.normalized.y || 0,
        },
      };
    }

    case 'double_click':
    case 'left_double': {
      return {
        type: 'double_click',
        inputs: {
          startX: action_inputs.point.normalized.x || 0,
          startY: action_inputs.point.normalized.y || 0,
        },
      };
    }

    case 'right_click':
    case 'right_single': {
      return {
        type: 'right_click',
        inputs: {
          startX: action_inputs.point.normalized.x || 0,
          startY: action_inputs.point.normalized.y || 0,
        },
      };
    }

    case 'drag': {
      return {
        type: 'drag',
        inputs: {
          startX: action_inputs.start.normalized.x || 0,
          startY: action_inputs.start.normalized.y || 0,
          endX: action_inputs.end.normalized.x || 0,
          endY: action_inputs.end.normalized.y || 0,
        },
      };
    }
    case 'scroll': {
      return {
        type: 'scroll',
        inputs: {
          startX: action_inputs.point?.normalized?.x || 0,
          startY: action_inputs.point?.normalized?.y || 0,
          direction: (action_inputs.direction as 'up' | 'down' | 'left' | 'right') || 'down',
        },
      };
    }
    case 'navigate': {
      return {
        type: 'navigate',
        inputs: {
          url: action_inputs.url || action_inputs.content || '',
        },
      };
    }
    default: // 'type/'hotkey'/'wait'/'navigate_back':
      return action;
  }
}

/**
 * Create a default error action for failed operations
 *
 * @returns Default wait action for error scenarios
 */
export function createErrorAction(): Record<string, any> {
  return {
    type: 'wait',
    inputs: {},
  };
}
