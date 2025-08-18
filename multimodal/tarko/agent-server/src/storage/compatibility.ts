/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionItemInfo, LegacySessionItemInfo } from './types';

/**
 * Convert legacy SessionItemInfo to new JSON schema format
 * Provides backward compatibility during the transition period
 */
export function migrateLegacyToJsonSchema(legacy: LegacySessionItemInfo): SessionItemInfo {
  const metadata: SessionItemInfo['metadata'] = { version: 1 };

  if (legacy.name) metadata.name = legacy.name;
  if (legacy.tags) metadata.tags = legacy.tags;
  if (legacy.modelConfig) metadata.modelConfig = legacy.modelConfig;

  return {
    id: legacy.id,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
    workspace: legacy.workspace,
    metadata: Object.keys(metadata).length > 1 ? metadata : undefined,
  };
}

/**
 * Extract legacy fields from JSON schema for backward compatibility
 * This allows existing code to continue working during transition
 */
export function extractLegacyFields(session: SessionItemInfo): LegacySessionItemInfo {
  return {
    id: session.id,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    workspace: session.workspace,
    name: session.metadata?.name,
    tags: session.metadata?.tags,
    modelConfig: session.metadata?.modelConfig,
  };
}

/**
 * Create a new session with JSON schema structure
 */
export function createJsonSchemaSession(
  id: string,
  workspace: string,
  options?: {
    name?: string;
    tags?: string[];
    modelConfig?: {
      provider: string;
      modelId: string;
      configuredAt: number;
    };
  },
): SessionItemInfo {
  const now = Date.now();
  const metadata: SessionItemInfo['metadata'] = { version: 1 };

  if (options?.name) metadata.name = options.name;
  if (options?.tags) metadata.tags = options.tags;
  if (options?.modelConfig) metadata.modelConfig = options.modelConfig;

  return {
    id,
    createdAt: now,
    updatedAt: now,
    workspace,
    metadata: Object.keys(metadata).length > 1 ? metadata : undefined,
  };
}
