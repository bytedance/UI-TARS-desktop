/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseAction, ParsedGUIResponse } from '../types';

export abstract class BaseActionParser {
  /**
   * Extract action strings from input
   * @param input Input string
   * @returns Object containing reasoning content and raw action strings
   * @throws {Error} When input format is invalid or parsing fails
   */
  abstract extractActionStrings(input: string): {
    reasoningContent?: string;
    rawActionStrings?: string[];
  };

  /**
   * Parse action string into action object
   * @param actionString Action string to parse
   * @returns Parsed BaseAction object, returns null if parsing fails
   * @throws {SyntaxError} When action string format is invalid
   */
  abstract parseActionFromString(actionString: string): BaseAction | null;

  /**
   * Parse model output
   * @param input Model output string
   * @returns Parsed ParsedGUIResponse object, returns null if parsing fails
   * There is no need to throw error, the error message is returned in ParsedGUIResponse
   */
  abstract parsePrediction(input: string): ParsedGUIResponse | null;
}
