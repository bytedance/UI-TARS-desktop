/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { deepMerge } from '@agent-tars/core';
import {
  AgentTARSCLIArguments,
  AgentAppConfig,
  LogLevel,
} from '@multimodal/agent-server-interface';
import { resolveValue } from '../utils';

/**
 * ConfigBuilder - Transforms CLI arguments into application configuration
 *
 * This class is responsible for converting command line arguments and user configuration
 * into a complete AgentAppConfig object that can be passed to the server.
 *
 * Key responsibilities:
 * - Merge CLI arguments with loaded configuration using native object spreading
 * - Apply defaults where necessary
 * - Resolve environment variables
 * - Handle CLI-specific shortcuts (debug, quiet, port)
 * - Leverage CLI parser's automatic dot notation handling
 * - Handle deprecated CLI options with warnings
 */
export class ConfigBuilder {
  /**
   * Build complete application configuration from CLI arguments and user config
   *
   * @param cliArgs Command line arguments parsed from CLI
   * @param userConfig User configuration loaded from files
   * @returns Complete application configuration ready for server
   */
  static buildAppConfig(
    cliArgs: AgentTARSCLIArguments,
    userConfig: AgentAppConfig,
  ): AgentAppConfig {
    // Extract CLI-specific properties that need special handling
    const {
      workspace,
      config: configPath,
      debug,
      quiet,
      port,
      stream,
      // Extract deprecated options
      provider,
      apiKey,
      baseURL,
      browserControl,
      shareProvider,
      ...cliConfigProps
    } = cliArgs;

    // Handle deprecated options without warnings
    this.handleDeprecatedOptions(cliConfigProps, {
      provider,
      apiKey,
      baseURL,
      browserControl,
      shareProvider,
    });

    // Resolve environment variables in CLI model configuration before merging
    this.resolveModelSecrets(cliConfigProps);

    // Merge CLI configuration properties directly (CLI overrides user config)
    const config = deepMerge(userConfig, cliConfigProps);

    // Apply CLI shortcuts and special handling
    this.handleWorkspaceOptions(config, workspace);
    this.applyLoggingShortcuts(config, { debug, quiet });
    this.applyServerConfiguration(config, { port });

    return config;
  }

  /**
   * Handle workspace config shortcut
   */
  private static handleWorkspaceOptions(
    config: Partial<AgentAppConfig>,
    workspace: AgentAppConfig['workspace'],
  ) {
    const workspaceConfig: AgentAppConfig['workspace'] = {};
    if (typeof workspace === 'string') {
      workspaceConfig.workingDirectory = workspace;
    } else if (typeof workspace === 'object') {
      Object.assign(workspaceConfig, workspace);
    }
    if (!config.workspace) {
      config.workspace = {};
    }
    Object.assign(config.workspace, workspaceConfig);
  }

  /**
   * Handle deprecated CLI options
   */
  private static handleDeprecatedOptions(
    config: Partial<AgentAppConfig>,
    deprecated: {
      provider?: string;
      apiKey?: string;
      baseURL?: string;
      browserControl?: string;
      shareProvider?: string;
    },
  ): void {
    const { provider, apiKey, baseURL, browserControl, shareProvider } = deprecated;

    // Handle deprecated model configuration
    if (provider || apiKey || baseURL) {
      if (config.model) {
        // For backward compatibility
        if (typeof config.model === 'string') {
          config.model = {
            id: config.model,
          };
        }
      } else {
        config.model = {};
      }

      if (provider) {
        if (!config.model.provider) {
          config.model.provider = provider as any;
        }
      }

      if (apiKey) {
        if (!config.model.apiKey) {
          config.model.apiKey = apiKey;
        }
      }

      if (baseURL) {
        if (!config.model.baseURL) {
          config.model.baseURL = baseURL;
        }
      }
    }

    // Handle deprecated browser control
    if (browserControl) {
      if (!config.browser) {
        config.browser = {};
      }

      if (!config.browser.control) {
        config.browser.control = browserControl as any;
      }
    }

    // Handle deprecated share provider
    if (shareProvider) {
      if (!config.share) {
        config.share = {};
      }

      if (!config.share.provider) {
        config.share.provider = shareProvider;
      }
    }
  }

  /**
   * Apply logging shortcuts from CLI arguments
   */
  private static applyLoggingShortcuts(
    config: AgentAppConfig,
    shortcuts: { debug?: boolean; quiet?: boolean },
  ): void {
    if (config.logLevel) {
      // @ts-expect-error
      config.logLevel = this.parseLogLevel(config.logLevel);
    }

    if (shortcuts.quiet) {
      config.logLevel = LogLevel.SILENT;
    }

    if (shortcuts.debug) {
      config.logLevel = LogLevel.DEBUG;
    }
  }

  /**
   * Parse log level string to enum
   */
  private static parseLogLevel(level: string): LogLevel | undefined {
    const upperLevel = level.toUpperCase();
    if (upperLevel === 'DEBUG') return LogLevel.DEBUG;
    if (upperLevel === 'INFO') return LogLevel.INFO;
    if (upperLevel === 'WARN' || upperLevel === 'WARNING') return LogLevel.WARN;
    if (upperLevel === 'ERROR') return LogLevel.ERROR;

    console.warn(`Unknown log level: ${level}, using default log level`);
    return undefined;
  }

  /**
   * Apply server configuration with defaults
   */
  private static applyServerConfiguration(
    config: AgentAppConfig,
    serverOptions: { port?: number },
  ): void {
    if (!config.server) {
      config.server = {
        port: 8888,
      };
    }

    if (!config.server.storage || !config.server.storage.type) {
      config.server.storage = {
        type: 'sqlite',
      };
    }

    if (serverOptions.port) {
      config.server.port = serverOptions.port;
    }
  }

  /**
   * Resolve environment variables in model configuration
   */
  private static resolveModelSecrets(cliConfigProps: Partial<AgentAppConfig>): void {
    if (cliConfigProps.model) {
      if (cliConfigProps.model.apiKey) {
        cliConfigProps.model.apiKey = resolveValue(cliConfigProps.model.apiKey, 'API key');
      }

      if (cliConfigProps.model.baseURL) {
        cliConfigProps.model.baseURL = resolveValue(cliConfigProps.model.baseURL, 'base URL');
      }
    }
  }
}
