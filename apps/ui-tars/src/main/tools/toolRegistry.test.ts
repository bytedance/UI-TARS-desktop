/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import {
  createDefaultToolRegistry,
  TOOL_NAMES,
  TOOL_REGISTRY_VERSION,
} from './toolRegistry';

describe('toolRegistry', () => {
  it('registers all deterministic tool-first metadata entries', () => {
    const registry = createDefaultToolRegistry();
    const tools = registry.list();

    expect(tools).toHaveLength(4);
    expect(tools.map((tool) => tool.name).sort()).toEqual(
      [...TOOL_NAMES].sort(),
    );
    expect(
      tools.every((tool) => tool.toolVersion === TOOL_REGISTRY_VERSION),
    ).toBe(true);
    expect(tools.every((tool) => tool.deterministic)).toBe(true);
  });

  it('marks mutating tools as idempotent-key required', () => {
    const registry = createDefaultToolRegistry();
    const mutatingTools = registry.list().filter((tool) => tool.mutating);

    expect(mutatingTools.length).toBeGreaterThan(0);
    expect(mutatingTools.every((tool) => tool.requiresIdempotencyKey)).toBe(
      true,
    );
  });

  it('returns null for unknown tools', () => {
    const registry = createDefaultToolRegistry();

    expect(registry.get('system.run')).not.toBeNull();
    expect(registry.get('not-real-tool' as never)).toBeNull();
  });
});
