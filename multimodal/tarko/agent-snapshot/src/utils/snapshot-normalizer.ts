/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import stringify from 'fast-json-stable-stringify';

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
      fieldsToIgnore: [...DEFAULT_CONFIG.fieldsToIgnore, ...(config?.fieldsToIgnore ?? [])],
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

    // Handle primitives and functions
    if (typeof obj !== 'object') {
      return obj;
    }

    // Handle circular references
    if (this.seenObjects.has(obj)) {
      return '[Circular]';
    }
    this.seenObjects.add(obj);

    // Handle arrays
    if (Array.isArray(obj)) {
      try {
        return obj.map((item, index) => this.normalize(item, `${path}[${index}]`));
      } catch (error) {
        return '[Array: normalization failed]';
      }
    }

    // Handle objects
    try {
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
    } catch (error) {
      return `[Object: ${obj.constructor?.name || 'Unknown'} - normalization failed]`;
    }
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

    // Generate simple diff
    const diff = this.generateSimpleDiff(
      JSON.stringify(normalizedExpected, null, 2),
      JSON.stringify(normalizedActual, null, 2),
    );

    return { equal: false, diff };
  }

  /**
   * Create a snapshot serializer for Vitest/Jest
   */
  createSnapshotSerializer() {
    return {
      test: (value: unknown) => {
        // Test if this value should be serialized by this serializer
        return (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          (this.hasFieldsToNormalize(value as Record<string, unknown>) ||
            this.hasFieldsToIgnore(value as Record<string, unknown>))
        );
      },
      serialize: (
        value: unknown,
        config: unknown,
        indentation: string,
        depth: number,
        refs: unknown,
        printer: (val: unknown, cfg: unknown, ind: string, dep: number, ref: unknown) => string,
      ) => {
        // Use a simple safe serialization approach to avoid circular references
        try {
          // Create a fresh normalizer instance for each serialization to avoid circular reference issues
          const freshNormalizer = new AgentSnapshotNormalizer(this.config);
          const normalized = freshNormalizer.normalize(value);
          return printer(normalized, config, indentation, depth, refs);
        } catch (error) {
          // Fallback to simple string representation if normalization fails
          return `[Snapshot: ${typeof value === 'object' && value !== null ? value.constructor.name : typeof value}]`;
        }
      },
    };
  }

  private shouldIgnoreField(key: string, path: string): boolean {
    return this.config.fieldsToIgnore.some((pattern) => {
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

  private generateSimpleDiff(expected: string, actual: string): string {
    const expectedLines = expected.split('\n');
    const actualLines = actual.split('\n');
    const maxLines = Math.max(expectedLines.length, actualLines.length);

    const diffLines: string[] = [];
    diffLines.push('Expected vs Actual:');
    diffLines.push('');

    for (let i = 0; i < maxLines; i++) {
      const expectedLine = expectedLines[i] || '';
      const actualLine = actualLines[i] || '';

      if (expectedLine !== actualLine) {
        if (expectedLine) {
          diffLines.push(`- ${expectedLine}`);
        }
        if (actualLine) {
          diffLines.push(`+ ${actualLine}`);
        }
      }
    }

    return diffLines.join('\n');
  }

  private hasFieldsToNormalize(value: Record<string, unknown>): boolean {
    return Object.keys(value).some((key) =>
      this.config.fieldsToNormalize.some((field) => this.matchesPattern(field.pattern, key, key)),
    );
  }

  private hasFieldsToIgnore(value: Record<string, unknown>): boolean {
    return Object.keys(value).some((key) =>
      this.config.fieldsToIgnore.some((pattern) => this.matchesPattern(pattern, key, key)),
    );
  }
}
