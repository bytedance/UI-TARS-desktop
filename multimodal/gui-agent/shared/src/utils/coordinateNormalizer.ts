/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseAction, Coordinates, NormalizeCoordinates } from '../types';

/**
 * Default coordinate normalization function
 * Normalizes raw coordinates by dividing by 1000 (simple scaling)
 * @param rawCoords - The raw coordinates to normalize
 * @returns Object containing normalized coordinates
 */
export const defaultNormalizeCoords: NormalizeCoordinates = (rawCoords: Coordinates) => {
  if (!rawCoords.raw) {
    return { normalized: rawCoords };
  }
  const normalizedCoords = {
    ...rawCoords,
    normalized: {
      x: rawCoords.raw.x / 1000,
      y: rawCoords.raw.y / 1000,
    },
  };
  return { normalized: normalizedCoords };
};

/**
 * Normalizes coordinates in a BaseAction object
 * Processes point, start, and end coordinate fields if they exist
 * @param action - The BaseAction object to normalize coordinates for
 * @param normalizeCoordinates - The coordinate normalization function to use
 * @returns The BaseAction object with normalized coordinates added
 */
export function normalizeActionCoords<T extends BaseAction>(
  action: T,
  normalizeCoordinates: NormalizeCoordinates,
): T {
  const normalizedAction = { ...action };

  // Normalize point coordinates
  if (
    normalizedAction.inputs &&
    'point' in normalizedAction.inputs &&
    normalizedAction.inputs.point
  ) {
    const normalizedResult = normalizeCoordinates(normalizedAction.inputs.point as Coordinates);
    normalizedAction.inputs.point = normalizedResult.normalized;
  }

  // Normalize start coordinates
  if (
    normalizedAction.inputs &&
    'start' in normalizedAction.inputs &&
    normalizedAction.inputs.start
  ) {
    const normalizedResult = normalizeCoordinates(normalizedAction.inputs.start as Coordinates);
    normalizedAction.inputs.start = normalizedResult.normalized;
  }

  // Normalize end coordinates
  // eslint-disable-next-line prettier/prettier
  if (normalizedAction.inputs && 'end' in normalizedAction.inputs && normalizedAction.inputs.end) {
    const normalizedResult = normalizeCoordinates(normalizedAction.inputs.end as Coordinates);
    normalizedAction.inputs.end = normalizedResult.normalized;
  }

  return normalizedAction;
}
