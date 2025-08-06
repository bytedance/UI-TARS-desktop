/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { deepMerge, isTest } from '@tarko/shared-utils';
import {
  AgentCLIArguments,
  ModelProviderName,
  AgentAppConfig,
  LogLevel,
  isAgentWebUIImplementationType,
} from '@tarko/interface';
import { resolveValue } from '../utils';
import path, { join } from 'path';

/**
 * Handler for processing deprecated CLI options
 */
export type CLIOptionsEnhancer<
  T extends AgentCLIArguments = AgentCLIArguments,
  U extends AgentAppConfig = AgentAppConfig,
> = (cliArguments: T, appConfig: Partial<U>) => void;

/**

 * Build complete application configuration from CLI arguments, user config, and app defaults
 * 
 * Follows the configuration priority order:
 * L0: CLI Arguments (highest priority)
 * L1: Workspace Config File  
 * L2: Global Workspace Config File
 * L3: CLI Config Files
 * L4: CLI Remote Config
 * L5: CLI Node API Config (lowest priority)
 */
export function buildAppConfig<
  T extends AgentCLIArguments = AgentCLIArguments,
  U extends AgentAppConfig = AgentAppConfig,
>(
  cliArguments: T,
  userConfig: Partial<U>,
  appDefaults?: Partial<U>,
  cliOptionsEnhancer?: CLIOptionsEnhancer<T, U>,
): U {
  // Start with app defaults (L5 - lowest priority)
  let config: Partial<U> = appDefaults ? { ...appDefaults } : {};

  // Merge with user config (L4-L1 based on file loading order)
  // @ts-expect-error
  config = deepMerge(config, userConfig);

  // Extract CLI-specific properties that need special handling
  const {
    agent,
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
  handleCoreDeprecatedOptions(cliConfigProps, {
    provider,
    apiKey,
    baseURL,
    shareProvider,
  });

  // Allow external handler to process additional options
  if (cliOptionsEnhancer) {
    cliOptionsEnhancer(cliArguments, config);
  }

  // Extract environment variables in CLI model configuration
  resolveModelSecrets(cliConfigProps);

  // Merge CLI configuration properties (L0 - highest priority)
  // @ts-expect-error TypeScript cannot infer the complex generic relationship
  config = deepMerge(config, cliConfigProps);

  // Apply CLI shortcuts and special handling
  applyLoggingShortcuts(config, { debug, quiet });
  applyServerConfiguration(config, { port });

  // Apply WebUI defaults after all merging is complete
  applyWebUIDefaults(config as AgentAppConfig);

  return config as U;
}

/**
 * Handle core deprecated CLI options (common to all agent types)
 */
function handleCoreDeprecatedOptions(
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
function applyLoggingShortcuts(
  config: AgentAppConfig,
  shortcuts: { debug?: boolean; quiet?: boolean },
): void {
  if (config.logLevel) {
    // @ts-expect-error
    config.logLevel = parseLogLevel(config.logLevel);
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
function parseLogLevel(level: string): LogLevel | undefined {
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
function applyServerConfiguration(config: AgentAppConfig, serverOptions: { port?: number }): void {
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
function resolveModelSecrets(cliConfigProps: Partial<AgentAppConfig>): void {
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
 * Apply WebUI configuration defaults
 */
function applyWebUIDefaults(config: AgentAppConfig): void {
  if (!config.webui) {
    config.webui = {};
  }

  if (!config.webui.type) {
    config.webui.type = 'static';
  }

  if (isAgentWebUIImplementationType(config.webui, 'static') && !config.webui.staticPath) {
    config.webui.staticPath = isTest() ? '/path/to/web-ui' : path.resolve(__dirname, '../static');
  }

  if (!config.webui.title) {
    config.webui.title = 'Tarko';
  }

  if (!config.webui.welcomTitle) {
    config.webui.welcomTitle = 'Hello, Tarko!';
  }

  if (!config.webui.subtitle) {
    config.webui.subtitle = 'Build your own effective Agents and run anywhere!';
  }

  if (!config.webui.welcomePrompts) {
    config.webui.welcomePrompts = ['Introduce yourself'];
  }

  if (!config.webui.logo) {
    config.webui.logo =
      'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png';
  }
}
