/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import stringify from 'fast-json-stable-stringify';
import snapshotDiff from 'snapshot-diff';

/**
 * Configuration object that defines how to normalize snapshots
 */
export interface AgentNormalizerConfig {
  // Patterns for field names to be replaced with fixed values
  fieldsToNormalize?: {
    // Field name or regex pattern
    pattern: string | RegExp;
    // Replacement value
    replacement?: string | number | boolean | null;
    // Whether to search deeply (defaults to true)
    deep?: boolean;
  }[];

  // Fields to completely ignore
  fieldsToIgnore?: (string | RegExp)[];

  // Custom normalization functions
  customNormalizers?: Array<{
    pattern: string | RegExp;
    normalizer: (value: unknown, path: string) => unknown;
  }>;
}
// Default configuration
const DEFAULT_CONFIG: AgentNormalizerConfig = {
  fieldsToNormalize: [
    { pattern: /id$/, replacement: '<<ID>>' },
    { pattern: 'timestamp', replacement: '<<TIMESTAMP>>' },
    { pattern: 'created', replacement: '<<TIMESTAMP>>' },
    { pattern: 'startTime', replacement: '<<TIMESTAMP>>' },
    { pattern: 'elapsedMs', replacement: '<<elapsedMs>>' },
    { pattern: 'image_url', replacement: '<<image_url>>' },
    { pattern: 'toolCallId', replacement: '<<toolCallId>>' },
    { pattern: 'sessionId', replacement: '<<sessionId>>' },
    { pattern: 'messageId', replacement: '<<messageId>>' },
    { pattern: 'ttftMs', replacement: '<<ttftMs>>' },
    { pattern: 'ttltMs', replacement: '<<ttltMs>>' },
    { pattern: /Time$/, replacement: '<<TIMESTAMP>>' },
  ],
  fieldsToIgnore: [],
};

/**
 * Normalizes objects to ignore dynamic values when comparing snapshots
 */
export class AgentSnapshotNormalizer {
  private config: AgentNormalizerConfig;
  private seenObjects = new WeakMap<object, boolean>();

  constructor(config?: AgentNormalizerConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      fieldsToNormalize: [
        ...(DEFAULT_CONFIG.fieldsToNormalize || []),
        ...(config?.fieldsToNormalize || []),
      ],
      fieldsToIgnore: [...(DEFAULT_CONFIG.fieldsToIgnore || []), ...(config?.fieldsToIgnore || [])],
      customNormalizers: [
        ...(DEFAULT_CONFIG.customNormalizers || []),
        ...(config?.customNormalizers || []),
      ],
    };
  }

  /**
   * Normalizes objects for comparison
   */
  normalize(obj: unknown, path = ''): unknown {
    // Reset seen objects on top-level call
    if (path === '') {
      this.seenObjects = new WeakMap();
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    // Detect circular references
    if (typeof obj === 'object') {
      if (this.seenObjects.has(obj)) {
        return '[Circular Reference]';
      }
      this.seenObjects.set(obj, true);
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item, index) => this.normalize(item, `${path}[${index}]`));
    }

    // Handle objects
    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        // Check if this field should be ignored
        if (this.shouldIgnoreField(key, currentPath)) {
          continue;
        }

        // Check if this field should be normalized
        const normalized = this.normalizeField(key, value, currentPath);

        // If the field was normalized, use the normalized value
        if (normalized !== undefined) {
          result[key] = normalized;
        }
        // Otherwise recursively process child objects
        else if (typeof value === 'object' && value !== null) {
          result[key] = this.normalize(value, currentPath);
        }
        // Or use the original value
        else {
          result[key] = value;
        }
      }

      return result;
    }

    // Return primitive types directly
    return obj;
  }

  /**
   * Check if a field should be ignored
   */
  private shouldIgnoreField(key: string, path: string): boolean {
    return (
      this.config.fieldsToIgnore?.some((pattern) => {
        if (pattern instanceof RegExp) {
          return pattern.test(key) || pattern.test(path);
        }
        return key === pattern || path === pattern;
      }) || false
    );
  }

  /**
   * Check if a field should be normalized and return the normalized value
   */
  private normalizeField(key: string, value: unknown, path: string): unknown {
    // First check custom normalizers
    if (this.config.customNormalizers) {
      for (const { pattern, normalizer } of this.config.customNormalizers) {
        if (
          (pattern instanceof RegExp && (pattern.test(key) || pattern.test(path))) ||
          key === pattern ||
          path === pattern
        ) {
          return normalizer(value, path);
        }
      }
    }

    // Then check predefined normalization rules
    if (this.config.fieldsToNormalize) {
      for (const { pattern, replacement, deep = true } of this.config.fieldsToNormalize) {
        if (
          (pattern instanceof RegExp && (pattern.test(key) || pattern.test(path))) ||
          key === pattern ||
          path === pattern
        ) {
          return replacement;
        }
      }
    }

    return undefined;
  }

  /**
   * Compare two objects and generate a difference report
   */
  compare(expected: unknown, actual: unknown): { equal: boolean; diff: string | null } {
    const normalizedExpected = this.normalize(expected);
    const normalizedActual = this.normalize(actual);

    // Use stable string sorting to ensure consistent comparison
    const expectedString = stringify(normalizedExpected);
    const actualString = stringify(normalizedActual);

    if (expectedString === actualString) {
      return { equal: true, diff: null };
    }

    // Generate difference report using snapshot-diff
    const diff = snapshotDiff(normalizedExpected, normalizedActual, {
      aAnnotation: 'Created Agent Snapshot',
      bAnnotation: 'Runtime Agent State',
      contextLines: 3,
    });

    return { equal: false, diff };
  }

  /**
   * Create a Vitest snapshot serializer
   */
  createSnapshotSerializer() {
    return {
      test(val: unknown) {
        return typeof val === 'object' && val !== null;
      },
      serialize: (val: unknown) => {
        return JSON.stringify(this.normalize(val), null, 2);
      },
    };
  }
}
