/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import snapshotDiff from 'snapshot-diff';
import stringify from 'fast-json-stable-stringify';

/**
 * Configuration object that defines how to normalize snapshots
 */
export interface NormalizerConfig {
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
    // Apply function when field name matches this pattern
    pattern: string | RegExp;
    // Function to apply when field name matches
    normalizer: (value: any, path: string) => any;
  }>;
}

// Default configuration
const DEFAULT_CONFIG: NormalizerConfig = {
  fieldsToNormalize: [
    { pattern: /id$/, replacement: '<<ID>>' },
    { pattern: 'timestamp', replacement: '<<TIMESTAMP>>' },
    { pattern: 'created', replacement: '<<TIMESTAMP>>' },
    { pattern: 'startTime', replacement: '<<TIMESTAMP>>' },
    { pattern: 'elapsedMs', replacement: '<<elapsedMs>>' },
    { pattern: 'image_url', replacement: '<<image_url>>' },
    { pattern: 'toolCallId', replacement: '<<toolCallId>>' },
    { pattern: /Time$/, replacement: '<<TIMESTAMP>>' },
  ],
  fieldsToIgnore: [],
};

/**
 * Normalizes objects to ignore dynamic values when comparing snapshots
 */
export class SnapshotNormalizer {
  private config: NormalizerConfig;

  constructor(config?: NormalizerConfig) {
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
  normalize(obj: any, path = ''): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item, index) => this.normalize(item, `${path}[${index}]`));
    }

    // Handle objects
    if (typeof obj === 'object') {
      const result: Record<string, any> = {};

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
  private normalizeField(key: string, value: any, path: string): any {
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
  compare(expected: any, actual: any): { equal: boolean; diff: string | null } {
    const normalizedExpected = this.normalize(expected);
    const normalizedActual = this.normalize(actual);

    // Use stable string sorting to ensure consistent comparison
    const expectedString = stringify(normalizedExpected);
    const actualString = stringify(normalizedActual);

    if (expectedString === actualString) {
      return { equal: true, diff: null };
    }

    // Generate difference report
    const diff = snapshotDiff(normalizedExpected, normalizedActual, {
      contextLines: 3,
      colors: true,
      aAnnotation: 'Created Agent Snapshot',
      bAnnotation: 'Runtime Agent State',
    });

    return { equal: false, diff };
  }
}
