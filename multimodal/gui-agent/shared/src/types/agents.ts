/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ConsoleLogger } from '@agent-infra/logger';
import { AgentOptions } from '@tarko/agent-interface';
import { Factors, BaseAction, Coordinates } from './actions';

/**
 * Type definition for parsed GUI response structure
 * Represents the components extracted from a model's output string
 * Aligned with tarko's web UI design
 */
export interface ParsedGUIResponse {
  /** raw prediction string */
  rawContent: string;
  /** parsed from Thought: `<thought>` */
  reasoningContent?: string;
  /** parsed from Action: action(params=`action`) */
  rawActionStrings: string[];
  /** parsed from Action: action(params=`action`) */
  actions: BaseAction[];
  /** error message to feedback to LLM */
  errorMessage?: string;
}

/**
 * Type definition for function to normalize raw coordinates
 * Converts raw pixel coordinates to normalized coordinates (0-1)
 * @param rawX - Raw X coordinate in pixels
 * @param rawY - Raw Y coordinate in pixels
 * @returns Normalized coordinates {x, y} with values between 0 and 1
 */
export type NormalizeCoordinates = (
  rawCoords: Coordinates,
  factors?: Factors,
) => { normalized: Coordinates };

/**
 * Type definition for handler function to parse model output into ParsedGUIResponse object
 * @param prediction - The raw output from the model to be parsed
 * @returns ParsedGUIResponse object if parsing is successful, null otherwise
 */
export type CustomActionParser = (prediction: string) => ParsedGUIResponse | null;

/**
 * Type definition for a function that converts BaseAction array to string representation
 * @param actions - Array of BaseAction objects to be converted to string
 * @returns String representation of the actions
 */
export type SerializeSupportedActions = (
  actions: Array<
    Pick<BaseAction, 'type' | 'inputs'> & {
      description: string;
      example?: Record<string, unknown>;
    }
  >,
) => string;

export interface ExecuteParams extends ParsedGUIResponse {
  context?: Record<string, unknown>;
}

export type ExecuteOutput = {
  status: 'success' | 'failed';
  errorMessage?: string;
  url?: string; // url of the page
} & Record<string, any>;

export interface ScreenshotOutput extends ExecuteOutput {
  /** screenshot base64, `keep screenshot size as physical pixels` */
  base64: string;
}

/**
 * Reserved placeholder name for action space in system prompt template
 */
export const ACTION_SPACE_PLACEHOLDER = 'action_space';

/**
 * Interface for system prompt template configuration
 */
export interface SystemPromptTemplate {
  /**
   * Template string with placeholders. Must include an action space placeholder
   * `{${ACTION_SPACE_PLACEHOLDER}}` that will be replaced with the string representation of available actions
   */
  template: string;

  /**
   * Function to convert BaseAction array to string representation for the action space
   * This will be used to fill the action space placeholder in the template
   */
  actionsToString?: SerializeSupportedActions;

  /**
   * Optional map of additional placeholder values to be replaced in the template
   * Keys are placeholder names, values are the replacement strings
   * Note: '${ACTION_SPACE_PLACEHOLDER}' is a reserved placeholder and should NOT be included here
   * as it will be automatically filled using the actionsToString function
   */
  // placeholders?: Omit<Record<string, string>, typeof ACTION_SPACE_PLACEHOLDER>;
  placeholders?: Record<string, string>;
}

export interface GUIAgentConfig<TOperator> extends AgentOptions {
  operator: TOperator;
  // ===== Optional =====
  /**
   * System prompt configuration. Can be either:
   * - A simple string (legacy mode)
   * - A SystemPromptTemplate object with template and actionsToString function
   */
  systemPrompt?: string | SystemPromptTemplate;
  /** The handler function to parse model output into PredictionParsed object */
  customeActionParser?: CustomActionParser;
  /** The function to normalize raw coordinates */
  normalizeCoordinates?: NormalizeCoordinates;
  /** Maximum number of turns for Agent to execute, @default 100 */
  maxLoopCount?: number;
  /** Time interval between two loop iterations (in milliseconds), @default 0 */
  loopIntervalInMs?: number;
  /** The logger for GUI Agent */
  logger?: ConsoleLogger;
}
