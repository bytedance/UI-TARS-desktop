/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
// import { PredictionParsed } from '@ui-tars/shared';
import { ConsoleLogger } from '@agent-infra/logger';
import { ChatCompletionMessageToolCall, LogLevel } from '@tarko/agent-interface';
import { ActionParserHelper } from '@gui-agent/action-parser';
import { BaseAction, Coordinates } from '@gui-agent/shared/types';
import { serializeAction } from '@gui-agent/shared/utils';
import { convertToAgentUIAction } from './utils';

export interface BrowserVisionControlCall extends ChatCompletionMessageToolCall {
  id: string;
  type: 'function';
  function: {
    name: 'browser_vision_control';
    arguments: string;
  };
}

export class GUIAgentT5Adapter {
  private logger: ConsoleLogger;
  private helper: ActionParserHelper;

  constructor(logger?: ConsoleLogger) {
    this.logger = logger || new ConsoleLogger('[GUIAgentT5Adapter]', LogLevel.DEBUG);
    this.helper = new ActionParserHelper(this.logger);
  }

  /**
   * Convert tool definition array to browser_vision_control call format
   * @param tools Tool definition array
   * @param reasoningBuffer Reasoning buffer content
   * @returns browser_vision_control call object array
   */
  public convertToBrowserVisionControlCalls(
    tools: ChatCompletionMessageToolCall[],
    reasoningBuffer: string,
  ): BrowserVisionControlCall[] {
    return tools.map((tool) => {
      this.logger.debug(`[convertToBVCCalls] Processing tool: ${JSON.stringify(tool)}`);

      const { roughType, roughInputs } = this.helper.parseRoughFromFunctionCall(tool.function);
      const operator_action = this.helper.standardizeAction(roughType, roughInputs);
      this.logger.debug(
        `[convertToBVCCalls] Standardized action: ${JSON.stringify(operator_action)}`,
      );
      this.normalizeActionCoordinates(operator_action.inputs);
      this.logger.debug(
        `[convertToBVCCalls] Normalized action: ${JSON.stringify(operator_action)}`,
      );
      const actionString = serializeAction(operator_action);
      this.logger.debug(`[convertToBVCCalls] Serialized action: ${actionString}`);
      const action_for_gui_render = convertToAgentUIAction(operator_action);
      this.logger.debug(
        `[convertToBVCCalls] action_for_gui: ${JSON.stringify(action_for_gui_render)}`,
      );

      const browserCall: BrowserVisionControlCall = {
        id: tool.id,
        type: 'function',
        function: {
          name: 'browser_vision_control',
          arguments: JSON.stringify({
            action: actionString,
            step: '',
            thought: reasoningBuffer,
            operator_action: [operator_action],
            action_for_gui: action_for_gui_render,
          }),
        },
      };

      this.logger.debug(`[convertToBVCCalls] Generated browser call for tool ${tool.id}`);
      return browserCall;
    });
  }

  /**
   * Normalize coordinates in action inputs
   * Traverses point, start, and end fields in actionInputs
   * If they are Coordinates type, applies normalization
   * @param actionInputs The action inputs to process
   */
  private normalizeActionCoordinates(actionInputs: Record<string, unknown>): void {
    if (!actionInputs || typeof actionInputs !== 'object') {
      return;
    }
    // Check and normalize 'point' field
    if (actionInputs.point && typeof actionInputs.point === 'object') {
      actionInputs.point = this.normalizeCoordinates(actionInputs.point);
    }
    // Check and normalize 'start' field
    if (actionInputs.start && typeof actionInputs.start === 'object') {
      actionInputs.start = this.normalizeCoordinates(actionInputs.start);
    }
    // Check and normalize 'end' field
    if (actionInputs.end && typeof actionInputs.end === 'object') {
      actionInputs.end = this.normalizeCoordinates(actionInputs.end);
    }
  }

  private normalizeCoordinates(coords: Coordinates): Coordinates {
    if (coords.raw) {
      coords.normalized = {
        x: coords.raw.x / 1000,
        y: coords.raw.y / 1000,
      };
    }
    return coords;
  }
}
