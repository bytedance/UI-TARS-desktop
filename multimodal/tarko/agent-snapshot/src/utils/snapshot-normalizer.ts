/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import stringify from 'fast-json-stable-stringify';
import * as snapshotDiff from 'snapshot-diff';

/**
 * Configuration for snapshot normalization
 */
export interface AgentNormalizerConfig {
  /**
   * Fields to normalize with replacement values
   */
  fieldsToNormalize?: Array<{
    pattern: string | RegExp;
    replacement?: unknown;
    deep?: boolean;
  }>;

  /**
   * Fields to completely ignore during comparison
   */
  fieldsToIgnore?: Array<string | RegExp>;

  /**
   * Custom normalization functions
   */
  customNormalizers?: Array<{
    pattern: string | RegExp;
    normalizer: (value: unknown, path: string) => unknown;
  }>;
}

/**
 * Default normalization configuration
 */
const DEFAULT_CONFIG: Required<AgentNormalizerConfig> = {
  fieldsToNormalize: [
    { pattern: /id$/i, replacement: '<<ID>>', deep: true },
    { pattern: /timestamp/i, replacement: '<<TIMESTAMP>>', deep: true },
    { pattern: /created/i, replacement: '<<TIMESTAMP>>', deep: true },
    { pattern: /startTime/i, replacement: '<<TIMESTAMP>>', deep: true },
    { pattern: /elapsedMs/i, replacement: '<<ELAPSED_MS>>', deep: true },
    { pattern: /ttftMs/i, replacement: '<<TTFT_MS>>', deep: true },
    { pattern: /ttltMs/i, replacement: '<<TTLT_MS>>', deep: true },
    { pattern: /executionTime/i, replacement: '<<EXECUTION_TIME>>', deep: true },
    { pattern: /toolCallId/i, replacement: '<<TOOL_CALL_ID>>', deep: true },
    { pattern: /sessionId/i, replacement: '<<SESSION_ID>>', deep: true },
    { pattern: /messageId/i, replacement: '<<MESSAGE_ID>>', deep: true },
    { pattern: /image_url/i, replacement: '<<IMAGE_URL>>', deep: true },
  ],
  fieldsToIgnore: [],
  customNormalizers: [],
};

/**
 * Comparison result
 */
export interface ComparisonResult {
  equal: boolean;
  diff: string | null;
}

/**
 * Normalizes snapshots for consistent comparison
 */
export class AgentSnapshotNormalizer {
  private readonly config: Required<AgentNormalizerConfig>;
  private seenObjects = new WeakSet<object>();

  constructor(config?: AgentNormalizerConfig) {
    this.config = {
      fieldsToNormalize: [
        ...DEFAULT_CONFIG.fieldsToNormalize,
        ...(config?.fieldsToNormalize ?? []),
      ],
      fieldsToIgnore: [
        ...DEFAULT_CONFIG.fieldsToIgnore,
        ...(config?.fieldsToIgnore ?? []),
      ],
      customNormalizers: [
        ...DEFAULT_CONFIG.customNormalizers,
        ...(config?.customNormalizers ?? []),
      ],
    };
  }

  /**
   * Normalize an object for comparison
   */
  normalize(obj: unknown, path = ''): unknown {
    // Reset circular reference tracking on top-level calls
    if (path === '') {
      this.seenObjects = new WeakSet();
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle circular references
    if (typeof obj === 'object' && obj !== null) {
      if (this.seenObjects.has(obj)) {
        return '[Circular]';
      }
      this.seenObjects.add(obj);
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item, index) => this.normalize(item, `${path}[${index}]`));
    }

    // Handle objects
    if (typeof obj === 'object' && obj !== null) {
      const result: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        // Skip ignored fields
        if (this.shouldIgnoreField(key, currentPath)) {
          continue;
        }

        // Apply normalization
        const normalized = this.normalizeField(key, value, currentPath);
        if (normalized !== undefined) {
          result[key] = normalized;
        } else {
          result[key] = this.normalize(value, currentPath);
        }
      }

      return result;
    }

    // Return primitives as-is
    return obj;
  }

  /**
   * Compare two objects and return comparison result
   */
  compare(expected: unknown, actual: unknown): ComparisonResult {
    const normalizedExpected = this.normalize(expected);
    const normalizedActual = this.normalize(actual);

    const expectedString = stringify(normalizedExpected);
    const actualString = stringify(normalizedActual);

    if (expectedString === actualString) {
      return { equal: true, diff: null };
    }

    // Generate diff using snapshot-diff
    const diff = snapshotDiff.default(
      JSON.stringify(normalizedExpected, null, 2),
      JSON.stringify(normalizedActual, null, 2),
      {
        aAnnotation: 'Expected',
        bAnnotation: 'Actual',
        contextLines: 3,
      }
    );

    return { equal: false, diff };
  }

  private shouldIgnoreField(key: string, path: string): boolean {
    return this.config.fieldsToIgnore.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(key) || pattern.test(path);
      }
      return key === pattern || path === pattern;
    });
  }

  private normalizeField(key: string, value: unknown, path: string): unknown {
    // Apply custom normalizers first
    for (const { pattern, normalizer } of this.config.customNormalizers) {
      if (this.matchesPattern(pattern, key, path)) {
        return normalizer(value, path);
      }
    }

    // Apply built-in normalization rules
    for (const { pattern, replacement } of this.config.fieldsToNormalize) {
      if (this.matchesPattern(pattern, key, path)) {
        return replacement;
      }
    }

    return undefined;
  }

  private matchesPattern(pattern: string | RegExp, key: string, path: string): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(key) || pattern.test(path);
    }
    return key === pattern || path === pattern;
  }
}
