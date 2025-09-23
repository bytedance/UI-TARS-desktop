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
 * Extract the actual basename from current URL using the configured base pattern
 * Used by React Router to compute dynamic basename
 */
export function extractActualBasename(base: string | undefined, currentPath: string): string {
  if (!base) return '';
  
  if (isRegexPattern(base)) {
    try {
      // Replace .+ with [^/]+ (non-greedy match)
      const extractPattern = base.replace(/\.\+/g, '[^/]+');
      const extractRegex = new RegExp(`^${extractPattern}`);
      const match = currentPath.match(extractRegex);
      
      return match ? match[0] : '';
    } catch (error) {
      console.warn('Invalid regex pattern in base:', base, error);
      return '';
    }
  } else {
    // Static path
    const normalized = base.replace(/\/$/, '');
    if (currentPath === normalized || currentPath.startsWith(normalized + '/')) {
      return normalized;
    }
    return '';
  }
}

/**
 * Create a path matcher for both static paths and regex patterns
 * Used by server-side routing logic
 */
export function createPathMatcher(base: string | undefined) {
  if (!base) return { test: () => true, extract: (path: string) => path };

  if (isRegexPattern(base)) {
    let regex: RegExp;
    let extractRegex: RegExp;
    try {
      // For regex patterns, we create two regexes:
      // 1. One for testing if the path matches
      // 2. One for extracting the base part (non-greedy)
      regex = new RegExp(`^${base}`);

      // Create a non-greedy version for extraction
      // Replace .+ with [^/]+ to match up to the first slash
      const extractPattern = base.replace(/\.\+/g, '[^/]+');
      extractRegex = new RegExp(`^${extractPattern}`);
    } catch (error) {
      // If regex is malformed, treat as static path
      const normalized = base.replace(/\/$/, '');
      return {
        test: (path: string) => path === normalized || path.startsWith(normalized + '/'),
        extract: (path: string) => {
          if (path === normalized) return '/';
          if (path.startsWith(normalized + '/')) {
            return path.substring(normalized.length) || '/';
          }
          return path; // Return original path if not matching
        },
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
    const normalized = base.replace(/\/$/, '');
    return {
      test: (path: string) => path === normalized || path.startsWith(normalized + '/'),
      extract: (path: string) => {
        if (path === normalized) return '/';
        if (path.startsWith(normalized + '/')) {
          return path.substring(normalized.length) || '/';
        }
        return path; // Return original path if not matching
      },
    };
  }
}