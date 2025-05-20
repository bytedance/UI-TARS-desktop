/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentTARSOptions, ModelProviderName } from '@agent-tars/core';
// import terminalImage from 'terminal-image';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

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
 * @returns Promise that resolves when rendering is complete
 */
export async function renderImageInTerminal(imageData: string, mimeType: string): Promise<boolean> {
  try {
    // Skip if terminal doesn't support images
    if (!isImageRenderingSupported()) {
      console.log('Terminal does not support image rendering');
      return false;
    }

    // Check if imgcat is available
    const imgcatExists = await isImgcatAvailable();

    console.log('imgcatExists', imgcatExists);

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
 * Resolve API key for command line options
 * If the key is an environment variable name (all uppercase), use its value
 */
export function resolveApiKey(apiKey: string | undefined): string | undefined {
  if (!apiKey) return undefined;

  // If apiKey is in all uppercase, treat it as an environment variable
  if (/^[A-Z][A-Z0-9_]*$/.test(apiKey)) {
    const envValue = process.env[apiKey];
    if (envValue) {
      console.log(`Using API key from environment variable: ${apiKey}`);
      return envValue;
    } else {
      console.warn(`Environment variable "${apiKey}" not found, using as literal value`);
    }
  }

  return apiKey;
}

/**
 * Merges command line options into loaded config
 * Prioritizes command line options over config file values
 */
export function mergeCommandLineOptions(
  config: AgentTARSOptions,
  options: Record<string, string | boolean | number | undefined>,
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
      mergedConfig.model.use.apiKey = resolveApiKey(options.apiKey as string);
    }

    // Set baseURL if specified
    if (options.baseURL) {
      mergedConfig.model.use.baseURL = options.baseURL as string;
    }
  }

  // Handle thinking (reasoning) configuration
  if (options.thinking) {
    mergedConfig.thinking = {
      type: 'enabled',
    };
  }

  mergedConfig.tollCallEngine = 'prompt_engineering';

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
