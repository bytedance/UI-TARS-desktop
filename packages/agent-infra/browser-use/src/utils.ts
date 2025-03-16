/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'fs';
import path from 'path';

export function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export function createLogger(name: string) {
  const prefix = `[${name}]`;
  return {
    info: (...args: any[]) => console.log(prefix, ...args),
    error: (...args: any[]) => console.error(prefix, ...args),
    warning: (...args: any[]) => console.warn(prefix, ...args),
    debug: (...args: any[]) => console.debug(prefix, ...args),
  };
}

/**
 * Checks if an error is related to API authentication
 *
 * @param error - The error to check
 * @returns boolean indicating if it's an authentication error
 */
export function isAuthenticationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  // Get the error message
  const errorMessage = error.message || '';

  // Get error name - sometimes error.name just returns "Error" for custom errors
  let errorName = error.name || '';

  // Try to extract the constructor name, which often contains the actual error type
  // This works better than error.name for many custom errors
  const constructorName = error.constructor?.name;
  if (constructorName && constructorName !== 'Error') {
    errorName = constructorName;
  }

  // Check if the error name indicates an authentication error
  if (errorName === 'AuthenticationError') {
    return true;
  }

  // Fallback: check the message for authentication-related indicators
  return (
    errorMessage.toLowerCase().includes('authentication') ||
    errorMessage.includes('401') ||
    errorMessage.toLowerCase().includes('api key')
  );
}

export const getBuildDomTreeScript = () => {
  const injectedScript = BUILD_DOM_TREE_SCRIPT;

  if (injectedScript) {
    return injectedScript;
  }

  return fs.readFileSync(
    path.join(__dirname, '../assets/buildDomTree.js'),
    'utf8',
  );
};
