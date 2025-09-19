/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { BaseAction } from '../types';

/**
 * Serializes a BaseAction into a string representation
 * Format: "actionType(param1='value1', param2='value2', ...)"
 */
export function serializeAction<T extends string, I extends Record<string, any>>(
  action: BaseAction<T, I>,
): string {
  const { type, inputs } = action;
  const params = Object.entries(inputs)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}='${value}'`;
      }
      if (typeof value === 'object' && value !== null) {
        if (value.raw) {
          return `${key}='(${value.raw.x}, ${value.raw.y})'`;
        }
        if (value.referenceBox) {
          return `${key}='<bbox>${value.referenceBox.x1}, ${value.referenceBox.y1}, ${value.referenceBox.x2}, ${value.referenceBox.y2}</bbox>'`;
        }
        if (value.normalized) {
          return `${key}='(${value.normalized.x}, ${value.normalized.y})'`;
        }
      }
      if (type === 'wait' && typeof value === 'number') {
        return `${key}='${value}s'`;
      }
      if (type === 'navigate' && typeof value === 'string') {
        return `url='${value}'`;
      }
      return `unsupported`;
    })
    .join(', ');
  return `${type}(${params})`;
}
