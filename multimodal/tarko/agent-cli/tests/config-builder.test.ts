/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigBuilder } from '../src/config/builder';
import { AgentCLIArguments, AgentAppConfig, LogLevel, Tool } from '@tarko/agent-server-interface';

// Mock the utils module
vi.mock('../src/utils', () => ({
  resolveValue: vi.fn((value: string) => value),
}));

/**
 * Test suite for the ConfigBuilder class
 *
 * These tests verify:
 * 1. CLI arguments are properly merged with user configuration
 * 2. Nested configuration structures are handled correctly
 * 3. Environment variable resolution works
 * 4. Configuration merging prioritizes CLI over user config
 * 5. CLI shortcuts (debug, quiet, port) work correctly
 * 6. Deprecated options are handled correctly
 * 7. Server storage defaults are applied correctly
 */
describe('ConfigBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildAppConfig', () => {
    it('should merge CLI arguments with user config', () => {
      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
          id: 'gpt-4',
        },
        port: 3000,
      };

      const userConfig: AgentAppConfig = {
        model: {
          provider: 'anthropic',
          id: 'claude-3',
          apiKey: 'user-key',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result).toEqual({
        model: {
          provider: 'openai', // CLI overrides user config
          id: 'gpt-4', // CLI overrides user config
          apiKey: 'user-key', // Preserved from user config
        },
        server: {
          port: 3000, // Applied from CLI
          storage: {
            type: 'sqlite',
          },
        },
        workspace: {},
      });
    });

    it('should handle nested model configuration', () => {
      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
          id: 'gpt-4',
          apiKey: 'test-key',
          baseURL: 'https://api.test.com',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        provider: 'openai',
        id: 'gpt-4',
        apiKey: 'test-key',
        baseURL: 'https://api.test.com',
      });
    });

    it('should handle workspace configuration', () => {
      const cliArgs: AgentCLIArguments = {
        workspace: {
          workingDirectory: '/custom/workspace',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.workspace).toEqual({
        workingDirectory: '/custom/workspace',
      });
    });

    it('should handle thinking configuration', () => {
      const cliArgs: AgentCLIArguments = {
        thinking: {
          type: 'enabled',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.thinking).toEqual({
        type: 'enabled',
      });
    });

    it('should handle tool call engine configuration', () => {
      const cliArgs: AgentCLIArguments = {
        toolCallEngine: 'prompt_engineering',
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.toolCallEngine).toBe('prompt_engineering');
    });

    it('should handle share configuration', () => {
      const cliArgs: AgentCLIArguments = {
        share: {
          provider: 'https://share.example.com',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.share).toEqual({
        provider: 'https://share.example.com',
      });
    });

    it('should handle snapshot configuration', () => {
      const cliArgs: AgentCLIArguments = {
        snapshot: {
          enable: true,
          storageDirectory: '/custom/snapshots',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.snapshot).toEqual({
        enable: true,
        storageDirectory: '/custom/snapshots',
      });
    });

    it('should handle logging', () => {
      const cliArgs: AgentCLIArguments = {
        // @ts-expect-error CLI allows string
        logLevel: 'info',
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});
      expect(result.logLevel).toBe(LogLevel.INFO);
    });

    it('should handle logging shortcuts with debug priority', () => {
      const cliArgs: AgentCLIArguments = {
        // @ts-expect-error CLI allows string
        logLevel: 'info',
        debug: true, // Should override logLevel
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});
      expect(result.logLevel).toBe(LogLevel.DEBUG);
    });

    it('should handle quiet mode', () => {
      const cliArgs: AgentCLIArguments = {
        quiet: true,
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.logLevel).toBe(LogLevel.SILENT);
    });

    it('should preserve existing nested configuration when merging', () => {
      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
        },
      };

      const userConfig: AgentAppConfig = {
        model: {
          id: 'existing-model',
          apiKey: 'existing-key',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.model).toEqual({
        provider: 'openai', // Added from CLI
        id: 'existing-model', // Preserved from user config
        apiKey: 'existing-key', // Preserved from user config
      });
    });

    it('should handle server configuration with default port', () => {
      const cliArgs: AgentCLIArguments = {};
      const userConfig: AgentAppConfig = {};

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server).toEqual({
        port: 8888, // Default port
        storage: {
          type: 'sqlite',
        },
      });
    });

    it('should override server port when specified in CLI', () => {
      const cliArgs: AgentCLIArguments = {
        port: 3000,
      };

      const userConfig: AgentAppConfig = {
        server: {
          port: 8888,
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server).toEqual({
        port: 3000, // CLI overrides user config
        storage: {
          type: 'sqlite',
        },
      });
    });

    it('should resolve environment variables in model configuration', async () => {
      // Get the mocked resolveValue function
      const { resolveValue } = await import('../src/utils');

      // Configure the mock to return specific values
      vi.mocked(resolveValue)
        .mockReturnValueOnce('resolved-api-key')
        .mockReturnValueOnce('resolved-base-url');

      const cliArgs: AgentCLIArguments = {
        model: {
          apiKey: 'OPENAI_API_KEY',
          baseURL: 'OPENAI_BASE_URL',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {
        model: {},
      });

      expect(resolveValue).toHaveBeenCalledWith('OPENAI_API_KEY', 'API key');
      expect(resolveValue).toHaveBeenCalledWith('OPENAI_BASE_URL', 'base URL');
      expect(result.model).toEqual({
        apiKey: 'resolved-api-key',
        baseURL: 'resolved-base-url',
      });
    });

    it('should only create server config when needed', () => {
      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.server).toEqual({
        port: 8888, // Default port always added
        storage: {
          type: 'sqlite',
        },
      });
    });

    it('should handle complex nested merging scenarios', () => {
      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
        },
        workspace: {
          workingDirectory: '/cli/workspace',
        },
      };

      const userConfig: AgentAppConfig = {
        model: {
          id: 'user-model',
          apiKey: 'user-key',
        },
        workspace: {
          isolateSessions: true,
        },
        tools: [
          new Tool({
            id: 'test-tool',
            description: 'A test tool',
            parameters: { type: 'object' },
            function: async () => 'test',
          }),
        ],
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result).toEqual({
        model: {
          provider: 'openai', // From CLI
          id: 'user-model', // From user config
          apiKey: 'user-key', // From user config
        },
        workspace: {
          workingDirectory: '/cli/workspace', // From CLI
          isolateSessions: true, // From user config
        },
        tools: [
          new Tool({
            id: 'test-tool',
            description: 'A test tool',
            parameters: { type: 'object' },
            function: expect.any(Function),
          }),
        ],
        server: {
          port: 8888, // Default
          storage: {
            type: 'sqlite',
          },
        },
      });
    });

    it('should handle deprecated --provider option', () => {
      const cliArgs: AgentCLIArguments = {
        provider: 'openai',
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        provider: 'openai',
      });
    });

    it('should handle deprecated --apiKey option', () => {
      const cliArgs: AgentCLIArguments = {
        apiKey: 'test-key',
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        apiKey: 'test-key',
      });
    });

    it('should handle deprecated --baseURL option', () => {
      const cliArgs: AgentCLIArguments = {
        baseURL: 'https://api.test.com',
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        baseURL: 'https://api.test.com',
      });
    });

    it('should handle deprecated --shareProvider option', () => {
      const cliArgs: AgentCLIArguments = {
        shareProvider: 'https://share.example.com',
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.share).toEqual({
        provider: 'https://share.example.com',
      });
    });

    it('should prioritize new options over deprecated ones', () => {
      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'anthropic', // New option should take precedence
        },
        provider: 'openai', // Deprecated option
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        provider: 'anthropic', // Should use the new option value
      });
    });

    it('should handle multiple deprecated options together', () => {
      const cliArgs: AgentCLIArguments = {
        provider: 'openai',
        apiKey: 'test-key',
        baseURL: 'https://api.test.com',
        shareProvider: 'https://share.test.com',
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result).toEqual({
        model: {
          provider: 'openai',
          apiKey: 'test-key',
          baseURL: 'https://api.test.com',
        },
        share: {
          provider: 'https://share.test.com',
        },
        workspace: {},
        server: {
          port: 8888,
          storage: {
            type: 'sqlite',
          },
        },
      });
    });

    it('should handle deprecated --model option when config.model is a string', () => {
      const cliArgs: AgentCLIArguments = {
        model: 'gpt-4' as any, // CLI allows string for backward compatibility
        provider: 'openai', // Deprecated option that should trigger the handling
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        id: 'gpt-4', // String model should be converted to { id: 'gpt-4' }
        provider: 'openai', // From deprecated provider option
      });
    });

    it('should handle deprecated --model option when config.model is an object', () => {
      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'anthropic',
          id: 'claude-3',
        },
        provider: 'openai', // Deprecated option that should be ignored since model.provider exists
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        provider: 'anthropic', // Should keep the object model.provider
        id: 'claude-3',
      });
    });

    it('should create empty model object when no model config exists but deprecated options are present', () => {
      const cliArgs: AgentCLIArguments = {
        provider: 'openai', // Deprecated option
        apiKey: 'test-key', // Deprecated option
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        provider: 'openai',
        apiKey: 'test-key',
      });
    });

    it('should handle complex scenario with string model and multiple deprecated options', () => {
      const cliArgs: AgentCLIArguments = {
        model: 'gpt-4' as any,
        provider: 'openai',
        apiKey: 'test-key',
        baseURL: 'https://api.test.com',
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        id: 'gpt-4', // String converted to id
        provider: 'openai',
        apiKey: 'test-key',
        baseURL: 'https://api.test.com',
      });
    });

    it('should preserve existing model config when merging with string model from CLI', () => {
      const cliArgs: AgentCLIArguments = {
        model: 'gpt-4' as any,
        provider: 'openai',
      };

      const userConfig: AgentAppConfig = {
        model: {
          apiKey: 'existing-key',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.model).toEqual({
        id: 'gpt-4', // Converted from string
        provider: 'openai', // From deprecated option
        apiKey: 'existing-key', // Preserved from user config
      });
    });

    it('should apply default sqlite storage when no server config exists', () => {
      const cliArgs: AgentCLIArguments = {};
      const userConfig: AgentAppConfig = {};

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server?.storage).toEqual({
        type: 'sqlite',
      });
    });

    it('should not override existing storage configuration', () => {
      const cliArgs: AgentCLIArguments = {};
      const userConfig: AgentAppConfig = {
        server: {
          storage: {
            type: 'memory',
          },
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server?.storage).toEqual({
        type: 'memory',
      });
    });

    it('should merge CLI server options with existing storage config', () => {
      const cliArgs: AgentCLIArguments = {
        port: 9999,
      };
      const userConfig: AgentAppConfig = {
        server: {
          storage: {
            type: 'file',
            path: '/data/db',
          },
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server).toEqual({
        port: 9999,
        storage: {
          type: 'file',
          path: '/data/db',
        },
      });
    });

    it('should handle empty storage object by adding default type', () => {
      const cliArgs: AgentCLIArguments = {};
      const userConfig: AgentAppConfig = {
        server: {
          storage: {} as any, // Empty storage object
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server?.storage).toEqual({
        type: 'sqlite',
      });
    });
  });

  describe('server storage configuration', () => {
    it('should apply default sqlite storage when no server config exists', () => {
      const cliArgs: AgentCLIArguments = {};
      const userConfig: AgentAppConfig = {};

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server?.storage).toEqual({
        type: 'sqlite',
      });
    });

    it('should not override existing storage configuration', () => {
      const cliArgs: AgentCLIArguments = {};
      const userConfig: AgentAppConfig = {
        server: {
          storage: {
            type: 'memory',
          },
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server?.storage).toEqual({
        type: 'memory',
      });
    });

    it('should merge CLI server options with existing storage config', () => {
      const cliArgs: AgentCLIArguments = {
        port: 9999,
      };
      const userConfig: AgentAppConfig = {
        server: {
          storage: {
            type: 'file',
            path: '/data/db',
          },
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server).toEqual({
        port: 9999,
        storage: {
          type: 'file',
          path: '/data/db',
        },
      });
    });

    it('should handle empty storage object by adding default type', () => {
      const cliArgs: AgentCLIArguments = {};
      const userConfig: AgentAppConfig = {
        server: {
          storage: {} as any, // Empty storage object
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server?.storage).toEqual({
        type: 'sqlite',
      });
    });
  });
});
