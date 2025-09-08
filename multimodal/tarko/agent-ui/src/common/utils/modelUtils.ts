/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionInfo } from '@tarko/interface';

/**
 * Get the display name for a model configuration.
 * Returns displayName if available, otherwise falls back to modelId.
 *
 * @param modelConfig - The model configuration object
 * @returns The display name or model ID
 */
export function getModelDisplayName(
  modelConfig?: SessionInfo['metadata']['modelConfig'],
): string {
  if (!modelConfig?.modelId) {
    return '';
  }

  return modelConfig.displayName || modelConfig.modelId;
}

/**
 * Get the display name for a model from session metadata.
 * Convenience function that extracts modelConfig from session metadata.
 *
 * @param sessionMetadata - The session metadata object
 * @returns The display name or model ID
 */
export function getModelDisplayNameFromSession(
  sessionMetadata?: SessionInfo['metadata'],
): string {
  return getModelDisplayName(sessionMetadata?.modelConfig);
}
