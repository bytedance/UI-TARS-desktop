/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseAction, PredictionParsed } from '../types';

export abstract class BaseActionParser {
  abstract parseActionString(input: string): { thought?: string; actions?: string[] };
  abstract parseActionObject(actionString: string): BaseAction | null;
  abstract parsePrediction(input: string): PredictionParsed | null;
}
