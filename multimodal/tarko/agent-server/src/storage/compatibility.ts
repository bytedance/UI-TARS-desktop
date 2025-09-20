/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionInfo, LegacySessionItemInfo } from './types';

/**
 * Convert legacy SessionInfo to new JSON schema format
 * Provides backward compatibility during the transition period
 */
export function migrateLegacyToJsonSchema(legacy: LegacySessionItemInfo): SessionInfo {
  const metadata: SessionInfo['metadata'] = { version: 1 };

  if (legacy.name) metadata.name = legacy.name;
  if (legacy.tags) metadata.tags = legacy.tags;
  if (legacy.modelConfig) {
    metadata.modelConfig = {
      provider: legacy.modelConfig.provider,
      modelId: (legacy.modelConfig as any).modelId || (legacy.modelConfig as any).id,
      configuredAt: (legacy.modelConfig as any).configuredAt || Date.now(),
    } as any;
  }

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
export function extractLegacyFields(session: SessionInfo): LegacySessionItemInfo {
  const modelConfig = session.metadata?.modelConfig;
  return {
    id: session.id,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    workspace: session.workspace,
    name: session.metadata?.name,
    tags: session.metadata?.tags,
    modelConfig: modelConfig ? {
      provider: modelConfig.provider,
      modelId: (modelConfig as any).modelId || (modelConfig as any).id,
      configuredAt: (modelConfig as any).configuredAt || Date.now(),
    } as any : undefined,
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
      id: string;
      configuredAt: number;
    };
  },
): SessionInfo {
  const now = Date.now();
  const metadata: SessionInfo['metadata'] = { version: 1 };

  if (options?.name) metadata.name = options.name;
  if (options?.tags) metadata.tags = options.tags;
  if (options?.modelConfig) {
    metadata.modelConfig = {
      provider: options.modelConfig.provider,
      modelId: options.modelConfig.id,
      configuredAt: (options.modelConfig as any).configuredAt || Date.now(),
    } as any;
  }

  return {
    id,
    createdAt: now,
    updatedAt: now,
    workspace,
    metadata: Object.keys(metadata).length > 1 ? metadata : undefined,
  };
}
