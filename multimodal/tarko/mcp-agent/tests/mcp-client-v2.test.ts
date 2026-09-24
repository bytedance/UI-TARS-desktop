/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '@agent-infra/logger';

const { initClient, listTools, cleanupClient } = vi.hoisted(() => ({
  initClient: vi.fn<() => Promise<void>>(),
  listTools: vi.fn<() => Promise<never>>(),
  cleanupClient: vi.fn<() => Promise<void>>(),
}));

vi.mock('@agent-infra/mcp-client', () => ({
  MCPClient: class {
    init() {
      return initClient();
    }

    listTools() {
      return listTools();
    }

    cleanup() {
      return cleanupClient();
    }
  },
}));

import { MCPClientV2 } from '../src/mcp-client-v2';

const logger = {
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
} as unknown as Logger;

describe('MCPClientV2 cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initClient.mockResolvedValue(undefined);
    listTools.mockRejectedValue(new Error('connection closed'));
    cleanupClient.mockResolvedValue(undefined);
  });

  it('cleans up a partially initialized client after initialization fails', async () => {
    const client = new MCPClientV2('broken', { command: 'broken-server' }, logger);

    await expect(client.initialize()).rejects.toThrow('connection closed');
    await client.close();
    await client.close();

    expect(cleanupClient).toHaveBeenCalledOnce();
  });
});
