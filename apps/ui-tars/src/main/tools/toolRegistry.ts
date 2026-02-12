/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export const TOOL_REGISTRY_VERSION = '1.0.0';

export const TOOL_NAMES = [
  'app.launch',
  'window.focus',
  'window.wait_ready',
  'system.run',
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export type ToolRiskTier = 'low' | 'medium' | 'high';

export type ToolMetadata = {
  name: ToolName;
  toolVersion: string;
  description: string;
  deterministic: boolean;
  mutating: boolean;
  requiresIdempotencyKey: boolean;
  riskTier: ToolRiskTier;
  timeoutMs: number;
};

const DEFAULT_TOOL_ENTRIES: readonly ToolMetadata[] = [
  {
    name: 'system.run',
    toolVersion: TOOL_REGISTRY_VERSION,
    description: 'Run argv-based command through deterministic adapter',
    deterministic: true,
    mutating: true,
    requiresIdempotencyKey: true,
    riskTier: 'high',
    timeoutMs: 15000,
  },
  {
    name: 'app.launch',
    toolVersion: TOOL_REGISTRY_VERSION,
    description: 'Launch application from deterministic target identifiers',
    deterministic: true,
    mutating: true,
    requiresIdempotencyKey: true,
    riskTier: 'high',
    timeoutMs: 20000,
  },
  {
    name: 'window.focus',
    toolVersion: TOOL_REGISTRY_VERSION,
    description: 'Focus existing window by deterministic identity hints',
    deterministic: true,
    mutating: true,
    requiresIdempotencyKey: true,
    riskTier: 'medium',
    timeoutMs: 8000,
  },
  {
    name: 'window.wait_ready',
    toolVersion: TOOL_REGISTRY_VERSION,
    description: 'Wait until target window reaches ready state',
    deterministic: true,
    mutating: false,
    requiresIdempotencyKey: false,
    riskTier: 'low',
    timeoutMs: 10000,
  },
];

export class ToolRegistry {
  private readonly byName = new Map<ToolName, ToolMetadata>();

  register(tool: ToolMetadata): void {
    this.byName.set(tool.name, { ...tool });
  }

  get(name: ToolName): ToolMetadata | null {
    const item = this.byName.get(name);
    return item ? { ...item } : null;
  }

  list(): ToolMetadata[] {
    return Array.from(this.byName.values()).map((tool) => ({ ...tool }));
  }
}

export const createDefaultToolRegistry = (): ToolRegistry => {
  const registry = new ToolRegistry();
  for (const tool of DEFAULT_TOOL_ENTRIES) {
    registry.register(tool);
  }
  return registry;
};
