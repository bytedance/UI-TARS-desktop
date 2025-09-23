/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Auto-detect if a path is a regex pattern
 */
export function isRegexPattern(path: string): boolean {
  return /[.*+?^${}()|[\]\\]/.test(path);
}

/**
 * Create a path matcher for both static paths and regex patterns
 */
export function createPathMatcher(basePath: string) {
  if (!basePath) return { test: () => true, extract: (path: string) => path };

  if (isRegexPattern(basePath)) {
    let regex: RegExp;
    let extractRegex: RegExp;
    try {
      // For regex patterns, we create two regexes:
      // 1. One for testing if the path matches
      // 2. One for extracting the base part (non-greedy)
      regex = new RegExp(`^${basePath}`);

      // Create a non-greedy version for extraction
      // Replace .+ with [^/]+ to match up to the first slash
      const extractPattern = basePath.replace(/\.\+/g, '[^/]+');
      extractRegex = new RegExp(`^${extractPattern}`);
    } catch (error) {
      // If regex is malformed, treat as static path
      const normalized = basePath.replace(/\/$/, '');
      return {
        test: (path: string) => path === normalized || path.startsWith(normalized + '/'),
        extract: (path: string) =>
          path === normalized ? '/' : path.substring(normalized.length) || '/',
      };
    }

    return {
      test: (path: string) => regex.test(path),
      extract: (path: string) => {
        const match = path.match(extractRegex);
        if (!match) return path;

        const matchedPart = match[0];
        return path === matchedPart ? '/' : path.substring(matchedPart.length) || '/';
      },
    };
  } else {
    const normalized = basePath.replace(/\/$/, '');
    return {
      test: (path: string) => path === normalized || path.startsWith(normalized + '/'),
      extract: (path: string) =>
        path === normalized ? '/' : path.substring(normalized.length) || '/',
    };
  }
}
