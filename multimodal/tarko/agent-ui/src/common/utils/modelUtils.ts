/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionItemMetadata } from '@tarko/interface';
import { AgentModel } from '@tarko/agent-interface';

/**
 * Get the display name for a model.
 * Returns displayName if available, otherwise falls back to modelId.
 *
 * @param model - The model object (AgentModel or modelConfig)
 * @returns The display name or model ID
 */
export function getModelDisplayName(model?: AgentModel | SessionItemMetadata['modelConfig']): string {
  if (!model?.id) {
    return '';
  }

  return model.displayName || model.id;
}
