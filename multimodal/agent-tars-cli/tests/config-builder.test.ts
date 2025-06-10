/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigBuilder } from '../src/config/builder';
import { AgentTARSCLIArguments, AgentTARSAppConfig, LogLevel } from '@agent-tars/interface';

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
 * 6. Deprecated options are handled with appropriate warnings
 * 7. Server storage defaults are applied correctly
 */
describe('ConfigBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.warn to suppress deprecation warnings in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('buildAppConfig', () => {
    it('should merge CLI arguments with user config', () => {
      const cliArgs: AgentTARSCLIArguments = {
        model: {
          provider: 'openai',
          id: 'gpt-4',
        },
        port: 3000,
      };

      const userConfig: AgentTARSAppConfig = {
        model: {
          provider: 'anthropic',
          id: 'claude-3',
          apiKey: 'user-key',
        },
        search: {
          provider: 'browser_search',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result).toEqual({
        model: {
          provider: 'openai', // CLI overrides user config
          id: 'gpt-4', // CLI overrides user config
          apiKey: 'user-key', // Preserved from user config
        },
        search: {
          provider: 'browser_search', // Preserved from user config
        },
        server: {
          port: 3000, // Applied from CLI
          storage: {
            type: 'sqlite',
          },
        },
      });
    });

    it('should handle nested model configuration', () => {
      const cliArgs: AgentTARSCLIArguments = {
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
      const cliArgs: AgentTARSCLIArguments = {
        workspace: {
          workingDirectory: '/custom/workspace',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.workspace).toEqual({
        workingDirectory: '/custom/workspace',
      });
    });

    it('should handle browser configuration', () => {
      const cliArgs: AgentTARSCLIArguments = {
        browser: {
          control: 'browser-use-only',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.browser).toEqual({
        control: 'browser-use-only',
      });
    });

    it('should handle planner configuration', () => {
      const cliArgs: AgentTARSCLIArguments = {
        planner: {
          enabled: true,
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.planner).toEqual({
        enabled: true,
      });
    });

    it('should handle thinking configuration', () => {
      const cliArgs: AgentTARSCLIArguments = {
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
      const cliArgs: AgentTARSCLIArguments = {
        toolCallEngine: 'prompt_engineering',
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.toolCallEngine).toBe('prompt_engineering');
    });

    it('should handle share configuration', () => {
      const cliArgs: AgentTARSCLIArguments = {
        share: {
          provider: 'https://share.example.com',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.share).toEqual({
        provider: 'https://share.example.com',
      });
    });

    it('should handle AGIO configuration', () => {
      const cliArgs: AgentTARSCLIArguments = {
        agio: {
          provider: 'https://agio.example.com',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.agio).toEqual({
        provider: 'https://agio.example.com',
      });
    });

    it('should handle snapshot configuration', () => {
      const cliArgs: AgentTARSCLIArguments = {
        snapshot: {
          enable: true,
          snapshotPath: '/custom/snapshots',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.snapshot).toEqual({
        enable: true,
        snapshotPath: '/custom/snapshots',
      });
    });

    it('should handle logging', () => {
      const cliArgs: AgentTARSCLIArguments = {
        // @ts-expect-error CLI allows string
        logLevel: 'info',
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});
      expect(result.logLevel).toBe(LogLevel.INFO);
    });

    it('should handle logging shortcuts with debug priority', () => {
      const cliArgs: AgentTARSCLIArguments = {
        // @ts-expect-error CLI allows string
        logLevel: 'info',
        debug: true, // Should override logLevel
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});
      expect(result.logLevel).toBe(LogLevel.DEBUG);
    });

    it('should handle quiet mode', () => {
      const cliArgs: AgentTARSCLIArguments = {
        quiet: true,
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.logLevel).toBe(LogLevel.SILENT);
    });

    it('should preserve existing nested configuration when merging', () => {
      const cliArgs: AgentTARSCLIArguments = {
        model: {
          provider: 'openai',
        },
      };

      const userConfig: AgentTARSAppConfig = {
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
      const cliArgs: AgentTARSCLIArguments = {};
      const userConfig: AgentTARSAppConfig = {};

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server).toEqual({
        port: 8888, // Default port
        storage: {
          type: 'sqlite',
        },
      });
    });

    it('should override server port when specified in CLI', () => {
      const cliArgs: AgentTARSCLIArguments = {
        port: 3000,
      };

      const userConfig: AgentTARSAppConfig = {
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

      const cliArgs: AgentTARSCLIArguments = {
        model: {
          apiKey: 'OPENAI_API_KEY',
          baseURL: 'OPENAI_BASE_URL',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(resolveValue).toHaveBeenCalledWith('OPENAI_API_KEY', 'API key');
      expect(resolveValue).toHaveBeenCalledWith('OPENAI_BASE_URL', 'base URL');
      expect(result.model).toEqual({
        apiKey: 'resolved-api-key',
        baseURL: 'resolved-base-url',
      });
    });

    it('should only create server config when needed', () => {
      const cliArgs: AgentTARSCLIArguments = {
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
      const cliArgs: AgentTARSCLIArguments = {
        model: {
          provider: 'openai',
        },
        workspace: {
          workingDirectory: '/cli/workspace',
        },
      };

      const userConfig: AgentTARSAppConfig = {
        model: {
          id: 'user-model',
          apiKey: 'user-key',
        },
        workspace: {
          isolateSessions: true,
        },
        search: {
          provider: 'browser_search',
        },
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
        search: {
          provider: 'browser_search', // From user config
        },
        server: {
          port: 8888, // Default
          storage: {
            type: 'sqlite',
          },
        },
      });
    });

    it('should handle deprecated --provider option with warning', () => {
      const mockWarn = vi.spyOn(console, 'warn');

      const cliArgs: AgentTARSCLIArguments = {
        provider: 'openai',
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        provider: 'openai',
      });

      expect(mockWarn).toHaveBeenCalledWith(
        '⚠️  DEPRECATED: --provider is deprecated. Use --model.provider instead.',
      );
      expect(mockWarn).toHaveBeenCalledWith(
        '   Migration: Replace --provider with --model.provider',
      );
    });

    it('should handle deprecated --apiKey option with warning', () => {
      const mockWarn = vi.spyOn(console, 'warn');

      const cliArgs: AgentTARSCLIArguments = {
        apiKey: 'test-key',
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        apiKey: 'test-key',
      });

      expect(mockWarn).toHaveBeenCalledWith(
        '⚠️  DEPRECATED: --apiKey is deprecated. Use --model.apiKey instead.',
      );
      expect(mockWarn).toHaveBeenCalledWith('   Migration: Replace --apiKey with --model.apiKey');
    });

    it('should handle deprecated --baseURL option with warning', () => {
      const mockWarn = vi.spyOn(console, 'warn');

      const cliArgs: AgentTARSCLIArguments = {
        baseURL: 'https://api.test.com',
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        baseURL: 'https://api.test.com',
      });

      expect(mockWarn).toHaveBeenCalledWith(
        '⚠️  DEPRECATED: --baseURL is deprecated. Use --model.baseURL instead.',
      );
      expect(mockWarn).toHaveBeenCalledWith('   Migration: Replace --baseURL with --model.baseURL');
    });

    it('should handle deprecated --browser-control option with warning', () => {
      const mockWarn = vi.spyOn(console, 'warn');

      const cliArgs: AgentTARSCLIArguments = {
        browserControl: 'browser-use-only',
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.browser).toEqual({
        control: 'browser-use-only',
      });

      expect(mockWarn).toHaveBeenCalledWith(
        '⚠️  DEPRECATED: --browser-control is deprecated. Use --browser.control instead.',
      );
      expect(mockWarn).toHaveBeenCalledWith(
        '   Migration: Replace --browser-control with --browser.control',
      );
    });

    it('should handle deprecated --share-provider option with warning', () => {
      const mockWarn = vi.spyOn(console, 'warn');

      const cliArgs: AgentTARSCLIArguments = {
        shareProvider: 'https://share.example.com',
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.share).toEqual({
        provider: 'https://share.example.com',
      });

      expect(mockWarn).toHaveBeenCalledWith(
        '⚠️  DEPRECATED: --share-provider is deprecated. Use --share.provider instead.',
      );
      expect(mockWarn).toHaveBeenCalledWith(
        '   Migration: Replace --share-provider with --share.provider',
      );
    });

    it('should prioritize new options over deprecated ones', () => {
      const mockWarn = vi.spyOn(console, 'warn');

      const cliArgs: AgentTARSCLIArguments = {
        model: {
          provider: 'anthropic', // New option should take precedence
        },
        provider: 'openai', // Deprecated option
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        provider: 'anthropic', // Should use the new option value
      });

      // Should still show deprecation warning
      expect(mockWarn).toHaveBeenCalledWith(
        '⚠️  DEPRECATED: --provider is deprecated. Use --model.provider instead.',
      );
    });

    it('should handle multiple deprecated options together', () => {
      const mockWarn = vi.spyOn(console, 'warn');

      const cliArgs: AgentTARSCLIArguments = {
        provider: 'openai',
        apiKey: 'test-key',
        baseURL: 'https://api.test.com',
        browserControl: 'gui-agent-only',
        shareProvider: 'https://share.test.com',
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result).toEqual({
        model: {
          provider: 'openai',
          apiKey: 'test-key',
          baseURL: 'https://api.test.com',
        },
        browser: {
          control: 'gui-agent-only',
        },
        share: {
          provider: 'https://share.test.com',
        },
        server: {
          port: 8888,
          storage: {
            type: 'sqlite',
          },
        },
      });

      // Should show all deprecation warnings
      expect(mockWarn).toHaveBeenCalledTimes(10); // 2 warnings per deprecated option * 5 options
    });

    it('should handle deprecated --model option when config.model is a string', () => {
      const mockWarn = vi.spyOn(console, 'warn');

      const cliArgs: AgentTARSCLIArguments = {
        model: 'gpt-4' as any, // CLI allows string for backward compatibility
        provider: 'openai', // Deprecated option that should trigger the handling
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        id: 'gpt-4', // String model should be converted to { id: 'gpt-4' }
        provider: 'openai', // From deprecated provider option
      });

      expect(mockWarn).toHaveBeenCalledWith(
        '⚠️  DEPRECATED: --model is deprecated. Use --model.id instead.',
      );
      expect(mockWarn).toHaveBeenCalledWith('   Migration: Replace --model with --model.id');
    });

    it('should handle deprecated --model option when config.model is an object', () => {
      const mockWarn = vi.spyOn(console, 'warn');

      const cliArgs: AgentTARSCLIArguments = {
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

      expect(mockWarn).toHaveBeenCalledWith(
        '⚠️  DEPRECATED: --model is deprecated. Use --model.id instead.',
      );
    });

    it('should create empty model object when no model config exists but deprecated options are present', () => {
      const mockWarn = vi.spyOn(console, 'warn');

      const cliArgs: AgentTARSCLIArguments = {
        provider: 'openai', // Deprecated option
        apiKey: 'test-key', // Deprecated option
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        provider: 'openai',
        apiKey: 'test-key',
      });

      expect(mockWarn).toHaveBeenCalledWith(
        '⚠️  DEPRECATED: --provider is deprecated. Use --model.provider instead.',
      );
    });

    it('should not show --model deprecation warning when no deprecated model options are present', () => {
      const mockWarn = vi.spyOn(console, 'warn');

      const cliArgs: AgentTARSCLIArguments = {
        model: {
          provider: 'openai',
          id: 'gpt-4',
        },
        port: 3000,
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        provider: 'openai',
        id: 'gpt-4',
      });

      // Should not show any --model related deprecation warnings
      const modelWarnings = mockWarn.mock.calls.filter((call) =>
        call[0].includes('--model is deprecated'),
      );
      expect(modelWarnings).toHaveLength(0);
    });

    it('should handle complex scenario with string model and multiple deprecated options', () => {
      const mockWarn = vi.spyOn(console, 'warn');

      const cliArgs: AgentTARSCLIArguments = {
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

      // Should show all relevant deprecation warnings
      expect(mockWarn).toHaveBeenCalledWith(
        '⚠️  DEPRECATED: --model is deprecated. Use --model.id instead.',
      );
      expect(mockWarn).toHaveBeenCalledWith(
        '⚠️  DEPRECATED: --provider is deprecated. Use --model.provider instead.',
      );
      expect(mockWarn).toHaveBeenCalledWith(
        '⚠️  DEPRECATED: --apiKey is deprecated. Use --model.apiKey instead.',
      );
      expect(mockWarn).toHaveBeenCalledWith(
        '⚠️  DEPRECATED: --baseURL is deprecated. Use --model.baseURL instead.',
      );
    });

    it('should preserve existing model config when merging with string model from CLI', () => {
      const mockWarn = vi.spyOn(console, 'warn');

      const cliArgs: AgentTARSCLIArguments = {
        model: 'gpt-4' as any,
        provider: 'openai',
      };

      const userConfig: AgentTARSAppConfig = {
        model: {
          apiKey: 'existing-key',
          temperature: 0.7,
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.model).toEqual({
        id: 'gpt-4', // Converted from string
        provider: 'openai', // From deprecated option
        apiKey: 'existing-key', // Preserved from user config
        temperature: 0.7, // Preserved from user config
      });
    });

    it('should apply default sqlite storage when no server config exists', () => {
      const cliArgs: AgentTARSCLIArguments = {};
      const userConfig: AgentTARSAppConfig = {};

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server).toEqual({
        port: 8888, // Default port
        storage: {
          type: 'sqlite', // Default storage type
        },
      });
    });

    it('should preserve existing server storage configuration', () => {
      const cliArgs: AgentTARSCLIArguments = {
        port: 3000,
      };

      const userConfig: AgentTARSAppConfig = {
        server: {
          port: 8888,
          storage: {
            type: 'memory',
            path: '/custom/path',
          },
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server).toEqual({
        port: 3000, // CLI overrides user config
        storage: {
          type: 'memory', // Preserved from user config
          path: '/custom/path', // Preserved from user config
        },
      });
    });

    it('should add default storage when server exists but storage is missing', () => {
      const cliArgs: AgentTARSCLIArguments = {};

      const userConfig: AgentTARSAppConfig = {
        server: {
          port: 9000,
          // storage is missing
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server).toEqual({
        port: 9000, // From user config
        storage: {
          type: 'sqlite', // Added as default
        },
      });
    });

    it('should override server port when specified in CLI and preserve existing storage', () => {
      const cliArgs: AgentTARSCLIArguments = {
        port: 3000,
      };

      const userConfig: AgentTARSAppConfig = {
        server: {
          port: 8888,
          storage: {
            type: 'file',
            path: '/data/storage',
          },
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server).toEqual({
        port: 3000, // CLI overrides user config
        storage: {
          type: 'file', // Preserved from user config
          path: '/data/storage', // Preserved from user config
        },
      });
    });

    it('should handle partial storage configuration', () => {
      const cliArgs: AgentTARSCLIArguments = {};

      const userConfig: AgentTARSAppConfig = {
        server: {
          port: 8888,
          storage: {
            type: 'sqlite',
            // type is missing, should be filled with default
            path: '/custom/db/path',
          },
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server).toEqual({
        port: 8888,
        storage: {
          type: 'sqlite', // Should be added as default
          path: '/custom/db/path', // Preserved from user config
        },
      });
    });

    it('should only create server config when needed and include storage defaults', () => {
      const cliArgs: AgentTARSCLIArguments = {
        model: {
          provider: 'openai',
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, {});

      expect(result.server).toEqual({
        port: 8888, // Default port always added
        storage: {
          type: 'sqlite', // Default storage always added
        },
      });
    });

    it('should handle complex nested merging scenarios including server storage', () => {
      const cliArgs: AgentTARSCLIArguments = {
        model: {
          provider: 'openai',
        },
        workspace: {
          workingDirectory: '/cli/workspace',
        },
      };

      const userConfig: AgentTARSAppConfig = {
        model: {
          id: 'user-model',
          apiKey: 'user-key',
        },
        workspace: {
          isolateSessions: true,
        },
        search: {
          provider: 'browser_search',
        },
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
        search: {
          provider: 'browser_search', // From user config
        },
        server: {
          port: 8888, // Default
          storage: {
            type: 'sqlite', // Default storage
          },
        },
      });
    });
  });

  describe('server storage configuration', () => {
    it('should apply default sqlite storage when no server config exists', () => {
      const cliArgs: AgentTARSCLIArguments = {};
      const userConfig: AgentTARSAppConfig = {};

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server?.storage).toEqual({
        type: 'sqlite',
      });
    });

    it('should not override existing storage configuration', () => {
      const cliArgs: AgentTARSCLIArguments = {};
      const userConfig: AgentTARSAppConfig = {
        server: {
          storage: {
            type: 'memory',
            maxSize: 1000,
          },
        },
      };

      const result = ConfigBuilder.buildAppConfig(cliArgs, userConfig);

      expect(result.server?.storage).toEqual({
        type: 'memory',
        maxSize: 1000,
      });
    });

    it('should merge CLI server options with existing storage config', () => {
      const cliArgs: AgentTARSCLIArguments = {
        port: 9999,
      };
      const userConfig: AgentTARSAppConfig = {
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
      const cliArgs: AgentTARSCLIArguments = {};
      const userConfig: AgentTARSAppConfig = {
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
