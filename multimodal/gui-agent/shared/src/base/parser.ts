/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParsedGUIResponse } from '../types';

export abstract class BaseActionParser {
  /**
   * Parse model output
   * @param input Model output string
   * @returns Parsed ParsedGUIResponse object, returns null if parsing fails
   * There is no need to throw error, the error message is returned in ParsedGUIResponse
   */
  abstract parsePrediction(input: string): ParsedGUIResponse | null;
}
