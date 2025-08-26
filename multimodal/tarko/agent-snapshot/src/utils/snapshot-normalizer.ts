/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import stringify from 'fast-json-stable-stringify';

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
    // Apply function when field name matches this pattern
    pattern: string | RegExp;
    // Function to apply when field name matches
    normalizer: (value: any, path: string) => any;
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
 * Simple diff implementation to replace snapshot-diff
 */
class SimpleDiffer {
  private contextLines: number;

  constructor(contextLines = 3) {
    this.contextLines = contextLines;
  }

  /**
   * Generate a unified diff between two strings
   */
  diff(
    expected: string,
    actual: string,
    expectedLabel = 'Expected',
    actualLabel = 'Actual',
  ): string {
    const expectedLines = expected.split('\n');
    const actualLines = actual.split('\n');

    const diffLines: string[] = [];
    diffLines.push(`--- ${expectedLabel}`);
    diffLines.push(`+++ ${actualLabel}`);

    const lcs = this.longestCommonSubsequence(expectedLines, actualLines);
    const changes = this.generateChanges(expectedLines, actualLines, lcs);

    // Group changes into hunks
    const hunks = this.groupChangesIntoHunks(changes, expectedLines.length, actualLines.length);

    for (const hunk of hunks) {
      diffLines.push(`@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`);
      diffLines.push(...hunk.lines);
    }

    return diffLines.join('\n');
  }

  /**
   * Longest Common Subsequence algorithm for diff generation
   */
  private longestCommonSubsequence(a: string[], b: string[]): number[][] {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp;
  }

  /**
   * Generate change operations based on LCS
   */
  private generateChanges(
    expected: string[],
    actual: string[],
    lcs: number[][],
  ): Array<{
    type: 'add' | 'remove' | 'equal';
    expectedIndex: number;
    actualIndex: number;
    line: string;
  }> {
    const changes: Array<{
      type: 'add' | 'remove' | 'equal';
      expectedIndex: number;
      actualIndex: number;
      line: string;
    }> = [];

    let i = expected.length;
    let j = actual.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && expected[i - 1] === actual[j - 1]) {
        changes.unshift({
          type: 'equal',
          expectedIndex: i - 1,
          actualIndex: j - 1,
          line: expected[i - 1],
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
        changes.unshift({
          type: 'add',
          expectedIndex: -1,
          actualIndex: j - 1,
          line: actual[j - 1],
        });
        j--;
      } else if (i > 0) {
        changes.unshift({
          type: 'remove',
          expectedIndex: i - 1,
          actualIndex: -1,
          line: expected[i - 1],
        });
        i--;
      }
    }

    return changes;
  }

  /**
   * Group changes into hunks with context lines
   */
  private groupChangesIntoHunks(
    changes: Array<{
      type: 'add' | 'remove' | 'equal';
      expectedIndex: number;
      actualIndex: number;
      line: string;
    }>,
    expectedLength: number,
    actualLength: number,
  ): Array<{
    oldStart: number;
    oldCount: number;
    newStart: number;
    newCount: number;
    lines: string[];
  }> {
    const hunks: Array<{
      oldStart: number;
      oldCount: number;
      newStart: number;
      newCount: number;
      lines: string[];
    }> = [];

    let currentHunk: {
      oldStart: number;
      oldCount: number;
      newStart: number;
      newCount: number;
      lines: string[];
    } | null = null;

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];

      if (change.type !== 'equal') {
        // Start a new hunk if needed
        if (!currentHunk) {
          const contextStart = Math.max(0, i - this.contextLines);
          currentHunk = {
            oldStart: changes[contextStart]?.expectedIndex + 1 || 1,
            oldCount: 0,
            newStart: changes[contextStart]?.actualIndex + 1 || 1,
            newCount: 0,
            lines: [],
          };

          // Add context lines before the change
          for (let j = contextStart; j < i; j++) {
            if (changes[j].type === 'equal') {
              currentHunk.lines.push(` ${changes[j].line}`);
              currentHunk.oldCount++;
              currentHunk.newCount++;
            }
          }
        }

        // Add the change
        if (change.type === 'remove') {
          currentHunk.lines.push(`-${change.line}`);
          currentHunk.oldCount++;
        } else if (change.type === 'add') {
          currentHunk.lines.push(`+${change.line}`);
          currentHunk.newCount++;
        }
      } else {
        // Equal line - add as context if we're in a hunk
        if (currentHunk) {
          currentHunk.lines.push(` ${change.line}`);
          currentHunk.oldCount++;
          currentHunk.newCount++;

          // Check if we should end the hunk
          const nextChanges = changes.slice(i + 1, i + 1 + this.contextLines * 2);
          const hasMoreChanges = nextChanges.some((c) => c.type !== 'equal');

          if (!hasMoreChanges || i === changes.length - 1) {
            // Add remaining context lines
            const contextEnd = Math.min(i + this.contextLines, changes.length - 1);
            for (let j = i + 1; j <= contextEnd; j++) {
              if (changes[j]?.type === 'equal') {
                currentHunk.lines.push(` ${changes[j].line}`);
                currentHunk.oldCount++;
                currentHunk.newCount++;
              }
            }

            hunks.push(currentHunk);
            currentHunk = null;
          }
        }
      }
    }

    return hunks;
  }
}

/**
 * Normalizes objects to ignore dynamic values when comparing snapshots
 */
export class AgentSnapshotNormalizer {
  private config: AgentNormalizerConfig;
  private seenObjects = new WeakMap();
  private differ = new SimpleDiffer(3);

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
  normalize(obj: any, path = ''): any {
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

    // Generate difference report using our simple differ
    const diff = this.differ.diff(
      JSON.stringify(normalizedExpected, null, 2),
      JSON.stringify(normalizedActual, null, 2),
      'Created Agent Snapshot',
      'Runtime Agent State',
    );

    return { equal: false, diff };
  }

  /**
   * Create a Vitest snapshot serializer
   */
  createSnapshotSerializer() {
    return {
      test(val: any) {
        return typeof val === 'object' && val !== null;
      },
      serialize: (val: any) => {
        // Directly return stringified normalized value to avoid printer recursion
        return JSON.stringify(this.normalize(val), null, 2);
      },
    };
  }
}
