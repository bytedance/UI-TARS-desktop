/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConsoleLogger } from '@tarko/mcp-agent';
import { AgentTARSAIOEnvironment } from '../../src/environments/aio';
import { AgentTARSOptions } from '../../src/types';

describe('AgentTARSAIOEnvironment', () => {
  let environment: AgentTARSAIOEnvironment;
  let logger: ConsoleLogger;
  let options: AgentTARSOptions;

  beforeEach(() => {
    logger = new ConsoleLogger('test-aio-env');
    options = {
      aioSandbox: 'http://localhost:8080',
      model: {
        provider: 'openai',
        name: 'gpt-4',
      },
    };
    environment = new AgentTARSAIOEnvironment(options, '/tmp/test-workspace', logger);
  });

  describe('initialization', () => {
    it('should initialize without local components', async () => {
      const registerToolFn = vi.fn();
      
      await environment.initialize(registerToolFn);
      
      // Should not register any local tools since AIO sandbox provides all tools via MCP
      expect(registerToolFn).not.toHaveBeenCalled();
    });
  });

  describe('browser operations', () => {
    it('should skip local browser operations', async () => {
      await expect(
        environment.onEachAgentLoopStart('test-session', {} as any, false)
      ).resolves.toBeUndefined();
    });

    it('should return undefined for browser manager', () => {
      expect(environment.getBrowserManager()).toBeUndefined();
    });

    it('should return aio-sandbox mode info', () => {
      const info = environment.getBrowserControlInfo();
      expect(info.mode).toBe('aio-sandbox');
      expect(info.tools).toEqual([]);
    });
  });

  describe('tool operations', () => {
    it('should skip local tool preprocessing', async () => {
      const args = { test: 'value' };
      const result = await environment.onBeforeToolCall(
        'test-id',
        { toolCallId: 'test-call', name: 'browser_navigate' },
        args
      );
      expect(result).toBe(args);
    });

    it('should skip local post-processing', async () => {
      const result = { success: true };
      const processed = await environment.onAfterToolCall(
        'test-id',
        { toolCallId: 'test-call', name: 'browser_navigate' },
        result,
        {}
      );
      expect(processed).toBe(result);
    });
  });

  describe('MCP configuration', () => {
    it('should return AIO sandbox MCP registry', () => {
      const registry = environment.getMCPServerRegistry();
      expect(registry.aio).toEqual({
        type: 'streamable-http',
        url: 'http://localhost:8080/mcp',
      });
    });

    it('should return empty MCP servers', () => {
      const servers = environment.getMCPServers();
      expect(servers).toEqual({});
    });
  });

  describe('cleanup', () => {
    it('should dispose without local cleanup', async () => {
      await expect(environment.onDispose()).resolves.toBeUndefined();
    });
  });
});
