/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { deepMerge, isTest } from '@tarko/shared-utils';
import { getStaticPath } from '@tarko/agent-ui-builder';
import {
  CommonFilterOptions,
  AgentCLIArguments,
  ModelProviderName,
  AgentAppConfig,
  LogLevel,
  isAgentWebUIImplementationType,
} from '@tarko/interface';
import { resolveValue, loadWorkspaceConfig } from '../utils';
import { logDeprecatedWarning, logConfigComplete } from './display';

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
  workspacePath?: string,
): U {
  let config: Partial<U> = appDefaults ? { ...appDefaults } : {};

  // @ts-expect-error
  config = deepMerge(config, userConfig);

  if (workspacePath) {
    const workspaceConfig = loadWorkspaceConfig(workspacePath);
    // @ts-expect-error
    config = deepMerge(config, workspaceConfig);
  }

  // Extract CLI-specific properties
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
    thinking,
    // Extract tool filter options
    tool,
    // Extract MCP server filter options
    mcpServer,
    // Extract server options
    server,
    ...cliConfigProps
  } = cliArguments;

  // Handle deprecated options
  const deprecatedOptions = {
    provider,
    apiKey: apiKey || undefined,
    baseURL,
    shareProvider,
    thinking,
  }; // secretlint-disable-line @secretlint/secretlint-rule-pattern
  const deprecatedKeys = Object.entries(deprecatedOptions)
    .filter(([, value]) => value !== undefined)
    .map(([optionName]) => optionName);

  logDeprecatedWarning(deprecatedKeys);
  handleCoreDeprecatedOptions(cliConfigProps, deprecatedOptions);

  // Handle tool filters
  handleToolFilterOptions(cliConfigProps, { tool });

  // Handle MCP server filters
  handleMCPServerFilterOptions(cliConfigProps, { mcpServer });

  // Handle server options
  handleServerOptions(cliConfigProps, { server });

  // Process additional options
  if (cliOptionsEnhancer) {
    cliOptionsEnhancer(cliArguments, config);
  }

  // Resolve model secrets
  resolveModelSecrets(cliConfigProps);

  // @ts-expect-error
  config = deepMerge(config, cliConfigProps);

  // Apply CLI shortcuts
  applyLoggingShortcuts(config, { debug, quiet });
  applyServerConfiguration(config, { port });

  // Apply WebUI defaults
  applyWebUIDefaults(config as AgentAppConfig);

  // Log configuration
  const isDebug = cliArguments.debug || false;
  logConfigComplete(config as AgentAppConfig, isDebug);

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
    thinking?: boolean;
  },
): void {
  const { provider, apiKey: deprecatedApiKey, baseURL, shareProvider, thinking } = deprecated; // secretlint-disable-line @secretlint/secretlint-rule-pattern

  // Handle deprecated model configuration
  if (provider || deprecatedApiKey || baseURL) {
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

    if (deprecatedApiKey && !config.model.apiKey) {
      config.model['apiKey'] = deprecatedApiKey;
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

  if (thinking) {
    if (typeof thinking === 'boolean') {
      config.thinking = {
        type: thinking ? 'enabled' : 'disabled',
      };
    } else if (typeof thinking === 'object') {
      config.thinking = thinking;
    }
  }
}

/**
 * Handle server CLI options
 */
function handleServerOptions(
  config: Partial<AgentAppConfig>,
  serverOptions: {
    server?: {
      exclusive?: boolean;
    };
  },
): void {
  const { server } = serverOptions;

  if (!server) {
    return;
  }

  // Initialize server config if it doesn't exist
  if (!config.server) {
    config.server = {};
  }

  // Handle exclusive mode option
  if (server.exclusive !== undefined) {
    config.server.exclusive = server.exclusive;
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
      const modelApiKey = cliConfigProps.model.apiKey;
      const resolvedApiKey = resolveValue(modelApiKey, 'API key');
      cliConfigProps.model['apiKey'] = resolvedApiKey;
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
    config.webui.staticPath = isTest() ? '/path/to/web-ui' : getStaticPath();
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

/**
 * Handle tool filter CLI options
 */
function handleToolFilterOptions(
  config: Partial<AgentAppConfig>,
  toolOptions: {
    tool?: {
      include?: string | string[];
      exclude?: string | string[];
    };
  },
): void {
  const { tool } = toolOptions;

  if (!tool) {
    return;
  }

  // Initialize tool config if it doesn't exist
  if (!config.tool) {
    config.tool = {};
  }

  // Handle include patterns
  if (tool.include) {
    const includePatterns = Array.isArray(tool.include) ? tool.include : [tool.include];
    // Flatten comma-separated patterns
    const flattenedInclude = includePatterns.flatMap((pattern) =>
      pattern
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    );
    if (flattenedInclude.length > 0) {
      config.tool.include = flattenedInclude;
    }
  }

  // Handle exclude patterns
  if (tool.exclude) {
    const excludePatterns = Array.isArray(tool.exclude) ? tool.exclude : [tool.exclude];
    // Flatten comma-separated patterns
    const flattenedExclude = excludePatterns.flatMap((pattern) =>
      pattern
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    );
    if (flattenedExclude.length > 0) {
      config.tool.exclude = flattenedExclude;
    }
  }
}

/**
 * Handle MCP server filter CLI options
 */
function handleMCPServerFilterOptions(
  config: Partial<AgentAppConfig>,
  mcpServerOptions: {
    mcpServer?: CommonFilterOptions;
  },
): void {
  const { mcpServer } = mcpServerOptions;

  if (!mcpServer) {
    return;
  }

  // Initialize mcpServer config if it doesn't exist
  // @ts-expect-error
  if (!config.mcpServer) {
    // @ts-expect-error
    config.mcpServer = {};
  }

  // Handle include patterns
  if (mcpServer.include) {
    const includePatterns = Array.isArray(mcpServer.include)
      ? mcpServer.include
      : [mcpServer.include];
    // Flatten comma-separated patterns
    const flattenedInclude = includePatterns.flatMap((pattern) =>
      pattern
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    );
    if (flattenedInclude.length > 0) {
      // @ts-expect-error
      config.mcpServer.include = flattenedInclude;
    }
  }

  // Handle exclude patterns
  if (mcpServer.exclude) {
    const excludePatterns = Array.isArray(mcpServer.exclude)
      ? mcpServer.exclude
      : [mcpServer.exclude];
    // Flatten comma-separated patterns
    const flattenedExclude = excludePatterns.flatMap((pattern) =>
      pattern
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    );
    if (flattenedExclude.length > 0) {
      // @ts-expect-error
      config.mcpServer.exclude = flattenedExclude;
    }
  }
}
