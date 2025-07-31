/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentTARSCLIArguments, AgentTARSAppConfig } from '@agent-tars/interface';
import { ConfigBuilder } from '@tarko/cli';

// Mock the utils module
vi.mock('@tarko/cli/utils', () => ({
  resolveValue: vi.fn((value: string) => value),
}));

/**
 * Test suite for Agent TARS specific ConfigBuilder functionality
 */
describe('Agent TARS ConfigBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildAppConfig with Agent TARS features', () => {
    it('should handle browser configuration', () => {
      const cliArgs: AgentTARSCLIArguments = {
        browser: {
          control: 'dom',
        },
      };

      const result = ConfigBuilder.buildAppConfig<AgentTARSCLIArguments, AgentTARSAppConfig>(
        cliArgs,
        {},
      );

      expect(result.browser).toEqual({
        control: 'dom',
      });
    });

    it('should handle search configuration', () => {
      const cliArgs: AgentTARSCLIArguments = {
        search: {
          provider: 'browser_search',
        },
      };

      const result = ConfigBuilder.buildAppConfig<AgentTARSCLIArguments, AgentTARSAppConfig>(
        cliArgs,
        {},
      );

      expect(result.search).toEqual({
        provider: 'browser_search',
      });
    });

    it('should handle planner configuration', () => {
      const cliArgs: AgentTARSCLIArguments = {
        planner: {
          enable: true,
        },
      };

      const result = ConfigBuilder.buildAppConfig<AgentTARSCLIArguments, AgentTARSAppConfig>(
        cliArgs,
        {},
      );

      expect(result.planner).toEqual({
        enable: true,
      });
    });

    it('should handle AGIO configuration', () => {
      const cliArgs: AgentTARSCLIArguments = {
        agio: {
          provider: 'https://agio.example.com',
        },
      };

      const result = ConfigBuilder.buildAppConfig<AgentTARSCLIArguments, AgentTARSAppConfig>(
        cliArgs,
        {},
      );

      expect(result.agio).toEqual({
        provider: 'https://agio.example.com',
      });
    });

    it('should handle deprecated --browserControl option', () => {
      const cliArgs: AgentTARSCLIArguments = {
        browserControl: 'dom',
      };

      const result = ConfigBuilder.buildAppConfig<AgentTARSCLIArguments, AgentTARSAppConfig>(
        cliArgs,
        {},
      );

      expect(result.browser).toEqual({
        control: 'dom',
      });
    });

    it('should handle deprecated --browserCdpEndpoint option', () => {
      const cliArgs: AgentTARSCLIArguments = {
        browserCdpEndpoint: 'ws://localhost:9222',
      };

      const result = ConfigBuilder.buildAppConfig<AgentTARSCLIArguments, AgentTARSAppConfig>(
        cliArgs,
        {},
      );

      expect(result.browser).toEqual({
        cdpEndpoint: 'ws://localhost:9222',
      });
    });

    it('should handle complex Agent TARS specific configuration', () => {
      const cliArgs: AgentTARSCLIArguments = {
        model: {
          provider: 'openai',
        },
        browser: {
          control: 'visual-grounding',
          headless: true,
        },
        search: {
          provider: 'browser_search',
        },
        planner: {
          enable: true,
        },
      };

      const userConfig: AgentTARSAppConfig = {
        model: {
          id: 'user-model',
          apiKey: 'user-key',
        },
        browser: {
          cdpEndpoint: 'ws://localhost:9222',
        },
        // @ts-expect-error
        search: {
          count: 10,
        },
      };

      const result = ConfigBuilder.buildAppConfig<AgentTARSCLIArguments, AgentTARSAppConfig>(
        cliArgs,
        userConfig,
      );

      expect(result).toEqual({
        model: {
          provider: 'openai', // From CLI
          id: 'user-model', // From user config
          apiKey: 'user-key', // From user config
        },
        browser: {
          control: 'visual-grounding', // From CLI
          headless: true, // From CLI
          cdpEndpoint: 'ws://localhost:9222', // From user config
        },
        search: {
          provider: 'browser_search', // From CLI
          count: 10, // From user config
        },
        planner: {
          enable: true, // From CLI
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

    it('should handle multiple deprecated Agent TARS options together', () => {
      const cliArgs: AgentTARSCLIArguments = {
        provider: 'openai',
        apiKey: 'test-key',
        baseURL: 'https://api.test.com',
        browserControl: 'visual-grounding',
        browserCdpEndpoint: 'ws://localhost:9222',
        shareProvider: 'https://share.test.com',
      };

      const result = ConfigBuilder.buildAppConfig<AgentTARSCLIArguments, AgentTARSAppConfig>(
        cliArgs,
        {},
      );

      expect(result).toEqual({
        model: {
          provider: 'openai',
          apiKey: 'test-key',
          baseURL: 'https://api.test.com',
        },
        browser: {
          control: 'visual-grounding',
          cdpEndpoint: 'ws://localhost:9222',
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

    it('should prioritize new browser options over deprecated ones', () => {
      const cliArgs: AgentTARSCLIArguments = {
        browser: {
          control: 'dom', // New option should take precedence
        },
        browserControl: 'visual-grounding', // Deprecated option
      };

      const result = ConfigBuilder.buildAppConfig<AgentTARSCLIArguments, AgentTARSAppConfig>(
        cliArgs,
        {},
      );

      expect(result.browser).toEqual({
        control: 'dom', // Should use the new option value
      });
    });
  });
});
