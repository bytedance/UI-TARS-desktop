/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { deepMerge } from '@multimodal/shared-utils';
import {
  AgentCLIArguments,
  AgentAppConfig,
  LogLevel,
  ModelProviderName,
} from '@tarko/agent-server-interface';
import { resolveValue } from '../utils';

/**
 * Handler for processing deprecated CLI options
 */
export type CLIOptionsEnhancer<
  T extends AgentCLIArguments = AgentCLIArguments,
  U extends AgentCLIArguments = AgentAppConfig,
> = (cliArguments: T, appConfig: Partial<U>) => void;

/**
 * ConfigBuilder - Transforms CLI arguments into application configuration
 */
export class ConfigBuilder {
  /**
   * Build complete application configuration from CLI arguments and user config
   */
  static buildAppConfig<
    T extends AgentCLIArguments = AgentCLIArguments,
    U extends AgentAppConfig = AgentAppConfig,
  >(cliArguments: T, userConfig: U, cliOptionsEnhancer?: CLIOptionsEnhancer<T, U>): U {
    // Extract CLI-specific properties that need special handling
    const {
      workspace,
      config: configPath,
      debug,
      quiet,
      port,
      stream,
      // Extract core deprecated options
      provider,
      apiKey,
      baseURL,
      shareProvider,
      ...cliConfigProps
    } = cliArguments;

    // Handle core deprecated options
    this.handleCoreDeprecatedOptions(cliConfigProps, {
      provider,
      apiKey,
      baseURL,
      shareProvider,
    });

    // Allow external handler to process additional deprecated options
    if (cliOptionsEnhancer) {
      cliOptionsEnhancer(cliArguments, userConfig);
    }

    // Extract environment variables in CLI model configuration
    this.resolveModelSecrets(cliConfigProps);

    // Merge CLI configuration properties directly
    // @ts-expect-error
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
   * Handle core deprecated CLI options (common to all agent types)
   */
  private static handleCoreDeprecatedOptions(
    config: Partial<AgentAppConfig>,
    deprecated: {
      provider?: string;
      apiKey?: string;
      baseURL?: string;
      shareProvider?: string;
    },
  ): void {
    const { provider, apiKey, baseURL, shareProvider } = deprecated;

    // Handle deprecated model configuration
    if (provider || apiKey || baseURL) {
      if (config.model) {
        if (typeof config.model === 'string') {
          config.model = {
            id: config.model,
          };
        }
      } else {
        config.model = {};
      }

      if (provider && !config.model.provider) {
        config.model.provider = provider as ModelProviderName;
      }

      if (apiKey && !config.model.apiKey) {
        config.model.apiKey = apiKey;
      }

      if (baseURL && !config.model.baseURL) {
        config.model.baseURL = baseURL;
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
