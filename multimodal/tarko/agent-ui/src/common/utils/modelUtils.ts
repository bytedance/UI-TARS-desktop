/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionItemMetadata } from '@tarko/interface';

/**
 * Get the display name for a model configuration.
 * Returns displayName if available, otherwise falls back to modelId.
 *
 * @param modelConfig - The model configuration object
 * @returns The display name or model ID
 */
export function getModelDisplayName(modelConfig?: SessionItemMetadata['modelConfig']): string {
  if (!modelConfig?.id) {
    return '';
  }

  // Check for displayName first, then fall back to id
  if (modelConfig.displayName && modelConfig.displayName.trim()) {
    return modelConfig.displayName;
  }

  return modelConfig.id;
}
