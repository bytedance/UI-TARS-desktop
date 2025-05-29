/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentTARSOptions,
  ModelProviderName,
  BrowserControlMode,
  getLogger,
} from '@agent-tars/core';
// import terminalImage from 'terminal-image';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

export const logger = getLogger('AgentTARS');

/**
 * Resolve API key or URL for command line options
 * If the value is an environment variable name (all uppercase), use its value
 *
 * @param value The API key, URL, or environment variable name
 * @param label Optional label for logging (defaults to "value")
 * @returns The resolved value
 */
export function resolveValue(value: string | undefined, label = 'value'): string | undefined {
  if (!value) return undefined;

  // If value is in all uppercase, treat it as an environment variable
  if (/^[A-Z][A-Z0-9_]*$/.test(value)) {
    const envValue = process.env[value];
    if (envValue) {
      logger.log(`Using ${label} from environment variable: ${value}`);
      return envValue;
    } else {
      logger.warn(`Environment variable "${value}" not found, using as literal value`);
    }
  }

  return value;
}

/**
 * Check if imgcat command is available in the system
 * @returns Promise that resolves to boolean indicating if imgcat is available
 */
export async function isImgcatAvailable(): Promise<boolean> {
  const execPromise = promisify(exec);
  try {
    await execPromise('which imgcat');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if the terminal supports image display via imgcat
 * Currently only iTerm2 on macOS is supported
 */
export function isImageRenderingSupported(): boolean {
  // Check for iTerm2
  return Boolean(
    process.env.TERM_PROGRAM === 'iTerm.app' ||
      process.env.LC_TERMINAL === 'iTerm2' ||
      process.env.TERM?.includes('screen'),
  );
}

/**
 * Render image in terminal using imgcat
 * @param imageData Base64 encoded image data
 * @param mimeType Image MIME type
 * @param isDebug Whether to show debug logs
 * @returns Promise that resolves when rendering is complete
 */
export async function renderImageInTerminal(
  imageData: string,
  mimeType: string,
  isDebug = false,
): Promise<boolean> {
  try {
    // Skip if terminal doesn't support images
    if (!isImageRenderingSupported()) {
      console.log('Terminal does not support image rendering');
      return false;
    }

    // Check if imgcat is available
    const imgcatExists = await isImgcatAvailable();

    if (isDebug) {
      console.log('imgcatExists', imgcatExists);
    }

    if (!imgcatExists) {
      console.error('The imgcat command is not installed. Install it with:');
      console.error(
        'curl -fsSL https://iterm2.com/utilities/imgcat -o /usr/local/bin/imgcat && chmod +x /usr/local/bin/imgcat',
      );
      return false;
    }

    // Create temporary directory if it doesn't exist
    const tempDir = path.join(os.homedir(), '.agent-tars/images');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Extract image format from MIME type
    const format = mimeType.split('/')[1] || 'png';

    // Create temporary file
    const tempFile = path.join(tempDir, `image-${Date.now()}.${format}`);
    // FIXME: upgrade to `terminal-image`
    // @see https://github.com/sindresorhus/terminal-image
    const imgcat = require('imgcat');

    // Remove base64 prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

    // Write image data to file
    fs.writeFileSync(tempFile, Buffer.from(base64Data, 'base64'));

    await imgcat(tempFile, { log: true });

    // Execute imgcat
    const execPromise = promisify(exec);
    try {
      await execPromise(`imgcat ${tempFile}`);
    } catch (error) {
      console.error('Failed to execute imgcat command:', error);
      console.log('Falling back to text message: [Image data cannot be displayed]');
      return false;
    }

    // Cleanup temp file (uncomment to enable cleanup)
    // fs.unlinkSync(tempFile);

    return true;
  } catch (error) {
    console.error('Failed to render image:', error);
    return false;
  }
}

/**
 * Merges command line options into loaded config
 * Prioritizes command line options over config file values
 */
export function mergeCommandLineOptions(
  config: AgentTARSOptions,
  // FIXME: Remove any.
  options: Record<string, any>,
): AgentTARSOptions {
  // Create a copy of the config to avoid mutation
  const mergedConfig: AgentTARSOptions = { ...config };

  // Handle model configuration
  if (options.provider || options.model || options.apiKey || options.baseURL) {
    // Initialize model configuration if not present
    if (!mergedConfig.model) {
      mergedConfig.model = {};
    }

    // Initialize 'use' configuration if not present
    if (!mergedConfig.model.use) {
      mergedConfig.model.use = {};
    }

    // Set provider if specified
    if (options.provider) {
      mergedConfig.model.use.provider = options.provider as ModelProviderName;
    }

    // Set model if specified
    if (options.model) {
      mergedConfig.model.use.model = options.model as string;
    }

    // Set API key if specified (resolve environment variables)
    if (options.apiKey) {
      mergedConfig.model.use.apiKey = resolveValue(options.apiKey as string, 'API key');
    }

    // Set baseURL if specified (resolve environment variables)
    if (options.baseURL) {
      mergedConfig.model.use.baseURL = resolveValue(options.baseURL as string, 'base URL');
    }
  }

  if (options.browserControl && typeof options.browserControl === 'string') {
    if (!mergedConfig.browser) mergedConfig.browser = {};
    mergedConfig.browser!.control = options.browserControl as BrowserControlMode;
  }

  // Handle planner configuration
  if (options.planner === true) {
    mergedConfig.planner = { enabled: true };
  }

  // Handle thinking (reasoning) configuration
  if (options.thinking) {
    mergedConfig.thinking = {
      type: 'enabled',
    };
  }

  // Handle prompt engineering tool call engine flag
  if (options.pe) {
    mergedConfig.toolCallEngine = 'prompt_engineering';
  }

  return mergedConfig;
}

/**
 * Converts an absolute path to a user-friendly path with ~ for home directory
 * @param absolutePath The absolute path to convert
 * @returns A user-friendly path with ~ for home directory
 */
export function toUserFriendlyPath(absolutePath: string): string {
  const homedir = os.homedir();

  if (absolutePath.startsWith(homedir)) {
    return absolutePath.replace(homedir, '~');
  }

  return absolutePath;
}
