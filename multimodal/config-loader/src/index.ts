/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Checks if a value is a plain object (not an array, function, or other object type)
 */
export const isObject = (obj: unknown): obj is Record<string, any> => {
  return obj !== null && typeof obj === 'object' && Object.getPrototypeOf(obj) === Object.prototype;
};

export type ConfigLoader = 'jiti' | 'native';

export type LoadConfigOptions = {
  /**
   * The root path to resolve the config file.
   * @default process.cwd()
   */
  cwd?: string;
  /**
   * The path to the config file, can be a relative or absolute path.
   * If not provided, the function will search for the config file in the `cwd`.
   */
  path?: string;
  /**
   * A custom meta object to be passed into the config function.
   */
  meta?: Record<string, unknown>;
  /**
   * The environment mode to be passed into the config function.
   * @default process.env.NODE_ENV
   */
  envMode?: string;
  /**
   * Specify the config loader, can be `jiti` or `native`.
   * - 'jiti': Use `jiti` as loader, which supports TypeScript and ESM out of the box
   * - 'native': Use native Node.js loader, requires TypeScript support in Node.js >= 22.6
   * @default 'jiti'
   */
  loader?: ConfigLoader;
  /**
   * The list of config file names to search for.
   * For example: ['app.config.ts', 'app.config.js']
   * @default []
   */
  configFiles?: string[];
};

export type LoadConfigResult<T extends Record<string, any> = Record<string, any>> = {
  /**
   * The loaded configuration object with specified type.
   */
  content: T;
  /**
   * The path to the loaded configuration file.
   * Return `null` if the configuration file is not found.
   */
  filePath: string | null;
};

/**
 * Resolves the path to the config file.
 */
export const resolveConfigPath = (root: string, configFiles: string[], customConfig?: string) => {
  if (customConfig) {
    const customConfigPath = path.isAbsolute(customConfig)
      ? customConfig
      : path.join(root, customConfig);
    if (fs.existsSync(customConfigPath)) {
      return customConfigPath;
    }
    console.warn(`Cannot find config file: ${customConfigPath}\n`);
  }

  if (configFiles.length === 0) {
    return null;
  }

  for (const file of configFiles) {
    const configFile = path.join(root, file);
    if (fs.existsSync(configFile)) {
      return configFile;
    }
  }

  return null;
};

/**
 * Loads configuration from a file with generic type support.
 */
export async function loadConfig<T extends Record<string, any> = Record<string, any>>({
  cwd = process.cwd(),
  path: configPath,
  meta = {},
  envMode,
  loader = 'jiti',
  configFiles = [],
}: LoadConfigOptions = {}): Promise<LoadConfigResult<T>> {
  const configFilePath = resolveConfigPath(cwd, configFiles, configPath);

  if (!configFilePath) {
    return {
      content: {} as T,
      filePath: configFilePath,
    };
  }

  let configExport: any;

  // Handle JSON files
  if (/\.json$/.test(configFilePath)) {
    try {
      const content = await fs.promises.readFile(configFilePath, 'utf-8');
      configExport = JSON.parse(content);
    } catch (err) {
      console.error(`Failed to load JSON file: ${configFilePath}`);
      throw err;
    }
  }
  // Handle YAML files
  else if (/\.ya?ml$/.test(configFilePath)) {
    try {
      const { default: yaml } = await import('js-yaml');
      const content = await fs.promises.readFile(configFilePath, 'utf-8');
      configExport = yaml.load(content);
    } catch (err) {
      console.error(`Failed to load YAML file: ${configFilePath}`);
      throw err;
    }
  }
  // Handle JavaScript files or when using native loader
  else if (loader === 'native' || /\.(?:js|mjs|cjs)$/.test(configFilePath)) {
    try {
      const configFileURL = pathToFileURL(configFilePath).href;
      const exportModule = await import(`${configFileURL}?t=${Date.now()}`);
      configExport = exportModule.default ? exportModule.default : exportModule;
    } catch (err) {
      if (loader === 'native') {
        console.error(`Failed to load file with native loader: ${configFilePath}`);
        throw err;
      }
      console.debug(`Failed to load file with dynamic import: ${configFilePath}`);
    }
  }

  // Handle TypeScript files with jiti
  try {
    if (configExport === undefined) {
      const { createJiti } = await import('jiti');
      const jiti = createJiti(__filename, {
        // disable require cache to support restart and read the new config
        moduleCache: false,
        interopDefault: true,
      });

      configExport = await jiti.import(configFilePath, {
        default: true,
      });
    }
  } catch (err) {
    console.error(`Failed to load file with jiti: ${configFilePath}`);
    throw err;
  }

  // Handle function export
  if (typeof configExport === 'function') {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const configParams = {
      env: nodeEnv,
      envMode: envMode || nodeEnv,
      meta,
    };

    const result = await configExport(configParams);

    if (result === undefined) {
      throw new Error('[loadConfig] The config function must return a config object.');
    }

    return {
      content: result as T,
      filePath: configFilePath,
    };
  }

  if (!isObject(configExport)) {
    throw new Error(
      `[loadConfig] The config must be an object or a function that returns an object, got ${configExport}`,
    );
  }

  return {
    content: configExport as T,
    filePath: configFilePath,
  };
}

/**
 * @deprecated Use loadConfig instead
 */
export async function loadAgentTarsConfig(
  options: LoadConfigOptions = {},
): Promise<LoadConfigResult> {
  const CONFIG_FILES = [
    // TypeScript format
    'agent-tars.config.ts',
    // YAML formats
    'agent-tars.config.yml',
    'agent-tars.config.yaml',
    // JSON format
    'agent-tars.config.json',
    // JavaScript formats
    'agent-tars.config.mjs',
    'agent-tars.config.js',
    'agent-tars.config.cjs',
  ];

  return loadConfig({
    ...options,
    configFiles: options.configFiles || CONFIG_FILES,
  });
}
