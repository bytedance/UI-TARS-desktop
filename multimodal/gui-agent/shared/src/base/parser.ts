/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseAction, ParsedGUIResponse } from '../types';

export abstract class BaseActionParser {
  abstract extractActionStrings(input: string): {
    reasoningContent?: string;
    rawActionStrings?: string[];
  };
  abstract parseActionFromString(actionString: string): BaseAction | null;
  abstract parsePrediction(input: string): ParsedGUIResponse | null;
}
