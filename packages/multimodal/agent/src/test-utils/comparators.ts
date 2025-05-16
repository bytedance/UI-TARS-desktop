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
}

/**
 * Deep compare two objects with special handling for arrays (sorted by id)
 * and other complex objects. This is more resilient for test snapshots than
 * a simple equality check.
 *
 * @param expected The expected value from the snapshot
 * @param actual The actual value from the test run
 * @returns Result of the comparison
 */
export function deepCompareSortedJson(expected: any, actual: any): ComparisonResult {
  // Handle primitive types
  if (typeof expected !== typeof actual) {
    return {
      equal: false,
      reason: `Type mismatch: expected ${typeof expected}, got ${typeof actual}`,
    };
  }

  if (expected === null || actual === null) {
    return {
      equal: expected === actual,
      reason:
        expected !== actual ? `Null mismatch: expected ${expected}, got ${actual}` : undefined,
    };
  }

  // Handle arrays
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      return {
        equal: false,
        reason: `Array length mismatch: expected ${expected.length}, got ${actual.length}`,
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
      const result = deepCompareSortedJson(expectedArr[i], actualArr[i]);
      if (!result.equal) {
        return {
          equal: false,
          reason: `Array element ${i} mismatch: ${result.reason}`,
        };
      }
    }

    return { equal: true };
  }

  // Handle objects
  if (typeof expected === 'object' && typeof actual === 'object') {
    const expectedKeys = Object.keys(expected).sort();
    const actualKeys = Object.keys(actual).sort();

    // Ignore timestamp differences in objects if both have timestamp
    // This makes tests more resilient to timing differences
    if ('timestamp' in expected && 'timestamp' in actual) {
      // Skip exact timestamp comparison, just check both exist
    } else {
      // Check for missing/extra keys
      const missingKeys = expectedKeys.filter((key) => !actualKeys.includes(key));
      const extraKeys = actualKeys.filter((key) => !expectedKeys.includes(key));

      if (missingKeys.length > 0) {
        return {
          equal: false,
          reason: `Missing keys in actual: ${missingKeys.join(', ')}`,
        };
      }

      if (extraKeys.length > 0) {
        return {
          equal: false,
          reason: `Extra keys in actual: ${extraKeys.join(', ')}`,
        };
      }
    }

    // Check key values (except timestamp)
    for (const key of expectedKeys) {
      if (key === 'timestamp') {
        continue; // Skip timestamp comparison
      }

      const result = deepCompareSortedJson(expected[key], actual[key]);
      if (!result.equal) {
        return {
          equal: false,
          reason: `Property '${key}' mismatch: ${result.reason}`,
        };
      }
    }

    return { equal: true };
  }

  // Handle primitives
  return {
    equal: expected === actual,
    reason: expected !== actual ? `Value mismatch: expected ${expected}, got ${actual}` : undefined,
  };
}
