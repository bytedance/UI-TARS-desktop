/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Result of a deep comparison
 */
interface ComparisonResult {
  equal: boolean;
  reason?: string;
  diff?: {
    expected: any;
    actual: any;
    path: string;
    parentExpected?: any;
    parentActual?: any;
  };
}

/**
 * Deep compare two objects with special handling for arrays (sorted by id)
 * and other complex objects. This is more resilient for test snapshots than
 * a simple equality check.
 *
 * @param expected The expected value from the snapshot
 * @param actual The actual value from the test run
 * @param path Current object path for nested objects (used for diff reporting)
 * @param parentExpected Parent of expected value for context in error reporting
 * @param parentActual Parent of actual value for context in error reporting
 * @returns Result of the comparison
 */
export function deepCompareSortedJson(
  expected: any,
  actual: any,
  path = 'root',
  parentExpected?: any,
  parentActual?: any,
): ComparisonResult {
  // Handle primitive types
  if (typeof expected !== typeof actual) {
    return {
      equal: false,
      reason: `Type mismatch: expected ${typeof expected}, got ${typeof actual}`,
      diff: {
        expected,
        actual,
        path,
        parentExpected,
        parentActual,
      },
    };
  }

  if (expected === null || actual === null) {
    return {
      equal: expected === actual,
      reason:
        expected !== actual ? `Null mismatch: expected ${expected}, got ${actual}` : undefined,
      diff:
        expected !== actual
          ? {
              expected,
              actual,
              path,
              parentExpected,
              parentActual,
            }
          : undefined,
    };
  }

  // Handle arrays
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      return {
        equal: false,
        reason: `Array length mismatch: expected ${expected.length}, got ${actual.length}`,
        diff: {
          expected,
          actual,
          path,
          parentExpected,
          parentActual,
        },
      };
    }

    // For event streams, sort by timestamp if available
    const expectedArr = [...expected];
    const actualArr = [...actual];

    // Check if items have id or timestamp for sorting
    if (
      expected.length > 0 &&
      actual.length > 0 &&
      typeof expected[0] === 'object' &&
      typeof actual[0] === 'object'
    ) {
      // Sort by id if available
      if ('id' in expected[0] && 'id' in actual[0]) {
        expectedArr.sort((a, b) => (a.id > b.id ? 1 : -1));
        actualArr.sort((a, b) => (a.id > b.id ? 1 : -1));
      }
      // Alternatively sort by timestamp if available
      else if ('timestamp' in expected[0] && 'timestamp' in actual[0]) {
        expectedArr.sort((a, b) => a.timestamp - b.timestamp);
        actualArr.sort((a, b) => a.timestamp - b.timestamp);
      }
    }

    // Compare each element
    for (let i = 0; i < expectedArr.length; i++) {
      const result = deepCompareSortedJson(
        expectedArr[i],
        actualArr[i],
        `${path}[${i}]`,
        expectedArr, // 传递数组作为父级上下文
        actualArr,
      );
      if (!result.equal) {
        return {
          equal: false,
          reason: `Array element ${i} mismatch: ${result.reason}`,
          diff: result.diff,
        };
      }
    }

    return { equal: true };
  }

  // Handle objects
  if (typeof expected === 'object' && typeof actual === 'object') {
    const expectedKeys = Object.keys(expected).sort();
    const actualKeys = Object.keys(actual).sort();

    // Ignore id, timestamp, toolCallId, and startTime differences in objects if they both exist
    const ignoreFields = ['id', 'timestamp', 'toolCallId', 'startTime', 'tool_call_id'];
    const hasIgnoreableFields = ignoreFields.some((field) => field in expected && field in actual);

    if (!hasIgnoreableFields) {
      // Check for missing/extra keys
      const missingKeys = expectedKeys.filter((key) => !actualKeys.includes(key));
      const extraKeys = actualKeys.filter((key) => !expectedKeys.includes(key));

      if (missingKeys.length > 0) {
        return {
          equal: false,
          reason: `Missing keys in actual: ${missingKeys.join(', ')}`,
          diff: {
            expected: { keys: expectedKeys },
            actual: { keys: actualKeys },
            path,
            parentExpected: expected,
            parentActual: actual,
          },
        };
      }

      if (extraKeys.length > 0) {
        return {
          equal: false,
          reason: `Extra keys in actual: ${extraKeys.join(', ')}`,
          diff: {
            expected: { keys: expectedKeys },
            actual: { keys: actualKeys },
            path,
            parentExpected: expected,
            parentActual: actual,
          },
        };
      }
    }

    // Check key values (except ignored fields)
    for (const key of expectedKeys) {
      if (ignoreFields.includes(key)) {
        continue; // Skip ignored fields comparison
      }

      const result = deepCompareSortedJson(
        expected[key],
        actual[key],
        `${path}.${key}`,
        expected, // 传递对象作为父级上下文
        actual,
      );
      if (!result.equal) {
        return {
          equal: false,
          reason: `Property '${key}' mismatch: ${result.reason}`,
          diff: result.diff,
        };
      }
    }

    return { equal: true };
  }

  // Handle primitives
  const isEqual = expected === actual;
  return {
    equal: isEqual,
    reason: !isEqual ? `Value mismatch: expected ${expected}, got ${actual}` : undefined,
    diff: !isEqual
      ? {
          expected,
          actual,
          path,
          parentExpected,
          parentActual,
        }
      : undefined,
  };
}

/**
 * Format diff as a colorized string for console output
 *
 * @param diff The difference to format
 * @returns A colorized string representation of the difference
 */
export function formatDiff(diff: {
  expected: any;
  actual: any;
  path: string;
  parentExpected?: any;
  parentActual?: any;
}): string {
  const formatValue = (val: any) => {
    if (typeof val === 'object' && val !== null) {
      return JSON.stringify(val, null, 2);
    }
    return String(val);
  };

  const output = [
    `\x1b[1mPath:\x1b[0m ${diff.path}`,
    `\x1b[31m- Expected: ${formatValue(diff.expected)}\x1b[0m`,
    `\x1b[32m+ Actual: ${formatValue(diff.actual)}\x1b[0m`,
  ];

  // 添加父级对象上下文信息
  if (diff.parentExpected) {
    output.push(`\x1b[34m- Parent Object (Expected):\x1b[0m ${formatValue(diff.parentExpected)}`);
  }

  if (diff.parentActual) {
    output.push(`\x1b[36m+ Parent Object (Actual):\x1b[0m ${formatValue(diff.parentActual)}`);
  }

  return output.join('\n');
}
