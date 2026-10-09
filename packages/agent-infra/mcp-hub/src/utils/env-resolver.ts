/**
 * The following code is modified based on
 * https://github.com/ravitemer/mcp-hub/blob/main/src/utils/env-resolver.js
 *
 * MIT License
 * Copyright (c) 2024 Ravitemer
 * https://github.com/ravitemer/mcp-hub/blob/main/LICENSE.md
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import logger from './logger.js';

const execPromise = promisify(exec);

interface EnvResolverOptions {
  maxPasses?: number;
  commandTimeout?: number;
  strict?: boolean;
}

interface PredefinedVars {
  workspaceFolder: string;
  userHome: string;
  pathSeparator: string;
  workspaceFolderBasename: string;
  cwd: string;
  '/': string;
}

interface PlaceholderMatch {
  fullMatch: string;
  content: string;
  startIndex: number;
  endIndex: number;
}

type ConfigValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, any>
  | any[];

interface ResolveableConfig {
  env?: Record<string, any>;
  args?: any[];
  headers?: Record<string, any>;
  url?: string;
  command?: string;
  cwd?: string;
  [key: string]: ConfigValue;
}

/**
 * Universal environment variable resolver with support for:
 * - ${ENV_VAR} - resolve from context then process.env
 * - ${cmd: command args} - execute command and use output
 * - Recursive resolution with cycle detection
 * - Safe resolution from adjacent fields
 */
export class EnvResolver {
  private maxPasses: number;
  private commandTimeout: number;
  private strict: boolean;

  constructor(options: EnvResolverOptions = {}) {
    this.maxPasses = options.maxPasses || 10;
    this.commandTimeout = options.commandTimeout || 30000;
    this.strict = options.strict !== false; // Default to strict mode
  }

  /**
   * Parse global environment variables from MCP_HUB_ENV
   * @returns {Object} - Parsed global environment variables
   */
  private _parseGlobalEnv(): Record<string, any> {
    try {
      const globalEnvJson = process.env.MCP_HUB_ENV;
      if (!globalEnvJson) return {};

      const globalEnv = JSON.parse(globalEnvJson);
      if (typeof globalEnv !== 'object' || globalEnv === null) {
        logger.warn('MCP_HUB_ENV is not a valid object');
        return {};
      }

      return globalEnv;
    } catch (error) {
      logger.warn(`Failed to parse MCP_HUB_ENV: ${error.message}`);
      return {};
    }
  }

  /**
   * Resolve VS Code predefined variables
   * @returns {Object} - Predefined variables
   */
  private _resolvePredefinedVars(): PredefinedVars {
    const workspaceFolder = process.cwd();
    const userHome = os.homedir();
    const pathSeparator = path.sep;
    const workspaceFolderBasename = path.basename(workspaceFolder);

    return {
      workspaceFolder,
      userHome,
      pathSeparator,
      workspaceFolderBasename,
      cwd: workspaceFolder,
      '/': pathSeparator, // VS Code shorthand
    };
  }

  /**
   * Resolve all placeholders in a configuration object
   * @param {Object} config - Configuration object with fields to resolve
   * @param {Array} fieldsToResolve - Fields that should be resolved ['env', 'args', 'headers', 'url', 'command']
   * @returns {Object} - Resolved configuration
   */
  async resolveConfig(
    config: ResolveableConfig,
    fieldsToResolve: string[] = [
      'env',
      'args',
      'headers',
      'url',
      'command',
      'cwd',
    ],
  ): Promise<ResolveableConfig> {
    const resolved = JSON.parse(JSON.stringify(config)); // Deep clone

    // Build context with correct priority: predefinedVars → process.env → globalEnv
    const globalEnv = this._parseGlobalEnv();
    const predefinedVars = this._resolvePredefinedVars();
    let context = { ...predefinedVars, ...process.env, ...globalEnv };

    // Resolve env field first if present (provides context for other fields)
    if (resolved.env && fieldsToResolve.includes('env')) {
      resolved.env = await this._resolveFieldUniversal(
        resolved.env,
        context,
        'env',
      );
      // Update context with resolved env values (server-specific config wins over global)
      context = { ...context, ...resolved.env };
    }

    // Resolve other fields using the updated context
    for (const field of fieldsToResolve) {
      if (field !== 'env' && resolved[field] !== undefined) {
        resolved[field] = await this._resolveFieldUniversal(
          resolved[field],
          context,
          field,
        );
      }
    }

    // Merge global env with resolved server env (server config wins)
    resolved.env = {
      ...globalEnv,
      ...resolved.env,
    };

    return resolved;
  }

  /**
   * Universal field resolver that handles any field type with ${} placeholders
   */
  private async _resolveFieldUniversal(
    fieldValue: ConfigValue,
    context: Record<string, any>,
    fieldType: string,
  ): Promise<ConfigValue> {
    if (fieldType === 'env' && typeof fieldValue === 'object') {
      // Handle env object with multi-pass resolution
      return await this._resolveEnvObject(fieldValue, context);
    }

    if (fieldType === 'args' && Array.isArray(fieldValue)) {
      const resolvedArgs = [];
      for (const arg of fieldValue) {
        if (typeof arg === 'string') {
          // Handle legacy $VAR syntax for backward compatibility
          if (arg.startsWith('$') && !arg.startsWith('${')) {
            logger.warn(
              `DEPRECATED: Legacy argument syntax '$VAR' is deprecated. Use '\${VAR}' instead. Found: ${arg}`,
            );
            const envKey = arg.substring(1);
            const resolvedValue = context[envKey];
            if (resolvedValue === undefined && this.strict) {
              throw new Error(`Legacy variable '${envKey}' not found`);
            }
            resolvedArgs.push(resolvedValue || arg);
          } else {
            resolvedArgs.push(
              await this._resolveStringWithPlaceholders(arg, context),
            );
          }
        } else {
          resolvedArgs.push(arg);
        }
      }
      return resolvedArgs;
    }

    if (fieldType === 'headers' && typeof fieldValue === 'object') {
      const resolved = {};
      for (const [key, value] of Object.entries(fieldValue)) {
        if (typeof value === 'string') {
          resolved[key] = await this._resolveStringWithPlaceholders(
            value,
            context,
          );
        } else {
          resolved[key] = value;
        }
      }
      return resolved;
    }

    if (
      (fieldType === 'url' || fieldType === 'command' || fieldType === 'cwd') &&
      typeof fieldValue === 'string'
    ) {
      return await this._resolveStringWithPlaceholders(fieldValue, context);
    }

    return fieldValue;
  }

  /**
   * Resolve env object - simple single-pass resolution
   */
  private async _resolveEnvObject(
    envConfig: Record<string, any>,
    baseContext: Record<string, any>,
  ): Promise<Record<string, any>> {
    const resolved = {};

    for (const [key, value] of Object.entries(envConfig)) {
      if (value === null || value === '') {
        // Handle null/empty fallback to process.env
        const fallbackValue = baseContext[key];
        if (fallbackValue === undefined && this.strict) {
          throw new Error(`Variable '${key}' not found`);
        }
        resolved[key] = fallbackValue || '';
      } else {
        // For non-null/empty values, resolve placeholders
        resolved[key] = await this._resolveStringWithPlaceholders(
          value,
          baseContext,
        );
      }
    }

    return resolved;
  }

  /**
   * Resolve all ${} placeholders in a string, with support for nested placeholders.
   */
  private async _resolveStringWithPlaceholders(
    str: string,
    context: Record<string, any>,
    depth: number = 0,
  ): Promise<string> {
    if (depth > this.maxPasses) {
      throw new Error(
        'Max placeholder resolution depth exceeded, possible circular reference.',
      );
    }

    if (typeof str !== 'string' || !str.includes('${')) {
      return str;
    }

    const placeholders = this._findTopLevelPlaceholders(str);
    if (placeholders.length === 0) {
      return str;
    }

    let result = '';
    let lastIndex = 0;

    for (const { fullMatch, content, startIndex, endIndex } of placeholders) {
      // Append text before the current placeholder
      result += str.substring(lastIndex, startIndex);

      // Recursively resolve placeholders within the content of the current placeholder
      const resolvedContent = await this._resolveStringWithPlaceholders(
        content,
        context,
        depth + 1,
      );

      let resolvedValue;
      const isCommand = resolvedContent.startsWith('cmd:');

      try {
        if (isCommand) {
          // Execute command directly with resolved content
          resolvedValue = await this._executeCommandContent(resolvedContent);
        } else {
          // Handle ${env:VARIABLE} syntax or regular variable lookup
          const actualVar = resolvedContent.startsWith('env:')
            ? resolvedContent.slice(4) // Remove "env:" prefix
            : resolvedContent;

          resolvedValue = context[actualVar];
          if (resolvedValue === undefined) {
            if (this.strict) {
              throw new Error(`Variable '${actualVar}' not found`);
            }
            logger.debug(`Unresolved placeholder: ${fullMatch}`);
            resolvedValue = fullMatch; // Keep original placeholder if not found and not in strict mode
          }
        }
      } catch (error) {
        if (this.strict) {
          // Wrap command execution errors with context
          if (isCommand) {
            throw new Error(`cmd execution failed: ${error.message}`);
          }
          throw error; // Re-throw other errors (like variable not found)
        }
        logger.warn(
          `Failed to resolve placeholder ${fullMatch}: ${error.message}`,
        );
        resolvedValue = fullMatch; // Keep original placeholder on error
      }

      result += resolvedValue;
      lastIndex = endIndex;
    }

    // Append the rest of the string after the last placeholder
    result += str.substring(lastIndex);

    return result;
  }

  /**
   * Finds top-level placeholders ${...} in a string, correctly handling nested ones.
   * @returns {Array<{fullMatch: string, content: string, startIndex: number, endIndex: number}>}
   */
  private _findTopLevelPlaceholders(str: string): PlaceholderMatch[] {
    const placeholders = [];
    let searchIndex = 0;
    const strLength = str.length;

    while (searchIndex < strLength) {
      const startIndex = str.indexOf('${', searchIndex);
      if (startIndex === -1) {
        break;
      }

      let braceCount = 1;
      let endIndex = -1;

      for (let i = startIndex + 2; i < strLength; i++) {
        const char = str[i];

        if (char === '$' && i + 1 < strLength && str[i + 1] === '{') {
          braceCount++;
          i++; // Skip the '{' to avoid double counting
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }

      if (endIndex !== -1) {
        const fullMatch = str.substring(startIndex, endIndex + 1);
        const content = str.substring(startIndex + 2, endIndex);
        placeholders.push({
          fullMatch,
          content,
          startIndex,
          endIndex: endIndex + 1,
        });
        searchIndex = endIndex + 1;
      } else {
        // Unmatched opening brace, continue search after it
        searchIndex = startIndex + 2;
      }
    }
    return placeholders;
  }

  /**
   * Check if value contains command syntax
   */
  private _isCommand(value: any): boolean {
    return (
      typeof value === 'string' &&
      (value.startsWith('$:') || /\$\{cmd:\s*[^}]+\}/.test(value))
    );
  }

  /**
   * Execute command content (without ${} wrapper) and return trimmed output
   */
  private async _executeCommandContent(content: string): Promise<string> {
    // content is already resolved and should be "cmd: command args"
    const command = content.slice(4).trim(); // Remove "cmd:" prefix

    if (!command) {
      throw new Error(`Empty command in cmd: ${content}`);
    }

    logger.debug(`Executing command: ${command}`);
    const { stdout } = await execPromise(command, {
      timeout: this.commandTimeout,
      encoding: 'utf8',
    });

    return stdout.trim();
  }

  /**
   * Execute command and return trimmed output (wrapper for backward compatibility)
   */
  private async _executeCommand(value: string): Promise<string> {
    if (value.startsWith('$:')) {
      // Legacy syntax: $: command args (deprecated but still supported)
      logger.warn(
        `DEPRECATED: Legacy command syntax '$:' is deprecated. Use '\${cmd: command args}' instead. Found: ${value}`,
      );
      const command = value.slice(2).trim();
      if (!command) {
        throw new Error(`Empty command in ${value}`);
      }
      logger.debug(`Executing command: ${command}`);
      const { stdout } = await execPromise(command, {
        timeout: this.commandTimeout,
        encoding: 'utf8',
      });
      return stdout.trim();
    } else if (value.startsWith('${cmd:') && value.endsWith('}')) {
      // New syntax: ${cmd: command args} - extract content and delegate
      const content = value.slice(2, -1); // Remove ${ and }
      return this._executeCommandContent(content);
    } else {
      throw new Error(`Invalid command syntax: ${value}`);
    }
  }
}

// Export singleton instance with strict mode enabled
export const envResolver = new EnvResolver({ strict: true });

// Export legacy function for backward compatibility
export async function resolveEnvironmentVariables(
  envConfig: Record<string, any>,
): Promise<Record<string, any>> {
  logger.warn(
    'DEPRECATED: resolveEnvironmentVariables function is deprecated, use EnvResolver.resolveConfig instead',
  );
  const resolver = new EnvResolver();
  const resolved = await resolver.resolveConfig({ env: envConfig }, ['env']);
  return { ...process.env, ...resolved.env };
}
