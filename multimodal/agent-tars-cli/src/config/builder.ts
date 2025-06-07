/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentTARSCLIArguments, AgentTARSAppConfig, LogLevel } from '@agent-tars/interface';
import { resolveValue } from '../utils';

/**
 * ConfigBuilder - Transforms CLI arguments into application configuration
 *
 * This class is responsible for converting command line arguments and user configuration
 * into a complete AgentTARSAppConfig object that can be passed to the server.
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
    userConfig: AgentTARSAppConfig,
  ): AgentTARSAppConfig {
    // Start with user config as base
    const config: AgentTARSAppConfig = this.deepMerge({}, userConfig);

    // Extract CLI-specific properties that need special handling
    const {
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

    // Handle deprecated options with warnings and migration
    this.handleDeprecatedOptions(cliConfigProps, {
      provider,
      apiKey,
      baseURL,
      browserControl,
      shareProvider,
    });

    // Merge CLI configuration properties directly (CLI overrides user config)
    this.deepMerge(config, cliConfigProps);

    // Apply CLI shortcuts and special handling
    this.applyLoggingShortcuts(config, { debug, quiet });
    this.applyServerConfiguration(config, { port });

    // Resolve environment variables in CLI model configuration before merging
    this.resolveModelSecrets(cliConfigProps);

    return config;
  }

  /**
   * Handle deprecated CLI options with appropriate warnings and migrations
   */
  private static handleDeprecatedOptions(
    config: Partial<AgentTARSAppConfig>,
    deprecated: {
      provider?: string;
      apiKey?: string;
      baseURL?: string;
      browserControl?: string;
      shareProvider?: string;
    },
  ): void {
    console.log('config', config);

    const { provider, apiKey, baseURL, browserControl, shareProvider } = deprecated;

    // Handle deprecated model configuration
    if (provider || apiKey || baseURL) {
      if (config.model) {
        console.warn('⚠️  DEPRECATED: --model is deprecated. Use --model.id instead.');
        console.warn('   Migration: Replace --model with --model.id');
        // For backward
        if (typeof config.model === 'string') {
          config.model = {
            id: config.model,
          };
        }
      } else {
        config.model = {};
      }

      if (provider) {
        console.warn('⚠️  DEPRECATED: --provider is deprecated. Use --model.provider instead.');
        console.warn('   Migration: Replace --provider with --model.provider');
        if (!config.model.provider) {
          config.model.provider = provider as any;
        }
      }

      if (apiKey) {
        console.warn('⚠️  DEPRECATED: --apiKey is deprecated. Use --model.apiKey instead.');
        console.warn('   Migration: Replace --apiKey with --model.apiKey');
        if (!config.model.apiKey) {
          config.model.apiKey = apiKey;
        }
      }

      if (baseURL) {
        console.warn('⚠️  DEPRECATED: --baseURL is deprecated. Use --model.baseURL instead.');
        console.warn('   Migration: Replace --baseURL with --model.baseURL');
        if (!config.model.baseURL) {
          config.model.baseURL = baseURL;
        }
      }
    }

    // Handle deprecated browser control
    if (browserControl) {
      console.warn(
        '⚠️  DEPRECATED: --browser-control is deprecated. Use --browser.control instead.',
      );
      console.warn('   Migration: Replace --browser-control with --browser.control');

      if (!config.browser) {
        config.browser = {};
      }

      if (!config.browser.control) {
        config.browser.control = browserControl as any;
      }
    }

    // Handle deprecated share provider
    if (shareProvider) {
      console.warn('⚠️  DEPRECATED: --share-provider is deprecated. Use --share.provider instead.');
      console.warn('   Migration: Replace --share-provider with --share.provider');

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
    config: AgentTARSAppConfig,
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
    config: AgentTARSAppConfig,
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
  private static resolveModelSecrets(cliConfigProps: Partial<AgentTARSAppConfig>): void {
    if (cliConfigProps.model) {
      if (cliConfigProps.model.apiKey) {
        cliConfigProps.model.apiKey = resolveValue(cliConfigProps.model.apiKey, 'API key');
      }

      if (cliConfigProps.model.baseURL) {
        cliConfigProps.model.baseURL = resolveValue(cliConfigProps.model.baseURL, 'base URL');
      }
    }
  }

  /**
   * Deep merge two objects with the second taking precedence
   */
  private static deepMerge(
    target: Record<string, any>,
    source: Record<string, any>,
  ): Record<string, any> {
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(target, { [key]: source[key] });
          } else {
            target[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      });
    }

    return target;
  }

  /**
   * Check if value is an object (not an array or null)
   */
  private static isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}
