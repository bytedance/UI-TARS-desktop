/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentTARS } from '../../src/agent-tars';
import { AgentTARSOptions } from '../../src/types';

describe('AgentTARS AIO Integration', () => {
  let agent: AgentTARS;
  let options: AgentTARSOptions;

  beforeEach(() => {
    options = {
      id: 'test-aio-agent',
      aioSandbox: 'http://localhost:8080',
      model: {
        provider: 'openai',
        name: 'gpt-4',
        apiKey: 'test-key',
      },
      workspace: '/tmp/test-workspace',
    };
  });

  afterEach(async () => {
    if (agent) {
      await agent.cleanup();
    }
  });

  describe('AIO Sandbox Mode', () => {
    it('should initialize AgentTARS with AIO environment', async () => {
      agent = new AgentTARS(options);
      
      expect(agent).toBeDefined();
      expect(agent.getWorkingDirectory()).toBe('/tmp/test-workspace');
      
      // Should use AIO environment (no local browser manager)
      expect(agent.getBrowserManager()).toBeUndefined();
    });

    it('should return AIO sandbox browser control info', () => {
      agent = new AgentTARS(options);
      
      const controlInfo = agent.getBrowserControlInfo();
      expect(controlInfo.mode).toBe('aio-sandbox');
      expect(controlInfo.tools).toEqual([]);
    });

    it('should handle missing aioSandbox option gracefully', () => {
      const localOptions = { ...options };
      delete localOptions.aioSandbox;
      
      agent = new AgentTARS(localOptions);
      
      // Should use local environment
      expect(agent.getBrowserManager()).toBeDefined();
      
      const controlInfo = agent.getBrowserControlInfo();
      expect(controlInfo.mode).not.toBe('aio-sandbox');
    });
  });

  describe('Environment Selection', () => {
    it('should select AIO environment when aioSandbox is provided', () => {
      agent = new AgentTARS(options);
      
      // Verify AIO environment is used by checking browser manager is undefined
      expect(agent.getBrowserManager()).toBeUndefined();
    });

    it('should select Local environment when aioSandbox is not provided', () => {
      const localOptions = { ...options };
      delete localOptions.aioSandbox;
      
      agent = new AgentTARS(localOptions);
      
      // Verify Local environment is used by checking browser manager exists
      expect(agent.getBrowserManager()).toBeDefined();
    });
  });

  describe('Configuration Inheritance', () => {
    it('should inherit all base AgentTARS options in AIO mode', () => {
      const extendedOptions = {
        ...options,
        name: 'Custom AIO Agent',
        instructions: 'Custom instructions',
        maxTokens: 2000,
      };
      
      agent = new AgentTARS(extendedOptions);
      
      expect(agent.name).toBe('Custom AIO Agent');
      expect(agent.getWorkingDirectory()).toBe('/tmp/test-workspace');
    });
  });
});
