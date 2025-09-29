/* eslint-disable @typescript-eslint/no-explicit-any */
/* secretlint-disable @secretlint/secretlint-rule-pattern */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildAppConfig } from '../src/config/builder';
import { AgentCLIArguments, AgentAppConfig, LogLevel, Tool } from '@tarko/interface';

// Mock the display module
vi.mock('../src/config/display', () => ({
  logDeprecatedWarning: vi.fn(),
  logConfigComplete: vi.fn(),
  logDebugInfo: vi.fn(),
}));

// Mock the utils module
vi.mock('../src/utils', () => ({
  resolveValue: vi.fn((value: string) => value),
  loadWorkspaceConfig: vi.fn(() => ({})),
}));

/**
 * Test suite for the buildAppConfig function
 */
describe('buildAppConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildAppConfig function', () => {
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
          apiKey: 'user-key', // secretlint-disable-line
        },
      };

      const result = buildAppConfig(cliArgs, userConfig);

      expect(result).toMatchInlineSnapshot(`
        {
          "model": {
            "apiKey": "user-key",
            "id": "gpt-4",
            "provider": "openai",
          },
          "server": {
            "port": 3000,
            "storage": {
              "type": "sqlite",
            },
          },
          "webui": {
            "logo": "https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png",
            "staticPath": "/path/to/web-ui",
            "subtitle": "Build your own effective Agents and run anywhere!",
            "title": "Tarko",
            "type": "static",
            "welcomTitle": "Hello, Tarko!",
            "welcomePrompts": [
              "Introduce yourself",
            ],
          },
        }
      `);
    });

    it('should handle nested model configuration', () => {
      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
          id: 'gpt-4',
          apiKey: 'test-key', // secretlint-disable-line
          baseURL: 'https://api.test.com',
        },
      };

      const result = buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        provider: 'openai',
        id: 'gpt-4',
        // secretlint-disable-line
        apiKey: 'test-key', // secretlint-disable-line
        baseURL: 'https://api.test.com',
      });
    });

    it('should handle model displayName configuration', () => {
      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
          id: 'gpt-4',
          displayName: 'GPT-4 Turbo',
        },
      };

      const result = buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        provider: 'openai',
        id: 'gpt-4',
        displayName: 'GPT-4 Turbo',
      });
    });

    it('should handle thinking configuration', () => {
      const cliArgs: AgentCLIArguments = {
        thinking: {
          type: 'enabled',
        },
      };

      const result = buildAppConfig(cliArgs, {});

      expect(result.thinking).toEqual({
        type: 'enabled',
      });
    });

    it('should handle tool call engine configuration', () => {
      const cliArgs: AgentCLIArguments = {
        toolCallEngine: 'prompt_engineering',
      };

      const result = buildAppConfig(cliArgs, {});

      expect(result.toolCallEngine).toBe('prompt_engineering');
    });

    it('should handle share configuration', () => {
      const cliArgs: AgentCLIArguments = {
        share: {
          provider: 'https://share.example.com',
        },
      };

      const result = buildAppConfig(cliArgs, {});

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

      const result = buildAppConfig(cliArgs, {});

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

      const result = buildAppConfig(cliArgs, {});
      expect(result.logLevel).toBe(LogLevel.INFO);
    });

    it('should handle logging shortcuts with debug priority', () => {
      const cliArgs: AgentCLIArguments = {
        // @ts-expect-error CLI allows string
        logLevel: 'info',
        debug: true, // Should override logLevel
      };

      const result = buildAppConfig(cliArgs, {});
      expect(result.logLevel).toBe(LogLevel.DEBUG);
    });

    it('should handle quiet mode', () => {
      const cliArgs: AgentCLIArguments = {
        quiet: true,
      };

      const result = buildAppConfig(cliArgs, {});

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
          // secretlint-disable-line
          apiKey: 'existing-key', // secretlint-disable-line
        },
      };

      const result = buildAppConfig(cliArgs, userConfig);

      expect(result.model).toEqual({
        provider: 'openai', // Added from CLI
        id: 'existing-model', // Preserved from user config
        // secretlint-disable-line
        apiKey: 'existing-key', // Preserved from user config// secretlint-disable-line
      });
    });

    it('should handle server configuration with default port', () => {
      const cliArgs: AgentCLIArguments = {};
      const userConfig: AgentAppConfig = {};

      const result = buildAppConfig(cliArgs, userConfig);

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

      const result = buildAppConfig(cliArgs, userConfig);

      expect(result.server).toEqual({
        port: 3000, // CLI overrides user config
        storage: {
          type: 'sqlite',
        },
      });
    });

    it('should resolve environment variables in model configuration', async () => {
      const { resolveValue } = await import('../src/utils');

      vi.mocked(resolveValue)
        .mockReturnValueOnce('resolved-api-key')
        .mockReturnValueOnce('resolved-base-url');

      const cliArgs: AgentCLIArguments = {
        model: {
          // secretlint-disable-line
          apiKey: 'OPENAI_API_KEY', // secretlint-disable-line
          baseURL: 'OPENAI_BASE_URL',
        },
      };

      const result = buildAppConfig(cliArgs, {
        model: {},
      });

      expect(resolveValue).toHaveBeenCalledWith('OPENAI_API_KEY', 'API key');
      expect(resolveValue).toHaveBeenCalledWith('OPENAI_BASE_URL', 'base URL');
      expect(result.model).toEqual({
        // secretlint-disable-line
        apiKey: 'resolved-api-key', // secretlint-disable-line
        baseURL: 'resolved-base-url',
      });
    });

    it('should only create server config when needed', () => {
      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
        },
      };

      const result = buildAppConfig(cliArgs, {});

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
      };

      const userConfig: AgentAppConfig = {
        model: {
          id: 'user-model',
          // secretlint-disable-line
          apiKey: 'user-key', // secretlint-disable-line
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

      const result = buildAppConfig(cliArgs, userConfig);

      expect(result).toMatchInlineSnapshot(`
        {
          "model": {
            "apiKey": "user-key",
            "id": "user-model",
            "provider": "openai",
          },
          "server": {
            "port": 8888,
            "storage": {
              "type": "sqlite",
            },
          },
          "tools": [
            Tool {
              "description": "A test tool",
              "function": [Function],
              "name": "test-tool",
              "schema": {
                "type": "object",
              },
            },
          ],
          "webui": {
            "logo": "https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png",
            "staticPath": "/path/to/web-ui",
            "subtitle": "Build your own effective Agents and run anywhere!",
            "title": "Tarko",
            "type": "static",
            "welcomTitle": "Hello, Tarko!",
            "welcomePrompts": [
              "Introduce yourself",
            ],
          },
        }
      `);
    });

    it('should handle deprecated --provider option', () => {
      const cliArgs: AgentCLIArguments = {
        provider: 'openai',
      };

      const result = buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        provider: 'openai',
      });
    });

    it('should handle deprecated --apiKey option', () => {
      const cliArgs: AgentCLIArguments = {
        // secretlint-disable-line
        apiKey: 'test-key', // secretlint-disable-line
      };

      const result = buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        // secretlint-disable-line
        apiKey: 'test-key', // secretlint-disable-line
      });
    });

    it('should handle deprecated --baseURL option', () => {
      const cliArgs: AgentCLIArguments = {
        baseURL: 'https://api.test.com',
      };

      const result = buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        baseURL: 'https://api.test.com',
      });
    });

    it('should handle deprecated --shareProvider option', () => {
      const cliArgs: AgentCLIArguments = {
        shareProvider: 'https://share.example.com',
      };

      const result = buildAppConfig(cliArgs, {});

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

      const result = buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        provider: 'anthropic', // Should use the new option value
      });
    });

    it('should handle multiple deprecated options together', () => {
      const cliArgs: AgentCLIArguments = {
        provider: 'openai',
        // secretlint-disable-line
        apiKey: 'test-key', // secretlint-disable-line
        baseURL: 'https://api.test.com',
        shareProvider: 'https://share.test.com',
      };

      const result = buildAppConfig(cliArgs, {});

      expect(result).toMatchInlineSnapshot(`
        {
          "model": {
            "apiKey": "test-key",
            "baseURL": "https://api.test.com",
            "id": undefined,
            "provider": "openai",
          },
          "server": {
            "port": 8888,
            "storage": {
              "type": "sqlite",
            },
          },
          "share": {
            "provider": "https://share.test.com",
          },
          "webui": {
            "logo": "https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png",
            "staticPath": "/path/to/web-ui",
            "subtitle": "Build your own effective Agents and run anywhere!",
            "title": "Tarko",
            "type": "static",
            "welcomTitle": "Hello, Tarko!",
            "welcomePrompts": [
              "Introduce yourself",
            ],
          },
        }
      `);
    });

    it('should handle deprecated --model option when config.model is a string', () => {
      const cliArgs: AgentCLIArguments = {
        model: 'gpt-4' as any, // CLI allows string for backward compatibility
        provider: 'openai', // Deprecated option that should trigger the handling
      };

      const result = buildAppConfig(cliArgs, {});

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

      const result = buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        provider: 'anthropic', // Should keep the object model.provider
        id: 'claude-3',
      });
    });

    it('should create empty model object when no model config exists but deprecated options are present', () => {
      const cliArgs: AgentCLIArguments = {
        provider: 'openai', // Deprecated option
        // secretlint-disable-line
        apiKey: 'test-key', // Deprecated option// secretlint-disable-line
      };

      const result = buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        provider: 'openai',
        // secretlint-disable-line
        apiKey: 'test-key', // secretlint-disable-line
      });
    });

    it('should handle complex scenario with string model and multiple deprecated options', () => {
      const cliArgs: AgentCLIArguments = {
        model: 'gpt-4' as any,
        provider: 'openai',
        // secretlint-disable-line
        apiKey: 'test-key', // secretlint-disable-line
        baseURL: 'https://api.test.com',
      };

      const result = buildAppConfig(cliArgs, {});

      expect(result.model).toEqual({
        id: 'gpt-4', // String converted to id
        provider: 'openai',
        // secretlint-disable-line
        apiKey: 'test-key', // secretlint-disable-line
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
          // secretlint-disable-line
          apiKey: 'existing-key', // secretlint-disable-line
        },
      };

      const result = buildAppConfig(cliArgs, userConfig);

      expect(result.model).toEqual({
        id: 'gpt-4', // Converted from string
        provider: 'openai', // From deprecated option
        // secretlint-disable-line
        apiKey: 'existing-key', // Preserved from user config// secretlint-disable-line
      });
    });

    it('should apply default sqlite storage when no server config exists', () => {
      const cliArgs: AgentCLIArguments = {};
      const userConfig: AgentAppConfig = {};

      const result = buildAppConfig(cliArgs, userConfig);

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

      const result = buildAppConfig(cliArgs, userConfig);

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

      const result = buildAppConfig(cliArgs, userConfig);

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

      const result = buildAppConfig(cliArgs, userConfig);

      expect(result.server?.storage).toEqual({
        type: 'sqlite',
      });
    });
  });

  describe('server storage configuration', () => {
    it('should apply default sqlite storage when no server config exists', () => {
      const cliArgs: AgentCLIArguments = {};
      const userConfig: AgentAppConfig = {};

      const result = buildAppConfig(cliArgs, userConfig);

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

      const result = buildAppConfig(cliArgs, userConfig);

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

      const result = buildAppConfig(cliArgs, userConfig);

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

      const result = buildAppConfig(cliArgs, userConfig);

      expect(result.server?.storage).toEqual({
        type: 'sqlite',
      });
    });
  });

  describe('workspace configuration integration', () => {
    it('should merge workspace config when workspacePath is provided', async () => {
      const { loadWorkspaceConfig } = await import('../src/utils');

      vi.mocked(loadWorkspaceConfig).mockReturnValue({
        instructions: 'You are a workspace-specific assistant.',
      });

      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
        },
      };

      const userConfig: AgentAppConfig = {
        model: {
          id: 'gpt-4',
        },
      };

      const result = buildAppConfig(cliArgs, userConfig, undefined, undefined, '/workspace/path');

      expect(loadWorkspaceConfig).toHaveBeenCalledWith('/workspace/path');
      expect(result.instructions).toBe('You are a workspace-specific assistant.');
      expect(result.model).toEqual({
        provider: 'openai',
        id: 'gpt-4',
      });
    });

    it('should not call loadWorkspaceConfig when workspacePath is not provided', async () => {
      const { loadWorkspaceConfig } = await import('../src/utils');

      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
        },
      };

      const result = buildAppConfig(cliArgs, {});

      expect(loadWorkspaceConfig).not.toHaveBeenCalled();
      expect(result.instructions).toBeUndefined();
    });

    it('should prioritize workspace config over user config', async () => {
      const { loadWorkspaceConfig } = await import('../src/utils');

      vi.mocked(loadWorkspaceConfig).mockReturnValue({
        instructions: 'Workspace instructions',
        model: {
          provider: 'anthropic',
        },
      });

      const cliArgs: AgentCLIArguments = {};
      const userConfig: AgentAppConfig = {
        instructions: 'User instructions',
        model: {
          provider: 'openai',
          id: 'gpt-4',
        },
      };

      const result = buildAppConfig(cliArgs, userConfig, undefined, undefined, '/workspace');

      expect(result.instructions).toBe('Workspace instructions');
      expect(result.model).toEqual({
        provider: 'anthropic', // Workspace overrides user
        id: 'gpt-4', // User config preserved where not overridden
      });
    });

    it('should allow CLI args to override workspace config', async () => {
      const { loadWorkspaceConfig } = await import('../src/utils');

      vi.mocked(loadWorkspaceConfig).mockReturnValue({
        instructions: 'Workspace instructions',
        model: {
          provider: 'anthropic',
        },
      });

      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai', // CLI should override workspace
        },
      };
      const userConfig: AgentAppConfig = {};

      const result = buildAppConfig(cliArgs, userConfig, undefined, undefined, '/workspace');

      expect(result.instructions).toBe('Workspace instructions');
      expect(result.model?.provider).toBe('openai'); // CLI overrides workspace
    });

    it('should handle workspace config with empty return', async () => {
      const { loadWorkspaceConfig } = await import('../src/utils');

      vi.mocked(loadWorkspaceConfig).mockReturnValue({});

      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
        },
      };
      const userConfig: AgentAppConfig = {
        instructions: 'User instructions',
      };

      const result = buildAppConfig(cliArgs, userConfig, undefined, undefined, '/workspace');

      expect(loadWorkspaceConfig).toHaveBeenCalledWith('/workspace');
      expect(result.instructions).toBe('User instructions'); // User config preserved
      expect(result.model?.provider).toBe('openai');
    });
  });

  describe('unknown options passthrough', () => {
    it('should preserve unknown CLI options in the final config', () => {
      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
          id: 'gpt-4',
        },
        // Unknown options that should be preserved
        aioSandbox: 'test-sandbox-value',
        customOption: 'custom-value',
        nestedUnknown: {
          nested: 'value',
        },
      };

      const result = buildAppConfig(cliArgs, {});

      // Known options should work as expected
      expect(result.model).toEqual({
        provider: 'openai',
        id: 'gpt-4',
      });

      // Unknown options should be preserved
      expect(result).toHaveProperty('aioSandbox', 'test-sandbox-value');
      expect(result).toHaveProperty('customOption', 'custom-value');
      expect(result).toHaveProperty('nestedUnknown', {
        nested: 'value',
      });
    });

    it('should preserve unknown options while filtering out known CLI-only options', () => {
      const cliArgs: AgentCLIArguments = {
        // Known CLI-only options that should be filtered out
        agent: 'agent-tars',
        workspace: '/workspace',
        debug: true,
        quiet: false,
        headless: true,
        input: 'test input',
        format: 'json',
        includeLogs: true,
        useCache: false,
        open: true,
        
        // Known options that should be preserved
        model: {
          provider: 'openai',
        },
        
        // Unknown options that should be preserved
        aioSandbox: 'sandbox-value',
        customAgentOption: 'agent-specific-value',
      };

      const result = buildAppConfig(cliArgs, {});

      // Known CLI-only options should not appear in result
      expect(result).not.toHaveProperty('agent');
      expect(result).not.toHaveProperty('workspace');
      expect(result).not.toHaveProperty('debug');
      expect(result).not.toHaveProperty('quiet');
      expect(result).not.toHaveProperty('headless');
      expect(result).not.toHaveProperty('input');
      expect(result).not.toHaveProperty('format');
      expect(result).not.toHaveProperty('includeLogs');
      expect(result).not.toHaveProperty('useCache');
      expect(result).not.toHaveProperty('open');

      // Known options should be preserved
      expect(result.model).toEqual({
        provider: 'openai',
      });

      // Unknown options should be preserved
      expect(result).toHaveProperty('aioSandbox', 'sandbox-value');
      expect(result).toHaveProperty('customAgentOption', 'agent-specific-value');
    });

    it('should preserve unknown options alongside deprecated options', () => {
      const cliArgs: AgentCLIArguments = {
        // Deprecated options
        provider: 'openai',
        apiKey: 'deprecated-key', // secretlint-disable-line
        
        // Unknown options
        aioSandbox: 'test-value',
        customFeature: true,
      };

      const result = buildAppConfig(cliArgs, {});

      // Deprecated options should be handled normally
      expect(result.model).toEqual({
        provider: 'openai',
        apiKey: 'deprecated-key', // secretlint-disable-line
      });

      // Unknown options should be preserved
      expect(result).toHaveProperty('aioSandbox', 'test-value');
      expect(result).toHaveProperty('customFeature', true);
    });

    it('should handle unknown options with complex data types', () => {
      const complexObject = {
        nested: {
          array: [1, 2, 3],
          boolean: true,
          string: 'test',
        },
      };

      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
        },
        complexUnknownOption: complexObject,
        arrayOption: ['item1', 'item2'],
        numberOption: 42,
        booleanOption: false,
      };

      const result = buildAppConfig(cliArgs, {});

      expect(result).toHaveProperty('complexUnknownOption', complexObject);
      expect(result).toHaveProperty('arrayOption', ['item1', 'item2']);
      expect(result).toHaveProperty('numberOption', 42);
      expect(result).toHaveProperty('booleanOption', false);
    });

    it('should preserve unknown options when merging with user config', () => {
      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
        },
        aioSandbox: 'cli-value',
        cliOnlyOption: 'cli-only',
      };

      const userConfig: AgentAppConfig = {
        model: {
          id: 'user-model',
        },
        instructions: 'User instructions',
        // User config might also have unknown properties
        userSpecificOption: 'user-value',
      } as any;

      const result = buildAppConfig(cliArgs, userConfig);

      // Known options should merge correctly
      expect(result.model).toEqual({
        provider: 'openai', // From CLI
        id: 'user-model', // From user config
      });
      expect(result.instructions).toBe('User instructions');

      // Unknown options from both sources should be preserved
      expect(result).toHaveProperty('aioSandbox', 'cli-value'); // CLI overrides
      expect(result).toHaveProperty('cliOnlyOption', 'cli-only');
      expect(result).toHaveProperty('userSpecificOption', 'user-value');
    });

    it('should handle unknown options with CLI enhancer', () => {
      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
        },
        aioSandbox: 'test-value',
        customOption: 'original-value',
      };

      const userConfig: AgentAppConfig = {};

      const enhancer: any = (cliArguments: any, appConfig: any) => {
        // Enhancer might modify unknown options
        if (cliArguments.customOption) {
          appConfig.enhancedCustomOption = `enhanced-${cliArguments.customOption}`;
        }
      };

      const result = buildAppConfig(cliArgs, userConfig, undefined, enhancer);

      // Original unknown options should be preserved
      expect(result).toHaveProperty('aioSandbox', 'test-value');
      expect(result).toHaveProperty('customOption', 'original-value');
      
      // Enhancer modifications should also be present
      expect(result).toHaveProperty('enhancedCustomOption', 'enhanced-original-value');
    });

    it('should not include known options in unknown options preservation', () => {
      const cliArgs: AgentCLIArguments = {
        // All known options
        model: { provider: 'openai' },
        thinking: { type: 'enabled' },
        toolCallEngine: 'native',
        share: { provider: 'test' },
        snapshot: { enable: true },
        logLevel: 'info' as any,
        server: { exclusive: true },
        port: 3000,
        provider: 'deprecated-provider',
        apiKey: 'deprecated-key', // secretlint-disable-line
        baseURL: 'deprecated-url',
        shareProvider: 'deprecated-share',
        config: ['config.json'],
        debug: true,
        quiet: false,
        stream: true,
        open: true,
        agent: 'test-agent',
        headless: true,
        input: 'test',
        format: 'json',
        includeLogs: true,
        useCache: true,
        workspace: '/workspace',
        
        // Unknown option
        unknownOption: 'should-be-preserved',
      };

      const result = buildAppConfig(cliArgs, {});

      // All the known options should be properly processed, not duplicated as unknown
      expect(result.model?.provider).toBe('openai');
      expect(result.thinking?.type).toBe('enabled');
      expect(result.toolCallEngine).toBe('native');
      expect(result.share?.provider).toBe('test');
      expect(result.snapshot?.enable).toBe(true);
      expect(result.server?.exclusive).toBe(true);
      expect(result.server?.port).toBe(3000);

      // Unknown option should be preserved
      expect(result).toHaveProperty('unknownOption', 'should-be-preserved');

      // Known CLI-only options should not appear
      expect(result).not.toHaveProperty('agent');
      expect(result).not.toHaveProperty('workspace');
      expect(result).not.toHaveProperty('debug');
      expect(result).not.toHaveProperty('config');
    });
  });
});
