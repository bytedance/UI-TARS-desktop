/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FACTORS } from '@ui-tars/sdk/constants';
import { parseBoxToScreenCoords as _parseBoxToScreenCoords } from '@ui-tars/shared/utils';

/**
 * boxStr convert to screen coords
 * @param boxStr box string (format: "[x1,y1,x2,y2]" or "[x,y]")
 * @param width screen width
 * @param height screen height
 * @returns calculated center point coords {x, y}
 */
export function parseBoxToScreenCoords(
  boxStr: string,
  width: number,
  height: number,
): { x: number; y: number } {
  return _parseBoxToScreenCoords(boxStr, width, height, FACTORS);
}
